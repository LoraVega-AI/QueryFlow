// System Catalog Extraction Service
// Extracts comprehensive schema metadata from database system catalogs

import { DatabaseSchema, Table, Column, TableIndex, TableTrigger } from '../../types/database';

export interface SystemCatalogResult {
  tables: Table[];
  views: Array<{
    name: string;
    definition: string;
    columns: string[];
    dependencies: string[];
    materialized?: boolean;
    updatable?: boolean;
  }>;
  indexes: TableIndex[];
  triggers: TableTrigger[];
  sequences: Array<{
    name: string;
    startValue: number;
    increment: number;
    minValue?: number;
    maxValue?: number;
    cycle: boolean;
    cache?: number;
    ownedBy?: string;
  }>;
  functions: Array<{
    name: string;
    parameters: Array<{ name: string; type: string; mode: 'IN' | 'OUT' | 'INOUT' }>;
    returnType: string;
    language: string;
    body: string;
    volatility: 'VOLATILE' | 'STABLE' | 'IMMUTABLE';
  }>;
  procedures: Array<{
    name: string;
    parameters: Array<{ name: string; type: string; mode: 'IN' | 'OUT' | 'INOUT' }>;
    language: string;
    body: string;
  }>;
  metadata: {
    databaseType: string;
    version: string;
    encoding?: string;
    collation?: string;
    timezone?: string;
    extractedAt: Date;
  };
}

