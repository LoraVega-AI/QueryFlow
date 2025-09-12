// Enhanced Export Service for QueryFlow
// Supports multiple export formats including SQL scripts, database schema exports, 
// YAML, TOML, GraphQL, OpenAPI, and more

import { DatabaseSchema, Table, Column, DataType, DatabaseRecord } from '@/types/database';

export interface ExportOptions {
  format: ExportFormat;
  includeSchema: boolean;
  includeData: boolean;
  includeIndexes: boolean;
  includeTriggers: boolean;
  includeConstraints: boolean;
  compress?: boolean;
  pagination?: {
    pageSize: number;
    currentPage: number;
  };
  filters?: {
    tables?: string[];
    columns?: Record<string, string[]>;
  };
  transformations?: Record<string, string>;
}

export type ExportFormat = 
  | 'sql'
  | 'postgres'
  | 'mysql'
  | 'mssql'
  | 'sqlite'
  | 'csv'
  | 'json'
  | 'xml'
  | 'yaml'
  | 'toml'
  | 'graphql'
  | 'openapi'
  | 'excel'
  | 'parquet';

export interface ExportResult {
  success: boolean;
  data?: string | Blob;
  filename: string;
  size: number;
  format: ExportFormat;
  warnings?: string[];
  errors?: string[];
  metadata?: Record<string, any>;
}

export interface SchemaExportOptions extends ExportOptions {
  dialectTarget: 'standard' | 'postgres' | 'mysql' | 'mssql' | 'oracle' | 'sqlite';
  includeComments: boolean;
  includeDropStatements: boolean;
  useCascade: boolean;
}

export interface DataExportOptions extends ExportOptions {
  batchSize: number;
  escapeMode: 'standard' | 'strict' | 'minimal';
  nullValue: string;
  dateFormat: string;
  includeHeaders: boolean;
}

export class ExportService {
  private static readonly BATCH_SIZE = 10000;
  private static readonly MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB

  /**
   * Export schema and/or data in specified format
   */
  static async exportDatabase(
    schema: DatabaseSchema,
    records: DatabaseRecord[],
    options: ExportOptions
  ): Promise<ExportResult> {
    try {
      const startTime = Date.now();
      let result: ExportResult;

      switch (options.format) {
        case 'sql':
        case 'postgres':
        case 'mysql':
        case 'mssql':
        case 'sqlite':
          result = await this.exportSQL(schema, records, options as SchemaExportOptions);
          break;
        case 'csv':
          result = await this.exportCSV(schema, records, options as DataExportOptions);
          break;
        case 'json':
          result = await this.exportJSON(schema, records, options);
          break;
        case 'xml':
          result = await this.exportXML(schema, records, options);
          break;
        case 'yaml':
          result = await this.exportYAML(schema, records, options);
          break;
        case 'toml':
          result = await this.exportTOML(schema, records, options);
          break;
        case 'graphql':
          result = await this.exportGraphQL(schema, options);
          break;
        case 'openapi':
          result = await this.exportOpenAPI(schema, options);
          break;
        default:
          throw new Error(`Unsupported export format: ${options.format}`);
      }

      const executionTime = Date.now() - startTime;
      result.metadata = {
        ...result.metadata,
        executionTime,
        exportedAt: new Date().toISOString(),
        tablesCount: schema.tables.length,
        recordsCount: records.length
      };

      return result;
    } catch (error) {
      return {
        success: false,
        filename: '',
        size: 0,
        format: options.format,
        errors: [error instanceof Error ? error.message : 'Unknown export error']
      };
    }
  }

  /**
   * Export as SQL script (DDL + DML)
   */
  private static async exportSQL(
    schema: DatabaseSchema,
    records: DatabaseRecord[],
    options: SchemaExportOptions
  ): Promise<ExportResult> {
    const lines: string[] = [];
    const warnings: string[] = [];

    // Header comment
    lines.push(`-- QueryFlow Database Export`);
    lines.push(`-- Schema: ${schema.name}`);
    lines.push(`-- Generated: ${new Date().toISOString()}`);
    lines.push(`-- Target: ${options.dialectTarget.toUpperCase()}`);
    lines.push('');

    // Drop statements (if requested)
    if (options.includeDropStatements) {
      lines.push('-- Drop existing tables');
      schema.tables.reverse().forEach(table => {
        const dropStatement = options.useCascade 
          ? `DROP TABLE IF EXISTS "${table.name}" CASCADE;`
          : `DROP TABLE IF EXISTS "${table.name}";`;
        lines.push(dropStatement);
      });
      lines.push('');
      schema.tables.reverse(); // Restore original order
    }

    // Schema DDL
    if (options.includeSchema) {
      lines.push('-- Schema Definition');
      
      for (const table of schema.tables) {
        const ddl = this.generateTableDDL(table, options);
        lines.push(ddl);
        lines.push('');
      }

      // Foreign key constraints (added after all tables)
      if (options.includeConstraints) {
        lines.push('-- Foreign Key Constraints');
        for (const table of schema.tables) {
          for (const column of table.columns) {
            if (column.foreignKey) {
              const fkConstraint = this.generateForeignKeyConstraint(table, column, options);
              lines.push(fkConstraint);
            }
          }
        }
        lines.push('');
      }

      // Indexes
      if (options.includeIndexes && schema.tables.some(t => t.indexes?.length)) {
        lines.push('-- Indexes');
        for (const table of schema.tables) {
          if (table.indexes) {
            for (const index of table.indexes) {
              const indexDDL = this.generateIndexDDL(table, index, options);
              lines.push(indexDDL);
            }
          }
        }
        lines.push('');
      }

      // Triggers
      if (options.includeTriggers && schema.tables.some(t => t.triggers?.length)) {
        lines.push('-- Triggers');
        for (const table of schema.tables) {
          if (table.triggers) {
            for (const trigger of table.triggers) {
              const triggerDDL = this.generateTriggerDDL(table, trigger, options);
              lines.push(triggerDDL);
            }
          }
        }
        lines.push('');
      }
    }

    // Data DML
    if (options.includeData && records.length > 0) {
      lines.push('-- Data Insertion');
      
      const groupedRecords = this.groupRecordsByTable(records, schema);
      
      for (const table of schema.tables) {
        const tableRecords = groupedRecords[table.id] || [];
        if (tableRecords.length === 0) continue;

        lines.push(`-- Data for table: ${table.name}`);
        
        // Process in batches
        for (let i = 0; i < tableRecords.length; i += this.BATCH_SIZE) {
          const batch = tableRecords.slice(i, i + this.BATCH_SIZE);
          const insertStatements = this.generateInsertStatements(table, batch, options);
          lines.push(...insertStatements);
        }
        lines.push('');
      }
    }

    const content = lines.join('\n');
    const filename = `${schema.name}_${options.dialectTarget}_${new Date().toISOString().split('T')[0]}.sql`;

    return {
      success: true,
      data: content,
      filename,
      size: new Blob([content]).size,
      format: options.format,
      warnings
    };
  }

