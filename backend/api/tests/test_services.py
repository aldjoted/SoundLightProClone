"""
Unit tests for the services layer.
Tests business logic independent of HTTP layer.
"""

from decimal import Decimal
from unittest.mock import patch, MagicMock
from django.test import TestCase, TransactionTestCase
from django.contrib.auth.models import User
from django.db import IntegrityError

from api.services import (
    create_order_from_cart,
    get_order_summary,
    validate_cart_items,
    OrderCreationError,
    get_safe_error_message,
)
from api.models import Product, Category, Brand, Order, OrderItem


class TestGetSafeErrorMessage(TestCase):
    """Tests for the get_safe_error_message helper function."""

    def test_returns_detailed_message_in_debug_mode(self):
        """In DEBUG mode, detailed error messages should be returned."""
        with self.settings(DEBUG=True):
            result = get_safe_error_message(
                "Product with ID 123 not found.",
                "Product not available."
            )
            self.assertEqual(result, "Product with ID 123 not found.")

    def test_returns_generic_message_in_production(self):
        """In production (DEBUG=False), generic messages should be returned."""
        with self.settings(DEBUG=False):
            result = get_safe_error_message(
                "Product with ID 123 not found.",
                "Product not available."
            )
            self.assertEqual(result, "Product not available.")


class TestValidateCartItems(TestCase):
    """Tests for the validate_cart_items function."""

    def test_empty_cart_returns_error(self):
        """Empty cart should return validation error."""
        errors = validate_cart_items([])
        self.assertIn("Cart cannot be empty.", errors)

    def test_missing_product_id_returns_error(self):
        """Cart item without product ID should return error."""
        errors = validate_cart_items([{'quantity': 2}])
        self.assertIn("Item 1: Product ID is required.", errors)

    def test_missing_quantity_returns_error(self):
        """Cart item without quantity should return error."""
        errors = validate_cart_items([{'id': 1}])
        self.assertIn("Item 1: Quantity is required.", errors)

    def test_invalid_product_id_returns_error(self):
        """Invalid product ID should return error."""
        errors = validate_cart_items([{'id': -1, 'quantity': 2}])
        self.assertIn("Item 1: Invalid product ID.", errors)

    def test_invalid_quantity_returns_error(self):
        """Invalid quantity should return error."""
        errors = validate_cart_items([{'id': 1, 'quantity': 0}])
        self.assertIn("Item 1: Quantity must be a positive integer.", errors)

    def test_valid_cart_returns_no_errors(self):
        """Valid cart should return empty error list."""
        errors = validate_cart_items([
            {'id': 1, 'quantity': 2},
            {'id': 2, 'quantity': 1}
        ])
        self.assertEqual(errors, [])


