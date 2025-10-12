const { sequelize, User, Category, Product, Order, Review, OrderItem, Wishlist } = require('./index');

// Sample data generators
const sampleUsers = [
  { username: 'john_doe', email: 'john@example.com', password_hash: 'hashed_password_1', first_name: 'John', last_name: 'Doe', phone: '555-0101', date_of_birth: '1990-01-15' },
  { username: 'jane_smith', email: 'jane@example.com', password_hash: 'hashed_password_2', first_name: 'Jane', last_name: 'Smith', phone: '555-0102', date_of_birth: '1985-03-22' },
  { username: 'bob_wilson', email: 'bob@example.com', password_hash: 'hashed_password_3', first_name: 'Bob', last_name: 'Wilson', phone: '555-0103', date_of_birth: '1992-07-08' },
  { username: 'alice_brown', email: 'alice@example.com', password_hash: 'hashed_password_4', first_name: 'Alice', last_name: 'Brown', phone: '555-0104', date_of_birth: '1988-11-30' },
  { username: 'charlie_davis', email: 'charlie@example.com', password_hash: 'hashed_password_5', first_name: 'Charlie', last_name: 'Davis', phone: '555-0105', date_of_birth: '1995-05-12' },
  { username: 'diana_miller', email: 'diana@example.com', password_hash: 'hashed_password_6', first_name: 'Diana', last_name: 'Miller', phone: '555-0106', date_of_birth: '1991-09-18' },
  { username: 'eve_jones', email: 'eve@example.com', password_hash: 'hashed_password_7', first_name: 'Eve', last_name: 'Jones', phone: '555-0107', date_of_birth: '1987-12-03' },
  { username: 'frank_garcia', email: 'frank@example.com', password_hash: 'hashed_password_8', first_name: 'Frank', last_name: 'Garcia', phone: '555-0108', date_of_birth: '1993-04-25' },
  { username: 'grace_lee', email: 'grace@example.com', password_hash: 'hashed_password_9', first_name: 'Grace', last_name: 'Lee', phone: '555-0109', date_of_birth: '1989-08-14' },
  { username: 'henry_taylor', email: 'henry@example.com', password_hash: 'hashed_password_10', first_name: 'Henry', last_name: 'Taylor', phone: '555-0110', date_of_birth: '1994-02-07' }
];

const sampleCategories = [
  { name: 'Electronics', description: 'Electronic devices and gadgets' },
  { name: 'Clothing', description: 'Fashion and apparel' },
  { name: 'Books', description: 'Books and literature' },
  { name: 'Home & Garden', description: 'Home improvement and gardening' },
  { name: 'Sports', description: 'Sports and fitness equipment' },
  { name: 'Toys', description: 'Toys and games' },
  { name: 'Beauty', description: 'Beauty and personal care' },
  { name: 'Automotive', description: 'Car parts and accessories' }
];

const sampleProducts = [
  { name: 'iPhone 15 Pro', description: 'Latest Apple smartphone', sku: 'IPH15PRO-001', price: 999.99, cost: 600.00, category_id: 1, stock_quantity: 50 },
  { name: 'Samsung Galaxy S24', description: 'Android flagship phone', sku: 'SGS24-001', price: 899.99, cost: 550.00, category_id: 1, stock_quantity: 30 },
  { name: 'MacBook Pro M3', description: 'Professional laptop', sku: 'MBP-M3-001', price: 1999.99, cost: 1200.00, category_id: 1, stock_quantity: 25 },
  { name: 'Nike Air Max', description: 'Comfortable running shoes', sku: 'NAM-001', price: 129.99, cost: 80.00, category_id: 2, stock_quantity: 100 },
  { name: 'Adidas T-Shirt', description: 'Cotton sports t-shirt', sku: 'ATS-001', price: 29.99, cost: 15.00, category_id: 2, stock_quantity: 200 },
  { name: 'The Great Gatsby', description: 'Classic American novel', sku: 'TGG-001', price: 12.99, cost: 6.00, category_id: 3, stock_quantity: 150 },
  { name: 'Python Programming', description: 'Learn Python programming', sku: 'PP-001', price: 49.99, cost: 25.00, category_id: 3, stock_quantity: 75 },
  { name: 'Garden Hose', description: '50ft expandable garden hose', sku: 'GH-001', price: 39.99, cost: 20.00, category_id: 4, stock_quantity: 80 },
  { name: 'Yoga Mat', description: 'Non-slip yoga mat', sku: 'YM-001', price: 24.99, cost: 12.00, category_id: 5, stock_quantity: 120 },
  { name: 'LEGO Set', description: 'Classic building blocks', sku: 'LEGO-001', price: 79.99, cost: 40.00, category_id: 6, stock_quantity: 60 }
];

