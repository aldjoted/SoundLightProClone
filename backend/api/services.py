"""
Service layer for business logic operations.
This module contains business logic that is independent of the HTTP layer,
making it easier to test, reuse, and maintain.
"""

import os
import stripe
from decimal import Decimal
from typing import Any, Dict, List, Optional, TYPE_CHECKING
from dotenv import load_dotenv
import logging

from django.db import transaction
from django.contrib.auth.models import User
from stripe.error import StripeError # type: ignore

if TYPE_CHECKING:
    from django.db.models import QuerySet

from .models import Product, Order, OrderItem
from django.conf import settings

# ✅ IMPROVEMENT: Setup logger
logger = logging.getLogger(__name__)


def get_safe_error_message(detailed_message: str, generic_message: str = "An error occurred.") -> str:
    """
    Return detailed error messages in DEBUG mode, generic messages in production.
    This prevents information leakage about internal IDs and system structure.
    """
    if settings.DEBUG:
        return detailed_message
    return generic_message

# Load environment variables
load_dotenv()


# ✅ IMPROVEMENT: Lazy load Stripe API key
def get_stripe_key():
    """
    Lazy load and configure Stripe API key.
    Raises ValueError if STRIPE_SECRET_KEY is not set.
    """
    if not stripe.api_key:
        stripe.api_key = os.getenv('STRIPE_SECRET_KEY')
        if not stripe.api_key:
            raise ValueError("STRIPE_SECRET_KEY environment variable is required for payment processing")
        logger.info("Stripe API configured")
    return stripe.api_key


class OrderCreationError(Exception):
    """Custom exception for order creation failures."""
    pass


