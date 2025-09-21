// Comprehensive database introspection service for all database types
const fs = require('fs').promises;
const path = require('path');
const Database = require('better-sqlite3');

class DatabaseIntrospectionService {
  constructor() {
    this.supportedExtensions = {
      sqlite: ['.sqlite', '.db', '.sqlite3', '.db3'],
      sql: ['.sql', '.ddl'],
      prisma: ['.prisma'],
      json: ['.json'],
      bson: ['.bson'],
      yaml: ['.yaml', '.yml']
    };
  }

  /**
   * Main entry point for extracting database content from any file
   */
  async extractDatabaseContent(filePath) {
    try {
      const ext = path.extname(filePath).toLowerCase();
      const fileName = path.basename(filePath, ext);
      
      console.log(`🔍 Introspecting database file: ${path.basename(filePath)}`);

      if (this.supportedExtensions.sqlite.includes(ext)) {
        return await this.introspectSQLiteDatabase(filePath);
      } else if (this.supportedExtensions.sql.includes(ext)) {
        return await this.parseSQLDump(filePath);
      } else if (this.supportedExtensions.prisma.includes(ext)) {
        return await this.parsePrismaSchema(filePath);
      } else if (this.supportedExtensions.json.includes(ext)) {
        return await this.parseJSONSchema(filePath);
      } else if (this.supportedExtensions.bson.includes(ext)) {
        return await this.parseBSONData(filePath);
      } else if (this.supportedExtensions.yaml.includes(ext)) {
        return await this.parseYAMLConfig(filePath);
      }

      return null;
    } catch (error) {
      console.error(`❌ Failed to introspect ${filePath}:`, error.message);
      return null;
    }
  }

  /**
   * Introspect real SQLite database files
   */
  async introspectSQLiteDatabase(filePath) {
    let db = null;
    try {
      console.log(`📊 Opening SQLite database: ${path.basename(filePath)}`);
      
      // Check if file exists and is readable
      const stats = await fs.stat(filePath);
      if (stats.size === 0) {
        console.log(`⚠️ SQLite file is empty: ${path.basename(filePath)}`);
        return null;
      }

      // Open SQLite database
      db = new Database(filePath, { readonly: true, fileMustExist: true });
      
      // Get all tables
      const tables = db.prepare(`
        SELECT name, type, sql 
        FROM sqlite_master 
        WHERE type IN ('table', 'view') 
        AND name NOT LIKE 'sqlite_%'
        ORDER BY name
      `).all();

      console.log(`📋 Found ${tables.length} tables in SQLite database`);

      const extractedTables = [];

      for (const table of tables) {
        try {
          const tableName = table.name;
          console.log(`📊 Analyzing table: ${tableName}`);

          // Get table info (columns)
          const columns = db.prepare(`PRAGMA table_info(${tableName})`).all();
          
          // Get foreign keys
          const foreignKeys = db.prepare(`PRAGMA foreign_key_list(${tableName})`).all();
          
          // Get indexes
          const indexes = db.prepare(`PRAGMA index_list(${tableName})`).all();
          
          // Get row count
          let rowCount = 0;
          try {
            const countResult = db.prepare(`SELECT COUNT(*) as count FROM ${tableName}`).get();
            rowCount = countResult.count;
          } catch (countError) {
            console.log(`⚠️ Could not get row count for ${tableName}: ${countError.message}`);
          }

          // Convert columns to our format
          const tableColumns = columns.map(col => ({
            id: col.name.toLowerCase(),
            name: col.name,
            type: this.mapSQLiteType(col.type),
            nullable: col.notnull === 0,
            primaryKey: col.pk === 1,
            unique: col.pk === 1, // Will be updated if we find unique indexes
            autoIncrement: col.pk === 1 && col.type.toUpperCase().includes('INTEGER'),
            defaultValue: col.dflt_value,
            position: col.cid
          }));

          // Add foreign key information
          foreignKeys.forEach(fk => {
            const column = tableColumns.find(col => col.name === fk.from);
            if (column) {
              column.foreignKey = {
                table: fk.table,
                column: fk.to,
                onDelete: fk.on_delete,
                onUpdate: fk.on_update
              };
            }
          });

          // Add index information
          indexes.forEach(idx => {
            if (idx.unique === 1) {
              const indexColumns = db.prepare(`PRAGMA index_info(${idx.name})`).all();
              indexColumns.forEach(idxCol => {
                const column = tableColumns.find(col => col.name === idxCol.name);
                if (column && !column.primaryKey) {
                  column.unique = true;
                }
              });
            }
          });

          const extractedTable = {
            id: tableName.toLowerCase(),
            name: tableName,
            type: table.type,
            columns: tableColumns,
            rowCount: rowCount,
            sql: table.sql,
            foreignKeys: foreignKeys.map(fk => ({
              column: fk.from,
              referencedTable: fk.table,
              referencedColumn: fk.to,
              onDelete: fk.on_delete,
              onUpdate: fk.on_update
            })),
            indexes: indexes.map(idx => ({
              name: idx.name,
              unique: idx.unique === 1,
              columns: db.prepare(`PRAGMA index_info(${idx.name})`).all().map(col => col.name)
            }))
          };

          extractedTables.push(extractedTable);
          console.log(`✅ Extracted table ${tableName}: ${tableColumns.length} columns, ${rowCount} rows`);

        } catch (tableError) {
          console.error(`❌ Failed to analyze table ${table.name}:`, tableError.message);
        }
      }

      // Get database-level information
      const dbInfo = {
        version: db.prepare('PRAGMA user_version').get(),
        pageSize: db.prepare('PRAGMA page_size').get(),
        encoding: db.prepare('PRAGMA encoding').get()
      };

      console.log(`🎉 Successfully introspected SQLite database: ${extractedTables.length} tables extracted`);

      return {
        databaseName: path.basename(filePath, path.extname(filePath)),
        databaseType: 'sqlite',
        filePath: filePath,
        tables: extractedTables,
        metadata: {
          totalTables: extractedTables.length,
          totalColumns: extractedTables.reduce((sum, table) => sum + table.columns.length, 0),
          totalRows: extractedTables.reduce((sum, table) => sum + (table.rowCount || 0), 0),
          hasForeignKeys: extractedTables.some(table => table.foreignKeys.length > 0),
          hasIndexes: extractedTables.some(table => table.indexes.length > 0),
          dbInfo: dbInfo
        }
      };

    } catch (error) {
      console.error(`❌ SQLite introspection failed for ${filePath}:`, error.message);
      return null;
    } finally {
      if (db) {
        try {
          db.close();
        } catch (closeError) {
          console.warn(`⚠️ Failed to close database: ${closeError.message}`);
        }
      }
    }
  }

