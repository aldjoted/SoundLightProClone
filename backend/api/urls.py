from django.urls import path
from rest_framework_simplejwt.views import (
    TokenObtainPairView,
    TokenRefreshView,
)
from . import views

# This file defines the URL endpoints for the 'api' app.

urlpatterns = [
    # --- Authentication Endpoints ---
    # For user login, returns access and refresh tokens
    path('token/', TokenObtainPairView.as_view(), name='token_obtain_pair'),
    # To get a new access token using a refresh token
    path('token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    # For new user registration
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

    # --- Checkout Endpoint ---
    # To list user's orders (GET) and create a new order (POST)
    path('orders/', views.OrderView.as_view(), name='order_list_create'),

    path('chatbot/', views.ChatbotView.as_view(), name='chatbot'),
]