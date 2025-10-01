// Test script for system catalog extraction functionality
const path = require('path');

// Import the extractor using dynamic import for ES modules
async function loadExtractor() {
  try {
    const module = await import('./src/services/databaseDefinitionExtractor.ts');
    return module.DatabaseDefinitionExtractor;
  } catch (error) {
    console.error('Failed to load extractor:', error.message);
    return null;
  }
}

async function testSystemCatalogExtraction() {
  console.log('🧪 Testing System Catalog Extraction Pipeline');
  console.log('===============================================');
  
  const DatabaseDefinitionExtractor = await loadExtractor();
  if (!DatabaseDefinitionExtractor) {
    console.error('❌ Failed to load DatabaseDefinitionExtractor');
    return;
  }
  
  const extractor = new DatabaseDefinitionExtractor();
  
  try {
    // Test 1: SQLite system catalog extraction
    console.log('\n📊 Test 1: SQLite System Catalog Extraction');
    console.log('--------------------------------------------');
    
    const sqliteTestFiles = [
      'test.db',
      'queryflow_app.db',
      'manual-test.db',
      'test_full.db'
    ];
    
    for (const dbFile of sqliteTestFiles) {
      const dbPath = path.join(__dirname, dbFile);
      try {
        console.log(`\n🔍 Testing SQLite extraction from: ${dbFile}`);
        const result = await extractor.extractSystemCatalog('sqlite', { filePath: dbPath });
        
        console.log(`✅ Successfully extracted from ${dbFile}:`);
        console.log(`   - Tables: ${result.tables.length}`);
        console.log(`   - Views: ${result.views.length}`);
        console.log(`   - Indexes: ${result.indexes.length}`);
        console.log(`   - Triggers: ${result.triggers.length}`);
        console.log(`   - Database Type: ${result.metadata.databaseType}`);
        console.log(`   - Version: ${result.metadata.version}`);
        
        // Show sample table details
        if (result.tables.length > 0) {
          const sampleTable = result.tables[0];
          console.log(`   - Sample table "${sampleTable.name}" has ${sampleTable.columns.length} columns`);
          if (sampleTable.columns.length > 0) {
            console.log(`     - Sample column: ${sampleTable.columns[0].name} (${sampleTable.columns[0].type})`);
          }
        }
        
      } catch (error) {
        console.log(`⚠️  Failed to extract from ${dbFile}: ${error.message}`);
      }
    }
    
    // Test 2: Test with a comprehensive database
    console.log('\n📊 Test 2: Comprehensive Database Test');
    console.log('--------------------------------------');
    
    const comprehensiveDbPath = path.join(__dirname, 'comprehensive-test-project', 'law_database.sqlite');
    try {
      console.log(`\n🔍 Testing comprehensive extraction from: law_database.sqlite`);
      const result = await extractor.extractSystemCatalog('sqlite', { filePath: comprehensiveDbPath });
      
      console.log(`✅ Comprehensive extraction results:`);
      console.log(`   - Tables: ${result.tables.length}`);
      console.log(`   - Views: ${result.views.length}`);
      console.log(`   - Indexes: ${result.indexes.length}`);
      console.log(`   - Triggers: ${result.triggers.length}`);
      
      // Show detailed table information
      console.log('\n📋 Detailed Table Information:');
      result.tables.forEach((table, index) => {
        console.log(`   ${index + 1}. ${table.name}`);
        console.log(`      - Columns: ${table.columns.length}`);
        console.log(`      - Row Count: ${table.statistics?.rowCount || 'Unknown'}`);
        console.log(`      - Comment: ${table.comment || 'None'}`);
        
        // Show column details
        if (table.columns.length > 0) {
          console.log(`      - Sample columns:`);
          table.columns.slice(0, 3).forEach(col => {
            console.log(`        * ${col.name}: ${col.type} ${col.nullable ? '(nullable)' : '(not null)'} ${col.primaryKey ? '(PK)' : ''}`);
          });
          if (table.columns.length > 3) {
            console.log(`        * ... and ${table.columns.length - 3} more columns`);
          }
        }
      });
      
      // Show index information
      if (result.indexes.length > 0) {
        console.log('\n🔍 Index Information:');
        result.indexes.forEach((index, idx) => {
          console.log(`   ${idx + 1}. ${index.name} on ${index.tableName}`);
          console.log(`      - Type: ${index.type}`);
          console.log(`      - Unique: ${index.unique}`);
          console.log(`      - Columns: ${index.columns.join(', ')}`);
        });
      }
      
    } catch (error) {
      console.log(`⚠️  Failed comprehensive extraction: ${error.message}`);
    }
    
    // Test 3: Test error handling
    console.log('\n📊 Test 3: Error Handling');
    console.log('-------------------------');
    
    try {
      await extractor.extractSystemCatalog('sqlite', { filePath: 'nonexistent.db' });
    } catch (error) {
      console.log(`✅ Error handling works: ${error.message}`);
    }
    
    try {
      await extractor.extractSystemCatalog('postgresql', { connectionString: 'invalid-connection' });
    } catch (error) {
      console.log(`✅ PostgreSQL error handling works: ${error.message}`);
    }
    
    console.log('\n🎉 System Catalog Extraction Tests Completed!');
    console.log('===============================================');
    
  } catch (error) {
    console.error('❌ Test suite failed:', error);
  }
}

// Run the tests
if (require.main === module) {
  testSystemCatalogExtraction().catch(console.error);
}

module.exports = { testSystemCatalogExtraction };
