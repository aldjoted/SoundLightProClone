"""
Tests for API views including wishlists, reviews, and authentication.
"""

from decimal import Decimal
from unittest.mock import patch, MagicMock
from django.test import TestCase, TransactionTestCase, override_settings
from django.contrib.auth.models import User
from rest_framework.test import APIClient
from rest_framework import status

from api.models import (
    Product, Category, Brand, Wishlist, WishlistItem,
    ProductReview, UserProfile
)


class TestWishlistAPI(TransactionTestCase):
    """Tests for wishlist API endpoints."""

    def setUp(self):
        """Set up test data."""
        self.client = APIClient()
        
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123'
        )
        
        self.category = Category.objects.create(
            name='Test Category',
            slug='test-category'
        )
        
        self.product1 = Product.objects.create(
            name='Test Product 1',
            category=self.category,
            price=Decimal('99.99'),
            stock=10,
            available=True
        )
        
        self.product2 = Product.objects.create(
            name='Test Product 2',
            category=self.category,
            price=Decimal('149.99'),
            stock=5,
            available=True
        )
        
        self.unavailable_product = Product.objects.create(
            name='Unavailable Product',
            category=self.category,
            price=Decimal('199.99'),
            stock=0,
            available=False
        )
        
        self.client.force_authenticate(user=self.user)

    def test_get_empty_wishlist(self):
        """Getting wishlist when empty should return empty items list."""
        response = self.client.get('/api/wishlist/')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['items']), 0)
        self.assertEqual(response.data['item_count'], 0)

    def test_add_product_to_wishlist(self):
        """Adding a product to wishlist should succeed."""
        response = self.client.post('/api/wishlist/', {
            'product_id': self.product1.id
        }, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        
        # Verify item was added
        wishlist = Wishlist.objects.get(user=self.user)
        self.assertEqual(wishlist.items.count(), 1)
        self.assertEqual(wishlist.items.first().product, self.product1)

    def test_add_same_product_twice_fails(self):
        """Adding the same product twice should fail."""
        # Add first time
        self.client.post('/api/wishlist/', {
            'product_id': self.product1.id
        }, format='json')
        
        # Add second time
        response = self.client.post('/api/wishlist/', {
            'product_id': self.product1.id
        }, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('already in your wishlist', response.data['detail'].lower())

    def test_add_unavailable_product_fails(self):
        """Adding unavailable product to wishlist should fail."""
        response = self.client.post('/api/wishlist/', {
            'product_id': self.unavailable_product.id
        }, format='json')
        
        # API returns 400 for validation errors (product not available)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_add_nonexistent_product_fails(self):
        """Adding non-existent product to wishlist should fail."""
        response = self.client.post('/api/wishlist/', {
            'product_id': 99999
        }, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_remove_product_from_wishlist(self):
        """Removing a product from wishlist should succeed."""
        # Add product first
        wishlist, _ = Wishlist.objects.get_or_create(user=self.user)
        WishlistItem.objects.create(wishlist=wishlist, product=self.product1)
        
        response = self.client.delete('/api/wishlist/', {
            'product_id': self.product1.id
        }, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(wishlist.items.count(), 0)

    def test_remove_nonexistent_item_fails(self):
        """Removing a product not in wishlist should fail."""
        response = self.client.delete('/api/wishlist/', {
            'product_id': self.product1.id
        }, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)


class TestWishlistSyncAPI(TransactionTestCase):
    """Tests for wishlist sync functionality (guest to authenticated)."""

    def setUp(self):
        """Set up test data."""
        self.client = APIClient()
        
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123'
        )
        
        self.category = Category.objects.create(
            name='Test Category',
            slug='test-category'
        )
        
        self.products = []
        for i in range(5):
            product = Product.objects.create(
                name=f'Product {i}',
                category=self.category,
                price=Decimal(f'{50 + i * 10}.99'),
                stock=10,
                available=True
            )
            self.products.append(product)
        
        self.client.force_authenticate(user=self.user)

    def test_sync_empty_list(self):
        """Syncing empty product list should work."""
        response = self.client.post('/api/wishlist/sync/', {
            'product_ids': []
        }, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('0 items synced', response.data['detail'])

    def test_sync_multiple_products(self):
        """Syncing multiple products should add all to wishlist."""
        product_ids = [p.id for p in self.products[:3]]
        
        response = self.client.post('/api/wishlist/sync/', {
            'product_ids': product_ids
        }, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('3 items synced', response.data['detail'])
        
        wishlist = Wishlist.objects.get(user=self.user)
        self.assertEqual(wishlist.items.count(), 3)

    def test_sync_skips_existing_items(self):
        """Syncing should skip products already in wishlist."""
        # Add one product manually
        wishlist, _ = Wishlist.objects.get_or_create(user=self.user)
        WishlistItem.objects.create(wishlist=wishlist, product=self.products[0])
        
        # Sync including the existing product
        product_ids = [p.id for p in self.products[:3]]
        
        response = self.client.post('/api/wishlist/sync/', {
            'product_ids': product_ids
        }, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('2 items synced', response.data['detail'])  # Only 2 new items
        self.assertEqual(wishlist.items.count(), 3)

    def test_sync_skips_unavailable_products(self):
        """Syncing should skip unavailable products."""
        # Make one product unavailable
        self.products[1].available = False
        self.products[1].save()
        
        product_ids = [p.id for p in self.products[:3]]
        
        response = self.client.post('/api/wishlist/sync/', {
            'product_ids': product_ids
        }, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        # Should only sync 2 items (skipping the unavailable one)
        wishlist = Wishlist.objects.get(user=self.user)
        self.assertEqual(wishlist.items.count(), 2)

    def test_sync_invalid_format_fails(self):
        """Syncing with invalid format should fail."""
        response = self.client.post('/api/wishlist/sync/', {
            'product_ids': "not a list"
        }, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)


class TestProductReviewAPI(TransactionTestCase):
    """Tests for product review API endpoints."""

    def setUp(self):
        """Set up test data."""
        self.client = APIClient()
        
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123',
            first_name='Test',
            last_name='User'
        )
        
        self.other_user = User.objects.create_user(
            username='otheruser',
            email='other@example.com',
            password='testpass123'
        )
        
        self.category = Category.objects.create(
            name='Test Category',
            slug='test-category'
        )
        
        self.product = Product.objects.create(
            name='Test Product',
            category=self.category,
            price=Decimal('99.99'),
            stock=10,
            available=True
        )
        
        self.client.force_authenticate(user=self.user)

    def test_get_reviews_for_product(self):
        """Getting reviews for a product should return approved reviews."""
        # Create some reviews
        ProductReview.objects.create(
            product=self.product,
            user=self.other_user,
            rating=5,
            title='Great product!',
            comment='This product is amazing, highly recommend it.',
            is_approved=True
        )
        
        ProductReview.objects.create(
            product=self.product,
            user=self.user,
            rating=4,
            title='Good product',
            comment='Pretty good, but could be better in some aspects.',
            is_approved=True
        )
        
        # Unapproved review (should not be returned)
        ProductReview.objects.create(
            product=self.product,
            user=User.objects.create_user('temp', 'temp@test.com', 'pass'),
            rating=1,
            title='Spam review',
            comment='This is spam and should not be shown.',
            is_approved=False
        )
        
        self.client.force_authenticate(user=None)  # Allow anonymous access
        response = self.client.get(f'/api/products/{self.product.id}/reviews/')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        # Check we only got approved reviews
        self.assertEqual(response.data['count'], 2)

    def test_create_review_requires_authentication(self):
        """Creating a review requires authentication."""
        self.client.force_authenticate(user=None)
        
        response = self.client.post(f'/api/products/{self.product.id}/reviews/', {
            'rating': 5,
            'title': 'Great!',
            'comment': 'This is a great product, would buy again.'
        }, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_create_valid_review(self):
        """Creating a valid review should succeed."""
        response = self.client.post(f'/api/products/{self.product.id}/reviews/', {
            'rating': 5,
            'title': 'Excellent product!',
            'comment': 'This product exceeded all my expectations. Highly recommend!'
        }, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(ProductReview.objects.count(), 1)
        
        review = ProductReview.objects.first()
        self.assertEqual(review.user, self.user)
        self.assertEqual(review.rating, 5)

    def test_cannot_review_same_product_twice(self):
        """User cannot review the same product twice."""
        # Create first review
        ProductReview.objects.create(
            product=self.product,
            user=self.user,
            rating=4,
            title='First review',
            comment='This is my first review of this product.'
        )
        
        # Try to create second review
        response = self.client.post(f'/api/products/{self.product.id}/reviews/', {
            'rating': 5,
            'title': 'Second review',
            'comment': 'Trying to review again but should fail.'
        }, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_review_with_short_comment_fails(self):
        """Review with too short comment should fail validation."""
        response = self.client.post(f'/api/products/{self.product.id}/reviews/', {
            'rating': 5,
            'title': 'Good',
            'comment': 'Short'  # Less than 10 characters
        }, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_review_with_invalid_rating_fails(self):
        """Review with invalid rating should fail validation."""
        response = self.client.post(f'/api/products/{self.product.id}/reviews/', {
            'rating': 6,  # Invalid: must be 1-5
            'title': 'Good product',
            'comment': 'This is a good product that I would recommend.'
        }, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_review_stats_endpoint(self):
        """Review stats endpoint should return aggregated statistics."""
        # Create reviews with different ratings
        for rating in [5, 5, 4, 4, 3]:
            user = User.objects.create_user(
                f'user{rating}_{ProductReview.objects.count()}',
                f'user{rating}_{ProductReview.objects.count()}@test.com',
                'pass123'
            )
            ProductReview.objects.create(
                product=self.product,
                user=user,
                rating=rating,
                title=f'{rating} star review',
                comment=f'This is a {rating} star review comment.',
                is_approved=True
            )
        
        response = self.client.get(f'/api/products/{self.product.id}/reviews/stats/')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['review_count'], 5)
        self.assertAlmostEqual(response.data['average_rating'], 4.2, places=1)
        self.assertEqual(response.data['rating_distribution']['5'], 2)
        self.assertEqual(response.data['rating_distribution']['4'], 2)
        self.assertEqual(response.data['rating_distribution']['3'], 1)


@override_settings(RATELIMIT_ENABLE=False)
class TestAuthenticationAPI(TestCase):
    """Tests for authentication endpoints."""

    def setUp(self):
        """Set up test data."""
        self.client = APIClient()
        
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123',
            first_name='Test',
            last_name='User'
        )

    def test_registration_with_valid_data(self):
        """Registration with valid data should create user."""
        response = self.client.post('/api/register/', {
            'username': 'newuser',
            'email': 'newuser@example.com',
            'password': 'SecureP@ss123',
            'password2': 'SecureP@ss123',
            'first_name': 'New',
            'last_name': 'User'
        }, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertTrue(User.objects.filter(username='newuser').exists())

    def test_registration_with_duplicate_username_fails(self):
        """Registration with existing username should fail."""
        response = self.client.post('/api/register/', {
            'username': 'testuser',  # Already exists
            'email': 'different@example.com',
            'password': 'SecureP@ss123',
            'password2': 'SecureP@ss123',
            'first_name': 'New',
            'last_name': 'User'
        }, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_registration_with_duplicate_email_fails(self):
        """Registration with existing email should fail."""
        response = self.client.post('/api/register/', {
            'username': 'differentuser',
            'email': 'test@example.com',  # Already exists
            'password': 'SecureP@ss123',
            'password2': 'SecureP@ss123',
            'first_name': 'New',
            'last_name': 'User'
        }, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_registration_with_mismatched_passwords_fails(self):
        """Registration with mismatched passwords should fail."""
        response = self.client.post('/api/register/', {
            'username': 'newuser',
            'email': 'new@example.com',
            'password': 'SecureP@ss123',
            'password2': 'DifferentP@ss456',
            'first_name': 'New',
            'last_name': 'User'
        }, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_registration_with_weak_password_fails(self):
        """Registration with weak password should fail."""
        response = self.client.post('/api/register/', {
            'username': 'newuser',
            'email': 'new@example.com',
            'password': '123',  # Too short and weak
            'password2': '123',
            'first_name': 'New',
            'last_name': 'User'
        }, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_get_user_details_authenticated(self):
        """Authenticated user should be able to get their details."""
        self.client.force_authenticate(user=self.user)
        
        response = self.client.get('/api/user/')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['username'], 'testuser')
        self.assertEqual(response.data['email'], 'test@example.com')

    def test_get_user_details_unauthenticated(self):
        """Unauthenticated request should be rejected."""
        response = self.client.get('/api/user/')
        
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)


class TestHealthCheckEndpoint(TestCase):
    """Tests for the health check endpoint."""

    def setUp(self):
        """Set up test client."""
        self.client = APIClient()

    def test_health_check_returns_ok(self):
        """Health check should return healthy status."""
        response = self.client.get('/api/health/')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        # Health check returns JsonResponse, use json() to parse
        data = response.json()
        self.assertEqual(data['status'], 'healthy')
        self.assertEqual(data['database'], 'connected')
