const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Product = sequelize.define('Product', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    name: {
      type: DataTypes.STRING(200),
      allowNull: false
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    sku: {
      type: DataTypes.STRING(50),
      allowNull: false,
      unique: true
    },
    price: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false
    },
    cost: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true
    },
    category_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'categories',
        key: 'id'
      }
    },
    stock_quantity: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true
    },
    created_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    },
    updated_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    }
  }, {
    tableName: 'products',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
      {
        name: 'idx_products_category',
        fields: ['category_id']
      },
      {
        name: 'idx_products_sku',
        fields: ['sku']
      },
      {
        name: 'idx_products_price',
        fields: ['price']
      }
    ]
  });

  Product.associate = (models) => {
    // Many-to-one relationship with Category
    Product.belongsTo(models.Category, {
      foreignKey: 'category_id',
      as: 'category'
    });

    // One-to-many relationship with Reviews
    Product.hasMany(models.Review, {
      foreignKey: 'product_id',
      as: 'reviews'
    });

    // Many-to-many relationship with Orders through OrderItems
    Product.belongsToMany(models.Order, {
      through: models.OrderItem,
      foreignKey: 'product_id',
      otherKey: 'order_id',
      as: 'orders'
    });

    // Many-to-many relationship with Users through Wishlist
    Product.belongsToMany(models.User, {
      through: models.Wishlist,
      foreignKey: 'product_id',
      otherKey: 'user_id',
      as: 'wishlist_users'
    });
  };

  return Product;
};