  /**
   * Generate CREATE TABLE DDL
   */
  private static generateTableDDL(table: Table, options: SchemaExportOptions): string {
    const lines: string[] = [];
    const dialect = options.dialectTarget;

    lines.push(`CREATE TABLE "${table.name}" (`);

    const columnDefs: string[] = [];
    
    for (const column of table.columns) {
      const columnDef = this.generateColumnDefinition(column, dialect);
      columnDefs.push(`  ${columnDef}`);
    }

    // Primary key constraint
    const pkColumns = table.columns.filter(col => col.primaryKey);
    if (pkColumns.length > 0) {
      const pkConstraint = `CONSTRAINT pk_${table.name} PRIMARY KEY (${pkColumns.map(col => `"${col.name}"`).join(', ')})`;
      columnDefs.push(`  ${pkConstraint}`);
    }

    // Unique constraints
    const uniqueColumns = table.columns.filter(col => col.constraints?.unique);
    uniqueColumns.forEach(col => {
      const uniqueConstraint = `CONSTRAINT uk_${table.name}_${col.name} UNIQUE ("${col.name}")`;
      columnDefs.push(`  ${uniqueConstraint}`);
    });

    // Check constraints
    const checkColumns = table.columns.filter(col => col.constraints?.check);
    checkColumns.forEach(col => {
      const checkConstraint = `CONSTRAINT ck_${table.name}_${col.name} CHECK (${col.constraints!.check})`;
      columnDefs.push(`  ${checkConstraint}`);
    });

    lines.push(columnDefs.join(',\n'));
    lines.push(');');

    // Table comment
    if (options.includeComments && table.documentation) {
      lines.push(`COMMENT ON TABLE "${table.name}" IS '${table.documentation}';`);
    }

    return lines.join('\n');
  }

  /**
   * Generate column definition for specific SQL dialect
   */
  private static generateColumnDefinition(column: Column, dialect: string): string {
    const parts: string[] = [`"${column.name}"`];
    
    // Map data type to target dialect
    const sqlType = this.mapDataTypeToDialect(column.type, dialect);
    parts.push(sqlType);

    // Constraints
    if (!column.nullable) {
      parts.push('NOT NULL');
    }

    if (column.defaultValue !== undefined && column.defaultValue !== '') {
      const defaultValue = this.formatDefaultValue(column.defaultValue, column.type, dialect);
      parts.push(`DEFAULT ${defaultValue}`);
    }

    if (column.constraints?.autoIncrement) {
      switch (dialect) {
        case 'postgres':
          parts.push('GENERATED ALWAYS AS IDENTITY');
          break;
        case 'mysql':
          parts.push('AUTO_INCREMENT');
          break;
        case 'mssql':
          parts.push('IDENTITY(1,1)');
          break;
        case 'sqlite':
          parts.push('AUTOINCREMENT');
          break;
      }
    }

    return parts.join(' ');
  }

