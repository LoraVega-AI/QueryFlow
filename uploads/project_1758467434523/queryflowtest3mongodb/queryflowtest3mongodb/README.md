# MongoDB Test Template

A simple Node.js template project for testing MongoDB with multiple collections using Mongoose ODM.

## Features

- **Multiple Collections**: Users, Products, Orders, Categories, and Reviews
- **Sample Data**: Pre-populated with realistic test data
- **CRUD Operations**: Examples of Create, Read, Update, Delete operations
- **Advanced Queries**: Aggregation, population, and complex queries
- **Test Suite**: Automated tests for all operations

## Collections (Tables)

1. **Users** - User accounts with roles and profiles
2. **Products** - Product catalog with categories and inventory
3. **Orders** - Order management with product references
4. **Categories** - Product categorization system
5. **Reviews** - Product reviews and ratings

## Prerequisites

- Node.js (v14 or higher)
- MongoDB (local installation or MongoDB Atlas)

## Installation

1. Clone or download this project
2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up environment variables:
   Create a `.env` file in the root directory:
   ```
   MONGODB_URI=mongodb://localhost:27017/testdb
   PORT=3000
   ```

## Usage

### 1. Seed the Database
Populate the database with sample data:
```bash
npm run seed
```

### 2. Run Example Operations
See various MongoDB operations in action:
```bash
npm start
```

### 3. Run Tests
Execute the test suite:
```bash
npm test
```

## Project Structure

```
├── config/
│   └── database.js          # MongoDB connection configuration
├── models/
│   ├── User.js             # User schema
│   ├── Product.js          # Product schema
│   ├── Order.js            # Order schema
│   ├── Category.js         # Category schema
│   └── Review.js           # Review schema
├── scripts/
│   └── seedData.js         # Database seeding script
├── index.js                # Main application with examples
├── test.js                 # Test suite
├── package.json            # Dependencies and scripts
└── README.md              # This file
```

## Sample Data

The seeding script creates:
- 5 users with different roles
- 6 products across various categories
- 3 orders with product references
- 5 categories for product organization
- 5 product reviews with ratings

## Example Queries

### Find all users
```javascript
const users = await User.find().select('name email role');
```

### Find products by category
```javascript
const electronics = await Product.find({ category: 'electronics' });
```

### Find orders with populated data
```javascript
const orders = await Order.find()
  .populate('userId', 'name email')
  .populate('products.productId', 'name price');
```

### Aggregate average ratings
```javascript
const avgRatings = await Review.aggregate([
  {
    $group: {
      _id: '$productId',
      averageRating: { $avg: '$rating' }
    }
  }
]);
```

## Database Schema

### Users Collection
- name, email, age, role, isActive, createdAt

### Products Collection
- name, description, price, category, stock, tags, isAvailable, createdAt

### Orders Collection
- userId (ref), products[], totalAmount, status, shippingAddress, orderDate

### Categories Collection
- name, description, parentCategory (ref), isActive, sortOrder, createdAt

### Reviews Collection
- userId (ref), productId (ref), rating, title, comment, isVerified, helpfulVotes, createdAt

## Testing

The test suite includes:
- User creation and retrieval
- Product management
- Order creation with references
- Complex queries with population
- Data cleanup

## Customization

You can easily modify the schemas in the `models/` directory to match your specific requirements. The seeding script can be updated to create different sample data.

## Troubleshooting

1. **Connection Issues**: Ensure MongoDB is running and the connection string is correct
2. **Port Conflicts**: Change the PORT in your `.env` file if needed
3. **Memory Issues**: For large datasets, consider using pagination in your queries

## License

MIT License - feel free to use this template for your projects!
