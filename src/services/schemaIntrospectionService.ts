// Schema Introspection Service
// Handles database schema reading, conversion, and analysis

import {
  DatabaseType,
  DatabaseConfig,
  DatabaseSchema,
  Relationship,
  Index,
  Constraint,
  ForeignKey,
  Project,
  DatabaseConnection
} from '@/types/project';
import { DataType, Table, Column } from '@/types/database';
import { DatabaseConnector } from '@/utils/databaseConnector';

export class SchemaIntrospectionService {
  private static readonly TYPE_MAPPINGS = {
    // SQLite type mappings
    sqlite: {
      'INTEGER': 'integer',
      'REAL': 'decimal',
      'TEXT': 'text',
      'BLOB': 'blob',
      'NUMERIC': 'numeric'
    },

    // PostgreSQL type mappings
    postgresql: {
      'smallint': 'smallint',
      'integer': 'integer',
      'bigint': 'bigint',
      'decimal': 'decimal',
      'numeric': 'numeric',
      'real': 'real',
      'double precision': 'double',
      'serial': 'serial',
      'bigserial': 'bigserial',
      'money': 'money',
      'character varying': 'varchar',
      'varchar': 'varchar',
      'character': 'char',
      'text': 'text',
      'bytea': 'bytea',
      'timestamp': 'timestamp',
      'timestamp with time zone': 'timestamptz',
      'date': 'date',
      'time': 'time',
      'time with time zone': 'timetz',
      'interval': 'interval',
      'boolean': 'boolean',
      'point': 'point',
      'line': 'line',
      'lseg': 'lseg',
      'box': 'box',
      'path': 'path',
      'polygon': 'polygon',
      'circle': 'circle',
      'inet': 'inet',
      'macaddr': 'macaddr',
      'bit': 'bit',
      'bit varying': 'varbit',
      'uuid': 'uuid',
      'xml': 'xml',
      'json': 'json',
      'jsonb': 'jsonb'
    },

    // MySQL type mappings
    mysql: {
      'TINYINT': 'tinyint',
      'SMALLINT': 'smallint',
      'MEDIUMINT': 'mediumint',
      'INT': 'integer',
      'BIGINT': 'bigint',
      'DECIMAL': 'decimal',
      'FLOAT': 'float',
      'DOUBLE': 'double',
      'BIT': 'bit',
      'CHAR': 'char',
      'VARCHAR': 'varchar',
      'BINARY': 'binary',
      'VARBINARY': 'varbinary',
      'TINYBLOB': 'tinyblob',
      'BLOB': 'blob',
      'MEDIUMBLOB': 'mediumblob',
      'LONGBLOB': 'longblob',
      'TINYTEXT': 'tinytext',
      'TEXT': 'text',
      'MEDIUMTEXT': 'mediumtext',
      'LONGTEXT': 'longtext',
      'ENUM': 'enum',
      'SET': 'set',
      'DATE': 'date',
      'DATETIME': 'datetime',
      'TIMESTAMP': 'timestamp',
      'TIME': 'time',
      'YEAR': 'year'
    },

    // MongoDB (schema-less, but we can infer from documents)
    mongodb: {
      'string': 'string',
      'int32': 'integer',
      'int64': 'bigint',
      'double': 'double',
      'decimal': 'decimal',
      'bool': 'boolean',
      'date': 'date',
      'timestamp': 'timestamp',
      'object': 'object',
      'array': 'array',
      'null': 'null',
      'regex': 'regex',
      'binary': 'binary',
      'objectid': 'objectid',
      'uuid': 'uuid'
    }
  };

  /**
   * Introspect database schema
   */
  static async introspectSchema(
    type: DatabaseType,
    config: DatabaseConfig
  ): Promise<DatabaseSchema> {
    try {
      switch (type) {
        case 'sqlite':
          return await this.introspectSQLiteSchema(config);
        case 'postgresql':
          return await this.introspectPostgreSQLSchema(config);
        case 'mysql':
          return await this.introspectMySQLSchema(config);
        case 'mongodb':
          return await this.introspectMongoDBSchema(config);
        default:
          throw new Error(`Schema introspection not supported for ${type}`);
      }
    } catch (error) {
      console.error(`Schema introspection failed for ${type}:`, error);
      throw error;
    }
  }

