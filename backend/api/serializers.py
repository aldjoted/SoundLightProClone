from rest_framework import serializers
from django.contrib.auth.models import User
from django.contrib.auth.password_validation import validate_password
from .models import (
    Category, Brand, Product, ProductImage, Order, OrderItem,
    Wishlist, WishlistItem, ProductReview
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
        return obj.get_average_rating()
    
    def get_review_count(self, obj):
        """Return count of approved reviews"""
        return obj.get_review_count()

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
    
    def validate(self, attrs):
        # Check that the two password fields match
        if attrs['password'] != attrs['password2']:
            raise serializers.ValidationError({"password": "Password fields didn't match."})
        return attrs

    def create(self, validated_data):
        # Create a new user with a hashed password
        user = User.objects.create(
            username=validated_data['username'],
            email=validated_data['email'],
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