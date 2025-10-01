// Test script to upload a project with system catalog extraction
const FormData = require('form-data');
const fs = require('fs');
const fetch = require('node-fetch').default;

async function testUploadWithSystemCatalog() {
  console.log('🧪 Testing Project Upload with System Catalog Extraction');
  console.log('=======================================================');

  try {
    // Create form data
    const formData = new FormData();
    
    // Add the test database file
    const dbPath = './test.db';
    if (fs.existsSync(dbPath)) {
      formData.append('files', fs.createReadStream(dbPath));
      console.log('✅ Added test.db to upload');
    } else {
      console.log('❌ test.db not found, creating a dummy one...');
      
      // Create a simple test database
      const sqlite3 = require('sqlite3').verbose();
      const db = new sqlite3.Database(dbPath);

      db.serialize(() => {
        db.run(`CREATE TABLE IF NOT EXISTS test_users (
          id INTEGER PRIMARY KEY,
          name TEXT NOT NULL,
          email TEXT UNIQUE,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`);
        
        db.run(`CREATE TABLE IF NOT EXISTS test_posts (
          id INTEGER PRIMARY KEY,
          user_id INTEGER,
          title TEXT NOT NULL,
          content TEXT,
          FOREIGN KEY (user_id) REFERENCES test_users(id)
        )`);
        
        db.run(`CREATE INDEX idx_posts_user_id ON test_posts(user_id)`);
        
        db.run(`INSERT INTO test_users (name, email) VALUES ('Alice', 'alice@example.com')`);
        db.run(`INSERT INTO test_users (name, email) VALUES ('Bob', 'bob@example.com')`);
        db.run(`INSERT INTO test_posts (user_id, title, content) VALUES (1, 'First Post', 'Hello World!')`);
        db.run(`INSERT INTO test_posts (user_id, title, content) VALUES (2, 'Second Post', 'Another post')`);
      });

      db.close();
      console.log('✅ Created test database');
      
      // Add the created database to form data
      formData.append('files', fs.createReadStream(dbPath));
    }
    
    // Add project metadata
    formData.append('projectName', 'System Catalog Test Project');
    formData.append('projectDescription', 'Testing system catalog extraction during upload');

    console.log('📤 Uploading project...');
    
    // Upload the project
    const response = await fetch('http://localhost:3001/api/projects/upload', {
      method: 'POST',
      body: formData
    });

    const result = await response.json();
    
    if (response.ok && result.success) {
      console.log('✅ Project upload successful!');
      console.log('📊 Project details:', {
        id: result.project.id,
        name: result.project.name,
        totalTables: result.project.totalTables,
        hasSystemCatalog: !!result.project.systemCatalog
      });
      
      if (result.project.systemCatalog) {
        console.log('🎉 System Catalog Data Found!');
        console.log('📋 System Catalog Summary:', {
          databaseType: result.project.systemCatalog.metadata?.databaseType,
          version: result.project.systemCatalog.metadata?.version,
          encoding: result.project.systemCatalog.metadata?.encoding,
          tables: result.project.systemCatalog.tables?.length || 0,
          views: result.project.systemCatalog.views?.length || 0,
          indexes: result.project.systemCatalog.indexes?.length || 0,
          triggers: result.project.systemCatalog.triggers?.length || 0
        });
        
        console.log('\n📋 Detailed Table Information:');
        result.project.systemCatalog.tables?.forEach((table, index) => {
          console.log(`\n   ${index + 1}. ${table.name}`);
          console.log(`      - Columns: ${table.columns?.length || 0}`);
          console.log(`      - Row Count: ${table.statistics?.rowCount || 'Unknown'}`);
          console.log(`      - Foreign Keys: ${table.constraints?.length || 0}`);
          
          if (table.columns && table.columns.length > 0) {
            console.log('      - Sample Columns:');
            table.columns.slice(0, 3).forEach(col => {
              const constraints = [];
              if (col.primaryKey) constraints.push('PK');
              if (!col.nullable) constraints.push('NOT NULL');
              if (col.defaultValue) constraints.push(`DEFAULT ${col.defaultValue}`);
              
              console.log(`        * ${col.name}: ${col.type} ${constraints.length ? `(${constraints.join(', ')})` : ''}`);
            });
            if (table.columns.length > 3) {
              console.log(`        * ... and ${table.columns.length - 3} more columns`);
            }
          }
        });
        
        if (result.project.systemCatalog.indexes && result.project.systemCatalog.indexes.length > 0) {
          console.log('\n🔍 Index Information:');
          result.project.systemCatalog.indexes.forEach((index, i) => {
            console.log(`   ${i + 1}. ${index.name} on ${index.tableName} (${index.unique ? 'UNIQUE' : 'NON-UNIQUE'})`);
          });
        }
        
      } else {
        console.log('❌ No system catalog data found in project');
      }
      
    } else {
      console.log('❌ Project upload failed:', result.message || 'Unknown error');
    }

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Run the test
if (require.main === module) {
  testUploadWithSystemCatalog().catch(console.error);
}

module.exports = { testUploadWithSystemCatalog };