// Simple SQLite system catalog extractor for use in upload workflow
export async function extractSQLiteSystemCatalog(filePath: string): Promise<SystemCatalogResult> {
  console.log('🔍 Extracting SQLite system catalog...');
  
  try {
    const sqlite3 = require('sqlite3');
    const { open } = require('sqlite');
    
    const db = await open({
      filename: filePath,
      driver: sqlite3.Database
    });

    const result: SystemCatalogResult = {
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
      
      const table: Table = {
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

export class SystemCatalogExtractor {
  
  /**
   * Extract system catalog information from PostgreSQL
   */
  static async extractPostgreSQL(connectionString: string): Promise<SystemCatalogResult> {
    console.log('🔍 Extracting PostgreSQL system catalog...');
    
    try {
      const { Client } = require('pg');
      const client = new Client({ connectionString });
      await client.connect();
      
      const result: SystemCatalogResult = {
        tables: [],
        views: [],
        indexes: [],
        triggers: [],
        sequences: [],
        functions: [],
        procedures: [],
        metadata: {
          databaseType: 'postgresql',
          version: '',
          extractedAt: new Date()
        }
      };
      
      // Get database version and metadata
      const versionResult = await client.query('SELECT version()');
      result.metadata.version = versionResult.rows[0].version;
      
      const encodingResult = await client.query('SHOW server_encoding');
      result.metadata.encoding = encodingResult.rows[0].server_encoding;
      
      const collationResult = await client.query('SHOW lc_collate');
      result.metadata.collation = collationResult.rows[0].lc_collate;
      
      const timezoneResult = await client.query('SHOW timezone');
      result.metadata.timezone = timezoneResult.rows[0].timezone;
      
      // Extract tables with comprehensive metadata
      const tablesQuery = `
        SELECT 
          t.table_name,
          t.table_schema,
          t.table_type,
          obj_description(c.oid) as table_comment,
          pg_size_pretty(pg_total_relation_size(c.oid)) as table_size,
          pg_stat_get_tuples_inserted(c.oid) as inserts,
          pg_stat_get_tuples_updated(c.oid) as updates,
          pg_stat_get_tuples_deleted(c.oid) as deletes
        FROM information_schema.tables t
        LEFT JOIN pg_class c ON c.relname = t.table_name
        LEFT JOIN pg_namespace n ON n.oid = c.relnamespace AND n.nspname = t.table_schema
        WHERE t.table_schema NOT IN ('information_schema', 'pg_catalog', 'pg_toast')
        AND t.table_type = 'BASE TABLE'
        ORDER BY t.table_schema, t.table_name
      `;
      
      const tablesResult = await client.query(tablesQuery);
      
      for (const tableRow of tablesResult.rows) {
        const table: Table = {
          id: `${tableRow.table_schema}.${tableRow.table_name}`,
          name: tableRow.table_name,
          schema: tableRow.table_schema,
          columns: [],
          comment: tableRow.table_comment,
          statistics: {
            rowCount: 0,
            dataLength: 0,
            indexLength: 0,
            checkTime: new Date(),
            createTime: new Date(),
            updateTime: new Date()
          }
        };
        
        // Extract columns for this table
        const columnsQuery = `
          SELECT 
            c.column_name,
            c.data_type,
            c.character_maximum_length,
            c.numeric_precision,
            c.numeric_scale,
            c.is_nullable,
            c.column_default,
            c.ordinal_position,
            col_description(pgc.oid, c.ordinal_position) as column_comment,
            CASE WHEN pk.column_name IS NOT NULL THEN true ELSE false END as is_primary_key,
            CASE WHEN fk.column_name IS NOT NULL THEN true ELSE false END as is_foreign_key,
            fk.foreign_table_name,
            fk.foreign_column_name,
            fk.constraint_name as fk_constraint_name
          FROM information_schema.columns c
          LEFT JOIN pg_class pgc ON pgc.relname = c.table_name
          LEFT JOIN pg_namespace pgn ON pgn.oid = pgc.relnamespace AND pgn.nspname = c.table_schema
          LEFT JOIN (
            SELECT ku.column_name, ku.table_name, ku.table_schema
            FROM information_schema.table_constraints tc
            JOIN information_schema.key_column_usage ku ON tc.constraint_name = ku.constraint_name
            WHERE tc.constraint_type = 'PRIMARY KEY'
          ) pk ON pk.column_name = c.column_name AND pk.table_name = c.table_name AND pk.table_schema = c.table_schema
          LEFT JOIN (
            SELECT 
              ku.column_name, 
              ku.table_name, 
              ku.table_schema,
              ccu.table_name AS foreign_table_name,
              ccu.column_name AS foreign_column_name,
              tc.constraint_name
            FROM information_schema.table_constraints tc
            JOIN information_schema.key_column_usage ku ON tc.constraint_name = ku.constraint_name
            JOIN information_schema.constraint_column_usage ccu ON ccu.constraint_name = tc.constraint_name
            WHERE tc.constraint_type = 'FOREIGN KEY'
          ) fk ON fk.column_name = c.column_name AND fk.table_name = c.table_name AND fk.table_schema = c.table_schema
          WHERE c.table_name = $1 AND c.table_schema = $2
          ORDER BY c.ordinal_position
        `;
        
        const columnsResult = await client.query(columnsQuery, [tableRow.table_name, tableRow.table_schema]);
        
        for (const colRow of columnsResult.rows) {
          const column: Column = {
            id: `${table.id}.${colRow.column_name}`,
            name: colRow.column_name,
            type: this.mapPostgreSQLType(colRow.data_type),
            nullable: colRow.is_nullable === 'YES',
            primaryKey: colRow.is_primary_key,
            defaultValue: colRow.column_default,
            comment: colRow.column_comment,
            constraints: {
              maxLength: colRow.character_maximum_length,
              precision: colRow.numeric_precision,
              scale: colRow.numeric_scale
            }
          };
          
          if (colRow.is_foreign_key) {
            column.foreignKey = {
              tableId: `${colRow.foreign_table_name}`,
              columnId: colRow.foreign_column_name,
              constraintName: colRow.fk_constraint_name,
              relationshipType: 'many-to-one'
            };
          }
          
          table.columns.push(column);
        }
        
        result.tables.push(table);
      }
      
      // Extract views
      const viewsQuery = `
        SELECT 
          v.table_name,
          v.table_schema,
          v.view_definition,
          obj_description(c.oid) as view_comment
        FROM information_schema.views v
        LEFT JOIN pg_class c ON c.relname = v.table_name
        LEFT JOIN pg_namespace n ON n.oid = c.relnamespace AND n.nspname = v.table_schema
        WHERE v.table_schema NOT IN ('information_schema', 'pg_catalog')
        ORDER BY v.table_schema, v.table_name
      `;
      
      const viewsResult = await client.query(viewsQuery);
      for (const viewRow of viewsResult.rows) {
        result.views.push({
          name: viewRow.table_name,
          definition: viewRow.view_definition,
          columns: [], // Will be populated separately
          dependencies: [],
          materialized: false,
          updatable: false
        });
      }
      
      // Extract indexes
      const indexesQuery = `
        SELECT 
          i.indexname,
          i.tablename,
          i.schemaname,
          i.indexdef,
          pg_size_pretty(pg_relation_size(i.indexname::regclass)) as index_size,
          obj_description(i.indexname::regclass) as index_comment
        FROM pg_indexes i
        WHERE i.schemaname NOT IN ('information_schema', 'pg_catalog')
        ORDER BY i.schemaname, i.tablename, i.indexname
      `;
      
      const indexesResult = await client.query(indexesQuery);
      for (const idxRow of indexesResult.rows) {
        result.indexes.push({
          id: `${idxRow.schemaname}.${idxRow.indexname}`,
          name: idxRow.indexname,
          tableName: idxRow.tablename,
          columns: [], // Will be parsed from indexdef
          unique: idxRow.indexdef.includes('UNIQUE'),
          type: 'btree', // Default, will be parsed from indexdef
          comment: idxRow.index_comment,
          size: 0 // Will be parsed from index_size
        });
      }
      
      // Extract sequences
      const sequencesQuery = `
        SELECT 
          s.sequence_name,
          s.data_type,
          s.start_value,
          s.minimum_value,
          s.maximum_value,
          s.increment,
          s.cycle_option,
          s.cache_size,
          s.owned_by
        FROM information_schema.sequences s
        WHERE s.sequence_schema NOT IN ('information_schema', 'pg_catalog')
        ORDER BY s.sequence_schema, s.sequence_name
      `;
      
      const sequencesResult = await client.query(sequencesQuery);
      for (const seqRow of sequencesResult.rows) {
        result.sequences.push({
          name: seqRow.sequence_name,
          startValue: parseInt(seqRow.start_value),
          increment: parseInt(seqRow.increment),
          minValue: seqRow.minimum_value ? parseInt(seqRow.minimum_value) : undefined,
          maxValue: seqRow.maximum_value ? parseInt(seqRow.maximum_value) : undefined,
          cycle: seqRow.cycle_option === 'YES',
          cache: seqRow.cache_size ? parseInt(seqRow.cache_size) : undefined,
          ownedBy: seqRow.owned_by
        });
      }
      
      await client.end();
      
      console.log(`✅ PostgreSQL extraction completed: ${result.tables.length} tables, ${result.views.length} views, ${result.indexes.length} indexes`);
      return result;
      
    } catch (error) {
      console.error('❌ PostgreSQL extraction failed:', error);
      throw error;
    }
  }
  
  /**
   * Extract system catalog information from MySQL
   */
  static async extractMySQL(connectionString: string): Promise<SystemCatalogResult> {
    console.log('🔍 Extracting MySQL system catalog...');
    
    try {
      const mysql = require('mysql2/promise');
      const connection = await mysql.createConnection(connectionString);
      
      const result: SystemCatalogResult = {
        tables: [],
        views: [],
        indexes: [],
        triggers: [],
        sequences: [],
        functions: [],
        procedures: [],
        metadata: {
          databaseType: 'mysql',
          version: '',
          extractedAt: new Date()
        }
      };
      
      // Get database version and metadata
      const [versionRows] = await connection.execute('SELECT VERSION() as version');
      result.metadata.version = versionRows[0].version;
      
      const [charsetRows] = await connection.execute('SELECT @@character_set_database as charset');
      result.metadata.encoding = charsetRows[0].charset;
      
      const [collationRows] = await connection.execute('SELECT @@collation_database as collation');
      result.metadata.collation = collationRows[0].collation;
      
      const [timezoneRows] = await connection.execute('SELECT @@time_zone as timezone');
      result.metadata.timezone = timezoneRows[0].timezone;
      
      // Extract tables with comprehensive metadata
      const [tablesRows] = await connection.execute(`
        SELECT 
          TABLE_NAME,
          TABLE_SCHEMA,
          TABLE_TYPE,
          TABLE_COMMENT,
          TABLE_ROWS,
          DATA_LENGTH,
          INDEX_LENGTH,
          DATA_FREE,
          AUTO_INCREMENT,
          CREATE_TIME,
          UPDATE_TIME,
          CHECK_TIME,
          TABLE_COLLATION,
          ENGINE
        FROM information_schema.TABLES 
        WHERE TABLE_SCHEMA NOT IN ('information_schema', 'performance_schema', 'mysql', 'sys')
        AND TABLE_TYPE = 'BASE TABLE'
        ORDER BY TABLE_SCHEMA, TABLE_NAME
      `);
      
      for (const tableRow of tablesRows) {
        const table: Table = {
          id: `${tableRow.TABLE_SCHEMA}.${tableRow.TABLE_NAME}`,
          name: tableRow.TABLE_NAME,
          schema: tableRow.TABLE_SCHEMA,
          columns: [],
          comment: tableRow.TABLE_COMMENT,
          engine: tableRow.ENGINE,
          collation: tableRow.TABLE_COLLATION,
          autoIncrement: tableRow.AUTO_INCREMENT,
          statistics: {
            rowCount: tableRow.TABLE_ROWS,
            dataLength: tableRow.DATA_LENGTH,
            indexLength: tableRow.INDEX_LENGTH,
            checkTime: tableRow.CHECK_TIME,
            createTime: tableRow.CREATE_TIME,
            updateTime: tableRow.UPDATE_TIME
          }
        };
        
        // Extract columns for this table
        const [columnsRows] = await connection.execute(`
          SELECT 
            COLUMN_NAME,
            DATA_TYPE,
            CHARACTER_MAXIMUM_LENGTH,
            NUMERIC_PRECISION,
            NUMERIC_SCALE,
            IS_NULLABLE,
            COLUMN_DEFAULT,
            ORDINAL_POSITION,
            COLUMN_COMMENT,
            COLUMN_KEY,
            EXTRA,
            COLUMN_TYPE
          FROM information_schema.COLUMNS 
          WHERE TABLE_NAME = ? AND TABLE_SCHEMA = ?
          ORDER BY ORDINAL_POSITION
        `, [tableRow.TABLE_NAME, tableRow.TABLE_SCHEMA]);
        
        for (const colRow of columnsRows) {
          const column: Column = {
            id: `${table.id}.${colRow.COLUMN_NAME}`,
            name: colRow.COLUMN_NAME,
            type: this.mapMySQLType(colRow.DATA_TYPE),
            nullable: colRow.IS_NULLABLE === 'YES',
            primaryKey: colRow.COLUMN_KEY === 'PRI',
            unique: colRow.COLUMN_KEY === 'UNI',
            autoIncrement: colRow.EXTRA.includes('auto_increment'),
            defaultValue: colRow.COLUMN_DEFAULT,
            comment: colRow.COLUMN_COMMENT,
            constraints: {
              maxLength: colRow.CHARACTER_MAXIMUM_LENGTH,
              precision: colRow.NUMERIC_PRECISION,
              scale: colRow.NUMERIC_SCALE
            }
          };
          
          table.columns.push(column);
        }
        
        result.tables.push(table);
      }
      
      // Extract views
      const [viewsRows] = await connection.execute(`
        SELECT 
          TABLE_NAME,
          TABLE_SCHEMA,
          VIEW_DEFINITION,
          TABLE_COMMENT
        FROM information_schema.VIEWS 
        WHERE TABLE_SCHEMA NOT IN ('information_schema', 'performance_schema', 'mysql', 'sys')
        ORDER BY TABLE_SCHEMA, TABLE_NAME
      `);
      
      for (const viewRow of viewsRows) {
        result.views.push({
          name: viewRow.TABLE_NAME,
          definition: viewRow.VIEW_DEFINITION,
          columns: [],
          dependencies: [],
          materialized: false,
          updatable: false
        });
      }
      
      // Extract indexes
      const [indexesRows] = await connection.execute(`
        SELECT 
          INDEX_NAME,
          TABLE_NAME,
          TABLE_SCHEMA,
          NON_UNIQUE,
          INDEX_TYPE,
          CARDINALITY,
          SUB_PART,
          PACKED,
          NULLABLE,
          INDEX_COMMENT
        FROM information_schema.STATISTICS 
        WHERE TABLE_SCHEMA NOT IN ('information_schema', 'performance_schema', 'mysql', 'sys')
        GROUP BY INDEX_NAME, TABLE_NAME, TABLE_SCHEMA, NON_UNIQUE, INDEX_TYPE, INDEX_COMMENT
        ORDER BY TABLE_SCHEMA, TABLE_NAME, INDEX_NAME
      `);
      
      for (const idxRow of indexesRows) {
        result.indexes.push({
          id: `${idxRow.TABLE_SCHEMA}.${idxRow.INDEX_NAME}`,
          name: idxRow.INDEX_NAME,
          tableName: idxRow.TABLE_NAME,
          columns: [], // Will be populated separately
          unique: idxRow.NON_UNIQUE === 0,
          type: this.mapMySQLIndexType(idxRow.INDEX_TYPE),
          comment: idxRow.INDEX_COMMENT
        });
      }
      
      // Extract triggers
      const [triggersRows] = await connection.execute(`
        SELECT 
          TRIGGER_NAME,
          EVENT_MANIPULATION,
          ACTION_TIMING,
          ACTION_STATEMENT,
          ACTION_ORIENTATION,
          TRIGGER_SCHEMA,
          TRIGGER_CATALOG
        FROM information_schema.TRIGGERS 
        WHERE TRIGGER_SCHEMA NOT IN ('information_schema', 'performance_schema', 'mysql', 'sys')
        ORDER BY TRIGGER_SCHEMA, TRIGGER_NAME
      `);
      
      for (const triggerRow of triggersRows) {
        result.triggers.push({
          id: `${triggerRow.TRIGGER_SCHEMA}.${triggerRow.TRIGGER_NAME}`,
          name: triggerRow.TRIGGER_NAME,
          event: triggerRow.EVENT_MANIPULATION.toLowerCase(),
          timing: triggerRow.ACTION_TIMING.toLowerCase(),
          action: triggerRow.ACTION_STATEMENT
        });
      }
      
      // Extract functions and procedures
      const [routinesRows] = await connection.execute(`
        SELECT 
          ROUTINE_NAME,
          ROUTINE_TYPE,
          DATA_TYPE,
          ROUTINE_DEFINITION,
          ROUTINE_COMMENT,
          ROUTINE_SCHEMA
        FROM information_schema.ROUTINES 
        WHERE ROUTINE_SCHEMA NOT IN ('information_schema', 'performance_schema', 'mysql', 'sys')
        ORDER BY ROUTINE_SCHEMA, ROUTINE_NAME
      `);
      
      for (const routineRow of routinesRows) {
        if (routineRow.ROUTINE_TYPE === 'FUNCTION') {
          result.functions.push({
            name: routineRow.ROUTINE_NAME,
            parameters: [], // Will be populated separately
            returnType: routineRow.DATA_TYPE,
            language: 'SQL',
            body: routineRow.ROUTINE_DEFINITION,
            volatility: 'VOLATILE'
          });
        } else if (routineRow.ROUTINE_TYPE === 'PROCEDURE') {
          result.procedures.push({
            name: routineRow.ROUTINE_NAME,
            parameters: [], // Will be populated separately
            language: 'SQL',
            body: routineRow.ROUTINE_DEFINITION
          });
        }
      }
      
      await connection.end();
      
      console.log(`✅ MySQL extraction completed: ${result.tables.length} tables, ${result.views.length} views, ${result.indexes.length} indexes`);
      return result;
      
    } catch (error) {
      console.error('❌ MySQL extraction failed:', error);
      throw error;
    }
  }
  
  /**
   * Map MySQL data types to our DataType enum
   */
  private static mapMySQLType(mysqlType: string): string {
    const typeMap: Record<string, string> = {
      'varchar': 'VARCHAR',
      'char': 'CHAR',
      'text': 'TEXT',
      'tinytext': 'TEXT',
      'mediumtext': 'TEXT',
      'longtext': 'TEXT',
      'int': 'INTEGER',
      'integer': 'INTEGER',
      'bigint': 'BIGINT',
      'smallint': 'SMALLINT',
      'tinyint': 'TINYINT',
      'mediumint': 'INTEGER',
      'float': 'FLOAT',
      'double': 'DOUBLE',
      'decimal': 'DECIMAL',
      'numeric': 'DECIMAL',
      'bit': 'BOOLEAN',
      'boolean': 'BOOLEAN',
      'bool': 'BOOLEAN',
      'date': 'DATE',
      'datetime': 'DATETIME',
      'timestamp': 'TIMESTAMP',
      'time': 'TIME',
      'year': 'YEAR',
      'json': 'JSON',
      'binary': 'BINARY',
      'varbinary': 'VARBINARY',
      'blob': 'BLOB',
      'tinyblob': 'BLOB',
      'mediumblob': 'BLOB',
      'longblob': 'BLOB',
      'enum': 'ENUM',
      'set': 'SET',
      'geometry': 'GEOMETRY',
      'point': 'POINT',
      'linestring': 'LINESTRING',
      'polygon': 'POLYGON',
      'multipoint': 'MULTIPOINT',
      'multilinestring': 'MULTILINESTRING',
      'multipolygon': 'MULTIPOLYGON',
      'geometrycollection': 'GEOMETRYCOLLECTION'
    };
    
    return typeMap[mysqlType.toLowerCase()] || 'CUSTOM';
  }
  
  /**
   * Map MySQL index types to our index type enum
   */
  private static mapMySQLIndexType(mysqlIndexType: string): string {
    const typeMap: Record<string, string> = {
      'BTREE': 'btree',
      'HASH': 'hash',
      'FULLTEXT': 'gin',
      'SPATIAL': 'gist'
    };
    
    return typeMap[mysqlIndexType.toUpperCase()] || 'btree';
  }
  
  /**
   * Extract system catalog information from SQLite
   */
  static async extractSQLite(filePath: string): Promise<SystemCatalogResult> {
    console.log('🔍 Extracting SQLite system catalog...');
    
    try {
      const sqlite3 = require('sqlite3');
      const { open } = require('sqlite');
      
      const db = await open({
        filename: filePath,
        driver: sqlite3.Database
      });
      
      const result: SystemCatalogResult = {
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
          extractedAt: new Date()
        }
      };
      
      // Get database version and metadata
      const versionResult = await db.get('SELECT sqlite_version() as version');
      result.metadata.version = versionResult.version;
      
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
        const table: Table = {
          id: tableRow.name,
          name: tableRow.name,
          columns: [],
          comment: '',
          statistics: {
            rowCount: 0,
            dataLength: 0,
            indexLength: 0,
            checkTime: new Date(),
            createTime: new Date(),
            updateTime: new Date()
          }
        };
        
        // Get table info using PRAGMA
        const tableInfo = await db.all(`PRAGMA table_info(${tableRow.name})`);
        
        for (const colRow of tableInfo) {
          const column: Column = {
            id: `${table.id}.${colRow.name}`,
            name: colRow.name,
            type: this.mapSQLiteType(colRow.type),
            nullable: !colRow.notnull,
            primaryKey: colRow.pk === 1,
            defaultValue: colRow.dflt_value,
            constraints: {}
          };
          
          table.columns.push(column);
        }
        
        // Get row count
        const countResult = await db.get(`SELECT COUNT(*) as count FROM ${tableRow.name}`);
        table.statistics!.rowCount = countResult.count;
        
        result.tables.push(table);
      }
      
      // Extract views from sqlite_master
      const viewsResult = await db.all(`
        SELECT 
          name,
          sql
        FROM sqlite_master 
        WHERE type = 'view'
        ORDER BY name
      `);
      
      for (const viewRow of viewsResult) {
        result.views.push({
          name: viewRow.name,
          definition: viewRow.sql,
          columns: [],
          dependencies: [],
          materialized: false,
          updatable: false
        });
      }
      
      // Extract indexes from sqlite_master
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
      
      for (const idxRow of indexesResult) {
        result.indexes.push({
          id: idxRow.name,
          name: idxRow.name,
          tableName: idxRow.tbl_name,
          columns: [], // Will be parsed from SQL
          unique: idxRow.sql?.includes('UNIQUE') || false,
          type: 'btree',
          comment: ''
        });
      }
      
      // Extract triggers from sqlite_master
      const triggersResult = await db.all(`
        SELECT 
          name,
          tbl_name,
          sql
        FROM sqlite_master 
        WHERE type = 'trigger'
        ORDER BY tbl_name, name
      `);
      
      for (const triggerRow of triggersResult) {
        result.triggers.push({
          id: triggerRow.name,
          name: triggerRow.name,
          event: 'update', // Will be parsed from SQL
          timing: 'after',
          action: triggerRow.sql
        });
      }
      
      await db.close();
      
      console.log(`✅ SQLite extraction completed: ${result.tables.length} tables, ${result.views.length} views, ${result.indexes.length} indexes`);
      return result;
      
    } catch (error) {
      console.error('❌ SQLite extraction failed:', error);
      throw error;
    }
  }
  
  /**
   * Extract system catalog information from MongoDB
   */
  static async extractMongoDB(connectionString: string): Promise<SystemCatalogResult> {
    console.log('🔍 Extracting MongoDB system catalog...');
    
    try {
      const { MongoClient } = require('mongodb');
      const client = new MongoClient(connectionString);
      await client.connect();
      
      const result: SystemCatalogResult = {
        tables: [],
        views: [],
        indexes: [],
        triggers: [],
        sequences: [],
        functions: [],
        procedures: [],
        metadata: {
          databaseType: 'mongodb',
          version: '',
          extractedAt: new Date()
        }
      };
      
      const admin = client.db().admin();
      const serverInfo = await admin.serverStatus();
      result.metadata.version = serverInfo.version;
      
      const db = client.db();
      const collections = await db.listCollections().toArray();
      
      for (const collectionInfo of collections) {
        const collectionName = collectionInfo.name;
        const collection = db.collection(collectionName);
        
        // Create a table representation for the collection
        const table: Table = {
          id: collectionName,
          name: collectionName,
          columns: [],
          comment: collectionInfo.options?.comment || '',
          statistics: {
            rowCount: await collection.countDocuments(),
            dataLength: 0,
            indexLength: 0,
            checkTime: new Date(),
            createTime: new Date(),
            updateTime: new Date()
          }
        };
        
        // Sample documents to infer schema
        const sampleDocs = await collection.find({}).limit(10).toArray();
        const fieldTypes = new Map<string, string>();
        
        for (const doc of sampleDocs) {
          this.analyzeDocumentFields(doc, fieldTypes, '');
        }
        
        // Create columns based on inferred types
        for (const [fieldName, fieldType] of fieldTypes) {
          const column: Column = {
            id: `${table.id}.${fieldName}`,
            name: fieldName,
            type: this.mapMongoDBType(fieldType),
            nullable: true,
            primaryKey: fieldName === '_id',
            constraints: {}
          };
          
          table.columns.push(column);
        }
        
        result.tables.push(table);
        
        // Extract indexes for this collection
        const indexes = await collection.listIndexes().toArray();
        for (const index of indexes) {
          result.indexes.push({
            id: `${collectionName}.${index.name}`,
            name: index.name,
            tableName: collectionName,
            columns: Object.keys(index.key),
            unique: index.unique || false,
            type: 'btree',
            comment: index.name === '_id_' ? 'Primary key index' : ''
          });
        }
      }
      
      await client.close();
      
      console.log(`✅ MongoDB extraction completed: ${result.tables.length} collections, ${result.indexes.length} indexes`);
      return result;
      
    } catch (error) {
      console.error('❌ MongoDB extraction failed:', error);
      throw error;
    }
  }
  
  /**
   * Analyze MongoDB document fields to infer types
   */
  private static analyzeDocumentFields(obj: any, fieldTypes: Map<string, string>, prefix: string): void {
    for (const [key, value] of Object.entries(obj)) {
      const fieldName = prefix ? `${prefix}.${key}` : key;
      const valueType = this.getMongoDBValueType(value);
      
      if (!fieldTypes.has(fieldName) || fieldTypes.get(fieldName) === 'null') {
        fieldTypes.set(fieldName, valueType);
      }
    }
  }
  
  /**
   * Get MongoDB value type
   */
  private static getMongoDBValueType(value: any): string {
    if (value === null) return 'null';
    if (value === undefined) return 'undefined';
    if (Array.isArray(value)) return 'array';
    if (value instanceof Date) return 'date';
    if (typeof value === 'boolean') return 'boolean';
    if (typeof value === 'number') return 'number';
    if (typeof value === 'string') return 'string';
    if (typeof value === 'object') return 'object';
    return 'unknown';
  }
  
  /**
   * Map MongoDB types to our DataType enum
   */
  private static mapMongoDBType(mongoType: string): string {
    const typeMap: Record<string, string> = {
      'string': 'TEXT',
      'number': 'REAL',
      'boolean': 'BOOLEAN',
      'date': 'DATETIME',
      'object': 'JSON',
      'array': 'JSON',
      'null': 'TEXT',
      'undefined': 'TEXT',
      'unknown': 'CUSTOM'
    };
    
    return typeMap[mongoType] || 'CUSTOM';
  }
  
  /**
   * Map SQLite types to our DataType enum
   */
  private static mapSQLiteType(sqliteType: string): string {
    const typeMap: Record<string, string> = {
      'TEXT': 'TEXT',
      'INTEGER': 'INTEGER',
      'REAL': 'REAL',
      'BLOB': 'BLOB',
      'NUMERIC': 'DECIMAL',
      'VARCHAR': 'VARCHAR',
      'CHAR': 'CHAR',
      'INT': 'INTEGER',
      'BIGINT': 'BIGINT',
      'FLOAT': 'FLOAT',
      'DOUBLE': 'DOUBLE',
      'DECIMAL': 'DECIMAL',
      'BOOLEAN': 'BOOLEAN',
      'DATE': 'DATE',
      'DATETIME': 'DATETIME',
      'TIMESTAMP': 'TIMESTAMP',
      'TIME': 'TIME'
    };
    
    return typeMap[sqliteType.toUpperCase()] || 'CUSTOM';
  }
  
  /**
   * Map PostgreSQL data types to our DataType enum
   */
  private static mapPostgreSQLType(pgType: string): string {
    const typeMap: Record<string, string> = {
      'character varying': 'VARCHAR',
      'varchar': 'VARCHAR',
      'character': 'CHAR',
      'char': 'CHAR',
      'text': 'TEXT',
      'integer': 'INTEGER',
      'bigint': 'BIGINT',
      'smallint': 'SMALLINT',
      'real': 'REAL',
      'double precision': 'DOUBLE',
      'numeric': 'DECIMAL',
      'decimal': 'DECIMAL',
      'boolean': 'BOOLEAN',
      'date': 'DATE',
      'timestamp': 'TIMESTAMP',
      'timestamp with time zone': 'TIMESTAMP',
      'time': 'TIME',
      'time with time zone': 'TIME',
      'interval': 'INTERVAL',
      'json': 'JSON',
      'jsonb': 'JSONB',
      'uuid': 'UUID',
      'bytea': 'BLOB',
      'point': 'POINT',
      'polygon': 'POLYGON',
      'line': 'LINESTRING',
      'circle': 'GEOMETRY',
      'path': 'GEOMETRY',
      'box': 'GEOMETRY',
      'inet': 'INET',
      'cidr': 'CIDR',
      'macaddr': 'MACADDR',
      'tsvector': 'TSVECTOR',
      'tsquery': 'TSQUERY',
      'array': 'ARRAY'
    };
    
    return typeMap[pgType.toLowerCase()] || 'CUSTOM';
  }
}