  /**
   * Map QueryFlow data types to SQL dialect types
   */
  private static mapDataTypeToDialect(type: DataType, dialect: string): string {
    const typeMap: Record<string, Record<DataType, string>> = {
      postgres: {
        'TEXT': 'TEXT',
        'INTEGER': 'INTEGER',
        'REAL': 'REAL',
        'BLOB': 'BYTEA',
        'BOOLEAN': 'BOOLEAN',
        'DATE': 'DATE',
        'DATETIME': 'TIMESTAMP',
        'BIGINT': 'BIGINT',
        'DECIMAL': 'DECIMAL',
        'NUMERIC': 'NUMERIC',
        'FLOAT': 'FLOAT',
        'DOUBLE': 'DOUBLE',
        'SMALLINT': 'SMALLINT',
        'TINYINT': 'SMALLINT',
        'MONEY': 'MONEY',
        'CHAR': 'CHAR',
        'VARCHAR': 'VARCHAR',
        'NCHAR': 'CHAR',
        'NVARCHAR': 'VARCHAR',
        'ENUM': 'TEXT', // Will use CHECK constraint
        'SET': 'TEXT',
        'TIMESTAMP': 'TIMESTAMP WITH TIME ZONE',
        'INTERVAL': 'INTERVAL',
        'TIME': 'TIME',
        'YEAR': 'INTEGER',
        'JSON': 'JSONB',
        'JSONB': 'JSONB',
        'XML': 'XML',
        'BINARY': 'BYTEA',
        'VARBINARY': 'BYTEA',
        'UUID': 'UUID',
        'GUID': 'UUID',
        'ARRAY': 'TEXT[]',
        'TEXT_ARRAY': 'TEXT[]',
        'INTEGER_ARRAY': 'INTEGER[]',
        'JSON_ARRAY': 'JSONB[]',
        'GEOMETRY': 'GEOMETRY',
        'POINT': 'POINT',
        'POLYGON': 'POLYGON',
        'LINESTRING': 'LINESTRING',
        'MULTIPOINT': 'MULTIPOINT',
        'MULTIPOLYGON': 'MULTIPOLYGON',
        'MULTILINESTRING': 'MULTILINESTRING',
        'GEOMETRYCOLLECTION': 'GEOMETRYCOLLECTION',
        'INET': 'INET',
        'CIDR': 'CIDR',
        'MACADDR': 'MACADDR',
        'TSVECTOR': 'TSVECTOR',
        'TSQUERY': 'TSQUERY',
        'CUSTOM': 'TEXT'
      },
      mysql: {
        'TEXT': 'TEXT',
        'INTEGER': 'INT',
        'REAL': 'DOUBLE',
        'BLOB': 'BLOB',
        'BOOLEAN': 'BOOLEAN',
        'DATE': 'DATE',
        'DATETIME': 'DATETIME',
        'BIGINT': 'BIGINT',
        'DECIMAL': 'DECIMAL',
        'CHAR': 'CHAR',
        'VARCHAR': 'VARCHAR',
        'ENUM': 'ENUM',
        'TIMESTAMP': 'TIMESTAMP',
        'INTERVAL': 'TIME', // MySQL doesn't have INTERVAL
        'JSON': 'JSON',
        'XML': 'TEXT', // MySQL doesn't have native XML
        'UUID': 'CHAR(36)',
        'NUMERIC': 'DECIMAL',
        'FLOAT': 'FLOAT',
        'DOUBLE': 'DOUBLE',
        'SMALLINT': 'SMALLINT',
        'TINYINT': 'TINYINT',
        'MONEY': 'DECIMAL(19,4)',
        'NCHAR': 'CHAR',
        'NVARCHAR': 'VARCHAR',
        'SET': 'SET',
        'TIME': 'TIME',
        'YEAR': 'YEAR',
        'JSONB': 'JSON',
        'BINARY': 'BINARY',
        'VARBINARY': 'VARBINARY',
        'GUID': 'CHAR(36)',
        'ARRAY': 'JSON', // Use JSON array
        'TEXT_ARRAY': 'JSON',
        'INTEGER_ARRAY': 'JSON',
        'JSON_ARRAY': 'JSON',
        'GEOMETRY': 'GEOMETRY',
        'POINT': 'POINT',
        'POLYGON': 'POLYGON',
        'LINESTRING': 'LINESTRING',
        'MULTIPOINT': 'MULTIPOINT',
        'MULTIPOLYGON': 'MULTIPOLYGON',
        'MULTILINESTRING': 'MULTILINESTRING',
        'GEOMETRYCOLLECTION': 'GEOMETRYCOLLECTION',
        'INET': 'VARCHAR(45)',
        'CIDR': 'VARCHAR(43)',
        'MACADDR': 'VARCHAR(17)',
        'TSVECTOR': 'TEXT',
        'TSQUERY': 'TEXT',
        'CUSTOM': 'TEXT'
      },
      mssql: {
        'TEXT': 'NVARCHAR(MAX)',
        'INTEGER': 'INT',
        'REAL': 'FLOAT',
        'BLOB': 'VARBINARY(MAX)',
        'BOOLEAN': 'BIT',
        'DATE': 'DATE',
        'DATETIME': 'DATETIME2',
        'BIGINT': 'BIGINT',
        'DECIMAL': 'DECIMAL',
        'CHAR': 'NCHAR',
        'VARCHAR': 'NVARCHAR',
        'ENUM': 'NVARCHAR(50)', // Use constraint
        'TIMESTAMP': 'DATETIMEOFFSET',
        'INTERVAL': 'TIME', // Closest equivalent
        'JSON': 'NVARCHAR(MAX)', // Use JSON constraint
        'XML': 'XML',
        'UUID': 'UNIQUEIDENTIFIER',
        'NUMERIC': 'DECIMAL',
        'FLOAT': 'FLOAT',
        'DOUBLE': 'FLOAT',
        'SMALLINT': 'SMALLINT',
        'TINYINT': 'TINYINT',
        'MONEY': 'MONEY',
        'NCHAR': 'NCHAR',
        'NVARCHAR': 'NVARCHAR',
        'SET': 'NVARCHAR(50)',
        'TIME': 'TIME',
        'YEAR': 'INT',
        'JSONB': 'NVARCHAR(MAX)',
        'BINARY': 'BINARY',
        'VARBINARY': 'VARBINARY',
        'GUID': 'UNIQUEIDENTIFIER',
        'ARRAY': 'NVARCHAR(MAX)', // Use JSON
        'TEXT_ARRAY': 'NVARCHAR(MAX)',
        'INTEGER_ARRAY': 'NVARCHAR(MAX)',
        'JSON_ARRAY': 'NVARCHAR(MAX)',
        'GEOMETRY': 'GEOMETRY',
        'POINT': 'GEOMETRY',
        'POLYGON': 'GEOMETRY',
        'LINESTRING': 'GEOMETRY',
        'MULTIPOINT': 'GEOMETRY',
        'MULTIPOLYGON': 'GEOMETRY',
        'MULTILINESTRING': 'GEOMETRY',
        'GEOMETRYCOLLECTION': 'GEOMETRY',
        'INET': 'NVARCHAR(45)',
        'CIDR': 'NVARCHAR(43)',
        'MACADDR': 'NVARCHAR(17)',
        'TSVECTOR': 'NVARCHAR(MAX)',
        'TSQUERY': 'NVARCHAR(MAX)',
        'CUSTOM': 'NVARCHAR(MAX)'
      },
      sqlite: {
        'TEXT': 'TEXT',
        'INTEGER': 'INTEGER',
        'REAL': 'REAL',
        'BLOB': 'BLOB',
        'BOOLEAN': 'INTEGER',
        'DATE': 'TEXT',
        'DATETIME': 'TEXT',
        'BIGINT': 'INTEGER',
        'DECIMAL': 'REAL',
        'CHAR': 'TEXT',
        'VARCHAR': 'TEXT',
        'ENUM': 'TEXT',
        'TIMESTAMP': 'TEXT',
        'INTERVAL': 'TEXT',
        'JSON': 'TEXT',
        'XML': 'TEXT',
        'UUID': 'TEXT',
        'NUMERIC': 'REAL',
        'FLOAT': 'REAL',
        'DOUBLE': 'REAL',
        'SMALLINT': 'INTEGER',
        'TINYINT': 'INTEGER',
        'MONEY': 'REAL',
        'NCHAR': 'TEXT',
        'NVARCHAR': 'TEXT',
        'SET': 'TEXT',
        'TIME': 'TEXT',
        'YEAR': 'INTEGER',
        'JSONB': 'TEXT',
        'BINARY': 'BLOB',
        'VARBINARY': 'BLOB',
        'GUID': 'TEXT',
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
        'CUSTOM': 'TEXT'
      }
    };

    const dialectMap = typeMap[dialect] || typeMap.sqlite;
    return dialectMap[type] || 'TEXT';
  }

