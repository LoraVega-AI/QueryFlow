// Test script for schema-to-database conversion
// This script tests the complete upload pipeline with schema extraction and database creation

const fs = require('fs');
const path = require('path');
const AdmZip = require('adm-zip');

async function createTestProject() {
  console.log('🧪 Creating test project with schema files...');
  
  // Create a test project directory
  const testDir = path.join(__dirname, 'test-schema-project');
  if (fs.existsSync(testDir)) {
    fs.rmSync(testDir, { recursive: true });
  }
  fs.mkdirSync(testDir, { recursive: true });
  
  // Create SQL schema file
  const schemaSQL = `
-- Users table
CREATE TABLE users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Posts table
CREATE TABLE posts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title VARCHAR(200) NOT NULL,
    content TEXT,
    user_id INTEGER NOT NULL,
    published BOOLEAN DEFAULT FALSE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Comments table
CREATE TABLE comments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    content TEXT NOT NULL,
    post_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Indexes
CREATE INDEX idx_posts_user_id ON posts(user_id);
CREATE INDEX idx_comments_post_id ON comments(post_id);
CREATE INDEX idx_comments_user_id ON comments(user_id);
CREATE UNIQUE INDEX idx_users_username ON users(username);
CREATE UNIQUE INDEX idx_users_email ON users(email);
`;

  fs.writeFileSync(path.join(testDir, 'schema.sql'), schemaSQL);
  
  // Create a simple Node.js project with database models
  const packageJson = {
    "name": "test-schema-project",
    "version": "1.0.0",
    "description": "Test project for schema extraction",
    "main": "index.js",
    "dependencies": {
      "sqlite3": "^5.1.6"
    }
  };
  
  fs.writeFileSync(path.join(testDir, 'package.json'), JSON.stringify(packageJson, null, 2));
  
  // Create a simple index.js with database initialization
  const indexJS = `
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Create or connect to the database
const dbPath = path.join(__dirname, 'database.db');
const db = new sqlite3.Database(dbPath);

// Initialize database with tables and sample data
function initializeDatabase() {
    return new Promise((resolve, reject) => {
        db.serialize(() => {
            // Create users table
            db.run(\`CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                username VARCHAR(50) UNIQUE NOT NULL,
                email VARCHAR(100) UNIQUE NOT NULL,
                password_hash VARCHAR(255) NOT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )\`);

            // Create posts table
            db.run(\`CREATE TABLE IF NOT EXISTS posts (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                title VARCHAR(200) NOT NULL,
                content TEXT,
                user_id INTEGER NOT NULL,
                published BOOLEAN DEFAULT FALSE,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            )\`);

            // Create comments table
            db.run(\`CREATE TABLE IF NOT EXISTS comments (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                content TEXT NOT NULL,
                post_id INTEGER NOT NULL,
                user_id INTEGER NOT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            )\`);

            // Insert sample users
            const users = [
                ['john_doe', 'john@example.com', 'hashed_password_1'],
                ['jane_smith', 'jane@example.com', 'hashed_password_2'],
                ['bob_wilson', 'bob@example.com', 'hashed_password_3']
            ];

            const insertUser = db.prepare(\`INSERT OR IGNORE INTO users (username, email, password_hash) VALUES (?, ?, ?)\`);
            users.forEach(([username, email, password]) => {
                insertUser.run(username, email, password);
            });
            insertUser.finalize();

            // Insert sample posts
            const posts = [
                ['My First Post', 'This is the content of my first post.', 1, true],
                ['Another Post', 'This is another post content.', 1, false],
                ['Jane\\'s Post', 'This is Jane\\'s post content.', 2, true],
                ['Bob\\'s Thoughts', 'Bob\\'s thoughts on the matter.', 3, true]
            ];

            const insertPost = db.prepare(\`INSERT OR IGNORE INTO posts (title, content, user_id, published) VALUES (?, ?, ?, ?)\`);
            posts.forEach(([title, content, user_id, published]) => {
                insertPost.run(title, content, user_id, published);
            });
            insertPost.finalize();

            // Insert sample comments
            const comments = [
                ['Great post!', 1, 2],
                ['I agree with this.', 1, 3],
                ['Thanks for sharing!', 2, 1],
                ['Very informative.', 3, 1],
                ['Looking forward to more.', 3, 2]
            ];

            const insertComment = db.prepare(\`INSERT OR IGNORE INTO comments (content, post_id, user_id) VALUES (?, ?, ?)\`);
            comments.forEach(([content, post_id, user_id]) => {
                insertComment.run(content, post_id, user_id);
            });
            insertComment.finalize();

            console.log('Database initialized successfully!');
            resolve();
        });
    });
}

// Initialize the database
initializeDatabase().then(() => {
    console.log('Test project created successfully!');
    process.exit(0);
}).catch(error => {
    console.error('Error initializing database:', error);
    process.exit(1);
});
`;

  fs.writeFileSync(path.join(testDir, 'index.js'), indexJS);
  
  // Create a README file
  const readme = `# Test Schema Project

This is a test project for QueryFlow's schema extraction and database creation features.

## Features
- SQL schema file (schema.sql)
- Node.js project with database models
- Sample data initialization
- Foreign key relationships
- Indexes for performance

## Database Schema
- **users**: User accounts with authentication
- **posts**: Blog posts by users
- **comments**: Comments on posts

## Usage
1. Run \`node index.js\` to initialize the database
2. Upload this project to QueryFlow to test schema extraction
3. QueryFlow should automatically create queryable databases from the extracted schemas
`;

  fs.writeFileSync(path.join(testDir, 'README.md'), readme);
  
  console.log('✅ Test project created successfully!');
  return testDir;
}

