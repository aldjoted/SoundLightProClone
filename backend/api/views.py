import os
import stripe
from dotenv import load_dotenv
from decimal import Decimal
from typing import Optional

from django.db import transaction
from django.db.models import Q, Prefetch
from django.db.models.query import QuerySet
from django.contrib.auth.models import User
from rest_framework import generics, permissions, status, filters
from rest_framework.response import Response
from rest_framework.views import APIView
from stripe.error import StripeError # type: ignore
import google.generativeai as genai # type: ignore
# from google import genai    # type: ignore

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
    Includes filtering by brand slug via a 'brand' query parameter.
    """
    serializer_class = ProductSerializer
    permission_classes = (permissions.AllowAny,)
    filter_backends = [filters.SearchFilter]
    search_fields = ['name', 'description']

    def get_queryset(self) -> QuerySet[Product]:  # type: ignore
        """
        Optimized queryset that prevents N+1 issues.
        Optionally filters the products by a 'brand' query parameter in the URL.
        """
        # Note: self.request is a DRF Request object, which has .query_params
        queryset = Product.objects.filter(available=True).select_related('brand', 'category')
        brand_slug = self.request.query_params.get('brand') # type: ignore
        if brand_slug is not None:
            queryset = queryset.filter(brand__slug=brand_slug)
        return queryset


class ProductDetail(generics.RetrieveAPIView):
    """
    API view to retrieve a single product by its primary key (id).
    Optimized to pre-fetch related brand and category.
    """
    queryset = Product.objects.filter(available=True).select_related('brand', 'category')
    serializer_class = ProductSerializer
    permission_classes = (permissions.AllowAny,)

class CategoryList(generics.ListAPIView):
    """
    API view to list all top-level categories (those with no parent).
    The serializer will handle nesting the child categories.
    Prefetching children to mitigate N+1 query issues.
    """
    queryset = Category.objects.filter(parent__isnull=True).prefetch_related(
        Prefetch('children', queryset=Category.objects.prefetch_related('children'))
    )
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
    - All database operations are wrapped in a transaction for data integrity.
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, *args, **kwargs):
        cart_items = request.data.get('items', [])
        shipping_info = request.data.get('shipping_info', {})
        stripe_token = request.data.get('stripe_token')

        if not all([cart_items, shipping_info, stripe_token]):
            return Response(
                {"error": "Missing items, shipping info, or payment token."},
                status=status.HTTP_400_BAD_REQUEST
            )

        # N+1 Fix: Get all product IDs from the cart
        product_ids = [item['id'] for item in cart_items]
        # Fetch all products in a single query
        products = Product.objects.in_bulk(product_ids)

        try:
            with transaction.atomic():
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
                products_to_update = []

                # 2. Create OrderItem objects and prepare stock updates
                for item_data in cart_items:
                    product = products.get(item_data['id'])
                    if not product:
                        # This raises an exception to trigger the transaction rollback
                        raise Product.DoesNotExist(f"Product with ID {item_data['id']} not found.")
                    
                    quantity = item_data['quantity']
                    if product.stock < quantity:
                        # Raise exception to rollback transaction
                        raise ValueError(f"Not enough stock for {product.name}. Only {product.stock} available.")

                    OrderItem.objects.create(
                        order=order,
                        product=product,
                        price=product.price,
                        quantity=quantity
                    )
                    total_cost += product.price * quantity
                    
                    # Decrement stock and add to list for bulk update
                    product.stock -= quantity
                    products_to_update.append(product)
                
                # Bulk update product stock in one query for performance
                Product.objects.bulk_update(products_to_update, ['stock'])
                
                order.total_paid = total_cost
                
                # 3. Process payment with Stripe
                charge = stripe.Charge.create(
                    amount=int(total_cost * 100),
                    currency='usd',
                    description=f'Order {order.pk} for {order.email}',
                    source=stripe_token,
                )

                # 4. Finalize the order if payment is successful
                order.paid = True
                order.stripe_id = charge.id
                order.save() # Save the final changes to the order

            # 5. Serialize and return the created order (outside the transaction block)
            serializer = OrderSerializer(order)
            return Response(serializer.data, status=status.HTTP_201_CREATED)

        except Product.DoesNotExist as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)
        except ValueError as e: # Catches our stock check error
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)
        except StripeError as e:
            # The transaction will be rolled back automatically on this exception
            return Response({"error": f"Payment failed: {str(e)}"}, status=status.HTTP_402_PAYMENT_REQUIRED)
        except Exception as e:
            # The transaction will be rolled back automatically on any other exception
            return Response({"error": f"An unexpected error occurred: {str(e)}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

# --- Chatbot View ---

# Configure the Gemini API client at the module level
try:
    genai.configure(api_key=os.getenv('GEMINI_API_KEY'))
    generation_config = {
        "temperature": 0.7,
        "top_p": 1,
        "top_k": 1,
        "max_output_tokens": 2048,
    }
    gemini_model = genai.GenerativeModel(
        model_name="gemini-2.5-flash",
        generation_config=generation_config,
    )
except Exception as e:
    print(f"Error configuring Gemini API: {e}")
    gemini_model = None


class ChatbotView(APIView):
    """
    API view to handle chatbot conversations.
    It takes a user message, finds relevant products,
    and uses Gemini to generate a helpful response.
    """
    permission_classes = [permissions.AllowAny] # Allow anyone to use the chatbot

    def post(self, request, *args, **kwargs):
        if not gemini_model:
            return Response(
                {"error": "Chatbot is not configured correctly."},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

        user_message = request.data.get('message', '').strip()
        if not user_message:
            return Response(
                {"error": "Message cannot be empty."},
                status=status.HTTP_400_BAD_REQUEST
            )

        # --- Simple RAG: Find relevant products ---
        # A more advanced implementation would use vector embeddings.
        # For now, we'll do a simple keyword search.
        keywords = user_message.lower().split()
        
        # Build a query to search for products
        query = Q()
        for keyword in keywords:
            # Avoid generic words, focus on potential product names/categories
            if len(keyword) > 2: 
                query |= Q(name__icontains=keyword) | Q(category__name__icontains=keyword) | Q(brand__name__icontains=keyword)

        relevant_products = Product.objects.filter(query, available=True)[:5] # Limit to 5 products

        # --- Format product data for the prompt ---
        product_context = "No specific products found."
        if relevant_products:
            product_context = "Here is some information about products that might be relevant to the user's query:\n\n"
            for p in relevant_products:
                product_context += f"- **Product Name:** {p.name}\n"
                product_context += f"  - **Category:** {p.category.name}\n"
                product_context += f"  - **Brand:** {p.brand.name if p.brand else 'N/A'}\n"
                product_context += f"  - **Price:** ${p.price:.2f}\n"
                product_context += f"  - **Description:** {p.description[:150]}...\n\n"

        # --- Construct the prompt for Gemini ---
        system_instruction = (
            "You are a friendly and helpful sales assistant for 'SoundLightPro', an e-commerce store "
            "specializing in professional audio and lighting equipment. Your goal is to answer customer questions accurately "
            "and encourage them to explore products. You are an expert in sound and lighting gear."
            "\n\n**Instructions:**"
            "\n1. Use the provided product information to answer questions about specific products. Do not make up products or prices."
            "\n2. If no products are found, answer the question generally based on your expertise, but mention that you couldn't find a specific match in the store."
            "\n3. Keep your answers concise and easy to read. Use Markdown for formatting (like lists and bold text)."
            "\n4. If asked about contact details, the address is '1451, 63 Bd de la République, Douala, Cameroon' and the email is 'info@soundlightpro.com'."
            "\n5. Never mention that you are an AI or language model. You are a human assistant."
        )

        prompt = (
            f"**System Instructions:**\n{system_instruction}\n\n"
            f"**Product Context:**\n{product_context}\n\n"
            f"**Customer Question:**\n{user_message}\n\n"
            "**Your Response:**"
        )
        
        try:
            # Send the prompt to Gemini
            response = gemini_model.generate_content(prompt)
            bot_response = response.text

            return Response({"reply": bot_response})

        except Exception as e:
            print(f"Error calling Gemini API: {e}")
            return Response(
                {"error": "Sorry, I'm having trouble connecting right now. Please try again later."},
                status=status.HTTP_503_SERVICE_UNAVAILABLE
            )