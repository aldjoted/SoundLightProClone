from django.db import models, transaction
from django.contrib.auth.models import User
from decimal import Decimal
from mptt.models import MPTTModel, TreeForeignKey
from django.utils.translation import gettext_lazy as _
from django.db.models.signals import post_save, pre_save
from django.dispatch import receiver
from django.conf import settings
from django.core.mail import send_mail
import logging


logger = logging.getLogger(__name__)

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
    related_products = models.ManyToManyField('self', blank=True, symmetrical=False, related_name='related_to')
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
        # ✅ PERFORMANCE: Add indexes for frequently queried fields
        indexes = [
            models.Index(fields=['available', 'category']),  # For category filtering
            models.Index(fields=['available', 'brand']),     # For brand filtering
            models.Index(fields=['-created_at']),            # For sorting by date
            models.Index(fields=['name']),                    # For search operations
        ]

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

    @property
    def average_rating(self):
        """Return annotated average rating rounded to one decimal."""
        if not hasattr(self, 'avg_rating'):
            raise AttributeError(
                "Product.average_rating requires 'avg_rating' annotation. "
                "Annotate the queryset before accessing this property."
            )
        avg = self.avg_rating
        if avg is None:
            return None
        return round(float(avg), 1)

    @property
    def review_count(self):
        """Return annotated approved review count."""
        if not hasattr(self, 'review_count_cached'):
            raise AttributeError(
                "Product.review_count requires 'review_count_cached' annotation. "
                "Annotate the queryset before accessing this property."
            )
        return int(self.review_count_cached or 0)
    
    def get_related_products(self, limit=6):
        """Return manually curated related products first, then fall back to smart suggestions."""
        manual_qs = self.related_products.filter(available=True).select_related('brand', 'category')
        manual = list(manual_qs[:limit]) if limit else list(manual_qs)

        remaining = max(limit - len(manual), 0) if limit else 0

        if remaining == 0 and limit is not None:
            return manual[:limit]

        suggestions = []
        if self.price and (remaining or limit is None):
            price_min = self.price * Decimal('0.7')
            price_max = self.price * Decimal('1.3')

            base_qs = Product.objects.filter(
                category=self.category,
                available=True,
                price__gte=price_min,
                price__lte=price_max
            ).exclude(id=self.id)

            if manual:
                base_qs = base_qs.exclude(id__in=[p.id for p in manual])

            base_qs = base_qs.select_related('brand', 'category')

            if remaining:
                base_qs = base_qs[:remaining]

            suggestions = list(base_qs)

            if remaining and len(suggestions) < remaining:
                extra_needed = remaining - len(suggestions)
                fallback_qs = Product.objects.filter(
                    category=self.category,
                    available=True
                ).exclude(id=self.id)
                if manual:
                    fallback_qs = fallback_qs.exclude(id__in=[p.id for p in manual])
                if suggestions:
                    fallback_qs = fallback_qs.exclude(id__in=[p.id for p in suggestions])
                fallback_qs = fallback_qs.select_related('brand', 'category')[:extra_needed]
                suggestions.extend(list(fallback_qs))

        return manual + suggestions

    def get_semantic_related_products(self, limit=5):
        """Find related products using the semantic FAISS index with graceful fallbacks."""
        from .vector_search import get_search_index_data  # Local import to avoid circular dependency
        from .embeddings import model as embedding_model, get_product_text
        import numpy as np
        from django.db.models import Case, When

        index, product_ids = get_search_index_data()
        if not index or not product_ids:
            return self.get_related_products(limit=limit)

        try:
            current_product_index = product_ids.index(self.id)
        except ValueError:
            return self.get_related_products(limit=limit)

        try:
            vector = index.reconstruct(current_product_index)
        except Exception:
            product_vector = embedding_model.encode([get_product_text(self)], normalize_embeddings=True)
            vector = product_vector[0]

        vector = np.asarray(vector, dtype='float32').reshape(1, -1)
        D, I = index.search(vector, (limit or 0) + 1)

        found_ids = []
        for idx in I[0]:
            if 0 <= idx < len(product_ids):
                candidate_id = product_ids[idx]
                if candidate_id != self.id and candidate_id not in found_ids:
                    found_ids.append(candidate_id)
                    if limit and len(found_ids) >= limit:
                        break

        if not found_ids:
            return self.get_related_products(limit=limit)

        ordering = Case(*[When(pk=pid, then=pos) for pos, pid in enumerate(found_ids)])
        return Product.objects.filter(id__in=found_ids).order_by(ordering)

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


