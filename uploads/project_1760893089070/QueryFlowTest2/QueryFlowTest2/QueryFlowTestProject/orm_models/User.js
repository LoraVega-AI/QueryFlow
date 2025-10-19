// Sequelize User Model for QueryFlow Testing
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
      unique: true,
      validate: {
        len: [3, 50],
        notEmpty: true
      }
    },
    email: {
      type: DataTypes.STRING(100),
      allowNull: false,
      unique: true,
      validate: {
        isEmail: true,
        notEmpty: true
      }
    },
    password_hash: {
      type: DataTypes.STRING(255),
      allowNull: false,
      validate: {
        notEmpty: true
      }
    },
    first_name: {
      type: DataTypes.STRING(50),
      allowNull: true,
      validate: {
        len: [0, 50]
      }
    },
    last_name: {
      type: DataTypes.STRING(50),
      allowNull: true,
      validate: {
        len: [0, 50]
      }
    },
    phone: {
      type: DataTypes.STRING(20),
      allowNull: true,
      validate: {
        len: [0, 20]
      }
    },
    address: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    city: {
      type: DataTypes.STRING(50),
      allowNull: true,
      validate: {
        len: [0, 50]
      }
    },
    state: {
      type: DataTypes.STRING(50),
      allowNull: true,
      validate: {
        len: [0, 50]
      }
    },
    zip_code: {
      type: DataTypes.STRING(10),
      allowNull: true,
      validate: {
        len: [0, 10]
      }
    },
    country: {
      type: DataTypes.STRING(50),
      allowNull: true,
      defaultValue: 'USA',
      validate: {
        len: [0, 50]
      }
    },
    date_of_birth: {
      type: DataTypes.DATEONLY,
      allowNull: true,
      validate: {
        isDate: true
      }
    },
    is_verified: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false
    },
    is_premium: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false
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
    },
    last_login: {
      type: DataTypes.DATE,
      allowNull: true
    }
  }, {
    tableName: 'users',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
      {
        unique: true,
        fields: ['email']
      },
      {
        unique: true,
        fields: ['username']
      },
      {
        fields: ['created_at']
      },
      {
        fields: ['is_verified']
      },
      {
        fields: ['is_premium']
      }
    ],
    validate: {
      emailFormat() {
        if (this.email && !this.email.includes('@')) {
          throw new Error('Invalid email format');
        }
      }
    }
  });

  // Define associations
  User.associate = (models) => {
    // User has many Orders
    User.hasMany(models.Order, {
      foreignKey: 'user_id',
      as: 'orders'
    });

    // User has many Reviews
    User.hasMany(models.Review, {
      foreignKey: 'user_id',
      as: 'reviews'
    });

    // User has many Page Views
    User.hasMany(models.PageView, {
      foreignKey: 'user_id',
      as: 'pageViews'
    });

    // User has many Events
    User.hasMany(models.Event, {
      foreignKey: 'user_id',
      as: 'events'
    });

    // User has many User Sessions
    User.hasMany(models.UserSession, {
      foreignKey: 'user_id',
      as: 'sessions'
    });
  };

  // Instance methods
  User.prototype.getFullName = function() {
    return `${this.first_name || ''} ${this.last_name || ''}`.trim();
  };

  User.prototype.isActive = function() {
    return this.is_verified && this.last_login && 
           new Date() - new Date(this.last_login) < 30 * 24 * 60 * 60 * 1000; // 30 days
  };

  // Class methods
  User.findByEmail = function(email) {
    return this.findOne({ where: { email } });
  };

  User.findVerified = function() {
    return this.findAll({ where: { is_verified: true } });
  };

  User.findPremium = function() {
    return this.findAll({ where: { is_premium: true } });
  };

  return User;
};
