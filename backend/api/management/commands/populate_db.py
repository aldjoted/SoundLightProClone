import random
import uuid
from datetime import timedelta
from decimal import Decimal

from django.core.management.base import BaseCommand
from django.core.management import call_command
from django.contrib.auth.models import User
from django.utils import timezone
from api.models import (
    Category, Brand, Product, Order, OrderItem, 
    ProductReview, ShippingAddress, PaymentMethod, UserProfile
)

class Command(BaseCommand):
    help = 'Populate database with test data for development'

    def add_arguments(self, parser):
        parser.add_argument(
            '--clear',
            action='store_true',
            help='Clear existing data before populating',
        )
        parser.add_argument(
            '--no-input',
            action='store_true',
            help='Do not prompt for confirmation',
        )

    def handle(self, *args, **options):
        if options['clear']:
            if not options['no_input']:
                confirm = input("⚠️  This will DELETE ALL DATA. Are you sure? [y/N]: ")
                if confirm.lower() != 'y':
                    self.stdout.write(self.style.WARNING("Aborted."))
                    return
            self.clear_data()

        self.stdout.write(self.style.SUCCESS("🚀 Starting database population..."))

        # 1. Users
        self.create_users()

        # 2. Categories (using existing command)
        self.stdout.write("📦 Populating categories...")
        call_command('populate_categories')

        # 3. Brands
        self.create_brands()

        # 4. Products
        self.create_products()

        # 5. User Data (Addresses, Payment Methods)
        self.create_user_data()

        # 6. Orders
        self.create_orders()

        # 7. Reviews
        self.create_reviews()

        self.stdout.write(self.style.SUCCESS("\n✨ Database population completed successfully!"))
        self.stdout.write(self.style.SUCCESS("   Admin: admin / admin"))
        self.stdout.write(self.style.SUCCESS("   User:  testuser / password"))

    def clear_data(self):
        self.stdout.write(self.style.WARNING("🗑️  Clearing existing data..."))
        OrderItem.objects.all().delete()
        Order.objects.all().delete()
        ProductReview.objects.all().delete()
        Product.objects.all().delete()
        Brand.objects.all().delete()
        Category.objects.all().delete()
        ShippingAddress.objects.all().delete()
        PaymentMethod.objects.all().delete()
        User.objects.exclude(is_superuser=True).delete()
        # We keep superusers to avoid locking ourselves out, or we can recreate them.
        # Let's just delete non-superusers for safety, but if we want a full reset:
        # User.objects.all().delete() 
        # For this script, let's keep it safe and only delete non-superusers unless we explicitly want to recreate admin.
        # Actually, let's just ensure we have our specific users.

    def create_users(self):
        self.stdout.write("👤 Creating users...")
        
        # Admin
        if not User.objects.filter(username='admin').exists():
            User.objects.create_superuser('admin', 'admin@example.com', 'admin')
            self.stdout.write(self.style.SUCCESS("   Created superuser: admin"))
        
        # Test User
        user, created = User.objects.get_or_create(username='testuser', defaults={
            'email': 'testuser@example.com',
            'first_name': 'John',
            'last_name': 'Doe'
        })
        if created:
            user.set_password('password')
            user.save()
            self.stdout.write(self.style.SUCCESS("   Created test user: testuser"))
        
        self.test_user = user

    def create_brands(self):
        self.stdout.write("🏷️  Creating brands...")
        brands = [
            "SoundKing", "LightMaster", "AudioPro", "Lumina", "BeatBox", 
            "StageCraft", "EchoSystems", "VibeTech"
        ]
        for name in brands:
            Brand.objects.get_or_create(
                name=name,
                defaults={
                    'slug': name.lower(),
                    'description': f"High quality products from {name}."
                }
            )

    def create_products(self):
        self.stdout.write("🎸 Creating products...")
        
        categories = Category.objects.all()
        brands = Brand.objects.all()
        
        if not categories.exists():
            self.stdout.write(self.style.ERROR("   ❌ No categories found! Run populate_categories first."))
            return

        # Sample product data
        product_templates = [
            ("Professional DJ Mixer", 599.99, "Audio"),
            ("Stage Spotlight LED", 129.99, "Lighting"),
            ("Wireless Microphone System", 249.50, "Audio"),
            ("Studio Monitor Speakers", 399.00, "Audio"),
            ("DMX Lighting Controller", 199.99, "Lighting"),
            ("Subwoofer 18-inch", 799.00, "Audio"),
            ("Fog Machine 1500W", 149.99, "Effects"),
            ("Laser Show System", 450.00, "Lighting"),
            ("Digital Audio Interface", 180.00, "Studio"),
            ("XLR Cables Pack", 29.99, "Accessories"),
            ("Speaker Stand Set", 89.99, "Accessories"),
            ("Headphones Pro", 129.00, "Audio"),
        ]

        count = 0
        for i in range(25): # Create 25 products
            template = random.choice(product_templates)
            name_base, price_base, cat_hint = template
            
            # Find a suitable category
            category = None
            for cat in categories:
                if cat_hint.lower() in cat.name.lower():
                    category = cat
                    break
            if not category:
                category = random.choice(categories)

            brand = random.choice(brands)
            
            name = f"{brand.name} {name_base} {random.randint(100, 900)}"
            price = Decimal(price_base) * Decimal(random.uniform(0.8, 1.2))
            
            Product.objects.create(
                category=category,
                brand=brand,
                name=name,
                description=f"This is a fantastic {name}. Perfect for your setup. Features high durability and excellent performance.",
                price=price.quantize(Decimal("0.01")),
                stock=random.randint(0, 50),
                available=True
            )
            count += 1
            
        self.stdout.write(self.style.SUCCESS(f"   Created {count} products"))

    def create_user_data(self):
        self.stdout.write("🏠 Creating user data (addresses, payment methods)...")
        
        # Address
        ShippingAddress.objects.get_or_create(
            user=self.test_user,
            label="Home",
            defaults={
                'first_name': 'John',
                'last_name': 'Doe',
                'address_line1': '123 Music Lane',
                'city': 'Sound City',
                'postal_code': '12345',
                'country': 'Cameroon',
                'phone': '+237 600000000',
                'is_default': True
            }
        )

        # Payment Method
        PaymentMethod.objects.get_or_create(
            user=self.test_user,
            stripe_payment_method_id=f"pm_{uuid.uuid4()}",
            defaults={
                'payment_type': 'card',
                'card_brand': 'Visa',
                'card_last4': '4242',
                'card_exp_month': 12,
                'card_exp_year': 2030,
                'is_default': True
            }
        )

    def create_orders(self):
        self.stdout.write("📦 Creating orders...")
        
        products = list(Product.objects.filter(available=True))
        if not products:
            return

        statuses = ['pending', 'processing', 'shipped', 'delivered', 'cancelled']
        
        for i in range(5):
            status = statuses[i % len(statuses)]
            order = Order.objects.create(
                user=self.test_user,
                first_name=self.test_user.first_name,
                last_name=self.test_user.last_name,
                email=self.test_user.email,
                address="123 Music Lane",
                postal_code="12345",
                city="Sound City",
                status=status,
                paid=True if status != 'pending_payment' else False,
                total_paid=Decimal('0.00'),
                stripe_id=f"pi_{uuid.uuid4()}" if status != 'pending_payment' else ''
            )
            
            # Add items
            total = Decimal('0.00')
            num_items = random.randint(1, 4)
            order_products = random.sample(products, min(len(products), num_items))
            
            for product in order_products:
                qty = random.randint(1, 2)
                OrderItem.objects.create(
                    order=order,
                    product=product,
                    price=product.price,
                    quantity=qty
                )
                total += product.price * qty
            
            order.total_paid = total
            order.save()

    def create_reviews(self):
        self.stdout.write("⭐ Creating reviews...")
        
        products = list(Product.objects.all())
        if not products:
            return

        comments = [
            "Great product! Highly recommended.",
            "Good value for money.",
            "Average quality, but works.",
            "Amazing sound quality!",
            "Fast shipping and good packaging."
        ]
        
        # Select up to 10 unique products to review
        num_reviews = min(len(products), 10)
        products_to_review = random.sample(products, num_reviews)
        
        for product in products_to_review:
            ProductReview.objects.get_or_create(
                product=product,
                user=self.test_user,
                defaults={
                    'rating': random.randint(3, 5),
                    'title': random.choice(["Great", "Good", "Okay", "Excellent"]),
                    'comment': random.choice(comments),
                    'is_verified_purchase': True,
                    'is_approved': True
                }
            )
