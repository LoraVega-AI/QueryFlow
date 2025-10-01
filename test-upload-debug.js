const fs = require('fs');
const FormData = require('form-data');

async function testUploadWithDebug() {
  try {
    console.log('🧪 Testing upload with debug...');
    
    // Create a simple test database
    const testDbPath = 'test-debug.db';
    const sqlite3 = require('sqlite3');
    const { open } = require('sqlite');
    
    // Create a test database
    const db = await open({
      filename: testDbPath,
      driver: sqlite3.Database
    });
    
    await db.exec(`
      CREATE TABLE test_users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL
      );
      
      INSERT INTO test_users (name, email) VALUES 
        ('John Doe', 'john@example.com'),
        ('Jane Smith', 'jane@example.com');
    `);
    
    await db.close();
    console.log('✅ Test database created');
    
    // Create form data
    const form = new FormData();
    form.append('file', fs.createReadStream(testDbPath));
    form.append('projectName', 'Debug Test Project');
    
    // Upload the file
    console.log('📤 Uploading file...');
    const response = await fetch('http://localhost:3000/api/projects/upload', {
      method: 'POST',
      body: form
    });
    
    if (!response.ok) {
      throw new Error(`Upload failed: ${response.status} ${response.statusText}`);
    }
    
    const result = await response.json();
    console.log('✅ Upload successful!');
    
    // Check the response
    console.log('📊 Response details:');
    console.log('- testValue:', result.project?.testValue);
    console.log('- testSqliteFilesCount:', result.project?.testSqliteFilesCount);
    console.log('- testCatalogResult:', result.project?.testCatalogResult);
    console.log('- systemCatalog:', result.project?.systemCatalog ? 'PRESENT' : 'NULL');
    
    if (result.project?.systemCatalog) {
      console.log('📊 System catalog data:');
      console.log('- Tables:', result.project.systemCatalog.tables?.length || 0);
      console.log('- Views:', result.project.systemCatalog.views?.length || 0);
      console.log('- Indexes:', result.project.systemCatalog.indexes?.length || 0);
      console.log('- Database type:', result.project.systemCatalog.metadata?.databaseType);
      console.log('- Version:', result.project.systemCatalog.metadata?.version);
    }
    
    // Clean up
    fs.unlinkSync(testDbPath);
    console.log('🧹 Cleaned up test database');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

testUploadWithDebug();
