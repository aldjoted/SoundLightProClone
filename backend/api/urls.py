from django.urls import path
from . import views
from .jwt_views import RateLimitedTokenObtainPairView, RateLimitedTokenRefreshView, VerifyLoginCodeView

# This file defines the URL endpoints for the 'api' app.

urlpatterns = [
    # --- Authentication Endpoints ---
    # For user login, returns access and refresh tokens (Rate Limited: 5/minute)
    path('token/', RateLimitedTokenObtainPairView.as_view(), name='token_obtain_pair'),
    # To verify 6-digit login code and get tokens (Rate Limited: 5/minute)
    path('verify-login/', VerifyLoginCodeView.as_view(), name='verify_login'),
    # To get a new access token using a refresh token (Rate Limited: 10/minute)
    path('token/refresh/', RateLimitedTokenRefreshView.as_view(), name='token_refresh'),
    # For user logout
    path('logout/', views.LogoutView.as_view(), name='logout'),
    # For new user registration (Rate Limited: 3/hour)
    path('register/', views.RegisterView.as_view(), name='register'),
    # To get details of the current logged-in user
    path('user/', views.UserDetailView.as_view(), name='user_detail'),

    # --- Product Catalog Endpoints ---
    # List all available products (supports ?search=... query)
    path('products/', views.ProductList.as_view(), name='product_list'),
    # Get details of a single product by its ID
    path('products/<int:pk>/', views.ProductDetail.as_view(), name='product_detail'),
    # List all top-level categories (children are nested by the serializer)
    path('categories/', views.CategoryList.as_view(), name='category_list'),
    # List partner brands
    path('brands/', views.BrandList.as_view(), name='brand_list'),

    # --- Checkout Endpoint ---
    # To list user's orders (GET) and create a new order (POST)
    path('orders/', views.OrderView.as_view(), name='order_list_create'),

    # --- Wishlist Endpoints ---
    # Get user's wishlist, add products, or remove products
    path('wishlist/', views.WishlistView.as_view(), name='wishlist'),
    # Sync guest wishlist with authenticated user's wishlist
    path('wishlist/sync/', views.WishlistSyncView.as_view(), name='wishlist_sync'),

    # --- Product Review Endpoints ---
    # List reviews for a product and create new reviews
    path('products/<int:product_id>/reviews/', views.ProductReviewListCreateView.as_view(), name='product_reviews'),
    # Get review statistics for a product
    path('products/<int:product_id>/reviews/stats/', views.ProductReviewStatsView.as_view(), name='product_review_stats'),
    
    # --- Related Products Endpoint ---
    # Get related products for a product
    path('products/<int:product_id>/related/', views.RelatedProductsView.as_view(), name='related_products'),

    # --- Chatbot Endpoint ---
    path('chatbot/', views.ChatbotView.as_view(), name='chatbot'),

    # --- Dashboard Endpoints ---
    # User Profile
    path('dashboard/profile/', views.UserProfileView.as_view(), name='dashboard_profile'),
    path('dashboard/profile/password/', views.UpdatePasswordView.as_view(), name='dashboard_update_password'),
    
    # Shipping Addresses
    path('dashboard/addresses/', views.ShippingAddressListCreateView.as_view(), name='dashboard_addresses'),
    path('dashboard/addresses/<int:address_id>/', views.ShippingAddressDetailView.as_view(), name='dashboard_address_detail'),
    
    # Payment Methods
    path('dashboard/payment-methods/', views.PaymentMethodListCreateView.as_view(), name='dashboard_payment_methods'),
    path('dashboard/payment-methods/<int:pm_id>/', views.PaymentMethodDetailView.as_view(), name='dashboard_payment_method_detail'),
    
    # Orders (Dashboard view with enhanced details)
    path('dashboard/orders/', views.DashboardOrderListView.as_view(), name='dashboard_orders'),
    path('dashboard/orders/<int:order_id>/', views.DashboardOrderDetailView.as_view(), name='dashboard_order_detail'),
    
    # Reviews (Dashboard view)
    path('dashboard/reviews/', views.DashboardReviewListView.as_view(), name='dashboard_reviews'),
    path('dashboard/reviews/<int:review_id>/', views.DashboardReviewDetailView.as_view(), name='dashboard_review_detail'),
]