  /**
   * Format default value for SQL dialect
   */
  private static formatDefaultValue(value: string, type: DataType, dialect: string): string {
    if (value === 'NULL') return 'NULL';
    
    switch (type) {
      case 'TEXT':
      case 'CHAR':
      case 'VARCHAR':
      case 'ENUM':
      case 'JSON':
      case 'XML':
        return `'${value.replace(/'/g, "''")}'`;
      case 'DATE':
      case 'DATETIME':
      case 'TIMESTAMP':
        if (value.toLowerCase() === 'now()' || value.toLowerCase() === 'current_timestamp') {
          return dialect === 'mysql' ? 'CURRENT_TIMESTAMP' : 'CURRENT_TIMESTAMP';
        }
        return `'${value}'`;
      case 'BOOLEAN':
        if (dialect === 'sqlite') {
          return value.toLowerCase() === 'true' || value === '1' ? '1' : '0';
        }
        return value.toLowerCase() === 'true' || value === '1' ? 'TRUE' : 'FALSE';
      case 'INTEGER':
      case 'BIGINT':
      case 'REAL':
      case 'DECIMAL':
        return value;
      default:
        return `'${value}'`;
    }
  }

  /**
   * Generate foreign key constraint
   */
  private static generateForeignKeyConstraint(
    table: Table, 
    column: Column, 
    options: SchemaExportOptions
  ): string {
    const fk = column.foreignKey!;
    const constraintName = `fk_${table.name}_${column.name}`;
    
    let constraint = `ALTER TABLE "${table.name}" ADD CONSTRAINT ${constraintName} `;
    constraint += `FOREIGN KEY ("${column.name}") REFERENCES "${fk.tableId}" ("${fk.columnId}")`;
    
    if (fk.onUpdate === 'CASCADE') {
      constraint += ' ON UPDATE CASCADE';
    }

    if (fk.onDelete === 'CASCADE') {
      constraint += ' ON DELETE CASCADE';
    }
    
    return constraint + ';';
  }

  /**
   * Generate index DDL
   */
  private static generateIndexDDL(
    table: Table, 
    index: any, 
    options: SchemaExportOptions
  ): string {
    const uniqueKeyword = index.unique ? 'UNIQUE ' : '';
    const indexType = options.dialectTarget === 'postgres' && index.type !== 'btree' 
      ? ` USING ${index.type.toUpperCase()}` 
      : '';
    
    const columns = index.columns.map((col: string) => `"${col}"`).join(', ');
    
    let ddl = `CREATE ${uniqueKeyword}INDEX "${index.name}" ON "${table.name}"${indexType} (${columns})`;
    
    if (index.partial && options.dialectTarget === 'postgres') {
      ddl += ` WHERE ${index.partial}`;
    }
    
    return ddl + ';';
  }

