const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const User = sequelize.define('User', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    username: {
      type: DataTypes.STRING(50),
      allowNull: false,
      unique: true
    },
    email: {
      type: DataTypes.STRING(100),
      allowNull: false,
      unique: true
    },
    password_hash: {
      type: DataTypes.STRING(255),
      allowNull: false
    },
    first_name: {
      type: DataTypes.STRING(50),
      allowNull: true
    },
    last_name: {
      type: DataTypes.STRING(50),
      allowNull: true
    },
    phone: {
      type: DataTypes.STRING(20),
      allowNull: true
    },
    date_of_birth: {
      type: DataTypes.DATEONLY,
      allowNull: true
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
    tableName: 'users',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
      {
        name: 'idx_users_email',
        fields: ['email']
      },
      {
        name: 'idx_users_username',
        fields: ['username']
      }
    ]
  });

  User.associate = (models) => {
    // One-to-many relationship with Orders
    User.hasMany(models.Order, {
      foreignKey: 'user_id',
      as: 'orders'
    });

    // One-to-many relationship with Reviews
    User.hasMany(models.Review, {
      foreignKey: 'user_id',
      as: 'reviews'
    });

    // Many-to-many relationship with Products through Wishlist
    User.belongsToMany(models.Product, {
      through: models.Wishlist,
      foreignKey: 'user_id',
      otherKey: 'product_id',
      as: 'wishlist_products'
    });
  };

  return User;
};
