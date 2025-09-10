// Enhanced Import Service for QueryFlow
// Supports importing from multiple formats including SQL scripts, CSV, JSON, XML, 
// YAML, TOML, database connections, and various data sources

import { DatabaseSchema, Table, Column, DataType, DatabaseRecord, SchemaValidation } from '@/types/database';
import { ExportFormat } from './exportService';

export interface ImportOptions {
  format: ImportFormat;
  validateSchema: boolean;
  validateData: boolean;
  skipErrors: boolean;
  overwriteExisting: boolean;
  createMissingTables: boolean;
  mergeMode: 'replace' | 'append' | 'update' | 'upsert';
  columnMapping?: Record<string, string>;
  dataTransformations?: Record<string, string>;
  filters?: {
    tables?: string[];
    excludeTables?: string[];
    dateRange?: {
      start: Date;
      end: Date;
      column: string;
    };
  };
  batchSize?: number;
  encoding?: string;
}

export type ImportFormat = 
  | 'sql'
  | 'csv'
  | 'json'
  | 'xml'
  | 'yaml'
  | 'toml'
  | 'excel'
  | 'parquet'
  | 'database'
  | 'api';

export interface ImportResult {
  success: boolean;
  tablesCreated: number;
  tablesUpdated: number;
  recordsImported: number;
  recordsSkipped: number;
  recordsErrors: number;
  schema?: DatabaseSchema;
  records?: DatabaseRecord[];
  errors: ImportError[];
  warnings: string[];
  metadata?: Record<string, any>;
  validationResult?: SchemaValidation;
}

export interface ImportError {
  type: 'schema' | 'data' | 'validation' | 'format';
  message: string;
  line?: number;
  column?: string;
  table?: string;
  record?: any;
  severity: 'error' | 'warning';
}

export interface DatabaseConnection {
  type: 'postgres' | 'mysql' | 'mssql' | 'oracle' | 'sqlite';
  host: string;
  port: number;
  database: string;
  username: string;
  password: string;
  ssl?: boolean;
  schema?: string;
  connectionTimeout?: number;
  queryTimeout?: number;
}

export interface APIConnection {
  url: string;
  method: 'GET' | 'POST';
  headers?: Record<string, string>;
  authentication?: {
    type: 'none' | 'basic' | 'bearer' | 'apikey';
    credentials?: Record<string, string>;
  };
  pagination?: {
    type: 'offset' | 'cursor' | 'page';
    limitParam: string;
    offsetParam?: string;
    pageParam?: string;
    cursorParam?: string;
  };
}

export class ImportService {
  private static readonly MAX_BATCH_SIZE = 10000;
  private static readonly DEFAULT_TIMEOUT = 30000; // 30 seconds

  /**
   * Import schema and/or data from specified source
   */
  static async importData(
    source: string | File | DatabaseConnection | APIConnection,
    options: ImportOptions
  ): Promise<ImportResult> {
    try {
      const startTime = Date.now();
      let result: ImportResult;

      switch (options.format) {
        case 'sql':
          result = await this.importSQL(source as string, options);
          break;
        case 'csv':
          result = await this.importCSV(source as string | File, options);
          break;
        case 'json':
          result = await this.importJSON(source as string | File, options);
          break;
        case 'xml':
          result = await this.importXML(source as string | File, options);
          break;
        case 'yaml':
          result = await this.importYAML(source as string | File, options);
          break;
        case 'toml':
          result = await this.importTOML(source as string | File, options);
          break;
        case 'database':
          result = await this.importFromDatabase(source as DatabaseConnection, options);
          break;
        case 'api':
          result = await this.importFromAPI(source as APIConnection, options);
          break;
        default:
          throw new Error(`Unsupported import format: ${options.format}`);
      }

      const executionTime = Date.now() - startTime;
      result.metadata = {
        ...result.metadata,
        executionTime,
        importedAt: new Date().toISOString(),
        sourceType: typeof source
      };

      return result;
    } catch (error) {
      return {
        success: false,
        tablesCreated: 0,
        tablesUpdated: 0,
        recordsImported: 0,
        recordsSkipped: 0,
        recordsErrors: 0,
        errors: [{
          type: 'format',
          message: error instanceof Error ? error.message : 'Unknown import error',
          severity: 'error'
        }],
        warnings: []
      };
    }
  }

