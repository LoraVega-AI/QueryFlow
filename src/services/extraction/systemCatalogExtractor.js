// JavaScript version of System Catalog Extraction Service
// This can be imported directly by Node.js without TypeScript compilation

const sqlite3 = require('sqlite3');
const { open } = require('sqlite');

// Simple SQLite system catalog extractor for use in upload workflow
async function extractSQLiteSystemCatalog(filePath) {
  console.log('🔍 Extracting SQLite system catalog...');
  
  try {
    const db = await open({
      filename: filePath,
      driver: sqlite3.Database
    });

    const result = {
      tables: [],
      views: [],
      indexes: [],
      triggers: [],
      sequences: [],
      functions: [],
      procedures: [],
      metadata: {
        databaseType: 'sqlite',
        version: '',
        extractedAt: new Date().toISOString()
      }
    };

    // Get SQLite version
    const versionResult = await db.get('SELECT sqlite_version() as version');
    result.metadata.version = versionResult.version;

    // Get encoding
    const pragmaResult = await db.get('PRAGMA encoding');
    result.metadata.encoding = pragmaResult.encoding;

    // Extract tables from sqlite_master
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

    for (const tableRow of tablesResult) {
      // Get table info using PRAGMA
      const tableInfo = await db.all(`PRAGMA table_info(${tableRow.name})`);
      
      // Get row count
      const countResult = await db.get(`SELECT COUNT(*) as count FROM ${tableRow.name}`);
      
      // Get foreign key info
      const foreignKeys = await db.all(`PRAGMA foreign_key_list(${tableRow.name})`);
      
      const table = {
        id: tableRow.name,
        name: tableRow.name,
        columns: tableInfo.map(col => ({
          id: `${tableRow.name}.${col.name}`,
          name: col.name,
          type: mapSQLiteType(col.type),
          nullable: !col.notnull,
          primaryKey: col.pk === 1,
          defaultValue: col.dflt_value,
          constraints: {}
        })),
        constraints: foreignKeys.map(fk => ({
          type: 'FOREIGN',
          columns: [fk.from],
          referencedTable: fk.table,
          referencedColumns: [fk.to],
          onDelete: fk.on_delete,
          onUpdate: fk.on_update
        })),
        statistics: {
          rowCount: countResult.count,
          dataLength: 0,
          indexLength: 0,
          checkTime: new Date(),
          createTime: new Date(),
          updateTime: new Date()
        }
      };
      
      result.tables.push(table);
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

    result.views = viewsResult.map(view => ({
      name: view.name,
      definition: view.sql,
      columns: [],
      dependencies: [],
      materialized: false,
      updatable: false
    }));

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

    result.indexes = indexesResult.map(index => ({
      id: index.name,
      name: index.name,
      tableName: index.tbl_name,
      columns: [],
      unique: index.sql?.includes('UNIQUE') || false,
      type: 'btree',
      comment: ''
    }));

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

    result.triggers = triggersResult.map(trigger => ({
      id: trigger.name,
      name: trigger.name,
      tableName: trigger.tbl_name,
      event: 'UNKNOWN',
      timing: 'UNKNOWN',
      definition: trigger.sql,
      enabled: true
    }));

    await db.close();

    console.log(`✅ SQLite extraction completed: ${result.tables.length} tables, ${result.views.length} views, ${result.indexes.length} indexes`);
    return result;

  } catch (error) {
    console.error('❌ SQLite extraction failed:', error);
    throw error;
  }
}

// Helper function to map SQLite types
function mapSQLiteType(type) {
  if (!type) return 'TEXT';
  
  const upperType = type.toUpperCase();
  
  if (upperType.includes('INT')) return 'INTEGER';
  if (upperType.includes('REAL') || upperType.includes('FLOAT') || upperType.includes('DOUBLE')) return 'REAL';
  if (upperType.includes('BLOB')) return 'BLOB';
  if (upperType.includes('BOOLEAN')) return 'BOOLEAN';
  if (upperType.includes('DATE') || upperType.includes('TIME')) return 'DATETIME';
  
  return 'TEXT';
}

module.exports = {
  extractSQLiteSystemCatalog
};
