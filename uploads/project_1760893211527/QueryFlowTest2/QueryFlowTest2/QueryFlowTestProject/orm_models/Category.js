// Sequelize Category Model for QueryFlow Testing
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Category = sequelize.define('Category', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    name: {
      type: DataTypes.STRING(100),
      allowNull: false,
      validate: {
        notEmpty: true,
        len: [1, 100]
      }
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    parent_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'categories',
        key: 'id'
      }
    },
    slug: {
      type: DataTypes.STRING(100),
      allowNull: false,
      unique: true,
      validate: {
        notEmpty: true,
        isSlug: function(value) {
          if (!/^[a-z0-9-]+$/.test(value)) {
            throw new Error('Slug must contain only lowercase letters, numbers, and hyphens');
          }
        }
      }
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true
    },
    sort_order: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      validate: {
        min: 0
      }
    },
    created_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    }
  }, {
    tableName: 'categories',
    timestamps: false,
    indexes: [
      {
        fields: ['parent_id']
      },
      {
        unique: true,
        fields: ['slug']
      },
      {
        fields: ['is_active']
      },
      {
        fields: ['sort_order']
      }
    ]
  });

  // Define associations
  Category.associate = (models) => {
    // Self-referencing relationship (parent/child)
    Category.belongsTo(models.Category, {
      foreignKey: 'parent_id',
      as: 'parent'
    });
    
    Category.hasMany(models.Category, {
      foreignKey: 'parent_id',
      as: 'children'
    });

    // Category has many Products
    Category.hasMany(models.Product, {
      foreignKey: 'category_id',
      as: 'products'
    });
  };

  // Instance methods
  Category.prototype.getFullPath = function() {
    if (this.parent) {
      return `${this.parent.getFullPath()} > ${this.name}`;
    }
    return this.name;
  };

  Category.prototype.isLeaf = function() {
    return this.children && this.children.length === 0;
  };

  Category.prototype.getProductCount = function() {
    return this.products ? this.products.length : 0;
  };

  // Class methods
  Category.findActive = function() {
    return this.findAll({ where: { is_active: true } });
  };

  Category.findRootCategories = function() {
    return this.findAll({ 
      where: { parent_id: null, is_active: true },
      order: [['sort_order', 'ASC']]
    });
  };

  Category.findBySlug = function(slug) {
    return this.findOne({ where: { slug } });
  };

  Category.getHierarchy = function() {
    return this.findAll({
      where: { is_active: true },
      include: [{
        model: this,
        as: 'children',
        where: { is_active: true },
        required: false
      }],
      order: [['sort_order', 'ASC']]
    });
  };

  return Category;
};
