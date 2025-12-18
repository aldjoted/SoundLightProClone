"""
Service layer for business logic operations.

This module contains business logic that is independent of the HTTP layer,
making it easier to test, reuse, and maintain.

All order-related business logic is centralized here, following the pattern:
    Views (thin HTTP layer) → Services (business logic) → Models (data layer)
"""

from __future__ import annotations

import logging
import os
from decimal import Decimal
from typing import TYPE_CHECKING, Any, Final

import stripe
from django.conf import settings
from django.contrib.auth.models import User
from django.db import transaction
from dotenv import load_dotenv
from stripe.error import StripeError  # type: ignore[import-untyped]

from .models import Order, OrderItem, Product

if TYPE_CHECKING:
    from collections.abc import Mapping, Sequence

__all__: Final[list[str]] = [
    "OrderCreationError",
    "create_order_from_cart",
    "get_order_summary",
    "validate_cart_items",
    "get_stripe_key",
]

logger: Final = logging.getLogger(__name__)


def get_safe_error_message(detailed_message: str, generic_message: str = "An error occurred.") -> str:
    """
    Return detailed error messages in DEBUG mode, generic messages in production.
    
    This prevents information leakage about internal IDs and system structure
    while still providing useful debugging information during development.
    
    Args:
        detailed_message: The full error message with potentially sensitive details.
        generic_message: A user-friendly message safe for production.
        
    Returns:
        The appropriate message based on the DEBUG setting.
    """
    if settings.DEBUG:
        return detailed_message
    return generic_message


# Load environment variables
load_dotenv()


def get_stripe_key() -> str:
    """
    Lazily load and configure the Stripe API key.
    
    This function configures the global stripe.api_key only once,
    ensuring the key is not logged or exposed unnecessarily.
    
    Returns:
        The configured Stripe API key.
        
    Raises:
        ValueError: If STRIPE_SECRET_KEY environment variable is not set.
    """
    if not stripe.api_key:
        api_key = os.getenv("STRIPE_SECRET_KEY")
        if not api_key:
            raise ValueError(
                "STRIPE_SECRET_KEY environment variable is required for payment processing"
            )
        stripe.api_key = api_key
        logger.info("Stripe API configured successfully")
    return stripe.api_key


class OrderCreationError(Exception):
    """
    Custom exception for order creation failures.
    
    This exception provides structured error information for the frontend,
    including machine-readable error codes for programmatic handling.
    
    Attributes:
        message: Human-readable error message for display.
        code: Machine-readable error code for frontend handling.
        details: Optional dictionary with additional error context.
        
    Example:
        >>> raise OrderCreationError(
        ...     "Product 'Speaker X' is out of stock",
        ...     code=OrderCreationError.INSUFFICIENT_STOCK,
        ...     details={"product_id": 123, "available": 0, "requested": 5}
        ... )
    """

    # Error codes for different failure types
    EMPTY_CART: Final[str] = "empty_cart"
    MISSING_TOKEN: Final[str] = "missing_payment_token"
    PRODUCT_NOT_FOUND: Final[str] = "product_not_found"
    PRODUCT_UNAVAILABLE: Final[str] = "product_unavailable"
    INSUFFICIENT_STOCK: Final[str] = "insufficient_stock"
    INVALID_QUANTITY: Final[str] = "invalid_quantity"
    INVALID_TOTAL: Final[str] = "invalid_total"
    PAYMENT_FAILED: Final[str] = "payment_failed"
    UNEXPECTED_ERROR: Final[str] = "unexpected_error"

    def __init__(
        self,
        message: str,
        code: str = "unexpected_error",
        details: Mapping[str, Any] | None = None,
    ) -> None:
        super().__init__(message)
        self.message = message
        self.code = code
        self.details: dict[str, Any] = dict(details) if details else {}


