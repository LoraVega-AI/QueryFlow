# Django E-commerce Test Project

A comprehensive Django e-commerce system with 8 tables, 5 indexes, 4 foreign keys, 2 many-to-many relationships, and 3 unique constraints.

## Project Structure

```
ecommerce_project/
├── manage.py
├── ecommerce_project/
│   ├── __init__.py
│   ├── settings.py
│   ├── urls.py
│   ├── wsgi.py
│   └── asgi.py
└── ecommerce/
    ├── __init__.py
    ├── admin.py
    ├── apps.py
    ├── models.py
    ├── views.py
    ├── tests.py
    ├── management/
    │   └── commands/
    │       └── populate_sample_data.py
    └── migrations/
        └── 0001_initial.py
```

## Database Schema

### 8 Tables

1. **Category** - Product categories with hierarchical structure
2. **Product** - Products in the e-commerce system
3. **UserProfile** - Extended user profile with additional e-commerce fields
4. **Order** - Customer orders
5. **OrderItem** - Individual items within an order
6. **Review** - Product reviews by users
7. **Cart** - Shopping cart for users
8. **CartItem** - Items in shopping cart

### 4 Foreign Key Relationships

1. `Product.category` → `Category` (Product belongs to Category)
2. `Order.user` → `User` (Order belongs to User)
3. `OrderItem.order` → `Order` (OrderItem belongs to Order)
4. `OrderItem.product` → `Product` (OrderItem belongs to Product)

### 2 Many-to-Many Relationships

1. `Product.related_categories` ↔ `Category` (Product can belong to multiple categories)
2. `UserProfile.preferred_categories` ↔ `Category` (User can have multiple preferred categories)

### 3 Unique Constraints

1. `unique_product_sku` - Product SKU must be unique
2. `unique_user_profile` - One profile per user
3. `unique_user_product_review` - One review per user per product

### 5 Database Indexes

1. `Category.name` - For fast category name lookups
2. `Product.name` - For fast product name searches
3. `Product.price` - For price-based queries
4. `Review.rating` - For rating-based filtering
5. `Order.order_number` - For order number lookups

## Setup Instructions

1. **Install Django** (if not already installed):
   ```bash
   pip install django
   ```

2. **Run Migrations**:
   ```bash
   python manage.py migrate
   ```

3. **Create Superuser**:
   ```bash
   python manage.py createsuperuser
   ```

4. **Populate Sample Data**:
   ```bash
   python manage.py populate_sample_data --users 15 --products 75
   ```

5. **Start Development Server**:
   ```bash
   python manage.py runserver
   ```

6. **Access Admin Interface**:
   - URL: http://127.0.0.1:8000/admin/
   - Username: admin
   - Password: admin123

## Sample Data

The project includes a management command that creates:
- 8 product categories
- 15 users with profiles
- 75 products across different categories
- 20 orders with order items
- 50 product reviews
- Shopping carts for all users

## Model Relationships

### Category Model
- Self-referential foreign key for hierarchical categories
- One-to-many relationship with Products
- Many-to-many relationship with UserProfile (preferences)

### Product Model
- Foreign key to Category
- Many-to-many relationship with Category (related categories)
- One-to-many relationships with OrderItem, Review, CartItem

### UserProfile Model
- One-to-one relationship with User
- Many-to-many relationship with Category (preferred categories)

### Order Model
- Foreign key to User
- One-to-many relationship with OrderItem

### OrderItem Model
- Foreign keys to Order and Product
- Represents individual items in an order

### Review Model
- Foreign keys to User and Product
- Represents product reviews with ratings

### Cart Model
- One-to-one relationship with User
- One-to-many relationship with CartItem

### CartItem Model
- Foreign keys to Cart and Product
- Represents items in shopping cart

## Features

- **User Management**: Extended user profiles with preferences
- **Product Catalog**: Hierarchical categories with cross-category products
- **Order Management**: Complete order processing system
- **Review System**: Product reviews with ratings
- **Shopping Cart**: Persistent cart functionality
- **Admin Interface**: Full Django admin integration
- **Sample Data**: Comprehensive test data generation

## Database Performance

The project includes several performance optimizations:
- Strategic database indexes on frequently queried fields
- Proper foreign key relationships for data integrity
- Unique constraints to prevent duplicate data
- Efficient many-to-many relationships for flexible data modeling

## Testing

To test the database relationships and constraints:

1. **Check Foreign Keys**:
   ```python
   python manage.py shell
   >>> from ecommerce.models import Product, Category
   >>> product = Product.objects.first()
   >>> print(product.category.name)  # Should work
   ```

2. **Check Many-to-Many**:
   ```python
   >>> product = Product.objects.first()
   >>> print(product.related_categories.all())  # Should show related categories
   ```

3. **Check Unique Constraints**:
   ```python
   >>> from ecommerce.models import Product
   >>> Product.objects.create(sku='DUPLICATE', name='Test', price=10.00, category_id=1)
   # Should raise IntegrityError
   ```

This project demonstrates a complete Django e-commerce system with all the requested specifications and provides a solid foundation for further development.