  /**
   * Parse SQL dump files (PostgreSQL, MySQL, SQL Server, Oracle)
   */
  async parseSQLDump(filePath) {
    try {
      console.log(`📊 Parsing SQL dump: ${path.basename(filePath)}`);
      
      const content = await fs.readFile(filePath, 'utf-8');
      const fileName = path.basename(filePath, path.extname(filePath));
      
      const tables = [];
      
      // Enhanced regex patterns for different SQL dialects
      const patterns = {
        // PostgreSQL/MySQL CREATE TABLE
        createTable: /CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?(?:`?(\w+)`?\.)?`?(\w+)`?\s*\(([\s\S]*?)\)(?:\s*ENGINE\s*=\s*\w+)?(?:\s*DEFAULT\s+CHARSET\s*=\s*\w+)?;/gi,
        
        // SQL Server CREATE TABLE
        sqlServerTable: /CREATE\s+TABLE\s+(?:\[?(\w+)\]?\.)?\[?(\w+)\]?\s*\(([\s\S]*?)\)(?:\s+ON\s+\w+)?;/gi,
        
        // Oracle CREATE TABLE
        oracleTable: /CREATE\s+TABLE\s+(?:"?(\w+)"?\.)?"?(\w+)"?\s*\(([\s\S]*?)\)(?:\s+TABLESPACE\s+\w+)?;/gi
      };

      // Try all patterns
      for (const [patternName, pattern] of Object.entries(patterns)) {
        let match;
        while ((match = pattern.exec(content)) !== null) {
          const schema = match[1];
          const tableName = match[2];
          const columnsStr = match[3];
          
          console.log(`📋 Found table: ${tableName} (${patternName})`);
          
          const columns = this.parseTableColumns(columnsStr, patternName);
          
          if (columns.length > 0) {
            tables.push({
              id: tableName.toLowerCase(),
              name: tableName,
              schema: schema,
              columns: columns,
              dialect: patternName
            });
          }
        }
      }

      // Parse additional SQL elements
      const views = this.parseViews(content);
      const indexes = this.parseIndexes(content);
      const constraints = this.parseConstraints(content);

      console.log(`🎉 Parsed SQL dump: ${tables.length} tables, ${views.length} views, ${indexes.length} indexes`);

      return {
        databaseName: fileName,
        databaseType: this.detectSQLDialect(content),
        filePath: filePath,
        tables: tables,
        views: views,
        indexes: indexes,
        constraints: constraints,
        metadata: {
          totalTables: tables.length,
          totalColumns: tables.reduce((sum, table) => sum + table.columns.length, 0),
          totalViews: views.length,
          totalIndexes: indexes.length,
          totalConstraints: constraints.length
        }
      };

    } catch (error) {
      console.error(`❌ SQL dump parsing failed for ${filePath}:`, error.message);
      return null;
    }
  }

