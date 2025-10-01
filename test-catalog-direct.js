const { extractSQLiteSystemCatalog } = require('./src/services/extraction/systemCatalogExtractor.js');

async function testDirectCatalog() {
  console.log('🧪 Testing Direct System Catalog Extraction');
  console.log('==========================================');
  
  try {
    const dbPath = './test.db';
    console.log(`📁 Testing with database: ${dbPath}`);
    
    const result = await extractSQLiteSystemCatalog(dbPath);
    console.log('✅ System catalog extraction successful!');
    console.log('📊 Result:', JSON.stringify(result, null, 2));
    
  } catch (error) {
    console.error('❌ System catalog extraction failed:', error);
    console.error('❌ Error details:', error.message);
    console.error('❌ Error stack:', error.stack);
  }
}

testDirectCatalog();