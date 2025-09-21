const Database = require('better-sqlite3');
const path = require('path');

async function testDatabaseDirect() {
  try {
    console.log('🧪 Testing database directly...');
    
    // Create a test database
    const dbPath = path.join(__dirname, 'test.db');
    const db = new Database(dbPath);
    
    console.log('✅ Database created');
    
    // Create projects table
    db.exec(`
      CREATE TABLE IF NOT EXISTS projects (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT,
        technology TEXT,
        status TEXT DEFAULT 'disconnected',
        last_synced TEXT,
        database_count INTEGER DEFAULT 0,
        total_tables INTEGER DEFAULT 0,
        total_rows INTEGER DEFAULT 0,
        has_foreign_keys INTEGER DEFAULT 0,
        has_indexes INTEGER DEFAULT 0,
        icon TEXT,
        color TEXT,
        is_example INTEGER DEFAULT 0,
        schema_data TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    console.log('✅ Projects table created');
    
    // Insert a test project
    const testProject = {
      id: 'test_' + Date.now(),
      name: 'Test Project',
      description: 'Test description',
      technology: 'test',
      status: 'disconnected',
      lastSynced: null,
      databaseCount: 1,
      totalTables: 3,
      totalRows: 0,
      hasForeignKeys: false,
      hasIndexes: false,
      icon: '🧪',
      color: 'blue',
      isExample: false,
      schema: { tables: [], relationships: [], indexes: [] }
    };
    
    const schemaData = JSON.stringify(testProject.schema);
    const now = new Date().toISOString();
    
    const stmt = db.prepare(`
      INSERT OR REPLACE INTO projects
      (id, name, description, technology, status, last_synced, database_count, total_tables, total_rows, has_foreign_keys, has_indexes, icon, color, is_example, schema_data, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    stmt.run(
      testProject.id,
      testProject.name,
      testProject.description || '',
      testProject.technology || '',
      testProject.status || 'disconnected',
      testProject.lastSynced || null,
      testProject.databaseCount || 0,
      testProject.totalTables || 0,
      testProject.totalRows || 0,
      testProject.hasForeignKeys ? 1 : 0,
      testProject.hasIndexes ? 1 : 0,
      testProject.icon || '',
      testProject.color || '',
      testProject.isExample ? 1 : 0,
      schemaData,
      now
    );
    
    console.log('✅ Test project inserted');
    
    // Retrieve the project
    const rows = db.prepare('SELECT * FROM projects WHERE id = ?').all(testProject.id);
    console.log('✅ Test project retrieved:', rows.length, 'rows');
    console.log('📊 Project data:', {
      id: rows[0]?.id,
      name: rows[0]?.name,
      totalTables: rows[0]?.total_tables,
      totalRows: rows[0]?.total_rows
    });
    
    db.close();
    console.log('✅ Database test completed successfully');
    
  } catch (error) {
    console.error('❌ Database test failed:', error);
  }
}

testDatabaseDirect();