  /**
   * Generate trigger DDL
   */
  private static generateTriggerDDL(
    table: Table, 
    trigger: any, 
    options: SchemaExportOptions
  ): string {
    const timing = trigger.timing.toUpperCase();
    const event = trigger.event.toUpperCase();
    
    let ddl = `CREATE TRIGGER "${trigger.name}" `;
    ddl += `${timing} ${event} ON "${table.name}"`;
    
    if (trigger.condition) {
      ddl += ` WHEN ${trigger.condition}`;
    }
    
    ddl += ` BEGIN\n  ${trigger.action}\nEND;`;
    
    return ddl;
  }

  /**
   * Generate INSERT statements for data
   */
  private static generateInsertStatements(
    table: Table, 
    records: DatabaseRecord[], 
    options: SchemaExportOptions
  ): string[] {
    if (records.length === 0) return [];

    const statements: string[] = [];
    const columns = table.columns.map(col => `"${col.name}"`).join(', ');
    
    // Group records into batches for multi-row inserts
    const batchSize = options.dialectTarget === 'sqlite' ? 500 : 1000;
    
    for (let i = 0; i < records.length; i += batchSize) {
      const batch = records.slice(i, i + batchSize);
      
      const values = batch.map(record => {
        const valuesList = table.columns.map(col => {
          const value = record.data[col.name];
          return this.formatDataValue(value, col.type, options.dialectTarget);
        });
        return `(${valuesList.join(', ')})`;
      });

      const statement = `INSERT INTO "${table.name}" (${columns}) VALUES\n  ${values.join(',\n  ')};`;
      statements.push(statement);
    }

    return statements;
  }

  /**
   * Format data value for SQL insertion
   */
  private static formatDataValue(value: any, type: DataType, dialect: string): string {
    if (value === null || value === undefined) {
      return 'NULL';
    }

    switch (type) {
      case 'TEXT':
      case 'CHAR':
      case 'VARCHAR':
      case 'ENUM':
      case 'JSON':
      case 'XML':
        return `'${String(value).replace(/'/g, "''")}'`;
      case 'INTEGER':
      case 'BIGINT':
      case 'REAL':
      case 'DECIMAL':
        return String(value);
      case 'BOOLEAN':
        if (dialect === 'sqlite') {
          return value ? '1' : '0';
        }
        return value ? 'TRUE' : 'FALSE';
      case 'DATE':
      case 'DATETIME':
      case 'TIMESTAMP':
        return `'${value}'`;
      case 'BLOB':
        return `'${value}'`; // Assume hex encoded
      default:
        return `'${String(value).replace(/'/g, "''")}'`;
    }
  }

  /**
   * Export as CSV format
   */
  private static async exportCSV(
    schema: DatabaseSchema,
    records: DatabaseRecord[],
    options: DataExportOptions
  ): Promise<ExportResult> {
    const lines: string[] = [];
    const warnings: string[] = [];

    // Filter tables if specified
    const tablesToExport = options.filters?.tables 
      ? schema.tables.filter(t => options.filters!.tables!.includes(t.id))
      : schema.tables;

    for (const table of tablesToExport) {
      const tableRecords = records.filter(r => r.tableId === table.id);
      if (tableRecords.length === 0) continue;

      // Add table separator comment
      lines.push(`# Table: ${table.name}`);
      
      // Filter columns if specified
      const columnsToExport = options.filters?.columns?.[table.id]
        ? table.columns.filter(c => options.filters!.columns![table.id].includes(c.name))
        : table.columns;

      // Headers
      if (options.includeHeaders) {
        const headers = columnsToExport.map(col => this.escapeCSVValue(col.name));
        lines.push(headers.join(','));
      }

      // Data rows
      for (const record of tableRecords) {
        const values = columnsToExport.map(col => {
          const value = record.data[col.name];
          return this.formatCSVValue(value, col.type, options);
        });
        lines.push(values.join(','));
      }

      lines.push(''); // Empty line between tables
    }

    const content = lines.join('\n');
    const filename = `${schema.name}_${new Date().toISOString().split('T')[0]}.csv`;

    return {
      success: true,
      data: content,
      filename,
      size: new Blob([content]).size,
      format: 'csv',
      warnings
    };
  }

  /**
   * Format value for CSV export
   */
  private static formatCSVValue(value: any, type: DataType, options: DataExportOptions): string {
    if (value === null || value === undefined) {
      return options.nullValue || '';
    }

    switch (type) {
      case 'DATE':
      case 'DATETIME':
      case 'TIMESTAMP':
        const date = new Date(value);
        return this.escapeCSVValue(date.toISOString());
      case 'BOOLEAN':
        return value ? 'true' : 'false';
      case 'JSON':
        return this.escapeCSVValue(JSON.stringify(value));
      default:
        return this.escapeCSVValue(String(value));
    }
  }

  /**
   * Escape CSV value (handle quotes and commas)
   */
  private static escapeCSVValue(value: string): string {
    if (value.includes(',') || value.includes('"') || value.includes('\n')) {
      return `"${value.replace(/"/g, '""')}"`;
    }
    return value;
  }

