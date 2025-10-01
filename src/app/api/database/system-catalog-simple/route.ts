// Simple API route for system catalog extraction
// POST /api/database/system-catalog-simple

import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    // Parse request body
    const body = await request.json();
    const { databaseType, connectionInfo } = body;

    console.log(`🔍 Starting simple system catalog extraction for ${databaseType}...`);

    // For now, just test with SQLite using direct sqlite3
    if (databaseType === 'sqlite') {
      const sqlite3 = require('sqlite3');
      const { open } = require('sqlite');
      
      const filePath = connectionInfo.filePath || connectionInfo;
      console.log(`📂 Opening SQLite database: ${filePath}`);
      
      const db = await open({
        filename: filePath,
        driver: sqlite3.Database
      });

      // Extract basic information
      const versionResult = await db.get('SELECT sqlite_version() as version');
      const pragmaResult = await db.get('PRAGMA encoding');
      
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

      const tables = [];
      for (const tableRow of tablesResult) {
        // Get table info using PRAGMA
        const tableInfo = await db.all(`PRAGMA table_info(${tableRow.name})`);
        
        // Get row count
        const countResult = await db.get(`SELECT COUNT(*) as count FROM ${tableRow.name}`);
        
        const table = {
          id: tableRow.name,
          name: tableRow.name,
          columns: tableInfo.map(col => ({
            id: `${tableRow.name}.${col.name}`,
            name: col.name,
            type: col.type,
            nullable: !col.notnull,
            primaryKey: col.pk === 1,
            defaultValue: col.dflt_value
          })),
          statistics: {
            rowCount: countResult.count
          }
        };
        
        tables.push(table);
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

      const views = viewsResult.map(view => ({
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

      const indexes = indexesResult.map(index => ({
        id: index.name,
        name: index.name,
        tableName: index.tbl_name,
        columns: [],
        unique: index.sql?.includes('UNIQUE') || false,
        type: 'btree'
      }));

      await db.close();

      const result = {
        tables,
        views,
        indexes,
        triggers: [],
        sequences: [],
        functions: [],
        procedures: [],
        metadata: {
          databaseType: 'sqlite',
          version: versionResult.version,
          encoding: pragmaResult.encoding,
          extractedAt: new Date().toISOString()
        }
      };

      console.log(`✅ Simple SQLite extraction completed: ${tables.length} tables, ${views.length} views, ${indexes.length} indexes`);

      return NextResponse.json({
        success: true,
        data: result,
        metadata: {
          databaseType: result.metadata.databaseType,
          version: result.metadata.version,
          extractedAt: result.metadata.extractedAt,
          summary: {
            tables: result.tables.length,
            views: result.views.length,
            indexes: result.indexes.length,
            triggers: result.triggers.length,
            sequences: result.sequences.length,
            functions: result.functions.length,
            procedures: result.procedures.length
          }
        }
      });
    }

    return NextResponse.json({
      success: false,
      error: `Unsupported database type: ${databaseType}. Only SQLite is supported in this simple version.`
    }, { status: 400 });

  } catch (error) {
    console.error('❌ Simple system catalog extraction failed:', error);
    
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        details: error instanceof Error ? error.stack : undefined
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    success: true,
    message: 'Simple System Catalog Extraction API',
    supportedTypes: ['sqlite'],
    usage: {
      method: 'POST',
      endpoint: '/api/database/system-catalog-simple',
      body: {
        databaseType: 'sqlite',
        connectionInfo: { filePath: '/path/to/database.db' }
      }
    }
  });
}
