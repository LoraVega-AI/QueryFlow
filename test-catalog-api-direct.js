// Test the system catalog API directly
const fetch = require('node-fetch').default;

async function testCatalogAPIDirect() {
  console.log('🧪 Testing System Catalog API Directly');
  console.log('=======================================');

  try {
    // Test the simple API endpoint
    const response = await fetch('http://localhost:3001/api/database/system-catalog-simple', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        databaseType: 'sqlite',
        connectionInfo: { filePath: './test.db' }
      })
    });

    const result = await response.json();
    
    if (response.ok && result.success) {
      console.log('✅ System catalog API test successful!');
      console.log('📊 Result summary:', {
        databaseType: result.data.metadata.databaseType,
        version: result.data.metadata.version,
        encoding: result.data.metadata.encoding,
        tables: result.data.tables.length,
        views: result.data.views.length,
        indexes: result.data.indexes.length,
        triggers: result.data.triggers.length
      });
      
      console.log('\n📋 Table Details:');
      result.data.tables.forEach((table, index) => {
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
      
      if (result.data.indexes && result.data.indexes.length > 0) {
        console.log('\n🔍 Index Details:');
        result.data.indexes.forEach((index, i) => {
          console.log(`   ${i + 1}. ${index.name} on ${index.tableName} (${index.unique ? 'UNIQUE' : 'NON-UNIQUE'})`);
        });
      }
      
    } else {
      console.log('❌ System catalog API test failed:', result.error || 'Unknown error');
      console.log('📊 Full response:', JSON.stringify(result, null, 2));
    }

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Run the test
if (require.main === module) {
  testCatalogAPIDirect().catch(console.error);
}

module.exports = { testCatalogAPIDirect };
