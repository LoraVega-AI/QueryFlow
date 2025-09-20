
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Post = sequelize.define('Post', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'user_id',
      references: {
        model: 'users',
        key: 'id'
      }
    },
    title: {
      type: DataTypes.STRING(200),
      allowNull: false
    },
    content: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    published: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    }
  }, {
    tableName: 'posts',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  });

  Post.associate = (models) => {
    Post.belongsTo(models.User, { foreignKey: 'user_id' });
    Post.hasMany(models.Comment, { foreignKey: 'post_id' });
  };

  return Post;
};
