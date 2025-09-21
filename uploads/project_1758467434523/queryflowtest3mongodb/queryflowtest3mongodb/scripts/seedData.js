require('dotenv').config();
const connectDB = require('../config/database');
const User = require('../models/User');
const Product = require('../models/Product');
const Order = require('../models/Order');
const Category = require('../models/Category');
const Review = require('../models/Review');

const seedData = async () => {
  try {
    await connectDB();
    
    // Clear existing data
    await User.deleteMany({});
    await Product.deleteMany({});
    await Order.deleteMany({});
    await Category.deleteMany({});
    await Review.deleteMany({});
    
    console.log('Cleared existing data...');
    
    // Create categories
    const categories = await Category.insertMany([
      {
        name: 'Electronics',
        description: 'Electronic devices and gadgets',
        sortOrder: 1
      },
      {
        name: 'Clothing',
        description: 'Fashion and apparel',
        sortOrder: 2
      },
      {
        name: 'Books',
        description: 'Books and educational materials',
        sortOrder: 3
      },
      {
        name: 'Home & Garden',
        description: 'Home improvement and garden supplies',
        sortOrder: 4
      },
      {
        name: 'Sports',
        description: 'Sports equipment and accessories',
        sortOrder: 5
      }
    ]);
    
    console.log('Created categories...');
    
    // Create users
    const users = await User.insertMany([
      {
        name: 'John Doe',
        email: 'john@example.com',
        age: 30,
        role: 'admin'
      },
      {
        name: 'Jane Smith',
        email: 'jane@example.com',
        age: 25,
        role: 'user'
      },
      {
        name: 'Bob Johnson',
        email: 'bob@example.com',
        age: 35,
        role: 'user'
      },
      {
        name: 'Alice Brown',
        email: 'alice@example.com',
        age: 28,
        role: 'moderator'
      },
      {
        name: 'Charlie Wilson',
        email: 'charlie@example.com',
        age: 42,
        role: 'user'
      }
    ]);
    
    console.log('Created users...');
    
    // Create products
    const products = await Product.insertMany([
      {
        name: 'Smartphone',
        description: 'Latest model smartphone with advanced features',
        price: 699.99,
        category: 'electronics',
        stock: 50,
        tags: ['mobile', 'smartphone', 'tech']
      },
      {
        name: 'Laptop',
        description: 'High-performance laptop for work and gaming',
        price: 1299.99,
        category: 'electronics',
        stock: 25,
        tags: ['laptop', 'computer', 'tech']
      },
      {
        name: 'T-Shirt',
        description: 'Comfortable cotton t-shirt',
        price: 19.99,
        category: 'clothing',
        stock: 100,
        tags: ['clothing', 'casual', 'cotton']
      },
      {
        name: 'Programming Book',
        description: 'Complete guide to modern programming',
        price: 49.99,
        category: 'books',
        stock: 75,
        tags: ['programming', 'education', 'book']
      },
      {
        name: 'Running Shoes',
        description: 'Comfortable running shoes for athletes',
        price: 89.99,
        category: 'sports',
        stock: 60,
        tags: ['shoes', 'running', 'sports']
      },
      {
        name: 'Coffee Maker',
        description: 'Automatic coffee maker for home use',
        price: 79.99,
        category: 'home',
        stock: 30,
        tags: ['coffee', 'kitchen', 'appliance']
      }
    ]);
    
    console.log('Created products...');
    
    // Create orders
    const orders = await Order.insertMany([
      {
        userId: users[0]._id,
        products: [
          {
            productId: products[0]._id,
            quantity: 1,
            price: products[0].price
          },
          {
            productId: products[2]._id,
            quantity: 2,
            price: products[2].price
          }
        ],
        totalAmount: 739.97,
        status: 'delivered',
        shippingAddress: {
          street: '123 Main St',
          city: 'New York',
          state: 'NY',
          zipCode: '10001',
          country: 'USA'
        }
      },
      {
        userId: users[1]._id,
        products: [
          {
            productId: products[1]._id,
            quantity: 1,
            price: products[1].price
          }
        ],
        totalAmount: 1299.99,
        status: 'processing',
        shippingAddress: {
          street: '456 Oak Ave',
          city: 'Los Angeles',
          state: 'CA',
          zipCode: '90210',
          country: 'USA'
        }
      },
      {
        userId: users[2]._id,
        products: [
          {
            productId: products[3]._id,
            quantity: 1,
            price: products[3].price
          },
          {
            productId: products[4]._id,
            quantity: 1,
            price: products[4].price
          }
        ],
        totalAmount: 139.98,
        status: 'shipped',
        shippingAddress: {
          street: '789 Pine St',
          city: 'Chicago',
          state: 'IL',
          zipCode: '60601',
          country: 'USA'
        }
      }
    ]);
    
    console.log('Created orders...');
    
    // Create reviews
    const reviews = await Review.insertMany([
      {
        userId: users[0]._id,
        productId: products[0]._id,
        rating: 5,
        title: 'Excellent smartphone!',
        comment: 'Great features and performance. Highly recommended!',
        isVerified: true,
        helpfulVotes: 12
      },
      {
        userId: users[1]._id,
        productId: products[0]._id,
        rating: 4,
        title: 'Good phone with minor issues',
        comment: 'Overall good phone but battery life could be better.',
        isVerified: true,
        helpfulVotes: 8
      },
      {
        userId: users[2]._id,
        productId: products[1]._id,
        rating: 5,
        title: 'Perfect for work and gaming',
        comment: 'Fast performance and great build quality.',
        isVerified: true,
        helpfulVotes: 15
      },
      {
        userId: users[3]._id,
        productId: products[2]._id,
        rating: 4,
        title: 'Comfortable and stylish',
        comment: 'Good quality t-shirt, fits well.',
        isVerified: false,
        helpfulVotes: 3
      },
      {
        userId: users[4]._id,
        productId: products[3]._id,
        rating: 5,
        title: 'Great programming resource',
        comment: 'Very comprehensive and well-written book.',
        isVerified: true,
        helpfulVotes: 20
      }
    ]);
    
    console.log('Created reviews...');
    
    console.log('\n✅ Database seeded successfully!');
    console.log(`📊 Created:`);
    console.log(`   - ${categories.length} categories`);
    console.log(`   - ${users.length} users`);
    console.log(`   - ${products.length} products`);
    console.log(`   - ${orders.length} orders`);
    console.log(`   - ${reviews.length} reviews`);
    
    process.exit(0);
  } catch (error) {
    console.error('Error seeding database:', error);
    process.exit(1);
  }
};

seedData();
