const fs = require('fs');
const path = require('path');

// Test the system catalog extraction function directly
async function testCatalogExtraction() {
  try {
    console.log('🧪 Testing system catalog extraction...');
    
    // Import the function
    const { extractSQLiteSystemCatalog } = require('./src/services/extraction/systemCatalogExtractor.js');
    console.log('✅ Function imported successfully');
    
    // Test with the uploaded database file
    const dbPath = 'C:\\Users\\Lenovo\\Documents\\GitHub\\QueryFlow\\uploads\\project_1759083156859\\test.db';
    console.log('🔍 Testing with database:', dbPath);
    
    // Check if file exists
    if (!fs.existsSync(dbPath)) {
      console.error('❌ Database file does not exist:', dbPath);
      return;
    }
    
    console.log('✅ Database file exists');
    
    // Try to extract system catalog
    const result = await extractSQLiteSystemCatalog(dbPath);
    console.log('✅ System catalog extraction successful!');
    console.log('📊 Result:', JSON.stringify(result, null, 2));
    
  } catch (error) {
    console.error('❌ System catalog extraction failed:', error);
    console.error('❌ Error details:', error.message);
    console.error('❌ Error stack:', error.stack);
  }
}

testCatalogExtraction();
