
module.exports = {
  development: {
    username: process.env.DB_USERNAME || 'testuser',
    password: process.env.DB_PASSWORD || 'testpass',
    database: process.env.DB_NAME || 'testdb',
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    dialect: 'sqlite',
    storage: './database.sqlite'
  },
  production: {
    username: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    dialect: 'postgres'
  }
};