const sampleOrders = [
  { user_id: 1, order_number: 'ORD-001', status: 'delivered', total_amount: 1029.98, shipping_address: '123 Main St, City, State 12345', payment_method: 'credit_card', payment_status: 'paid', order_date: '2024-01-15', shipped_date: '2024-01-16', delivered_date: '2024-01-18' },
  { user_id: 2, order_number: 'ORD-002', status: 'shipped', total_amount: 929.98, shipping_address: '456 Oak Ave, City, State 12345', payment_method: 'paypal', payment_status: 'paid', order_date: '2024-01-20', shipped_date: '2024-01-21' },
  { user_id: 3, order_number: 'ORD-003', status: 'pending', total_amount: 159.98, shipping_address: '789 Pine St, City, State 12345', payment_method: 'credit_card', payment_status: 'pending', order_date: '2024-01-25' },
  { user_id: 1, order_number: 'ORD-004', status: 'delivered', total_amount: 62.98, shipping_address: '123 Main St, City, State 12345', payment_method: 'debit_card', payment_status: 'paid', order_date: '2024-02-01', shipped_date: '2024-02-02', delivered_date: '2024-02-04' },
  { user_id: 4, order_number: 'ORD-005', status: 'cancelled', total_amount: 1999.99, shipping_address: '321 Elm St, City, State 12345', payment_method: 'credit_card', payment_status: 'refunded', order_date: '2024-02-05' },
  { user_id: 5, order_number: 'ORD-006', status: 'delivered', total_amount: 104.98, shipping_address: '654 Maple Dr, City, State 12345', payment_method: 'paypal', payment_status: 'paid', order_date: '2024-02-10', shipped_date: '2024-02-11', delivered_date: '2024-02-13' },
  { user_id: 6, order_number: 'ORD-007', status: 'processing', total_amount: 39.99, shipping_address: '987 Cedar Ln, City, State 12345', payment_method: 'credit_card', payment_status: 'paid', order_date: '2024-02-15' },
  { user_id: 7, order_number: 'ORD-008', status: 'delivered', total_amount: 24.99, shipping_address: '147 Birch Rd, City, State 12345', payment_method: 'debit_card', payment_status: 'paid', order_date: '2024-02-20', shipped_date: '2024-02-21', delivered_date: '2024-02-23' },
  { user_id: 8, order_number: 'ORD-009', status: 'shipped', total_amount: 79.99, shipping_address: '258 Spruce Way, City, State 12345', payment_method: 'paypal', payment_status: 'paid', order_date: '2024-02-25', shipped_date: '2024-02-26' },
  { user_id: 9, order_number: 'ORD-010', status: 'delivered', total_amount: 1129.98, shipping_address: '369 Willow St, City, State 12345', payment_method: 'credit_card', payment_status: 'paid', order_date: '2024-03-01', shipped_date: '2024-03-02', delivered_date: '2024-03-04' }
];

const sampleOrderItems = [
  { order_id: 1, product_id: 1, quantity: 1, unit_price: 999.99 },
  { order_id: 1, product_id: 4, quantity: 1, unit_price: 29.99 },
  { order_id: 2, product_id: 2, quantity: 1, unit_price: 899.99 },
  { order_id: 2, product_id: 5, quantity: 1, unit_price: 29.99 },
  { order_id: 3, product_id: 4, quantity: 1, unit_price: 129.99 },
  { order_id: 3, product_id: 5, quantity: 1, unit_price: 29.99 },
  { order_id: 4, product_id: 6, quantity: 1, unit_price: 12.99 },
  { order_id: 4, product_id: 7, quantity: 1, unit_price: 49.99 },
  { order_id: 5, product_id: 3, quantity: 1, unit_price: 1999.99 },
  { order_id: 6, product_id: 6, quantity: 1, unit_price: 12.99 },
  { order_id: 6, product_id: 7, quantity: 1, unit_price: 49.99 },
  { order_id: 6, product_id: 8, quantity: 1, unit_price: 39.99 },
  { order_id: 7, product_id: 8, quantity: 1, unit_price: 39.99 },
  { order_id: 8, product_id: 9, quantity: 1, unit_price: 24.99 },
  { order_id: 9, product_id: 10, quantity: 1, unit_price: 79.99 },
  { order_id: 10, product_id: 1, quantity: 1, unit_price: 999.99 },
  { order_id: 10, product_id: 9, quantity: 1, unit_price: 24.99 },
  { order_id: 10, product_id: 10, quantity: 1, unit_price: 79.99 }
];

