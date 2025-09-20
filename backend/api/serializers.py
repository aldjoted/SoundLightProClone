from rest_framework import serializers
from django.contrib.auth.models import User
from django.contrib.auth.password_validation import validate_password
from .models import Category, Brand, Product, ProductImage, Order, OrderItem

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

    class Meta:
        model = Product
        fields = [
            'id', 'category', 'brand', 'name', 'description', 
            'price', 'images', 'stock', 'available'
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