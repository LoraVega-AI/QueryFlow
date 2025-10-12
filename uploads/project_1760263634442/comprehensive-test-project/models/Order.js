const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Order = sequelize.define('Order', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    user_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id'
      }
    },
    order_number: {
      type: DataTypes.STRING(20),
      allowNull: false,
      unique: true
    },
    status: {
      type: DataTypes.STRING(20),
      allowNull: false,
      defaultValue: 'pending'
    },
    total_amount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false
    },
    shipping_address: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    billing_address: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    payment_method: {
      type: DataTypes.STRING(50),
      allowNull: true
    },
    payment_status: {
      type: DataTypes.STRING(20),
      allowNull: false,
      defaultValue: 'pending'
    },
    order_date: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    },
    shipped_date: {
      type: DataTypes.DATE,
      allowNull: true
    },
    delivered_date: {
      type: DataTypes.DATE,
      allowNull: true
    }
  }, {
    tableName: 'orders',
    timestamps: false,
    indexes: [
      {
        name: 'idx_orders_user',
        fields: ['user_id']
      },
      {
        name: 'idx_orders_status',
        fields: ['status']
      },
      {
        name: 'idx_orders_date',
        fields: ['order_date']
      }
    ]
  });

  Order.associate = (models) => {
    // Many-to-one relationship with User
    Order.belongsTo(models.User, {
      foreignKey: 'user_id',
      as: 'user'
    });

    // One-to-many relationship with OrderItems
    Order.hasMany(models.OrderItem, {
      foreignKey: 'order_id',
      as: 'order_items'
    });

    // Many-to-many relationship with Products through OrderItems
    Order.belongsToMany(models.Product, {
      through: models.OrderItem,
      foreignKey: 'order_id',
      otherKey: 'product_id',
      as: 'products'
    });
  };

  return Order;
};
