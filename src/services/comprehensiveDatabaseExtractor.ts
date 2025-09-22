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
    
    const sqlite3 = require('sqlite3');
    const { open } = require('sqlite');
    
    const db = await open({
      filename: filePath,
      driver: sqlite3.Database
    });
    
    try {
      // Get database metadata
      const databaseInfo = await this.extractDatabaseInfo(db);
      
      // Get all tables
      const tables = await db.all("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'");
      console.log(`📊 Found ${tables.length} tables for comprehensive extraction`);
      
      const enhancedTables = [];
      
      for (const table of tables) {
        console.log(`🔬 Comprehensively analyzing table: ${table.name}`);
        
        // Enhanced table extraction
        const enhancedTable = await this.extractTableComprehensive(db, table.name);
        enhancedTables.push(enhancedTable);
      }
      
      // Extract indexes
      const indexes = await this.extractIndexes(db);
      
      // Extract triggers
      const triggers = await this.extractTriggers(db);
      
      // Extract views
      const views = await this.extractViews(db);
      
      // Get PRAGMA information
      const pragmaInfo = await this.extractPragmaInfo(db);
      
      await db.close();
      
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
      await db.close();
      throw error;
    }
  }
  
  /**
   * Extract comprehensive table information
   */
  static async extractTableComprehensive(db: any, tableName: string): Promise<any> {
    // Get table schema
    const tableInfo = await db.all(`PRAGMA table_info(${tableName})`);
    
    // Get foreign keys
    const foreignKeys = await db.all(`PRAGMA foreign_key_list(${tableName})`);
    
    // Get indexes
    const indexes = await db.all(`PRAGMA index_list(${tableName})`);
    
    // Get detailed index information
    const detailedIndexes = [];
    for (const index of indexes) {
      const indexInfo = await db.all(`PRAGMA index_info(${index.name})`);
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
    const rowCount = await db.get(`SELECT COUNT(*) as count FROM ${tableName}`);
    
    // Get table creation SQL
    const createSql = await db.get(`SELECT sql FROM sqlite_master WHERE type='table' AND name='${tableName}'`);
    
    // Extract data (limited for performance)
    const dataLimit = Math.min(rowCount.count, 1000);
    const tableData = await db.all(`SELECT * FROM ${tableName} LIMIT ${dataLimit}`);
    
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
   * Extract comprehensive index information
   */
  static async extractIndexes(db: any): Promise<TableIndex[]> {
    const indexes = await db.all(`
      SELECT name, sql, type, unique_flag 
      FROM sqlite_master 
      WHERE type='index' 
      AND name NOT LIKE 'sqlite_%'
    `);
    
    const enhancedIndexes = [];
    for (const index of indexes) {
      try {
        const indexInfo = await db.all(`PRAGMA index_info(${index.name})`);
        enhancedIndexes.push({
          id: `idx_${index.name}`,
          name: index.name,
          columns: indexInfo.map((col: any) => col.name),
          unique: index.unique_flag === 1,
          type: 'btree',
          expression: index.sql,
          createdAt: new Date()
        });
      } catch (error) {
        console.warn(`Could not extract info for index ${index.name}:`, error);
      }
    }
    
    return enhancedIndexes;
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
    
    const migrationDirs = [
      'migrations', 'db/migrate', 'database/migrations', 
      'alembic/versions', 'migration', 'migrate'
    ];
    
    for (const dir of migrationDirs) {
      const migrationPath = path.join(projectPath, dir);
      try {
        const stats = await stat(migrationPath);
        if (stats.isDirectory()) {
          console.log(`📁 Found migration directory: ${migrationPath}`);
          return await this.parseMigrationDirectory(migrationPath);
        }
      } catch (error) {
        // Directory doesn't exist, continue
      }
    }
    
    return null;
  }
  
  /**
   * Parse migration directory
   */
  static async parseMigrationDirectory(migrationPath: string): Promise<MigrationHistory> {
    const files = await readdir(migrationPath);
    const migrationFiles = files.filter(file => 
      file.endsWith('.sql') || file.endsWith('.py') || file.endsWith('.js') || 
      file.endsWith('.ts') || file.endsWith('.php') || file.endsWith('.rb')
    );
    
    console.log(`📄 Found ${migrationFiles.length} migration files`);
    
    const migrations: Migration[] = [];
    
    for (const file of migrationFiles) {
      const filePath = path.join(migrationPath, file);
      const content = await readFile(filePath, 'utf-8');
      const stats = await stat(filePath);
      
      const migration: Migration = {
        id: `migration_${file}`,
        version: this.extractVersionFromFilename(file),
        name: this.extractNameFromFilename(file),
        filename: file,
        framework: this.detectMigrationFramework(file, content),
        up: content,
        status: 'executed', // Assume executed for now
        executedAt: stats.mtime,
        description: this.extractDescriptionFromContent(content)
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
    
    const modelDirs = [
      'models', 'app/models', 'src/models', 'database/models',
      'app/Models', 'src/entities', 'entities'
    ];
    
    const ormModels: ORMModel[] = [];
    
    for (const dir of modelDirs) {
      const modelPath = path.join(projectPath, dir);
      try {
        const stats = await stat(modelPath);
        if (stats.isDirectory()) {
          console.log(`📁 Found model directory: ${modelPath}`);
          const models = await this.parseModelDirectory(modelPath);
          ormModels.push(...models);
        }
      } catch (error) {
        // Directory doesn't exist, continue
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
    const framework = this.detectORMFramework(filename, content);
    if (!framework) return null;
    
    const modelName = this.extractModelName(filename, content, framework);
    const tableName = this.extractTableName(content, framework);
    
    return {
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
      }
    };
  }
  
  /**
   * Extract model properties from source code
   */
  static extractProperties(content: string, framework: string): any[] {
    const properties: any[] = [];
    
    // Basic property extraction based on framework
    if (framework === 'sequelize') {
      // Extract from Sequelize model definitions
      const fieldMatches = content.match(/define\s*\(\s*['"`]([^'"`]+)['"`]\s*,\s*\{([^}]+)\}/gs);
      if (fieldMatches) {
        const fieldsContent = fieldMatches[0];
        const fieldRegex = /(\w+)\s*:\s*\{[^}]*type\s*:\s*DataTypes\.(\w+)/g;
        let match;
        while ((match = fieldRegex.exec(fieldsContent)) !== null) {
          properties.push({
            name: match[1],
            type: match[2].toLowerCase(),
            required: fieldsContent.includes(`${match[1]}: {`) && fieldsContent.includes('allowNull: false')
          });
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
    const content = await readFile(schemaPath, 'utf-8');
    const models: ORMModel[] = [];
    
    // Basic Prisma model parsing
    const modelRegex = /model\s+(\w+)\s*{([^}]+)}/g;
    let match;
    
    while ((match = modelRegex.exec(content)) !== null) {
      const modelName = match[1];
      const modelContent = match[2];
      
      models.push({
        id: `prisma_model_${modelName}`,
        name: modelName,
        filename: 'schema.prisma',
        framework: 'prisma',
        tableName: modelName.toLowerCase(),
        sourceCode: match[0],
        metadata: {
          extractedAt: new Date(),
          framework: 'prisma'
        }
      });
    }
    
    return models;
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
    if (filename.endsWith('.py') && content.includes('alembic')) return 'alembic';
    if (filename.endsWith('.py') && content.includes('django')) return 'django';
    if (filename.endsWith('.rb')) return 'rails';
    if (filename.endsWith('.php')) return 'laravel';
    if (filename.endsWith('.js') || filename.endsWith('.ts')) {
      if (content.includes('typeorm')) return 'typeorm';
      if (content.includes('sequelize')) return 'sequelize';
      if (content.includes('prisma')) return 'prisma';
    }
    return 'sequelize'; // default
  }
  
  static extractDescriptionFromContent(content: string): string {
    const commentMatch = content.match(/(?:\/\*|#|--|\/\/)\s*(.+?)(?:\*\/|\n)/);
    return commentMatch ? commentMatch[1].trim() : '';
  }
  
  static detectORMFramework(filename: string, content: string): ORMModel['framework'] | null {
    if (content.includes('sequelize') || content.includes('Sequelize')) return 'sequelize';
    if (content.includes('typeorm') || content.includes('Entity')) return 'typeorm';
    if (content.includes('django') && content.includes('models.Model')) return 'django';
    if (content.includes('Model') && filename.endsWith('.php')) return 'laravel';
    if (content.includes('mongoose') || content.includes('Schema')) return 'mongoose';
    return null;
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
    // This would be a complex parser for each framework
    // For now, return empty array
    return [];
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
