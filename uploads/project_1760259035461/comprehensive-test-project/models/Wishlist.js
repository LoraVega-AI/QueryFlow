const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Wishlist = sequelize.define('Wishlist', {
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
    product_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'products',
        key: 'id'
      }
    },
    added_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    }
  }, {
    tableName: 'wishlist',
    timestamps: true,
    createdAt: 'added_at',
    updatedAt: false,
    indexes: [
      {
        name: 'idx_wishlist_user',
        fields: ['user_id']
      },
      {
        name: 'idx_wishlist_product',
        fields: ['product_id']
      }
    ],
    // Unique constraint on user_id and product_id combination
    uniqueKeys: {
      unique_user_product_wishlist: {
        fields: ['user_id', 'product_id']
      }
    }
  });

  Wishlist.associate = (models) => {
    // Many-to-one relationship with User
    Wishlist.belongsTo(models.User, {
      foreignKey: 'user_id',
      as: 'user'
    });

    // Many-to-one relationship with Product
    Wishlist.belongsTo(models.Product, {
      foreignKey: 'product_id',
      as: 'product'
    });
  };

  return Wishlist;
};