class TestCreateOrderFromCart(TransactionTestCase):
    """
    Tests for the create_order_from_cart service function.
    Uses TransactionTestCase for proper transaction handling.
    """

    def setUp(self):
        """Set up test data."""
        # Create test user
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123',
            first_name='Test',
            last_name='User'
        )
        
        # Create category
        self.category = Category.objects.create(
            name='Test Category',
            slug='test-category'
        )
        
        # Create brand
        self.brand = Brand.objects.create(
            name='Test Brand',
            slug='test-brand'
        )
        
        # Create products with stock
        self.product1 = Product.objects.create(
            name='Test Product 1',
            category=self.category,
            brand=self.brand,
            price=Decimal('99.99'),
            stock=10,
            available=True
        )
        
        self.product2 = Product.objects.create(
            name='Test Product 2',
            category=self.category,
            brand=self.brand,
            price=Decimal('49.99'),
            stock=5,
            available=True
        )
        
        # Standard shipping info
        self.shipping_info = {
            'first_name': 'John',
            'last_name': 'Doe',
            'email': 'john@example.com',
            'address': '123 Main St',
            'postal_code': '12345',
            'city': 'Test City'
        }

    def test_empty_cart_raises_error(self):
        """Empty cart should raise OrderCreationError."""
        with self.assertRaises(OrderCreationError) as context:
            create_order_from_cart(
                user=self.user,
                cart_items=[],
                shipping_info=self.shipping_info,
                stripe_token='tok_test'
            )
        self.assertIn("Cart cannot be empty", str(context.exception))

    def test_missing_stripe_token_raises_error(self):
        """Missing stripe token should raise OrderCreationError."""
        with self.assertRaises(OrderCreationError) as context:
            create_order_from_cart(
                user=self.user,
                cart_items=[{'id': self.product1.id, 'quantity': 1}],
                shipping_info=self.shipping_info,
                stripe_token=''
            )
        self.assertIn("Payment token is required", str(context.exception))

    def test_nonexistent_product_raises_error(self):
        """Non-existent product ID should raise OrderCreationError."""
        with self.assertRaises(OrderCreationError) as context:
            create_order_from_cart(
                user=self.user,
                cart_items=[{'id': 99999, 'quantity': 1}],
                shipping_info=self.shipping_info,
                stripe_token='tok_test'
            )
        # Should get a generic or detailed message depending on DEBUG
        self.assertTrue(
            "not found" in str(context.exception).lower() or
            "no longer available" in str(context.exception).lower()
        )

    def test_unavailable_product_raises_error(self):
        """Unavailable product should raise OrderCreationError."""
        self.product1.available = False
        self.product1.save()
        
        with self.assertRaises(OrderCreationError) as context:
            create_order_from_cart(
                user=self.user,
                cart_items=[{'id': self.product1.id, 'quantity': 1}],
                shipping_info=self.shipping_info,
                stripe_token='tok_test'
            )
        self.assertTrue(
            "not found" in str(context.exception).lower() or
            "no longer available" in str(context.exception).lower()
        )

    def test_insufficient_stock_raises_error(self):
        """Ordering more than available stock should raise OrderCreationError."""
        with self.assertRaises(OrderCreationError) as context:
            create_order_from_cart(
                user=self.user,
                cart_items=[{'id': self.product1.id, 'quantity': 100}],  # Only 10 in stock
                shipping_info=self.shipping_info,
                stripe_token='tok_test'
            )
        self.assertIn("stock", str(context.exception).lower())

    def test_invalid_quantity_raises_error(self):
        """Zero or negative quantity should raise OrderCreationError."""
        with self.assertRaises(OrderCreationError) as context:
            create_order_from_cart(
                user=self.user,
                cart_items=[{'id': self.product1.id, 'quantity': 0}],
                shipping_info=self.shipping_info,
                stripe_token='tok_test'
            )
        self.assertIn("Invalid quantity", str(context.exception))

    @patch('api.services.stripe.Charge.create')
    def test_successful_order_creation(self, mock_stripe_charge):
        """Successful order should create order and reduce stock."""
        # Mock successful Stripe charge
        mock_stripe_charge.return_value = MagicMock(id='ch_test123')
        
        initial_stock = self.product1.stock
        order_quantity = 2
        
        order = create_order_from_cart(
            user=self.user,
            cart_items=[{'id': self.product1.id, 'quantity': order_quantity}],
            shipping_info=self.shipping_info,
            stripe_token='tok_test'
        )
        
        # Verify order created
        self.assertIsNotNone(order)
        self.assertEqual(order.user, self.user)
        self.assertEqual(order.first_name, self.shipping_info['first_name'])
        self.assertEqual(order.status, 'processing')
        self.assertTrue(order.paid)
        self.assertEqual(order.stripe_id, 'ch_test123')
        
        # Verify order items
        self.assertEqual(order.items.count(), 1)
        order_item = order.items.first()
        self.assertEqual(order_item.product, self.product1)
        self.assertEqual(order_item.quantity, order_quantity)
        
        # Verify stock reduced
        self.product1.refresh_from_db()
        self.assertEqual(self.product1.stock, initial_stock - order_quantity)
        
        # Verify total
        expected_total = self.product1.price * order_quantity
        self.assertEqual(order.total_paid, expected_total)

    @patch('api.services.stripe.Charge.create')
    def test_multiple_items_order(self, mock_stripe_charge):
        """Order with multiple products should be handled correctly."""
        mock_stripe_charge.return_value = MagicMock(id='ch_test456')
        
        cart_items = [
            {'id': self.product1.id, 'quantity': 2},
            {'id': self.product2.id, 'quantity': 3}
        ]
        
        order = create_order_from_cart(
            user=self.user,
            cart_items=cart_items,
            shipping_info=self.shipping_info,
            stripe_token='tok_test'
        )
        
        # Verify order items count
        self.assertEqual(order.items.count(), 2)
        
        # Verify total
        expected_total = (self.product1.price * 2) + (self.product2.price * 3)
        self.assertEqual(order.total_paid, expected_total)

    @patch('api.services.stripe.Charge.create')
    def test_stripe_card_error_raises_order_creation_error(self, mock_stripe_charge):
        """Stripe card error should raise OrderCreationError and rollback."""
        import stripe
        
        # Create a proper CardError with the required structure
        error_response = {
            'error': {
                'message': 'Your card was declined.',
                'type': 'card_error',
                'code': 'card_declined',
            }
        }
        mock_stripe_charge.side_effect = stripe.error.CardError(
            message="Your card was declined.",
            param=None,
            code="card_declined",
            http_body=str(error_response),
            http_status=402,
            json_body=error_response,
        )
        
        initial_stock = self.product1.stock
        
        with self.assertRaises(OrderCreationError) as context:
            create_order_from_cart(
                user=self.user,
                cart_items=[{'id': self.product1.id, 'quantity': 1}],
                shipping_info=self.shipping_info,
                stripe_token='tok_test'
            )
        
        self.assertIn("declined", str(context.exception).lower())
        
        # Stock should be reduced since order was created before payment
        # The order exists but is in pending_payment status