class ProductAttachment(models.Model):
    """Optional rich-media assets such as PDF manuals or spec sheets."""
    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name='attachments')
    file = models.FileField(upload_to='products/attachments/')
    label = models.CharField(max_length=255, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        name = self.label or self.file.name
        return f"Attachment for {self.product.name}: {name}"


class StockNotificationRequest(models.Model):
    """Notification request to alert customers when a product is restocked."""

    user = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='stock_notifications'
    )
    product = models.ForeignKey(
        Product,
        on_delete=models.CASCADE,
        related_name='stock_notification_requests'
    )
    email = models.EmailField()
    notified = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('product', 'email')
        ordering = ['-created_at']
        verbose_name = _("Stock Notification Request")
        verbose_name_plural = _("Stock Notification Requests")

    def __str__(self):
        return f"{self.email} -> {self.product.name}"


def send_stock_notification_email(notification: "StockNotificationRequest") -> bool:
    """Send a restock notification email to the requester."""

    subject = _("Product back in stock")
    product_name = notification.product.name
    message = _(
        "Good news! The product '%(product)s' is available again. Visit our store to place your order."
    ) % {"product": product_name}
    from_email = getattr(settings, 'DEFAULT_FROM_EMAIL', None)

    try:
        send_mail(subject, message, from_email, [notification.email], fail_silently=False)
        return True
    except Exception as exc:  # pragma: no cover - defensive logging
        logger.warning(
            "Failed to send stock notification email for product %s to %s: %s",
            notification.product_id,
            notification.email,
            exc,
        )
        return False


def enqueue_stock_notification(notification: "StockNotificationRequest") -> None:
    """Placeholder for asynchronous task queue integration."""

    if send_stock_notification_email(notification):
        StockNotificationRequest.objects.filter(pk=notification.pk, notified=False).update(notified=True)


@receiver(pre_save, sender=Product)
def cache_previous_stock(sender, instance: Product, **kwargs):
    """Store the previous stock level for restock detection."""

    if not instance.pk:
        instance._previous_stock = None  # type: ignore[attr-defined]
        return

    try:
        previous_stock = sender.objects.only('stock').get(pk=instance.pk).stock
    except sender.DoesNotExist:  # pragma: no cover - defensive
        previous_stock = None

    instance._previous_stock = previous_stock  # type: ignore[attr-defined]


@receiver(post_save, sender=Product)
def trigger_stock_notifications(sender, instance: Product, created: bool, **kwargs):
    """Dispatch notifications when a product transitions from out-of-stock to available."""

    if created:
        instance._previous_stock = None  # type: ignore[attr-defined]
        return

    previous_stock = getattr(instance, '_previous_stock', None)
    instance._previous_stock = None  # type: ignore[attr-defined]

    if previous_stock is None or previous_stock > 0 or instance.stock <= 0:
        return

    pending_requests = list(
        StockNotificationRequest.objects.select_related('product').filter(
            product=instance,
            notified=False
        )
    )

    if not pending_requests:
        return

    def process_notifications():
        for notification in pending_requests:
            enqueue_stock_notification(notification)

    transaction.on_commit(process_notifications)


