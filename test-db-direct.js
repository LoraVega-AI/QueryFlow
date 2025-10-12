const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, 'comprehensive-test-project', 'comprehensive_test.db');
console.log('📁 Testing database:', dbPath);

try {
  const db = new Database(dbPath, { readonly: true });
  
  // Get all tables
  const tables = db.prepare(`
    SELECT name FROM sqlite_master 
    WHERE type='table' AND name NOT LIKE 'sqlite_%'
  `).all();
  
  console.log(`\n📋 Tables: ${tables.length}`);
  tables.forEach(table => {
    const count = db.prepare(`SELECT COUNT(*) as count FROM ${table.name}`).get();
    const columns = db.prepare(`PRAGMA table_info(${table.name})`).all();
    console.log(`   - ${table.name}: ${count.count} rows, ${columns.length} columns`);
  });
  
  const totalRows = tables.reduce((sum, table) => {
    const count = db.prepare(`SELECT COUNT(*) as count FROM ${table.name}`).get();
    return sum + count.count;
  }, 0);
  
  const totalColumns = tables.reduce((sum, table) => {
    const columns = db.prepare(`PRAGMA table_info(${table.name})`).all();
    return sum + columns.length;
  }, 0);
  
  console.log(`\n📊 TOTALS:`);
  console.log(`   Tables: ${tables.length}`);
  console.log(`   Rows: ${totalRows}`);
  console.log(`   Columns: ${totalColumns}`);
  
  db.close();
} catch (error) {
  console.error('❌ Error:', error);
}
