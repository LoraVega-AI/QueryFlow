from django.core.management.base import BaseCommand
from django.contrib.auth.models import User
from ecommerce.models import (
    Category, Product, UserProfile, Order, OrderItem, 
    Review, Cart, CartItem
)
from decimal import Decimal
import random
from datetime import datetime, timedelta


class Command(BaseCommand):
    help = 'Populate the database with sample e-commerce data'

    def add_arguments(self, parser):
        parser.add_argument(
            '--users',
            type=int,
            default=10,
            help='Number of users to create'
        )
        parser.add_argument(
            '--products',
            type=int,
            default=50,
            help='Number of products to create'
        )

    def handle(self, *args, **options):
        self.stdout.write('Creating sample data...')
        
        # Create categories
        self.create_categories()
        
        # Create users and profiles
        self.create_users_and_profiles(options['users'])
        
        # Create products
        self.create_products(options['products'])
        
        # Create orders and order items
        self.create_orders()
        
        # Create reviews
        self.create_reviews()
        
        # Create carts and cart items
        self.create_carts()
        
        self.stdout.write(
            self.style.SUCCESS('Successfully created sample data!')
        )

    def create_categories(self):
        """Create product categories"""
        categories_data = [
            {'name': 'Electronics', 'description': 'Electronic devices and gadgets'},
            {'name': 'Clothing', 'description': 'Fashion and apparel'},
            {'name': 'Books', 'description': 'Books and educational materials'},
            {'name': 'Home & Garden', 'description': 'Home improvement and gardening'},
            {'name': 'Sports', 'description': 'Sports and fitness equipment'},
            {'name': 'Toys', 'description': 'Toys and games for all ages'},
            {'name': 'Beauty', 'description': 'Beauty and personal care products'},
            {'name': 'Automotive', 'description': 'Car parts and accessories'},
        ]
        
        for cat_data in categories_data:
            category, created = Category.objects.get_or_create(
                name=cat_data['name'],
                defaults={
                    'description': cat_data['description'],
                    'slug': cat_data['name'].lower().replace(' ', '-'),
                }
            )
            if created:
                self.stdout.write(f'Created category: {category.name}')

    def create_users_and_profiles(self, num_users):
        """Create users and their profiles"""
        for i in range(num_users):
            username = f'user{i+1}'
            email = f'user{i+1}@example.com'
            
            user, created = User.objects.get_or_create(
                username=username,
                defaults={
                    'email': email,
                    'first_name': f'User{i+1}',
                    'last_name': 'Test',
                }
            )
            
            if created:
                user.set_password('password123')
                user.save()
                
                # Create user profile
                profile, _ = UserProfile.objects.get_or_create(
                    user=user,
                    defaults={
                        'phone_number': f'+123456789{i:02d}',
                        'address': f'{100 + i} Main Street',
                        'city': 'Test City',
                        'country': 'Test Country',
                        'postal_code': f'1234{i:02d}',
                        'date_of_birth': f'1990-{i%12+1:02d}-{i%28+1:02d}',
                    }
                )
                
                # Add some preferred categories
                categories = list(Category.objects.all())
                if categories:
                    profile.preferred_categories.set(
                        random.sample(categories, random.randint(1, 3))
                    )
                
                self.stdout.write(f'Created user: {username}')

    def create_products(self, num_products):
        """Create products"""
        categories = list(Category.objects.all())
        if not categories:
            return
            
        product_names = [
            'Wireless Headphones', 'Smartphone Case', 'Laptop Stand', 'Bluetooth Speaker',
            'Cotton T-Shirt', 'Denim Jeans', 'Running Shoes', 'Winter Jacket',
            'Python Programming Book', 'Data Science Guide', 'Fiction Novel', 'Cookbook',
            'Garden Hose', 'Plant Pot', 'LED Light Bulb', 'Tool Set',
            'Yoga Mat', 'Dumbbells', 'Tennis Racket', 'Basketball',
            'Action Figure', 'Board Game', 'Puzzle', 'Building Blocks',
            'Face Cream', 'Shampoo', 'Perfume', 'Makeup Kit',
            'Car Phone Mount', 'Air Freshener', 'Floor Mats', 'Steering Wheel Cover'
        ]
        
        for i in range(num_products):
            name = random.choice(product_names) + f' {i+1}'
            category = random.choice(categories)
            
            product, created = Product.objects.get_or_create(
                sku=f'SKU{i+1:04d}',
                defaults={
                    'name': name,
                    'description': f'High-quality {name.lower()} with excellent features.',
                    'price': Decimal(str(round(random.uniform(10.00, 500.00), 2))),
                    'stock_quantity': random.randint(0, 100),
                    'category': category,
                    'is_active': random.choice([True, True, True, False]),  # 75% active
                }
            )
            
            if created:
                # Add related categories
                related_cats = random.sample(categories, random.randint(0, 2))
                product.related_categories.set(related_cats)
                
                self.stdout.write(f'Created product: {product.name}')

    def create_orders(self):
        """Create orders and order items"""
        users = list(User.objects.all())
        products = list(Product.objects.filter(is_active=True))
        
        if not users or not products:
            return
            
        for i in range(20):  # Create 20 orders
            user = random.choice(users)
            order_date = datetime.now() - timedelta(days=random.randint(1, 90))
            
            order = Order.objects.create(
                user=user,
                status=random.choice(['pending', 'processing', 'shipped', 'delivered']),
                total_amount=Decimal('0.00'),
                shipping_address=f'{user.profile.address}, {user.profile.city}',
                billing_address=f'{user.profile.address}, {user.profile.city}',
                notes=f'Order notes for order {i+1}',
                created_at=order_date,
            )
            
            # Create order items
            num_items = random.randint(1, 5)
            selected_products = random.sample(products, min(num_items, len(products)))
            total_amount = Decimal('0.00')
            
            for product in selected_products:
                quantity = random.randint(1, 3)
                unit_price = product.price
                total_price = unit_price * quantity
                total_amount += total_price
                
                OrderItem.objects.create(
                    order=order,
                    product=product,
                    quantity=quantity,
                    unit_price=unit_price,
                    total_price=total_price,
                )
            
            # Update order total
            order.total_amount = total_amount
            order.save()
            
            self.stdout.write(f'Created order: {order.order_number}')

    def create_reviews(self):
        """Create product reviews"""
        users = list(User.objects.all())
        products = list(Product.objects.filter(is_active=True))
        
        if not users or not products:
            return
            
        for i in range(50):  # Create 50 reviews
            user = random.choice(users)
            product = random.choice(products)
            
            # Check if user already reviewed this product
            if Review.objects.filter(user=user, product=product).exists():
                continue
                
            review = Review.objects.create(
                user=user,
                product=product,
                rating=random.randint(1, 5),
                title=f'Review for {product.name}',
                comment=f'This is a detailed review of {product.name}. '
                       f'It has excellent quality and I would recommend it.',
                is_verified_purchase=random.choice([True, False]),
                created_at=datetime.now() - timedelta(days=random.randint(1, 30)),
            )
            
            self.stdout.write(f'Created review: {review.title}')

    def create_carts(self):
        """Create shopping carts and cart items"""
        users = list(User.objects.all())
        products = list(Product.objects.filter(is_active=True))
        
        if not users or not products:
            return
            
        for user in users:
            # Create cart for user
            cart, created = Cart.objects.get_or_create(user=user)
            
            if created:
                # Add some items to cart
                num_items = random.randint(0, 5)
                selected_products = random.sample(products, min(num_items, len(products)))
                
                for product in selected_products:
                    CartItem.objects.create(
                        cart=cart,
                        product=product,
                        quantity=random.randint(1, 3),
                    )
                
                self.stdout.write(f'Created cart for user: {user.username}')
