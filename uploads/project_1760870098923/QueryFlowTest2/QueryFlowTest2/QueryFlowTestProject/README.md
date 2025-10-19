# QueryFlow Test Project

A comprehensive test project designed to thoroughly validate the QueryFlow database extraction pipeline with realistic, complex data that mirrors real-world applications.

## 📁 Project Structure

```
QueryFlowTestProject/
├── databases/                 # Database schema files
│   ├── ecommerce.sql         # E-commerce database schema
│   └── analytics.sql         # Analytics database schema
├── orm_models/               # ORM framework models
│   ├── User.js              # Sequelize User model
│   ├── Product.ts           # TypeORM Product entity
│   ├── Order.py             # Django Order model
│   └── prisma.schema        # Prisma schema
├── migrations/               # Database migration files
│   ├── 001_create_users_table.sql
│   ├── 002_create_products_table.sql
│   ├── 003_create_orders_table.sql
│   ├── 004_create_reviews_table.sql
│   └── 005_create_analytics_tables.sql
├── scripts/                  # Data generation and testing scripts
│   ├── generate_test_data.py # Comprehensive data generator
│   └── run_tests.py         # Test runner and validator
└── README.md                # This file
```

## 🗄️ Database Requirements

### E-commerce Database (ecommerce.sqlite)

**Tables:**
- **Users** (1,000+ records) - User accounts with comprehensive profile data
- **Categories** (50+ records) - Product categories with hierarchical structure
- **Products** (500+ records) - Product catalog with detailed specifications
- **Orders** (2,000+ records) - Order management with status tracking
- **Order Items** (5,000+ records) - Order line items with pricing
- **Reviews** (1,500+ records) - Product reviews and ratings

**Key Features:**
- Complex foreign key relationships
- Self-referencing categories (parent/child)
- Comprehensive constraints and validations
- Multiple data types (VARCHAR, TEXT, DECIMAL, DATE, BOOLEAN)
- Realistic date ranges (last 2 years)

### Analytics Database (analytics.sqlite)

**Tables:**
- **Page Views** (10,000+ records) - Website analytics with device tracking
- **Events** (5,000+ records) - User interaction events
- **Metrics** (1,000+ records) - Performance and business metrics
- **User Sessions** (2,000+ records) - Session tracking and analysis
- **Conversion Funnels** (500+ records) - Conversion tracking
- **A/B Tests** (300+ records) - Experiment tracking

**Key Features:**
- JSON properties for flexible event data
- Complex metric aggregations
- Device and browser tracking
- Geographic data (country, city)
- Time-based analytics (hourly, daily)

## 🔧 ORM/Framework Support

### 1. Sequelize (Node.js)
- **File:** `orm_models/User.js`
- **Features:** Associations, validations, instance methods, class methods
- **Relationships:** One-to-many with orders, reviews, analytics

### 2. TypeORM (TypeScript)
- **File:** `orm_models/Product.ts`
- **Features:** Decorators, relationships, virtual properties, static methods
- **Relationships:** Many-to-one with categories, one-to-many with order items

### 3. Django (Python)
- **File:** `orm_models/Order.py`
- **Features:** Model fields, choices, validators, Meta options, methods
- **Relationships:** Foreign keys, related names, cascade deletes

### 4. Prisma (Multi-language)
- **File:** `orm_models/prisma.schema`
- **Features:** Complete schema with all tables, relationships, indexes
- **Relationships:** All foreign key relationships defined

## 📊 Sample Data Requirements

### Data Volume
- **Users:** 1,000+ realistic user profiles
- **Products:** 500+ products across multiple categories
- **Orders:** 2,000+ orders with various statuses
- **Order Items:** 5,000+ order line items
- **Reviews:** 1,500+ product reviews with ratings
- **Page Views:** 10,000+ analytics records
- **Events:** 5,000+ tracking events