class UserProfile(models.Model):
    """
    Extended user profile model for additional user information.
    Automatically created for each user via signals.
    """
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='profile')
    phone = models.CharField(max_length=20, blank=True, verbose_name=_("Phone Number"))
    date_of_birth = models.DateField(null=True, blank=True, verbose_name=_("Date of Birth"))
    bio = models.TextField(blank=True, max_length=500, verbose_name=_("Biography"))
    avatar = models.ImageField(upload_to='avatars/', blank=True, null=True, verbose_name=_("Avatar"))
    
    # Preferences
    preferred_language = models.CharField(
        max_length=5,
        choices=[('en', 'English'), ('fr', 'French')],
        default='en',
        verbose_name=_("Preferred Language")
    )
    email_notifications = models.BooleanField(default=True, verbose_name=_("Email Notifications"))
    newsletter_subscription = models.BooleanField(default=False, verbose_name=_("Newsletter Subscription"))
    
    # 2FA Email Verification fields
    login_verification_code = models.CharField(max_length=6, blank=True, verbose_name=_("Login Verification Code"))
    login_verification_code_expires = models.DateTimeField(null=True, blank=True, verbose_name=_("Verification Code Expiry"))
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = _("User Profile")
        verbose_name_plural = _("User Profiles")

    def __str__(self):
        return f"Profile for {self.user.username}"


@receiver(post_save, sender=User)
def create_user_profile(sender, instance, created, **kwargs):
    """Signal to automatically create a UserProfile when a User is created"""
    if created:
        UserProfile.objects.create(user=instance)


@receiver(post_save, sender=User)
def save_user_profile(sender, instance, **kwargs):
    """Signal to save UserProfile when User is saved"""
    if hasattr(instance, 'profile'):
        instance.profile.save()


class ShippingAddress(models.Model):
    """
    Model for storing multiple shipping addresses for users.
    Users can save multiple addresses and set one as default.
    """
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='shipping_addresses')
    label = models.CharField(max_length=50, verbose_name=_("Address Label"), help_text="e.g., Home, Office, Warehouse")
    first_name = models.CharField(max_length=50, verbose_name=_("First Name"))
    last_name = models.CharField(max_length=50, verbose_name=_("Last Name"))
    company = models.CharField(max_length=100, blank=True, verbose_name=_("Company Name"))
    address_line1 = models.CharField(max_length=250, verbose_name=_("Address Line 1"))
    address_line2 = models.CharField(max_length=250, blank=True, verbose_name=_("Address Line 2"))
    city = models.CharField(max_length=100, verbose_name=_("City"))
    state = models.CharField(max_length=100, blank=True, verbose_name=_("State/Province"))
    postal_code = models.CharField(max_length=20, verbose_name=_("Postal Code"))
    country = models.CharField(max_length=100, default='Cameroon', verbose_name=_("Country"))
    phone = models.CharField(max_length=20, verbose_name=_("Phone Number"))
    is_default = models.BooleanField(default=False, verbose_name=_("Default Address"))
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ('-is_default', '-created_at')
        verbose_name = _("Shipping Address")
        verbose_name_plural = _("Shipping Addresses")
        indexes = [
            models.Index(fields=['user', '-is_default']),
        ]

    def __str__(self):
        return f"{self.label} - {self.address_line1}, {self.city}"

    def save(self, *args, **kwargs):
        """Ensure only one default address per user"""
        if self.is_default:
            # Set all other addresses for this user to non-default
            ShippingAddress.objects.filter(user=self.user, is_default=True).exclude(pk=self.pk).update(is_default=False)

        super().save(*args, **kwargs)

        # Failsafe: make sure at least one default address exists.
        user_addresses = ShippingAddress.objects.filter(user=self.user)
        if user_addresses.exists() and not user_addresses.filter(is_default=True).exists():
            fallback = user_addresses.order_by('-updated_at').first()
            if fallback:
                ShippingAddress.objects.filter(pk=fallback.pk).update(is_default=True)


class PaymentMethod(models.Model):
    """
    Model for storing saved payment methods (Stripe payment methods).
    Stores minimal, non-sensitive payment information.
    """
    PAYMENT_TYPE_CHOICES = [
        ('card', 'Credit/Debit Card'),
        ('bank_account', 'Bank Account'),
        ('mobile_money', 'Mobile Money'),
    ]

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='payment_methods')
    stripe_payment_method_id = models.CharField(max_length=255, unique=True, verbose_name=_("Stripe Payment Method ID"))
    payment_type = models.CharField(max_length=20, choices=PAYMENT_TYPE_CHOICES, default='card', verbose_name=_("Payment Type"))
    
    # Card-specific fields (for display only, not for processing)
    card_brand = models.CharField(max_length=20, blank=True, verbose_name=_("Card Brand"))  # Visa, Mastercard, etc.
    card_last4 = models.CharField(max_length=4, blank=True, verbose_name=_("Last 4 Digits"))
    card_exp_month = models.PositiveSmallIntegerField(null=True, blank=True, verbose_name=_("Expiry Month"))
    card_exp_year = models.PositiveIntegerField(null=True, blank=True, verbose_name=_("Expiry Year"))
    
    # Bank account fields (minimal info)
    bank_name = models.CharField(max_length=100, blank=True, verbose_name=_("Bank Name"))
    account_last4 = models.CharField(max_length=4, blank=True, verbose_name=_("Account Last 4 Digits"))
    
    is_default = models.BooleanField(default=False, verbose_name=_("Default Payment Method"))
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ('-is_default', '-created_at')
        verbose_name = _("Payment Method")
        verbose_name_plural = _("Payment Methods")
        indexes = [
            models.Index(fields=['user', '-is_default']),
        ]

    def __str__(self):
        if self.payment_type == 'card' and self.card_brand and self.card_last4:
            return f"{self.card_brand} ending in {self.card_last4}"
        elif self.payment_type == 'bank_account' and self.bank_name:
            return f"{self.bank_name} ending in {self.account_last4}"
        return f"{self.get_payment_type_display()}"

    def save(self, *args, **kwargs):
        """Ensure only one default payment method per user"""
        if self.is_default:
            # Set all other payment methods for this user to non-default
            PaymentMethod.objects.filter(user=self.user, is_default=True).update(is_default=False)
        super().save(*args, **kwargs)

    @property
    def is_expired(self):
        """Check if card is expired (only for cards)"""
        if self.payment_type == 'card' and self.card_exp_month and self.card_exp_year:
            from datetime import date
            today = date.today()
            return (self.card_exp_year < today.year) or \
                   (self.card_exp_year == today.year and self.card_exp_month < today.month)
        return False


class Order(models.Model):
    """
    Model representing a customer's order.
    Enhanced with status tracking and shipping information.
    """
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('pending_payment', 'Pending Payment'),
        ('processing', 'Processing'),
        ('shipped', 'Shipped'),
        ('delivered', 'Delivered'),
        ('cancelled', 'Cancelled'),
        ('refunded', 'Refunded'),
    ]

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
    
    # Enhanced order tracking fields
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default='pending',
        verbose_name=_("Order Status")
    )
    tracking_number = models.CharField(max_length=100, blank=True, verbose_name=_("Tracking Number"))
    notes = models.TextField(blank=True, verbose_name=_("Order Notes"))
    
    # Shipping information
    shipping_method = models.CharField(max_length=50, blank=True, verbose_name=_("Shipping Method"))
    estimated_delivery = models.DateField(null=True, blank=True, verbose_name=_("Estimated Delivery Date"))

    class Meta:
        ordering = ('-created_at',)
        indexes = [
            models.Index(fields=['user', '-created_at']),
            models.Index(fields=['status', '-created_at']),
        ]

    def __str__(self):
        return f'Order #{self.pk}'
    
    def get_status_display_class(self):
        """Return CSS class for status display"""
        status_classes = {
            'pending': 'status-pending',
            'pending_payment': 'status-pending',
            'processing': 'status-processing',
            'shipped': 'status-shipped',
            'delivered': 'status-delivered',
            'cancelled': 'status-cancelled',
            'refunded': 'status-refunded',
        }
        return status_classes.get(self.status, 'status-default')

    def get_total_cost_stripe(self) -> int:
        """Return total amount in cents for Stripe API."""
        amount = (self.total_paid or Decimal('0.00')).quantize(Decimal('0.01'))
        return int(amount * 100)


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