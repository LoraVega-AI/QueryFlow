const { extractDatabaseDefinitionsFromSourceCode } = require('./src/app/api/projects/upload/simpleExtraction.js');

async function testSimpleExtraction() {
  try {
    console.log('🧪 Testing simple extraction...');
    
    const allFiles = [
      'test-project/models/User.js',
      'test-project/models/Product.js',
      'test-project/users.sql'
    ];
    
    const uploadDir = 'test-project';
    
    const result = await extractDatabaseDefinitionsFromSourceCode(allFiles, uploadDir);
    
    console.log('🎉 Simple extraction result:', {
      success: !!result,
      databasesCount: result?.length || 0,
      tablesCount: result?.[0]?.tables?.length || 0
    });
    
    if (result && result.length > 0) {
      console.log('📊 Extracted databases:');
      result.forEach((db, index) => {
        console.log(`  ${index + 1}. ${db.name} (${db.type}) - ${db.tables?.length || 0} tables`);
        if (db.tables && db.tables.length > 0) {
          db.tables.forEach(table => {
            console.log(`    - ${table.name}: ${table.columns?.length || 0} columns`);
          });
        }
      });
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('❌ Stack:', error.stack);
  }
}

testSimpleExtraction();
