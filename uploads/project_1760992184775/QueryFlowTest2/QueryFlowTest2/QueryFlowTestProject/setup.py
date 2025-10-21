#!/usr/bin/env python3
"""
QueryFlow Test Project Setup Script
This script sets up the complete test environment and runs all tests
"""

import os
import sys
import subprocess
import sqlite3
from pathlib import Path

def check_python_version():
    """Check if Python version is compatible"""
    if sys.version_info < (3, 6):
        print("Error: Python 3.6 or higher is required")
        sys.exit(1)
    print(f"✓ Python {sys.version_info.major}.{sys.version_info.minor} detected")

def create_directories():
    """Create necessary directories"""
    directories = [
        "databases",
        "orm_models", 
        "test_data",
        "migrations",
        "scripts"
    ]
    
    for directory in directories:
        os.makedirs(directory, exist_ok=True)
        print(f"✓ Created directory: {directory}")

def check_dependencies():
    """Check if required dependencies are available"""
    try:
        import sqlite3
        print("✓ sqlite3 module available")
    except ImportError:
        print("Error: sqlite3 module not available")
        sys.exit(1)
    
    try:
        import json
        print("✓ json module available")
    except ImportError:
        print("Error: json module not available")
        sys.exit(1)
    
    try:
        import uuid
        print("✓ uuid module available")
    except ImportError:
        print("Error: uuid module not available")
        sys.exit(1)

def run_data_generation():
    """Run the data generation script"""
    print("\n" + "="*50)
    print("GENERATING TEST DATA")
    print("="*50)
    
    try:
        # Change to the project directory
        os.chdir(Path(__file__).parent)
        
        # Run the data generation script
        result = subprocess.run([sys.executable, "scripts/generate_test_data.py"], 
                              capture_output=True, text=True, check=True)
        print("✓ Data generation completed successfully")
        return True
    except subprocess.CalledProcessError as e:
        print(f"Error generating data: {e}")
        print(f"STDOUT: {e.stdout}")
        print(f"STDERR: {e.stderr}")
        return False
    except Exception as e:
        print(f"Error running data generation: {e}")
        return False

def run_tests():
    """Run the test suite"""
    print("\n" + "="*50)
    print("RUNNING TESTS")
    print("="*50)
    
    try:
        # Run the test script
        result = subprocess.run([sys.executable, "scripts/run_tests.py"], 
                              capture_output=True, text=True, check=True)
        print("✓ Tests completed successfully")
        print("\nTest Output:")
        print(result.stdout)
        return True
    except subprocess.CalledProcessError as e:
        print(f"Error running tests: {e}")
        print(f"STDOUT: {e.stdout}")
        print(f"STDERR: {e.stderr}")
        return False
    except Exception as e:
        print(f"Error running tests: {e}")
        return False

def verify_databases():
    """Verify that databases were created successfully"""
    print("\n" + "="*50)
    print("VERIFYING DATABASES")
    print("="*50)
    
    databases = [
        "databases/ecommerce.sqlite",
        "databases/analytics.sqlite"
    ]
    
    for db_path in databases:
        if os.path.exists(db_path):
            # Check database size
            size = os.path.getsize(db_path)
            print(f"✓ {db_path} exists ({size:,} bytes)")
            
            # Check table count
            conn = sqlite3.connect(db_path)
            cursor = conn.cursor()
            cursor.execute("SELECT name FROM sqlite_master WHERE type='table'")
            tables = cursor.fetchall()
            print(f"  - {len(tables)} tables found")
            conn.close()
        else:
            print(f"✗ {db_path} not found")
            return False
    
    return True

def display_summary():
    """Display project summary"""
    print("\n" + "="*50)
    print("QUERYFLOW TEST PROJECT SUMMARY")
    print("="*50)
    
    print("📁 Project Structure:")
    print("  - databases/          # SQLite database files")
    print("  - orm_models/         # ORM framework models")
    print("  - migrations/         # Database migration files")
    print("  - scripts/            # Data generation and testing")
    print("  - README.md           # Project documentation")
    
    print("\n🗄️ Databases Created:")
    print("  - ecommerce.sqlite    # E-commerce database (6 tables)")
    print("  - analytics.sqlite    # Analytics database (6 tables)")
    
    print("\n🔧 ORM Frameworks Tested:")
    print("  - Sequelize (Node.js) # User.js model")
    print("  - TypeORM (TypeScript)# Product.ts entity")
    print("  - Django (Python)     # Order.py model")
    print("  - Prisma (Multi-lang) # prisma.schema")
    
    print("\n📊 Test Data Generated:")
    print("  - 1,000+ users with realistic profiles")
    print("  - 500+ products across multiple categories")
    print("  - 2,000+ orders with various statuses")
    print("  - 5,000+ order items with pricing")
    print("  - 1,500+ product reviews and ratings")
    print("  - 10,000+ page views for analytics")
    print("  - 5,000+ tracking events")
    
    print("\n🎯 Test Coverage:")
    print("  - Multi-framework detection")
    print("  - Complex schema extraction")
    print("  - Data type mapping")
    print("  - Constraint recognition")
    print("  - Index detection")
    print("  - Migration history")
    print("  - Real data sampling")
    print("  - Query generation")
    print("  - Schema validation")
    print("  - Performance testing")
    
    print("\n✅ Ready for QueryFlow Testing!")
    print("\nTo run individual components:")
    print("  python scripts/generate_test_data.py  # Generate data")
    print("  python scripts/run_tests.py          # Run tests")

def main():
    """Main setup function"""
    print("QueryFlow Test Project Setup")
    print("="*50)
    
    # Check requirements
    check_python_version()
    check_dependencies()
    create_directories()
    
    # Generate test data
    if not run_data_generation():
        print("Setup failed during data generation")
        sys.exit(1)
    
    # Verify databases
    if not verify_databases():
        print("Setup failed during database verification")
        sys.exit(1)
    
    # Run tests
    if not run_tests():
        print("Setup failed during testing")
        sys.exit(1)
    
    # Display summary
    display_summary()
    
    print("\n🎉 Setup completed successfully!")
    print("The QueryFlow test project is ready for comprehensive testing.")

if __name__ == "__main__":
    main()
