module.exports = {
  database: {
    filename: './database.sqlite'
  },
  server: {
    port: 3000,
    env: 'development'
  },
  jwt: {
    secret: 'your-super-secret-jwt-key-here'
  }
};