  /**
   * Export as JSON format
   */
  private static async exportJSON(
    schema: DatabaseSchema,
    records: DatabaseRecord[],
    options: ExportOptions
  ): Promise<ExportResult> {
    const exportData: any = {};

    if (options.includeSchema) {
      exportData.schema = {
        name: schema.name,
        version: schema.version,
        description: schema.description,
        tables: schema.tables.map(table => ({
          name: table.name,
          columns: table.columns.map(col => ({
            name: col.name,
            type: col.type,
            nullable: col.nullable,
            primaryKey: col.primaryKey,
            defaultValue: col.defaultValue,
            constraints: col.constraints,
            documentation: col.documentation
          })),
          indexes: table.indexes,
          triggers: table.triggers,
          documentation: table.documentation
        }))
      };
    }

    if (options.includeData) {
      const groupedRecords = this.groupRecordsByTable(records, schema);
      exportData.data = {};
      
      schema.tables.forEach(table => {
        if (groupedRecords[table.id]) {
          exportData.data[table.name] = groupedRecords[table.id].map(record => record.data);
        }
      });
    }

    const content = JSON.stringify(exportData, null, 2);
    const filename = `${schema.name}_${new Date().toISOString().split('T')[0]}.json`;

    return {
      success: true,
      data: content,
      filename,
      size: new Blob([content]).size,
      format: 'json'
    };
  }

  /**
   * Export as XML format
   */
  private static async exportXML(
    schema: DatabaseSchema,
    records: DatabaseRecord[],
    options: ExportOptions
  ): Promise<ExportResult> {
    const lines: string[] = [];
    
    lines.push('<?xml version="1.0" encoding="UTF-8"?>');
    lines.push(`<database name="${this.escapeXML(schema.name)}" version="${schema.version}">`);

    if (options.includeSchema) {
      lines.push('  <schema>');
      schema.tables.forEach(table => {
        lines.push(`    <table name="${this.escapeXML(table.name)}">`);
        table.columns.forEach(col => {
          lines.push(`      <column name="${this.escapeXML(col.name)}" type="${col.type}" nullable="${col.nullable}" primaryKey="${col.primaryKey}"/>`);
        });
        lines.push('    </table>');
      });
      lines.push('  </schema>');
    }

    if (options.includeData) {
      lines.push('  <data>');
      const groupedRecords = this.groupRecordsByTable(records, schema);
      
      schema.tables.forEach(table => {
        const tableRecords = groupedRecords[table.id] || [];
        if (tableRecords.length > 0) {
          lines.push(`    <table name="${this.escapeXML(table.name)}">`);
          tableRecords.forEach(record => {
            lines.push('      <row>');
            table.columns.forEach(col => {
              const value = record.data[col.name];
              lines.push(`        <${col.name}>${this.escapeXML(String(value || ''))}</${col.name}>`);
            });
            lines.push('      </row>');
          });
          lines.push('    </table>');
        }
      });
      lines.push('  </data>');
    }

    lines.push('</database>');

    const content = lines.join('\n');
    const filename = `${schema.name}_${new Date().toISOString().split('T')[0]}.xml`;

    return {
      success: true,
      data: content,
      filename,
      size: new Blob([content]).size,
      format: 'xml'
    };
  }

  /**
   * Export as YAML format
   */
  private static async exportYAML(
    schema: DatabaseSchema,
    records: DatabaseRecord[],
    options: ExportOptions
  ): Promise<ExportResult> {
    const lines: string[] = [];
    
    lines.push(`name: "${schema.name}"`);
    lines.push(`version: ${schema.version}`);
    if (schema.description) {
      lines.push(`description: "${schema.description}"`);
    }

    if (options.includeSchema) {
      lines.push('schema:');
      lines.push('  tables:');
      schema.tables.forEach(table => {
        lines.push(`    - name: "${table.name}"`);
        if (table.documentation) {
          lines.push(`      description: "${table.documentation}"`);
        }
        lines.push('      columns:');
        table.columns.forEach(col => {
          lines.push(`        - name: "${col.name}"`);
          lines.push(`          type: "${col.type}"`);
          lines.push(`          nullable: ${col.nullable}`);
          lines.push(`          primaryKey: ${col.primaryKey}`);
          if (col.defaultValue) {
            lines.push(`          defaultValue: "${col.defaultValue}"`);
          }
        });
      });
    }

    if (options.includeData) {
      lines.push('data:');
      const groupedRecords = this.groupRecordsByTable(records, schema);
      
      schema.tables.forEach(table => {
        const tableRecords = groupedRecords[table.id] || [];
        if (tableRecords.length > 0) {
          lines.push(`  ${table.name}:`);
          tableRecords.forEach(record => {
            lines.push('    - ');
            table.columns.forEach(col => {
              const value = record.data[col.name];
              lines.push(`      ${col.name}: ${this.formatYAMLValue(value)}`);
            });
          });
        }
      });
    }

    const content = lines.join('\n');
    const filename = `${schema.name}_${new Date().toISOString().split('T')[0]}.yaml`;

    return {
      success: true,
      data: content,
      filename,
      size: new Blob([content]).size,
      format: 'yaml'
    };
  }

  /**
   * Export as TOML format
   */
  private static async exportTOML(
    schema: DatabaseSchema,
    records: DatabaseRecord[],
    options: ExportOptions
  ): Promise<ExportResult> {
    const lines: string[] = [];
    
    lines.push(`name = "${schema.name}"`);
    lines.push(`version = ${schema.version}`);
    if (schema.description) {
      lines.push(`description = "${schema.description}"`);
    }
    lines.push('');

    if (options.includeSchema) {
      schema.tables.forEach(table => {
        lines.push(`[[schema.tables]]`);
        lines.push(`name = "${table.name}"`);
        if (table.documentation) {
          lines.push(`description = "${table.documentation}"`);
        }
        lines.push('');
        
        table.columns.forEach(col => {
          lines.push(`  [[schema.tables.columns]]`);
          lines.push(`  name = "${col.name}"`);
          lines.push(`  type = "${col.type}"`);
          lines.push(`  nullable = ${col.nullable}`);
          lines.push(`  primaryKey = ${col.primaryKey}`);
          if (col.defaultValue) {
            lines.push(`  defaultValue = "${col.defaultValue}"`);
          }
          lines.push('');
        });
      });
    }

    const content = lines.join('\n');
    const filename = `${schema.name}_${new Date().toISOString().split('T')[0]}.toml`;

    return {
      success: true,
      data: content,
      filename,
      size: new Blob([content]).size,
      format: 'toml'
    };
  }

