#!/usr/bin/env python3
"""
QueryFlow Test Runner
This script runs comprehensive tests on the generated databases to validate QueryFlow functionality
"""

import sqlite3
import json
import time
from datetime import datetime
import os

class QueryFlowTestRunner:
    def __init__(self, ecommerce_db="databases/ecommerce.sqlite", analytics_db="databases/analytics.sqlite"):
        self.ecommerce_db = ecommerce_db
        self.analytics_db = analytics_db
        self.test_results = []
        
    def run_test(self, test_name, test_function):
        """Run a single test and record results"""
        print(f"Running test: {test_name}")
        start_time = time.time()
        
        try:
            result = test_function()
            end_time = time.time()
            duration = end_time - start_time
            
            self.test_results.append({
                "test_name": test_name,
                "status": "PASSED",
                "duration": duration,
                "result": result
            })
            print(f"[PASS] {test_name} - PASSED ({duration:.2f}s)")
            return True
            
        except Exception as e:
            end_time = time.time()
            duration = end_time - start_time
            
            self.test_results.append({
                "test_name": test_name,
                "status": "FAILED",
                "duration": duration,
                "error": str(e)
            })
            print(f"[FAIL] {test_name} - FAILED ({duration:.2f}s): {e}")
            return False

    def test_database_creation(self):
        """Test that databases were created successfully"""
        if not os.path.exists(self.ecommerce_db):
            raise Exception(f"E-commerce database not found: {self.ecommerce_db}")
        if not os.path.exists(self.analytics_db):
            raise Exception(f"Analytics database not found: {self.analytics_db}")
        return "Both databases exist"

    def test_ecommerce_tables(self):
        """Test e-commerce database tables and structure"""
        conn = sqlite3.connect(self.ecommerce_db)
        cursor = conn.cursor()
        
        # Get all tables
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name")
        tables = [row[0] for row in cursor.fetchall()]
        
        expected_tables = ['users', 'categories', 'products', 'orders', 'order_items', 'reviews']
        missing_tables = set(expected_tables) - set(tables)
        
        if missing_tables:
            raise Exception(f"Missing tables: {missing_tables}")
        
        # Test table structures
        for table in expected_tables:
            cursor.execute(f"PRAGMA table_info({table})")
            columns = cursor.fetchall()
            if len(columns) == 0:
                raise Exception(f"Table {table} has no columns")
        
        conn.close()
        return f"All {len(tables)} tables exist with proper structure"

    def test_analytics_tables(self):
        """Test analytics database tables and structure"""
        conn = sqlite3.connect(self.analytics_db)
        cursor = conn.cursor()
        
        # Get all tables
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name")
        tables = [row[0] for row in cursor.fetchall()]
        
        expected_tables = ['page_views', 'events', 'metrics', 'user_sessions', 'conversion_funnels', 'ab_tests']
        missing_tables = set(expected_tables) - set(tables)
        
        if missing_tables:
            raise Exception(f"Missing tables: {missing_tables}")
        
        conn.close()
        return f"All {len(tables)} analytics tables exist"

    def test_data_volume(self):
        """Test that sufficient data was generated"""
        conn = sqlite3.connect(self.ecommerce_db)
        cursor = conn.cursor()
        
        # Check data volumes
        cursor.execute("SELECT COUNT(*) FROM users")
        user_count = cursor.fetchone()[0]
        
        cursor.execute("SELECT COUNT(*) FROM products")
        product_count = cursor.fetchone()[0]
        
        cursor.execute("SELECT COUNT(*) FROM orders")
        order_count = cursor.fetchone()[0]
        
        cursor.execute("SELECT COUNT(*) FROM order_items")
        order_item_count = cursor.fetchone()[0]
        
        cursor.execute("SELECT COUNT(*) FROM reviews")
        review_count = cursor.fetchone()[0]
        
        conn.close()
        
        # Check analytics data
        conn = sqlite3.connect(self.analytics_db)
        cursor = conn.cursor()
        
        cursor.execute("SELECT COUNT(*) FROM page_views")
        page_view_count = cursor.fetchone()[0]
        
        cursor.execute("SELECT COUNT(*) FROM events")
        event_count = cursor.fetchone()[0]
        
        conn.close()
        
        # Validate minimum data requirements
        if user_count < 1000:
            raise Exception(f"Insufficient users: {user_count} (expected >= 1000)")
        if product_count < 500:
            raise Exception(f"Insufficient products: {product_count} (expected >= 500)")
        if order_count < 2000:
            raise Exception(f"Insufficient orders: {order_count} (expected >= 2000)")
        if order_item_count < 5000:
            raise Exception(f"Insufficient order items: {order_item_count} (expected >= 5000)")
        if review_count < 1500:
            raise Exception(f"Insufficient reviews: {review_count} (expected >= 1500)")
        if page_view_count < 10000:
            raise Exception(f"Insufficient page views: {page_view_count} (expected >= 10000)")
        if event_count < 5000:
            raise Exception(f"Insufficient events: {event_count} (expected >= 5000)")
        
        return {
            "users": user_count,
            "products": product_count,
            "orders": order_count,
            "order_items": order_item_count,
            "reviews": review_count,
            "page_views": page_view_count,
            "events": event_count
        }

    def test_foreign_key_relationships(self):
        """Test foreign key relationships"""
        conn = sqlite3.connect(self.ecommerce_db)
        cursor = conn.cursor()
        
        # Test orders -> users relationship
        cursor.execute("""
            SELECT COUNT(*) FROM orders o 
            LEFT JOIN users u ON o.user_id = u.id 
            WHERE u.id IS NULL
        """)
        orphaned_orders = cursor.fetchone()[0]
        if orphaned_orders > 0:
            raise Exception(f"Found {orphaned_orders} orders with invalid user_id")
        
        # Test order_items -> orders relationship
        cursor.execute("""
            SELECT COUNT(*) FROM order_items oi 
            LEFT JOIN orders o ON oi.order_id = o.id 
            WHERE o.id IS NULL
        """)
        orphaned_order_items = cursor.fetchone()[0]
        if orphaned_order_items > 0:
            raise Exception(f"Found {orphaned_order_items} order items with invalid order_id")
        
        # Test order_items -> products relationship
        cursor.execute("""
            SELECT COUNT(*) FROM order_items oi 
            LEFT JOIN products p ON oi.product_id = p.id 
            WHERE p.id IS NULL
        """)
        orphaned_product_items = cursor.fetchone()[0]
        if orphaned_product_items > 0:
            raise Exception(f"Found {orphaned_product_items} order items with invalid product_id")
        
        conn.close()
        return "All foreign key relationships are valid"

    def test_complex_queries(self):
        """Test complex queries with joins and aggregations"""
        conn = sqlite3.connect(self.ecommerce_db)
        cursor = conn.cursor()
        
        # Test complex query: Top products by revenue
        cursor.execute("""
            SELECT p.name, p.brand, SUM(oi.total_price) as revenue, COUNT(oi.id) as order_count
            FROM products p
            JOIN order_items oi ON p.id = oi.product_id
            JOIN orders o ON oi.order_id = o.id
            WHERE o.status = 'delivered'
            GROUP BY p.id, p.name, p.brand
            ORDER BY revenue DESC
            LIMIT 10
        """)
        top_products = cursor.fetchall()
        
        if len(top_products) == 0:
            raise Exception("Complex query returned no results")
        
        # Test complex query: User order history with totals
        cursor.execute("""
            SELECT u.username, u.email, COUNT(o.id) as order_count, 
                   SUM(o.total_amount) as total_spent, AVG(o.total_amount) as avg_order_value
            FROM users u
            LEFT JOIN orders o ON u.id = o.user_id
            GROUP BY u.id, u.username, u.email
            HAVING order_count > 0
            ORDER BY total_spent DESC
            LIMIT 10
        """)
        user_stats = cursor.fetchall()
        
        if len(user_stats) == 0:
            raise Exception("User statistics query returned no results")
        
        conn.close()
        return f"Complex queries executed successfully: {len(top_products)} top products, {len(user_stats)} user stats"

    def test_analytics_queries(self):
        """Test analytics database queries"""
        conn = sqlite3.connect(self.analytics_db)
        cursor = conn.cursor()
        
        # Test page views by device type
        cursor.execute("""
            SELECT device_type, COUNT(*) as page_views, 
                   AVG(duration_seconds) as avg_duration
            FROM page_views
            GROUP BY device_type
            ORDER BY page_views DESC
        """)
        device_stats = cursor.fetchall()
        
        if len(device_stats) == 0:
            raise Exception("Device statistics query returned no results")
        
        # Test event tracking
        cursor.execute("""
            SELECT event_category, COUNT(*) as event_count,
                   AVG(event_value) as avg_value
            FROM events
            GROUP BY event_category
            ORDER BY event_count DESC
        """)
        event_stats = cursor.fetchall()
        
        if len(event_stats) == 0:
            raise Exception("Event statistics query returned no results")
        
        # Test metrics aggregation
        cursor.execute("""
            SELECT metric_name, metric_type, COUNT(*) as metric_count,
                   AVG(metric_value) as avg_value, MAX(metric_value) as max_value
            FROM metrics
            GROUP BY metric_name, metric_type
            ORDER BY metric_count DESC
        """)
        metric_stats = cursor.fetchall()
        
        if len(metric_stats) == 0:
            raise Exception("Metric statistics query returned no results")
        
        conn.close()
        return f"Analytics queries executed: {len(device_stats)} device types, {len(event_stats)} event categories, {len(metric_stats)} metric types"

    def test_indexes(self):
        """Test that indexes were created properly"""
        conn = sqlite3.connect(self.ecommerce_db)
        cursor = conn.cursor()
        
        # Get all indexes
        cursor.execute("SELECT name FROM sqlite_master WHERE type='index' AND name NOT LIKE 'sqlite_%'")
        indexes = [row[0] for row in cursor.fetchall()]
        
        expected_indexes = [
            'idx_users_email', 'idx_users_username', 'idx_products_sku',
            'idx_orders_user_id', 'idx_orders_status', 'idx_reviews_product_id'
        ]
        
        missing_indexes = set(expected_indexes) - set(indexes)
        if missing_indexes:
            raise Exception(f"Missing indexes: {missing_indexes}")
        
        conn.close()
        return f"Found {len(indexes)} indexes, all expected indexes present"

    def test_constraints(self):
        """Test that constraints are working properly"""
        conn = sqlite3.connect(self.ecommerce_db)
        cursor = conn.cursor()
        
        # Test unique constraints
        try:
            cursor.execute("INSERT INTO users (username, email, password_hash) VALUES ('test', 'test@test.com', 'hash')")
            cursor.execute("INSERT INTO users (username, email, password_hash) VALUES ('test', 'test2@test.com', 'hash')")
            raise Exception("Unique constraint on username not working")
        except sqlite3.IntegrityError:
            pass  # Expected
        
        # Test check constraints
        try:
            cursor.execute("INSERT INTO products (name, sku, price, cost) VALUES ('Test', 'TEST-001', -10, 5)")
            raise Exception("Check constraint on price not working")
        except sqlite3.IntegrityError:
            pass  # Expected
        
        conn.rollback()
        conn.close()
        return "All constraints are working properly"

    def test_sample_data_quality(self):
        """Test the quality and realism of sample data"""
        conn = sqlite3.connect(self.ecommerce_db)
        cursor = conn.cursor()
        
        # Test email format
        cursor.execute("SELECT email FROM users WHERE email NOT LIKE '%@%' LIMIT 1")
        invalid_emails = cursor.fetchone()
        if invalid_emails:
            raise Exception(f"Found invalid email format: {invalid_emails[0]}")
        
        # Test price ranges
        cursor.execute("SELECT MIN(price), MAX(price) FROM products")
        min_price, max_price = cursor.fetchone()
        if min_price < 0 or max_price > 10000:
            raise Exception(f"Unrealistic price range: {min_price} - {max_price}")
        
        # Test rating ranges
        cursor.execute("SELECT MIN(rating), MAX(rating) FROM reviews")
        min_rating, max_rating = cursor.fetchone()
        if min_rating < 1 or max_rating > 5:
            raise Exception(f"Invalid rating range: {min_rating} - {max_rating}")
        
        conn.close()
        return "Sample data quality is good"

    def generate_test_report(self):
        """Generate a comprehensive test report"""
        total_tests = len(self.test_results)
        passed_tests = len([r for r in self.test_results if r["status"] == "PASSED"])
        failed_tests = total_tests - passed_tests
        
        report = {
            "summary": {
                "total_tests": total_tests,
                "passed": passed_tests,
                "failed": failed_tests,
                "success_rate": (passed_tests / total_tests) * 100 if total_tests > 0 else 0
            },
            "test_results": self.test_results,
            "timestamp": datetime.now().isoformat()
        }
        
        return report

    def run_all_tests(self):
        """Run all tests and generate report"""
        print("QueryFlow Test Suite")
        print("=" * 50)
        
        tests = [
            ("Database Creation", self.test_database_creation),
            ("E-commerce Tables", self.test_ecommerce_tables),
            ("Analytics Tables", self.test_analytics_tables),
            ("Data Volume", self.test_data_volume),
            ("Foreign Key Relationships", self.test_foreign_key_relationships),
            ("Complex Queries", self.test_complex_queries),
            ("Analytics Queries", self.test_analytics_queries),
            ("Indexes", self.test_indexes),
            ("Constraints", self.test_constraints),
            ("Sample Data Quality", self.test_sample_data_quality)
        ]
        
        for test_name, test_function in tests:
            self.run_test(test_name, test_function)
            print()
        
        # Generate and save report
        report = self.generate_test_report()
        
        with open("test_report.json", "w") as f:
            json.dump(report, f, indent=2)
        
        print("=" * 50)
        print(f"Test Summary: {report['summary']['passed']}/{report['summary']['total_tests']} tests passed")
        print(f"Success Rate: {report['summary']['success_rate']:.1f}%")
        print("Detailed report saved to test_report.json")
        
        return report

if __name__ == "__main__":
    runner = QueryFlowTestRunner()
    runner.run_all_tests()