const sampleReviews = [
  { product_id: 1, user_id: 1, rating: 5, title: 'Amazing phone!', content: 'Love the new features and camera quality.', is_verified: true },
  { product_id: 1, user_id: 2, rating: 4, title: 'Great device', content: 'Good performance but battery could be better.', is_verified: true },
  { product_id: 2, user_id: 3, rating: 5, title: 'Excellent Android phone', content: 'Best Android phone I\'ve used.', is_verified: false },
  { product_id: 3, user_id: 4, rating: 5, title: 'Perfect for work', content: 'Great for programming and design work.', is_verified: true },
  { product_id: 4, user_id: 5, rating: 4, title: 'Comfortable shoes', content: 'Very comfortable for running.', is_verified: true },
  { product_id: 5, user_id: 6, rating: 3, title: 'Decent quality', content: 'Good for the price but could be better.', is_verified: false },
  { product_id: 6, user_id: 7, rating: 5, title: 'Classic literature', content: 'Must-read American classic.', is_verified: true },
  { product_id: 7, user_id: 8, rating: 4, title: 'Good programming book', content: 'Well-written and easy to follow.', is_verified: true },
  { product_id: 8, user_id: 9, rating: 4, title: 'Great garden hose', content: 'Works well and doesn\'t kink.', is_verified: false },
  { product_id: 9, user_id: 10, rating: 5, title: 'Perfect yoga mat', content: 'Non-slip and comfortable.', is_verified: true },
  { product_id: 10, user_id: 1, rating: 4, title: 'Fun LEGO set', content: 'Great for kids and adults.', is_verified: true },
  { product_id: 1, user_id: 3, rating: 3, title: 'Overpriced', content: 'Good phone but too expensive.', is_verified: false },
  { product_id: 2, user_id: 4, rating: 4, title: 'Solid choice', content: 'Good alternative to iPhone.', is_verified: true },
  { product_id: 3, user_id: 5, rating: 5, title: 'Worth every penny', content: 'Excellent laptop for professionals.', is_verified: true },
  { product_id: 4, user_id: 7, rating: 4, title: 'Good running shoes', content: 'Comfortable and durable.', is_verified: true }
];

const sampleWishlist = [
  { user_id: 1, product_id: 2 },
  { user_id: 1, product_id: 3 },
  { user_id: 2, product_id: 1 },
  { user_id: 2, product_id: 3 },
  { user_id: 3, product_id: 1 },
  { user_id: 3, product_id: 4 },
  { user_id: 4, product_id: 2 },
  { user_id: 4, product_id: 5 },
  { user_id: 5, product_id: 1 },
  { user_id: 5, product_id: 6 },
  { user_id: 6, product_id: 2 },
  { user_id: 6, product_id: 7 },
  { user_id: 7, product_id: 3 },
  { user_id: 7, product_id: 8 },
  { user_id: 8, product_id: 1 },
  { user_id: 8, product_id: 9 },
  { user_id: 9, product_id: 2 },
  { user_id: 9, product_id: 10 },
  { user_id: 10, product_id: 3 },
  { user_id: 10, product_id: 4 }
];

async function generateSampleData() {
  try {
    console.log('🔄 Syncing database...');
    await sequelize.sync({ force: true });

    console.log('👥 Creating users...');
    await User.bulkCreate(sampleUsers);

    console.log('📂 Creating categories...');
    await Category.bulkCreate(sampleCategories);

    console.log('🛍️ Creating products...');
    await Product.bulkCreate(sampleProducts);

    console.log('📦 Creating orders...');
    await Order.bulkCreate(sampleOrders);

    console.log('📋 Creating order items...');
    await OrderItem.bulkCreate(sampleOrderItems);

    console.log('⭐ Creating reviews...');
    await Review.bulkCreate(sampleReviews);

    console.log('❤️ Creating wishlist items...');
    await Wishlist.bulkCreate(sampleWishlist);

    console.log('✅ Sample data generated successfully!');
    console.log(`📊 Data summary:`);
    console.log(`   - Users: ${sampleUsers.length}`);
    console.log(`   - Categories: ${sampleCategories.length}`);
    console.log(`   - Products: ${sampleProducts.length}`);
    console.log(`   - Orders: ${sampleOrders.length}`);
    console.log(`   - Order Items: ${sampleOrderItems.length}`);
    console.log(`   - Reviews: ${sampleReviews.length}`);
    console.log(`   - Wishlist Items: ${sampleWishlist.length}`);

  } catch (error) {
    console.error('❌ Error generating sample data:', error);
  } finally {
    await sequelize.close();
  }
}

// Run the script
if (require.main === module) {
  generateSampleData();
}

module.exports = { generateSampleData };
