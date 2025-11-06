from rest_framework import serializers
from django.contrib.auth.models import User
from django.contrib.auth.password_validation import validate_password
import re  # ✅ ADD for validation patterns
from .models import (
    Category, Brand, Product, ProductImage, Order, OrderItem,
    Wishlist, WishlistItem, ProductReview, UserProfile, ShippingAddress, PaymentMethod
)

# --- Product Catalog Serializers ---

class CategorySerializer(serializers.ModelSerializer):
    """
    Serializer for the Category model.
    Uses django-mptt for efficient hierarchical data handling.
    Supports multiple languages.
    """
    children = serializers.SerializerMethodField()
    name = serializers.SerializerMethodField()

    class Meta:
        model = Category
        fields = ['id', 'name', 'slug', 'parent', 'children']

    def get_children(self, obj):
        # Use django-mptt's get_children() method which is optimized
        # Only serialize direct children, not all descendants
        children = obj.get_children()
        return CategorySerializer(children, many=True, context=self.context).data
    
    def get_name(self, obj):
        """Return name in the requested language"""
        request = self.context.get('request')
        if request:
            language = request.headers.get('Accept-Language', 'en')
            if language.startswith('fr'):
                return obj.get_name('fr')
        return obj.get_name('en')

class BrandSerializer(serializers.ModelSerializer):
    """
    Serializer for the Brand model.
    Supports multiple languages.
    """
    description = serializers.SerializerMethodField()
    image = serializers.SerializerMethodField()
    
    class Meta:
        model = Brand
        fields = ['name', 'slug', 'image', 'description']
    
    def get_description(self, obj):
        """Return description in the requested language"""
        request = self.context.get('request')
        if request:
            language = request.headers.get('Accept-Language', 'en')
            if language.startswith('fr'):
                return obj.get_description('fr')
        return obj.get_description('en')

    def get_image(self, obj):
        """Return absolute URL for brand image if available"""
        try:
            url = obj.image.url if obj.image else ''
        except Exception:
            url = ''
        request = self.context.get('request')
        if request and url:
            return request.build_absolute_uri(url)
        return url

class ProductImageSerializer(serializers.ModelSerializer):
    """
    Serializer for the ProductImage model.
    Returns absolute URLs for images to support cross-origin frontend.
    """
    image = serializers.SerializerMethodField()

    class Meta:
        model = ProductImage
        fields = ['image', 'alt_text']

    def get_image(self, obj):
        try:
            url = obj.image.url if obj.image else ''
        except Exception:
            url = ''
        request = self.context.get('request')
        if request and url:
            return request.build_absolute_uri(url)
        return url

class ProductSerializer(serializers.ModelSerializer):
    """
    Serializer for the Product model.
    Displays the category name, brand object, and a list of all product images.
    Supports multiple languages.
    """
    category = serializers.SlugRelatedField(
        slug_field='name',
        queryset=Category.objects.all()
    )
    brand = BrandSerializer(read_only=True)
    # Use the new ProductImageSerializer to nest all related images
    images = ProductImageSerializer(many=True, read_only=True)
    name = serializers.SerializerMethodField()
    description = serializers.SerializerMethodField()
    average_rating = serializers.SerializerMethodField()
    review_count = serializers.SerializerMethodField()

    class Meta:
        model = Product
        fields = [
            'id', 'category', 'brand', 'name', 'description', 
            'price', 'images', 'stock', 'available',
            'average_rating', 'review_count'
        ]
    
    def get_name(self, obj):
        """Return name in the requested language"""
        request = self.context.get('request')
        if request:
            language = request.headers.get('Accept-Language', 'en')
            if language.startswith('fr'):
                return obj.get_name('fr')
        return obj.get_name('en')
    
    def get_description(self, obj):
        """Return description in the requested language"""
        request = self.context.get('request')
        if request:
            language = request.headers.get('Accept-Language', 'en')
            if language.startswith('fr'):
                return obj.get_description('fr')
        return obj.get_description('en')
    
    def get_average_rating(self, obj):
        """Return average rating from approved reviews"""
        # ✅ IMPROVEMENT: Use prefetched data if available, fallback to query
        return getattr(obj, 'avg_rating', None) or obj.get_average_rating()
    
    def get_review_count(self, obj):
        """Return count of approved reviews"""
        # ✅ IMPROVEMENT: Use prefetched data if available, fallback to query
        return getattr(obj, 'review_count_cached', None) or obj.get_review_count()