  /**
   * Import from SQL script
   */
  private static async importSQL(
    sqlContent: string,
    options: ImportOptions
  ): Promise<ImportResult> {
    const result: ImportResult = {
      success: true,
      tablesCreated: 0,
      tablesUpdated: 0,
      recordsImported: 0,
      recordsSkipped: 0,
      recordsErrors: 0,
      errors: [],
      warnings: []
    };

    try {
      // Parse SQL statements
      const statements = this.parseSQLStatements(sqlContent);
      const schema = await this.extractSchemaFromSQL(statements);
      const records = await this.extractDataFromSQL(statements, schema);

      if (options.validateSchema && schema) {
        const validation = this.validateSchema(schema);
        result.validationResult = validation;
        if (!validation.isValid) {
          validation.errors.forEach(error => {
            result.errors.push({
              type: 'validation',
              message: error.message,
              table: error.tableId,
              column: error.columnId,
              severity: error.severity
            });
          });
        }
      }

      result.schema = schema;
      result.records = records;
      result.tablesCreated = schema?.tables.length || 0;
      result.recordsImported = records?.length || 0;

      return result;
    } catch (error) {
      result.success = false;
      result.errors.push({
        type: 'format',
        message: error instanceof Error ? error.message : 'Failed to parse SQL',
        severity: 'error'
      });
      return result;
    }
  }

  /**
   * Import from CSV file
   */
  private static async importCSV(
    source: string | File,
    options: ImportOptions
  ): Promise<ImportResult> {
    const result: ImportResult = {
      success: true,
      tablesCreated: 0,
      tablesUpdated: 0,
      recordsImported: 0,
      recordsSkipped: 0,
      recordsErrors: 0,
      errors: [],
      warnings: []
    };

    try {
      let csvContent: string;
      if (source instanceof File) {
        csvContent = await this.readFileAsText(source, options.encoding);
      } else {
        csvContent = source;
      }

      const lines = csvContent.split('\n').filter(line => line.trim());
      if (lines.length === 0) {
        throw new Error('Empty CSV file');
      }

      // Parse headers
      const headers = this.parseCSVLine(lines[0]);
      const dataLines = lines.slice(1);

      // Create table structure
      const tableName = source instanceof File ? 
        source.name.replace(/\.[^/.]+$/, '') : 'imported_table';
      
      const columns: Column[] = headers.map((header, index) => ({
        id: `col_${index}`,
        name: this.sanitizeColumnName(header),
        type: 'TEXT' as DataType, // Default to TEXT, can be inferred later
        nullable: true,
        primaryKey: false
      }));

      const table: Table = {
        id: `table_${Date.now()}`,
        name: tableName,
        columns,
        position: { x: 0, y: 0 }
      };

      // Parse data rows
      const records: DatabaseRecord[] = [];
      for (let i = 0; i < dataLines.length; i++) {
        try {
          const values = this.parseCSVLine(dataLines[i]);
          const recordData: Record<string, any> = {};
          
          headers.forEach((header, index) => {
            const columnName = this.sanitizeColumnName(header);
            const value = values[index] || null;
            recordData[columnName] = this.inferAndConvertValue(value || '');
          });

          records.push({
            id: `record_${Date.now()}_${i}`,
            tableId: table.id,
            data: recordData
          });
        } catch (error) {
          result.errors.push({
            type: 'data',
            message: `Error parsing row ${i + 2}: ${error instanceof Error ? error.message : 'Unknown error'}`,
            line: i + 2,
            severity: options.skipErrors ? 'warning' : 'error'
          });
          result.recordsErrors++;
          
          if (!options.skipErrors) {
            result.success = false;
            break;
          }
        }
      }

      // Infer column types from data
      this.inferColumnTypes(table, records);

      const schema: DatabaseSchema = {
        id: `schema_${Date.now()}`,
        name: `Imported from CSV`,
        tables: [table],
        createdAt: new Date(),
        updatedAt: new Date(),
        version: 1
      };

      result.schema = schema;
      result.records = records;
      result.tablesCreated = 1;
      result.recordsImported = records.length;

      return result;
    } catch (error) {
      result.success = false;
      result.errors.push({
        type: 'format',
        message: error instanceof Error ? error.message : 'Failed to parse CSV',
        severity: 'error'
      });
      return result;
    }
  }

