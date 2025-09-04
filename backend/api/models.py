from django.db import models
from django.contrib.auth.models import User
from decimal import Decimal

# Create your models here.

class Category(models.Model):
    """
    Model for product categories.
    Allows for nested categories by having a self-referencing ForeignKey.
    """
    name = models.CharField(max_length=255)
    slug = models.SlugField(unique=True) # A slug is a URL-friendly version of the name
    parent = models.ForeignKey('self', on_delete=models.CASCADE, null=True, blank=True, related_name='children')
    
    class Meta:
        # Enforce that category names are unique to avoid confusion
        unique_together = ('slug', 'parent',)
        verbose_name_plural = "categories"

    def __str__(self):
        # Create a string representation for display in the Django admin
        # This will show the full path of the category, e.g., "Audio > Speakers"
        full_path = [self.name]
        k = self.parent
        while k is not None:
            full_path.append(k.name)
            k = k.parent
        return ' -> '.join(full_path[::-1])

class Brand(models.Model):
    """
    Model for product brands.
    """
    name = models.CharField(max_length=255, unique=True)
    slug = models.SlugField(unique=True)
    description = models.TextField(blank=True)
    image = models.ImageField(upload_to='brands/', blank=True, null=True)

    class Meta:
        ordering = ('name',)

    def __str__(self):
        return self.name


class Product(models.Model):
    """
    Model for individual products.
    """
    category = models.ForeignKey(Category, related_name='products', on_delete=models.CASCADE)
    brand = models.ForeignKey(Brand, related_name='products', on_delete=models.SET_NULL, null=True, blank=True)
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    # Use DecimalField for price to avoid floating point rounding errors
    price = models.DecimalField(max_digits=10, decimal_places=2)
    # Pillow library is required for ImageField
    image = models.ImageField(upload_to='products/', blank=True, null=True)
    stock = models.PositiveIntegerField(default=0)
    available = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ('-created_at',) # Default ordering for products

    def __str__(self):
        return self.name


class Order(models.Model):
    """
    Model representing a customer's order.
    """
    user = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True)
    first_name = models.CharField(max_length=50)
    last_name = models.CharField(max_length=50)
    email = models.EmailField()
    address = models.CharField(max_length=250)
    postal_code = models.CharField(max_length=20)
    city = models.CharField(max_length=100)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    paid = models.BooleanField(default=False)
    stripe_id = models.CharField(max_length=250, blank=True)
    total_paid = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal('0.00'))

    class Meta:
        ordering = ('-created_at',)

    def __str__(self):
        return f'Order {self.pk}'


class OrderItem(models.Model):
    """
    Model for items within an order.
    This acts as a through model between Order and Product.
    """
    order = models.ForeignKey(Order, related_name='items', on_delete=models.CASCADE)
    product = models.ForeignKey(Product, related_name='order_items', on_delete=models.SET_NULL, null=True)
    # We store the price here to keep a historical record of the price at the time of purchase
    price = models.DecimalField(max_digits=10, decimal_places=2)
    quantity = models.PositiveIntegerField(default=1)

    def __str__(self):
        return str(self.pk)

    def get_cost(self):
        return self.price * self.quantity