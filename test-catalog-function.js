// Test the system catalog extraction function directly
const { extractSQLiteSystemCatalog } = require('./src/services/extraction/systemCatalogExtractor');

async function testCatalogFunction() {
  console.log('🧪 Testing System Catalog Extraction Function');
  console.log('==============================================');

  try {
    const result = await extractSQLiteSystemCatalog('./test.db');
    
    console.log('✅ System catalog extraction successful!');
    console.log('📊 Result summary:', {
      databaseType: result.metadata.databaseType,
      version: result.metadata.version,
      encoding: result.metadata.encoding,
      tables: result.tables.length,
      views: result.views.length,
      indexes: result.indexes.length,
      triggers: result.triggers.length
    });
    
    console.log('\n📋 Table Details:');
    result.tables.forEach((table, index) => {
      console.log(`\n   ${index + 1}. ${table.name}`);
      console.log(`      - Columns: ${table.columns.length}`);
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
    
    if (result.indexes && result.indexes.length > 0) {
      console.log('\n🔍 Index Details:');
      result.indexes.forEach((index, i) => {
        console.log(`   ${i + 1}. ${index.name} on ${index.tableName} (${index.unique ? 'UNIQUE' : 'NON-UNIQUE'})`);
      });
    }
    
  } catch (error) {
    console.error('❌ System catalog extraction failed:', error.message);
    console.error('Stack trace:', error.stack);
  }
}

// Run the test
if (require.main === module) {
  testCatalogFunction().catch(console.error);
}

module.exports = { testCatalogFunction };