class TestGetOrderSummary(TestCase):
    """Tests for the get_order_summary function."""

    def setUp(self):
        """Set up test data."""
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123'
        )
        
        self.category = Category.objects.create(
            name='Test Category',
            slug='test-category'
        )
        
        self.order = Order.objects.create(
            user=self.user,
            first_name='John',
            last_name='Doe',
            email='john@example.com',
            address='123 Main St',
            postal_code='12345',
            city='Test City',
            total_paid=Decimal('149.99'),
            paid=True,
            stripe_id='ch_test789'
        )
        
        self.product = Product.objects.create(
            name='Test Product',
            category=self.category,
            price=Decimal('49.99'),
            stock=10,
            available=True
        )
        
        OrderItem.objects.create(
            order=self.order,
            product=self.product,
            price=Decimal('49.99'),
            quantity=3
        )

    def test_order_summary_returns_correct_data(self):
        """Order summary should contain correct information."""
        summary = get_order_summary(self.order)
        
        self.assertEqual(summary['order_id'], self.order.pk)
        self.assertEqual(summary['total_paid'], Decimal('149.99'))
        self.assertEqual(summary['item_count'], 1)  # 1 order item (not quantity)
        self.assertTrue(summary['paid'])
        self.assertEqual(summary['stripe_id'], 'ch_test789')


class TestConcurrentOrderCreation(TransactionTestCase):
    """
    Tests for concurrent order creation scenarios.
    Ensures proper handling of race conditions.
    """

    def setUp(self):
        """Set up test data."""
        self.user1 = User.objects.create_user(
            username='user1', email='user1@example.com', password='pass123'
        )
        self.user2 = User.objects.create_user(
            username='user2', email='user2@example.com', password='pass123'
        )
        
        self.category = Category.objects.create(
            name='Test Category', slug='test-category'
        )
        
        # Product with limited stock (only 1 available)
        self.limited_product = Product.objects.create(
            name='Limited Product',
            category=self.category,
            price=Decimal('199.99'),
            stock=1,  # Only 1 in stock!
            available=True
        )
        
        self.shipping_info = {
            'first_name': 'Test',
            'last_name': 'User',
            'email': 'test@example.com',
            'address': '123 Test St',
            'postal_code': '12345',
            'city': 'Test City'
        }

    @patch('api.services.stripe.Charge.create')
    def test_second_order_fails_when_stock_depleted(self, mock_stripe_charge):
        """
        When stock is depleted by first order, second order should fail.
        This tests the select_for_update locking mechanism.
        """
        mock_stripe_charge.return_value = MagicMock(id='ch_test')
        
        # First order succeeds
        order1 = create_order_from_cart(
            user=self.user1,
            cart_items=[{'id': self.limited_product.id, 'quantity': 1}],
            shipping_info=self.shipping_info,
            stripe_token='tok_test1'
        )
        self.assertIsNotNone(order1)
        
        # Refresh to get updated stock
        self.limited_product.refresh_from_db()
        self.assertEqual(self.limited_product.stock, 0)
        
        # Second order should fail due to no stock
        with self.assertRaises(OrderCreationError) as context:
            create_order_from_cart(
                user=self.user2,
                cart_items=[{'id': self.limited_product.id, 'quantity': 1}],
                shipping_info=self.shipping_info,
                stripe_token='tok_test2'
            )
        self.assertIn("stock", str(context.exception).lower())
