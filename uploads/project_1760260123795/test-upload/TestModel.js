
const { DataTypes } = require('sequelize');
module.exports = (sequelize) => {
  const TestModel = sequelize.define('TestModel', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    name: { type: DataTypes.STRING(100), allowNull: false }
  });
  return TestModel;
};