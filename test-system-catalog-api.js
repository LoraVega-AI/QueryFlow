// Test script for System Catalog API
const fetch = require('node-fetch').default;

async function testSystemCatalogAPI() {
  console.log('🧪 Testing System Catalog API');
  console.log('==============================');
  
  const baseUrl = 'http://localhost:3000';
  
  try {
    // Test 1: Get API info
    console.log('\n📊 Test 1: API Information');
    console.log('---------------------------');
    
    const infoResponse = await fetch(`${baseUrl}/api/database/system-catalog`);
    const infoData = await infoResponse.json();
    
    console.log('✅ API Info:', {
      success: infoData.success,
      message: infoData.message,
      supportedTypes: infoData.supportedTypes
    });
    
    // Test 2: SQLite extraction
    console.log('\n📊 Test 2: SQLite System Catalog Extraction');
    console.log('---------------------------------------------');
    
    const sqliteResponse = await fetch(`${baseUrl}/api/database/system-catalog`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        databaseType: 'sqlite',
        connectionInfo: { filePath: './test.db' }
      })
    });
    
    const sqliteData = await sqliteResponse.json();
    
    if (sqliteData.success) {
      console.log('✅ SQLite extraction successful!');
      console.log('📊 Summary:', sqliteData.metadata.summary);
      console.log('📋 Database Info:', {
        type: sqliteData.data.metadata.databaseType,
        version: sqliteData.data.metadata.version,
        encoding: sqliteData.data.metadata.encoding
      });
      
      console.log('\n📋 Tables found:');
      sqliteData.data.tables.forEach((table, index) => {
        console.log(`   ${index + 1}. ${table.name} (${table.columns.length} columns)`);
        if (table.statistics?.rowCount) {
          console.log(`      - Row count: ${table.statistics.rowCount}`);
        }
      });
      
      if (sqliteData.data.views.length > 0) {
        console.log('\n👁️ Views found:');
        sqliteData.data.views.forEach((view, index) => {
          console.log(`   ${index + 1}. ${view.name}`);
        });
      }
      
      if (sqliteData.data.indexes.length > 0) {
        console.log('\n🔍 Indexes found:');
        sqliteData.data.indexes.forEach((index, idx) => {
          console.log(`   ${idx + 1}. ${index.name} on ${index.tableName} (${index.unique ? 'UNIQUE' : 'NON-UNIQUE'})`);
        });
      }
      
    } else {
      console.log('❌ SQLite extraction failed:', sqliteData.error);
    }
    
    // Test 3: Test with comprehensive database
    console.log('\n📊 Test 3: Comprehensive Database Test');
    console.log('--------------------------------------');
    
    const comprehensiveResponse = await fetch(`${baseUrl}/api/database/system-catalog`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        databaseType: 'sqlite',
        connectionInfo: { filePath: './comprehensive-test-project/law_database.sqlite' }
      })
    });
    
    const comprehensiveData = await comprehensiveResponse.json();
    
    if (comprehensiveData.success) {
      console.log('✅ Comprehensive database extraction successful!');
      console.log('📊 Summary:', comprehensiveData.metadata.summary);
      
      console.log('\n📋 Detailed Table Analysis:');
      comprehensiveData.data.tables.forEach((table, index) => {
        console.log(`\n   ${index + 1}. ${table.name}`);
        console.log(`      - Columns: ${table.columns.length}`);
        console.log(`      - Row Count: ${table.statistics?.rowCount || 'Unknown'}`);
        
        // Show sample columns
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
      });
      
    } else {
      console.log('❌ Comprehensive database extraction failed:', comprehensiveData.error);
    }
    
    console.log('\n🎉 System Catalog API Tests Completed!');
    console.log('=======================================');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Run the tests
if (require.main === module) {
  testSystemCatalogAPI().catch(console.error);
}

module.exports = { testSystemCatalogAPI };
