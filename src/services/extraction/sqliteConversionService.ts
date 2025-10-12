// SQLite Conversion Service
// Stage 6: Convert IR schema to SQLite database with multi-DB support

import Database from 'better-sqlite3';
import {
  IRSchema,
  IRTable,
  IRField,
  SQLiteConversionOptions,
  SQLiteSchema,
  DataType
} from '@/types/extraction';

export class SQLiteConversionService {
  private typeMapping!: Record<DataType, string>;

  constructor() {
    this.initializeTypeMapping();
  }

  /**
   * Convert IR schema to SQLite database
   */
  async convert(schema: IRSchema, options: SQLiteConversionOptions): Promise<ArrayBuffer> {
    const startTime = Date.now();
    console.log(`🗄️  Converting IR schema to SQLite database...`);

    try {
      // Create in-memory SQLite database
      const db = new Database(':memory:');

      // Enable foreign key constraints if requested
      if (options.enableConstraints) {
        db.exec('PRAGMA foreign_keys = ON');
      }

      // Convert tables
      for (const table of schema.tables) {
        await this.createTable(db, table, options);
        console.log(`📋 Created table: ${table.name}`);
      }

      // Create indexes if requested
      if (options.createIndexes) {
        for (const table of schema.tables) {
          await this.createIndexes(db, table);
        }
      }

      // Add metadata if requested
      if (options.addMetadata) {
        await this.addMetadata(db, schema);
      }

      // Generate sample data if requested
      if (options.generateSampleData) {
        for (const table of schema.tables) {
          await this.generateSampleData(db, table);
        }
      }

      // Get database as buffer
      const buffer = db.serialize();
      db.close();

      const conversionTime = Date.now() - startTime;
      console.log(`🗄️  SQLite conversion completed in ${conversionTime}ms`);

      return buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength) as ArrayBuffer;

    } catch (error) {
      console.error('SQLite conversion failed:', error);
      throw new Error(`SQLite conversion failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Convert IR schema to SQLite database and save to file
   */
  async convertToFile(schema: IRSchema, filePath: string, options: SQLiteConversionOptions): Promise<string> {
    const startTime = Date.now();
    console.log(`🗄️  Converting IR schema to SQLite database file: ${filePath}...`);

    try {
      const fs = require('fs');
      const path = require('path');

      // Ensure directory exists
      const dir = path.dirname(filePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      // Create SQLite database at specified path
      const db = new Database(filePath);

      // Enable foreign key constraints if requested
      if (options.enableConstraints) {
        db.exec('PRAGMA foreign_keys = ON');
      }

      // Convert tables
      for (const table of schema.tables) {
        await this.createTable(db, table, options);
        console.log(`📋 Created table: ${table.name}`);
      }

      // Create indexes if requested
      if (options.createIndexes) {
        for (const table of schema.tables) {
          await this.createIndexes(db, table);
        }
      }

      // Add metadata if requested
      if (options.addMetadata) {
        await this.addMetadata(db, schema);
      }

      // Generate sample data if requested
      if (options.generateSampleData) {
        for (const table of schema.tables) {
          await this.generateSampleData(db, table);
        }
      }

      // Close database
      db.close();

      const conversionTime = Date.now() - startTime;
      const fileSize = fs.statSync(filePath).size;
      console.log(`🗄️  SQLite file conversion completed in ${conversionTime}ms (${fileSize} bytes)`);

      return filePath;

    } catch (error) {
      console.error('SQLite file conversion failed:', error);
      throw new Error(`SQLite file conversion failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Convert IR schema to SQLite schema (without creating database)
   */
  async convertToSchema(schema: IRSchema, options: SQLiteConversionOptions): Promise<SQLiteSchema> {
    const sqliteSchema: SQLiteSchema = {
      tables: [],
      indexes: [],
      triggers: [],
      views: [],
      metadata: {}
    };

    // Convert tables
    for (const table of schema.tables) {
      const sqliteTable = await this.convertTable(table, options);
      sqliteSchema.tables.push(sqliteTable);

      // Convert indexes
      if (options.createIndexes) {
        const tableIndexes = await this.convertIndexes(table);
        sqliteSchema.indexes.push(...tableIndexes);
      }
    }

    // Add metadata
    if (options.addMetadata) {
      sqliteSchema.metadata = this.convertMetadata(schema);
    }

    return sqliteSchema;
  }

  /**
   * Export database as SQL DDL script
   */
  async exportDDL(schema: IRSchema, options: SQLiteConversionOptions): Promise<string> {
    const ddlStatements: string[] = [];

    // Add header comment
    ddlStatements.push('-- Generated by QueryFlow Database Definition Extractor');
    ddlStatements.push(`-- Schema: ${schema.name}`);
    ddlStatements.push(`-- Generated at: ${new Date().toISOString()}`);
    ddlStatements.push('');

    // Enable foreign keys
    if (options.enableConstraints) {
      ddlStatements.push('PRAGMA foreign_keys = ON;');
      ddlStatements.push('');
    }

    // Create tables
    for (const table of schema.tables) {
      const createTableSQL = await this.generateCreateTableSQL(table, options);
      ddlStatements.push(createTableSQL);
      ddlStatements.push('');
    }

    // Create indexes
    if (options.createIndexes) {
      for (const table of schema.tables) {
        const indexStatements = await this.generateIndexSQL(table);
        if (indexStatements.length > 0) {
          ddlStatements.push('-- Indexes for ' + table.name);
          ddlStatements.push(...indexStatements);
          ddlStatements.push('');
        }
      }
    }

    return ddlStatements.join('\n');
  }

  // Private methods

  /**
   * Create a table in the SQLite database
   */
  private async createTable(db: Database.Database, table: IRTable, options: SQLiteConversionOptions): Promise<void> {
    const sql = await this.generateCreateTableSQL(table, options);
    db.exec(sql);
  }

  /**
   * Generate CREATE TABLE SQL statement
   */
  private async generateCreateTableSQL(table: IRTable, options: SQLiteConversionOptions): Promise<string> {
    const columns: string[] = [];
    const constraints: string[] = [];

    // Process fields
    for (const field of table.fields) {
      const columnDef = this.generateColumnDefinition(field, options);
      columns.push(columnDef);

      // Add foreign key constraints
      if (field.foreignKey && options.enableConstraints) {
        const fkConstraint = this.generateForeignKeyConstraint(field);
        if (fkConstraint) {
          constraints.push(fkConstraint);
        }
      }
    }

    // Add table constraints
    for (const constraint of table.constraints) {
      const constraintSQL = this.generateTableConstraint(constraint);
      if (constraintSQL) {
        constraints.push(constraintSQL);
      }
    }

    // Combine columns and constraints
    const allDefinitions = [...columns, ...constraints];
    
    let sql = `CREATE TABLE "${table.name}" (\n`;
    sql += '  ' + allDefinitions.join(',\n  ');
    sql += '\n);';

    return sql;
  }

  /**
   * Generate column definition
   */
  private generateColumnDefinition(field: IRField, options: SQLiteConversionOptions): string {
    let definition = `"${field.name}" ${this.mapToSQLiteType(field.type)}`;

    // Add constraints
    if (field.primaryKey) {
      definition += ' PRIMARY KEY';
      
      if (field.autoIncrement) {
        definition += ' AUTOINCREMENT';
      }
    }

    if (!field.nullable) {
      definition += ' NOT NULL';
    }

    if (field.unique && !field.primaryKey) {
      definition += ' UNIQUE';
    }

    if (field.defaultValue !== undefined && field.defaultValue !== null) {
      definition += ` DEFAULT ${this.formatDefaultValue(field.defaultValue, field.type)}`;
    }

    return definition;
  }

  /**
   * Generate foreign key constraint
   */
  private generateForeignKeyConstraint(field: IRField): string | null {
    if (!field.foreignKey) return null;

    let constraint = `FOREIGN KEY ("${field.name}") REFERENCES "${field.foreignKey.table}" ("${field.foreignKey.field}")`;

    if (field.foreignKey.onDelete) {
      constraint += ` ON DELETE ${field.foreignKey.onDelete}`;
    }

    if (field.foreignKey.onUpdate) {
      constraint += ` ON UPDATE ${field.foreignKey.onUpdate}`;
    }

    return constraint;
  }

  /**
   * Generate table constraint
   */
  private generateTableConstraint(constraint: any): string | null {
    switch (constraint.type) {
      case 'unique':
        return `UNIQUE (${constraint.fields.map((f: string) => `"${f}"`).join(', ')})`;
      case 'check':
        return `CHECK (${constraint.definition})`;
      default:
        return null;
    }
  }

  /**
   * Create indexes for a table
   */
  private async createIndexes(db: Database.Database, table: IRTable): Promise<void> {
    const indexStatements = await this.generateIndexSQL(table);
    
    for (const statement of indexStatements) {
      db.exec(statement);
    }
  }

  /**
   * Generate index SQL statements
   */
  private async generateIndexSQL(table: IRTable): Promise<string[]> {
    const statements: string[] = [];

    // Create indexes for foreign keys
    for (const field of table.fields) {
      if (field.foreignKey) {
        const indexName = `idx_${table.name}_${field.name}`;
        const statement = `CREATE INDEX "${indexName}" ON "${table.name}" ("${field.name}");`;
        statements.push(statement);
      }
    }

    // Create indexes defined in table
    for (const index of table.indexes) {
      const indexName = index.name || `idx_${table.name}_${index.fields.join('_')}`;
      const unique = index.unique ? 'UNIQUE ' : '';
      const columns = index.fields.map(f => `"${f}"`).join(', ');
      
      const statement = `CREATE ${unique}INDEX "${indexName}" ON "${table.name}" (${columns});`;
      statements.push(statement);
    }

    return statements;
  }

  /**
   * Add metadata tables to database
   */
  private async addMetadata(db: Database.Database, schema: IRSchema): Promise<void> {
    // Create metadata table
    db.exec(`
      CREATE TABLE _queryflow_metadata (
        key TEXT PRIMARY KEY,
        value TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Insert schema metadata
    const stmt = db.prepare('INSERT INTO _queryflow_metadata (key, value) VALUES (?, ?)');
    
    stmt.run('schema_name', schema.name);
    stmt.run('extracted_at', schema.metadata.extractedAt.toISOString());
    stmt.run('confidence', schema.metadata.confidence.toString());
    stmt.run('frameworks', JSON.stringify(schema.metadata.frameworks));
    stmt.run('languages', JSON.stringify(schema.metadata.languages));
    stmt.run('total_tables', schema.metadata.totalTables.toString());
    stmt.run('total_fields', schema.metadata.totalFields.toString());
    stmt.run('total_relationships', schema.metadata.totalRelationships.toString());

    // Create table metadata
    db.exec(`
      CREATE TABLE _queryflow_tables (
        table_name TEXT PRIMARY KEY,
        framework TEXT,
        language TEXT,
        confidence INTEGER,
        source_file TEXT,
        tags TEXT
      );
    `);

    const tableStmt = db.prepare(`
      INSERT INTO _queryflow_tables 
      (table_name, framework, language, confidence, source_file, tags) 
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    for (const table of schema.tables) {
      tableStmt.run(
        table.name,
        table.metadata.framework,
        table.metadata.language,
        table.metadata.confidence,
        table.sourceLocation.file,
        JSON.stringify(table.metadata.tags)
      );
    }
  }

  /**
   * Generate sample data for tables
   */
  private async generateSampleData(db: Database.Database, table: IRTable): Promise<void> {
    if (table.fields.length === 0) return;

    const sampleSize = 5; // Generate 5 sample rows
    
    // Prepare insert statement
    const columns = table.fields.map(f => `"${f.name}"`).join(', ');
    const placeholders = table.fields.map(() => '?').join(', ');
    const stmt = db.prepare(`INSERT INTO "${table.name}" (${columns}) VALUES (${placeholders})`);

    // Generate sample rows
    for (let i = 0; i < sampleSize; i++) {
      const values = table.fields.map(field => this.generateSampleValue(field, i));
      
      try {
        stmt.run(values);
      } catch (error) {
        // Skip if sample data violates constraints
        console.warn(`Failed to insert sample data for ${table.name}:`, error instanceof Error ? error.message : 'Unknown error');
        break;
      }
    }
  }

  /**
   * Generate sample value for a field
   */
  private generateSampleValue(field: IRField, index: number): any {
    if (field.autoIncrement || field.primaryKey) {
      return index + 1;
    }

    if (field.defaultValue !== undefined) {
      return field.defaultValue;
    }

    // Generate based on type
    switch (field.type) {
      case 'VARCHAR':
      case 'TEXT':
        return `sample_${field.name}_${index + 1}`;
      case 'INTEGER':
      case 'BIGINT':
        return index + 1;
      case 'FLOAT':
      case 'DOUBLE':
      case 'REAL':
        return (index + 1) * 1.5;
      case 'BOOLEAN':
        return index % 2 === 0;
      case 'DATE':
        return '2024-01-01';
      case 'DATETIME':
      case 'TIMESTAMP':
        return '2024-01-01 12:00:00';
      case 'UUID':
        return `00000000-0000-0000-0000-${String(index).padStart(12, '0')}`;
      case 'JSON':
        return JSON.stringify({ sample: true, index: index + 1 });
      default:
        return null;
    }
  }

  /**
   * Convert IR table to SQLite table
   */
  private async convertTable(table: IRTable, options: SQLiteConversionOptions): Promise<any> {
    return {
      name: table.name,
      sql: await this.generateCreateTableSQL(table, options),
      fields: table.fields.map(field => ({
        name: field.name,
        type: this.mapToSQLiteType(field.type),
        nullable: field.nullable,
        defaultValue: field.defaultValue,
        primaryKey: field.primaryKey,
        autoIncrement: field.autoIncrement
      }))
    };
  }

  /**
   * Convert IR indexes to SQLite indexes
   */
  private async convertIndexes(table: IRTable): Promise<any[]> {
    const indexes = [];

    // Convert table indexes
    for (const index of table.indexes) {
      indexes.push({
        name: index.name || `idx_${table.name}_${index.fields.join('_')}`,
        table: table.name,
        sql: `CREATE ${index.unique ? 'UNIQUE ' : ''}INDEX "${index.name}" ON "${table.name}" (${index.fields.map(f => `"${f}"`).join(', ')})`,
        unique: index.unique
      });
    }

    // Convert foreign key indexes
    for (const field of table.fields) {
      if (field.foreignKey) {
        indexes.push({
          name: `idx_${table.name}_${field.name}`,
          table: table.name,
          sql: `CREATE INDEX "idx_${table.name}_${field.name}" ON "${table.name}" ("${field.name}")`,
          unique: false
        });
      }
    }

    return indexes;
  }

  /**
   * Convert schema metadata
   */
  private convertMetadata(schema: IRSchema): Record<string, any> {
    return {
      schema_name: schema.name,
      extracted_at: schema.metadata.extractedAt.toISOString(),
      confidence: schema.metadata.confidence,
      frameworks: schema.metadata.frameworks,
      languages: schema.metadata.languages,
      total_tables: schema.metadata.totalTables,
      total_fields: schema.metadata.totalFields,
      total_relationships: schema.metadata.totalRelationships
    };
  }

  /**
   * Map IR data type to SQLite type
   */
  private mapToSQLiteType(type: DataType): string {
    return this.typeMapping[type] || 'TEXT';
  }

  /**
   * Format default value for SQL
   */
  private formatDefaultValue(value: any, type: DataType): string {
    if (value === null) return 'NULL';

    switch (type) {
      case 'VARCHAR':
      case 'TEXT':
      case 'CHAR':
      case 'DATE':
      case 'DATETIME':
      case 'TIMESTAMP':
      case 'TIME':
        return `'${value.toString().replace(/'/g, "''")}'`;
      case 'BOOLEAN':
        return value ? '1' : '0';
      case 'JSON':
      case 'JSONB':
        return `'${JSON.stringify(value).replace(/'/g, "''")}'`;
      default:
        return value.toString();
    }
  }

  /**
   * Initialize type mapping from IR types to SQLite types
   */
  private initializeTypeMapping(): void {
    this.typeMapping = {
      'TEXT': 'TEXT',
      'VARCHAR': 'TEXT',
      'CHAR': 'TEXT',
      'INTEGER': 'INTEGER',
      'BIGINT': 'INTEGER',
      'SMALLINT': 'INTEGER',
      'TINYINT': 'INTEGER',
      'REAL': 'REAL',
      'FLOAT': 'REAL',
      'DOUBLE': 'REAL',
      'DECIMAL': 'REAL',
      'NUMERIC': 'REAL',
      'BOOLEAN': 'INTEGER',
      'DATE': 'TEXT',
      'DATETIME': 'TEXT',
      'TIMESTAMP': 'TEXT',
      'TIME': 'TEXT',
      'BLOB': 'BLOB',
      'JSON': 'TEXT',
      'JSONB': 'TEXT',
      'UUID': 'TEXT',
      'GUID': 'TEXT',
      'ENUM': 'TEXT',
      'SET': 'TEXT',
      'ARRAY': 'TEXT',
      'TEXT_ARRAY': 'TEXT',
      'INTEGER_ARRAY': 'TEXT',
      'JSON_ARRAY': 'TEXT',
      'GEOMETRY': 'TEXT',
      'POINT': 'TEXT',
      'POLYGON': 'TEXT',
      'LINESTRING': 'TEXT',
      'MULTIPOINT': 'TEXT',
      'MULTIPOLYGON': 'TEXT',
      'MULTILINESTRING': 'TEXT',
      'GEOMETRYCOLLECTION': 'TEXT',
      'INET': 'TEXT',
      'CIDR': 'TEXT',
      'MACADDR': 'TEXT',
      'TSVECTOR': 'TEXT',
      'TSQUERY': 'TEXT',
      'MONEY': 'REAL',
      'NCHAR': 'TEXT',
      'NVARCHAR': 'TEXT',
      'INTERVAL': 'TEXT',
      'YEAR': 'INTEGER',
      'XML': 'TEXT',
      'BINARY': 'BLOB',
      'VARBINARY': 'BLOB',
      'CUSTOM': 'TEXT'
    };
  }
}