def create_order_from_cart(
    *,
    user: User,
    cart_items: Sequence[Mapping[str, Any]],
    shipping_info: Mapping[str, Any],
    stripe_token: str,
) -> Order:
    """
    Create an order from shopping cart data using a two-phase commit strategy.
    
    This function implements a robust order creation flow:
    
    1. **Phase 1 - Reserve Inventory**: Within an atomic transaction, validate
       all products, check stock availability, decrement stock, and create
       the Order + OrderItem records with status 'pending_payment'.
       
    2. **Phase 2 - Process Payment**: Outside the DB transaction, charge the
       customer via Stripe. If this fails, execute compensation logic to
       restore stock and mark the order as cancelled.
       
    3. **Phase 3 - Confirm Order**: In a short atomic transaction, update
       the order status to 'processing' and record the Stripe charge ID.
    
    Args:
        user: The authenticated user placing the order.
        cart_items: List of dicts with 'id' (product ID) and 'quantity' keys.
        shipping_info: Dict containing 'first_name', 'last_name', 'email',
                      'address', 'postal_code', and 'city'.
        stripe_token: Stripe payment token from the frontend (e.g., tok_xxx).
        
    Returns:
        The created and confirmed Order instance.
        
    Raises:
        OrderCreationError: If validation fails, stock is insufficient,
                           or payment processing fails.
    """
    # Validate input parameters
    if not cart_items:
        raise OrderCreationError(
            "Cart cannot be empty.",
            code=OrderCreationError.EMPTY_CART,
        )

    if not stripe_token:
        raise OrderCreationError(
            "Payment token is required.",
            code=OrderCreationError.MISSING_TOKEN,
        )
    
    product_ids = [item["id"] for item in cart_items]

    order: Order | None = None
    total_cost = Decimal("0")

    try:
        # --- Phase 1: Reserve inventory and create order record ---
        with transaction.atomic():
            locked_products = Product.objects.select_for_update().filter(id__in=product_ids)
            products = {product.id: product for product in locked_products}
            missing_ids = set(product_ids) - set(products.keys())
            if missing_ids:
                logger.warning(f"Order creation failed: Product IDs not found: {missing_ids}")
                raise OrderCreationError(
                    get_safe_error_message(
                        f"Product with ID {next(iter(missing_ids))} not found.",
                        "One or more products in your cart are no longer available.",
                    ),
                    code=OrderCreationError.PRODUCT_NOT_FOUND,
                    details={"missing_ids": list(missing_ids)},
                )

            order = Order.objects.create(
                user=user,
                first_name=shipping_info["first_name"],
                last_name=shipping_info["last_name"],
                email=shipping_info["email"],
                address=shipping_info["address"],
                postal_code=shipping_info["postal_code"],
                city=shipping_info["city"],
                status="pending_payment",
            )

            changed_product_ids: set[int] = set()

            for item_data in cart_items:
                product = products.get(item_data["id"])
                if not product:
                    logger.warning(
                        f"Order creation failed: Product ID {item_data['id']} not in locked set"
                    )
                    raise OrderCreationError(
                        get_safe_error_message(
                            f"Product with ID {item_data['id']} not found.",
                            "One or more products in your cart are no longer available.",
                        ),
                        code=OrderCreationError.PRODUCT_NOT_FOUND,
                    )

                if not product.available:
                    raise OrderCreationError(
                        get_safe_error_message(
                            f"Product '{product.name}' is no longer available.",
                            "One or more products in your cart are no longer available.",
                        ),
                        code=OrderCreationError.PRODUCT_UNAVAILABLE,
                        details={"product_id": product.id, "product_name": product.name},
                    )

                quantity = item_data["quantity"]
                if quantity <= 0:
                    raise OrderCreationError(
                        f"Invalid quantity ({quantity}) for product '{product.name}'.",
                        code=OrderCreationError.INVALID_QUANTITY,
                        details={"product_id": product.id, "quantity": quantity},
                    )

                if product.stock < quantity:
                    raise OrderCreationError(
                        f"Not enough stock for '{product.name}'. "
                        f"Only {product.stock} available, but {quantity} requested.",
                        code=OrderCreationError.INSUFFICIENT_STOCK,
                        details={
                            "product_id": product.id,
                            "available": product.stock,
                            "requested": quantity,
                        },
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
                raise OrderCreationError(
                    "Order total must be greater than zero.",
                    code=OrderCreationError.INVALID_TOTAL,
                )

            if changed_product_ids:
                Product.objects.bulk_update(
                    [products[pid] for pid in changed_product_ids],
                    ["stock"],
                )

            order.total_paid = total_cost
            order.save(update_fields=["total_paid", "status", "updated_at"])

        # --- Phase 2: Process payment outside of DB transaction ---
        try:
            get_stripe_key()
            charge = stripe.Charge.create(
                amount=order.get_total_cost_stripe(),
                currency="usd",
                description=f"Order {order.pk} for {order.email}",
                source=stripe_token,
                metadata={
                    "order_id": order.pk,
                    "user_id": user.pk,
                    "user_email": user.email,
                },
            )
        except stripe.error.StripeError as e:
            # --- Compensation Phase: Rollback stock if payment fails ---
            _rollback_order_stock(order)

            # Determine the appropriate error message for the user
            error_msg = _get_stripe_error_message(e, order.pk)

            raise OrderCreationError(
                error_msg,
                code=OrderCreationError.PAYMENT_FAILED,
                details={"stripe_error": str(e)},
            ) from e
        except Exception as e:
            # Non-Stripe exceptions during payment
            _rollback_order_stock(order)
            logger.exception(f"Unexpected error during payment for order {order.pk}")
            raise OrderCreationError(
                "An unexpected error occurred during payment processing.",
                code=OrderCreationError.PAYMENT_FAILED,
            ) from e

        # --- Phase 3: Confirm payment in a short transaction ---
        with transaction.atomic():
            order_to_update = Order.objects.select_for_update().get(id=order.id)
            if order_to_update.status == "pending_payment":
                order_to_update.paid = True
                order_to_update.stripe_id = charge.id
                order_to_update.status = "processing"
                order_to_update.save(
                    update_fields=["paid", "stripe_id", "status", "updated_at"]
                )

            logger.info(f"Order {order_to_update.pk} created successfully for user {user.pk}")
            return order_to_update

    except OrderCreationError:
        raise
    except Exception as e:
        logger.exception("Unexpected error during order creation")
        raise OrderCreationError(
            f"An unexpected error occurred during order creation: {e!s}",
            code=OrderCreationError.UNEXPECTED_ERROR,
        ) from e


def _rollback_order_stock(order: Order) -> None:
    """
    Restore stock levels after a failed payment.
    
    This compensation function is called when payment fails after stock
    has already been decremented. It restores the original stock levels
    and marks the order as cancelled.
    
    Args:
        order: The Order instance whose items need stock restoration.
    """
    logger.error(
        f"Payment failed for order {order.pk}. Initiating stock rollback."
    )

    try:
        with transaction.atomic():
            items_to_restore = OrderItem.objects.filter(order=order).select_related(
                "product"
            )
            product_ids = [item.product.id for item in items_to_restore]
            products_to_update = Product.objects.select_for_update().filter(
                id__in=product_ids
            )
            product_map = {p.id: p for p in products_to_update}

            for item in items_to_restore:
                product = product_map.get(item.product.id)
                if product:
                    product.stock += item.quantity
                    logger.info(
                        f"Restoring {item.quantity} stock for product {product.id}"
                    )

            if products_to_update:
                Product.objects.bulk_update(list(products_to_update), ["stock"])

            order.status = "cancelled"
            order.save(update_fields=["status", "updated_at"])
            logger.info(
                f"Order {order.pk} cancelled and stock restored due to payment failure."
            )

    except Exception as rollback_error:
        logger.critical(
            f"CRITICAL: Stock rollback failed for order {order.pk}! "
            f"Manual intervention required. Error: {rollback_error}",
            exc_info=True,
        )


def _get_stripe_error_message(error: stripe.error.StripeError, order_pk: int) -> str:
    """
    Convert a Stripe error into a user-friendly message.
    
    Args:
        error: The Stripe error that occurred.
        order_pk: The order ID for logging context.
        
    Returns:
        A user-friendly error message.
    """
    if isinstance(error, stripe.error.CardError):
        err = error.error
        msg = f"Payment declined: {err.get('message', 'Card was declined')}"
        logger.warning(f"Card error for order {order_pk}: {msg}")
        return msg

    if isinstance(error, stripe.error.RateLimitError):
        logger.warning(f"Stripe rate limit hit for order {order_pk}")
        return "Too many payment requests. Please try again in a moment."

    if isinstance(error, stripe.error.InvalidRequestError):
        logger.error(f"Invalid Stripe request for order {order_pk}: {error}")
        return f"Invalid payment request: {error!s}"

    if isinstance(error, stripe.error.AuthenticationError):
        logger.error(f"Stripe authentication error: {error}", exc_info=True)
        return "Payment system configuration error. Please contact support."

    if isinstance(error, stripe.error.APIConnectionError):
        logger.error(f"Stripe API connection error for order {order_pk}: {error}")
        return "Payment service is temporarily unavailable. Please try again."

    logger.error(f"Unhandled Stripe error for order {order_pk}: {error}")
    return f"Payment processing error: {error!s}"


def get_order_summary(order: Order) -> dict[str, Any]:
    """
    Generate a summary of an order for display purposes.
    
    Args:
        order: The order instance to summarize.
        
    Returns:
        Dictionary containing order summary information including
        order_id, total_paid, item_count, created_at, paid status,
        and stripe_id.
    """
    items_queryset = getattr(order, "items")

    return {
        "order_id": order.pk,
        "total_paid": order.total_paid,
        "item_count": items_queryset.count(),
        "created_at": order.created_at,
        "paid": order.paid,
        "stripe_id": order.stripe_id,
    }


def validate_cart_items(cart_items: Sequence[Mapping[str, Any]]) -> list[str]:
    """
    Validate cart items and return a list of validation errors.
    
    This function performs structural validation only (checking that
    required fields exist and have valid types). It does not check
    product availability or stock levels.
    
    Args:
        cart_items: List of cart item dictionaries to validate.
        
    Returns:
        List of validation error messages (empty if all items are valid).
    """
    errors: list[str] = []

    if not cart_items:
        errors.append("Cart cannot be empty.")
        return errors

    for i, item in enumerate(cart_items):
        item_num = i + 1
        if "id" not in item:
            errors.append(f"Item {item_num}: Product ID is required.")
        elif not isinstance(item["id"], int) or item["id"] <= 0:
            errors.append(f"Item {item_num}: Invalid product ID.")

        if "quantity" not in item:
            errors.append(f"Item {item_num}: Quantity is required.")
        elif not isinstance(item["quantity"], int) or item["quantity"] <= 0:
            errors.append(f"Item {item_num}: Quantity must be a positive integer.")

    return errors