### Data Quality
- Realistic names, emails, addresses
- Proper email format validation
- Realistic price ranges and product specifications
- Valid date ranges and timestamps
- Proper foreign key relationships
- Realistic review content and ratings

## 🚀 Quick Start

### 1. Generate Test Data
```bash
cd QueryFlowTestProject
python scripts/generate_test_data.py
```

This will create:
- `databases/ecommerce.sqlite` - E-commerce database with full data
- `databases/analytics.sqlite` - Analytics database with full data

### 2. Run Tests
```bash
python scripts/run_tests.py
```

This will validate:
- Database creation and structure
- Data volume and quality
- Foreign key relationships
- Complex queries and aggregations
- Index performance
- Constraint validation

### 3. View Results
- Test results are displayed in the console
- Detailed report saved to `test_report.json`

## 🎯 Test Scenarios

### Multi-Framework Detection
- ✅ Sequelize model detection and parsing
- ✅ TypeORM entity detection and parsing
- ✅ Django model detection and parsing
- ✅ Prisma schema detection and parsing

### Complex Schema Extraction
- ✅ Multiple tables with various relationships
- ✅ Self-referencing foreign keys
- ✅ Many-to-many relationships through junction tables
- ✅ Complex constraint definitions

### Data Type Mapping
- ✅ VARCHAR, TEXT, INTEGER, DECIMAL, DATE, DATETIME, BOOLEAN
- ✅ Different data types across frameworks
- ✅ Proper type conversion and validation

### Constraint Recognition
- ✅ Primary keys, foreign keys, unique constraints
- ✅ Check constraints and validation rules
- ✅ Default values and nullable fields

### Index Detection
- ✅ Single column indexes
- ✅ Composite indexes
- ✅ Unique indexes
- ✅ Performance optimization indexes

### Migration History
- ✅ Multiple migration files with different formats
- ✅ Schema evolution tracking
- ✅ Version control integration

### Real Data Sampling
- ✅ Actual data extraction and display
- ✅ Realistic sample data generation
- ✅ Data quality validation

### Query Generation
- ✅ Complex queries with joins
- ✅ Aggregation functions
- ✅ Filtering and sorting
- ✅ Performance testing

### Schema Validation
- ✅ Constraint validation
- ✅ Relationship verification
- ✅ Data integrity checks

### Performance Testing
- ✅ Large datasets (10,000+ records)
- ✅ Complex queries with multiple joins
- ✅ Index performance validation
- ✅ Query execution time testing

## 📈 Success Criteria

The test project successfully validates:

1. **Database Extraction** - All 15+ tables extracted from both databases
2. **Framework Detection** - All 4+ ORM frameworks identified and parsed
3. **Relationship Parsing** - All foreign key relationships correctly identified
4. **Data Generation** - Working SQLite databases with realistic data
5. **UI Integration** - Real sample data displayed in QueryFlow UI
6. **Query Execution** - Complex queries with joins executed successfully
7. **Metadata Accuracy** - Accurate table statistics and metadata
8. **Performance** - Large datasets handled efficiently

## 🔍 Testing Features

### Database Structure Testing
- Table creation and schema validation
- Column type and constraint verification
- Index creation and performance testing
- Foreign key relationship validation

### Data Quality Testing
- Realistic data generation
- Data format validation
- Relationship integrity checks
- Constraint enforcement testing

### Query Performance Testing
- Complex join queries
- Aggregation functions
- Large dataset handling
- Index utilization

### Framework Compatibility Testing
- Multiple ORM framework support
- Schema parsing accuracy
- Relationship mapping
- Data type conversion

## 📝 Notes

- All data is generated with realistic patterns and relationships
- Foreign key constraints ensure data integrity
- Indexes are optimized for common query patterns
- Sample data covers edge cases and normal scenarios
- Test suite provides comprehensive validation coverage

This test project provides a robust foundation for validating QueryFlow's database extraction capabilities across multiple frameworks and complex data scenarios.
