import os
import stripe
from dotenv import load_dotenv
from typing import Optional

from django.db import transaction
from django.db.models import Q, Prefetch
from django.db.models.query import QuerySet
from django.contrib.auth.models import User
from django.views.decorators.cache import cache_page
from django.utils.decorators import method_decorator
from rest_framework import generics, permissions, status, filters
from rest_framework.response import Response
from rest_framework.views import APIView
from stripe.error import StripeError # type: ignore
import google.generativeai as genai # type: ignore
# from google import genai    # type: ignore

from .models import Category, Product, Order, OrderItem
from .embeddings import model as embedding_model, get_product_text
from .vector_search import load_faiss_index_and_embeddings
from .serializers import (
    CategorySerializer, ProductSerializer, RegisterSerializer, 
    UserSerializer, OrderSerializer, CreateOrderRequestSerializer
)
from . import services
from .services import OrderCreationError

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

    @method_decorator(cache_page(60 * 15))  # Cache for 15 minutes
    def get(self, *args, **kwargs):
        return super().get(*args, **kwargs)

    def get_queryset(self) -> QuerySet[Product]:  # type: ignore
        """
        Optimized queryset that prevents N+1 issues.
        Optionally filters the products by a 'brand' query parameter in the URL.
        Includes explicit ordering for consistent pagination results.
        """
        # Note: self.request is a DRF Request object, which has .query_params
        queryset = Product.objects.filter(available=True).select_related('brand', 'category').order_by('name')
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
    Uses django-mptt for efficient tree queries.
    Pagination is disabled since categories are typically a small, stable list.
    """
    serializer_class = CategorySerializer
    permission_classes = (permissions.AllowAny,)
    pagination_class = None  # Disable pagination for categories

    @method_decorator(cache_page(60 * 60))  # Cache for 1 hour
    def get(self, *args, **kwargs):
        return super().get(*args, **kwargs)

    def get_queryset(self) -> QuerySet[Category]:  # type: ignore
        # Use django-mptt's get_cached_trees() for efficient tree loading
        return Category.objects.filter(parent__isnull=True).order_by('name')


# --- Checkout and Order Views ---

class OrderView(APIView):
    """
    API view to handle order operations.
    GET: List the user's past orders
    POST: Create a new order (checkout process)
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, *args, **kwargs):
        """
        List all orders for the authenticated user.
        """
        orders = Order.objects.filter(user=request.user).prefetch_related('items__product')
        serializer = OrderSerializer(orders, many=True)
        return Response(serializer.data)

    def post(self, request, *args, **kwargs):
        """
        Handle the entire checkout process using the service layer.
        - Validates input using CreateOrderRequestSerializer
        - Delegates order creation to the service layer
        - Returns appropriate responses based on service results
        """
        # Use serializer for input validation
        input_serializer = CreateOrderRequestSerializer(data=request.data)
        if not input_serializer.is_valid():
            return Response(input_serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
        validated_data = input_serializer.validated_data
        cart_items = validated_data['items']
        shipping_info = validated_data['shipping_info']
        stripe_token = validated_data['stripe_token']

        try:
            # Delegate order creation to the service layer
            order = services.create_order_from_cart(
                user=request.user,
                cart_items=cart_items,
                shipping_info=shipping_info,
                stripe_token=stripe_token
            )
            
            # Serialize and return the created order
            serializer = OrderSerializer(order)
            return Response(serializer.data, status=status.HTTP_201_CREATED)

        except OrderCreationError as e:
            # Handle business logic errors (stock issues, payment failures, etc.)
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            # Log unexpected errors for debugging (in production, use proper logging)
            print(f"Unexpected error in order creation: {e}")
            return Response(
                {"error": "An unexpected error occurred. Please try again later."}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

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

        # --- Vector Search RAG: Find relevant products ---
        index, embeddings = load_faiss_index_and_embeddings()
        relevant_products = []
        if index is not None and embeddings is not None:
            # Generate embedding for the user query
            query_embedding = embedding_model.encode([user_message], normalize_embeddings=True)
            # Search for top 5 most similar products
            D, I = index.search(query_embedding, 5)
            # Get all available products in the same order as embeddings
            all_products = list(Product.objects.filter(available=True).select_related('brand', 'category'))
            for idx in I[0]:
                if 0 <= idx < len(all_products):
                    relevant_products.append(all_products[idx])
        else:
            # Fallback: no index, return empty list
            relevant_products = []

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
            "You are SLP Pro Assistant, the official expert virtual assistant for Sound Light Pro. "
            "Your mission is to provide professional, accurate, and concise guidance to customers.\n\n"
            "[CRITICAL DIRECTIVES]\n"
            "1.  **BE CONCISE:** Your primary goal is to answer user questions directly and efficiently. "
            "Avoid conversational filler. Get straight to the point while remaining helpful and professional.\n"
            "2.  **KNOWLEDGE SOURCE:** Your entire knowledge base is strictly limited to the content on the official website: "
            "https://soundlightpro.com/. Never invent products, prices, specifications, or policies.\n"
            "3.  **LANGUAGE:** Adapt your communication to the user's language (fluent in French, Dutch, and English).\n\n"
            "[CORE RESPONSIBILITIES]\n\n"
            "1.  **Product Expertise:**\n"
            "    * Assist users in finding products or browsing categories (Pro Audio, Pro Lighting, DJ Gear, Staging).\n"
            "    * Answer specific questions about product features, availability, and price based *only* on website data.\n"
            "    * Provide tailored recommendations based on user needs (event type, venue size, budget). "
            "Before recommending, ask targeted clarifying questions (e.g., \"For what type of event do you need speakers? "
            "Live music or a conference?\").\n\n"
            "2.  **Service Guidance:**\n"
            "    * Clearly and briefly explain Sound Light Pro's services: Sales, Rental (Location), Installation, and Repair (Réparation).\n"
            "    * Directly state the process for each service when asked.\n\n"
            "3.  **Store Information:**\n"
            "    * When requested, provide the following details:\n"
            "        * **Address:** 1451, 63 Bd de la République, Douala, Cameroon\n"
            "        * **Phone:** +237 6 80 49 49 49\n"
            "        * **Email:** info@soundlightpro.com\n"
            "        * **Opening Hours:** [Provide hours as listed on the website]\n\n"
            "[OPERATIONAL RULES]\n\n"
            "* **Handle Uncertainty:** If you cannot find a specific answer on the website, state that the information is not available "
            "and direct the user to the expert team via phone or the website's contact form.\n"
            "* **No Transactions:** You are an informational assistant only. You cannot process purchases, book rentals, or take payments. "
            "Guide users on how to complete these actions themselves.\n"
            "* **Persona:** Professional, knowledgeable, efficient, and friendly."
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


# Custom 404 handler function
def custom_404_view(request, exception=None):
    """
    Custom 404 handler that serves the frontend 404.html page
    """
    from django.http import HttpResponse
    from django.conf import settings
    import os
    
    # Path to your frontend 404.html
    frontend_404_path = os.path.join(settings.BASE_DIR, 'frontend', '404.html')
    
    try:
        with open(frontend_404_path, 'r', encoding='utf-8') as file:
            content = file.read()
        return HttpResponse(content, status=404, content_type='text/html')
    except FileNotFoundError:
        # Fallback if 404.html is not found
        return HttpResponse(
            '<h1>404 - Page Not Found</h1><p>The page you requested could not be found.</p>', 
            status=404, 
            content_type='text/html'
        )