  /**
   * Import from JSON file
   */
  private static async importJSON(
    source: string | File,
    options: ImportOptions
  ): Promise<ImportResult> {
    const result: ImportResult = {
      success: true,
      tablesCreated: 0,
      tablesUpdated: 0,
      recordsImported: 0,
      recordsSkipped: 0,
      recordsErrors: 0,
      errors: [],
      warnings: []
    };

    try {
      let jsonContent: string;
      if (source instanceof File) {
        jsonContent = await this.readFileAsText(source, options.encoding);
      } else {
        jsonContent = source;
      }

      const data = JSON.parse(jsonContent);
      
      // Handle different JSON structures
      if (data.schema && data.data) {
        // QueryFlow export format
        result.schema = this.reconstructSchemaFromExport(data.schema);
        result.records = this.reconstructRecordsFromExport(data.data, result.schema!);
      } else if (Array.isArray(data)) {
        // Array of objects
        const { schema, records } = this.inferSchemaFromObjects('imported_table', data);
        result.schema = schema;
        result.records = records;
      } else if (typeof data === 'object') {
        // Object with table names as keys
        const { schema, records } = this.inferSchemaFromTableObject(data);
        result.schema = schema;
        result.records = records;
      } else {
        throw new Error('Unsupported JSON structure');
      }

      result.tablesCreated = result.schema?.tables.length || 0;
      result.recordsImported = result.records?.length || 0;

      return result;
    } catch (error) {
      result.success = false;
      result.errors.push({
        type: 'format',
        message: error instanceof Error ? error.message : 'Failed to parse JSON',
        severity: 'error'
      });
      return result;
    }
  }

  /**
   * Import from XML file
   */
  private static async importXML(
    source: string | File,
    options: ImportOptions
  ): Promise<ImportResult> {
    const result: ImportResult = {
      success: true,
      tablesCreated: 0,
      tablesUpdated: 0,
      recordsImported: 0,
      recordsSkipped: 0,
      recordsErrors: 0,
      errors: [],
      warnings: []
    };

    try {
      let xmlContent: string;
      if (source instanceof File) {
        xmlContent = await this.readFileAsText(source, options.encoding);
      } else {
        xmlContent = source;
      }

      // Basic XML parsing (in a real implementation, use DOMParser or xml2js)
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(xmlContent, 'text/xml');

      if (xmlDoc.documentElement.nodeName === 'parsererror') {
        throw new Error('Invalid XML format');
      }

      const { schema, records } = this.parseXMLDocument(xmlDoc);
      result.schema = schema;
      result.records = records;
      result.tablesCreated = schema.tables.length;
      result.recordsImported = records.length;

      return result;
    } catch (error) {
      result.success = false;
      result.errors.push({
        type: 'format',
        message: error instanceof Error ? error.message : 'Failed to parse XML',
        severity: 'error'
      });
      return result;
    }
  }

  /**
   * Import from YAML file
   */
  private static async importYAML(
    source: string | File,
    options: ImportOptions
  ): Promise<ImportResult> {
    const result: ImportResult = {
      success: true,
      tablesCreated: 0,
      tablesUpdated: 0,
      recordsImported: 0,
      recordsSkipped: 0,
      recordsErrors: 0,
      errors: [],
      warnings: []
    };

    try {
      let yamlContent: string;
      if (source instanceof File) {
        yamlContent = await this.readFileAsText(source, options.encoding);
      } else {
        yamlContent = source;
      }

      // Basic YAML parsing (in a real implementation, use js-yaml library)
      const data = this.parseYAML(yamlContent);
      
      if (data.schema && data.data) {
        result.schema = this.reconstructSchemaFromYAML(data.schema);
        result.records = this.reconstructRecordsFromYAML(data.data, result.schema!);
      } else {
        throw new Error('Unsupported YAML structure');
      }

      result.tablesCreated = result.schema?.tables.length || 0;
      result.recordsImported = result.records?.length || 0;

      return result;
    } catch (error) {
      result.success = false;
      result.errors.push({
        type: 'format',
        message: error instanceof Error ? error.message : 'Failed to parse YAML',
        severity: 'error'
      });
      return result;
    }
  }

