const fs = require('fs');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();

// Create a simple test database for manual testing
function createSimpleTestDatabase() {
  const dbPath = path.join(__dirname, 'manual-test.db');
  
  // Remove existing test database if it exists
  if (fs.existsSync(dbPath)) {
    fs.unlinkSync(dbPath);
  }
  
  const db = new sqlite3.Database(dbPath);
  
  return new Promise((resolve, reject) => {
    db.serialize(() => {
      // Create a simple users table
      db.run(`
        CREATE TABLE users (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name VARCHAR(100) NOT NULL,
          email VARCHAR(100) UNIQUE NOT NULL,
          age INTEGER,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);
      
      // Create a simple posts table
      db.run(`
        CREATE TABLE posts (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          title VARCHAR(200) NOT NULL,
          content TEXT,
          user_id INTEGER NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users(id)
        )
      `);
      
      // Insert sample data
      db.run(`
        INSERT INTO users (name, email, age) VALUES
        ('John Doe', 'john@example.com', 30),
        ('Jane Smith', 'jane@example.com', 25),
        ('Bob Wilson', 'bob@example.com', 35)
      `);
      
      db.run(`
        INSERT INTO posts (title, content, user_id) VALUES
        ('Hello World', 'This is my first post!', 1),
        ('Database Testing', 'Testing SQLite database upload', 1),
        ('QueryFlow Rocks', 'QueryFlow is amazing!', 2),
        ('SQLite Integration', 'Working with SQLite databases', 3)
      `);
      
      db.close((err) => {
        if (err) {
          reject(err);
        } else {
          console.log('✅ Manual test database created:', dbPath);
          console.log('📊 Database contains:');
          console.log('  - users table (3 records)');
          console.log('  - posts table (4 records)');
          console.log('  - Foreign key relationship');
          console.log('\n🎯 You can now upload this database file to test the upload workflow!');
          resolve(dbPath);
        }
      });
    });
  });
}

// Main execution
async function main() {
  try {
    console.log('🚀 Creating manual test database...\n');
    await createSimpleTestDatabase();
    
    console.log('\n📋 Manual Test Instructions:');
    console.log('1. Start the QueryFlow development server: npm run dev');
    console.log('2. Open the application in your browser');
    console.log('3. Go to the Projects tab');
    console.log('4. Click "Upload Database" or the upload button');
    console.log('5. Select the "manual-test.db" file from this directory');
    console.log('6. Verify the database appears in the Projects list');
    console.log('7. Check that the schema is displayed correctly in Schema Designer');
    console.log('8. Try querying the data in Query Runner');
    
  } catch (error) {
    console.error('❌ Failed to create test database:', error.message);
    process.exit(1);
  }
}

main().catch(console.error);