  /**
   * Parse table columns from SQL definition
   */
  parseTableColumns(columnsStr, dialect) {
    const columns = [];
    
    // Split by commas but respect parentheses and quotes
    const columnLines = this.smartSplitSQL(columnsStr);
    
    for (const line of columnLines) {
      const trimmed = line.trim();
      if (!trimmed || this.isConstraintLine(trimmed)) continue;
      
      const column = this.parseColumnDefinition(trimmed, dialect);
      if (column) {
        columns.push(column);
      }
    }
    
    return columns;
  }

  /**
   * Parse individual column definition
   */
  parseColumnDefinition(definition, dialect) {
    // Enhanced regex for different SQL dialects
    const patterns = {
      // PostgreSQL pattern
      postgres: /^`?"?(\w+)`?"?\s+(\w+(?:\([^)]*\))?(?:\s+\w+)*)\s*(.*?)$/i,
      // MySQL pattern  
      mysql: /^`?(\w+)`?\s+(\w+(?:\([^)]*\))?)\s*(.*?)$/i,
      // SQL Server pattern
      sqlServer: /^\[?(\w+)\]?\s+(\w+(?:\([^)]*\))?)\s*(.*?)$/i,
      // Oracle pattern
      oracle: /^"?(\w+)"?\s+(\w+(?:\([^)]*\))?)\s*(.*?)$/i
    };

    const pattern = patterns[dialect] || patterns.postgres;
    const match = definition.match(pattern);
    
    if (!match) return null;

    const [, columnName, dataType, constraints] = match;
    const constraintStr = constraints.toLowerCase();

    return {
      id: columnName.toLowerCase(),
      name: columnName,
      type: this.normalizeDataType(dataType),
      nullable: !constraintStr.includes('not null'),
      primaryKey: constraintStr.includes('primary key'),
      unique: constraintStr.includes('unique'),
      autoIncrement: constraintStr.includes('auto_increment') || 
                    constraintStr.includes('autoincrement') || 
                    constraintStr.includes('identity') ||
                    constraintStr.includes('serial'),
      defaultValue: this.extractDefaultValue(constraintStr),
      constraints: this.parseColumnConstraints(constraintStr)
    };
  }

  /**
   * Parse Prisma schema files
   */
  async parsePrismaSchema(filePath) {
    try {
      console.log(`📊 Parsing Prisma schema: ${path.basename(filePath)}`);
      
      const content = await fs.readFile(filePath, 'utf-8');
      const fileName = path.basename(filePath, path.extname(filePath));
      
      const tables = [];
      
      // Extract models from Prisma schema
      const modelMatches = content.matchAll(/model\s+(\w+)\s*{([\s\S]*?)}/g);
      
      for (const match of modelMatches) {
        const modelName = match[1];
        const modelBody = match[2];
        
        console.log(`📋 Found Prisma model: ${modelName}`);
        
        const columns = [];
        const fieldMatches = modelBody.matchAll(/(\w+)\s+(\w+(?:\[\])?(?:\?)?)\s*(@.*)?/g);
        
        for (const fieldMatch of fieldMatches) {
          const [, fieldName, fieldType, attributes] = fieldMatch;
          
          const column = {
            id: fieldName.toLowerCase(),
            name: fieldName,
            type: this.mapPrismaType(fieldType),
            nullable: fieldType.includes('?'),
            primaryKey: attributes && attributes.includes('@id'),
            unique: attributes && attributes.includes('@unique'),
            autoIncrement: attributes && attributes.includes('@default(autoincrement())'),
            defaultValue: this.extractPrismaDefault(attributes),
            isArray: fieldType.includes('[]')
          };
          
          columns.push(column);
        }
        
        tables.push({
          id: modelName.toLowerCase(),
          name: modelName,
          columns: columns,
          prismaModel: true
        });
      }

      console.log(`🎉 Parsed Prisma schema: ${tables.length} models`);

      return {
        databaseName: fileName,
        databaseType: 'prisma',
        filePath: filePath,
        tables: tables,
        metadata: {
          totalTables: tables.length,
          totalColumns: tables.reduce((sum, table) => sum + table.columns.length, 0)
        }
      };

    } catch (error) {
      console.error(`❌ Prisma schema parsing failed for ${filePath}:`, error.message);
      return null;
    }
  }

  /**
   * Utility methods
   */
  mapSQLiteType(sqliteType) {
    const typeMap = {
      'INTEGER': 'INTEGER',
      'TEXT': 'TEXT',
      'REAL': 'REAL',
      'BLOB': 'BLOB',
      'NUMERIC': 'NUMERIC',
      'VARCHAR': 'VARCHAR',
      'CHAR': 'CHAR',
      'BOOLEAN': 'BOOLEAN',
      'DATE': 'DATE',
      'DATETIME': 'DATETIME',
      'TIMESTAMP': 'TIMESTAMP'
    };
    
    const upperType = sqliteType.toUpperCase();
    return typeMap[upperType] || upperType;
  }

  normalizeDataType(dataType) {
    // Remove size specifications and normalize
    const baseType = dataType.replace(/\([^)]*\)/g, '').toUpperCase().trim();
    
    const typeMap = {
      'INT': 'INTEGER',
      'BIGINT': 'BIGINT',
      'SMALLINT': 'SMALLINT',
      'TINYINT': 'TINYINT',
      'VARCHAR': 'VARCHAR',
      'CHAR': 'CHAR',
      'TEXT': 'TEXT',
      'DECIMAL': 'DECIMAL',
      'NUMERIC': 'NUMERIC',
      'FLOAT': 'FLOAT',
      'DOUBLE': 'DOUBLE',
      'BOOLEAN': 'BOOLEAN',
      'BOOL': 'BOOLEAN',
      'DATE': 'DATE',
      'TIME': 'TIME',
      'DATETIME': 'DATETIME',
      'TIMESTAMP': 'TIMESTAMP',
      'JSON': 'JSON',
      'JSONB': 'JSONB',
      'UUID': 'UUID',
      'SERIAL': 'SERIAL',
      'BIGSERIAL': 'BIGSERIAL'
    };
    
    return typeMap[baseType] || baseType;
  }

  mapPrismaType(prismaType) {
    const cleanType = prismaType.replace(/[\[\]?]/g, '');
    
    const typeMap = {
      'String': 'VARCHAR',
      'Int': 'INTEGER',
      'BigInt': 'BIGINT',
      'Float': 'FLOAT',
      'Decimal': 'DECIMAL',
      'Boolean': 'BOOLEAN',
      'DateTime': 'DATETIME',
      'Json': 'JSON',
      'Bytes': 'BLOB'
    };
    
    return typeMap[cleanType] || cleanType.toUpperCase();
  }

  smartSplitSQL(str) {
    const result = [];
    let current = '';
    let depth = 0;
    let inQuotes = false;
    let quoteChar = '';
    
    for (let i = 0; i < str.length; i++) {
      const char = str[i];
      
      if (!inQuotes && (char === '"' || char === "'" || char === '`')) {
        inQuotes = true;
        quoteChar = char;
      } else if (inQuotes && char === quoteChar) {
        inQuotes = false;
        quoteChar = '';
      } else if (!inQuotes) {
        if (char === '(') depth++;
        else if (char === ')') depth--;
        else if (char === ',' && depth === 0) {
          result.push(current.trim());
          current = '';
          continue;
        }
      }
      
      current += char;
    }
    
    if (current.trim()) {
      result.push(current.trim());
    }
    
    return result;
  }

  isConstraintLine(line) {
    const constraintKeywords = [
      'primary key', 'foreign key', 'constraint', 'index', 'key',
      'unique key', 'check', 'references'
    ];
    
    const lowerLine = line.toLowerCase();
    return constraintKeywords.some(keyword => lowerLine.includes(keyword));
  }

  extractDefaultValue(constraintStr) {
    const defaultMatch = constraintStr.match(/default\s+([^,\s]+)/i);
    return defaultMatch ? defaultMatch[1].replace(/['"`]/g, '') : null;
  }

  extractPrismaDefault(attributes) {
    if (!attributes) return null;
    const defaultMatch = attributes.match(/@default\(([^)]+)\)/);
    return defaultMatch ? defaultMatch[1] : null;
  }

  parseColumnConstraints(constraintStr) {
    return {
      notNull: constraintStr.includes('not null'),
      unique: constraintStr.includes('unique'),
      primaryKey: constraintStr.includes('primary key'),
      autoIncrement: constraintStr.includes('auto_increment') || constraintStr.includes('autoincrement'),
      check: this.extractCheckConstraint(constraintStr),
      references: this.extractForeignKey(constraintStr)
    };
  }

  extractCheckConstraint(constraintStr) {
    const checkMatch = constraintStr.match(/check\s*\(([^)]+)\)/i);
    return checkMatch ? checkMatch[1] : null;
  }

  extractForeignKey(constraintStr) {
    const fkMatch = constraintStr.match(/references\s+(\w+)\s*\((\w+)\)/i);
    return fkMatch ? { table: fkMatch[1], column: fkMatch[2] } : null;
  }

  parseViews(content) {
    const views = [];
    const viewMatches = content.matchAll(/CREATE\s+(?:OR\s+REPLACE\s+)?VIEW\s+(\w+)\s+AS\s+([\s\S]*?)(?=;|\n\n)/gi);
    
    for (const match of viewMatches) {
      views.push({
        name: match[1],
        definition: match[2].trim()
      });
    }
    
    return views;
  }

  parseIndexes(content) {
    const indexes = [];
    const indexMatches = content.matchAll(/CREATE\s+(?:UNIQUE\s+)?INDEX\s+(\w+)\s+ON\s+(\w+)\s*\(([^)]+)\)/gi);
    
    for (const match of indexMatches) {
      indexes.push({
        name: match[1],
        table: match[2],
        columns: match[3].split(',').map(col => col.trim()),
        unique: match[0].toLowerCase().includes('unique')
      });
    }
    
    return indexes;
  }

  parseConstraints(content) {
    const constraints = [];
    const constraintMatches = content.matchAll(/ALTER\s+TABLE\s+(\w+)\s+ADD\s+CONSTRAINT\s+(\w+)\s+([\s\S]*?)(?=;)/gi);
    
    for (const match of constraintMatches) {
      constraints.push({
        table: match[1],
        name: match[2],
        definition: match[3].trim()
      });
    }
    
    return constraints;
  }

  detectSQLDialect(content) {
    const lowerContent = content.toLowerCase();
    
    if (lowerContent.includes('auto_increment') || lowerContent.includes('engine=')) {
      return 'mysql';
    } else if (lowerContent.includes('serial') || lowerContent.includes('nextval')) {
      return 'postgresql';
    } else if (lowerContent.includes('identity') || lowerContent.includes('[dbo]')) {
      return 'sqlserver';
    } else if (lowerContent.includes('number(') || lowerContent.includes('varchar2')) {
      return 'oracle';
    }
    
    return 'sql';
  }

  // Placeholder methods for other file types
  async parseJSONSchema(filePath) {
    // TODO: Implement JSON schema parsing
    return null;
  }

  async parseBSONData(filePath) {
    // TODO: Implement BSON data parsing
    return null;
  }

  async parseYAMLConfig(filePath) {
    // TODO: Implement YAML config parsing
    return null;
  }
}

module.exports = { DatabaseIntrospectionService };
