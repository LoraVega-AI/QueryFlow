#!/usr/bin/env python3
"""
Comprehensive Test Data Generator for QueryFlow Testing
This script generates realistic test data for both e-commerce and analytics databases
"""

import sqlite3
import random
import string
import hashlib
from datetime import datetime, timedelta
from decimal import Decimal
import json
import uuid

class TestDataGenerator:
    def __init__(self, ecommerce_db_path="databases/ecommerce.sqlite", analytics_db_path="databases/analytics.sqlite"):
        self.ecommerce_db_path = ecommerce_db_path
        self.analytics_db_path = analytics_db_path
        
        # Sample data pools
        self.first_names = [
            "James", "Mary", "John", "Patricia", "Robert", "Jennifer", "Michael", "Linda",
            "William", "Elizabeth", "David", "Barbara", "Richard", "Susan", "Joseph", "Jessica",
            "Thomas", "Sarah", "Christopher", "Karen", "Charles", "Nancy", "Daniel", "Lisa",
            "Matthew", "Betty", "Anthony", "Helen", "Mark", "Sandra", "Donald", "Donna",
            "Steven", "Carol", "Paul", "Ruth", "Andrew", "Sharon", "Joshua", "Michelle",
            "Kenneth", "Laura", "Kevin", "Sarah", "Brian", "Kimberly", "George", "Deborah"
        ]
        
        self.last_names = [
            "Smith", "Johnson", "Williams", "Brown", "Jones", "Garcia", "Miller", "Davis",
            "Rodriguez", "Martinez", "Hernandez", "Lopez", "Gonzalez", "Wilson", "Anderson", "Thomas",
            "Taylor", "Moore", "Jackson", "Martin", "Lee", "Perez", "Thompson", "White",
            "Harris", "Sanchez", "Clark", "Ramirez", "Lewis", "Robinson", "Walker", "Young",
            "Allen", "King", "Wright", "Scott", "Torres", "Nguyen", "Hill", "Flores",
            "Green", "Adams", "Nelson", "Baker", "Hall", "Rivera", "Campbell", "Mitchell"
        ]
        
        self.cities = [
            "New York", "Los Angeles", "Chicago", "Houston", "Phoenix", "Philadelphia", "San Antonio",
            "San Diego", "Dallas", "San Jose", "Austin", "Jacksonville", "Fort Worth", "Columbus",
            "Charlotte", "San Francisco", "Indianapolis", "Seattle", "Denver", "Washington", "Boston",
            "El Paso", "Nashville", "Detroit", "Oklahoma City", "Portland", "Las Vegas", "Memphis",
            "Louisville", "Baltimore", "Milwaukee", "Albuquerque", "Tucson", "Fresno", "Sacramento"
        ]
        
        self.states = [
            "NY", "CA", "IL", "TX", "AZ", "PA", "TX", "CA", "TX", "CA", "TX", "FL", "TX", "OH",
            "NC", "CA", "IN", "WA", "CO", "DC", "MA", "TX", "TN", "MI", "OK", "OR", "NV", "TN",
            "KY", "MD", "WI", "NM", "AZ", "CA", "CA"
        ]
        
        self.product_categories = [
            "Electronics", "Clothing", "Home & Garden", "Sports", "Books", "Health & Beauty",
            "Toys & Games", "Automotive", "Food & Beverage", "Office Supplies", "Jewelry",
            "Pet Supplies", "Baby & Kids", "Tools & Hardware", "Musical Instruments"
        ]
        
        self.brands = [
            "Apple", "Samsung", "Nike", "Adidas", "Sony", "Microsoft", "Google", "Amazon",
            "Tesla", "BMW", "Mercedes", "Toyota", "Honda", "Ford", "Chevrolet", "Dell",
            "HP", "Lenovo", "Canon", "Nikon", "Bose", "JBL", "Beats", "Ray-Ban", "Oakley"
        ]
        
        self.device_types = ["desktop", "mobile", "tablet", "other"]
        self.browsers = ["Chrome", "Firefox", "Safari", "Edge", "Opera", "Brave"]
        self.operating_systems = ["Windows", "macOS", "Linux", "iOS", "Android", "Chrome OS"]
        self.countries = ["USA", "Canada", "UK", "Germany", "France", "Japan", "Australia", "Brazil", "India", "China"]
        
        self.event_categories = [
            "page_view", "click", "purchase", "add_to_cart", "remove_from_cart", "search",
            "signup", "login", "logout", "email_click", "video_play", "download", "share"
        ]
        
        self.metric_types = ["counter", "gauge", "histogram", "summary"]
        self.metric_names = [
            "page_views", "unique_visitors", "bounce_rate", "session_duration", "conversion_rate",
            "revenue", "orders", "cart_abandonment", "search_queries", "error_rate"
        ]

    def generate_email(self, first_name, last_name, index):
        """Generate realistic email address"""
        domains = ["gmail.com", "yahoo.com", "hotmail.com", "outlook.com", "icloud.com", "aol.com"]
        domain = random.choice(domains)
        # Add index to ensure uniqueness
        return f"{first_name.lower()}.{last_name.lower()}{index}@{domain}"

    def generate_phone(self):
        """Generate realistic phone number"""
        return f"({random.randint(200, 999)}) {random.randint(200, 999)}-{random.randint(1000, 9999)}"

    def generate_address(self, city, state):
        """Generate realistic address"""
        street_numbers = [str(random.randint(1, 9999))]
        street_names = [
            "Main St", "Oak Ave", "First St", "Second St", "Park Ave", "Washington St",
            "Lincoln Ave", "Jefferson St", "Madison Ave", "Broadway", "Cedar St", "Pine St",
            "Elm St", "Maple Ave", "Spring St", "Summer St", "Winter St", "Fall St"
        ]
        return f"{random.choice(street_numbers)} {random.choice(street_names)}, {city}, {state}"

    def generate_password_hash(self, password="password123"):
        """Generate password hash"""
        return hashlib.sha256(password.encode()).hexdigest()

    def generate_sku(self, category, brand):
        """Generate realistic SKU"""
        category_code = category[:3].upper()
        brand_code = brand[:3].upper()
        number = random.randint(1000, 9999)
        return f"{category_code}-{brand_code}-{number}"

    def generate_product_name(self, category, brand):
        """Generate realistic product name"""
        product_types = {
            "Electronics": ["Smartphone", "Laptop", "Tablet", "Headphones", "Speaker", "Camera", "Monitor"],
            "Clothing": ["T-Shirt", "Jeans", "Dress", "Jacket", "Sweater", "Shorts", "Skirt"],
            "Home & Garden": ["Lamp", "Chair", "Table", "Plant Pot", "Garden Tool", "Decorative Item"],
            "Sports": ["Running Shoes", "Basketball", "Tennis Racket", "Yoga Mat", "Dumbbells"],
            "Books": ["Novel", "Textbook", "Biography", "Cookbook", "Children's Book"],
            "Health & Beauty": ["Shampoo", "Moisturizer", "Vitamins", "Toothbrush", "Makeup Kit"]
        }
        
        product_type = random.choice(product_types.get(category, ["Product"]))
        return f"{brand} {product_type} {random.randint(1, 10)}"

    def generate_review_text(self):
        """Generate realistic review text"""
        positive_reviews = [
            "Great product, highly recommend!",
            "Excellent quality and fast shipping.",
            "Perfect for my needs, will buy again.",
            "Amazing value for the price.",
            "Love it! Exactly as described.",
            "Outstanding customer service and product.",
            "Best purchase I've made in a while.",
            "Exceeded my expectations completely."
        ]
        
        negative_reviews = [
            "Not what I expected, poor quality.",
            "Shipping was slow and product arrived damaged.",
            "Overpriced for what you get.",
            "Would not recommend to others.",
            "Product broke after just a few uses.",
            "Customer service was unhelpful.",
            "Waste of money, very disappointed.",
            "Poor packaging, item arrived broken."
        ]
        
        neutral_reviews = [
            "It's okay, nothing special.",
            "Average product, does the job.",
            "Decent quality for the price.",
            "Works as expected, no complaints.",
            "Standard product, meets basic needs.",
            "Fair quality, could be better.",
            "Adequate for the price point.",
            "It works, but not exceptional."
        ]
        
        all_reviews = positive_reviews + negative_reviews + neutral_reviews
        return random.choice(all_reviews)

    def generate_analytics_properties(self):
        """Generate JSON properties for analytics events"""
        properties = {
            "page_type": random.choice(["home", "product", "category", "cart", "checkout", "search"]),
            "user_segment": random.choice(["new", "returning", "premium", "vip"]),
            "traffic_source": random.choice(["organic", "paid", "direct", "social", "email", "referral"]),
            "device_category": random.choice(self.device_types),
            "browser_version": f"{random.randint(80, 120)}.0.{random.randint(0, 9)}",
            "screen_resolution": random.choice(["1920x1080", "1366x768", "1440x900", "1536x864", "1280x720"]),
            "connection_type": random.choice(["wifi", "4g", "5g", "ethernet"]),
            "is_mobile": random.choice([True, False])
        }
        return json.dumps(properties)

    def create_ecommerce_database(self):
        """Create and populate e-commerce database"""
        print("Creating e-commerce database...")
        
        # Read and execute schema
        with open("databases/ecommerce.sql", "r") as f:
            schema_sql = f.read()
        
        conn = sqlite3.connect(self.ecommerce_db_path)
        cursor = conn.cursor()
        cursor.executescript(schema_sql)
        
        # Generate and insert data
        self.insert_users(cursor, 1000)
        self.insert_categories(cursor, 50)
        self.insert_products(cursor, 500)
        self.insert_orders(cursor, 2000)
        self.insert_order_items(cursor, 5000)
        self.insert_reviews(cursor, 1500)
        
        conn.commit()
        conn.close()
        print(f"E-commerce database created with {self.ecommerce_db_path}")

    def insert_users(self, cursor, count):
        """Insert users data"""
        print(f"Inserting {count} users...")
        
        for i in range(count):
            first_name = random.choice(self.first_names)
            last_name = random.choice(self.last_names)
            username = f"{first_name.lower()}{last_name.lower()}{i}"
            email = self.generate_email(first_name, last_name, i)
            city = random.choice(self.cities)
            state = random.choice(self.states)
            
            # Generate dates
            created_at = datetime.now() - timedelta(days=random.randint(1, 730))
            last_login = created_at + timedelta(days=random.randint(0, 30)) if random.random() > 0.3 else None
            
            cursor.execute("""
                INSERT INTO users (username, email, password_hash, first_name, last_name, phone, 
                                 address, city, state, zip_code, country, date_of_birth, 
                                 is_verified, is_premium, created_at, updated_at, last_login)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                username, email, self.generate_password_hash(), first_name, last_name,
                self.generate_phone(), self.generate_address(city, state), city, state,
                f"{random.randint(10000, 99999)}", random.choice(self.countries),
                f"{random.randint(1950, 2005)}-{random.randint(1, 12):02d}-{random.randint(1, 28):02d}",
                random.choice([0, 1]), random.choice([0, 1]), created_at, created_at, last_login
            ))

    def insert_categories(self, cursor, count):
        """Insert categories data"""
        print(f"Inserting {count} categories...")
        
        # Insert main categories
        for i, category_name in enumerate(self.product_categories):
            slug = category_name.lower().replace(" ", "-").replace("&", "and")
            cursor.execute("""
                INSERT INTO categories (name, description, parent_id, slug, is_active, sort_order, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            """, (
                category_name, f"Products in {category_name} category", None, slug, 1, i,
                datetime.now() - timedelta(days=random.randint(1, 365))
            ))
        
        # Insert subcategories
        main_categories = list(range(1, len(self.product_categories) + 1))
        for i in range(count - len(self.product_categories)):
            parent_id = random.choice(main_categories)
            subcategory_name = f"Subcategory {i + 1}"
            slug = f"subcategory-{i + 1}"
            cursor.execute("""
                INSERT INTO categories (name, description, parent_id, slug, is_active, sort_order, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            """, (
                subcategory_name, f"Subcategory of {self.product_categories[parent_id - 1]}", 
                parent_id, slug, 1, i, datetime.now() - timedelta(days=random.randint(1, 365))
            ))

    def insert_products(self, cursor, count):
        """Insert products data"""
        print(f"Inserting {count} products...")
        
        # Get category IDs
        cursor.execute("SELECT id FROM categories")
        category_ids = [row[0] for row in cursor.fetchall()]
        
        for i in range(count):
            category_id = random.choice(category_ids)
            brand = random.choice(self.brands)
            category_name = self.product_categories[random.randint(0, len(self.product_categories) - 1)]
            
            name = self.generate_product_name(category_name, brand)
            sku = self.generate_sku(category_name, brand)
            price = round(random.uniform(10, 1000), 2)
            cost = round(price * random.uniform(0.3, 0.7), 2)
            
            colors = ["Red", "Blue", "Green", "Black", "White", "Gray", "Yellow", "Purple"]
            sizes = ["XS", "S", "M", "L", "XL", "XXL", "Small", "Medium", "Large"]
            
            cursor.execute("""
                INSERT INTO products (name, description, sku, price, cost, category_id, brand, 
                                    weight, dimensions, color, size, stock_quantity, min_stock_level,
                                    is_active, is_featured, tags, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                name, f"High-quality {name} perfect for everyday use", sku, price, cost, category_id,
                brand, round(random.uniform(0.1, 50), 2), f"{random.randint(5, 50)}x{random.randint(5, 50)}x{random.randint(1, 20)}",
                random.choice(colors), random.choice(sizes), random.randint(0, 1000), random.randint(5, 50),
                random.choice([0, 1]), random.choice([0, 1]), f"{category_name},{brand},{random.choice(colors)}",
                datetime.now() - timedelta(days=random.randint(1, 365)), datetime.now() - timedelta(days=random.randint(1, 30))
            ))

    def insert_orders(self, cursor, count):
        """Insert orders data"""
        print(f"Inserting {count} orders...")
        
        # Get user IDs
        cursor.execute("SELECT id FROM users")
        user_ids = [row[0] for row in cursor.fetchall()]
        
        statuses = ["pending", "processing", "shipped", "delivered", "cancelled", "refunded"]
        payment_methods = ["credit_card", "debit_card", "paypal", "stripe", "apple_pay", "google_pay"]
        payment_statuses = ["pending", "paid", "failed", "refunded"]
        
        for i in range(count):
            user_id = random.choice(user_ids)
            order_number = f"ORD-{uuid.uuid4().hex[:8].upper()}"
            status = random.choice(statuses)
            subtotal = round(random.uniform(20, 2000), 2)
            tax_amount = round(subtotal * random.uniform(0.05, 0.12), 2)
            shipping_amount = round(random.uniform(0, 50), 2)
            discount_amount = round(subtotal * random.uniform(0, 0.2), 2)
            total_amount = subtotal + tax_amount + shipping_amount - discount_amount
            
            created_at = datetime.now() - timedelta(days=random.randint(1, 365))
            shipped_at = created_at + timedelta(days=random.randint(1, 7)) if status in ["shipped", "delivered"] else None
            delivered_at = shipped_at + timedelta(days=random.randint(1, 5)) if status == "delivered" else None
            
            cursor.execute("""
                INSERT INTO orders (user_id, order_number, status, subtotal, tax_amount, shipping_amount,
                                  discount_amount, total_amount, payment_method, payment_status, 
                                  shipping_address, billing_address, notes, created_at, updated_at,
                                  shipped_at, delivered_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                user_id, order_number, status, subtotal, tax_amount, shipping_amount, discount_amount,
                total_amount, random.choice(payment_methods), random.choice(payment_statuses),
                f"Shipping address for order {order_number}", f"Billing address for order {order_number}",
                f"Order notes for {order_number}" if random.random() > 0.7 else None,
                created_at, created_at, shipped_at, delivered_at
            ))

    def insert_order_items(self, cursor, count):
        """Insert order items data"""
        print(f"Inserting {count} order items...")
        
        # Get order and product IDs
        cursor.execute("SELECT id FROM orders")
        order_ids = [row[0] for row in cursor.fetchall()]
        cursor.execute("SELECT id, price FROM products")
        products = cursor.fetchall()
        
        for i in range(count):
            order_id = random.choice(order_ids)
            product_id, product_price = random.choice(products)
            quantity = random.randint(1, 10)
            unit_price = product_price
            total_price = unit_price * quantity
            
            cursor.execute("""
                INSERT INTO order_items (order_id, product_id, quantity, unit_price, total_price, created_at)
                VALUES (?, ?, ?, ?, ?, ?)
            """, (
                order_id, product_id, quantity, unit_price, total_price,
                datetime.now() - timedelta(days=random.randint(1, 365))
            ))

    def insert_reviews(self, cursor, count):
        """Insert reviews data"""
        print(f"Inserting {count} reviews...")
        
        # Get user and product IDs
        cursor.execute("SELECT id FROM users")
        user_ids = [row[0] for row in cursor.fetchall()]
        cursor.execute("SELECT id FROM products")
        product_ids = [row[0] for row in cursor.fetchall()]
        
        for i in range(count):
            product_id = random.choice(product_ids)
            user_id = random.choice(user_ids)
            rating = random.randint(1, 5)
            title = f"Review for product {product_id}"
            comment = self.generate_review_text()
            
            cursor.execute("""
                INSERT INTO reviews (product_id, user_id, rating, title, comment, 
                                   is_verified_purchase, is_approved, helpful_votes, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                product_id, user_id, rating, title, comment, random.choice([0, 1]),
                random.choice([0, 1]), random.randint(0, 50),
                datetime.now() - timedelta(days=random.randint(1, 365))
            ))

    def create_analytics_database(self):
        """Create and populate analytics database"""
        print("Creating analytics database...")
        
        # Read and execute schema
        with open("databases/analytics.sql", "r") as f:
            schema_sql = f.read()
        
        conn = sqlite3.connect(self.analytics_db_path)
        cursor = conn.cursor()
        cursor.executescript(schema_sql)
        
        # Generate and insert data
        self.insert_page_views(cursor, 10000)
        self.insert_events(cursor, 5000)
        self.insert_metrics(cursor, 1000)
        self.insert_user_sessions(cursor, 2000)
        self.insert_conversion_funnels(cursor, 500)
        self.insert_ab_tests(cursor, 300)
        
        conn.commit()
        conn.close()
        print(f"Analytics database created with {self.analytics_db_path}")

    def insert_page_views(self, cursor, count):
        """Insert page views data"""
        print(f"Inserting {count} page views...")
        
        # Generate user IDs (simulate users from e-commerce database)
        user_ids = list(range(1, 1001))  # Assume 1000 users from e-commerce database
        
        page_urls = [
            "/", "/products", "/products/electronics", "/products/clothing", "/cart", "/checkout",
            "/search", "/about", "/contact", "/login", "/register", "/profile", "/orders"
        ]
        
        for i in range(count):
            session_id = f"session_{uuid.uuid4().hex[:16]}"
            user_id = random.choice(user_ids) if random.random() > 0.3 else None
            page_url = random.choice(page_urls)
            page_title = f"Page {random.randint(1, 100)}"
            
            cursor.execute("""
                INSERT INTO page_views (session_id, user_id, page_url, page_title, referrer,
                                      user_agent, ip_address, country, city, device_type,
                                      browser, os, timestamp, duration_seconds)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                session_id, user_id, page_url, page_title, random.choice(["google.com", "facebook.com", "twitter.com", None]),
                f"Mozilla/5.0 ({random.choice(['Windows', 'Macintosh', 'Linux'])}; {random.choice(['en-US', 'en-GB', 'es-ES'])}",
                f"{random.randint(1, 255)}.{random.randint(1, 255)}.{random.randint(1, 255)}.{random.randint(1, 255)}",
                random.choice(self.countries), random.choice(self.cities), random.choice(self.device_types),
                random.choice(self.browsers), random.choice(self.operating_systems),
                datetime.now() - timedelta(days=random.randint(1, 90), hours=random.randint(0, 23)),
                random.randint(5, 300)
            ))

    def insert_events(self, cursor, count):
        """Insert events data"""
        print(f"Inserting {count} events...")
        
        # Generate user IDs (simulate users from e-commerce database)
        user_ids = list(range(1, 1001))  # Assume 1000 users from e-commerce database
        
        for i in range(count):
            event_name = random.choice(self.event_categories)
            event_category = random.choice(self.event_categories)
            event_value = round(random.uniform(0, 1000), 2)
            user_id = random.choice(user_ids) if random.random() > 0.4 else None
            session_id = f"session_{uuid.uuid4().hex[:16]}"
            properties = self.generate_analytics_properties()
            
            cursor.execute("""
                INSERT INTO events (event_name, event_category, event_value, user_id, session_id,
                                  properties, timestamp)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            """, (
                event_name, event_category, event_value, user_id, session_id, properties,
                datetime.now() - timedelta(days=random.randint(1, 90), hours=random.randint(0, 23))
            ))

    def insert_metrics(self, cursor, count):
        """Insert metrics data"""
        print(f"Inserting {count} metrics...")
        
        for i in range(count):
            metric_name = random.choice(self.metric_names)
            metric_value = round(random.uniform(0, 10000), 4)
            metric_type = random.choice(self.metric_types)
            dimensions = json.dumps({
                "device_type": random.choice(self.device_types),
                "country": random.choice(self.countries),
                "browser": random.choice(self.browsers)
            })
            date = datetime.now() - timedelta(days=random.randint(1, 365))
            hour = random.randint(0, 23)
            
            cursor.execute("""
                INSERT INTO metrics (metric_name, metric_value, metric_type, dimensions, date, hour, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            """, (
                metric_name, metric_value, metric_type, dimensions, date.date(), hour,
                datetime.now() - timedelta(days=random.randint(1, 365))
            ))

    def insert_user_sessions(self, cursor, count):
        """Insert user sessions data"""
        print(f"Inserting {count} user sessions...")
        
        # Generate user IDs (simulate users from e-commerce database)
        user_ids = list(range(1, 1001))  # Assume 1000 users from e-commerce database
        
        for i in range(count):
            session_id = f"session_{uuid.uuid4().hex[:16]}"
            user_id = random.choice(user_ids) if random.random() > 0.3 else None
            start_time = datetime.now() - timedelta(days=random.randint(1, 90), hours=random.randint(0, 23))
            end_time = start_time + timedelta(minutes=random.randint(5, 120))
            duration_seconds = int((end_time - start_time).total_seconds())
            
            cursor.execute("""
                INSERT INTO user_sessions (session_id, user_id, start_time, end_time, duration_seconds,
                                         page_count, event_count, country, device_type, browser, os,
                                         is_bounce, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                session_id, user_id, start_time, end_time, duration_seconds,
                random.randint(1, 20), random.randint(0, 50), random.choice(self.countries),
                random.choice(self.device_types), random.choice(self.browsers),
                random.choice(self.operating_systems), random.choice([0, 1]),
                datetime.now() - timedelta(days=random.randint(1, 90))
            ))

    def insert_conversion_funnels(self, cursor, count):
        """Insert conversion funnels data"""
        print(f"Inserting {count} conversion funnels...")
        
        # Generate user IDs (simulate users from e-commerce database)
        user_ids = list(range(1, 1001))  # Assume 1000 users from e-commerce database
        
        funnel_names = ["purchase", "signup", "newsletter", "download", "contact"]
        step_names = ["view", "interest", "consideration", "intent", "purchase"]
        
        for i in range(count):
            funnel_name = random.choice(funnel_names)
            step_name = random.choice(step_names)
            step_order = random.randint(1, 5)
            user_id = random.choice(user_ids) if random.random() > 0.4 else None
            session_id = f"session_{uuid.uuid4().hex[:16]}"
            converted = random.choice([0, 1])
            conversion_value = round(random.uniform(0, 500), 2) if converted else 0
            
            cursor.execute("""
                INSERT INTO conversion_funnels (funnel_name, step_name, step_order, user_id, session_id,
                                              converted, conversion_value, timestamp)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                funnel_name, step_name, step_order, user_id, session_id, converted, conversion_value,
                datetime.now() - timedelta(days=random.randint(1, 90))
            ))

    def insert_ab_tests(self, cursor, count):
        """Insert A/B tests data"""
        print(f"Inserting {count} A/B tests...")
        
        # Generate user IDs (simulate users from e-commerce database)
        user_ids = list(range(1, 1001))  # Assume 1000 users from e-commerce database
        
        test_names = ["homepage_design", "checkout_flow", "email_subject", "button_color", "pricing_display"]
        variant_names = ["control", "variant_a", "variant_b", "variant_c"]
        
        for i in range(count):
            test_name = random.choice(test_names)
            variant_name = random.choice(variant_names)
            user_id = random.choice(user_ids) if random.random() > 0.4 else None
            session_id = f"session_{uuid.uuid4().hex[:16]}"
            is_control = 1 if variant_name == "control" else 0
            conversion_rate = round(random.uniform(0, 1), 4)
            revenue = round(random.uniform(0, 1000), 2)
            
            cursor.execute("""
                INSERT INTO ab_tests (test_name, variant_name, user_id, session_id, is_control,
                                    conversion_rate, revenue, timestamp)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                test_name, variant_name, user_id, session_id, is_control, conversion_rate, revenue,
                datetime.now() - timedelta(days=random.randint(1, 90))
            ))

    def run(self):
        """Run the complete data generation process"""
        print("Starting QueryFlow Test Data Generation...")
        print("=" * 50)
        
        self.create_ecommerce_database()
        print()
        self.create_analytics_database()
        
        print("=" * 50)
        print("Test data generation completed successfully!")
        print(f"E-commerce database: {self.ecommerce_db_path}")
        print(f"Analytics database: {self.analytics_db_path}")

if __name__ == "__main__":
    generator = TestDataGenerator()
    generator.run()