  /**
   * Export as GraphQL schema
   */
  private static async exportGraphQL(
    schema: DatabaseSchema,
    options: ExportOptions
  ): Promise<ExportResult> {
    const lines: string[] = [];
    
    lines.push('# GraphQL Schema generated from QueryFlow');
    lines.push(`# Schema: ${schema.name}`);
    lines.push(`# Generated: ${new Date().toISOString()}`);
    lines.push('');

    // Generate types for each table
    schema.tables.forEach(table => {
      const typeName = this.toGraphQLTypeName(table.name);
      lines.push(`type ${typeName} {`);
      
      table.columns.forEach(col => {
        const graphqlType = this.mapDataTypeToGraphQL(col.type);
        const nullableModifier = col.nullable ? '' : '!';
        lines.push(`  ${col.name}: ${graphqlType}${nullableModifier}`);
      });
      
      lines.push('}');
      lines.push('');
    });

    // Generate input types
    schema.tables.forEach(table => {
      const typeName = this.toGraphQLTypeName(table.name);
      lines.push(`input ${typeName}Input {`);
      
      table.columns.forEach(col => {
        if (!col.primaryKey || !col.constraints?.autoIncrement) {
          const graphqlType = this.mapDataTypeToGraphQL(col.type);
          const nullableModifier = col.nullable ? '' : '!';
          lines.push(`  ${col.name}: ${graphqlType}${nullableModifier}`);
        }
      });
      
      lines.push('}');
      lines.push('');
    });

    // Generate Query type
    lines.push('type Query {');
    schema.tables.forEach(table => {
      const typeName = this.toGraphQLTypeName(table.name);
      lines.push(`  ${table.name.toLowerCase()}s: [${typeName}!]!`);
      lines.push(`  ${table.name.toLowerCase()}(id: ID!): ${typeName}`);
    });
    lines.push('}');
    lines.push('');

    // Generate Mutation type
    lines.push('type Mutation {');
    schema.tables.forEach(table => {
      const typeName = this.toGraphQLTypeName(table.name);
      lines.push(`  create${typeName}(input: ${typeName}Input!): ${typeName}!`);
      lines.push(`  update${typeName}(id: ID!, input: ${typeName}Input!): ${typeName}!`);
      lines.push(`  delete${typeName}(id: ID!): Boolean!`);
    });
    lines.push('}');

    const content = lines.join('\n');
    const filename = `${schema.name}_schema.graphql`;

    return {
      success: true,
      data: content,
      filename,
      size: new Blob([content]).size,
      format: 'graphql'
    };
  }

  /**
   * Export as OpenAPI specification
   */
  private static async exportOpenAPI(
    schema: DatabaseSchema,
    options: ExportOptions
  ): Promise<ExportResult> {
    const spec = {
      openapi: '3.0.0',
      info: {
        title: `${schema.name} API`,
        description: schema.description || `API for ${schema.name} database`,
        version: schema.version.toString()
      },
      paths: {} as any,
      components: {
        schemas: {} as any
      }
    };

    // Generate schemas for each table
    schema.tables.forEach(table => {
      const schemaName = this.toOpenAPISchemaName(table.name);
      
      spec.components.schemas[schemaName] = {
        type: 'object',
        properties: {} as any,
        required: table.columns.filter(col => !col.nullable).map(col => col.name)
      };

      table.columns.forEach(col => {
        spec.components.schemas[schemaName].properties[col.name] = {
          type: this.mapDataTypeToOpenAPI(col.type),
          description: col.documentation
        };
      });

      // Generate paths for CRUD operations
      const resourcePath = `/${table.name.toLowerCase()}`;
      
      spec.paths[resourcePath] = {
        get: {
          summary: `List all ${table.name}`,
          responses: {
            '200': {
              description: 'Successful response',
              content: {
                'application/json': {
                  schema: {
                    type: 'array',
                    items: { $ref: `#/components/schemas/${schemaName}` }
                  }
                }
              }
            }
          }
        },
        post: {
          summary: `Create a new ${table.name}`,
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: { $ref: `#/components/schemas/${schemaName}` }
              }
            }
          },
          responses: {
            '201': {
              description: 'Created successfully',
              content: {
                'application/json': {
                  schema: { $ref: `#/components/schemas/${schemaName}` }
                }
              }
            }
          }
        }
      };