# --- User Authentication Serializers ---

class RegisterSerializer(serializers.ModelSerializer):
    """
    Serializer for user registration.
    Includes password confirmation and validation.
    """
    password = serializers.CharField(write_only=True, required=True, validators=[validate_password])
    password2 = serializers.CharField(write_only=True, required=True)

    class Meta:
        model = User
        fields = ('username', 'password', 'password2', 'email', 'first_name', 'last_name')
    
    def validate_username(self, value):
        """
        Validate username format and availability.
        - Must be at least 3 characters
        - Can only contain letters, numbers, underscores, and hyphens
        - Cannot be all numbers
        """
        if len(value) < 3:
            raise serializers.ValidationError("Username must be at least 3 characters long.")
        
        if not value.replace('_', '').replace('-', '').isalnum():
            raise serializers.ValidationError(
                "Username can only contain letters, numbers, underscores (_), and hyphens (-)."
            )
        
        if value.isdigit():
            raise serializers.ValidationError("Username cannot be all numbers.")
        
        # Check for reserved usernames
        reserved_usernames = ['admin', 'root', 'user', 'api', 'www', 'help', 'support']
        if value.lower() in reserved_usernames:
            raise serializers.ValidationError("This username is reserved and cannot be used.")
        
        return value
    
    def validate_email(self, value):
        """
        Validate email uniqueness.
        """
        if not value:
            raise serializers.ValidationError("Email is required.")
        
        # Normalize email to lowercase
        value = value.lower()
        
        if User.objects.filter(email=value).exists():
            raise serializers.ValidationError(
                "A user with this email address already exists. Please use a different email or try logging in."
            )
        
        return value
    
    def validate(self, attrs):
        # Check that the two password fields match
        if attrs['password'] != attrs['password2']:
            raise serializers.ValidationError({"password": "Password fields didn't match."})
        return attrs

    def create(self, validated_data):
        # Create a new user with a hashed password
        # Normalize email before saving
        user = User.objects.create(
            username=validated_data['username'],
            email=validated_data['email'].lower(),
            first_name=validated_data['first_name'],
            last_name=validated_data['last_name']
        )
        user.set_password(validated_data['password'])
        user.save()
        return user

class UserSerializer(serializers.ModelSerializer):
    """
    Serializer for retrieving user information.
    """
    class Meta:
        model = User
        fields = ('id', 'username', 'email', 'first_name', 'last_name')

# --- Order and Checkout Serializers ---

class CartItemSerializer(serializers.Serializer):
    """
    Serializer for validating cart items in order creation.
    """
    id = serializers.IntegerField()
    quantity = serializers.IntegerField(min_value=1)

class ShippingInfoSerializer(serializers.Serializer):
    """
    Serializer for validating shipping information in order creation.
    """
    first_name = serializers.CharField(max_length=50)
    last_name = serializers.CharField(max_length=50)
    email = serializers.EmailField()
    address = serializers.CharField(max_length=255)
    postal_code = serializers.CharField(max_length=20)
    city = serializers.CharField(max_length=100)

class CreateOrderRequestSerializer(serializers.Serializer):
    """
    Serializer for validating the complete order creation request.
    """
    items = CartItemSerializer(many=True)
    shipping_info = ShippingInfoSerializer()
    stripe_token = serializers.CharField()

class OrderItemSerializer(serializers.ModelSerializer):
    """
    Serializer for OrderItem model. Used as a nested serializer within OrderSerializer.
    """
    product = ProductSerializer(read_only=True)

    class Meta:
        model = OrderItem
        fields = ('product', 'price', 'quantity')

class OrderSerializer(serializers.ModelSerializer):
    """
    Serializer for displaying a customer's orders.
    This is primarily for reading existing orders.
    """
    items = OrderItemSerializer(many=True, read_only=True)
    user = UserSerializer(read_only=True)

    class Meta:
        model = Order
        fields = [
            'id', 'user', 'first_name', 'last_name', 'email', 'address',
            'postal_code', 'city', 'created_at', 'paid', 'stripe_id', 'total_paid', 'items'
        ]


