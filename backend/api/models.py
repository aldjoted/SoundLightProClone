from django.db import models
from django.contrib.auth.models import User
from decimal import Decimal
from mptt.models import MPTTModel, TreeForeignKey
from django.utils.translation import gettext_lazy as _

# Create your models here.

class Category(MPTTModel):
    """
    Model for product categories.
    Uses django-mptt for efficient hierarchical data handling.
    """
    name = models.CharField(max_length=255, verbose_name=_("Category name"))
    name_fr = models.CharField(max_length=255, blank=True, verbose_name=_("Category name (French)"))
    slug = models.SlugField(unique=True) # A slug is a URL-friendly version of the name
    parent = TreeForeignKey('self', on_delete=models.CASCADE, null=True, blank=True, related_name='children')
    
    class MPTTMeta:
        order_insertion_by = ['name']
    
    class Meta:
        # Enforce that category names are unique to avoid confusion
        unique_together = ('slug', 'parent',)
        verbose_name_plural = "categories"

    def __str__(self):
        # Create a string representation for display in the Django admin
        # This will show the full path of the category, e.g., "Audio > Speakers"
        return ' -> '.join([ancestor.name for ancestor in self.get_ancestors(include_self=True)])
    
    def get_name(self, language='en'):
        """Get category name in specified language"""
        if language == 'fr' and self.name_fr:
            return self.name_fr
        return self.name

class Brand(models.Model):
    """
    Model for product brands.
    """
    name = models.CharField(max_length=255, unique=True, verbose_name=_("Brand name"))
    slug = models.SlugField(unique=True)
    description = models.TextField(blank=True, verbose_name=_("Brand description"))
    description_fr = models.TextField(blank=True, verbose_name=_("Brand description (French)"))
    image = models.ImageField(upload_to='brands/', blank=True, null=True)

    class Meta:
        ordering = ('name',)

    def __str__(self):
        return self.name
    
    def get_description(self, language='en'):
        """Get brand description in specified language"""
        if language == 'fr' and self.description_fr:
            return self.description_fr
        return self.description


class Product(models.Model):
    """
    Model for individual products.
    """
    category = models.ForeignKey(Category, related_name='products', on_delete=models.CASCADE)
    brand = models.ForeignKey(Brand, related_name='products', on_delete=models.SET_NULL, null=True, blank=True)
    name = models.CharField(max_length=255, verbose_name=_("Product name"))
    name_fr = models.CharField(max_length=255, blank=True, verbose_name=_("Product name (French)"))
    description = models.TextField(blank=True, verbose_name=_("Product description"))
    description_fr = models.TextField(blank=True, verbose_name=_("Product description (French)"))
    # Use DecimalField for price to avoid floating point rounding errors
    price = models.DecimalField(max_digits=10, decimal_places=2, verbose_name=_("Price"))
    # The single image field has been REMOVED from here.
    stock = models.PositiveIntegerField(default=0, verbose_name=_("Stock quantity"))
    available = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ('-created_at',) # Default ordering for products

    def __str__(self):
        return self.name
    
    def get_name(self, language='en'):
        """Get product name in specified language"""
        if language == 'fr' and self.name_fr:
            return self.name_fr
        return self.name
    
    def get_description(self, language='en'):
        """Get product description in specified language"""
        if language == 'fr' and self.description_fr:
            return self.description_fr
        return self.description
    
    def get_average_rating(self):
        """Calculate the average rating from approved reviews"""
        from django.db.models import Avg
        result = self.reviews.filter(is_approved=True).aggregate(Avg('rating'))
        return round(result['rating__avg'], 1) if result['rating__avg'] else None
    
    def get_review_count(self):
        """Get the count of approved reviews"""
        return self.reviews.filter(is_approved=True).count()
    
    def get_related_products(self, limit=6):
        """
        Get related products based on:
        1. Same category
        2. Similar price range (±30%)
        3. Exclude the current product
        """
        if not self.price:
            return Product.objects.none()
        
        price_min = self.price * Decimal('0.7')
        price_max = self.price * Decimal('1.3')
        
        # Get products in the same category with similar price
        related = Product.objects.filter(
            category=self.category,
            available=True,
            price__gte=price_min,
            price__lte=price_max
        ).exclude(
            id=self.id
        ).select_related('brand', 'category')[:limit]
        
        # If we don't have enough products, add more from the same category
        if related.count() < limit:
            additional = Product.objects.filter(
                category=self.category,
                available=True
            ).exclude(
                id=self.id
            ).exclude(
                id__in=[p.id for p in related]
            ).select_related('brand', 'category')[:limit - related.count()]
            
            related = list(related) + list(additional)
        
        return related