def create_order_from_cart(
    *, 
    user: User, 
    cart_items: List[Dict[str, Any]], 
    shipping_info: Dict[str, Any], 
    stripe_token: str
) -> Order:
    """
    Service function to handle the entire order creation process.
    
    This function encapsulates all the business logic for creating an order using a
    two-phase commit strategy:
    - Validates product availability and stock
    - Reserves inventory and creates the order in a short atomic section
    - Processes payment through Stripe outside the database transaction
    - Confirms the order in a second, fast transaction once payment succeeds
    
    Args:
        user: The authenticated user placing the order
        cart_items: List of dictionaries with 'id' and 'quantity' keys
        shipping_info: Dictionary containing shipping information
        stripe_token: Stripe payment token from the frontend
        
    Returns:
        Order: The created order instance
        
    Raises:
        OrderCreationError: If any step in the order creation process fails
    """
    # Validate input parameters
    if not cart_items:
        raise OrderCreationError("Cart cannot be empty.")
    
    if not stripe_token:
        raise OrderCreationError("Payment token is required.")
    
    product_ids = [item['id'] for item in cart_items]

    order: Optional[Order] = None
    total_cost = Decimal('0')

    try:
        # --- Phase 1: Reserve inventory and create order record ---
        with transaction.atomic():
            locked_products = (
                Product.objects.select_for_update()
                .filter(id__in=product_ids)
            )
            products = {product.id: product for product in locked_products}
            missing_ids = set(product_ids) - set(products.keys())
            if missing_ids:
                logger.warning(f"Order creation failed: Product IDs not found: {missing_ids}")
                raise OrderCreationError(
                    get_safe_error_message(
                        f"Product with ID {next(iter(missing_ids))} not found.",
                        "One or more products in your cart are no longer available."
                    )
                )

            order = Order.objects.create(
                user=user,
                first_name=shipping_info['first_name'],
                last_name=shipping_info['last_name'],
                email=shipping_info['email'],
                address=shipping_info['address'],
                postal_code=shipping_info['postal_code'],
                city=shipping_info['city'],
                status='pending_payment',
            )

            changed_product_ids = set()

            for item_data in cart_items:
                product = products.get(item_data['id'])
                if not product:
                    logger.warning(f"Order creation failed: Product ID {item_data['id']} not in locked set")
                    raise OrderCreationError(
                        get_safe_error_message(
                            f"Product with ID {item_data['id']} not found.",
                            "One or more products in your cart are no longer available."
                        )
                    )

                if not product.available:
                    raise OrderCreationError(
                        get_safe_error_message(
                            f"Product '{product.name}' is no longer available.",
                            "One or more products in your cart are no longer available."
                        )
                    )

                quantity = item_data['quantity']
                if quantity <= 0:
                    raise OrderCreationError(f"Invalid quantity ({quantity}) for product '{product.name}'.")

                if product.stock < quantity:
                    raise OrderCreationError(
                        f"Not enough stock for '{product.name}'. "
                        f"Only {product.stock} available, but {quantity} requested."
                    )

                OrderItem.objects.create(
                    order=order,
                    product=product,
                    price=product.price,
                    quantity=quantity,
                )

                total_cost += product.price * quantity
                product.stock -= quantity
                changed_product_ids.add(product.id)

            if total_cost <= 0:
                raise OrderCreationError("Order total must be greater than zero.")

            if changed_product_ids:
                Product.objects.bulk_update(
                    [products[pid] for pid in changed_product_ids],
                    ['stock']
                )

            order.total_paid = total_cost
            order.save(update_fields=['total_paid', 'status', 'updated_at'])

        # --- Phase 2: Process payment outside of DB transaction ---
        try:
            get_stripe_key()
            charge = stripe.Charge.create(
                amount=order.get_total_cost_stripe(),
                currency='usd',
                description=f'Order {order.pk} for {order.email}',
                source=stripe_token,
                metadata={
                    'order_id': order.pk,
                    'user_id': user.pk,
                    'user_email': user.email,
                }
            )
        except Exception as e:
            # --- Compensation Phase: Rollback stock if payment fails ---
            logger.error(f"Payment processing failed for order {order.pk}. Initiating stock rollback. Error: {e}")
            
            try:
                with transaction.atomic():
                    # Re-fetch order items to get quantities
                    items_to_restore = OrderItem.objects.filter(order=order).select_related('product')
                    
                    # Lock products for update to prevent race conditions
                    product_ids = [item.product.id for item in items_to_restore]
                    products_to_update = Product.objects.select_for_update().filter(id__in=product_ids)
                    product_map = {p.id: p for p in products_to_update}
                    
                    for item in items_to_restore:
                        product = product_map.get(item.product.id)
                        if product:
                            product.stock += item.quantity
                            logger.info(f"Restoring {item.quantity} stock for product {product.id}")
                    
                    # Bulk update products
                    if products_to_update:
                        Product.objects.bulk_update(products_to_update, ['stock'])
                    
                    # Cancel the order
                    order.status = 'cancelled'
                    order.save(update_fields=['status', 'updated_at'])
                    logger.info(f"Order {order.pk} cancelled and stock restored due to payment failure.")
                    
            except Exception as rollback_error:
                # Critical error: Rollback failed. Stock is now inconsistent.
                logger.critical(f"CRITICAL: Stock rollback failed for order {order.pk}! Error: {rollback_error}", exc_info=True)
            
            # Determine the appropriate error message for the user
            error_msg = f"Payment processing error: {str(e)}"
            
            if isinstance(e, stripe.error.CardError):
                err = e.error
                error_msg = f"Payment declined: {err.get('message', 'Card was declined')}"
                logger.warning(f"Card error for order {order.pk}: {error_msg}")
            elif isinstance(e, stripe.error.RateLimitError):
                error_msg = "Too many payment requests. Please try again in a moment."
                logger.warning(f"Stripe rate limit hit for order {order.pk}")
            elif isinstance(e, stripe.error.InvalidRequestError):
                error_msg = f"Invalid payment request: {str(e)}"
                logger.error(f"Invalid Stripe request for order {order.pk}: {e}")
            elif isinstance(e, stripe.error.AuthenticationError):
                error_msg = "Payment system configuration error. Please contact support."
                logger.error(f"Stripe authentication error: {e}", exc_info=True)
            elif isinstance(e, stripe.error.APIConnectionError):
                error_msg = "Payment service is temporarily unavailable. Please try again."
                logger.error(f"Stripe API connection error for order {order.pk}: {e}")
            
            # Re-raise as OrderCreationError
            raise OrderCreationError(error_msg) from e

        # --- Phase 3: Confirm payment in a short transaction ---
        with transaction.atomic():
            order_to_update = Order.objects.select_for_update().get(id=order.id)
            if order_to_update.status == 'pending_payment':
                order_to_update.paid = True
                order_to_update.stripe_id = charge.id
                order_to_update.status = 'processing'
                order_to_update.save(update_fields=['paid', 'stripe_id', 'status', 'updated_at'])

            logger.info(f"Order {order_to_update.pk} created successfully for user {user.pk}")
            return order_to_update

    except OrderCreationError:
        raise
    except Exception as e:
        raise OrderCreationError(f"An unexpected error occurred during order creation: {str(e)}") from e


def get_order_summary(order: Order) -> Dict[str, Any]:
    """
    Generate a summary of an order for display purposes.
    
    Args:
        order: The order instance to summarize
        
    Returns:
        Dict containing order summary information
    """
    # Use getattr to access the reverse foreign key relationship
    # This helps Pylance understand that the attribute exists
    items_queryset = getattr(order, 'items')
    
    return {
        'order_id': order.pk,
        'total_paid': order.total_paid,
        'item_count': items_queryset.count(),
        'created_at': order.created_at,
        'paid': order.paid,
        'stripe_id': order.stripe_id,
    }


def validate_cart_items(cart_items: List[Dict[str, Any]]) -> List[str]:
    """
    Validate cart items and return a list of validation errors.
    
    Args:
        cart_items: List of cart item dictionaries
        
    Returns:
        List of validation error messages (empty if valid)
    """
    errors = []
    
    if not cart_items:
        errors.append("Cart cannot be empty.")
        return errors
    
    for i, item in enumerate(cart_items):
        if 'id' not in item:
            errors.append(f"Item {i + 1}: Product ID is required.")
        elif not isinstance(item['id'], int) or item['id'] <= 0:
            errors.append(f"Item {i + 1}: Invalid product ID.")
            
        if 'quantity' not in item:
            errors.append(f"Item {i + 1}: Quantity is required.")
        elif not isinstance(item['quantity'], int) or item['quantity'] <= 0:
            errors.append(f"Item {i + 1}: Quantity must be a positive integer.")
    
    return errors