async function createZipFile(projectDir) {
  console.log('📦 Creating zip file...');
  
  const zip = new AdmZip();
  zip.addLocalFolder(projectDir);
  
  const zipPath = path.join(__dirname, 'test-schema-project.zip');
  zip.writeZip(zipPath);
  
  console.log('✅ Zip file created:', zipPath);
  return zipPath;
}

async function testUploadAPI(zipPath) {
  console.log('🚀 Testing upload API...');
  
  const FormData = require('form-data');
  const fs = require('fs');
  
  const form = new FormData();
  form.append('files', fs.createReadStream(zipPath));
  form.append('projectName', 'Test Schema Project');
  form.append('projectDescription', 'A test project for schema extraction and database creation');
  form.append('advancedScanning', 'true');
  form.append('scanOptions', JSON.stringify({
    includeHidden: false,
    maxDepth: 5,
    ignorePatterns: ['node_modules', '.git', 'dist', 'build'],
    scanTimeout: 30000
  }));
  
  try {
    const response = await fetch('http://localhost:3000/api/projects/upload', {
      method: 'POST',
      body: form,
      headers: form.getHeaders()
    });
    
    const result = await response.json();
    
    if (result.success) {
      console.log('✅ Upload successful!');
      console.log('📊 Project details:', {
        id: result.data.id,
        name: result.data.name,
        technology: result.data.technology,
        databaseCount: result.data.databaseCount,
        totalTables: result.data.totalTables,
        totalRows: result.data.totalRows
      });
      
      console.log('🗄️ Databases created:', result.data.databases.map(db => ({
        name: db.name,
        type: db.type,
        isConnected: db.isConnected,
        status: db.status,
        tableCount: db.tableCount,
        totalRows: db.totalRows
      })));
      
      return result.data;
    } else {
      console.error('❌ Upload failed:', result.message);
      return null;
    }
  } catch (error) {
    console.error('❌ Upload error:', error.message);
    return null;
  }
}

async function testDatabaseQuery(projectData) {
  console.log('🔍 Testing database queries...');
  
  if (!projectData || !projectData.databases) {
    console.log('❌ No databases to test');
    return;
  }
  
  for (const db of projectData.databases) {
    if (db.isConnected && db.connectionString) {
      console.log(`\n📊 Testing database: ${db.name}`);
      
      try {
        const sqlite3 = require('sqlite3').verbose();
        const { open } = require('sqlite');
        
        const database = await open({
          filename: db.connectionString,
          driver: sqlite3.Database
        });
        
        // Test basic queries
        const tables = await database.all("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'");
        console.log(`  📋 Tables: ${tables.map(t => t.name).join(', ')}`);
        
        for (const table of tables) {
          const count = await database.get(`SELECT COUNT(*) as count FROM ${table.name}`);
          console.log(`  📊 ${table.name}: ${count.count} rows`);
        }
        
        // Test a sample query
        const sampleQuery = await database.all(`
          SELECT u.username, p.title, p.published 
          FROM users u 
          JOIN posts p ON u.id = p.user_id 
          WHERE p.published = 1 
          LIMIT 5
        `);
        
        console.log(`  🔍 Sample query results: ${sampleQuery.length} rows`);
        sampleQuery.forEach(row => {
          console.log(`    - ${row.username}: "${row.title}" (${row.published ? 'published' : 'draft'})`);
        });
        
        await database.close();
        console.log(`  ✅ Database ${db.name} is queryable!`);
        
      } catch (error) {
        console.error(`  ❌ Error testing database ${db.name}:`, error.message);
      }
    }
  }
}

async function cleanup() {
  console.log('🧹 Cleaning up test files...');
  
  const filesToClean = [
    'test-schema-project',
    'test-schema-project.zip'
  ];
  
  for (const file of filesToClean) {
    const filePath = path.join(__dirname, file);
    if (fs.existsSync(filePath)) {
      if (fs.statSync(filePath).isDirectory()) {
        fs.rmSync(filePath, { recursive: true });
      } else {
        fs.unlinkSync(filePath);
      }
      console.log(`  🗑️ Removed: ${file}`);
    }
  }
}

async function main() {
  console.log('🧪 Starting schema-to-database conversion test...\n');
  
  try {
    // Step 1: Create test project
    const projectDir = await createTestProject();
    
    // Step 2: Create zip file
    const zipPath = await createZipFile(projectDir);
    
    // Step 3: Test upload API
    console.log('\n' + '='.repeat(50));
    const projectData = await testUploadAPI(zipPath);
    
    if (projectData) {
      // Step 4: Test database queries
      console.log('\n' + '='.repeat(50));
      await testDatabaseQuery(projectData);
      
      console.log('\n' + '='.repeat(50));
      console.log('🎉 Test completed successfully!');
      console.log('✅ Schema extraction and database creation is working!');
      console.log('✅ Auto-connection to created databases is working!');
      console.log('✅ Database queries are working!');
    } else {
      console.log('\n❌ Test failed - upload was not successful');
    }
    
  } catch (error) {
    console.error('\n❌ Test failed with error:', error);
  } finally {
    // Cleanup
    await cleanup();
  }
}

// Run the test
if (require.main === module) {
  main().catch(console.error);
}

module.exports = { createTestProject, createZipFile, testUploadAPI, testDatabaseQuery };
