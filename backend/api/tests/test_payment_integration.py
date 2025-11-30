"""
Integration tests for payment flow.
Tests the complete order creation and payment process.
"""

from decimal import Decimal
from unittest.mock import patch, MagicMock
from django.test import TestCase, TransactionTestCase
from django.contrib.auth.models import User
from rest_framework.test import APIClient
from rest_framework import status

from api.models import Product, Category, Brand, Order, OrderItem


class TestPaymentFlowIntegration(TransactionTestCase):
    """
    Integration tests for the complete payment flow.
    Tests API endpoints for order creation with payment processing.
    """

    def setUp(self):
        """Set up test data and API client."""
        self.client = APIClient()
        
        # Create test user
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123',
            first_name='Test',
            last_name='User'
        )
        
        # Create category and brand
        self.category = Category.objects.create(
            name='Audio Equipment',
            slug='audio-equipment'
        )
        
        self.brand = Brand.objects.create(
            name='Professional Audio',
            slug='professional-audio'
        )
        
        # Create products
        self.product1 = Product.objects.create(
            name='Professional Microphone',
            category=self.category,
            brand=self.brand,
            price=Decimal('299.99'),
            stock=20,
            available=True
        )
        
        self.product2 = Product.objects.create(
            name='Audio Interface',
            category=self.category,
            brand=self.brand,
            price=Decimal('199.99'),
            stock=15,
            available=True
        )
        
        # Authenticate client
        self.client.force_authenticate(user=self.user)

    def test_order_endpoint_requires_authentication(self):
        """Order creation should require authentication."""
        self.client.force_authenticate(user=None)
        
        response = self.client.post('/api/orders/', {
            'items': [{'id': self.product1.id, 'quantity': 1}],
            'shipping_info': {
                'first_name': 'John',
                'last_name': 'Doe',
                'email': 'john@example.com',
                'address': '123 Main St',
                'postal_code': '12345',
                'city': 'Test City'
            },
            'stripe_token': 'tok_test'
        }, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_order_with_invalid_product_id(self):
        """Order with non-existent product should fail."""
        response = self.client.post('/api/orders/', {
            'items': [{'id': 99999, 'quantity': 1}],
            'shipping_info': {
                'first_name': 'John',
                'last_name': 'Doe',
                'email': 'john@example.com',
                'address': '123 Main St',
                'postal_code': '12345',
                'city': 'Test City'
            },
            'stripe_token': 'tok_test'
        }, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('error', response.data)

    def test_order_with_empty_cart(self):
        """Order with empty cart should fail."""
        response = self.client.post('/api/orders/', {
            'items': [],
            'shipping_info': {
                'first_name': 'John',
                'last_name': 'Doe',
                'email': 'john@example.com',
                'address': '123 Main St',
                'postal_code': '12345',
                'city': 'Test City'
            },
            'stripe_token': 'tok_test'
        }, format='json')
        
        # Should fail validation (items is required and must have at least one item)
        self.assertIn(response.status_code, [status.HTTP_400_BAD_REQUEST])

    def test_order_with_missing_shipping_info(self):
        """Order with missing shipping info should fail validation."""
        response = self.client.post('/api/orders/', {
            'items': [{'id': self.product1.id, 'quantity': 1}],
            'shipping_info': {
                'first_name': 'John',
                # Missing required fields
            },
            'stripe_token': 'tok_test'
        }, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_order_with_insufficient_stock(self):
        """Order requesting more than available stock should fail."""
        response = self.client.post('/api/orders/', {
            'items': [{'id': self.product1.id, 'quantity': 1000}],  # Only 20 in stock
            'shipping_info': {
                'first_name': 'John',
                'last_name': 'Doe',
                'email': 'john@example.com',
                'address': '123 Main St',
                'postal_code': '12345',
                'city': 'Test City'
            },
            'stripe_token': 'tok_test'
        }, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('error', response.data)
        self.assertIn('stock', response.data['error'].lower())

    @patch('api.services.stripe.Charge.create')
    def test_successful_order_flow(self, mock_stripe_charge):
        """Complete successful order should create order and reduce stock."""
        # Mock successful Stripe charge
        mock_stripe_charge.return_value = MagicMock(id='ch_integration_test')
        
        initial_stock1 = self.product1.stock
        initial_stock2 = self.product2.stock
        
        response = self.client.post('/api/orders/', {
            'items': [
                {'id': self.product1.id, 'quantity': 2},
                {'id': self.product2.id, 'quantity': 1}
            ],
            'shipping_info': {
                'first_name': 'John',
                'last_name': 'Doe',
                'email': 'john@example.com',
                'address': '123 Main St',
                'postal_code': '12345',
                'city': 'Test City'
            },
            'stripe_token': 'tok_test'
        }, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        
        # Verify response contains order data
        self.assertIn('id', response.data)
        self.assertTrue(response.data['paid'])
        
        # Verify stock was reduced
        self.product1.refresh_from_db()
        self.product2.refresh_from_db()
        self.assertEqual(self.product1.stock, initial_stock1 - 2)
        self.assertEqual(self.product2.stock, initial_stock2 - 1)
        
        # Verify order was created in database
        order = Order.objects.get(id=response.data['id'])
        self.assertEqual(order.user, self.user)
        self.assertEqual(order.items.count(), 2)
        self.assertEqual(order.stripe_id, 'ch_integration_test')

    @patch('api.services.stripe.Charge.create')
    def test_stripe_card_declined(self, mock_stripe_charge):
        """Stripe card decline should return appropriate error."""
        import stripe
        
        # Create a proper CardError with all required parameters
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
        
        response = self.client.post('/api/orders/', {
            'items': [{'id': self.product1.id, 'quantity': 1}],
            'shipping_info': {
                'first_name': 'John',
                'last_name': 'Doe',
                'email': 'john@example.com',
                'address': '123 Main St',
                'postal_code': '12345',
                'city': 'Test City'
            },
            'stripe_token': 'tok_invalid'
        }, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('error', response.data)
        self.assertIn('declined', response.data['error'].lower())

    @patch('api.services.stripe.Charge.create')
    def test_stripe_api_connection_error(self, mock_stripe_charge):
        """Stripe API connection error should return appropriate error."""
        import stripe
        mock_stripe_charge.side_effect = stripe.error.APIConnectionError(
            message="Network error"
        )
        
        response = self.client.post('/api/orders/', {
            'items': [{'id': self.product1.id, 'quantity': 1}],
            'shipping_info': {
                'first_name': 'John',
                'last_name': 'Doe',
                'email': 'john@example.com',
                'address': '123 Main St',
                'postal_code': '12345',
                'city': 'Test City'
            },
            'stripe_token': 'tok_test'
        }, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('error', response.data)

    def test_get_user_orders(self):
        """User should be able to retrieve their order history."""
        # Create some orders first
        Order.objects.create(
            user=self.user,
            first_name='John',
            last_name='Doe',
            email='john@example.com',
            address='123 Main St',
            postal_code='12345',
            city='Test City',
            total_paid=Decimal('299.99'),
            paid=True,
            status='delivered'
        )
        
        Order.objects.create(
            user=self.user,
            first_name='John',
            last_name='Doe',
            email='john@example.com',
            address='456 Oak Ave',
            postal_code='67890',
            city='Test City',
            total_paid=Decimal('199.99'),
            paid=True,
            status='processing'
        )
        
        response = self.client.get('/api/orders/')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 2)

    def test_user_cannot_see_other_users_orders(self):
        """User should only see their own orders."""
        # Create order for another user
        other_user = User.objects.create_user(
            username='otheruser',
            email='other@example.com',
            password='pass123'
        )
        
        Order.objects.create(
            user=other_user,
            first_name='Other',
            last_name='User',
            email='other@example.com',
            address='789 Pine Blvd',
            postal_code='11111',
            city='Other City',
            total_paid=Decimal('599.99'),
            paid=True
        )
        
        response = self.client.get('/api/orders/')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 0)  # Should not see other user's order


class TestOrderCancellation(TransactionTestCase):
    """Tests for order cancellation functionality."""

    def setUp(self):
        """Set up test data."""
        self.client = APIClient()
        
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123'
        )
        
        self.client.force_authenticate(user=self.user)
        
        # Create an order
        self.order = Order.objects.create(
            user=self.user,
            first_name='John',
            last_name='Doe',
            email='john@example.com',
            address='123 Main St',
            postal_code='12345',
            city='Test City',
            total_paid=Decimal('299.99'),
            paid=True,
            status='pending'
        )

    def test_cancel_pending_order(self):
        """User should be able to cancel pending orders."""
        response = self.client.patch(
            f'/api/dashboard/orders/{self.order.id}/',
            {'action': 'cancel'},
            format='json'
        )
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        self.order.refresh_from_db()
        self.assertEqual(self.order.status, 'cancelled')

    def test_cannot_cancel_shipped_order(self):
        """User should not be able to cancel shipped orders."""
        self.order.status = 'shipped'
        self.order.save()
        
        response = self.client.patch(
            f'/api/dashboard/orders/{self.order.id}/',
            {'action': 'cancel'},
            format='json'
        )
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        
        self.order.refresh_from_db()
        self.assertEqual(self.order.status, 'shipped')

    def test_cannot_cancel_delivered_order(self):
        """User should not be able to cancel delivered orders."""
        self.order.status = 'delivered'
        self.order.save()
        
        response = self.client.patch(
            f'/api/dashboard/orders/{self.order.id}/',
            {'action': 'cancel'},
            format='json'
        )
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
