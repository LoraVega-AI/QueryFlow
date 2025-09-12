// Schema Introspection Service
// Handles database schema reading, conversion, and analysis

import {
  DatabaseType,
  DatabaseConfig,
  DatabaseSchema,
  Table,
  Column,
  Relationship,
  Index,
  Constraint,
  ForeignKey,
  Project,
  DatabaseConnection
} from '@/types/project';
import { DataType } from '@/types/database';
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
    // In a real implementation, this would query SQLite system tables
    // For now, return mock data
    const tables: Table[] = [
      {
        name: 'users',
        columns: [
          {
            name: 'id',
            type: 'integer',
            nullable: false,
            primaryKey: true,
            autoIncrement: true
          },
          {
            name: 'email',
            type: 'varchar',
            nullable: false,
            unique: true,
            length: 255
          },
          {
            name: 'password',
            type: 'varchar',
            nullable: false,
            length: 255
          },
          {
            name: 'created_at',
            type: 'datetime',
            nullable: false,
            defaultValue: "strftime('%Y-%m-%d %H:%M:%S', 'now')"
          }
        ],
        indexes: [
          {
            name: 'sqlite_autoindex_users_1',
            table: 'users',
            columns: ['email'],
            unique: true,
            type: 'btree'
          }
        ],
        constraints: [
          {
            name: 'sqlite_autoindex_users_1',
            type: 'unique',
            table: 'users',
            columns: ['email']
          }
        ]
      }
    ];

    return {
      tables,
      relationships: [],
      indexes: tables.flatMap(t => t.indexes),
      constraints: tables.flatMap(t => t.constraints),
      version: '1.0',
      lastUpdated: new Date()
    };
  }

  /**
   * Introspect PostgreSQL schema
   */
  private static async introspectPostgreSQLSchema(config: DatabaseConfig): Promise<DatabaseSchema> {
    // Mock PostgreSQL introspection - would use information_schema in real implementation
    const tables: Table[] = [
      {
        name: 'users',
        columns: [
          {
            name: 'id',
            type: 'serial',
            nullable: false,
            primaryKey: true,
            autoIncrement: true
          },
          {
            name: 'email',
            type: 'varchar',
            nullable: false,
            unique: true,
            length: 255
          },
          {
            name: 'created_at',
            type: 'timestamptz',
            nullable: false,
            defaultValue: 'NOW()'
          }
        ],
        indexes: [],
        constraints: []
      }
    ];

    return {
      tables,
      relationships: [],
      indexes: [],
      constraints: [],
      version: '1.0',
      lastUpdated: new Date()
    };
  }

  /**
   * Introspect MySQL schema
   */
  private static async introspectMySQLSchema(config: DatabaseConfig): Promise<DatabaseSchema> {
    // Mock MySQL introspection - would use information_schema in real implementation
    const tables: Table[] = [
      {
        name: 'users',
        columns: [
          {
            name: 'id',
            type: 'int',
            nullable: false,
            primaryKey: true,
            autoIncrement: true
          },
          {
            name: 'email',
            type: 'varchar',
            nullable: false,
            unique: true,
            length: 255
          },
          {
            name: 'created_at',
            type: 'datetime',
            nullable: false,
            defaultValue: 'CURRENT_TIMESTAMP'
          }
        ],
        indexes: [],
        constraints: []
      }
    ];

    return {
      tables,
      relationships: [],
      indexes: [],
      constraints: [],
      version: '1.0',
      lastUpdated: new Date()
    };
  }

  /**
   * Introspect MongoDB schema (inferred from documents)
   */
  private static async introspectMongoDBSchema(config: DatabaseConfig): Promise<DatabaseSchema> {
    // Mock MongoDB introspection - would analyze document structure in real implementation
    const tables: Table[] = [
      {
        name: 'users',
        columns: [
          {
            name: '_id',
            type: 'objectid',
            nullable: false,
            primaryKey: true
          },
          {
            name: 'email',
            type: 'string',
            nullable: false,
            unique: true
          },
          {
            name: 'profile',
            type: 'object',
            nullable: true
          },
          {
            name: 'created_at',
            type: 'date',
            nullable: false
          }
        ],
        indexes: [],
        constraints: []
      }
    ];

    return {
      tables,
      relationships: [],
      indexes: [],
      constraints: [],
      version: '1.0',
      lastUpdated: new Date()
    };
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
        const tableChanges = this.compareTables(sourceTable, targetTable);
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

    if (column.length) {
      sql += `(${column.length})`;
    }

    if (column.precision && column.scale) {
      sql += `(${column.precision}, ${column.scale})`;
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
      scripts.push(this.generateCreateTableSQL(table, targetType));
    }

    // Create indexes
    for (const index of schema.indexes) {
      scripts.push(this.generateIndexSQL(index, targetType));
    }

    // Add foreign keys
    for (const table of schema.tables) {
      for (const column of table.columns) {
        if (column.foreignKey) {
          scripts.push(this.generateForeignKeySQL(column, table.name, targetType));
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
    return `ALTER TABLE ${tableName} ADD CONSTRAINT fk_${tableName}_${column.name} FOREIGN KEY (${column.name}) REFERENCES ${fk.table} (${fk.column});`;
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
      tables: [],
      relationships: [],
      indexes: [],
      constraints: [],
      version: '1.0',
      lastUpdated: new Date()
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
