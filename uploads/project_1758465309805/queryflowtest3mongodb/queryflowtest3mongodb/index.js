require('dotenv').config();
const connectDB = require('./config/database');
const User = require('./models/User');
const Product = require('./models/Product');
const Order = require('./models/Order');
const Category = require('./models/Category');
const Review = require('./models/Review');

// Connect to MongoDB
connectDB();

// Example CRUD operations
const exampleOperations = async () => {
  try {
    console.log('🚀 MongoDB Test Template - Example Operations\n');
    
    // 1. Find all users
    console.log('1. All Users:');
    const users = await User.find().select('name email role');
    console.log(users);
    
    // 2. Find products by category
    console.log('\n2. Electronics Products:');
    const electronics = await Product.find({ category: 'electronics' }).select('name price stock');
    console.log(electronics);
    
    // 3. Find orders with user details (populate)
    console.log('\n3. Orders with User Details:');
    const orders = await Order.find()
      .populate('userId', 'name email')
      .populate('products.productId', 'name price')
      .select('totalAmount status orderDate');
    console.log(orders);
    
    // 4. Find reviews with ratings >= 4
    console.log('\n4. High-Rated Reviews (4+ stars):');
    const highRatedReviews = await Review.find({ rating: { $gte: 4 } })
      .populate('userId', 'name')
      .populate('productId', 'name')
      .select('rating title comment helpfulVotes');
    console.log(highRatedReviews);
    
    // 5. Aggregate: Average rating per product
    console.log('\n5. Average Rating per Product:');
    const avgRatings = await Review.aggregate([
      {
        $group: {
          _id: '$productId',
          averageRating: { $avg: '$rating' },
          reviewCount: { $sum: 1 }
        }
      },
      {
        $lookup: {
          from: 'products',
          localField: '_id',
          foreignField: '_id',
          as: 'product'
        }
      },
      {
        $unwind: '$product'
      },
      {
        $project: {
          productName: '$product.name',
          averageRating: { $round: ['$averageRating', 2] },
          reviewCount: 1
        }
      }
    ]);
    console.log(avgRatings);
    
    // 6. Count documents in each collection
    console.log('\n6. Collection Statistics:');
    const stats = {
      users: await User.countDocuments(),
      products: await Product.countDocuments(),
      orders: await Order.countDocuments(),
      categories: await Category.countDocuments(),
      reviews: await Review.countDocuments()
    };
    console.log(stats);
    
  } catch (error) {
    console.error('Error in example operations:', error);
  }
};

// Run example operations
exampleOperations();
