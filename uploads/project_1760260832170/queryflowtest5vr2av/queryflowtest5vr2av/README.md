# Sequelize Test Project

A comprehensive test project with exactly 5 Sequelize models containing 25 total columns, 6 foreign keys, 8 indexes, 4 unique constraints, 3 default values, and 2 many-to-many relationships.

## Project Structure

```
├── config/
│   └── database.js          # Database configuration
├── models/
│   ├── User.js             # User model (5 columns)
│   ├── Category.js         # Category model (4 columns)
│   ├── Product.js          # Product model (6 columns)
│   ├── Order.js            # Order model (5 columns)
│   ├── Review.js           # Review model (5 columns)
│   ├── OrderItem.js        # Order-Product junction table
│   └── Wishlist.js         # User-Product junction table
├── index.js                # Main application file
├── test.js                 # Test suite
├── package.json            # Dependencies
└── README.md               # This file
```

## Models and Columns

### 1. User Model (5 columns)
- `id` (INTEGER, PRIMARY KEY, AUTO_INCREMENT)
- `username` (STRING(50), NOT NULL, UNIQUE)
- `email` (STRING(100), NOT NULL, UNIQUE)
- `password_hash` (STRING(255), NOT NULL)
- `is_active` (BOOLEAN, NOT NULL, DEFAULT: true)

### 2. Category Model (5 columns)
- `id` (INTEGER, PRIMARY KEY, AUTO_INCREMENT)
- `name` (STRING(100), NOT NULL, UNIQUE)
- `description` (TEXT, NULLABLE)
- `is_active` (BOOLEAN, NOT NULL, DEFAULT: true)
- `created_at` (DATE, NOT NULL, DEFAULT: NOW())

### 3. Product Model (5 columns)
- `id` (INTEGER, PRIMARY KEY, AUTO_INCREMENT)
- `name` (STRING(200), NOT NULL)
- `price` (DECIMAL(10,2), NOT NULL, MIN: 0)
- `stock_quantity` (INTEGER, NOT NULL, DEFAULT: 0, MIN: 0)
- `category_id` (INTEGER, NOT NULL, FOREIGN KEY → categories.id)

### 4. Order Model (5 columns)
- `id` (INTEGER, PRIMARY KEY, AUTO_INCREMENT)
- `order_number` (STRING(50), NOT NULL, UNIQUE)
- `total_amount` (DECIMAL(10,2), NOT NULL, MIN: 0)
- `status` (ENUM, NOT NULL, DEFAULT: 'pending')
- `user_id` (INTEGER, NOT NULL, FOREIGN KEY → users.id)

### 5. Review Model (5 columns)
- `id` (INTEGER, PRIMARY KEY, AUTO_INCREMENT)
- `rating` (INTEGER, NOT NULL, MIN: 1, MAX: 5)
- `comment` (TEXT, NULLABLE)
- `user_id` (INTEGER, NOT NULL, FOREIGN KEY → users.id)
- `product_id` (INTEGER, NOT NULL, FOREIGN KEY → products.id)

## Relationships

### Foreign Keys (6 total)
1. `User → Order` (user_id)
2. `Category → Product` (category_id)
3. `User → Review` (user_id)
4. `Product → Review` (product_id)
5. `Order → OrderItem` (order_id)
6. `Product → OrderItem` (product_id)

### Many-to-Many Relationships (2 total)
1. **Order ↔ Product** (via OrderItem junction table)
2. **User ↔ Product** (via Wishlist junction table)

## Constraints and Indexes

### Unique Constraints (4 total)
- `users.username`
- `users.email`
- `categories.name`
- `orders.order_number`

### Indexes (8 total)
- `users.username` (unique)
- `users.email` (unique)
- `users.is_active`
- `categories.name` (unique)
- `categories.is_active`
- `products.name`
- `products.price`
- `products.category_id`

### Default Values (3 total)
- `users.is_active`: true
- `categories.is_active`: true
- `orders.status`: 'pending'

## Sample Data

The database is populated with exactly 50 rows of sample data:
- 8 Users
- 4 Categories
- 8 Products
- 8 Orders
- 8 Reviews
- 8 Order Items
- 6 Wishlist Entries

## Installation and Usage

1. Install dependencies:
```bash
npm install
```

2. Run the application to create the database and populate sample data:
```bash
npm start
```

3. Run tests to verify everything works:
```bash
npm test
```

## Database Features Tested

- ✅ Model structure and column definitions
- ✅ Primary and foreign key relationships
- ✅ One-to-many relationships
- ✅ Many-to-many relationships (via junction tables)
- ✅ Unique constraints
- ✅ Indexes for performance
- ✅ Default values
- ✅ Data validation rules
- ✅ Complex queries with includes
- ✅ Data integrity
- ✅ Query performance

## Verification

This project is designed to test:
- **Extraction accuracy**: All models, columns, and relationships are clearly defined
- **Verification**: 100% accuracy expected for all database features
- **Relationship types**: One-to-many and many-to-many relationships
- **Constraint detection**: Unique constraints, foreign keys, and validation rules
- **Statistics**: Comprehensive data about tables, columns, and relationships
- **Security**: Proper validation and constraint enforcement
- **Engine features**: Full SQLite database with all Sequelize features

The project serves as a comprehensive test suite for database schema analysis and relationship mapping tools.