# --- Wishlist Serializers ---

class WishlistItemSerializer(serializers.ModelSerializer):
    """
    Serializer for WishlistItem model.
    Includes full product details for easy rendering.
    """
    product = ProductSerializer(read_only=True)
    product_id = serializers.IntegerField(write_only=True)

    class Meta:
        model = WishlistItem
        fields = ['id', 'product', 'product_id', 'added_at']
        read_only_fields = ['added_at']

    def validate_product_id(self, value):
        """Ensure product exists and is available"""
        try:
            product = Product.objects.get(id=value, available=True)
            return value
        except Product.DoesNotExist:
            raise serializers.ValidationError("Product not found or not available.")


class WishlistSerializer(serializers.ModelSerializer):
    """
    Serializer for Wishlist model.
    Includes nested wishlist items with product details.
    """
    items = WishlistItemSerializer(many=True, read_only=True)
    item_count = serializers.SerializerMethodField()

    class Meta:
        model = Wishlist
        fields = ['id', 'user', 'items', 'item_count', 'created_at', 'updated_at']
        read_only_fields = ['user', 'created_at', 'updated_at']

    def get_item_count(self, obj):
        return obj.get_item_count()


class AddToWishlistSerializer(serializers.Serializer):
    """
    Serializer for adding a product to wishlist.
    """
    product_id = serializers.IntegerField()

    def validate_product_id(self, value):
        """Ensure product exists and is available"""
        try:
            Product.objects.get(id=value, available=True)
            return value
        except Product.DoesNotExist:
            raise serializers.ValidationError("Product not found or not available.")


# --- Product Review Serializers ---

class ProductReviewSerializer(serializers.ModelSerializer):
    """
    Serializer for ProductReview model.
    Includes user information for displaying reviews.
    """
    user = UserSerializer(read_only=True)
    user_name = serializers.SerializerMethodField()

    class Meta:
        model = ProductReview
        fields = [
            'id', 'product', 'user', 'user_name', 'rating', 'title', 'comment',
            'is_verified_purchase', 'is_approved', 'created_at', 'updated_at'
        ]
        read_only_fields = ['user', 'is_verified_purchase', 'is_approved', 'created_at', 'updated_at']

    def get_user_name(self, obj):
        """Return user's full name or username"""
        if obj.user.first_name and obj.user.last_name:
            return f"{obj.user.first_name} {obj.user.last_name}"
        return obj.user.username

    def validate_rating(self, value):
        """Ensure rating is between 1 and 5"""
        if value not in [1, 2, 3, 4, 5]:
            raise serializers.ValidationError("Rating must be between 1 and 5.")
        return value

    def validate_comment(self, value):
        """Ensure comment is at least 10 characters"""
        if len(value.strip()) < 10:
            raise serializers.ValidationError("Review comment must be at least 10 characters long.")
        return value.strip()


class CreateReviewSerializer(serializers.ModelSerializer):
    """
    Serializer for creating a new product review.
    """
    class Meta:
        model = ProductReview
        fields = ['product', 'rating', 'title', 'comment']

    def validate_rating(self, value):
        """Ensure rating is between 1 and 5"""
        if value not in [1, 2, 3, 4, 5]:
            raise serializers.ValidationError("Rating must be between 1 and 5.")
        return value

    def validate_comment(self, value):
        """Ensure comment is at least 10 characters"""
        if len(value.strip()) < 10:
            raise serializers.ValidationError("Review comment must be at least 10 characters long.")
        return value.strip()

    def validate(self, data):
        """Check if user has already reviewed this product"""
        user = self.context['request'].user
        product = data['product']
        
        if ProductReview.objects.filter(product=product, user=user).exists():
            raise serializers.ValidationError(
                "You have already reviewed this product. You can only review a product once."
            )
        
        return data


class ProductReviewStatsSerializer(serializers.Serializer):
    """
    Serializer for product review statistics.
    """
    average_rating = serializers.FloatField()
    review_count = serializers.IntegerField()
    rating_distribution = serializers.DictField(child=serializers.IntegerField())


# --- Dashboard User Profile Serializers ---

