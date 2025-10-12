const { Sequelize } = require('sequelize');
const path = require('path');

// Initialize Sequelize with SQLite
const sequelize = new Sequelize({
  dialect: 'sqlite',
  storage: path.join(__dirname, 'comprehensive_test.db'),
  logging: false, // Set to console.log to see SQL queries
  define: {
    freezeTableName: true,
    underscored: true
  }
});

// Import all models
const User = require('./models/User')(sequelize);
const Category = require('./models/Category')(sequelize);
const Product = require('./models/Product')(sequelize);
const Order = require('./models/Order')(sequelize);
const Review = require('./models/Review')(sequelize);
const OrderItem = require('./models/OrderItem')(sequelize);
const Wishlist = require('./models/Wishlist')(sequelize);

// Set up associations
User.associate({ User, Category, Product, Order, Review, OrderItem, Wishlist });
Category.associate({ User, Category, Product, Order, Review, OrderItem, Wishlist });
Product.associate({ User, Category, Product, Order, Review, OrderItem, Wishlist });
Order.associate({ User, Category, Product, Order, Review, OrderItem, Wishlist });
Review.associate({ User, Category, Product, Order, Review, OrderItem, Wishlist });
OrderItem.associate({ User, Category, Product, Order, Review, OrderItem, Wishlist });
Wishlist.associate({ User, Category, Product, Order, Review, OrderItem, Wishlist });

// Export models and sequelize instance
module.exports = {
  sequelize,
  User,
  Category,
  Product,
  Order,
  Review,
  OrderItem,
  Wishlist
};
