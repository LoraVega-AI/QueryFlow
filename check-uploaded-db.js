const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');

// Find the latest upload directory
const uploadsDir = path.join(__dirname, 'uploads');
const dirs = fs.readdirSync(uploadsDir)
  .filter(f => f.startsWith('project_'))
  .map(f => ({
    name: f,
    path: path.join(uploadsDir, f),
    time: fs.statSync(path.join(uploadsDir, f)).mtime.getTime()
  }))
  .sort((a, b) => b.time - a.time);

if (dirs.length === 0) {
  console.log('❌ No uploaded projects found');
  process.exit(1);
}

const latestDir = dirs[0].path;
console.log('📁 Latest upload directory:', latestDir);
console.log('');

// Find all .db files recursively
function findDbFiles(dir, files = []) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      findDbFiles(fullPath, files);
    } else if (entry.isFile() && (entry.name.endsWith('.db') || entry.name.endsWith('.sqlite') || entry.name.endsWith('.sqlite3'))) {
      files.push(fullPath);
    }
  }
  return files;
}

const dbFiles = findDbFiles(latestDir);
console.log(`📊 Found ${dbFiles.length} database files:`);
console.log('');

dbFiles.forEach(dbFile => {
  console.log(`🗄️  ${path.relative(latestDir, dbFile)}`);
  console.log(`   Full path: ${dbFile}`);
  
  try {
    const stats = fs.statSync(dbFile);
    console.log(`   Size: ${(stats.size / 1024).toFixed(2)} KB`);
    
    // Try to open and query
    const db = new Database(dbFile, { readonly: true });
    const tables = db.prepare(`
      SELECT name FROM sqlite_master 
      WHERE type='table' AND name NOT LIKE 'sqlite_%'
    `).all();
    
    console.log(`   Tables: ${tables.length}`);
    
    if (tables.length > 0) {
      const totalRows = tables.reduce((sum, table) => {
        const count = db.prepare(`SELECT COUNT(*) as count FROM ${table.name}`).get();
        return sum + count.count;
      }, 0);
      
      const totalColumns = tables.reduce((sum, table) => {
        const columns = db.prepare(`PRAGMA table_info(${table.name})`).all();
        return sum + columns.length;
      }, 0);
      
      console.log(`   Rows: ${totalRows}`);
      console.log(`   Columns: ${totalColumns}`);
      
      if (totalRows > 0) {
        console.log(`   ✅ This is a POPULATED database!`);
      }
    }
    
    db.close();
  } catch (error) {
    console.log(`   ❌ Error reading: ${error.message}`);
  }
  
  console.log('');
});

console.log('============================================================');
console.log('EXPECTED FILE: comprehensive_test.db');
console.log('   Tables: 7');
console.log('   Rows: 91');  
console.log('   Columns: 57');
console.log('============================================================');