class UserProfileSerializer(serializers.ModelSerializer):
    """
    Serializer for UserProfile model.
    """
    username = serializers.CharField(source='user.username', read_only=True)
    email = serializers.EmailField(source='user.email', read_only=True)
    first_name = serializers.CharField(source='user.first_name')
    last_name = serializers.CharField(source='user.last_name')
    avatar = serializers.SerializerMethodField()

    class Meta:
        model = UserProfile
        fields = [
            'username', 'email', 'first_name', 'last_name', 'phone',
            'date_of_birth', 'bio', 'avatar', 'preferred_language',
            'email_notifications', 'newsletter_subscription',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['username', 'email', 'created_at', 'updated_at']

    def get_avatar(self, obj):
        """Return absolute URL for avatar image if available"""
        try:
            url = obj.avatar.url if obj.avatar else ''
        except Exception:
            url = ''
        request = self.context.get('request')
        if request and url:
            return request.build_absolute_uri(url)
        return url

    def update(self, instance, validated_data):
        """Update both UserProfile and related User fields"""
        user_data = validated_data.pop('user', {})
        
        # Update User model fields
        if user_data:
            user = instance.user
            user.first_name = user_data.get('first_name', user.first_name)
            user.last_name = user_data.get('last_name', user.last_name)
            user.save()
        
        # Update UserProfile fields
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        
        return instance


class UpdatePasswordSerializer(serializers.Serializer):
    """
    Serializer for updating user password.
    """
    old_password = serializers.CharField(required=True, write_only=True)
    new_password = serializers.CharField(required=True, write_only=True, validators=[validate_password])
    confirm_password = serializers.CharField(required=True, write_only=True)

    def validate_old_password(self, value):
        """Verify that the old password is correct"""
        user = self.context['request'].user
        if not user.check_password(value):
            raise serializers.ValidationError("Old password is incorrect.")
        return value

    def validate(self, attrs):
        """Verify that new passwords match"""
        if attrs['new_password'] != attrs['confirm_password']:
            raise serializers.ValidationError({"confirm_password": "New passwords do not match."})
        return attrs

    def save(self):
        """Update the user's password"""
        user = self.context['request'].user
        user.set_password(self.validated_data['new_password'])
        user.save()
        return user


# --- Shipping Address Serializers ---

class ShippingAddressSerializer(serializers.ModelSerializer):
    """
    Serializer for ShippingAddress model.
    ✅ IMPROVEMENT: Added comprehensive input validation
    """
    class Meta:
        model = ShippingAddress
        fields = [
            'id', 'label', 'first_name', 'last_name', 'company',
            'address_line1', 'address_line2', 'city', 'state',
            'postal_code', 'country', 'phone', 'is_default',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['created_at', 'updated_at']
    
    def validate_phone(self, value):
        """✅ IMPROVEMENT: Validate phone number format"""
        # Remove common separators
        cleaned = re.sub(r'[\s\-\(\)]', '', value)
        
        # Check if it's a valid phone number (digits and +)
        if not re.match(r'^\+?[0-9]{8,15}$', cleaned):
            raise serializers.ValidationError(
                "Phone number must be between 8 and 15 digits, optionally starting with +"
            )
        return value
    
    def validate_postal_code(self, value):
        """✅ IMPROVEMENT: Validate postal code format"""
        # Remove spaces
        cleaned = value.replace(' ', '')
        
        # Basic validation (alphanumeric, 3-10 characters)
        if not re.match(r'^[A-Z0-9]{3,10}$', cleaned.upper()):
            raise serializers.ValidationError(
                "Postal code must be 3-10 alphanumeric characters"
            )
        return cleaned.upper()
    
    def validate_email(self, value):
        """✅ IMPROVEMENT: Additional email validation beyond Django's default"""
        # Check for disposable email domains
        disposable_domains = ['tempmail.com', 'throwaway.email', '10minutemail.com', 'guerrillamail.com']
        if '@' in value:
            domain = value.split('@')[1].lower()
            
            if domain in disposable_domains:
                raise serializers.ValidationError(
                    "Disposable email addresses are not allowed"
                )
        return value.lower()

    def validate(self, data):
        """Ensure user always has at least one address, and validate phone"""
        user = self.context['request'].user
        
        # If this is the first address, it must be default
        if not self.instance:  # Creating new address
            existing_count = ShippingAddress.objects.filter(user=user).count()
            if existing_count == 0:
                data['is_default'] = True
        
        return data

    def create(self, validated_data):
        """Create shipping address for current user"""
        user = self.context['request'].user
        return ShippingAddress.objects.create(user=user, **validated_data)


# --- Payment Method Serializers ---

class PaymentMethodSerializer(serializers.ModelSerializer):
    """
    Serializer for PaymentMethod model (read-only display).
    Does not expose sensitive Stripe payment method ID to clients.
    """
    is_expired = serializers.BooleanField(read_only=True)
    display_name = serializers.SerializerMethodField()

    class Meta:
        model = PaymentMethod
        fields = [
            'id', 'payment_type', 'card_brand', 'card_last4',
            'card_exp_month', 'card_exp_year', 'bank_name',
            'account_last4', 'is_default', 'is_expired',
            'display_name', 'created_at', 'updated_at'
        ]
        read_only_fields = ['created_at', 'updated_at', 'is_expired']

    def get_display_name(self, obj):
        """Get user-friendly display name for payment method"""
        return str(obj)


class CreatePaymentMethodSerializer(serializers.Serializer):
    """
    Serializer for creating a new payment method.
    Accepts Stripe payment method ID and optionally sets as default.
    """
    stripe_payment_method_id = serializers.CharField(required=True)
    is_default = serializers.BooleanField(default=False)

    def validate_stripe_payment_method_id(self, value):
        """Validate Stripe payment method ID format"""
        if not value.startswith('pm_'):
            raise serializers.ValidationError("Invalid Stripe payment method ID format.")
        return value


class UpdatePaymentMethodSerializer(serializers.ModelSerializer):
    """
    Serializer for updating payment method (mainly for setting default).
    """
    class Meta:
        model = PaymentMethod
        fields = ['is_default']


# --- Enhanced Order Serializers ---

class DashboardOrderItemSerializer(serializers.ModelSerializer):
    """
    Serializer for OrderItem in dashboard context.
    """
    product_id = serializers.IntegerField(source='product.id', read_only=True)
    product_name = serializers.CharField(source='product.name', read_only=True)
    product_image = serializers.SerializerMethodField()

    class Meta:
        model = OrderItem
        fields = ['product_id', 'product_name', 'product_image', 'price', 'quantity']

    def get_product_image(self, obj):
        """Get first product image URL"""
        if obj.product and obj.product.images.exists():
            image = obj.product.images.first()
            try:
                url = image.image.url if image else ''
            except Exception:
                url = ''
            request = self.context.get('request')
            if request and url:
                return request.build_absolute_uri(url)
            return url
        return ''


class DashboardOrderSerializer(serializers.ModelSerializer):
    """
    Enhanced serializer for Order model in dashboard context.
    Includes status, tracking, and order items.
    """
    items = DashboardOrderItemSerializer(many=True, read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    status_class = serializers.CharField(source='get_status_display_class', read_only=True)
    item_count = serializers.SerializerMethodField()
    can_cancel = serializers.SerializerMethodField()

    class Meta:
        model = Order
        fields = [
            'id', 'first_name', 'last_name', 'email', 'address',
            'postal_code', 'city', 'status', 'status_display', 'status_class',
            'paid', 'total_paid', 'tracking_number', 'shipping_method',
            'estimated_delivery', 'notes', 'created_at', 'updated_at',
            'items', 'item_count', 'can_cancel'
        ]
        read_only_fields = [
            'paid', 'total_paid', 'created_at', 'updated_at', 'stripe_id'
        ]

    def get_item_count(self, obj):
        """Get total number of items in order"""
        return sum(item.quantity for item in obj.items.all())

    def get_can_cancel(self, obj):
        """Check if order can be cancelled"""
        return obj.status in ['pending', 'processing']


class OrderFilterSerializer(serializers.Serializer):
    """
    Serializer for order filtering parameters.
    """
    status = serializers.ChoiceField(
        choices=['all', 'pending', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded'],
        default='all',
        required=False
    )
    date_from = serializers.DateField(required=False)
    date_to = serializers.DateField(required=False)
    search = serializers.CharField(required=False, allow_blank=True)