  /**
   * Introspect SQLite schema
   */
  private static async introspectSQLiteSchema(config: DatabaseConfig): Promise<DatabaseSchema> {
    try {
      const Database = (await import('better-sqlite3')).default;
      const dbPath = config.path || config.connectionString;
      
      if (!dbPath) {
        throw new Error('SQLite database path not provided');
      }

      const db = new Database(dbPath, { readonly: true });
      const tables: Table[] = [];

      try {
        // Get all tables
        const tableRows = db.prepare(`
          SELECT name FROM sqlite_master 
          WHERE type='table' AND name NOT LIKE 'sqlite_%'
          ORDER BY name
        `).all() as any[];

        for (const tableRow of tableRows) {
          const tableName = tableRow.name;
          const columns: Column[] = [];

          // Get table info
          const columnRows = db.prepare(`PRAGMA table_info(${tableName})`).all() as any[];

          for (const col of columnRows) {
            columns.push({
              id: `${tableName}_${col.name}`,
              name: col.name,
              type: col.type || 'TEXT',
              nullable: col.notnull === 0,
              primaryKey: col.pk === 1,
              autoIncrement: col.pk === 1 && col.type?.toUpperCase() === 'INTEGER',
              defaultValue: col.dflt_value,
              constraints: {}
            });
          }

          // Get indexes
          const indexRows = db.prepare(`PRAGMA index_list(${tableName})`).all() as any[];
          const indexes: Index[] = [];

          for (const idx of indexRows) {
            const indexInfo = db.prepare(`PRAGMA index_info(${idx.name})`).all() as any[];
            indexes.push({
              id: `${tableName}_${idx.name}`,
              name: idx.name,
              columns: indexInfo.map((i: any) => i.name),
              unique: idx.unique === 1,
              type: 'btree'
            });
          }

          tables.push({
            id: tableName,
            name: tableName,
            columns,
            indexes
          });
        }

        db.close();
      } catch (queryError) {
        db.close();
        throw queryError;
      }

      return {
        id: `schema_${Date.now()}`,
        name: config.database || 'Introspected SQLite Schema',
        tables: tables as any,
        relationships: this.extractRelationshipsFromTables(tables),
        indexes: tables.flatMap(t => t.indexes).filter(Boolean) as any
      };
    } catch (error) {
      console.error('SQLite schema introspection failed:', error);
      throw new Error(`Failed to introspect SQLite schema: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Introspect PostgreSQL schema
   */
  private static async introspectPostgreSQLSchema(config: DatabaseConfig): Promise<DatabaseSchema> {
    try {
      const { Client } = await import('pg');
      const client = new Client({
        host: config.host,
        port: config.port,
        database: config.database,
        user: config.username,
        password: config.password,
        ssl: config.ssl ? { rejectUnauthorized: false } : undefined
      });

      await client.connect();
      const tables: Table[] = [];

      try {
        // Get all tables from public schema
        const tableResult = await client.query(`
          SELECT table_name 
          FROM information_schema.tables 
          WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
          ORDER BY table_name
        `);

        for (const tableRow of tableResult.rows) {
          const tableName = tableRow.table_name;
          const columns: Column[] = [];

          // Get columns information
          const columnResult = await client.query(`
            SELECT 
              column_name,
              data_type,
              is_nullable,
              column_default,
              character_maximum_length
            FROM information_schema.columns
            WHERE table_schema = 'public' AND table_name = $1
            ORDER BY ordinal_position
          `, [tableName]);

          // Get primary keys
          const pkResult = await client.query(`
            SELECT a.attname
            FROM pg_index i
            JOIN pg_attribute a ON a.attrelid = i.indrelid AND a.attnum = ANY(i.indkey)
            WHERE i.indrelid = $1::regclass AND i.indisprimary
          `, [tableName]);

          const primaryKeys = new Set(pkResult.rows.map(r => r.attname));

          for (const col of columnResult.rows) {
            const isPrimary = primaryKeys.has(col.column_name);
            const isAutoIncrement = col.column_default?.includes('nextval');

            columns.push({
              id: `${tableName}_${col.column_name}`,
              name: col.column_name,
              type: col.data_type.toUpperCase(),
              nullable: col.is_nullable === 'YES',
              primaryKey: isPrimary,
              autoIncrement: isAutoIncrement,
              defaultValue: col.column_default,
              constraints: col.character_maximum_length ? { maxLength: col.character_maximum_length } : {}
            });
          }

          // Get indexes
          const indexResult = await client.query(`
            SELECT
              i.relname as index_name,
              ix.indisunique as is_unique,
              array_agg(a.attname ORDER BY a.attnum) as columns
            FROM pg_class t
            JOIN pg_index ix ON t.oid = ix.indrelid
            JOIN pg_class i ON i.oid = ix.indexrelid
            JOIN pg_attribute a ON a.attrelid = t.oid AND a.attnum = ANY(ix.indkey)
            WHERE t.relname = $1 AND t.relkind = 'r'
            GROUP BY i.relname, ix.indisunique
          `, [tableName]);

          const indexes: Index[] = indexResult.rows.map(idx => ({
            id: `${tableName}_${idx.index_name}`,
            name: idx.index_name,
            columns: idx.columns,
            unique: idx.is_unique,
            type: 'btree'
          }));

          tables.push({
            id: tableName,
            name: tableName,
            columns,
            indexes
          });
        }

        await client.end();
      } catch (queryError) {
        await client.end();
        throw queryError;
      }

      return {
        id: `schema_${Date.now()}`,
        name: config.database || 'Introspected PostgreSQL Schema',
        tables: tables as any,
        relationships: this.extractRelationshipsFromTables(tables),
        indexes: tables.flatMap(t => t.indexes).filter(Boolean) as any
      };
    } catch (error) {
      console.error('PostgreSQL schema introspection failed:', error);
      throw new Error(`Failed to introspect PostgreSQL schema: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Introspect MySQL schema
   */
  private static async introspectMySQLSchema(config: DatabaseConfig): Promise<DatabaseSchema> {
    try {
      const mysql = await import('mysql2/promise');
      const connection = await mysql.createConnection({
        host: config.host,
        port: config.port,
        database: config.database,
        user: config.username,
        password: config.password
      });

      const tables: Table[] = [];

      try {
        // Get all tables
        const [tableRows] = await connection.execute(
          'SHOW TABLES'
        ) as any[];

        const dbName = config.database || '';

        for (const tableRow of tableRows) {
          const tableName = Object.values(tableRow)[0] as string;
          const columns: Column[] = [];

          // Get columns using DESCRIBE
          const [columnRows] = await connection.execute(
            `DESCRIBE ${tableName}`
          ) as any[];

          for (const col of columnRows) {
            const isPrimary = col.Key === 'PRI';
            const isAutoIncrement = col.Extra?.includes('auto_increment');
            const isUnique = col.Key === 'UNI';

            columns.push({
              id: `${tableName}_${col.Field}`,
              name: col.Field,
              type: col.Type.toUpperCase(),
              nullable: col.Null === 'YES',
              primaryKey: isPrimary,
              autoIncrement: isAutoIncrement,
              unique: isUnique,
              defaultValue: col.Default,
              constraints: {}
            });
          }

          // Get indexes
          const [indexRows] = await connection.execute(
            `SHOW INDEX FROM ${tableName}`
          ) as any[];

          const indexMap = new Map<string, { columns: string[], unique: boolean }>();

          for (const idx of indexRows) {
            if (!indexMap.has(idx.Key_name)) {
              indexMap.set(idx.Key_name, {
                columns: [],
                unique: idx.Non_unique === 0
              });
            }
            indexMap.get(idx.Key_name)!.columns.push(idx.Column_name);
          }

          const indexes: Index[] = Array.from(indexMap.entries()).map(([name, data]) => ({
            id: `${tableName}_${name}`,
            name,
            columns: data.columns,
            unique: data.unique,
            type: 'btree'
          }));

          tables.push({
            id: tableName,
            name: tableName,
            columns,
            indexes
          });
        }

        await connection.end();
      } catch (queryError) {
        await connection.end();
        throw queryError;
      }

      return {
        id: `schema_${Date.now()}`,
        name: config.database || 'Introspected MySQL Schema',
        tables: tables as any,
        relationships: this.extractRelationshipsFromTables(tables),
        indexes: tables.flatMap(t => t.indexes).filter(Boolean) as any
      };
    } catch (error) {
      console.error('MySQL schema introspection failed:', error);
      throw new Error(`Failed to introspect MySQL schema: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Introspect MongoDB schema (inferred from documents)
   */
  private static async introspectMongoDBSchema(config: DatabaseConfig): Promise<DatabaseSchema> {
    try {
      // Dynamic import to avoid bundling issues
      if (typeof window !== 'undefined') {
        throw new Error('MongoDB connections are not supported in the browser');
      }

      const { MongoClient } = await import('mongodb');
      const connectionString = config.connectionString || 
        `mongodb://${config.username ? `${config.username}:${config.password}@` : ''}${config.host}:${config.port}/${config.database}`;
      
      const client = new MongoClient(connectionString);
      await client.connect();

      const tables: Table[] = [];

      try {
        const db = client.db(config.database);
        const collections = await db.listCollections().toArray();

        for (const collectionInfo of collections) {
          const collectionName = collectionInfo.name;
          const collection = db.collection(collectionName);
          const columns: Column[] = [];

          // Sample documents to infer schema
          const sampleDocs = await collection.find().limit(100).toArray();
          
          if (sampleDocs.length === 0) {
            // Empty collection - add just _id
            columns.push({
              id: `${collectionName}__id`,
              name: '_id',
              type: 'OBJECTID',
              nullable: false,
              primaryKey: true,
              constraints: {}
            });
          } else {
            // Analyze field structure from samples
            const fieldTypes = new Map<string, Set<string>>();

            for (const doc of sampleDocs) {
              this.analyzeDocumentFields(doc, fieldTypes, '');
            }

            // Convert to columns
            for (const [fieldName, types] of fieldTypes.entries()) {
              const isPrimary = fieldName === '_id';
              const inferredType = this.inferMongoFieldType(types);

              columns.push({
                id: `${collectionName}_${fieldName}`,
                name: fieldName,
                type: inferredType,
                nullable: true, // MongoDB fields are generally nullable
                primaryKey: isPrimary,
                constraints: {}
              });
            }
          }

          // Get indexes
          const indexInfo = await collection.indexes();
          const indexes: Index[] = indexInfo
            .filter(idx => idx.name !== '_id_') // Skip default _id index
            .map(idx => ({
              id: `${collectionName}_${idx.name}`,
              name: idx.name || '',
              columns: Object.keys(idx.key || {}),
              unique: idx.unique || false,
              type: 'btree'
            }));

          tables.push({
            id: collectionName,
            name: collectionName,
            columns,
            indexes
          });
        }

        await client.close();
      } catch (queryError) {
        await client.close();
        throw queryError;
      }

      return {
        id: `schema_${Date.now()}`,
        name: config.database || 'Introspected MongoDB Schema',
        tables: tables as any,
        relationships: [], // MongoDB doesn't have explicit relationships
        indexes: tables.flatMap(t => t.indexes).filter(Boolean) as any
      };
    } catch (error) {
      console.error('MongoDB schema introspection failed:', error);
      throw new Error(`Failed to introspect MongoDB schema: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Helper to analyze document fields recursively
   */
  private static analyzeDocumentFields(doc: any, fieldTypes: Map<string, Set<string>>, prefix: string): void {
    for (const [key, value] of Object.entries(doc)) {
      const fieldName = prefix ? `${prefix}.${key}` : key;
      
      if (!fieldTypes.has(fieldName)) {
        fieldTypes.set(fieldName, new Set());
      }

      const type = Array.isArray(value) ? 'array' : typeof value;
      fieldTypes.get(fieldName)!.add(type);

      // For nested objects, analyze recursively (but limit depth)
      if (type === 'object' && value !== null && !prefix.includes('.')) {
        this.analyzeDocumentFields(value, fieldTypes, fieldName);
      }
    }
  }

  /**
   * Infer MongoDB field type from observed types
   */
  private static inferMongoFieldType(types: Set<string>): string {
    if (types.has('object')) return 'JSON';
    if (types.has('array')) return 'ARRAY';
    if (types.has('number')) return 'NUMBER';
    if (types.has('boolean')) return 'BOOLEAN';
    if (types.has('string')) return 'VARCHAR';
    return 'VARCHAR';
  }

  /**
   * Compare two schemas and return differences
   */
  static compareSchemas(
    sourceSchema: DatabaseSchema,
    targetSchema: DatabaseSchema
  ): SchemaComparisonResult {
    const changes: SchemaChange[] = [];
    const conflicts: SchemaConflict[] = [];

    // Compare tables
    const sourceTables = new Map(sourceSchema.tables.map(t => [t.name, t]));
    const targetTables = new Map(targetSchema.tables.map(t => [t.name, t]));

    // Tables in source but not in target
    for (const [tableName, sourceTable] of sourceTables) {
      if (!targetTables.has(tableName)) {
        changes.push({
          type: 'create_table',
          entity: 'table',
          entityName: tableName,
          sourceSchema: sourceSchema,
          targetSchema: targetSchema,
          details: { table: sourceTable }
        });
      }
    }

    // Tables in target but not in source
    for (const [tableName, targetTable] of targetTables) {
      if (!sourceTables.has(tableName)) {
        changes.push({
          type: 'drop_table',
          entity: 'table',
          entityName: tableName,
          sourceSchema: sourceSchema,
          targetSchema: targetSchema,
          details: { table: targetTable }
        });
      }
    }

    // Compare existing tables
    for (const [tableName, sourceTable] of sourceTables) {
      const targetTable = targetTables.get(tableName);
      if (targetTable) {
        const tableChanges = this.compareTables(sourceTable as any, targetTable as any);
        changes.push(...tableChanges);
      }
    }

    return {
      changes,
      conflicts,
      summary: {
        tablesToCreate: changes.filter(c => c.type === 'create_table').length,
        tablesToDrop: changes.filter(c => c.type === 'drop_table').length,
        tablesToAlter: changes.filter(c => c.type === 'alter_table').length,
        totalChanges: changes.length,
        totalConflicts: conflicts.length
      }
    };
  }

  /**
   * Compare two tables
   */
  private static compareTables(sourceTable: Table, targetTable: Table): SchemaChange[] {
    const changes: SchemaChange[] = [];

    // Compare columns
    const sourceColumns = new Map(sourceTable.columns.map(c => [c.name, c]));
    const targetColumns = new Map(targetTable.columns.map(c => [c.name, c]));

    // Columns in source but not in target
    for (const [columnName, sourceColumn] of sourceColumns) {
      if (!targetColumns.has(columnName)) {
        changes.push({
          type: 'add_column',
          entity: 'column',
          entityName: columnName,
          sourceSchema: null,
          targetSchema: null,
          details: { table: sourceTable.name, column: sourceColumn }
        });
      }
    }

    // Columns in target but not in source
    for (const [columnName, targetColumn] of targetColumns) {
      if (!sourceColumns.has(columnName)) {
        changes.push({
          type: 'drop_column',
          entity: 'column',
          entityName: columnName,
          sourceSchema: null,
          targetSchema: null,
          details: { table: targetTable.name, column: targetColumn }
        });
      }
    }

    // Compare existing columns
    for (const [columnName, sourceColumn] of sourceColumns) {
      const targetColumn = targetColumns.get(columnName);
      if (targetColumn) {
        const columnChanges = this.compareColumns(sourceColumn, targetColumn, sourceTable.name);
        changes.push(...columnChanges);
      }
    }

    return changes;
  }

  /**
   * Compare two columns
   */
  private static compareColumns(sourceColumn: Column, targetColumn: Column, tableName: string): SchemaChange[] {
    const changes: SchemaChange[] = [];

    // Check for differences
    if (sourceColumn.type !== targetColumn.type) {
      changes.push({
        type: 'alter_column',
        entity: 'column',
        entityName: sourceColumn.name,
        sourceSchema: null,
        targetSchema: null,
        details: {
          table: tableName,
          column: sourceColumn.name,
          property: 'type',
          oldValue: targetColumn.type,
          newValue: sourceColumn.type
        }
      });
    }

    if (sourceColumn.nullable !== targetColumn.nullable) {
      changes.push({
        type: 'alter_column',
        entity: 'column',
        entityName: sourceColumn.name,
        sourceSchema: null,
        targetSchema: null,
        details: {
          table: tableName,
          column: sourceColumn.name,
          property: 'nullable',
          oldValue: targetColumn.nullable,
          newValue: sourceColumn.nullable
        }
      });
    }

    return changes;
  }

  /**
   * Generate SQL migration scripts from schema comparison
   */
  static generateMigrationSQL(
    comparison: SchemaComparisonResult,
    targetType: DatabaseType
  ): string[] {
    const scripts: string[] = [];

    for (const change of comparison.changes) {
      const script = this.generateChangeSQL(change, targetType);
      if (script) {
        scripts.push(script);
      }
    }

    return scripts;
  }

  /**
   * Generate SQL for a single change
   */
  private static generateChangeSQL(change: SchemaChange, targetType: DatabaseType): string {
    switch (change.type) {
      case 'create_table':
        return this.generateCreateTableSQL(change.details.table, targetType);

      case 'drop_table':
        return `DROP TABLE ${change.entityName};`;

      case 'add_column':
        return `ALTER TABLE ${change.details.table} ADD COLUMN ${this.generateColumnSQL(change.details.column, targetType)};`;

      case 'drop_column':
        return `ALTER TABLE ${change.details.table} DROP COLUMN ${change.entityName};`;

      case 'alter_column':
        const { table, column, property, newValue } = change.details;
        if (property === 'type') {
          return `ALTER TABLE ${table} ALTER COLUMN ${column} TYPE ${newValue};`;
        } else if (property === 'nullable') {
          const action = newValue ? 'DROP NOT NULL' : 'SET NOT NULL';
          return `ALTER TABLE ${table} ALTER COLUMN ${column} ${action};`;
        }
        break;
    }

    return '';
  }

  /**
   * Generate CREATE TABLE SQL
   */
  private static generateCreateTableSQL(table: Table, targetType: DatabaseType): string {
    const columns = table.columns.map(col => this.generateColumnSQL(col, targetType)).join(', ');
    return `CREATE TABLE ${table.name} (${columns});`;
  }

  /**
   * Generate column definition SQL
   */
  private static generateColumnSQL(column: Column, targetType: DatabaseType): string {
    let sql = `${column.name} ${column.type}`;

    if (column.constraints?.maxLength) {
      sql += `(${column.constraints.maxLength})`;
    }

    if (column.constraints?.precision && column.constraints?.scale) {
      sql += `(${column.constraints.precision}, ${column.constraints.scale})`;
    }

    if (!column.nullable) {
      sql += ' NOT NULL';
    }

    if (column.primaryKey) {
      sql += ' PRIMARY KEY';
    }

    if (column.autoIncrement) {
      switch (targetType) {
        case 'postgresql':
          sql += ' SERIAL';
          break;
        case 'mysql':
          sql += ' AUTO_INCREMENT';
          break;
        case 'sqlite':
          sql += ' AUTOINCREMENT';
          break;
      }
    }

    if (column.unique) {
      sql += ' UNIQUE';
    }

    if (column.defaultValue) {
      sql += ` DEFAULT ${column.defaultValue}`;
    }

    return sql;
  }

  /**
   * Extract relationships from tables based on foreign key patterns
   */
  private static extractRelationshipsFromTables(tables: Table[]): Relationship[] {
    const relationships: Relationship[] = [];
    
    // Look for foreign key patterns in column names and types
    for (const table of tables) {
      for (const column of table.columns) {
        // Check if column name suggests a foreign key (ends with _id or Id)
        if ((column.name.endsWith('_id') || column.name.endsWith('Id')) && !column.primaryKey) {
          const referencedTableName = column.name.replace(/(_id|Id)$/, '');
          const referencedTable = tables.find(t => 
            t.name.toLowerCase() === referencedTableName.toLowerCase() ||
            t.name.toLowerCase() === `${referencedTableName}s`.toLowerCase()
          );

          if (referencedTable) {
            relationships.push({
              id: `${table.name}_${column.name}_${referencedTable.name}`,
              type: 'many-to-one',
              sourceTable: table.name,
              targetTable: referencedTable.name,
              sourceColumn: column.name,
              targetColumn: 'id',
              onDelete: 'CASCADE',
              onUpdate: 'CASCADE'
            });
          }
        }
      }
    }

    return relationships;
  }

  /**
   * Export schema to different formats
   */
  static exportSchema(schema: DatabaseSchema, format: 'json' | 'sql' | 'yaml'): string {
    switch (format) {
      case 'json':
        return JSON.stringify(schema, null, 2);

      case 'sql':
        return this.generateSchemaSQL(schema, 'postgresql'); // Default to PostgreSQL

      case 'yaml':
        // Would use a YAML library in real implementation
        return JSON.stringify(schema, null, 2);

      default:
        throw new Error(`Unsupported export format: ${format}`);
    }
  }

  /**
   * Generate complete schema SQL
   */
  private static generateSchemaSQL(schema: DatabaseSchema, targetType: DatabaseType): string {
    const scripts: string[] = [];

    // Create tables
    for (const table of schema.tables) {
      scripts.push(this.generateCreateTableSQL(table as any, targetType));
    }

    // Create indexes
    for (const index of schema.indexes || []) {
      scripts.push(this.generateIndexSQL(index, targetType));
    }

    // Add foreign keys
    for (const table of schema.tables) {
      for (const column of table.columns) {
        if (column.foreignKey) {
          scripts.push(this.generateForeignKeySQL(column as any, table.name, targetType));
        }
      }
    }

    return scripts.join('\n\n');
  }

  /**
   * Generate index SQL
   */
  private static generateIndexSQL(index: Index, targetType: DatabaseType): string {
    const unique = index.unique ? 'UNIQUE ' : '';
    const columns = index.columns.join(', ');
    return `CREATE ${unique}INDEX ${index.name} ON ${index.table} (${columns});`;
  }

  /**
   * Generate foreign key SQL
   */
  private static generateForeignKeySQL(column: Column, tableName: string, targetType: DatabaseType): string {
    const fk = column.foreignKey!;
    return `ALTER TABLE ${tableName} ADD CONSTRAINT fk_${tableName}_${column.name} FOREIGN KEY (${column.name}) REFERENCES ${fk.tableId} (${fk.columnId});`;
  }

  /**
   * Import schema from different formats
   */
  static importSchema(data: string, format: 'json' | 'sql' | 'yaml'): DatabaseSchema {
    switch (format) {
      case 'json':
        return JSON.parse(data);

      case 'sql':
        return this.parseSQLSchema(data);

      case 'yaml':
        // Would use a YAML library in real implementation
        return JSON.parse(data);

      default:
        throw new Error(`Unsupported import format: ${format}`);
    }
  }

  /**
   * Parse SQL schema (simplified implementation)
   */
  private static parseSQLSchema(sql: string): DatabaseSchema {
    // This would be a complex SQL parser in real implementation
    // For now, return a basic schema
    return {
      id: `schema_${Date.now()}`,
      name: 'Introspected Schema',
      tables: [],
      relationships: [],
      indexes: [],
    };
  }
}

// Types for schema comparison
export interface SchemaComparisonResult {
  changes: SchemaChange[];
  conflicts: SchemaConflict[];
  summary: {
    tablesToCreate: number;
    tablesToDrop: number;
    tablesToAlter: number;
    totalChanges: number;
    totalConflicts: number;
  };
}

export interface SchemaChange {
  type: 'create_table' | 'drop_table' | 'alter_table' | 'add_column' | 'drop_column' | 'alter_column';
  entity: 'table' | 'column' | 'index' | 'constraint';
  entityName: string;
  sourceSchema: DatabaseSchema | null;
  targetSchema: DatabaseSchema | null;
  details: any;
}

export interface SchemaConflict {
  type: 'column_type_mismatch' | 'constraint_conflict' | 'index_conflict';
  entity: string;
  description: string;
  resolution?: 'keep_source' | 'keep_target' | 'merge';
}
