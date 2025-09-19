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
from .embeddings import model as embedding_model, get_product_text
from .vector_search import load_faiss_index_and_embeddings
from .serializers import (
    CategorySerializer, ProductSerializer, RegisterSerializer, 
    UserSerializer, OrderSerializer, CreateOrderRequestSerializer
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
    Prefetching children to mitigate N+1 query issues.
    Pagination is disabled since categories are typically a small, stable list.
    """
    queryset = Category.objects.filter(parent__isnull=True).prefetch_related(
        Prefetch('children', queryset=Category.objects.prefetch_related('children'))
    ).order_by('name')  # Add explicit ordering
    serializer_class = CategorySerializer
    permission_classes = (permissions.AllowAny,)
    pagination_class = None  # Disable pagination for categories


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
        Handle the entire checkout process.
        - Validates input using CreateOrderRequestSerializer
        - Creates Order and OrderItem records
        - Processes payment with Stripe
        - Updates product stock
        - All database operations are wrapped in a transaction for data integrity
        """
        # Use serializer for input validation
        input_serializer = CreateOrderRequestSerializer(data=request.data)
        if not input_serializer.is_valid():
            return Response(input_serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
        validated_data = input_serializer.validated_data
        cart_items = validated_data['items']
        shipping_info = validated_data['shipping_info']
        stripe_token = validated_data['stripe_token']

        # N+1 Fix: Get all product IDs from the cart
        product_ids = [item['id'] for item in cart_items]
        # Fetch all products in a single query
        products = Product.objects.in_bulk(product_ids)

        try:
            with transaction.atomic():
                # 1. Create the Order object
                order = Order.objects.create(
                    user=request.user,
                    first_name=shipping_info['first_name'],
                    last_name=shipping_info['last_name'],
                    email=shipping_info['email'],
                    address=shipping_info['address'],
                    postal_code=shipping_info['postal_code'],
                    city=shipping_info['city'],
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
            "You are SLP Pro Assistant, the official expert virtual assistant for Sound Light Pro. Your mission is to provide professional, accurate, and helpful guidance to customers interested in professional sound, lighting, video, and DJ equipment.\n\n"
            "Your entire knowledge base is derived from the website https://soundlightpro.com/.\n\n"
            "Your Core Responsibilities:\n\n"
            "Product Expertise:\n"
            "- Assist users in finding specific products or browsing categories (e.g., Pro Audio, Pro Lighting, DJ Gear, Staging).\n"
            "- Answer questions about product specifications, features, availability, and pricing based on the information on the website.\n"
            "- Provide tailored recommendations based on the user's needs, such as the type of event, venue size, budget, or desired outcome. For example, if a user asks for \"a good DJ controller for a beginner,\" you should suggest suitable models from the catalog.\n\n"
            "Service Guidance:\n"
            "- Clearly explain Sound Light Pro's services: Sales, Rental (Location), Installation, and Repair (Réparation).\n"
            "- Detail the process for each service. For rentals, explain how to check availability and get a quote. For repairs, explain the procedure for bringing in equipment. For installations, explain how to request a consultation.\n\n"
            "Store Information:\n"
            "- Provide the store's physical address '1451, 63 Bd de la République, Douala, Cameroon', opening hours, and contact information (phone: +237 6 80 49 49 49, email: info@soundlightpro.com) when requested.\n\n"
            "Website Navigation:\n"
            "- Guide users to the correct pages on the website for products, brands, or service information.\n\n"
            "Rules of Engagement:\n"
            "- Persona: You must be professional, knowledgeable, and friendly. Your tone should reflect that of an expert in the pro A/V industry who is eager to help.\n"
            "- Accuracy is Paramount: Your answers must be based only on the information available on https://soundlightpro.com/. Do not invent products, prices, specifications, or policies.\n"
            "- Handle Uncertainty: If you cannot find an answer or if a query is too complex (e.g., custom installation quotes, specific technical troubleshooting), state that you do not have the information and politely direct the user to contact the expert team directly via phone or the contact form on the website.\n"
            "- Be Proactive: Ask clarifying questions to better understand a user's needs before providing a recommendation. For example, if they ask for \"speakers,\" ask \"Are these for a live band, a DJ set, or a conference? What is the approximate size of the venue?\"\n"
            "- Language: Be prepared to communicate fluently in French, Dutch, and English, as the website serves a multilingual audience. Adapt to the user's language.\n"
            "- Do Not Process Transactions: You are an informational assistant. You cannot complete purchases, book rentals, or take payments. Guide users on how to do so through the website or by contacting the store."
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