// Simple test for SQLite system catalog extraction
const sqlite3 = require('sqlite3');
const { open } = require('sqlite');
const path = require('path');

async function testSQLiteCatalog() {
  console.log('🧪 Testing SQLite System Catalog Extraction');
  console.log('===========================================');
  
  const testDbFiles = [
    'test.db',
    'queryflow_app.db',
    'manual-test.db',
    'test_full.db'
  ];
  
  for (const dbFile of testDbFiles) {
    const dbPath = path.join(__dirname, dbFile);
    try {
      console.log(`\n🔍 Testing SQLite extraction from: ${dbFile}`);
      
      const db = await open({
        filename: dbPath,
        driver: sqlite3.Database
      });
      
      // Get database version
      const versionResult = await db.get('SELECT sqlite_version() as version');
      console.log(`   - SQLite Version: ${versionResult.version}`);
      
      // Get encoding
      const pragmaResult = await db.get('PRAGMA encoding');
      console.log(`   - Encoding: ${pragmaResult.encoding}`);
      
      // Extract tables
      const tablesResult = await db.all(`
        SELECT 
          name,
          sql,
          type
        FROM sqlite_master 
        WHERE type = 'table' 
        AND name NOT LIKE 'sqlite_%'
        ORDER BY name
      `);
      
      console.log(`   - Tables: ${tablesResult.length}`);
      
      // Show table details
      for (const tableRow of tablesResult) {
        console.log(`     * ${tableRow.name}`);
        
        // Get table info using PRAGMA
        const tableInfo = await db.all(`PRAGMA table_info(${tableRow.name})`);
        console.log(`       - Columns: ${tableInfo.length}`);
        
        // Show sample columns
        tableInfo.slice(0, 3).forEach(col => {
          console.log(`         * ${col.name}: ${col.type} ${col.notnull ? '(not null)' : '(nullable)'} ${col.pk ? '(PK)' : ''}`);
        });
        if (tableInfo.length > 3) {
          console.log(`         * ... and ${tableInfo.length - 3} more columns`);
        }
        
        // Get row count
        const countResult = await db.get(`SELECT COUNT(*) as count FROM ${tableRow.name}`);
        console.log(`       - Row Count: ${countResult.count}`);
      }
      
      // Extract views
      const viewsResult = await db.all(`
        SELECT 
          name,
          sql
        FROM sqlite_master 
        WHERE type = 'view'
        ORDER BY name
      `);
      
      console.log(`   - Views: ${viewsResult.length}`);
      
      // Extract indexes
      const indexesResult = await db.all(`
        SELECT 
          name,
          tbl_name,
          sql,
          type
        FROM sqlite_master 
        WHERE type = 'index'
        AND name NOT LIKE 'sqlite_%'
        ORDER BY tbl_name, name
      `);
      
      console.log(`   - Indexes: ${indexesResult.length}`);
      
      // Extract triggers
      const triggersResult = await db.all(`
        SELECT 
          name,
          tbl_name,
          sql
        FROM sqlite_master 
        WHERE type = 'trigger'
        ORDER BY tbl_name, name
      `);
      
      console.log(`   - Triggers: ${triggersResult.length}`);
      
      await db.close();
      console.log(`✅ Successfully extracted from ${dbFile}`);
      
    } catch (error) {
      console.log(`⚠️  Failed to extract from ${dbFile}: ${error.message}`);
    }
  }
  
  // Test comprehensive database
  console.log('\n📊 Testing Comprehensive Database');
  console.log('----------------------------------');
  
  const comprehensiveDbPath = path.join(__dirname, 'comprehensive-test-project', 'law_database.sqlite');
  try {
    console.log(`\n🔍 Testing comprehensive extraction from: law_database.sqlite`);
    
    const db = await open({
      filename: comprehensiveDbPath,
      driver: sqlite3.Database
    });
    
    // Get database version
    const versionResult = await db.get('SELECT sqlite_version() as version');
    console.log(`   - SQLite Version: ${versionResult.version}`);
    
    // Extract tables
    const tablesResult = await db.all(`
      SELECT 
        name,
        sql,
        type
      FROM sqlite_master 
      WHERE type = 'table' 
      AND name NOT LIKE 'sqlite_%'
      ORDER BY name
    `);
    
    console.log(`✅ Comprehensive extraction results:`);
    console.log(`   - Tables: ${tablesResult.length}`);
    
    // Show detailed table information
    console.log('\n📋 Detailed Table Information:');
    for (const tableRow of tablesResult) {
      console.log(`   - ${tableRow.name}`);
      
      // Get table info using PRAGMA
      const tableInfo = await db.all(`PRAGMA table_info(${tableRow.name})`);
      console.log(`     - Columns: ${tableInfo.length}`);
      
      // Show column details
      tableInfo.forEach(col => {
        console.log(`       * ${col.name}: ${col.type} ${col.notnull ? '(not null)' : '(nullable)'} ${col.pk ? '(PK)' : ''}`);
      });
      
      // Get row count
      const countResult = await db.get(`SELECT COUNT(*) as count FROM ${tableRow.name}`);
      console.log(`     - Row Count: ${countResult.count}`);
    }
    
    // Extract indexes
    const indexesResult = await db.all(`
      SELECT 
        name,
        tbl_name,
        sql,
        type
      FROM sqlite_master 
      WHERE type = 'index'
      AND name NOT LIKE 'sqlite_%'
      ORDER BY tbl_name, name
    `);
    
    console.log(`\n🔍 Index Information (${indexesResult.length} indexes):`);
    indexesResult.forEach((index, idx) => {
      console.log(`   ${idx + 1}. ${index.name} on ${index.tbl_name}`);
      console.log(`      - Type: ${index.type}`);
      console.log(`      - Unique: ${index.sql?.includes('UNIQUE') || false}`);
    });
    
    await db.close();
    console.log(`✅ Comprehensive extraction completed successfully`);
    
  } catch (error) {
    console.log(`⚠️  Failed comprehensive extraction: ${error.message}`);
  }
  
  console.log('\n🎉 SQLite System Catalog Extraction Tests Completed!');
  console.log('=====================================================');
}

// Run the tests
if (require.main === module) {
  testSQLiteCatalog().catch(console.error);
}

module.exports = { testSQLiteCatalog };