      spec.paths[`${resourcePath}/{id}`] = {
        get: {
          summary: `Get ${table.name} by ID`,
          parameters: [{
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'string' }
          }],
          responses: {
            '200': {
              description: 'Successful response',
              content: {
                'application/json': {
                  schema: { $ref: `#/components/schemas/${schemaName}` }
                }
              }
            }
          }
        },
        put: {
          summary: `Update ${table.name}`,
          parameters: [{
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'string' }
          }],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: { $ref: `#/components/schemas/${schemaName}` }
              }
            }
          },
          responses: {
            '200': {
              description: 'Updated successfully',
              content: {
                'application/json': {
                  schema: { $ref: `#/components/schemas/${schemaName}` }
                }
              }
            }
          }
        },
        delete: {
          summary: `Delete ${table.name}`,
          parameters: [{
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'string' }
          }],
          responses: {
            '204': {
              description: 'Deleted successfully'
            }
          }
        }
      };
    });

    const content = JSON.stringify(spec, null, 2);
    const filename = `${schema.name}_openapi.json`;

    return {
      success: true,
      data: content,
      filename,
      size: new Blob([content]).size,
      format: 'openapi'
    };
  }

  // Helper methods
  private static groupRecordsByTable(records: DatabaseRecord[], schema: DatabaseSchema): Record<string, DatabaseRecord[]> {
    const grouped: Record<string, DatabaseRecord[]> = {};
    records.forEach(record => {
      if (!grouped[record.tableId]) {
        grouped[record.tableId] = [];
      }
      grouped[record.tableId].push(record);
    });
    return grouped;
  }

  private static escapeXML(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;');
  }

  private static formatYAMLValue(value: any): string {
    if (value === null || value === undefined) return 'null';
    if (typeof value === 'string') return `"${value}"`;
    if (typeof value === 'boolean') return value.toString();
    return String(value);
  }

  private static toGraphQLTypeName(name: string): string {
    return name.charAt(0).toUpperCase() + name.slice(1).replace(/_/g, '');
  }

  private static mapDataTypeToGraphQL(type: DataType): string {
    const typeMap: Record<DataType, string> = {
      'TEXT': 'String',
      'INTEGER': 'Int',
      'REAL': 'Float',
      'BLOB': 'String',
      'BOOLEAN': 'Boolean',
      'DATE': 'String',
      'DATETIME': 'String',
      'BIGINT': 'Int',
      'DECIMAL': 'Float',
      'CHAR': 'String',
      'VARCHAR': 'String',
      'ENUM': 'String',
      'TIMESTAMP': 'String',
      'INTERVAL': 'String',
      'JSON': 'String',
      'XML': 'String',
      'UUID': 'ID',
      'NUMERIC': 'Float',
      'FLOAT': 'Float',
      'DOUBLE': 'Float',
      'SMALLINT': 'Int',
      'TINYINT': 'Int',
      'MONEY': 'Float',
      'NCHAR': 'String',
      'NVARCHAR': 'String',
      'SET': 'String',
      'TIME': 'String',
      'YEAR': 'Int',
      'JSONB': 'String',
      'BINARY': 'String',
      'VARBINARY': 'String',
      'GUID': 'ID',
      'ARRAY': '[String]',
      'TEXT_ARRAY': '[String]',
      'INTEGER_ARRAY': '[Int]',
      'JSON_ARRAY': '[String]',
      'GEOMETRY': 'String',
      'POINT': 'String',
      'POLYGON': 'String',
      'LINESTRING': 'String',
      'MULTIPOINT': 'String',
      'MULTIPOLYGON': 'String',
      'MULTILINESTRING': 'String',
      'GEOMETRYCOLLECTION': 'String',
      'INET': 'String',
      'CIDR': 'String',
      'MACADDR': 'String',
      'TSVECTOR': 'String',
      'TSQUERY': 'String',
      'CUSTOM': 'String'
    };
    return typeMap[type] || 'String';
  }

  private static toOpenAPISchemaName(name: string): string {
    return name.charAt(0).toUpperCase() + name.slice(1);
  }

  private static mapDataTypeToOpenAPI(type: DataType): string {
    const typeMap: Record<DataType, string> = {
      'TEXT': 'string',
      'INTEGER': 'integer',
      'REAL': 'number',
      'BLOB': 'string',
      'BOOLEAN': 'boolean',
      'DATE': 'string',
      'DATETIME': 'string',
      'BIGINT': 'integer',
      'DECIMAL': 'number',
      'CHAR': 'string',
      'VARCHAR': 'string',
      'ENUM': 'string',
      'TIMESTAMP': 'string',
      'INTERVAL': 'string',
      'JSON': 'object',
      'XML': 'string',
      'UUID': 'string',
      'NUMERIC': 'number',
      'FLOAT': 'number',
      'DOUBLE': 'number',
      'SMALLINT': 'integer',
      'TINYINT': 'integer',
      'MONEY': 'number',
      'NCHAR': 'string',
      'NVARCHAR': 'string',
      'SET': 'string',
      'TIME': 'string',
      'YEAR': 'integer',
      'JSONB': 'string',
      'BINARY': 'string',
      'VARBINARY': 'string',
      'GUID': 'string',
      'ARRAY': 'array',
      'TEXT_ARRAY': 'array',
      'INTEGER_ARRAY': 'array',
      'JSON_ARRAY': 'array',
      'GEOMETRY': 'string',
      'POINT': 'string',
      'POLYGON': 'string',
      'LINESTRING': 'string',
      'MULTIPOINT': 'string',
      'MULTIPOLYGON': 'string',
      'MULTILINESTRING': 'string',
      'GEOMETRYCOLLECTION': 'string',
      'INET': 'string',
      'CIDR': 'string',
      'MACADDR': 'string',
      'TSVECTOR': 'string',
      'TSQUERY': 'string',
      'CUSTOM': 'string'
    };
    return typeMap[type] || 'string';
  }
}
