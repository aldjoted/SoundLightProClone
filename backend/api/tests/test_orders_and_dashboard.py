from decimal import Decimal
from unittest.mock import patch, MagicMock
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase
from django.contrib.auth.models import User
from django.utils import timezone
from datetime import timedelta
from api.models import (
    Product, Category, Order, ShippingAddress, PaymentMethod, 
    UserProfile, PasswordResetToken, Brand
)

class TestOrderAPI(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username='testuser', email='test@example.com', password='password123'
        )
        self.category = Category.objects.create(name='Test Category', slug='test-category')
        self.product = Product.objects.create(
            name='Test Product',
            category=self.category,
            price=Decimal('100.00'),
            stock=10,
            available=True
        )
        self.shipping_info = {
            'first_name': 'John',
            'last_name': 'Doe',
            'email': 'test@example.com',
            'address': '123 Test St',
            'postal_code': '12345',
            'city': 'Test City',
            'country': 'Cameroon',
            'phone': '1234567890'
        }
        self.url = reverse('order_list_create')

    @patch('api.services.stripe.Charge.create')
    def test_create_order_success(self, mock_charge):
        self.client.force_authenticate(user=self.user)
        
        # Mock Stripe response
        mock_charge.return_value = MagicMock(id='ch_test_123')

        data = {
            'items': [{'id': self.product.id, 'quantity': 2}],
            'shipping_info': self.shipping_info,
            'stripe_token': 'tok_visa'
        }

        response = self.client.post(self.url, data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Order.objects.count(), 1)
        order = Order.objects.first()
        self.assertEqual(order.user, self.user)
        self.assertEqual(order.total_paid, Decimal('200.00'))
        self.assertEqual(order.status, 'processing')
        self.assertTrue(order.paid)
        
        # Verify stock was reduced
        self.product.refresh_from_db()
        self.assertEqual(self.product.stock, 8)

    def test_create_order_invalid_stock(self):
        self.client.force_authenticate(user=self.user)
        
        # Request more than available stock
        data = {
            'items': [{'id': self.product.id, 'quantity': 11}],
            'shipping_info': self.shipping_info,
            'stripe_token': 'tok_visa'
        }

        response = self.client.post(self.url, data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('Not enough stock', str(response.data))
        self.assertEqual(Order.objects.count(), 0)

    @patch('api.services.stripe.Charge.create')
    def test_create_order_payment_failure(self, mock_charge):
        self.client.force_authenticate(user=self.user)
        
        # Mock Stripe error
        import stripe
        error = stripe.error.CardError(
            message="Your card was declined.", 
            param="card_number", 
            code="card_declined",
            http_status=402
        )
        # Manually set the 'error' attribute which the service code expects
        error.error = {'message': 'Your card was declined.'}
        mock_charge.side_effect = error

        data = {
            'items': [{'id': self.product.id, 'quantity': 1}],
            'shipping_info': self.shipping_info,
            'stripe_token': 'tok_visa'
        }

        response = self.client.post(self.url, data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('Payment declined', str(response.data))
        # Order should not exist (rolled back) or be in failed state depending on implementation
        # Based on services.py, it raises OrderCreationError which is caught in view
        # The transaction for order creation is separate from payment, 
        # BUT payment failure raises exception which might rollback if not handled carefully.
        # Looking at services.py:
        # Phase 1 (DB transaction) creates order.
        # Phase 2 (Payment) happens. If fails, it raises OrderCreationError.
        # The view catches OrderCreationError.
        # Wait, Phase 1 is a transaction. If Phase 2 fails, Phase 1 is ALREADY committed.
        # So the order SHOULD exist but be in 'pending_payment' state?
        # Let's check services.py again.
        # "Confirms the order in a second, fast transaction once payment succeeds"
        # So if payment fails, the order remains in 'pending_payment' state?
        # Actually, if `create_order_from_cart` raises exception, the view returns 400.
        # The order created in Phase 1 IS committed.
        # So we expect Order count to be 1, status 'pending_payment'.
        
        self.assertEqual(Order.objects.count(), 1)
        order = Order.objects.first()
        self.assertEqual(order.status, 'pending_payment')
        self.assertFalse(order.paid)

    def test_list_orders(self):
        self.client.force_authenticate(user=self.user)
        Order.objects.create(
            user=self.user,
            first_name='John', last_name='Doe', email='test@example.com',
            address='123 St', postal_code='12345', city='City',
            total_paid=Decimal('50.00'), paid=True
        )
        
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)

    def test_list_orders_unauthenticated(self):
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)


