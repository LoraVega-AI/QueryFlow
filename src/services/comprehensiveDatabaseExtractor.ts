// Comprehensive Database Extraction Service
// Extracts complete database metadata, constraints, indexes, migrations, and ORM mappings

import { DatabaseSchema, Table, Column, TableIndex, Migration, MigrationHistory, ORMModel } from '@/types/database';
import { readdir, readFile, stat } from 'fs/promises';
import path from 'path';

export class ComprehensiveDatabaseExtractor {
  
  /**
   * Enhanced SQLite database extraction with comprehensive metadata
   */
  static async extractSQLiteDatabase(filePath: string): Promise<any> {
    console.log('🔍 Starting comprehensive SQLite extraction:', filePath);
    console.log('📂 Database file path:', filePath);
    
    try {
      const sqlite3 = require('sqlite3');
      const { open } = require('sqlite');
      
      console.log('📚 Opening SQLite database connection...');
      const db = await open({
        filename: filePath,
        driver: sqlite3.Database
      });
      console.log('✅ Database connection established successfully');
      
      try {
        // Get database metadata
        console.log('🔍 Extracting database metadata...');
        const databaseInfo = await this.extractDatabaseInfo(db);
        console.log(`📊 Database metadata extracted: ${databaseInfo.type} v${databaseInfo.version}`);
        console.log(`📊 Encoding: ${databaseInfo.encoding}, Page size: ${databaseInfo.pageSize} bytes`);
        
        // Get all tables
        console.log('🔍 Querying for database tables...');
        const tables = await db.all("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'");
        console.log(`📊 Found ${tables.length} tables for comprehensive extraction`);
        console.log(`📊 Tables: ${tables.map(t => t.name).join(', ')}`);
        
        const enhancedTables = [];
        
        for (const table of tables) {
          console.log(`\n🔬 Comprehensively analyzing table: ${table.name}`);
          
          // Enhanced table extraction
          console.log(`📋 Extracting schema for table: ${table.name}`);
          const enhancedTable = await this.extractTableComprehensive(db, table.name);
          console.log(`✅ Table ${table.name} extracted with ${enhancedTable.columns.length} columns`);
          
          if (enhancedTable.data && enhancedTable.data.length > 0) {
            console.log(`📊 Extracted ${enhancedTable.data.length} data rows from ${table.name}`);
          }
          
          enhancedTables.push(enhancedTable);
        }
      
      // Extract indexes
      console.log('\n🔍 Extracting database indexes...');
      const indexes = await this.extractIndexes(db);
      console.log(`📊 Extracted ${indexes.length} indexes`);
      
      // Extract triggers
      console.log('\n🔍 Extracting database triggers...');
      const triggers = await this.extractTriggers(db);
      console.log(`📊 Extracted ${triggers.length} triggers`);
      
      // Extract views
      console.log('\n🔍 Extracting database views...');
      const views = await this.extractViews(db);
      console.log(`📊 Extracted ${views.length} views`);
      
      // Get PRAGMA information
      console.log('\n🔍 Extracting additional PRAGMA information...');
      const pragmaInfo = await this.extractPragmaInfo(db);
      console.log('✅ PRAGMA information extracted successfully');
      
      console.log('\n📚 Closing database connection...');
      await db.close();
      console.log('✅ Database connection closed successfully');
      
      // Calculate extraction statistics
      const totalColumns = enhancedTables.reduce((sum, table) => sum + table.columns.length, 0);
      const totalDataRows = enhancedTables.reduce((sum, table) => sum + (table.data?.length || 0), 0);
      
      console.log('\n✅ SQLite extraction completed successfully!');
      console.log(`📊 Extraction summary:
      - Tables: ${enhancedTables.length}
      - Columns: ${totalColumns}
      - Indexes: ${indexes.length}
      - Triggers: ${triggers.length}
      - Views: ${views.length}
      - Data Rows: ${totalDataRows}
      `);
      
      return {
        tables: enhancedTables,
        indexes,
        triggers,
        views,
        databaseInfo: {
          ...databaseInfo,
          ...pragmaInfo
        }
      };
      
    } catch (error) {
      console.error('❌ Error during SQLite extraction:', error);
      try {
        await db.close();
        console.log('📚 Database connection closed after error');
      } catch (closeError) {
        console.error('❌ Error closing database connection:', closeError);
      }
      throw error;
    }
    } catch (outerError) {
      console.error('❌ Error opening SQLite database:', outerError);
      throw outerError;
    }
  }
  
  /**
   * Extract comprehensive table information
   */
  static async extractTableComprehensive(db: any, tableName: string): Promise<any> {
    console.log(`🔍 Extracting comprehensive information for table: ${tableName}`);
    
    try {
      // Get table schema
      console.log(`📋 Getting column information for table: ${tableName}`);
      const tableInfo = await db.all(`PRAGMA table_info(${tableName})`);
      console.log(`📊 Found ${tableInfo.length} columns in table ${tableName}`);
      
      // Get foreign keys
      console.log(`🔗 Getting foreign keys for table: ${tableName}`);
      const foreignKeys = await db.all(`PRAGMA foreign_key_list(${tableName})`);
      console.log(`📊 Found ${foreignKeys.length} foreign keys in table ${tableName}`);
      
      // Get indexes
      console.log(`📈 Getting indexes for table: ${tableName}`);
      const indexes = await db.all(`PRAGMA index_list(${tableName})`);
      console.log(`📊 Found ${indexes.length} indexes for table ${tableName}`);
      
      // Get detailed index information
      console.log(`🔬 Analyzing index details for table: ${tableName}`);
      const detailedIndexes = [];
      for (const index of indexes) {
        console.log(`📈 Analyzing index: ${index.name}`);
        const indexInfo = await db.all(`PRAGMA index_info(${index.name})`);
        console.log(`📊 Index ${index.name} has ${indexInfo.length} columns, unique: ${index.unique === 1 ? 'yes' : 'no'}`);
        
        detailedIndexes.push({
          id: `idx_${index.name}`,
          name: index.name,
          unique: index.unique === 1,
          columns: indexInfo.map((col: any) => col.name),
          type: 'btree', // SQLite default
          partial: index.partial === 1,
          origin: index.origin, // c=CREATE INDEX, u=UNIQUE, pk=PRIMARY KEY
          createdAt: new Date()
        });
      }
      
      // Get table statistics
      console.log(`📊 Getting row count for table: ${tableName}`);
      const rowCount = await db.get(`SELECT COUNT(*) as count FROM ${tableName}`);
      console.log(`📊 Table ${tableName} has ${rowCount.count} rows`);
      
      // Get table creation SQL
      console.log(`📝 Getting creation SQL for table: ${tableName}`);
      const createSql = await db.get(`SELECT sql FROM sqlite_master WHERE type='table' AND name='${tableName}'`);
      
      // Extract data (limited for performance)
      const dataLimit = Math.min(rowCount.count, 1000);
      console.log(`📋 Extracting sample data from table: ${tableName} (limit: ${dataLimit} rows)`);
      const tableData = await db.all(`SELECT * FROM ${tableName} LIMIT ${dataLimit}`);
      console.log(`📊 Extracted ${tableData.length} sample rows from ${tableName}`);
    
    // Enhanced columns with comprehensive metadata
    const enhancedColumns = tableInfo.map((col: any, index: number) => {
      const fk = foreignKeys.find((fk: any) => fk.from === col.name);
      
      // Calculate column statistics from data
      const columnValues = tableData.map((row: any) => row[col.name]);
      const nullValues = columnValues.filter(v => v === null || v === undefined).length;
      const nonNullValues = columnValues.filter(v => v !== null && v !== undefined);
      const distinctValues = new Set(nonNullValues).size;
      
      return {
        id: `col_${col.name}_${index}`,
        name: col.name,
        type: col.type,
        nullable: !col.notnull,
        primaryKey: col.pk === 1,
        defaultValue: col.dflt_value,
        foreignKey: fk ? {
          tableId: fk.table,
          columnId: fk.to,
          constraintName: `fk_${tableName}_${col.name}`,
          relationshipType: 'one-to-many',
          onDelete: fk.on_delete,
          onUpdate: fk.on_update,
          enabled: true,
          validated: true
        } : undefined,
        unique: col.pk === 1, // Primary keys are unique
        autoIncrement: col.type.toUpperCase().includes('INTEGER') && col.pk === 1,
        constraints: {
          autoIncrement: col.type.toUpperCase().includes('INTEGER') && col.pk === 1,
          autoIncrementStart: col.pk === 1 ? 1 : undefined,
          autoIncrementIncrement: col.pk === 1 ? 1 : undefined,
          enabled: true
        },
        statistics: {
          distinctValues,
          nullValues,
          avgLength: nonNullValues.length > 0 ? 
            nonNullValues.reduce((sum, val) => sum + String(val).length, 0) / nonNullValues.length : 0,
          minValue: nonNullValues.length > 0 ? Math.min(...nonNullValues.filter(v => typeof v === 'number')) : undefined,
          maxValue: nonNullValues.length > 0 ? Math.max(...nonNullValues.filter(v => typeof v === 'number')) : undefined
        }
      };
    });
    
    console.log(`✅ Table ${tableName} extraction completed successfully`);
    
    return {
      id: `table_${tableName}_${Date.now()}`,
      name: tableName,
      columns: enhancedColumns,
      data: tableData,
      indexes: detailedIndexes,
      statistics: {
        rowCount: rowCount.count,
        dataLength: JSON.stringify(tableData).length,
        createTime: new Date(), // SQLite doesn't store creation time
        updateTime: new Date()
      },
      createSql: createSql?.sql,
      position: { x: 0, y: 0 },
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    } catch (error) {
      console.error(`❌ Error extracting table ${tableName}:`, error);
      
      // Return minimal table structure to avoid complete failure
      return {
        id: `table_${tableName}_${Date.now()}`,
        name: tableName,
        columns: [],
        data: [],
        indexes: [],
        statistics: {
          rowCount: 0,
          dataLength: 0,
          createTime: new Date(),
          updateTime: new Date()
        },
        error: `Failed to extract table: ${error.message}`,
        position: { x: 0, y: 0 },
        createdAt: new Date(),
        updatedAt: new Date()
      };
    }
  }
  
  /**
   * Extract database-level information
   */
  static async extractDatabaseInfo(db: any): Promise<any> {
    const version = await db.get('SELECT sqlite_version() as version');
    const pageSize = await db.get('PRAGMA page_size');
    const encoding = await db.get('PRAGMA encoding');
    const userVersion = await db.get('PRAGMA user_version');
    const journalMode = await db.get('PRAGMA journal_mode');
    const synchronous = await db.get('PRAGMA synchronous');
    const foreignKeys = await db.get('PRAGMA foreign_keys');
    const tempStore = await db.get('PRAGMA temp_store');
    const cacheSize = await db.get('PRAGMA cache_size');
    const autoVacuum = await db.get('PRAGMA auto_vacuum');
    
    // Get database file size if possible
    let fileSize = 0;
    try {
      const stats = await db.get('PRAGMA page_count');
      fileSize = stats.page_count * pageSize.page_size;
    } catch (error) {
      console.warn('Could not get database file size:', error);
    }
    
    return {
      type: 'sqlite',
      version: version.version,
      encoding: encoding.encoding,
      pageSize: pageSize.page_size,
      userVersion: userVersion.user_version,
      journalMode: journalMode.journal_mode,
      synchronous: synchronous.synchronous,
      foreignKeys: foreignKeys.foreign_keys === 1,
      tempStore: tempStore.temp_store,
      cacheSize: cacheSize.cache_size,
      autoVacuum: autoVacuum.auto_vacuum,
      size: fileSize,
      createdAt: new Date(),
      updatedAt: new Date(),
      statistics: {
        pageCount: await db.get('PRAGMA page_count').then(r => r.page_count).catch(() => 0),
        freelistCount: await db.get('PRAGMA freelist_count').then(r => r.freelist_count).catch(() => 0),
        integrityCheck: await db.all('PRAGMA integrity_check').then(rows => 
          rows.length === 1 && rows[0].integrity_check === 'ok' ? 'ok' : 'error'
        ).catch(() => 'unknown')
      }
    };
  }
  
  /**
   * Extract comprehensive index information with enhanced metadata
   */
  static async extractIndexes(db: any): Promise<TableIndex[]> {
    console.log('🔍 Extracting comprehensive index information');
    
    // Get all indexes from sqlite_master
    const indexes = await db.all(`
      SELECT name, tbl_name, sql, type, unique_flag 
      FROM sqlite_master 
      WHERE type='index' 
      AND name NOT LIKE 'sqlite_%'
    `);
    
    console.log(`📊 Found ${indexes.length} indexes to analyze`);
    
    const enhancedIndexes = [];
    
    // Process each index with enhanced metadata
    for (const index of indexes) {
      try {
        console.log(`🔬 Analyzing index: ${index.name} on table ${index.tbl_name}`);
        
        // Get detailed index column information
        const indexInfo = await db.all(`PRAGMA index_info(${index.name})`);
        
        // Determine if this is a primary key, unique constraint, or regular index
        let origin = 'index';
        if (index.name.startsWith('sqlite_autoindex_')) {
          origin = 'pk'; // Likely a primary key index
        } else if (index.name.startsWith('idx_') || index.name.startsWith('index_')) {
          origin = 'index';
        } else if (index.unique_flag === 1) {
          origin = 'u'; // Unique constraint
        }
        
        // Determine if this is a composite index (multiple columns)
        const isComposite = indexInfo.length > 1;
        
        // Extract table schema to get more column details
        const tableInfo = await db.all(`PRAGMA table_info(${index.tbl_name})`);
        
        // Match index columns with table columns for more details
        const enhancedColumns = indexInfo.map((idxCol: any) => {
          const tableCol = tableInfo.find((col: any) => col.name === idxCol.name);
          return {
            name: idxCol.name,
            position: idxCol.seqno,
            ...(tableCol && {
              type: tableCol.type,
              notNull: tableCol.notnull === 1
            })
          };
        });
        
        // Analyze SQL definition for additional information
        const sqlAnalysis = this.analyzeIndexSQL(index.sql);
        
        // Check if this is a partial index (has WHERE clause)
        const isPartial = index.sql?.includes('WHERE ') || false;
        
        // Extract WHERE clause if present
        let whereClause = null;
        if (isPartial && index.sql) {
          const whereMatch = index.sql.match(/WHERE\s+(.*?)(?:\)$|$)/i);
          whereClause = whereMatch ? whereMatch[1].trim() : null;
        }
        
        // Create enhanced index object
        const enhancedIndex: TableIndex = {
          id: `idx_${index.name}`,
          name: index.name,
          tableName: index.tbl_name,
          columns: indexInfo.map((col: any) => col.name),
          columnDetails: enhancedColumns,
          unique: index.unique_flag === 1,
          type: 'btree', // SQLite uses B-tree indexes by default
          origin,
          composite: isComposite,
          partial: isPartial,
          expression: index.sql,
          whereClause,
          createdAt: new Date(),
          // Additional metadata from SQL analysis
          ...sqlAnalysis
        };
        
        enhancedIndexes.push(enhancedIndex);
        console.log(`✅ Enhanced index extracted: ${index.name} (${enhancedIndex.composite ? 'composite' : 'single'}, ${enhancedIndex.unique ? 'unique' : 'non-unique'})`);
        
      } catch (error) {
        console.warn(`❌ Could not extract info for index ${index.name}:`, error);
      }
    }
    
    // Also extract implicit primary key indexes that might not be in sqlite_master
    try {
      // Get all tables
      const tables = await db.all("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'");
      
      for (const table of tables) {
        // Get primary key info
        const tableInfo = await db.all(`PRAGMA table_info(${table.name})`);
        const pkColumns = tableInfo.filter((col: any) => col.pk === 1).map((col: any) => col.name);
        
        // If we have primary key columns but didn't find them in the explicit indexes, add an implicit PK index
        if (pkColumns.length > 0) {
          const existingPkIndex = enhancedIndexes.some(idx => 
            idx.tableName === table.name && 
            idx.origin === 'pk' &&
            pkColumns.every(pkCol => idx.columns.includes(pkCol))
          );
          
          if (!existingPkIndex) {
            console.log(`📌 Adding implicit primary key index for table ${table.name}`);
            
            enhancedIndexes.push({
              id: `idx_pk_${table.name}`,
              name: `pk_${table.name}`,
              tableName: table.name,
              columns: pkColumns,
              columnDetails: pkColumns.map(name => {
                const col = tableInfo.find((c: any) => c.name === name);
                return {
                  name,
                  position: col?.cid || 0,
                  type: col?.type,
                  notNull: col?.notnull === 1
                };
              }),
              unique: true,
              type: 'btree',
              origin: 'pk',
              composite: pkColumns.length > 1,
              partial: false,
              expression: `PRIMARY KEY (${pkColumns.join(', ')})`,
              createdAt: new Date()
            });
          }
        }
      }
    } catch (error) {
      console.warn('❌ Error extracting implicit primary key indexes:', error);
    }
    
    console.log(`📊 Total enhanced indexes extracted: ${enhancedIndexes.length}`);
    return enhancedIndexes;
  }
  