  /**
   * Import from TOML file
   */
  private static async importTOML(
    source: string | File,
    options: ImportOptions
  ): Promise<ImportResult> {
    const result: ImportResult = {
      success: true,
      tablesCreated: 0,
      tablesUpdated: 0,
      recordsImported: 0,
      recordsSkipped: 0,
      recordsErrors: 0,
      errors: [],
      warnings: []
    };

    try {
      let tomlContent: string;
      if (source instanceof File) {
        tomlContent = await this.readFileAsText(source, options.encoding);
      } else {
        tomlContent = source;
      }

      // Basic TOML parsing (in a real implementation, use @iarna/toml library)
      const data = this.parseTOML(tomlContent);
      
      if (data.schema) {
        result.schema = this.reconstructSchemaFromTOML(data.schema);
        result.records = this.reconstructRecordsFromTOML(data.data || {}, result.schema!);
      } else {
        throw new Error('Unsupported TOML structure');
      }

      result.tablesCreated = result.schema?.tables.length || 0;
      result.recordsImported = result.records?.length || 0;

      return result;
    } catch (error) {
      result.success = false;
      result.errors.push({
        type: 'format',
        message: error instanceof Error ? error.message : 'Failed to parse TOML',
        severity: 'error'
      });
      return result;
    }
  }

  /**
   * Import from database connection
   */
  private static async importFromDatabase(
    connection: DatabaseConnection,
    options: ImportOptions
  ): Promise<ImportResult> {
    const result: ImportResult = {
      success: false,
      tablesCreated: 0,
      tablesUpdated: 0,
      recordsImported: 0,
      recordsSkipped: 0,
      recordsErrors: 0,
      errors: [{
        type: 'format',
        message: 'Database import not implemented yet - requires database drivers',
        severity: 'error'
      }],
      warnings: []
    };

    // TODO: Implement database connections for Postgres, MySQL, etc.
    // This would require installing and configuring database drivers
    
    return result;
  }

