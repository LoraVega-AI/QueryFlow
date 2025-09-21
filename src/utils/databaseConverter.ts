import { readFile, writeFile, unlink } from 'fs/promises';
import path from 'path';
import { dbConnectionManager } from './databaseConnection';
import DatabaseErrorHandler from './databaseErrorHandler';
import { exec } from 'child_process';
import { promisify } from 'util';
const execAsync = promisify(exec);

export interface DatabaseConversionResult {
  success: boolean;
  convertedPath?: string;
  error?: string;
  metadata?: {
    originalType: string;
    originalSize: number;
    convertedSize: number;
    tables?: any[];
    schema?: any;
  };
}

export class DatabaseConverter {
  private static instance: DatabaseConverter;
  private errorHandler: DatabaseErrorHandler;

  static getInstance(): DatabaseConverter {
    if (!DatabaseConverter.instance) {
      DatabaseConverter.instance = new DatabaseConverter();
    }
    return DatabaseConverter.instance;
  }

  private constructor() {
    this.errorHandler = DatabaseErrorHandler.getInstance();
  }

  /**
   * Convert various database formats to SQLite
   * @param filePath Original database file path
   * @param databaseType Type of the original database
   * @returns Conversion result
   */
  async convertToSQLite(filePath: string, databaseType: string): Promise<DatabaseConversionResult> {
    const startTime = Date.now();
    const operationId = this.errorHandler.logInfo('database_conversion', `Starting conversion of ${databaseType} database`, {
      filePath,
      databaseType,
      originalSize: 0
    }, filePath);

    try {
      this.errorHandler.logDebug('database_conversion', `Beginning conversion process`, {
        filePath,
        databaseType
      }, filePath);

      const originalStats = await this.getFileStats(filePath);
      if (!originalStats) {
        const errorMsg = 'Could not read original file stats';
        this.errorHandler.recordError('file_stats', errorMsg, {
          filePath,
          databaseType,
          operationId
        }, filePath, 'high');

        return {
          success: false,
          error: errorMsg
        };
      }

      this.errorHandler.logDebug('database_conversion', `File stats retrieved`, {
        size: originalStats.size,
        filePath
      }, filePath);

      // Generate output path
      const outputPath = await this.generateOutputPath(filePath, 'sqlite');
      this.errorHandler.logDebug('database_conversion', `Output path generated`, {
        outputPath,
        filePath
      }, filePath);

      let conversionResult: DatabaseConversionResult;

      // Convert based on database type
      switch (databaseType.toLowerCase()) {
        case 'mysql':
          conversionResult = await this.convertMySQLToSQLite(filePath, outputPath);
          break;
        case 'postgresql':
          conversionResult = await this.convertPostgreSQLToSQLite(filePath, outputPath);
          break;
        case 'mongodb':
          conversionResult = await this.convertMongoDBToSQLite(filePath, outputPath);
          break;
        case 'json':
          conversionResult = await this.convertJSONToSQLite(filePath, outputPath);
          break;
        case 'csv':
          conversionResult = await this.convertCSVToSQLite(filePath, outputPath);
          break;
        case 'sql':
          conversionResult = await this.convertSQLScriptToSQLite(filePath, outputPath);
          break;
        default:
          // For unknown types or direct SQLite files, just copy and validate
          conversionResult = await this.handleDirectConversion(filePath, outputPath);
      }

      if (conversionResult.success && conversionResult.convertedPath) {
        const convertedStats = await this.getFileStats(conversionResult.convertedPath);

        conversionResult.metadata = {
          originalType: databaseType,
          originalSize: originalStats.size,
          convertedSize: convertedStats?.size || 0,
          ...conversionResult.metadata
        };

        const duration = Date.now() - startTime;
        this.errorHandler.logPerformance('database_conversion', duration, {
          originalType: databaseType,
          originalSize: originalStats.size,
          convertedSize: convertedStats?.size || 0,
          outputPath: conversionResult.convertedPath
        }, filePath);

        this.errorHandler.logInfo('database_conversion', `Successfully converted ${databaseType} to SQLite`, {
          outputPath: conversionResult.convertedPath,
          originalSize: originalStats.size,
          convertedSize: convertedStats?.size || 0,
          duration
        }, filePath);
      } else {
        const duration = Date.now() - startTime;
        this.errorHandler.recordError('database_conversion', conversionResult.error || 'Unknown conversion error', {
          databaseType,
          filePath,
          outputPath,
          duration,
          operationId
        }, filePath, 'high');
      }

      return conversionResult;

    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Unknown conversion error';

      this.errorHandler.recordError('database_conversion', error, {
        databaseType,
        filePath,
        duration,
        operationId
      }, filePath, 'critical');

      return {
        success: false,
        error: errorMessage
      };
    }
  }

