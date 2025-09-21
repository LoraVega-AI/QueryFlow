const sqlite3 = require('sqlite3').verbose();

// Create database connection
const db = new sqlite3.Database('./test.db');

// Create users table
db.run(`CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY,
  name TEXT,
  email TEXT
)`);

// Insert sample data
db.run(`INSERT INTO users (name, email) VALUES (?, ?)`, ['Alice Johnson', 'alice@example.com']);
db.run(`INSERT INTO users (name, email) VALUES (?, ?)`, ['Bob Wilson', 'bob@example.com']);

// Query all users
db.all(`SELECT * FROM users`, [], (err, rows) => {
  if (err) {
    console.error(err.message);
  } else {
    console.log('Users:', rows);
  }
});

db.close();