class ProductImage(models.Model):
    """
    Model for storing multiple images for a single product.
    """
    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name='images')
    image = models.ImageField(upload_to='products/')
    alt_text = models.CharField(max_length=255, blank=True, help_text="Descriptive text for SEO and accessibility.")
    
    class Meta:
        ordering = ['id'] # Order images by when they were added

    def __str__(self):
        return f"Image for {self.product.name}"


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


class Wishlist(models.Model):
    """
    Model for user wishlists.
    Each user has one wishlist that contains multiple products.
    """
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='wishlist')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ('-updated_at',)
        verbose_name = _("Wishlist")
        verbose_name_plural = _("Wishlists")

    def __str__(self):
        return f"Wishlist for {self.user.username}"

    def get_item_count(self):
        """Return the number of items in the wishlist"""
        return self.items.count()


class WishlistItem(models.Model):
    """
    Model for individual items in a wishlist.
    Tracks when products were added to the wishlist.
    """
    wishlist = models.ForeignKey(Wishlist, related_name='items', on_delete=models.CASCADE)
    product = models.ForeignKey(Product, related_name='wishlist_items', on_delete=models.CASCADE)
    added_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ('-added_at',)
        # Ensure a product can only be added once to a user's wishlist
        unique_together = ('wishlist', 'product')
        indexes = [
            models.Index(fields=['wishlist', '-added_at']),
        ]
        verbose_name = _("Wishlist Item")
        verbose_name_plural = _("Wishlist Items")

    def __str__(self):
        return f"{self.product.name} in {self.wishlist.user.username}'s wishlist"


class ProductReview(models.Model):
    """
    Model for product reviews and ratings.
    Allows customers to rate and review products they've purchased.
    """
    RATING_CHOICES = (
        (1, '1 Star'),
        (2, '2 Stars'),
        (3, '3 Stars'),
        (4, '4 Stars'),
        (5, '5 Stars'),
    )

    product = models.ForeignKey(Product, related_name='reviews', on_delete=models.CASCADE)
    user = models.ForeignKey(User, related_name='reviews', on_delete=models.CASCADE)
    rating = models.PositiveSmallIntegerField(choices=RATING_CHOICES, verbose_name=_("Rating"))
    title = models.CharField(max_length=200, blank=True, verbose_name=_("Review Title"))
    comment = models.TextField(verbose_name=_("Review Comment"))
    is_verified_purchase = models.BooleanField(default=False, verbose_name=_("Verified Purchase"))
    is_approved = models.BooleanField(default=True, verbose_name=_("Approved"))
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ('-created_at',)
        # Prevent users from reviewing the same product multiple times
        unique_together = ('product', 'user')
        indexes = [
            models.Index(fields=['product', '-created_at']),
            models.Index(fields=['product', 'is_approved']),
            models.Index(fields=['user', '-created_at']),
        ]
        verbose_name = _("Product Review")
        verbose_name_plural = _("Product Reviews")

    def __str__(self):
        return f"{self.rating}-star review by {self.user.username} for {self.product.name}"

    def clean(self):
        """Validate review data"""
        from django.core.exceptions import ValidationError
        if self.rating not in [1, 2, 3, 4, 5]:
            raise ValidationError(_("Rating must be between 1 and 5."))
        if len(self.comment.strip()) < 10:
            raise ValidationError(_("Review comment must be at least 10 characters long."))

    def save(self, *args, **kwargs):
        """Override save to check if user has purchased the product"""
        self.full_clean()
        
        # Check if this is a verified purchase
        if not self.pk:  # Only check on creation
            has_purchased = OrderItem.objects.filter(
                order__user=self.user,
                order__paid=True,
                product=self.product
            ).exists()
            self.is_verified_purchase = has_purchased
        
        super().save(*args, **kwargs)