  /**
   * Convert MySQL database files to SQLite
   */
  private async convertMySQLToSQLite(originalPath: string, outputPath: string): Promise<DatabaseConversionResult> {
    try {
      console.log('🔄 Converting MySQL files to SQLite...');

      // Check if it's a MySQL dump file or individual files
      const ext = path.extname(originalPath).toLowerCase();

      if (ext === '.sql') {
        // MySQL dump file - parse and convert SQL
        return await this.convertMySQLDumpToSQLite(originalPath, outputPath);
      } else {
        // Attempt using mysqldump if available and file contains connection details (URI or .cnf)
        const dumpOut = `${outputPath}.sql`;
        const command = `mysqldump --no-tablespaces --result-file="${dumpOut}" --single-transaction --quick --skip-add-drop-table ${originalPath}`;
        const runResult = await this.runExternal(command);
        if (runResult.success) {
          return await this.convertSQLScriptToSQLite(dumpOut, outputPath);
        }
        return {
          success: false,
          error: 'mysqldump unavailable or failed. Install MySQL client tools to enable automatic conversion.'
        };
      }
    } catch (error) {
      return {
        success: false,
        error: `MySQL conversion failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * Convert PostgreSQL database files to SQLite
   */
  private async convertPostgreSQLToSQLite(originalPath: string, outputPath: string): Promise<DatabaseConversionResult> {
    try {
      console.log('🔄 Converting PostgreSQL files to SQLite...');

      const ext = path.extname(originalPath).toLowerCase();

      if (ext === '.sql' || ext === '.dump' || ext === '.backup') {
        return await this.convertPostgreSQLDumpToSQLite(originalPath, outputPath);
      } else {
        // Attempt pg_dump if available (assuming originalPath is connection string)
        const dumpOut = `${outputPath}.sql`;
        const command = `pg_dump --schema-only --no-owner --no-privileges --file="${dumpOut}" ${originalPath}`;
        const runResult = await this.runExternal(command);
        if (runResult.success) {
          return await this.convertSQLScriptToSQLite(dumpOut, outputPath);
        }
        return {
          success: false,
          error: 'pg_dump unavailable or failed. Install PostgreSQL client tools to enable automatic conversion.'
        };
      }
    } catch (error) {
      return {
        success: false,
        error: `PostgreSQL conversion failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * Convert MongoDB files to SQLite
   */
  private async convertMongoDBToSQLite(originalPath: string, outputPath: string): Promise<DatabaseConversionResult> {
    try {
      console.log('🔄 Converting MongoDB files to SQLite...');

      const ext = path.extname(originalPath).toLowerCase();

      if (ext === '.json') {
        return await this.convertJSONToSQLite(originalPath, outputPath);
      } else if (ext === '.bson') {
        return await this.convertBSONToSQLite(originalPath, outputPath);
      } else {
        return {
          success: false,
          error: 'Unsupported MongoDB file format'
        };
      }
    } catch (error) {
      return {
        success: false,
        error: `MongoDB conversion failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * Convert MySQL dump files to SQLite
   */
  private async convertMySQLDumpToSQLite(dumpPath: string, outputPath: string): Promise<DatabaseConversionResult> {
    const operationId = this.errorHandler.logInfo('mysql_conversion', 'Starting MySQL dump conversion', {
      dumpPath,
      outputPath
    }, dumpPath);

    try {
      this.errorHandler.logDebug('mysql_conversion', 'Reading MySQL dump file', { dumpPath }, dumpPath);
      const sqlContent = await readFile(dumpPath, 'utf-8');

      this.errorHandler.logDebug('mysql_conversion', 'Converting MySQL syntax to SQLite', {
        contentSize: sqlContent.length
      }, dumpPath);

      // Basic MySQL to SQLite conversion
      let convertedSQL = sqlContent
        // Remove MySQL-specific syntax
        .replace(/SET\s+.*?;/gi, '') // Remove SET statements
        .replace(/\/\*!.*?\*\//gi, '') // Remove MySQL comments
        .replace(/ENGINE\s*=\s*\w+/gi, '') // Remove ENGINE specifications
        .replace(/DEFAULT\s+CHARSET\s*=\s*\w+/gi, '') // Remove charset specifications
        .replace(/COLLATE\s+\w+/gi, '') // Remove collation specifications
        .replace(/AUTO_INCREMENT\s*=\s*\d+/gi, '') // Remove AUTO_INCREMENT
        .replace(/UNSIGNED/gi, '') // Remove UNSIGNED
        .replace(/ZEROFILL/gi, '') // Remove ZEROFILL
        // Convert data types
        .replace(/TINYINT/gi, 'INTEGER')
        .replace(/SMALLINT/gi, 'INTEGER')
        .replace(/MEDIUMINT/gi, 'INTEGER')
        .replace(/BIGINT/gi, 'INTEGER')
        .replace(/DOUBLE/gi, 'REAL')
        .replace(/FLOAT/gi, 'REAL')
        .replace(/DECIMAL/gi, 'REAL')
        .replace(/DATETIME/gi, 'TEXT')
        .replace(/TIMESTAMP/gi, 'TEXT')
        .replace(/TINYTEXT/gi, 'TEXT')
        .replace(/MEDIUMTEXT/gi, 'TEXT')
        .replace(/LONGTEXT/gi, 'TEXT')
        .replace(/TINYBLOB/gi, 'BLOB')
        .replace(/MEDIUMBLOB/gi, 'BLOB')
        .replace(/LONGBLOB/gi, 'BLOB')
        .replace(/ENUM\([^)]+\)/gi, 'TEXT')
        .replace(/SET\([^)]+\)/gi, 'TEXT');

      this.errorHandler.logDebug('mysql_conversion', 'Writing converted SQL to file', {
        outputPath,
        convertedSize: convertedSQL.length
      }, dumpPath);

      // Write converted SQL
      await writeFile(outputPath, convertedSQL);

      const tables = await this.extractTableInfo(convertedSQL);

      this.errorHandler.logInfo('mysql_conversion', 'MySQL dump conversion completed successfully', {
        outputPath,
        tablesFound: tables.length,
        operationId
      }, dumpPath);

      return {
        success: true,
        convertedPath: outputPath,
        metadata: {
          tables
        }
      };
    } catch (error) {
      this.errorHandler.recordError('mysql_conversion', error, {
        dumpPath,
        outputPath,
        operationId
      }, dumpPath, 'high');

      return {
        success: false,
        error: `MySQL dump conversion failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * Convert PostgreSQL dump files to SQLite
   */
  private async convertPostgreSQLDumpToSQLite(dumpPath: string, outputPath: string): Promise<DatabaseConversionResult> {
    try {
      const sqlContent = await readFile(dumpPath, 'utf-8');

      // Basic PostgreSQL to SQLite conversion
      let convertedSQL = sqlContent
        // Remove PostgreSQL-specific syntax
        .replace(/SET\s+.*?;/gi, '') // Remove SET statements
        .replace(/--.*$/gm, '') // Remove single-line comments
        .replace(/\/\*[\s\S]*?\*\//g, '') // Remove multi-line comments
        // Convert data types
        .replace(/SERIAL/gi, 'INTEGER')
        .replace(/BIGSERIAL/gi, 'INTEGER')
        .replace(/SMALLSERIAL/gi, 'INTEGER')
        .replace(/UUID/gi, 'TEXT')
        .replace(/JSON/gi, 'TEXT')
        .replace(/JSONB/gi, 'TEXT')
        .replace(/ARRAY/gi, 'TEXT')
        .replace(/INET/gi, 'TEXT')
        .replace(/CIDR/gi, 'TEXT')
        .replace(/MACADDR/gi, 'TEXT')
        .replace(/TIMESTAMP\s+WITH\s+TIME\s+ZONE/gi, 'TEXT')
        .replace(/TIMESTAMP\s+WITHOUT\s+TIME\s+ZONE/gi, 'TEXT')
        .replace(/TIME\s+WITH\s+TIME\s+ZONE/gi, 'TEXT')
        .replace(/TIME\s+WITHOUT\s+TIME\s+ZONE/gi, 'TEXT')
        // Remove PostgreSQL-specific features
        .replace(/DEFAULT\s+.*?::.*?/gi, '') // Remove type casts in defaults
        .replace(/::\w+/gi, '') // Remove type casts
        .replace(/SEQUENCE/gi, '') // Remove sequence references
        .replace(/OWNED\s+BY/gi, '') // Remove ownership specifications
        .replace(/GRANT/gi, '') // Remove permission statements
        .replace(/REVOKE/gi, '') // Remove permission statements
        .replace(/COMMENT\s+ON/gi, '') // Remove comments
        .replace(/ALTER\s+TABLE.*?OWNER\s+TO/gi, ''); // Remove ownership changes

      // Write converted SQL
      await writeFile(outputPath, convertedSQL);

      return {
        success: true,
        convertedPath: outputPath,
        metadata: {
          tables: await this.extractTableInfo(convertedSQL)
        }
      };
    } catch (error) {
      return {
        success: false,
        error: `PostgreSQL dump conversion failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * Convert JSON files to SQLite
   */
  private async convertJSONToSQLite(jsonPath: string, outputPath: string): Promise<DatabaseConversionResult> {
    try {
      const jsonContent = await readFile(jsonPath, 'utf-8');
      const jsonData = JSON.parse(jsonContent);

      let sqlStatements = '';

      if (Array.isArray(jsonData)) {
        // Handle array of objects (like MongoDB documents)
        if (jsonData.length > 0) {
          const firstItem = jsonData[0];
          const tableName = 'documents';
          const columns = Object.keys(firstItem);

          // Create table
          sqlStatements += `CREATE TABLE ${tableName} (\n`;
          sqlStatements += columns.map(col => `  ${col} TEXT`).join(',\n');
          sqlStatements += '\n);\n\n';

          // Insert data
          for (const item of jsonData) {
            const values = columns.map(col => {
              const value = item[col];
              return typeof value === 'string' ? `'${value.replace(/'/g, "''")}'` : String(value);
            }).join(', ');

            sqlStatements += `INSERT INTO ${tableName} (${columns.join(', ')}) VALUES (${values});\n`;
          }
        }
      } else if (typeof jsonData === 'object') {
        // Handle single object with multiple collections
        for (const [collectionName, collectionData] of Object.entries(jsonData)) {
          if (Array.isArray(collectionData)) {
            const columns = collectionData.length > 0 ? Object.keys(collectionData[0]) : [];

            if (columns.length > 0) {
              // Create table
              sqlStatements += `CREATE TABLE ${collectionName} (\n`;
              sqlStatements += columns.map(col => `  ${col} TEXT`).join(',\n');
              sqlStatements += '\n);\n\n';

              // Insert data
              for (const item of collectionData) {
                const values = columns.map(col => {
                  const value = item[col];
                  return typeof value === 'string' ? `'${value.replace(/'/g, "''")}'` : String(value);
                }).join(', ');

                sqlStatements += `INSERT INTO ${collectionName} (${columns.join(', ')}) VALUES (${values});\n`;
              }
              sqlStatements += '\n';
            }
          }
        }
      }

      // Write SQL file
      await writeFile(outputPath, sqlStatements);

      return {
        success: true,
        convertedPath: outputPath,
        metadata: {
          tables: await this.extractTableInfo(sqlStatements)
        }
      };
    } catch (error) {
      return {
        success: false,
        error: `JSON conversion failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * Convert CSV files to SQLite
   */
  private async convertCSVToSQLite(csvPath: string, outputPath: string): Promise<DatabaseConversionResult> {
    try {
      const csvContent = await readFile(csvPath, 'utf-8');
      const lines = csvContent.split('\n').filter(line => line.trim());

      if (lines.length === 0) {
        return {
          success: false,
          error: 'Empty CSV file'
        };
      }

      // Parse CSV (simple implementation - assumes no quoted commas)
      const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
      const tableName = 'csv_data';

      let sqlStatements = `CREATE TABLE ${tableName} (\n`;
      sqlStatements += headers.map(header => `  ${header} TEXT`).join(',\n');
      sqlStatements += '\n);\n\n';

      // Insert data
      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',').map(v => v.trim().replace(/"/g, ''));
        const sqlValues = values.map(v => `'${v.replace(/'/g, "''")}'`).join(', ');
        sqlStatements += `INSERT INTO ${tableName} (${headers.join(', ')}) VALUES (${sqlValues});\n`;
      }

      // Write SQL file
      await writeFile(outputPath, sqlStatements);

      return {
        success: true,
        convertedPath: outputPath,
        metadata: {
          tables: await this.extractTableInfo(sqlStatements)
        }
      };
    } catch (error) {
      return {
        success: false,
        error: `CSV conversion failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * Convert SQL scripts to SQLite-compatible format
   */
  private async convertSQLScriptToSQLite(sqlPath: string, outputPath: string): Promise<DatabaseConversionResult> {
    try {
      const sqlContent = await readFile(sqlPath, 'utf-8');

      // Basic SQL standardization for SQLite compatibility
      let convertedSQL = sqlContent
        .replace(/DELIMITER\s+.*?$/gm, '') // Remove MySQL delimiters
        .replace(/SET\s+.*?;/gi, '') // Remove SET statements
        .replace(/START\s+TRANSACTION/gi, 'BEGIN TRANSACTION')
        .replace(/COMMIT\s+TRANSACTION/gi, 'COMMIT')
        .replace(/ROLLBACK\s+TRANSACTION/gi, 'ROLLBACK');

      await writeFile(outputPath, convertedSQL);

      return {
        success: true,
        convertedPath: outputPath,
        metadata: {
          tables: await this.extractTableInfo(convertedSQL)
        }
      };
    } catch (error) {
      return {
        success: false,
        error: `SQL script conversion failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * Handle direct conversion (copy and validate)
   */
  private async handleDirectConversion(originalPath: string, outputPath: string): Promise<DatabaseConversionResult> {
    try {
      // Copy file
      const fileContent = await readFile(originalPath);
      await writeFile(outputPath, fileContent);

      return {
        success: true,
        convertedPath: outputPath
      };
    } catch (error) {
      return {
        success: false,
        error: `Direct conversion failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * Convert BSON to SQLite (placeholder - requires mongodb library)
   */
  private async convertBSONToSQLite(bsonPath: string, outputPath: string): Promise<DatabaseConversionResult> {
    // This would require the mongodb library to be installed
    // For now, return not implemented
    return {
      success: false,
      error: 'BSON conversion requires mongodb library - not implemented yet'
    };
  }

  /**
   * Attempt to run an external shell command and return stdout. Logs stderr but does not throw on non-zero exit unless fatal.
   */
  private async runExternal(command: string, cwd?: string): Promise<{ success: boolean; stdout?: string; stderr?: string }> {
    try {
      const { stdout, stderr } = await execAsync(command, { cwd });
      if (stderr) {
        console.warn(`⚠️ External command stderr: ${stderr}`);
      }
      return { success: true, stdout, stderr };
    } catch (error: any) {
      console.error(`❌ External command failed: ${command}`, error);
      return { success: false, stderr: error?.message };
    }
  }

  /**
   * Extract table information from SQL content
   */
  private async extractTableInfo(sqlContent: string): Promise<any[]> {
    const tables: any[] = [];

    // Extract CREATE TABLE statements
    const createTableRegex = /CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?(\w+)/gi;
    let match;

    while ((match = createTableRegex.exec(sqlContent)) !== null) {
      const tableName = match[1];
      tables.push({
        name: tableName,
        type: 'table'
      });
    }

    return tables;
  }

  /**
   * Get file statistics
   */
  private async getFileStats(filePath: string): Promise<{ size: number } | null> {
    try {
      const stats = await import('fs/promises');
      const fileStats = await stats.stat(filePath);
      return { size: fileStats.size };
    } catch (error) {
      console.error(`Error getting file stats for ${filePath}:`, error);
      return null;
    }
  }

  /**
   * Generate output path for converted database
   */
  private async generateOutputPath(originalPath: string, targetFormat: string): Promise<string> {
    const dir = path.dirname(originalPath);
    const baseName = path.basename(originalPath, path.extname(originalPath));
    const timestamp = Date.now();

    return path.join(dir, `${baseName}_converted_${timestamp}.${targetFormat}`);
  }

  /**
   * Clean up converted files if needed
   */
  async cleanupConvertedFile(filePath: string): Promise<void> {
    try {
      await unlink(filePath);
      console.log(`🗑️ Cleaned up converted file: ${filePath}`);
    } catch (error) {
      console.warn(`⚠️ Could not clean up converted file ${filePath}:`, error);
    }
  }
}

export default DatabaseConverter;
