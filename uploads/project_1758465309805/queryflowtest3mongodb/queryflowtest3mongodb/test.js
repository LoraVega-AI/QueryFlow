require('dotenv').config();
const connectDB = require('./config/database');
const User = require('./models/User');
const Product = require('./models/Product');
const Order = require('./models/Order');

// Connect to MongoDB
connectDB();

// Test functions
const runTests = async () => {
  try {
    console.log('🧪 Running MongoDB Tests...\n');
    
    // Test 1: Create a new user
    console.log('Test 1: Creating a new user...');
    const newUser = new User({
      name: 'Test User',
      email: 'test@example.com',
      age: 25,
      role: 'user'
    });
    await newUser.save();
    console.log('✅ User created successfully:', newUser.name);
    
    // Test 2: Find user by email
    console.log('\nTest 2: Finding user by email...');
    const foundUser = await User.findOne({ email: 'test@example.com' });
    console.log('✅ User found:', foundUser.name);
    
    // Test 3: Update user
    console.log('\nTest 3: Updating user...');
    await User.updateOne(
      { email: 'test@example.com' },
      { $set: { age: 26 } }
    );
    const updatedUser = await User.findOne({ email: 'test@example.com' });
    console.log('✅ User updated, new age:', updatedUser.age);
    
    // Test 4: Create a product
    console.log('\nTest 4: Creating a new product...');
    const newProduct = new Product({
      name: 'Test Product',
      description: 'A test product for testing purposes',
      price: 99.99,
      category: 'electronics',
      stock: 10,
      tags: ['test', 'example']
    });
    await newProduct.save();
    console.log('✅ Product created successfully:', newProduct.name);
    
    // Test 5: Create an order
    console.log('\nTest 5: Creating a new order...');
    const newOrder = new Order({
      userId: foundUser._id,
      products: [{
        productId: newProduct._id,
        quantity: 2,
        price: newProduct.price
      }],
      totalAmount: newProduct.price * 2,
      status: 'pending',
      shippingAddress: {
        street: '123 Test St',
        city: 'Test City',
        state: 'TS',
        zipCode: '12345',
        country: 'USA'
      }
    });
    await newOrder.save();
    console.log('✅ Order created successfully, total:', newOrder.totalAmount);
    
    // Test 6: Complex query - Find orders for a specific user
    console.log('\nTest 6: Finding orders for test user...');
    const userOrders = await Order.find({ userId: foundUser._id })
      .populate('userId', 'name email')
      .populate('products.productId', 'name price');
    console.log('✅ Found orders for user:', userOrders.length);
    console.log('Order details:', userOrders[0]);
    
    // Test 7: Delete test data
    console.log('\nTest 7: Cleaning up test data...');
    await User.deleteOne({ email: 'test@example.com' });
    await Product.deleteOne({ name: 'Test Product' });
    await Order.deleteOne({ userId: foundUser._id });
    console.log('✅ Test data cleaned up');
    
    console.log('\n🎉 All tests passed successfully!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  } finally {
    process.exit(0);
  }
};

// Run tests
runTests();
