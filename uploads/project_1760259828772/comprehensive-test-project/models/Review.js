const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Review = sequelize.define('Review', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    product_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'products',
        key: 'id'
      }
    },
    user_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id'
      }
    },
    rating: {
      type: DataTypes.INTEGER,
      allowNull: false,
      validate: {
        min: 1,
        max: 5
      }
    },
    title: {
      type: DataTypes.STRING(200),
      allowNull: true
    },
    content: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    is_verified: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false
    },
    created_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    }
  }, {
    tableName: 'reviews',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: false,
    indexes: [
      {
        name: 'idx_reviews_product',
        fields: ['product_id']
      },
      {
        name: 'idx_reviews_user',
        fields: ['user_id']
      },
      {
        name: 'idx_reviews_rating',
        fields: ['rating']
      }
    ],
    // Unique constraint on product_id and user_id combination
    uniqueKeys: {
      unique_user_product_review: {
        fields: ['product_id', 'user_id']
      }
    }
  });

  Review.associate = (models) => {
    // Many-to-one relationship with Product
    Review.belongsTo(models.Product, {
      foreignKey: 'product_id',
      as: 'product'
    });

    // Many-to-one relationship with User
    Review.belongsTo(models.User, {
      foreignKey: 'user_id',
      as: 'user'
    });
  };

  return Review;
};