  /**
   * Analyze index SQL definition for additional metadata
   */
  static analyzeIndexSQL(sql: string | null): Partial<TableIndex> {
    if (!sql) return {};
    
    const metadata: Partial<TableIndex> = {};
    
    // Check for covering index (includes all needed columns)
    if (sql.includes('COVERING') || sql.includes('INCLUDE')) {
      metadata.covering = true;
    }
    
    // Check for clustered index
    if (sql.includes('CLUSTERED')) {
      metadata.clustered = true;
    }
    
    // Extract method if specified
    const methodMatch = sql.match(/USING\s+(\w+)/i);
    if (methodMatch) {
      metadata.method = methodMatch[1];
    } else {
      metadata.method = 'btree'; // Default for SQLite
    }
    
    // Extract condition (WHERE clause)
    const conditionMatch = sql.match(/WHERE\s+(.*?)(?:\)$|$)/i);
    if (conditionMatch) {
      metadata.condition = conditionMatch[1].trim();
    }
    
    return metadata;
  }
  
  /**
   * Extract triggers
   */
  static async extractTriggers(db: any): Promise<any[]> {
    const triggers = await db.all(`
      SELECT name, tbl_name, sql 
      FROM sqlite_master 
      WHERE type='trigger'
    `);
    
    return triggers.map((trigger: any) => ({
      id: `trigger_${trigger.name}`,
      name: trigger.name,
      tableName: trigger.tbl_name,
      sql: trigger.sql,
      event: this.extractTriggerEvent(trigger.sql),
      timing: this.extractTriggerTiming(trigger.sql),
      action: trigger.sql
    }));
  }
  
  /**
   * Extract views
   */
  static async extractViews(db: any): Promise<any[]> {
    const views = await db.all(`
      SELECT name, sql 
      FROM sqlite_master 
      WHERE type='view'
    `);
    
    return views.map((view: any) => ({
      name: view.name,
      definition: view.sql,
      columns: [], // Would need to parse SQL to extract columns
      dependencies: [], // Would need to parse SQL to extract dependencies
      materialized: false // SQLite doesn't have materialized views
    }));
  }
  
  /**
   * Extract PRAGMA information
   */
  static async extractPragmaInfo(db: any): Promise<any> {
    const pragmas = [
      'cache_size', 'journal_mode', 'synchronous', 'temp_store',
      'foreign_keys', 'auto_vacuum', 'incremental_vacuum'
    ];
    
    const pragmaInfo: any = {};
    for (const pragma of pragmas) {
      try {
        const result = await db.get(`PRAGMA ${pragma}`);
        pragmaInfo[pragma] = result[pragma];
      } catch (error) {
        console.warn(`Could not get PRAGMA ${pragma}:`, error);
      }
    }
    
    return pragmaInfo;
  }
  
  /**
   * Extract migration history from project files
   */
  static async extractMigrationHistory(projectPath: string): Promise<MigrationHistory | null> {
    console.log('🔍 Searching for migration files in:', projectPath);
    
    // Enhanced migration directories list with Django-specific paths
    const migrationDirs = [
      'migrations', 'db/migrate', 'database/migrations', 
      'alembic/versions', 'migration', 'migrate',
      // Django-specific migration directories
      'app/migrations', 'core/migrations', 'api/migrations',
      'users/migrations', 'accounts/migrations', 'blog/migrations',
      'posts/migrations', 'comments/migrations', 'products/migrations',
      // Look for migrations folders in any app directory
      'app', 'apps', 'src', 'django_project'
    ];
    
    // First try direct migration directories
    for (const dir of migrationDirs) {
      const migrationPath = path.join(projectPath, dir);
      try {
        const stats = await stat(migrationPath);
        if (stats.isDirectory()) {
          console.log(`📁 Found potential migration directory: ${migrationPath}`);
          
          // For Django, check if this is a migrations directory or if it contains migrations subdirectories
          if (dir === 'migrations' || dir.endsWith('/migrations')) {
            console.log(`📁 Direct migration directory found: ${migrationPath}`);
            const migrations = await this.parseMigrationDirectory(migrationPath);
            if (migrations && migrations.migrations.length > 0) {
              console.log(`✅ Found ${migrations.migrations.length} migrations in ${migrationPath}`);
              return migrations;
            }
          } else {
            // Check if this directory contains migrations subdirectories (Django apps structure)
            const subDirs = await readdir(migrationPath);
            for (const subDir of subDirs) {
              const subDirPath = path.join(migrationPath, subDir);
              const migrationsPath = path.join(subDirPath, 'migrations');
              
              try {
                const subDirStats = await stat(migrationsPath);
                if (subDirStats.isDirectory()) {
                  console.log(`📁 Found Django app migrations directory: ${migrationsPath}`);
                  const migrations = await this.parseMigrationDirectory(migrationsPath);
                  if (migrations && migrations.migrations.length > 0) {
                    console.log(`✅ Found ${migrations.migrations.length} migrations in ${migrationsPath}`);
                    return migrations;
                  }
                }
              } catch (error) {
                // Migrations subdirectory doesn't exist, continue
              }
            }
          }
        }
      } catch (error) {
        // Directory doesn't exist, continue
        console.log(`❌ Directory not found: ${migrationPath}`);
      }
    }
    
    return null;
  }
  
  /**
   * Parse migration directory
   */
  static async parseMigrationDirectory(migrationPath: string): Promise<MigrationHistory> {
    const files = await readdir(migrationPath);
    
    // Enhanced filter to better detect Django migrations (like 0001_initial.py)
    const migrationFiles = files.filter(file => {
      // Django migration pattern (digits_name.py)
      if (/^\d{4}_[a-z0-9_]+\.py$/i.test(file)) return true;
      
      // Standard migration file extensions
      return file.endsWith('.sql') || file.endsWith('.py') || file.endsWith('.js') || 
             file.endsWith('.ts') || file.endsWith('.php') || file.endsWith('.rb');
    });
    
    console.log(`📄 Found ${migrationFiles.length} migration files in ${migrationPath}`);
    console.log(`📄 Migration files: ${migrationFiles.slice(0, 5).join(', ')}${migrationFiles.length > 5 ? '...' : ''}`);
    
    const migrations: Migration[] = [];
    
    for (const file of migrationFiles) {
      const filePath = path.join(migrationPath, file);
      const content = await readFile(filePath, 'utf-8');
      const stats = await stat(filePath);
      
      // Detect framework first to use framework-specific extraction
      const framework = this.detectMigrationFramework(file, content);
      console.log(`📋 Processing ${framework} migration: ${file}`);
      
      // Framework-specific version extraction
      let version;
      switch (framework) {
        case 'django':
          version = this.extractDjangoMigrationVersion(file);
          break;
        case 'laravel':
          version = this.extractLaravelMigrationVersion(file);
          break;
        case 'rails':
          version = this.extractRailsMigrationVersion(file);
          break;
        case 'typeorm':
          version = this.extractTypeORMMigrationVersion(file);
          break;
        default:
          version = this.extractVersionFromFilename(file);
      }
      console.log(`📊 Migration version: ${version}`);
      
      // Framework-specific name extraction
      let name;
      switch (framework) {
        case 'django':
          name = this.extractDjangoMigrationName(file);
          break;
        case 'laravel':
          name = this.extractLaravelMigrationName(file);
          break;
        case 'rails':
          name = this.extractRailsMigrationName(file);
          break;
        case 'typeorm':
          name = this.extractTypeORMMigrationName(file);
          break;
        default:
          name = this.extractNameFromFilename(file);
      }
      console.log(`📊 Migration name: ${name}`);
      
      // Framework-specific description extraction
      let description;
      switch (framework) {
        case 'django':
          description = this.extractDjangoMigrationDescription(content);
          break;
        case 'laravel':
          description = this.extractLaravelMigrationDescription(content);
          break;
        case 'rails':
          description = this.extractRailsMigrationDescription(content);
          break;
        case 'typeorm':
          description = this.extractTypeORMMigrationDescription(content);
          break;
        default:
          description = this.extractDescriptionFromContent(content);
      }
      console.log(`📊 Migration description: ${description}`);
      
      // Framework-specific status detection
      const status = this.detectMigrationStatus(file, content, framework);
      console.log(`📊 Migration status: ${status}`);
      
      const migration: Migration = {
        id: `migration_${file}`,
        version,
        name,
        filename: file,
        framework,
        up: content,
        status,
        executedAt: stats.mtime,
        description,
        // Add Django-specific fields if applicable
        ...(framework === 'django' && {
          dependencies: this.extractDjangoDependencies(content),
          operations: this.extractDjangoOperations(content)
        })
      };
      
      migrations.push(migration);
    }
    
    return {
      migrations: migrations.sort((a, b) => a.version.localeCompare(b.version)),
      framework: migrations[0]?.framework || 'unknown',
      migrationsPath: migrationPath,
      lastExecuted: migrations[migrations.length - 1]?.executedAt
    };
  }
  
  /**
   * Extract ORM models from source code
   */
  static async extractORMModels(projectPath: string): Promise<ORMModel[]> {
    console.log('🔍 Searching for ORM models in:', projectPath);
    
    // Enhanced model directories list with Django-specific paths
    const modelDirs = [
      'models', 'app/models', 'src/models', 'database/models',
      'app/Models', 'src/entities', 'entities',
      // Django-specific model files
      'models.py', 'app/models.py', 'core/models.py',
      // Django app directories
      'app', 'apps', 'src', 'core', 'api',
      'users', 'accounts', 'blog', 'posts', 'products'
    ];
    
    const ormModels: ORMModel[] = [];
    
    // First check for direct model files (Django style)
    for (const modelFile of ['models.py', 'app/models.py', 'core/models.py']) {
      const modelFilePath = path.join(projectPath, modelFile);
      try {
        const stats = await stat(modelFilePath);
        if (stats.isFile()) {
          console.log(`📄 Found Django models file: ${modelFilePath}`);
          const content = await readFile(modelFilePath, 'utf-8');
          const djangoModels = this.parseDjangoModelsFile(modelFilePath, content);
          if (djangoModels.length > 0) {
            console.log(`✅ Extracted ${djangoModels.length} Django models from ${modelFilePath}`);
            ormModels.push(...djangoModels);
          }
        }
      } catch (error) {
        // File doesn't exist, continue
      }
    }
    
    // Then check for model directories
    for (const dir of modelDirs) {
      const modelPath = path.join(projectPath, dir);
      try {
        const stats = await stat(modelPath);
        if (stats.isDirectory()) {
          console.log(`📁 Found potential model directory: ${modelPath}`);
          
          // Check if this is a Django app directory with models.py
          const djangoModelPath = path.join(modelPath, 'models.py');
          try {
            const modelStats = await stat(djangoModelPath);
            if (modelStats.isFile()) {
              console.log(`📄 Found Django app models file: ${djangoModelPath}`);
              const content = await readFile(djangoModelPath, 'utf-8');
              const djangoModels = this.parseDjangoModelsFile(djangoModelPath, content);
              if (djangoModels.length > 0) {
                console.log(`✅ Extracted ${djangoModels.length} Django models from ${djangoModelPath}`);
                ormModels.push(...djangoModels);
              }
              continue; // Skip regular directory parsing for this Django app
            }
          } catch (error) {
            // models.py doesn't exist, continue with regular directory parsing
          }
          
          // Regular model directory parsing
          const models = await this.parseModelDirectory(modelPath);
          if (models.length > 0) {
            console.log(`✅ Extracted ${models.length} models from ${modelPath}`);
            ormModels.push(...models);
          }
        }
      } catch (error) {
        // Directory doesn't exist, continue
        console.log(`❌ Directory not found: ${modelPath}`);
      }
    }
    
    // Also check for Prisma schema
    const prismaSchema = path.join(projectPath, 'prisma', 'schema.prisma');
    try {
      const stats = await stat(prismaSchema);
      if (stats.isFile()) {
        console.log('📄 Found Prisma schema');
        const prismaModels = await this.parsePrismaSchema(prismaSchema);
        ormModels.push(...prismaModels);
      }
    } catch (error) {
      // Prisma schema doesn't exist
    }
    
    return ormModels;
  }
  
  /**
   * Parse Django models file with multiple model classes
   */
  static parseDjangoModelsFile(filePath: string, content: string): ORMModel[] {
    console.log(`🐍 Parsing Django models file: ${filePath}`);
    
    const models: ORMModel[] = [];
    
    // Find all model classes in the file
    const modelClassPattern = /class\s+(\w+)\s*\(\s*models\.Model\s*\)\s*:/g;
    let match;
    
    while ((match = modelClassPattern.exec(content)) !== null) {
      const modelName = match[1];
      console.log(`🔍 Found Django model class: ${modelName}`);
      
      // Parse the model
      const model = this.parseORMModel(path.basename(filePath), content);
      
      if (model) {
        // Override the model name from the class name
        model.name = modelName;
        models.push(model);
      }
    }
    
    return models;
  }
  
  /**
   * Parse model directory for ORM models
   */
  static async parseModelDirectory(modelPath: string): Promise<ORMModel[]> {
    const files = await readdir(modelPath);
    const modelFiles = files.filter(file => 
      file.endsWith('.js') || file.endsWith('.ts') || 
      file.endsWith('.py') || file.endsWith('.php') || file.endsWith('.rb')
    );
    
    const models: ORMModel[] = [];
    
    for (const file of modelFiles) {
      const filePath = path.join(modelPath, file);
      const content = await readFile(filePath, 'utf-8');
      
      const model = this.parseORMModel(file, content);
      if (model) {
        models.push(model);
      }
    }
    
    return models;
  }
  
  /**
   * Parse individual ORM model file
   */
  static parseORMModel(filename: string, content: string): ORMModel | null {
    console.log(`🔍 Parsing ORM model file: ${filename}`);
    
    // Enhanced framework detection
    const framework = this.detectORMFramework(filename, content);
    if (!framework) {
      console.log(`❌ No ORM framework detected in ${filename}`);
      return null;
    }
    
    console.log(`✅ Detected ORM framework: ${framework}`);
    
    // Enhanced model name extraction based on framework
    const modelName = this.extractModelName(filename, content, framework);
    
    // Enhanced table name extraction based on framework
    const tableName = this.extractTableName(content, framework);
    
    // Framework-specific parsing
    let modelData: Partial<ORMModel> = {};
    
    if (framework === 'django') {
      modelData = this.parseDjangoModel(filename, content, modelName);
    }
    
    // Create the model object with all extracted data
    const model: ORMModel = {
      id: `model_${modelName}`,
      name: modelName,
      filename,
      framework,
      tableName,
      sourceCode: content,
      relationships: this.extractRelationships(content, framework),
      properties: this.extractProperties(content, framework),
      validations: this.extractValidations(content, framework),
      hooks: this.extractHooks(content, framework),
      scopes: this.extractScopes(content, framework),
      indexes: this.extractORMIndexes(content, framework),
      metadata: {
        extractedAt: new Date(),
        framework,
        filename,
        filePath: filename
      },
      ...modelData // Add framework-specific data
    };
    
    console.log(`✅ Extracted ORM model: ${modelName} (${framework})`);
    console.log(`   Properties: ${model.properties?.length || 0}`);
    console.log(`   Relationships: ${model.relationships?.length || 0}`);
    console.log(`   Validations: ${model.validations?.length || 0}`);
    
    return model;
  }
  
  /**
   * Parse Django model
   */
  static parseDjangoModel(filename: string, content: string, modelName: string): Partial<ORMModel> {
    console.log(`🐍 Parsing Django model: ${modelName}`);
    
    // Extract the model class definition
    const modelClassMatch = content.match(new RegExp(`class\\s+${modelName}\\s*\\(\\s*models\\.Model\\s*\\)\\s*:([^}]+)(?:class|$)`, 's'));
    if (!modelClassMatch) {
      console.log(`❌ Could not find Django model class definition for ${modelName}`);
      return {};
    }
    
    const modelBody = modelClassMatch[1];
    
    // Extract table name from Meta class
    let tableName;
    const metaMatch = modelBody.match(/class\s+Meta\s*:\s*([^}]+?)(?:class|$)/s);
    if (metaMatch) {
      const metaBody = metaMatch[1];
      const dbTableMatch = metaBody.match(/db_table\s*=\s*['"](.*?)['"]/);
      if (dbTableMatch) {
        tableName = dbTableMatch[1];
      }
    }
    
    // Extract properties (fields)
    const properties = this.extractDjangoProperties(modelBody);
    
    // Extract relationships
    const relationships = this.extractDjangoRelationships(modelBody, modelName);
    
    // Extract validations
    const validations = this.extractDjangoValidations(modelBody);
    
    // Extract methods
    const methods = this.extractDjangoMethods(modelBody);
    
    // Extract managers
    const managers = this.extractDjangoManagers(modelBody);
    
    return {
      tableName,
      properties,
      relationships,
      validations,
      methods,
      managers
    };
  }
  
  /**
   * Extract model properties from source code
   */
  static extractProperties(content: string, framework: string): any[] {
    const properties: any[] = [];
    
    // Basic property extraction based on framework
    if (framework === 'sequelize') {
      console.log('🔍 Extracting Sequelize model properties');
      
      // Extract from Sequelize model definitions
      const modelDefineMatch = content.match(/define\s*\(\s*['"`]([^'"`]+)['"`]\s*,\s*\{([^}]+)\}/gs);
      if (modelDefineMatch) {
        console.log('✅ Found Sequelize model definition');
        
        const fieldsContent = modelDefineMatch[0];
        
        // More comprehensive field regex to capture more attributes
        const fieldRegex = /(\w+)\s*:\s*\{([^}]+)\}/g;
        let match;
        
        while ((match = fieldRegex.exec(fieldsContent)) !== null) {
          const fieldName = match[1];
          const fieldAttrs = match[2];
          
          console.log(`📊 Found Sequelize field: ${fieldName}`);
          
          // Extract type
          const typeMatch = fieldAttrs.match(/type\s*:\s*(?:DataTypes|Sequelize)\.(\w+)(?:\(([^)]*)\))?/);
          const fieldType = typeMatch ? typeMatch[1].toLowerCase() : 'string';
          const typeParams = typeMatch && typeMatch[2] ? typeMatch[2] : null;
          
          // Extract allowNull
          const allowNullMatch = fieldAttrs.match(/allowNull\s*:\s*(true|false)/);
          const required = allowNullMatch ? allowNullMatch[1] === 'false' : false;
          
          // Extract primaryKey
          const primaryKeyMatch = fieldAttrs.match(/primaryKey\s*:\s*(true|false)/);
          const primaryKey = primaryKeyMatch ? primaryKeyMatch[1] === 'true' : false;
          
          // Extract autoIncrement
          const autoIncrementMatch = fieldAttrs.match(/autoIncrement\s*:\s*(true|false)/);
          const autoIncrement = autoIncrementMatch ? autoIncrementMatch[1] === 'true' : false;
          
          // Extract unique
          const uniqueMatch = fieldAttrs.match(/unique\s*:\s*(true|false)/);
          const unique = uniqueMatch ? uniqueMatch[1] === 'true' : false;
          
          // Extract defaultValue
          const defaultValueMatch = fieldAttrs.match(/defaultValue\s*:\s*(['"`]([^'"`]+)['"`]|([^,]+))/);
          const defaultValue = defaultValueMatch ? (defaultValueMatch[2] || defaultValueMatch[3]) : undefined;
          
          // Extract references (foreign key)
          const referencesMatch = fieldAttrs.match(/references\s*:\s*\{\s*model\s*:\s*['"`]([^'"`]+)['"`]\s*,\s*key\s*:\s*['"`]([^'"`]+)['"`]/);
          const foreignKey = referencesMatch ? {
            tableId: referencesMatch[1],
            columnId: referencesMatch[2],
            onDelete: fieldAttrs.includes('onDelete: CASCADE') ? 'CASCADE' : 'RESTRICT',
            onUpdate: fieldAttrs.includes('onUpdate: CASCADE') ? 'CASCADE' : 'RESTRICT'
          } : undefined;
          
          // Create the property object with all extracted attributes
          properties.push({
            name: fieldName,
            type: fieldType,
            typeParams,
            required,
            primaryKey,
            autoIncrement,
            unique,
            defaultValue,
            foreignKey,
            // Additional metadata
            indexed: fieldAttrs.includes('index:') || fieldAttrs.includes('unique:')
          });
          
          console.log(`✅ Extracted field ${fieldName} (${fieldType}), required: ${required}, primaryKey: ${primaryKey}`);
        }
      } else {
        console.log('⚠️ No Sequelize model definition found');
      }
    } else if (framework === 'mongoose') {
      console.log('🔍 Extracting Mongoose schema properties');
      
      // Extract schema definition
      const schemaMatch = content.match(/new\s+(?:mongoose\.Schema|Schema)\s*\(\s*\{([^}]+)\}/s);
      if (!schemaMatch) {
        console.log('⚠️ No Mongoose schema definition found');
        return properties;
      }
      
      const schemaContent = schemaMatch[1];
      console.log('✅ Found Mongoose schema definition');
      
      // Extract field definitions
      // Handle various field definition patterns:
      // 1. name: String
      // 2. name: { type: String }
      // 3. name: { type: String, required: true }
      // 4. name: [String]
      // 5. name: [{ type: String }]
      
      // Simple field pattern: fieldName: SchemaType
      const simpleFieldRegex = /(\w+)\s*:\s*(String|Number|Boolean|Date|Buffer|Map|Array|ObjectId|Mixed|Schema\.Types\.\w+)(?:\s*,|\s*$)/g;
      let match;
      
      while ((match = simpleFieldRegex.exec(schemaContent)) !== null) {
        const fieldName = match[1];
        const fieldType = match[2];
        
        // Skip reference fields which will be handled by relationship extraction
        if (fieldName !== '_id' && !schemaContent.includes(`${fieldName}: { type: ${fieldType}, ref:`)) {
          console.log(`📊 Found Mongoose simple field: ${fieldName} (${fieldType})`);
          
          properties.push({
            name: fieldName,
            type: fieldType.toLowerCase(),
            required: false, // Simple fields aren't required by default
            isArray: false
          });
        }
      }
      
      // Complex field pattern: fieldName: { type: SchemaType, ...options }
      const complexFieldRegex = /(\w+)\s*:\s*\{\s*type\s*:\s*(String|Number|Boolean|Date|Buffer|Map|Array|ObjectId|Mixed|Schema\.Types\.\w+)(?:\s*,|\s*\}|\s*$)([^}]*)\}/g;
      
      while ((match = complexFieldRegex.exec(schemaContent)) !== null) {
        const fieldName = match[1];
        const fieldType = match[2];
        const fieldOptions = match[3] || '';
        
        // Skip reference fields which will be handled by relationship extraction
        if (fieldName !== '_id' && !fieldOptions.includes('ref:')) {
          console.log(`📊 Found Mongoose complex field: ${fieldName} (${fieldType})`);
          
          // Extract field options
          const requiredMatch = fieldOptions.match(/required\s*:\s*(true|false|\{[^}]+\})/);
          const required = requiredMatch ? requiredMatch[1] === 'true' || requiredMatch[1].includes('{') : false;
          
          const uniqueMatch = fieldOptions.match(/unique\s*:\s*(true|false)/);
          const unique = uniqueMatch ? uniqueMatch[1] === 'true' : false;
          
          const defaultMatch = fieldOptions.match(/default\s*:\s*(['"`]([^'"`]+)['"`]|([^,}]+))/);
          const defaultValue = defaultMatch ? (defaultMatch[2] || defaultMatch[3]) : undefined;
          
          const indexMatch = fieldOptions.match(/index\s*:\s*(true|false)/);
          const indexed = indexMatch ? indexMatch[1] === 'true' : false;
          
          properties.push({
            name: fieldName,
            type: fieldType.toLowerCase(),
            required,
            unique,
            defaultValue,
            indexed,
            isArray: false
          });
          
          console.log(`✅ Extracted field ${fieldName} (${fieldType}), required: ${required}, unique: ${unique}`);
        }
      }
      
      // Array field pattern: fieldName: [SchemaType] or fieldName: [{ type: SchemaType }]
      const arrayFieldRegex = /(\w+)\s*:\s*\[\s*(?:\{\s*type\s*:\s*(String|Number|Boolean|Date|Buffer|Map|Array|ObjectId|Mixed|Schema\.Types\.\w+)|\s*(String|Number|Boolean|Date|Buffer|Map|Array|ObjectId|Mixed|Schema\.Types\.\w+))\s*(?:,|\]|\}|\s*$)([^}]*)/g;
      
      while ((match = arrayFieldRegex.exec(schemaContent)) !== null) {
        const fieldName = match[1];
        const fieldType = match[2] || match[3];
        const fieldOptions = match[4] || '';
        
        // Skip reference fields which will be handled by relationship extraction
        if (fieldName !== '_id' && !fieldOptions.includes('ref:')) {
          console.log(`📊 Found Mongoose array field: ${fieldName} ([${fieldType}])`);
          
          // Extract field options
          const requiredMatch = fieldOptions.match(/required\s*:\s*(true|false|\{[^}]+\})/);
          const required = requiredMatch ? requiredMatch[1] === 'true' || requiredMatch[1].includes('{') : false;
          
          properties.push({
            name: fieldName,
            type: fieldType.toLowerCase(),
            required,
            isArray: true
          });
          
          console.log(`✅ Extracted array field ${fieldName} ([${fieldType}]), required: ${required}`);
        }
      }
    } else if (framework === 'prisma') {
      // Extract from Prisma model fields
      const fieldRegex = /(\w+)\s+(\w+)(\?)?/g;
      let match;
      while ((match = fieldRegex.exec(content)) !== null) {
        properties.push({
          name: match[1],
          type: match[2],
          required: !match[3]
        });
      }
    } else if (framework === 'typeorm') {
      // Extract from TypeORM entity properties
      const fieldRegex = /@Column\([^)]*\)\s*(\w+)\s*:\s*(\w+)/g;
      let match;
      while ((match = fieldRegex.exec(content)) !== null) {
        properties.push({
          name: match[1],
          type: match[2].toLowerCase(),
          required: true
        });
      }
    }
    
    return properties;
  }

  /**
   * Extract model validations from source code
   */
  static extractValidations(content: string, framework: string): any[] {
    const validations: any[] = [];
    
    if (framework === 'sequelize') {
      // Extract Sequelize validations
      const validationRegex = /validate\s*:\s*\{([^}]+)\}/g;
      let match;
      while ((match = validationRegex.exec(content)) !== null) {
        const validationContent = match[1];
        const fieldRegex = /(\w+)\s*:\s*\{([^}]+)\}/g;
        let fieldMatch;
        while ((fieldMatch = fieldRegex.exec(validationContent)) !== null) {
          validations.push({
            field: fieldMatch[1],
            type: 'custom',
            message: 'Validation rule',
            options: {}
          });
        }
      }
    } else if (framework === 'laravel') {
      // Extract Laravel validation rules
      const validationRegex = /protected\s+\$rules\s*=\s*\[([^\]]+)\]/g;
      let match;
      while ((match = validationRegex.exec(content)) !== null) {
        const rulesContent = match[1];
        const fieldRegex = /'(\w+)'\s*=>\s*'([^']+)'/g;
        let fieldMatch;
        while ((fieldMatch = fieldRegex.exec(rulesContent)) !== null) {
          validations.push({
            field: fieldMatch[1],
            type: 'laravel',
            message: 'Validation rule',
            options: { rules: fieldMatch[2] }
          });
        }
      }
    }
    
    return validations;
  }

  /**
   * Extract model hooks from source code
   */
  static extractHooks(content: string, framework: string): any[] {
    const hooks: any[] = [];
    
    if (framework === 'sequelize') {
      // Extract Sequelize hooks
      const hookRegex = /(beforeCreate|afterCreate|beforeUpdate|afterUpdate|beforeDestroy|afterDestroy)\s*:\s*function[^{]*\{([^}]+)\}/g;
      let match;
      while ((match = hookRegex.exec(content)) !== null) {
        hooks.push({
          name: match[1],
          type: 'lifecycle',
          function: match[2].trim()
        });
      }
    } else if (framework === 'laravel') {
      // Extract Laravel model events
      const hookRegex = /protected\s+static\s+function\s+(boot|creating|created|updating|updated|deleting|deleted)\([^)]*\)\s*\{([^}]+)\}/g;
      let match;
      while ((match = hookRegex.exec(content)) !== null) {
        hooks.push({
          name: match[1],
          type: 'lifecycle',
          function: match[2].trim()
        });
      }
    }
    
    return hooks;
  }

  /**
   * Extract model scopes from source code
   */
  static extractScopes(content: string, framework: string): any[] {
    const scopes: any[] = [];
    
    if (framework === 'laravel') {
      // Extract Laravel scopes
      const scopeRegex = /public\s+function\s+scope(\w+)\([^)]*\)\s*\{([^}]+)\}/g;
      let match;
      while ((match = scopeRegex.exec(content)) !== null) {
        scopes.push({
          name: match[1],
          type: 'local',
          function: match[2].trim()
        });
      }
    }
    
    return scopes;
  }

  /**
   * Extract ORM indexes from source code
   */
  static extractORMIndexes(content: string, framework: string): any[] {
    const indexes: any[] = [];
    
    if (framework === 'sequelize') {
      // Extract Sequelize indexes
      const indexRegex = /indexes\s*:\s*\[([^\]]+)\]/g;
      let match;
      while ((match = indexRegex.exec(content)) !== null) {
        const indexContent = match[1];
        const fieldRegex = /fields\s*:\s*\[([^\]]+)\]/g;
        let fieldMatch;
        while ((fieldMatch = fieldRegex.exec(indexContent)) !== null) {
          indexes.push({
            name: 'index_' + Date.now(),
            fields: fieldMatch[1].split(',').map((f: string) => f.trim().replace(/['"]/g, '')),
            unique: indexContent.includes('unique: true')
          });
        }
      }
    }
    
    return indexes;
  }

  /**
   * Parse Prisma schema
   */
  static async parsePrismaSchema(schemaPath: string): Promise<ORMModel[]> {
    console.log(`🔍 Parsing Prisma schema file: ${schemaPath}`);
    
    try {
      const content = await readFile(schemaPath, 'utf-8');
      console.log(`📄 Prisma schema file loaded: ${path.basename(schemaPath)}`);
      
      const models: ORMModel[] = [];
      
      // Enhanced Prisma model parsing
      const modelRegex = /model\s+(\w+)\s*{([^}]+)}/g;
      let match;
      
      while ((match = modelRegex.exec(content)) !== null) {
        const modelName = match[1];
        const modelContent = match[2];
        
        console.log(`📋 Found Prisma model: ${modelName}`);
        
        // Extract fields
        const fieldRegex = /\s*(\w+)\s+(\w+)(\?)?(\s+@[^)]+)?/g;
        const properties: any[] = [];
        const relationships: any[] = [];
        const validations: any[] = [];
        const indexes: any[] = [];
        
        // Extract model-level attributes (@@index, @@unique, etc.)
        const modelAttributeRegex = /@@(\w+)\(\[([^\]]+)\](?:,\s*{([^}]+)})?\)/g;
        let modelAttributeMatch;
        
        while ((modelAttributeMatch = modelAttributeRegex.exec(modelContent)) !== null) {
          const attributeType = modelAttributeMatch[1];
          const fields = modelAttributeMatch[2].split(',').map(f => f.trim().replace(/['"]/g, ''));
          const options = modelAttributeMatch[3] || '';
          
          console.log(`📊 Found model attribute: ${attributeType} on fields [${fields.join(', ')}]`);
          
          if (attributeType === 'index') {
            indexes.push({
              name: `idx_${modelName}_${fields.join('_')}`,
              fields,
              unique: options.includes('unique: true'),
              type: 'btree'
            });
          } else if (attributeType === 'unique') {
            validations.push({
              type: 'uniqueTogether',
              fields,
              message: `Fields ${fields.join(', ')} must be unique together`
            });
          }
        }
        
        let fieldMatch;
        while ((fieldMatch = fieldRegex.exec(modelContent)) !== null) {
          const fieldName = fieldMatch[1];
          const fieldType = fieldMatch[2];
          const isOptional = !!fieldMatch[3];
          const attributes = fieldMatch[4] || '';
          
          console.log(`📊 Found field: ${fieldName} (${fieldType}${isOptional ? '?' : ''})`);
          
          // Check if this is a relationship field
          if (fieldType.match(/^[A-Z]/)) {
            // This is likely a relation to another model
            console.log(`🔗 Found relationship: ${fieldName} -> ${fieldType}`);
            
            // Parse relation attributes
            const relationMatch = attributes.match(/@relation\(([^)]+)\)/);
            let relationDetails = {};
            
            if (relationMatch) {
              const relationAttrs = relationMatch[1];
              
              // Extract fields mapping
              const fieldsMatch = relationAttrs.match(/fields:\s*\[([^\]]+)\]/);
              const referencesMatch = relationAttrs.match(/references:\s*\[([^\]]+)\]/);
              
              if (fieldsMatch && referencesMatch) {
                const fields = fieldsMatch[1].split(',').map(f => f.trim().replace(/['"]/g, ''));
                const references = referencesMatch[1].split(',').map(f => f.trim().replace(/['"]/g, ''));
                
                relationDetails = {
                  fields,
                  references,
                  onDelete: relationAttrs.includes('onDelete: Cascade') ? 'CASCADE' : 'RESTRICT',
                  onUpdate: relationAttrs.includes('onUpdate: Cascade') ? 'CASCADE' : 'RESTRICT'
                };
              }
            }
            
            // Determine relationship type
            let relationType = 'hasOne';
            if (attributes.includes('[]')) {
              relationType = 'hasMany';
            } else if (attributes.includes('@relation')) {
              relationType = attributes.includes('fields:') ? 'belongsTo' : 'hasOne';
            }
            
            relationships.push({
              name: fieldName,
              type: relationType,
              target: fieldType,
              foreignKey: `${fieldName}Id`,
              ...relationDetails
            });
          } else {
            // Regular field
            const fieldProps: any = {
              name: fieldName,
              type: fieldType,
              required: !isOptional
            };
            
            // Extract field-level attributes
            if (attributes) {
              // @id attribute
              if (attributes.includes('@id')) {
                fieldProps.primaryKey = true;
                fieldProps.autoIncrement = fieldType === 'Int';
              }
              
              // @unique attribute
              if (attributes.includes('@unique')) {
                fieldProps.unique = true;
                validations.push({
                  type: 'unique',
                  field: fieldName,
                  message: `${fieldName} must be unique`
                });
              }
              
              // @default attribute
              const defaultMatch = attributes.match(/@default\(([^)]+)\)/);
              if (defaultMatch) {
                fieldProps.defaultValue = defaultMatch[1];
              }
              
              // @map attribute
              const mapMatch = attributes.match(/@map\("([^"]+)"\)/);
              if (mapMatch) {
                fieldProps.mappedName = mapMatch[1];
              }
            }
            
            properties.push(fieldProps);
          }
        }
        
        // Extract table name from @@map attribute if present
        const mapMatch = modelContent.match(/@@map\("([^"]+)"\)/);
        const tableName = mapMatch ? mapMatch[1] : modelName.toLowerCase();
        
        models.push({
          id: `prisma_model_${modelName}`,
          name: modelName,
          filename: path.basename(schemaPath),
          framework: 'prisma',
          tableName,
          sourceCode: match[0],
          properties,
          relationships,
          validations,
          hooks: [],
          scopes: [],
          indexes,
          metadata: {
            extractedAt: new Date(),
            framework: 'prisma',
            filePath: schemaPath
          }
        });
        
        console.log(`✅ Extracted Prisma model ${modelName} with ${properties.length} properties and ${relationships.length} relationships`);
      }
      
      console.log(`📊 Total Prisma models extracted: ${models.length}`);
      return models;
    } catch (error) {
      console.error(`❌ Error parsing Prisma schema: ${error}`);
      return [];
    }
  }
  }
  
  // Helper methods for parsing
  static extractVersionFromFilename(filename: string): string {
    const match = filename.match(/(\d{4}_\d{2}_\d{2}_\d{6}|\d{14}|\d+)/);
    return match ? match[1] : filename;
  }
  
  static extractNameFromFilename(filename: string): string {
    return filename.replace(/^\d+_/, '').replace(/\.[^.]+$/, '').replace(/_/g, ' ');
  }
  
  static detectMigrationFramework(filename: string, content: string): Migration['framework'] {
    console.log(`🔍 Detecting migration framework for file: ${filename}`);
    
    // Enhanced Django migration detection
    if (filename.endsWith('.py')) {
      // Django migration patterns
      if (/^\d{4}_[a-z0-9_]+\.py$/i.test(filename)) {
        console.log('✅ Detected Django migration from filename pattern');
        return 'django';
      }
      if (content.includes('from django.db import migrations')) {
        console.log('✅ Detected Django migration from import statement');
        return 'django';
      }
      if (content.includes('class Migration(migrations.Migration)')) {
        console.log('✅ Detected Django migration from class definition');
        return 'django';
      }
      if (content.includes('operations = [')) {
        console.log('✅ Detected Django migration from operations list');
        return 'django';
      }
      if (content.includes('dependencies = [')) {
        console.log('✅ Detected Django migration from dependencies list');
        return 'django';
      }
      
      // Other Python frameworks
      if (content.includes('alembic')) {
        console.log('✅ Detected Alembic migration');
        return 'alembic';
      }
    }
    
    // Enhanced Laravel detection
    if (filename.endsWith('.php')) {
      // Laravel migration patterns
      if (/^\d{4}_\d{2}_\d{2}_\d{6}_[a-z0-9_]+\.php$/i.test(filename)) {
        console.log('✅ Detected Laravel migration from filename pattern');
        return 'laravel';
      }
      if (content.includes('use Illuminate\\Database\\Migrations\\Migration')) {
        console.log('✅ Detected Laravel migration from import statement');
        return 'laravel';
      }
      if (content.includes('use Illuminate\\Database\\Schema\\Blueprint')) {
        console.log('✅ Detected Laravel migration from Blueprint import');
        return 'laravel';
      }
      if (content.includes('Schema::create') || content.includes('Schema::table')) {
        console.log('✅ Detected Laravel migration from Schema usage');
        return 'laravel';
      }
      if (content.includes('public function up()') && content.includes('public function down()')) {
        console.log('✅ Detected Laravel migration from up/down methods');
        return 'laravel';
      }
      
      console.log('✅ Assuming Laravel migration based on .php extension');
      return 'laravel';
    }
    
    // Rails detection
    if (filename.endsWith('.rb')) {
      console.log('✅ Detected Rails migration from .rb extension');
      return 'rails';
    }
    
    // JavaScript/TypeScript frameworks
    if (filename.endsWith('.js') || filename.endsWith('.ts')) {
      if (content.includes('typeorm')) {
        console.log('✅ Detected TypeORM migration');
        return 'typeorm';
      }
      if (content.includes('sequelize')) {
        console.log('✅ Detected Sequelize migration');
        return 'sequelize';
      }
      if (content.includes('prisma')) {
        console.log('✅ Detected Prisma migration');
        return 'prisma';
      }
      
      // Default for JS/TS
      console.log('✅ Assuming Sequelize migration based on .js/.ts extension');
      return 'sequelize';
    }
    
    // Default based on file extension
    if (filename.endsWith('.py')) {
      console.log('✅ Assuming Django migration based on .py extension');
      return 'django';
    }
    
    console.log('⚠️ Could not determine migration framework, defaulting to Sequelize');
    return 'sequelize'; // default for other types
  }
  
  /**
   * Extract Django migration version from filename (e.g., 0001_initial.py -> 0001)
   */
  static extractDjangoMigrationVersion(filename: string): string {
    const match = filename.match(/^(\d{4})_/);
    return match ? match[1] : '0000';
  }
  
  /**
   * Extract Django migration name from filename (e.g., 0001_initial.py -> initial)
   */
  static extractDjangoMigrationName(filename: string): string {
    const match = filename.match(/^\d{4}_([a-z0-9_]+)\.py$/i);
    return match ? match[1].replace(/_/g, ' ') : filename.replace(/\.py$/, '');
  }
  
  /**
   * Extract Laravel migration version from filename (e.g., 2023_01_01_123456_create_users_table.php -> 2023_01_01_123456)
   */
  static extractLaravelMigrationVersion(filename: string): string {
    const match = filename.match(/^(\d{4}_\d{2}_\d{2}_\d{6})_/);
    return match ? match[1] : '0000_00_00_000000';
  }
  
  /**
   * Extract Laravel migration name from filename (e.g., 2023_01_01_123456_create_users_table.php -> create users table)
   */
  static extractLaravelMigrationName(filename: string): string {
    const match = filename.match(/^\d{4}_\d{2}_\d{2}_\d{6}_([a-z0-9_]+)\.php$/i);
    return match ? match[1].replace(/_/g, ' ') : filename.replace(/\.php$/, '');
  }
  
  /**
   * Extract Laravel migration description from content
   */
  static extractLaravelMigrationDescription(content: string): string {
    // Try to extract the table name from Schema::create or Schema::table
    const schemaMatch = content.match(/Schema::(create|table)\s*\(\s*['"]([^'"]+)['"]/);
    if (schemaMatch) {
      const action = schemaMatch[1];
      const table = schemaMatch[2];
      return `${action === 'create' ? 'Create' : 'Modify'} ${table} table`;
    }
    
    // Try to find class docblock comment
    const docblockMatch = content.match(/\/\*\*\s*(.*?)\s*\*\//s);
    if (docblockMatch) {
      const docblock = docblockMatch[1].replace(/\s*\*\s*/g, ' ').trim();
      return docblock;
    }
    
    // Try to find single line comment
    const commentMatch = content.match(/\/\/\s*(.+)$/m);
    if (commentMatch) {
      return commentMatch[1].trim();
    }
    
    return 'Laravel migration';
  }
  
  /**
   * Extract Rails migration version from filename (e.g., 20230101123456_create_users.rb -> 20230101123456)
   */
  static extractRailsMigrationVersion(filename: string): string {
    const match = filename.match(/^(\d{14})_/);
    return match ? match[1] : '00000000000000';
  }
  
  /**
   * Extract Rails migration name from filename (e.g., 20230101123456_create_users.rb -> create users)
   */
  static extractRailsMigrationName(filename: string): string {
    const match = filename.match(/^\d{14}_([a-z0-9_]+)\.rb$/i);
    return match ? match[1].replace(/_/g, ' ') : filename.replace(/\.rb$/, '');
  }
  
  /**
   * Extract Rails migration description from content
   */
  static extractRailsMigrationDescription(content: string): string {
    // Try to extract the table name from create_table or change_table
    const tableMatch = content.match(/(create_table|change_table)\s*(?:\(|:)?\s*['":]([\w_]+)['"]/);
    if (tableMatch) {
      const action = tableMatch[1];
      const table = tableMatch[2];
      return `${action === 'create_table' ? 'Create' : 'Modify'} ${table} table`;
    }
    
    // Try to find class comment
    const classCommentMatch = content.match(/^\s*#\s*(.+)$/m);
    if (classCommentMatch) {
      return classCommentMatch[1].trim();
    }
    
    // Try to find any add_column or remove_column operations
    const columnMatch = content.match(/(add_column|remove_column)\s*(?:\(|:)?\s*['":]([\w_]+)['"]/);
    if (columnMatch) {
      const action = columnMatch[1];
      const table = columnMatch[2];
      return `${action === 'add_column' ? 'Add column to' : 'Remove column from'} ${table} table`;
    }
    
    return 'Rails migration';
  }
  
  /**
   * Extract TypeORM migration version from filename (e.g., 1609459200000-CreateUsers.ts -> 1609459200000)
   */
  static extractTypeORMMigrationVersion(filename: string): string {
    const match = filename.match(/^(\d+)-/);
    return match ? match[1] : '0';
  }
  
  /**
   * Extract TypeORM migration name from filename (e.g., 1609459200000-CreateUsers.ts -> Create Users)
   */
  static extractTypeORMMigrationName(filename: string): string {
    const match = filename.match(/^\d+-([A-Za-z0-9]+)\.(?:ts|js)$/);
    if (match) {
      // Convert camelCase or PascalCase to space-separated words
      return match[1].replace(/([A-Z])/g, ' $1').trim();
    }
    return filename.replace(/\.(ts|js)$/, '');
  }
  
  /**
   * Extract TypeORM migration description from content
   */
  static extractTypeORMMigrationDescription(content: string): string {
    // Try to extract the table name from createTable or dropTable
    const tableMatch = content.match(/(createTable|dropTable)\s*\(\s*['"]([^'"]+)['"]/);
    if (tableMatch) {
      const action = tableMatch[1];
      const table = tableMatch[2];
      return `${action === 'createTable' ? 'Create' : 'Drop'} ${table} table`;
    }
    
    // Try to find class comment
    const classCommentMatch = content.match(/\/\*\*\s*(.*?)\s*\*\//s);
    if (classCommentMatch) {
      const comment = classCommentMatch[1].replace(/\s*\*\s*/g, ' ').trim();
      return comment;
    }
    
    // Try to find any addColumn or dropColumn operations
    const columnMatch = content.match(/(addColumn|dropColumn)\s*\(\s*['"]([^'"]+)['"]/);
    if (columnMatch) {
      const action = columnMatch[1];
      const table = columnMatch[2];
      return `${action === 'addColumn' ? 'Add column to' : 'Drop column from'} ${table} table`;
    }
    
    // Try to find the class name which often describes the migration
    const classNameMatch = content.match(/export\s+class\s+(\w+)/);
    if (classNameMatch) {
      // Convert camelCase or PascalCase to space-separated words
      return classNameMatch[1].replace(/([A-Z])/g, ' $1').trim();
    }
    
    return 'TypeORM migration';
  }
  
  /**
   * Extract Django migration description from content
   */
  static extractDjangoMigrationDescription(content: string): string {
    // Try to find class docstring
    const docstringMatch = content.match(/class Migration.*?:\s*?(?:'''|""")(.*?)(?:'''|""")/s);
    if (docstringMatch) return docstringMatch[1].trim();
    
    // Try to find operations list for a summary
    const operationsMatch = content.match(/operations = \[(.*?)\]/s);
    if (operationsMatch) {
      const operations = operationsMatch[1].trim();
      // Return a summary of the first few operations
      const opLines = operations.split('\n').filter(line => line.trim()).slice(0, 3);
      return `Operations: ${opLines.map(line => line.trim()).join(', ')}${opLines.length < operations.split('\n').filter(line => line.trim()).length ? '...' : ''}`;
    }
    
    return 'Django migration';
  }
  
  /**
   * Extract Django migration dependencies
   */
  static extractDjangoDependencies(content: string): string[] {
    const dependenciesMatch = content.match(/dependencies\s*=\s*\[(.*?)\]/s);
    if (!dependenciesMatch) return [];
    
    const dependencies = dependenciesMatch[1];
    const depMatches = dependencies.match(/\((['"].*?['"])\s*,\s*(['"].*?['"])\)/g);
    
    if (!depMatches) return [];
    
    return depMatches.map(dep => {
      const match = dep.match(/\((['"].*?['"])\s*,\s*(['"].*?['"])\)/);
      if (match) return `${match[1].replace(/['"]/g, '')}.${match[2].replace(/['"]/g, '')}`;
      return dep;
    });
  }
  
  /**
   * Extract Django migration operations
   */
  static extractDjangoOperations(content: string): string[] {
    const operationsMatch = content.match(/operations\s*=\s*\[(.*?)\]/s);
    if (!operationsMatch) return [];
    
    const operations = operationsMatch[1];
    const opLines = operations.split('\n')
      .filter(line => line.trim())
      .map(line => line.trim())
      .filter(line => line !== ']' && line !== '[' && line !== ',');
    
    return opLines.map(line => {
      // Clean up the line to get just the operation name
      return line.replace(/^migrations\./, '').split('(')[0].trim();
    }).filter(op => op);
  }
  
  /**
   * Detect migration status based on content and framework
   */
  static detectMigrationStatus(filename: string, content: string, framework: string): Migration['status'] {
    console.log(`🔍 Detecting migration status for ${framework} migration: ${filename}`);
    
    // For Django, check for common patterns in pending migrations
    if (framework === 'django') {
      // If it's a special migration like __init__.py, mark as executed
      if (filename === '__init__.py') {
        console.log('✅ Detected Django __init__.py file, marking as executed');
        return 'executed';
      }
      
      // If it contains "This is an empty migration", it might be pending
      if (content.includes('# This is an empty migration')) {
        console.log('✅ Detected empty Django migration, marking as pending');
        return 'pending';
      }
      
      // Default to executed for Django migrations (since they're typically committed when executed)
      console.log('✅ Assuming Django migration is executed');
      return 'executed';
    }
    
    // For Laravel, check for common patterns in pending migrations
    if (framework === 'laravel') {
      // Check for commented out code which might indicate pending migration
      if (content.includes('// TODO:') || content.includes('// @todo')) {
        console.log('✅ Detected Laravel migration with TODOs, marking as pending');
        return 'pending';
      }
      
      // Check for empty up() method
      if (content.includes('public function up()') && 
          content.includes('public function up() {') && 
          !content.includes('Schema::')) {
        console.log('✅ Detected Laravel migration with empty up() method, marking as pending');
        return 'pending';
      }
      
      // Default to executed for Laravel migrations
      console.log('✅ Assuming Laravel migration is executed');
      return 'executed';
    }
    
    // For Rails migrations
    if (framework === 'rails') {
      // Check for commented out code which might indicate pending migration
      if (content.includes('# TODO:') || content.includes('# FIXME:')) {
        console.log('✅ Detected Rails migration with TODOs, marking as pending');
        return 'pending';
      }
      
      console.log('✅ Assuming Rails migration is executed');
      return 'executed';
    }
    
    // For TypeORM migrations
    if (framework === 'typeorm') {
      // Check for commented out code which might indicate pending migration
      if (content.includes('// TODO:') || content.includes('// @todo')) {
        console.log('✅ Detected TypeORM migration with TODOs, marking as pending');
        return 'pending';
      }
      
      console.log('✅ Assuming TypeORM migration is executed');
      return 'executed';
    }
    
    // Default status for other frameworks
    console.log('✅ Using default status (executed) for migration');
    return 'executed';
  }
  
  static extractDescriptionFromContent(content: string): string {
    const commentMatch = content.match(/(?:\/\*|#|--|\/\/)\s*(.+?)(?:\*\/|\n)/);
    return commentMatch ? commentMatch[1].trim() : '';
  }
  
  static detectORMFramework(filename: string, content: string): ORMModel['framework'] | null {
    // Enhanced Django detection
    if (filename.endsWith('.py')) {
      // Django model patterns
      if (content.includes('from django.db import models') && content.includes('models.Model')) return 'django';
      if (content.includes('class') && content.includes('models.Model')) return 'django';
      if (content.includes('models.CharField') || content.includes('models.IntegerField')) return 'django';
      if (content.includes('models.ForeignKey') || content.includes('models.OneToOneField')) return 'django';
      if (content.includes('models.ManyToManyField')) return 'django';
    }
    
    // Other frameworks
    if (content.includes('sequelize') || content.includes('Sequelize')) return 'sequelize';
    if (content.includes('typeorm') || content.includes('Entity')) return 'typeorm';
    if (content.includes('Model') && filename.endsWith('.php')) return 'laravel';
    if (content.includes('mongoose') || content.includes('Schema')) return 'mongoose';
    
    return null;
  }
  
  /**
   * Extract Django model properties (fields)
   */
  static extractDjangoProperties(modelBody: string): any[] {
    const properties = [];
    
    // Match field definitions like: name = models.CharField(max_length=100)
    const fieldPattern = /(\w+)\s*=\s*models\.(\w+)\(([^)]*)\)/g;
    let match;
    
    while ((match = fieldPattern.exec(modelBody)) !== null) {
      const fieldName = match[1];
      const fieldType = match[2];
      const fieldArgs = match[3];
      
      // Skip relationship fields which will be handled separately
      if (['ForeignKey', 'OneToOneField', 'ManyToManyField'].includes(fieldType)) {
        continue;
      }
      
      // Parse field arguments
      const args = this.parseDjangoFieldArgs(fieldArgs);
      
      properties.push({
        name: fieldName,
        type: fieldType,
        required: args.null === 'False' || args.blank === 'False',
        defaultValue: args.default,
        ...args
      });
    }
    
    return properties;
  }
  
  /**
   * Parse Django field arguments
   */
  static parseDjangoFieldArgs(argsString: string): Record<string, any> {
    const args: Record<string, any> = {};
    
    // Match key=value pairs, handling quoted strings and nested parentheses
    const argPattern = /(\w+)\s*=\s*(?:(['"])(.*?)\2|(\w+)|\{([^}]*)\}|\[([^\]]*)\]|\(([^)]*)\))/g;
    let match;
    
    while ((match = argPattern.exec(argsString)) !== null) {
      const key = match[1];
      // Use the first non-undefined value from the capture groups
      const value = match[3] || match[4] || match[5] || match[6] || match[7] || '';
      args[key] = value;
    }
    
    return args;
  }
  
  /**
   * Extract Django relationships
   */
  static extractDjangoRelationships(modelBody: string, modelName: string): any[] {
    const relationships = [];
    
    // Match relationship fields
    const relationPattern = /(\w+)\s*=\s*models\.(ForeignKey|OneToOneField|ManyToManyField)\(([^)]+)\)/g;
    let match;
    
    while ((match = relationPattern.exec(modelBody)) !== null) {
      const fieldName = match[1];
      const relationType = match[2];
      const relationArgs = match[3];
      
      // Extract target model
      let targetModel = '';
      const targetMatch = relationArgs.match(/['"]?(\w+)['"]?/);
      if (targetMatch) {
        targetModel = targetMatch[1];
      }
      
      // Determine relationship type
      let type = '';
      switch (relationType) {
        case 'ForeignKey':
          type = 'belongsTo';
          break;
        case 'OneToOneField':
          type = 'hasOne';
          break;
        case 'ManyToManyField':
          type = 'belongsToMany';
          break;
      }
      
      // Parse additional arguments
      const args = this.parseDjangoFieldArgs(relationArgs);
      
      relationships.push({
        name: fieldName,
        type,
        target: targetModel,
        foreignKey: fieldName + '_id',
        onDelete: args.on_delete?.replace('models.', '') || 'CASCADE',
        onUpdate: args.on_update || 'CASCADE',
        through: args.through?.replace(/['"]/g, ''),
        related_name: args.related_name?.replace(/['"]/g, '')
      });
    }
    
    return relationships;
  }
  
  /**
   * Extract Django validations
   */
  static extractDjangoValidations(modelBody: string): any[] {
    const validations = [];
    
    // Extract field-level validations from field arguments
    const fieldPattern = /(\w+)\s*=\s*models\.(\w+)\(([^)]*)\)/g;
    let match;
    
    while ((match = fieldPattern.exec(modelBody)) !== null) {
      const fieldName = match[1];
      const fieldArgs = match[3];
      
      // Parse field arguments
      const args = this.parseDjangoFieldArgs(fieldArgs);
      
      // Check for common validation arguments
      if (args.max_length) {
        validations.push({
          field: fieldName,
          type: 'maxLength',
          value: args.max_length,
          message: `${fieldName} cannot be longer than ${args.max_length} characters`
        });
      }
      
      if (args.min_length) {
        validations.push({
          field: fieldName,
          type: 'minLength',
          value: args.min_length,
          message: `${fieldName} must be at least ${args.min_length} characters`
        });
      }
      
      if (args.unique === 'True') {
        validations.push({
          field: fieldName,
          type: 'unique',
          message: `${fieldName} must be unique`
        });
      }
      
      if (args.null === 'False') {
        validations.push({
          field: fieldName,
          type: 'required',
          message: `${fieldName} is required`
        });
      }
      
      if (args.validators) {
        validations.push({
          field: fieldName,
          type: 'custom',
          value: args.validators,
          message: `Custom validation for ${fieldName}`
        });
      }
    }
    
    // Look for Meta class constraints
    const metaMatch = modelBody.match(/class\s+Meta\s*:\s*([^}]+?)(?:class|$)/s);
    if (metaMatch) {
      const metaBody = metaMatch[1];
      
      // Extract unique_together constraints
      const uniqueTogetherMatch = metaBody.match(/unique_together\s*=\s*\(\s*\(([^)]+)\)\s*\)/);
      if (uniqueTogetherMatch) {
        const fields = uniqueTogetherMatch[1].split(',').map(f => f.trim().replace(/['"]/g, ''));
        validations.push({
          field: fields.join(', '),
          type: 'uniqueTogether',
          value: fields,
          message: `Fields ${fields.join(', ')} must be unique together`
        });
      }
      
      // Extract constraints
      const constraintsMatch = metaBody.match(/constraints\s*=\s*\[(.*?)\]/s);
      if (constraintsMatch) {
        validations.push({
          field: 'model',
          type: 'constraints',
          value: constraintsMatch[1],
          message: `Model has custom constraints`
        });
      }
    }
    
    return validations;
  }
  
  /**
   * Extract Django methods
   */
  static extractDjangoMethods(modelBody: string): any[] {
    const methods = [];
    
    // Match method definitions
    const methodPattern = /def\s+(\w+)\s*\(self(?:,\s*[^)]+)?\)\s*:/g;
    let match;
    
    while ((match = methodPattern.exec(modelBody)) !== null) {
      const methodName = match[1];
      
      // Skip common built-in methods
      if (['__str__', '__repr__', 'save', 'delete', 'clean'].includes(methodName)) {
        continue;
      }
      
      methods.push({
        name: methodName,
        type: 'instance'
      });
    }
    
    // Match class methods
    const classMethodPattern = /@classmethod\s+def\s+(\w+)\s*\(cls(?:,\s*[^)]+)?\)\s*:/g;
    while ((match = classMethodPattern.exec(modelBody)) !== null) {
      methods.push({
        name: match[1],
        type: 'class'
      });
    }
    
    return methods;
  }
  
  /**
   * Extract Django managers
   */
  static extractDjangoManagers(modelBody: string): any[] {
    const managers = [];
    
    // Match manager assignments
    const managerPattern = /(\w+)\s*=\s*models\.Manager\(\)/g;
    let match;
    
    while ((match = managerPattern.exec(modelBody)) !== null) {
      managers.push({
        name: match[1]
      });
    }
    
    // Look for custom manager classes
    const customManagerPattern = /(\w+)\s*=\s*(\w+)Manager\(\)/g;
    while ((match = customManagerPattern.exec(modelBody)) !== null) {
      managers.push({
        name: match[1],
        customClass: match[2] + 'Manager'
      });
    }
    
    return managers;
  }
  
  static extractModelName(filename: string, content: string, framework: string): string {
    // Try to extract from class/model definition
    const classMatch = content.match(/class\s+(\w+)|model\s+(\w+)|const\s+(\w+)\s*=/);
    if (classMatch) {
      return classMatch[1] || classMatch[2] || classMatch[3];
    }
    
    // Fallback to filename
    return filename.replace(/\.[^.]+$/, '');
  }
  
  static extractTableName(content: string, framework: string): string | undefined {
    const tableMatches = [
      /tableName:\s*['"]([^'"]+)['"]/,
      /__tablename__\s*=\s*['"]([^'"]+)['"]/,
      /table\(['"]([^'"]+)['"]\)/
    ];
    
    for (const regex of tableMatches) {
      const match = content.match(regex);
      if (match) return match[1];
    }
    
    return undefined;
  }
  
  static extractRelationships(content: string, framework: string): any[] {
    const relationships: any[] = [];
    
    console.log(`🔍 Extracting relationships for framework: ${framework}`);
    
    if (framework === 'sequelize') {
      console.log('🔍 Extracting Sequelize relationships');
      
      // Look for associate function
      const associateMatch = content.match(/associate\s*\(\s*(\w+)\s*\)\s*{([^}]+)}/);
      if (associateMatch) {
        console.log('✅ Found Sequelize associate function');
        
        const models = associateMatch[1]; // Usually 'models'
        const associateContent = associateMatch[2];
        
        // Extract all relationship types
        const relationshipTypes = ['hasMany', 'belongsTo', 'hasOne', 'belongsToMany'];
        
        for (const type of relationshipTypes) {
          // Enhanced regex to capture more relationship details
          const regex = new RegExp(`${type}\\s*\\(\\s*${models}\\.([\\w.]+)\\s*(?:,\\s*\\{([^}]+)\\})?\\s*\\)`, 'g');
          let match;
          
          while ((match = regex.exec(associateContent)) !== null) {
            const target = match[1].trim();
            const options = match[2] || '';
            
            console.log(`🔗 Found ${type} relationship to ${target}`);
            
            // Extract foreign key
            const foreignKeyMatch = options.match(/foreignKey\s*:\s*['"]([^'"]+)['"]/);
            const foreignKey = foreignKeyMatch ? foreignKeyMatch[1] : 
              (type === 'belongsTo' ? `${target.toLowerCase()}Id` : undefined);
            
            // Extract as (alias)
            const asMatch = options.match(/as\s*:\s*['"]([^'"]+)['"]/);
            const as = asMatch ? asMatch[1] : undefined;
            
            // Extract through (for many-to-many)
            const throughMatch = options.match(/through\s*:\s*(?:['"]([^'"]+)['"]|${models}\.([^,]+))/);
            const through = throughMatch ? (throughMatch[1] || throughMatch[2]) : undefined;
            
            // Extract onDelete and onUpdate
            const onDeleteMatch = options.match(/onDelete\s*:\s*['"]([^'"]+)['"]/);
            const onDelete = onDeleteMatch ? onDeleteMatch[1] : 'CASCADE';
            
            const onUpdateMatch = options.match(/onUpdate\s*:\s*['"]([^'"]+)['"]/);
            const onUpdate = onUpdateMatch ? onUpdateMatch[1] : 'CASCADE';
            
            relationships.push({
              type,
              target,
              sourceField: foreignKey,
              targetField: type !== 'belongsTo' ? 'id' : undefined,
              as,
              through,
              onDelete,
              onUpdate
            });
            
            console.log(`✅ Extracted ${type} relationship: ${target} (${foreignKey || 'default key'})`);
          }
        }
      } else {
        console.log('⚠️ No Sequelize associate function found');
        
        // Fallback to looking for relationships outside associate function
        const relationshipTypes = ['hasMany', 'belongsTo', 'hasOne', 'belongsToMany'];
        
        for (const type of relationshipTypes) {
          const regex = new RegExp(`${type}\\s*\\(\\s*([^,)]+)`, 'g');
          let match;
          
          while ((match = regex.exec(content)) !== null) {
            const target = match[1].trim().replace(/['"]/g, '');
            
            console.log(`🔗 Found ${type} relationship to ${target} (outside associate function)`);
            
            relationships.push({
              type,
              target,
              sourceField: type === 'belongsTo' ? `${target.toLowerCase()}Id` : undefined,
              targetField: type !== 'belongsTo' ? 'id' : undefined
            });
          }
        }
      }
    } else if (framework === 'typeorm') {
      // Extract TypeORM relationships
      const relationTypes = ['@OneToMany', '@ManyToOne', '@OneToOne', '@ManyToMany'];
      
      for (const type of relationTypes) {
        const regex = new RegExp(`${type}\\s*\\(\\s*[()=>\\s]*([\\w.]+)\\s*,`, 'g');
        let match;
        
        while ((match = regex.exec(content)) !== null) {
          const target = match[1].trim();
          const relationshipType = type.replace('@', '').toLowerCase();
          
          console.log(`🔗 Found TypeORM ${relationshipType} relationship to ${target}`);
          
          relationships.push({
            type: relationshipType,
            target,
            sourceField: relationshipType.includes('manytoone') ? `${target.toLowerCase()}Id` : undefined
          });
        }
      }
    } else if (framework === 'django') {
      // Extract Django relationships
      const fieldTypes = {
        'ForeignKey': 'belongsTo',
        'OneToOneField': 'hasOne',
        'ManyToManyField': 'belongsToMany'
      };
      
      for (const [djangoType, relationType] of Object.entries(fieldTypes)) {
        const regex = new RegExp(`(\\w+)\\s*=\\s*models\\.${djangoType}\\s*\\(\\s*['"]?([\\w.]+)['"]?`, 'g');
        let match;
        
        while ((match = regex.exec(content)) !== null) {
          const fieldName = match[1];
          const target = match[2];
          
          console.log(`🔗 Found Django ${djangoType} relationship: ${fieldName} -> ${target}`);
          
          relationships.push({
            name: fieldName,
            type: relationType,
            target,
            foreignKey: djangoType === 'ForeignKey' ? `${fieldName}_id` : undefined
          });
        }
      }
    } else if (framework === 'mongoose') {
      console.log('🔍 Extracting Mongoose relationships');
      
      // Extract schema definition
      const schemaMatch = content.match(/new\s+(?:mongoose\.Schema|Schema)\s*\(\s*\{([^}]+)\}/s);
      if (!schemaMatch) {
        console.log('⚠️ No Mongoose schema definition found');
        return relationships;
      }
      
      const schemaContent = schemaMatch[1];
      console.log('✅ Found Mongoose schema definition');
      
      // Extract references (ObjectId with ref)
      const refRegex = /(\w+)\s*:\s*\{\s*(?:[^}]*,\s*)?type\s*:\s*(?:mongoose\.Schema\.Types\.ObjectId|Schema\.Types\.ObjectId)\s*,\s*ref\s*:\s*['"](\w+)['"]/g;
      let match;
      
      while ((match = refRegex.exec(schemaContent)) !== null) {
        const fieldName = match[1];
        const target = match[2];
        
        console.log(`🔗 Found Mongoose reference: ${fieldName} -> ${target}`);
        
        // Check if it's an array (hasMany) or single reference (hasOne)
        const isArray = schemaContent.includes(`${fieldName}: [{`) || 
                       schemaContent.includes(`${fieldName}: [{ type:`) ||
                       schemaContent.includes(`${fieldName}: { type: [`) ||
                       schemaContent.includes(`${fieldName}: [${match[2]}`);
        
        relationships.push({
          name: fieldName,
          type: isArray ? 'hasMany' : 'hasOne',
          target,
          foreignKey: `${fieldName}`
        });
        
        console.log(`✅ Extracted ${isArray ? 'hasMany' : 'hasOne'} relationship: ${fieldName} -> ${target}`);
      }
      
      // Extract virtual populate relationships
      const virtualRegex = /(\w+)\.virtual\s*\(\s*['"](\w+)['"]\s*,\s*\{[^}]*ref\s*:\s*['"](\w+)['"]/g;
      
      while ((match = virtualRegex.exec(content)) !== null) {
        const fieldName = match[2];
        const target = match[3];
        
        console.log(`🔗 Found Mongoose virtual populate: ${fieldName} -> ${target}`);
        
        // Determine if it's hasMany or hasOne based on localField and foreignField
        const virtualContent = content.substring(match.index, match.index + 300);
        const isMany = virtualContent.includes('justOne: false') || !virtualContent.includes('justOne');
        
        relationships.push({
          name: fieldName,
          type: isMany ? 'hasMany' : 'hasOne',
          target,
          virtual: true
        });
        
        console.log(`✅ Extracted virtual ${isMany ? 'hasMany' : 'hasOne'} relationship: ${fieldName} -> ${target}`);
      }
      
      // Look for populate() calls to infer relationships
      const populateRegex = /\.populate\s*\(\s*(?:\{[^}]*path\s*:\s*['"](\w+)['"]\s*(?:[^}]*ref\s*:\s*['"](\w+)['"])?|['"](\w+)['"]\s*)/g;
      
      while ((match = populateRegex.exec(content)) !== null) {
        const fieldName = match[1] || match[3];
        const target = match[2] || ''; // May not be specified in the populate call
        
        if (fieldName && !relationships.some(r => r.name === fieldName)) {
          console.log(`🔗 Found Mongoose populate call for: ${fieldName}`);
          
          relationships.push({
            name: fieldName,
            type: 'hasOne', // Default to hasOne, but could be hasMany
            target: target || 'Unknown', // Use target if specified, otherwise mark as unknown
            inferred: true
          });
          
          console.log(`✅ Inferred relationship from populate: ${fieldName}`);
        }
      }
    }
    
    console.log(`📊 Total relationships extracted: ${relationships.length}`);
    return relationships;
  }
  
  static extractTriggerEvent(sql: string): string {
    if (sql.includes('INSERT')) return 'insert';
    if (sql.includes('UPDATE')) return 'update';
    if (sql.includes('DELETE')) return 'delete';
    return 'unknown';
  }
  
  static extractTriggerTiming(sql: string): string {
    if (sql.includes('BEFORE')) return 'before';
    if (sql.includes('AFTER')) return 'after';
    if (sql.includes('INSTEAD OF')) return 'instead_of';
    return 'before';
  }
}
