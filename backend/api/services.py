"""
Service layer for business logic operations.
This module contains business logic that is independent of the HTTP layer,
making it easier to test, reuse, and maintain.
"""

import os
import stripe
from decimal import Decimal
from typing import Dict, List, Any, TYPE_CHECKING, cast
from dotenv import load_dotenv

from django.db import transaction
from django.contrib.auth.models import User
from stripe.error import StripeError # type: ignore

if TYPE_CHECKING:
    from django.db.models import QuerySet

from .models import Product, Order, OrderItem

# Load environment variables and configure Stripe
load_dotenv()
stripe.api_key = os.getenv('STRIPE_SECRET_KEY')


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
    
    This function encapsulates all the business logic for creating an order:
    - Validates product availability and stock
    - Creates order and order items
    - Processes payment through Stripe
    - Updates product stock
    - All operations are wrapped in a database transaction for consistency
    
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
    
    # N+1 Fix: Get all product IDs from the cart
    product_ids = [item['id'] for item in cart_items]
    # Fetch all products in a single query
    products = Product.objects.in_bulk(product_ids)

    try:
        with transaction.atomic():
            # 1. Create the Order object
            order = Order.objects.create(
                user=user,
                first_name=shipping_info['first_name'],
                last_name=shipping_info['last_name'],
                email=shipping_info['email'],
                address=shipping_info['address'],
                postal_code=shipping_info['postal_code'],
                city=shipping_info['city'],
            )
            
            total_cost = Decimal('0')
            products_to_update = []

            # 2. Create OrderItem objects and prepare stock updates
            for item_data in cart_items:
                product = products.get(item_data['id'])
                if not product:
                    raise OrderCreationError(f"Product with ID {item_data['id']} not found.")
                
                if not product.available:
                    raise OrderCreationError(f"Product '{product.name}' is no longer available.")
                
                quantity = item_data['quantity']
                if quantity <= 0:
                    raise OrderCreationError(f"Invalid quantity ({quantity}) for product '{product.name}'.")
                
                if product.stock < quantity:
                    raise OrderCreationError(
                        f"Not enough stock for '{product.name}'. "
                        f"Only {product.stock} available, but {quantity} requested."
                    )

                # Create order item
                OrderItem.objects.create(
                    order=order,
                    product=product,
                    price=product.price,
                    quantity=quantity
                )
                
                # Calculate total cost
                total_cost += product.price * quantity
                
                # Prepare stock update
                product.stock -= quantity
                products_to_update.append(product)
            
            # Validate total cost
            if total_cost <= 0:
                raise OrderCreationError("Order total must be greater than zero.")
            
            # Bulk update product stock in one query for performance
            Product.objects.bulk_update(products_to_update, ['stock'])
            
            # Update order total
            order.total_paid = total_cost
            
            # 3. Process payment with Stripe
            try:
                charge = stripe.Charge.create(
                    amount=int(total_cost * 100),  # Stripe expects amount in cents
                    currency='usd',
                    description=f'Order {order.pk} for {order.email}',
                    source=stripe_token,
                )
                
                # 4. Finalize the order if payment is successful
                order.paid = True
                order.stripe_id = charge.id
                order.save()
                
            except StripeError as e:
                # The transaction will rollback automatically due to the exception
                raise OrderCreationError(f"Payment failed: {str(e)}") from e

            return order
            
    except OrderCreationError:
        # Re-raise our custom exceptions as-is
        raise
    except Exception as e:
        # Wrap any unexpected exceptions
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