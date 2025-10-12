const { Sequelize } = require('sequelize');

const sequelize = new Sequelize({
  dialect: 'sqlite',
  storage: './database.sqlite',
  logging: false, // Set to console.log to see SQL queries
  define: {
    timestamps: false, // Disable automatic timestamps to control column count
    underscored: true,
    freezeTableName: true
  }
});

module.exports = sequelize;
