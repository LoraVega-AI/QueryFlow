const Database = require('better-sqlite3');
const path = require('path');

async function checkDatabase() {
  try {
    console.log('🔍 Checking application database...');
    
    const dbPath = path.join(__dirname, 'queryflow_app.db');
    console.log('📁 Database path:', dbPath);
    
    const db = new Database(dbPath);
    
    // Check tables
    const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
    console.log('📋 Tables in database:', tables.map(t => t.name));
    
    // Check projects table structure
    if (tables.some(t => t.name === 'projects')) {
      const columns = db.prepare("PRAGMA table_info(projects)").all();
      console.log('📊 Projects table columns:', columns.map(c => ({ name: c.name, type: c.type })));
      
      // Check recent projects
      const recentProjects = db.prepare("SELECT id, name, total_tables, created_at FROM projects ORDER BY created_at DESC LIMIT 5").all();
      console.log('📈 Recent projects:', recentProjects);
    } else {
      console.log('❌ Projects table not found!');
    }
    
    db.close();
    
  } catch (error) {
    console.error('❌ Error checking database:', error);
  }
}

checkDatabase();