class TestDashboardAPI(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username='testuser', email='test@example.com', password='password123'
        )
        self.client.force_authenticate(user=self.user)

    # --- Shipping Address Tests ---
    def test_list_shipping_addresses(self):
        ShippingAddress.objects.create(
            user=self.user, label='Home', first_name='John', last_name='Doe',
            address_line1='123 St', city='City', postal_code='12345', phone='123'
        )
        url = reverse('dashboard_addresses')
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)

    def test_create_shipping_address(self):
        url = reverse('dashboard_addresses')
        data = {
            'label': 'Work',
            'first_name': 'Jane',
            'last_name': 'Doe',
            'address_line1': '456 Work St',
            'city': 'Work City',
            'postal_code': '67890',
            'phone': '9876543210',
            'country': 'Cameroon'
        }
        response = self.client.post(url, data)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(ShippingAddress.objects.count(), 1)

    def test_update_shipping_address(self):
        address = ShippingAddress.objects.create(
            user=self.user, label='Home', first_name='John', last_name='Doe',
            address_line1='123 St', city='City', postal_code='12345', phone='123'
        )
        url = reverse('dashboard_address_detail', args=[address.id])
        data = {'label': 'Updated Home'}
        response = self.client.patch(url, data)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        address.refresh_from_db()
        self.assertEqual(address.label, 'Updated Home')

    def test_delete_shipping_address(self):
        # Need at least 2 addresses to delete one (cannot delete only address constraint)
        address1 = ShippingAddress.objects.create(
            user=self.user, label='Home', first_name='John', last_name='Doe',
            address_line1='123 St', city='City', postal_code='12345', phone='123'
        )
        address2 = ShippingAddress.objects.create(
            user=self.user, label='Work', first_name='John', last_name='Doe',
            address_line1='456 St', city='City', postal_code='12345', phone='123'
        )
        
        url = reverse('dashboard_address_detail', args=[address1.id])
        response = self.client.delete(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(ShippingAddress.objects.count(), 1)

    # --- Payment Method Tests ---
    @patch('api.views.stripe.PaymentMethod.retrieve')
    def test_create_payment_method(self, mock_retrieve):
        # Mock Stripe response
        mock_retrieve.return_value = MagicMock(
            type='card',
            card=MagicMock(
                brand='visa',
                last4='4242',
                exp_month=12,
                exp_year=2030
            )
        )
        
        url = reverse('dashboard_payment_methods')
        data = {'stripe_payment_method_id': 'pm_test_123', 'is_default': True}
        
        response = self.client.post(url, data)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(PaymentMethod.objects.count(), 1)
        pm = PaymentMethod.objects.first()
        self.assertEqual(pm.stripe_payment_method_id, 'pm_test_123')
        self.assertTrue(pm.is_default)

    @patch('api.views.stripe.PaymentMethod.detach')
    def test_delete_payment_method(self, mock_detach):
        pm = PaymentMethod.objects.create(
            user=self.user, stripe_payment_method_id='pm_test_123', payment_type='card'
        )
        url = reverse('dashboard_payment_method_detail', args=[pm.id])
        
        response = self.client.delete(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(PaymentMethod.objects.count(), 0)
        mock_detach.assert_called_once_with('pm_test_123')

    # --- User Profile Tests ---
    def test_get_user_profile(self):
        # Profile is auto-created by signal, so we just update it
        self.user.profile.phone = '555-5555'
        self.user.profile.save()
        
        url = reverse('dashboard_profile')
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['phone'], '555-5555')

    def test_update_user_profile(self):
        # Profile exists via signal
        url = reverse('dashboard_profile')
        data = {'phone': '999-9999', 'bio': 'Updated bio'}
        response = self.client.patch(url, data)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.user.profile.refresh_from_db()
        self.assertEqual(self.user.profile.phone, '999-9999')
        self.assertEqual(self.user.profile.bio, 'Updated bio')


class TestPasswordResetFlow(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username='testuser', email='test@example.com', password='oldpassword'
        )

    @patch('api.views.send_mail')
    def test_password_reset_request(self, mock_send_mail):
        url = reverse('password_reset_request')
        data = {'email': 'test@example.com'}
        
        response = self.client.post(url, data)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Check token created
        self.assertTrue(PasswordResetToken.objects.filter(user=self.user).exists())
        # Check email sent
        mock_send_mail.assert_called_once()

    def test_password_reset_confirm_valid(self):
        # Create token (must be at least 32 chars)
        token_str = 'a' * 32
        token = PasswordResetToken.objects.create(
            user=self.user,
            token=token_str,
            expires_at=timezone.now() + timedelta(hours=1)
        )
        
        url = reverse('password_reset_confirm')
        # Password must contain uppercase
        data = {
            'token': token_str,
            'new_password': 'NewPassword123!',
            'confirm_password': 'NewPassword123!'
        }
        
        response = self.client.post(url, data)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Verify password changed
        self.user.refresh_from_db()
        self.assertTrue(self.user.check_password('NewPassword123!'))
        
        # Verify token marked used
        token.refresh_from_db()
        self.assertTrue(token.used)

    def test_password_reset_confirm_invalid(self):
        url = reverse('password_reset_confirm')
        data = {
            'token': 'invalid-token-must-be-long-enough',
            'new_password': 'NewPassword123!',
            'confirm_password': 'NewPassword123!'
        }
        
        response = self.client.post(url, data)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        
        # Verify password NOT changed
        self.user.refresh_from_db()
        self.assertTrue(self.user.check_password('oldpassword'))
