// Test the system catalog extraction function in a context similar to the API route
async function testApiContext() {
  try {
    console.log('🧪 Testing system catalog extraction in API context...');
    
    // Create a simple test database
    const testDbPath = 'test-api-context.db';
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
    
    // Test the system catalog extraction function
    console.log('🔍 Testing system catalog extraction...');
    const { extractSQLiteSystemCatalog } = require('./src/services/extraction/systemCatalogExtractor.js');
    console.log('✅ Function imported successfully');
    
    const result = await extractSQLiteSystemCatalog(testDbPath);
    console.log('✅ System catalog extraction successful!');
    console.log('📊 Result:', JSON.stringify(result, null, 2));
    
    // Clean up
    fs.unlinkSync(testDbPath);
    console.log('🧹 Cleaned up test database');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    console.error('❌ Error details:', error.message);
    console.error('❌ Error stack:', error.stack);
  }
}

testApiContext();
