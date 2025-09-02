import os
import stripe
from dotenv import load_dotenv
from decimal import Decimal
from typing import Optional

from django.db.models import Q
from django.contrib.auth.models import User
from rest_framework import generics, permissions, status, filters
from rest_framework.response import Response
from rest_framework.views import APIView
from stripe.error import StripeError # type: ignore

from .models import Category, Product, Order, OrderItem
from .serializers import (
    CategorySerializer, ProductSerializer, RegisterSerializer, 
    UserSerializer, OrderSerializer
)

# Load environment variables and configure Stripe
load_dotenv()
stripe.api_key = os.getenv('STRIPE_SECRET_KEY')


# --- Authentication Views ---

class RegisterView(generics.CreateAPIView):
    """
    API view for user registration.
    Allows any user (authentication not required) to create a new account.
    """
    queryset = User.objects.all()
    permission_classes = (permissions.AllowAny,)
    serializer_class = RegisterSerializer

class UserDetailView(APIView):
    """
    API view to retrieve details of the currently authenticated user.
    """
    permission_classes = (permissions.IsAuthenticated,)

    def get(self, request, *args, **kwargs):
        # Return serialized data for the current authenticated user
        serializer = UserSerializer(request.user)
        return Response(serializer.data)


# --- Product Catalog Views ---

class ProductList(generics.ListAPIView):
    """
    API view to list all available products.
    Includes search functionality via a 'search' query parameter.
    """
    queryset = Product.objects.filter(available=True)
    serializer_class = ProductSerializer
    permission_classes = (permissions.AllowAny,)
    filter_backends = [filters.SearchFilter]
    search_fields = ['name', 'description']

class ProductDetail(generics.RetrieveAPIView):
    """
    API view to retrieve a single product by its primary key (id).
    """
    queryset = Product.objects.filter(available=True)
    serializer_class = ProductSerializer
    permission_classes = (permissions.AllowAny,)

class CategoryList(generics.ListAPIView):
    """

    API view to list all top-level categories (those with no parent).
    The serializer will handle nesting the child categories.
    """
    queryset = Category.objects.filter(parent__isnull=True)
    serializer_class = CategorySerializer
    permission_classes = (permissions.AllowAny,)


# --- Checkout and Order Views ---

class CreateOrderView(APIView):
    """
    API view to handle the entire checkout process.
    - Expects cart items, shipping info, and a Stripe token.
    - Creates Order and OrderItem records.
    - Processes payment with Stripe.
    - Updates product stock.
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, *args, **kwargs):
        # Extract data from the request
        cart_items = request.data.get('items', [])
        shipping_info = request.data.get('shipping_info', {})
        stripe_token = request.data.get('stripe_token')

        # Basic validation
        if not all([cart_items, shipping_info, stripe_token]):
            return Response(
                {"error": "Missing items, shipping info, or payment token."},
                status=status.HTTP_400_BAD_REQUEST
            )

        order: Optional[Order] = None  # ensure always defined for Pylance
        try:
            # 1. Create the Order object
            order = Order.objects.create(
                user=request.user,
                first_name=shipping_info.get('first_name'),
                last_name=shipping_info.get('last_name'),
                email=shipping_info.get('email'),
                address=shipping_info.get('address'),
                postal_code=shipping_info.get('postal_code'),
                city=shipping_info.get('city'),
            )
            total_cost = Decimal('0')

            # 2. Create OrderItem objects and update stock
            for item_data in cart_items:
                product = Product.objects.get(id=item_data['id'])
                quantity = item_data['quantity']

                if product.stock < quantity:
                    order.delete() # clean up the created order
                    return Response(
                        {"error": f"Not enough stock for {product.name}. Only {product.stock} available."},
                        status=status.HTTP_400_BAD_REQUEST
                    )

                OrderItem.objects.create(
                    order=order,
                    product=product,
                    price=product.price,
                    quantity=quantity
                )
                total_cost += product.price * quantity
                
                # Update product stock
                product.stock -= quantity
                product.save()
            
            # Update the order's total paid amount
            order.total_paid = total_cost
            order.save()

            # 3. Process payment with Stripe
            # Stripe expects the amount in cents
            charge = stripe.Charge.create(
                amount=int(total_cost * 100),
                currency='usd',
                description=f'Order {order.pk} for {order.email}',
                source=stripe_token,
            )

            # 4. Finalize the order
            order.paid = True
            order.stripe_id = charge.id
            order.save()

            # 5. Serialize and return the created order
            serializer = OrderSerializer(order)
            return Response(serializer.data, status=status.HTTP_201_CREATED)

        except Product.DoesNotExist:
            # Clean up order if a product looked up during item processing does not exist
            if order:
                order.delete()
            return Response(
                {"error": "One or more products in the cart no longer exist."},
                status=status.HTTP_400_BAD_REQUEST
            )
        except StripeError as e:
            if order:
                # (optional) undo stock adjustments if you wrap in a transaction later
                pass
            return Response(
                {"error": f"Payment failed: {str(e)}"},
                status=status.HTTP_402_PAYMENT_REQUIRED
            )
        except Exception as e:
            return Response(
                {"error": f"An unexpected error occurred: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )