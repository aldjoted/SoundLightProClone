from django.contrib import admin
from .models import (
    Category, Brand, Product, ProductImage, Order, OrderItem, 
    Wishlist, WishlistItem, ProductReview, UserProfile, ShippingAddress, PaymentMethod
)

# Register your models here.

@admin.register(Category)
class CategoryAdmin(admin.ModelAdmin):
    """
    Admin configuration for the Category model.
    """
    list_display = ['name', 'slug', 'parent']
    prepopulated_fields = {'slug': ('name',)}
    search_fields = ['name'] 
    raw_id_fields = ['parent']

@admin.register(Brand)
class BrandAdmin(admin.ModelAdmin):
    """
    Admin configuration for the Brand model.
    """
    list_display = ['name', 'slug']
    prepopulated_fields = {'slug': ('name',)}
    search_fields = ['name']

class ProductImageInline(admin.TabularInline):
    """
    Allows adding and editing ProductImages directly within the Product admin page.
    """
    model = ProductImage
    extra = 1 # Show one extra blank form for a new image by default
    fields = ['image', 'alt_text']

@admin.register(Product)
class ProductAdmin(admin.ModelAdmin):
    """
    Admin configuration for the Product model.
    """
    list_display = ['name', 'brand', 'category', 'price', 'stock', 'available', 'created_at']
    list_filter = ['available', 'created_at', 'updated_at', 'category', 'brand']
    list_editable = ['price', 'stock', 'available']
    search_fields = ['name', 'description']
    inlines = [ProductImageInline] # Add the inline here


class OrderItemInline(admin.TabularInline):
    """
    Allows viewing and editing OrderItems directly within the Order admin page.
    This provides a more intuitive admin experience.
    """
    model = OrderItem
    # Raw_id_fields are useful for foreign keys with many options, like products
    raw_id_fields = ['product']
    extra = 0 # Don't show extra empty forms by default
    readonly_fields = ['price'] # The price at the time of order should not be changed


@admin.register(Order)
class OrderAdmin(admin.ModelAdmin):
    """
    Admin configuration for the Order model.
    """
    list_display = ['id', 'user', 'first_name', 'last_name', 'email', 'status', 'paid', 'created_at', 'total_paid']
    list_filter = ['status', 'paid', 'created_at', 'updated_at']
    search_fields = ['id', 'first_name', 'last_name', 'email', 'tracking_number']
    list_editable = ['status']
    readonly_fields = ['created_at', 'updated_at']
    # Include the OrderItemInline to show order items on the order detail page
    inlines = [OrderItemInline]
    
    fieldsets = (
        ('Customer Information', {
            'fields': ('user', 'first_name', 'last_name', 'email')
        }),
        ('Shipping Address', {
            'fields': ('address', 'city', 'postal_code')
        }),
        ('Order Status', {
            'fields': ('status', 'paid', 'stripe_id', 'total_paid', 'tracking_number', 'shipping_method', 'estimated_delivery')
        }),
        ('Additional Information', {
            'fields': ('notes',),
            'classes': ('collapse',)
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )


class WishlistItemInline(admin.TabularInline):
    """
    Allows viewing and editing WishlistItems directly within the Wishlist admin page.
    """
    model = WishlistItem
    raw_id_fields = ['product']
    extra = 0
    readonly_fields = ['added_at']


@admin.register(Wishlist)
class WishlistAdmin(admin.ModelAdmin):
    """
    Admin configuration for the Wishlist model.
    """
    list_display = ['user', 'created_at', 'updated_at', 'item_count']
    list_filter = ['created_at', 'updated_at']
    search_fields = ['user__username', 'user__email']
    readonly_fields = ['created_at', 'updated_at']
    inlines = [WishlistItemInline]

    def item_count(self, obj):
        return obj.get_item_count()
    item_count.short_description = 'Items'


@admin.register(ProductReview)
class ProductReviewAdmin(admin.ModelAdmin):
    """
    Admin configuration for the ProductReview model.
    Allows moderators to approve/reject reviews.
    """
    list_display = ['product', 'user', 'rating', 'is_verified_purchase', 'is_approved', 'created_at']
    list_filter = ['rating', 'is_verified_purchase', 'is_approved', 'created_at']
    search_fields = ['product__name', 'user__username', 'title', 'comment']
    list_editable = ['is_approved']
    readonly_fields = ['is_verified_purchase', 'created_at', 'updated_at']
    raw_id_fields = ['product', 'user']
    
    fieldsets = (
        ('Review Information', {
            'fields': ('product', 'user', 'rating', 'title', 'comment')
        }),
        ('Status', {
            'fields': ('is_verified_purchase', 'is_approved')
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )


@admin.register(UserProfile)
class UserProfileAdmin(admin.ModelAdmin):
    """
    Admin configuration for the UserProfile model.
    """
    list_display = ['user', 'phone', 'preferred_language', 'email_notifications', 'created_at']
    list_filter = ['preferred_language', 'email_notifications', 'newsletter_subscription', 'created_at']
    search_fields = ['user__username', 'user__email', 'phone']
    readonly_fields = ['created_at', 'updated_at']
    raw_id_fields = ['user']
    
    fieldsets = (
        ('User Information', {
            'fields': ('user', 'phone', 'date_of_birth', 'bio', 'avatar')
        }),
        ('Preferences', {
            'fields': ('preferred_language', 'email_notifications', 'newsletter_subscription')
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )


@admin.register(ShippingAddress)
class ShippingAddressAdmin(admin.ModelAdmin):
    """
    Admin configuration for the ShippingAddress model.
    """
    list_display = ['user', 'label', 'city', 'country', 'is_default', 'created_at']
    list_filter = ['is_default', 'country', 'created_at']
    search_fields = ['user__username', 'user__email', 'label', 'city', 'address_line1']
    list_editable = ['is_default']
    readonly_fields = ['created_at', 'updated_at']
    raw_id_fields = ['user']
    
    fieldsets = (
        ('User', {
            'fields': ('user',)
        }),
        ('Address Information', {
            'fields': ('label', 'first_name', 'last_name', 'company', 
                      'address_line1', 'address_line2', 'city', 'state', 
                      'postal_code', 'country', 'phone')
        }),
        ('Status', {
            'fields': ('is_default',)
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )


@admin.register(PaymentMethod)
class PaymentMethodAdmin(admin.ModelAdmin):
    """
    Admin configuration for the PaymentMethod model.
    """
    list_display = ['user', 'payment_type', 'card_brand', 'card_last4', 'is_default', 'is_expired', 'created_at']
    list_filter = ['payment_type', 'is_default', 'card_brand', 'created_at']
    search_fields = ['user__username', 'user__email', 'card_last4', 'stripe_payment_method_id']
    readonly_fields = ['created_at', 'updated_at', 'is_expired']
    raw_id_fields = ['user']
    
    fieldsets = (
        ('User', {
            'fields': ('user',)
        }),
        ('Payment Method Details', {
            'fields': ('stripe_payment_method_id', 'payment_type')
        }),
        ('Card Information', {
            'fields': ('card_brand', 'card_last4', 'card_exp_month', 'card_exp_year'),
            'classes': ('collapse',)
        }),
        ('Bank Account Information', {
            'fields': ('bank_name', 'account_last4'),
            'classes': ('collapse',)
        }),
        ('Status', {
            'fields': ('is_default', 'is_expired')
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )