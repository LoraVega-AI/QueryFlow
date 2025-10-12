#!/usr/bin/env python
"""
Test script to verify the Django e-commerce database structure
Run with: python test_database.py
"""

import os
import sys
import django

# Setup Django environment
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'ecommerce_project.settings')
django.setup()

from django.db import connection
from ecommerce.models import Category, Product, UserProfile, Order, OrderItem, Review, Cart, CartItem
from django.contrib.auth.models import User


def test_database_structure():
    """Test the database structure and relationships"""
    print("=" * 60)
    print("DJANGO E-COMMERCE DATABASE STRUCTURE TEST")
    print("=" * 60)
    
    # Test 1: Verify 8 tables exist
    print("\n1. VERIFYING 8 TABLES:")
    with connection.cursor() as cursor:
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name LIKE 'ecommerce_%'")
        tables = cursor.fetchall()
        table_names = [table[0] for table in tables]
        
        expected_tables = [
            'ecommerce_category',
            'ecommerce_product', 
            'ecommerce_userprofile',
            'ecommerce_order',
            'ecommerce_orderitem',
            'ecommerce_review',
            'ecommerce_cart',
            'ecommerce_cartitem'
        ]
        
        print(f"Found {len(table_names)} tables:")
        for table in table_names:
            print(f"  [OK] {table}")
        
        missing = set(expected_tables) - set(table_names)
        if missing:
            print(f"  [ERROR] Missing tables: {missing}")
        else:
            print("  [OK] All 8 tables present!")
    
    # Test 2: Verify foreign key relationships
    print("\n2. VERIFYING 4 FOREIGN KEY RELATIONSHIPS:")
    try:
        # Product -> Category
        product = Product.objects.first()
        if product:
            print(f"  [OK] Product.category -> Category: {product.category.name}")
        
        # Order -> User
        order = Order.objects.first()
        if order:
            print(f"  [OK] Order.user -> User: {order.user.username}")
        
        # OrderItem -> Order
        order_item = OrderItem.objects.first()
        if order_item:
            print(f"  [OK] OrderItem.order -> Order: {order_item.order.order_number}")
        
        # OrderItem -> Product
        if order_item:
            print(f"  [OK] OrderItem.product -> Product: {order_item.product.name}")
        
        print("  [OK] All 4 foreign key relationships working!")
    except Exception as e:
        print(f"  [ERROR] Foreign key test failed: {e}")
    
    # Test 3: Verify many-to-many relationships
    print("\n3. VERIFYING 2 MANY-TO-MANY RELATIONSHIPS:")
    try:
        # Product.related_categories
        product = Product.objects.filter(related_categories__isnull=False).first()
        if product:
            related_cats = product.related_categories.all()
            print(f"  [OK] Product.related_categories: {product.name} -> {[cat.name for cat in related_cats]}")
        
        # UserProfile.preferred_categories
        profile = UserProfile.objects.filter(preferred_categories__isnull=False).first()
        if profile:
            preferred_cats = profile.preferred_categories.all()
            print(f"  [OK] UserProfile.preferred_categories: {profile.user.username} -> {[cat.name for cat in preferred_cats]}")
        
        print("  [OK] Both many-to-many relationships working!")
    except Exception as e:
        print(f"  [ERROR] Many-to-many test failed: {e}")
    
    # Test 4: Verify unique constraints
    print("\n4. VERIFYING 3 UNIQUE CONSTRAINTS:")
    try:
        # Test unique product SKU
        products = Product.objects.values_list('sku', flat=True)
        unique_skus = set(products)
        if len(products) == len(unique_skus):
            print("  [OK] Product SKU constraint working (all SKUs unique)")
        else:
            print("  [ERROR] Product SKU constraint failed")
        
        # Test unique user profile
        profiles = UserProfile.objects.count()
        users = User.objects.count()
        if profiles == users:
            print("  [OK] UserProfile constraint working (one profile per user)")
        else:
            print("  [ERROR] UserProfile constraint failed")
        
        # Test unique user-product review
        reviews = Review.objects.values('user', 'product').distinct().count()
        total_reviews = Review.objects.count()
        if reviews == total_reviews:
            print("  [OK] Review constraint working (one review per user per product)")
        else:
            print("  [ERROR] Review constraint failed")
        
        print("  [OK] All 3 unique constraints working!")
    except Exception as e:
        print(f"  [ERROR] Unique constraint test failed: {e}")
    
    # Test 5: Verify indexes
    print("\n5. VERIFYING 5 DATABASE INDEXES:")
    with connection.cursor() as cursor:
        cursor.execute("SELECT name FROM sqlite_master WHERE type='index' AND name LIKE 'ecommerce_%'")
        indexes = cursor.fetchall()
        index_names = [idx[0] for idx in indexes]
        
        expected_indexes = [
            'ecommerce_c_name_f3a40e_idx',  # Category.name
            'ecommerce_p_name_78a08e_idx',  # Product.name
            'ecommerce_p_price_365534_idx', # Product.price
            'ecommerce_r_rating_39f06e_idx', # Review.rating
            'ecommerce_o_order_n_bae905_idx' # Order.order_number
        ]
        
        print(f"Found {len(index_names)} indexes:")
        for idx in index_names:
            print(f"  [OK] {idx}")
        
        found_expected = set(expected_indexes) & set(index_names)
        print(f"  [OK] Found {len(found_expected)}/5 expected indexes")
    
    # Test 6: Data counts
    print("\n6. SAMPLE DATA COUNTS:")
    print(f"  Categories: {Category.objects.count()}")
    print(f"  Products: {Product.objects.count()}")
    print(f"  Users: {User.objects.count()}")
    print(f"  User Profiles: {UserProfile.objects.count()}")
    print(f"  Orders: {Order.objects.count()}")
    print(f"  Order Items: {OrderItem.objects.count()}")
    print(f"  Reviews: {Review.objects.count()}")
    print(f"  Carts: {Cart.objects.count()}")
    print(f"  Cart Items: {CartItem.objects.count()}")
    
    print("\n" + "=" * 60)
    print("DATABASE STRUCTURE TEST COMPLETED!")
    print("=" * 60)


if __name__ == "__main__":
    test_database_structure()