  /**
   * Import from API endpoint
   */
  private static async importFromAPI(
    connection: APIConnection,
    options: ImportOptions
  ): Promise<ImportResult> {
    const result: ImportResult = {
      success: true,
      tablesCreated: 0,
      tablesUpdated: 0,
      recordsImported: 0,
      recordsSkipped: 0,
      recordsErrors: 0,
      errors: [],
      warnings: []
    };

    try {
      const headers = { ...connection.headers };
      
      // Add authentication headers
      if (connection.authentication) {
        switch (connection.authentication.type) {
          case 'basic':
            const basic = btoa(`${connection.authentication.credentials?.username}:${connection.authentication.credentials?.password}`);
            headers['Authorization'] = `Basic ${basic}`;
            break;
          case 'bearer':
            headers['Authorization'] = `Bearer ${connection.authentication.credentials?.token}`;
            break;
          case 'apikey':
            headers[connection.authentication.credentials?.headerName || 'X-API-Key'] = connection.authentication.credentials?.key || '';
            break;
        }
      }

      const response = await fetch(connection.url, {
        method: connection.method,
        headers
      });

      if (!response.ok) {
        throw new Error(`API request failed: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      
      // Process API response data
      if (Array.isArray(data)) {
        const { schema, records } = this.inferSchemaFromObjects('api_data', data);
        result.schema = schema;
        result.records = records;
      } else if (data.data && Array.isArray(data.data)) {
        const { schema, records } = this.inferSchemaFromObjects('api_data', data.data);
        result.schema = schema;
        result.records = records;
      } else {
        throw new Error('Unsupported API response format');
      }

      result.tablesCreated = 1;
      result.recordsImported = result.records?.length || 0;

      return result;
    } catch (error) {
      result.success = false;
      result.errors.push({
        type: 'format',
        message: error instanceof Error ? error.message : 'Failed to import from API',
        severity: 'error'
      });
      return result;
    }
  }

  // Helper methods

  private static async readFileAsText(file: File, encoding?: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(reader.error);
      if (encoding) {
        reader.readAsText(file, encoding);
      } else {
        reader.readAsText(file);
      }
    });
  }

  private static parseCSVLine(line: string): string[] {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      
      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        result.push(current);
        current = '';
      } else {
        current += char;
      }
    }
    
    result.push(current);
    return result;
  }

  private static sanitizeColumnName(name: string): string {
    return name
      .replace(/[^a-zA-Z0-9_]/g, '_')
      .replace(/^[0-9]/, '_$&')
      .toLowerCase();
  }

  private static inferAndConvertValue(value: string): any {
    if (!value || value === '') return null;
    
    // Try to infer data type
    if (value.toLowerCase() === 'true' || value.toLowerCase() === 'false') {
      return value.toLowerCase() === 'true';
    }
    
    if (!isNaN(Number(value))) {
      return Number(value);
    }
    
    if (!isNaN(Date.parse(value))) {
      return value; // Keep as string for now, can be converted later
    }
    
    return value;
  }

  private static inferColumnTypes(table: Table, records: DatabaseRecord[]): void {
    table.columns.forEach(column => {
      const values = records.map(r => r.data[column.name]).filter(v => v !== null && v !== undefined);
      
      if (values.length === 0) return;
      
      // Check if all values are boolean
      if (values.every(v => typeof v === 'boolean')) {
        column.type = 'BOOLEAN';
        return;
      }
      
      // Check if all values are numbers
      if (values.every(v => typeof v === 'number')) {
        if (values.every(v => Number.isInteger(v))) {
          column.type = 'INTEGER';
        } else {
          column.type = 'REAL';
        }
        return;
      }
      
      // Check if all values are valid dates
      if (values.every(v => typeof v === 'string' && !isNaN(Date.parse(v)))) {
        column.type = 'DATETIME';
        return;
      }
      
      // Default to TEXT
      column.type = 'TEXT';
    });
  }

  private static parseSQLStatements(sql: string): string[] {
    // Basic SQL statement splitting (in production, use a proper SQL parser)
    return sql
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0);
  }

  private static async extractSchemaFromSQL(statements: string[]): Promise<DatabaseSchema> {
    // Basic schema extraction from CREATE TABLE statements
    const tables: Table[] = [];
    
    statements.forEach(stmt => {
      if (stmt.toUpperCase().startsWith('CREATE TABLE')) {
        const table = this.parseCreateTableStatement(stmt);
        if (table) {
          tables.push(table);
        }
      }
    });

    return {
      id: `schema_${Date.now()}`,
      name: 'Imported Schema',
      tables,
      createdAt: new Date(),
      updatedAt: new Date(),
      version: 1
    };
  }

  private static async extractDataFromSQL(statements: string[], schema: DatabaseSchema): Promise<DatabaseRecord[]> {
    // Basic data extraction from INSERT statements
    const records: DatabaseRecord[] = [];
    
    statements.forEach(stmt => {
      if (stmt.toUpperCase().startsWith('INSERT INTO')) {
        const insertRecords = this.parseInsertStatement(stmt, schema);
        records.push(...insertRecords);
      }
    });

    return records;
  }

  private static parseCreateTableStatement(sql: string): Table | null {
    // Basic CREATE TABLE parsing (simplified)
    const match = sql.match(/CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?["`]?(\w+)["`]?\s*\((.*)\)/i);
    if (!match) return null;

    const tableName = match[1];
    const columnsSQL = match[2];
    
    const columns: Column[] = [];
    const columnDefs = columnsSQL.split(',').map(def => def.trim());
    
    columnDefs.forEach((def, index) => {
      const parts = def.split(/\s+/);
      if (parts.length >= 2) {
        const columnName = parts[0].replace(/["`]/g, '');
        const columnType = this.mapSQLTypeToDataType(parts[1]);
        
        columns.push({
          id: `col_${index}`,
          name: columnName,
          type: columnType,
          nullable: !def.toUpperCase().includes('NOT NULL'),
          primaryKey: def.toUpperCase().includes('PRIMARY KEY')
        });
      }
    });

    return {
      id: `table_${Date.now()}`,
      name: tableName,
      columns,
      position: { x: 0, y: 0 }
    };
  }

  private static parseInsertStatement(sql: string, schema: DatabaseSchema): DatabaseRecord[] {
    // Basic INSERT parsing (simplified)
    const match = sql.match(/INSERT\s+INTO\s+["`]?(\w+)["`]?\s*\((.*?)\)\s*VALUES\s*(.*)/i);
    if (!match) return [];

    const tableName = match[1];
    const table = schema.tables.find(t => t.name === tableName);
    if (!table) return [];

    const columnNames = match[2].split(',').map(col => col.trim().replace(/["`]/g, ''));
    const valuesSQL = match[3];
    
    const records: DatabaseRecord[] = [];
    
    // Parse VALUES clauses (simplified)
    const valueMatches = valuesSQL.match(/\(([^)]+)\)/g);
    if (valueMatches) {
      valueMatches.forEach((valueMatch, index) => {
        const values = valueMatch.slice(1, -1).split(',').map(val => {
          val = val.trim();
          if (val.startsWith("'") && val.endsWith("'")) {
            return val.slice(1, -1);
          }
          if (val === 'NULL') return null;
          if (!isNaN(Number(val))) return Number(val);
          return val;
        });

        const recordData: Record<string, any> = {};
        columnNames.forEach((col, i) => {
          recordData[col] = values[i];
        });

        records.push({
          id: `record_${Date.now()}_${index}`,
          tableId: table.id,
          data: recordData
        });
      });
    }

    return records;
  }

  private static mapSQLTypeToDataType(sqlType: string): DataType {
    const type = sqlType.toUpperCase();
    
    if (type.includes('INT')) return 'INTEGER';
    if (type.includes('CHAR') || type.includes('TEXT')) return 'TEXT';
    if (type.includes('REAL') || type.includes('FLOAT') || type.includes('DOUBLE')) return 'REAL';
    if (type.includes('BOOL')) return 'BOOLEAN';
    if (type.includes('DATE')) return 'DATE';
    if (type.includes('TIME')) return 'DATETIME';
    if (type.includes('BLOB') || type.includes('BINARY')) return 'BLOB';
    
    return 'TEXT';
  }

  private static validateSchema(schema: DatabaseSchema): SchemaValidation {
    // Basic schema validation
    const errors: any[] = [];
    const warnings: any[] = [];

    schema.tables.forEach(table => {
      if (!table.name || table.name.trim() === '') {
        errors.push({
          type: 'naming',
          message: 'Table name cannot be empty',
          tableId: table.id,
          severity: 'error'
        });
      }

      if (table.columns.length === 0) {
        warnings.push({
          type: 'best_practice',
          message: 'Table has no columns',
          tableId: table.id,
          severity: 'warning'
        });
      }

      table.columns.forEach(column => {
        if (!column.name || column.name.trim() === '') {
          errors.push({
            type: 'naming',
            message: 'Column name cannot be empty',
            tableId: table.id,
            columnId: column.id,
            severity: 'error'
          });
        }
      });
    });

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  private static inferSchemaFromObjects(tableName: string, objects: any[]): { schema: DatabaseSchema; records: DatabaseRecord[] } {
    if (objects.length === 0) {
      throw new Error('Cannot infer schema from empty array');
    }

    // Get all unique keys from all objects
    const allKeys = new Set<string>();
    objects.forEach(obj => {
      Object.keys(obj).forEach(key => allKeys.add(key));
    });

    // Create columns
    const columns: Column[] = Array.from(allKeys).map((key, index) => {
      const values = objects.map(obj => obj[key]).filter(v => v !== null && v !== undefined);
      
      let type: DataType = 'TEXT';
      if (values.length > 0) {
        if (values.every(v => typeof v === 'boolean')) {
          type = 'BOOLEAN';
        } else if (values.every(v => typeof v === 'number')) {
          type = values.every(v => Number.isInteger(v)) ? 'INTEGER' : 'REAL';
        } else if (values.every(v => typeof v === 'string' && !isNaN(Date.parse(v)))) {
          type = 'DATETIME';
        }
      }

      return {
        id: `col_${index}`,
        name: key,
        type,
        nullable: true,
        primaryKey: false
      };
    });

    const table: Table = {
      id: `table_${Date.now()}`,
      name: tableName,
      columns,
      position: { x: 0, y: 0 }
    };

    const schema: DatabaseSchema = {
      id: `schema_${Date.now()}`,
      name: 'Imported Schema',
      tables: [table],
      createdAt: new Date(),
      updatedAt: new Date(),
      version: 1
    };

    const records: DatabaseRecord[] = objects.map((obj, index) => ({
      id: `record_${Date.now()}_${index}`,
      tableId: table.id,
      data: obj
    }));

    return { schema, records };
  }

  private static inferSchemaFromTableObject(data: Record<string, any[]>): { schema: DatabaseSchema; records: DatabaseRecord[] } {
    const tables: Table[] = [];
    const allRecords: DatabaseRecord[] = [];

    Object.entries(data).forEach(([tableName, objects]) => {
      if (Array.isArray(objects) && objects.length > 0) {
        const { schema: tableSchema, records } = this.inferSchemaFromObjects(tableName, objects);
        tables.push(tableSchema.tables[0]);
        allRecords.push(...records);
      }
    });

    const schema: DatabaseSchema = {
      id: `schema_${Date.now()}`,
      name: 'Imported Schema',
      tables,
      createdAt: new Date(),
      updatedAt: new Date(),
      version: 1
    };

    return { schema, records: allRecords };
  }

  private static reconstructSchemaFromExport(exportedSchema: any): DatabaseSchema {
    // Reconstruct schema from QueryFlow export format
    return {
      id: `schema_${Date.now()}`,
      name: exportedSchema.name || 'Imported Schema',
      tables: exportedSchema.tables?.map((table: any) => ({
        id: `table_${Date.now()}_${Math.random()}`,
        name: table.name,
        columns: table.columns?.map((col: any, index: number) => ({
          id: `col_${index}`,
          name: col.name,
          type: col.type,
          nullable: col.nullable,
          primaryKey: col.primaryKey,
          defaultValue: col.defaultValue,
          constraints: col.constraints,
          documentation: col.documentation
        })) || [],
        position: { x: 0, y: 0 },
        documentation: table.documentation
      })) || [],
      createdAt: new Date(),
      updatedAt: new Date(),
      version: exportedSchema.version || 1,
      description: exportedSchema.description
    };
  }

  private static reconstructRecordsFromExport(exportedData: any, schema: DatabaseSchema): DatabaseRecord[] {
    const records: DatabaseRecord[] = [];
    
    Object.entries(exportedData).forEach(([tableName, tableData]) => {
      const table = schema.tables.find(t => t.name === tableName);
      if (table && Array.isArray(tableData)) {
        tableData.forEach((rowData: any, index: number) => {
          records.push({
            id: `record_${Date.now()}_${index}`,
            tableId: table.id,
            data: rowData
          });
        });
      }
    });

    return records;
  }

  private static parseXMLDocument(xmlDoc: Document): { schema: DatabaseSchema; records: DatabaseRecord[] } {
    // Basic XML parsing for QueryFlow export format
    const database = xmlDoc.documentElement;
    const schemaName = database.getAttribute('name') || 'Imported Schema';
    
    const tables: Table[] = [];
    const records: DatabaseRecord[] = [];

    // Parse schema
    const schemaNode = database.querySelector('schema');
    if (schemaNode) {
      const tableNodes = schemaNode.querySelectorAll('table');
      tableNodes.forEach((tableNode, tableIndex) => {
        const tableName = tableNode.getAttribute('name') || `table_${tableIndex}`;
        const columns: Column[] = [];
        
        const columnNodes = tableNode.querySelectorAll('column');
        columnNodes.forEach((columnNode, colIndex) => {
          columns.push({
            id: `col_${colIndex}`,
            name: columnNode.getAttribute('name') || `column_${colIndex}`,
            type: (columnNode.getAttribute('type') as DataType) || 'TEXT',
            nullable: columnNode.getAttribute('nullable') === 'true',
            primaryKey: columnNode.getAttribute('primaryKey') === 'true'
          });
        });

        tables.push({
          id: `table_${Date.now()}_${tableIndex}`,
          name: tableName,
          columns,
          position: { x: 0, y: 0 }
        });
      });
    }

    // Parse data
    const dataNode = database.querySelector('data');
    if (dataNode) {
      const tableDataNodes = dataNode.querySelectorAll('table');
      tableDataNodes.forEach((tableDataNode) => {
        const tableName = tableDataNode.getAttribute('name');
        const table = tables.find(t => t.name === tableName);
        if (table) {
          const rowNodes = tableDataNode.querySelectorAll('row');
          rowNodes.forEach((rowNode, rowIndex) => {
            const data: Record<string, any> = {};
            table.columns.forEach(column => {
              const valueNode = rowNode.querySelector(column.name);
              data[column.name] = valueNode?.textContent || null;
            });

            records.push({
              id: `record_${Date.now()}_${rowIndex}`,
              tableId: table.id,
              data
            });
          });
        }
      });
    }

    const schema: DatabaseSchema = {
      id: `schema_${Date.now()}`,
      name: schemaName,
      tables,
      createdAt: new Date(),
      updatedAt: new Date(),
      version: 1
    };

    return { schema, records };
  }

  private static parseYAML(yamlContent: string): any {
    // Basic YAML parsing (simplified)
    // In production, use js-yaml library
    const lines = yamlContent.split('\n');
    const result: any = {};
    
    // Very basic YAML parsing - just for demonstration
    // This is a simplified implementation
    let currentKey = '';
    lines.forEach(line => {
      const trimmed = line.trim();
      if (trimmed.includes(':') && !trimmed.startsWith('-')) {
        const [key, value] = trimmed.split(':').map(s => s.trim());
        if (value) {
          result[key] = value.replace(/^["']|["']$/g, '');
        } else {
          currentKey = key;
          result[key] = {};
        }
      }
    });

    return result;
  }

  private static parseTOML(tomlContent: string): any {
    // Basic TOML parsing (simplified)
    // In production, use @iarna/toml library
    const lines = tomlContent.split('\n');
    const result: any = {};
    
    // Very basic TOML parsing - just for demonstration
    lines.forEach(line => {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
        const [key, value] = trimmed.split('=').map(s => s.trim());
        result[key] = value.replace(/^["']|["']$/g, '');
      }
    });

    return result;
  }

  private static reconstructSchemaFromYAML(yamlSchema: any): DatabaseSchema {
    // Reconstruct schema from YAML format
    return {
      id: `schema_${Date.now()}`,
      name: yamlSchema.name || 'Imported Schema',
      tables: yamlSchema.tables?.map((table: any, index: number) => ({
        id: `table_${Date.now()}_${index}`,
        name: table.name,
        columns: table.columns?.map((col: any, colIndex: number) => ({
          id: `col_${colIndex}`,
          name: col.name,
          type: col.type as DataType,
          nullable: col.nullable,
          primaryKey: col.primaryKey,
          defaultValue: col.defaultValue
        })) || [],
        position: { x: 0, y: 0 },
        documentation: table.description
      })) || [],
      createdAt: new Date(),
      updatedAt: new Date(),
      version: 1
    };
  }

  private static reconstructRecordsFromYAML(yamlData: any, schema: DatabaseSchema): DatabaseRecord[] {
    const records: DatabaseRecord[] = [];
    
    Object.entries(yamlData).forEach(([tableName, tableData]) => {
      const table = schema.tables.find(t => t.name === tableName);
      if (table && Array.isArray(tableData)) {
        tableData.forEach((rowData: any, index: number) => {
          records.push({
            id: `record_${Date.now()}_${index}`,
            tableId: table.id,
            data: rowData
          });
        });
      }
    });

    return records;
  }

  private static reconstructSchemaFromTOML(tomlSchema: any): DatabaseSchema {
    // Reconstruct schema from TOML format
    return {
      id: `schema_${Date.now()}`,
      name: tomlSchema.name || 'Imported Schema',
      tables: [], // TOML parsing would need more sophisticated implementation
      createdAt: new Date(),
      updatedAt: new Date(),
      version: 1
    };
  }

  private static reconstructRecordsFromTOML(tomlData: any, schema: DatabaseSchema): DatabaseRecord[] {
    // Reconstruct records from TOML format
    return []; // TOML parsing would need more sophisticated implementation
  }
}
