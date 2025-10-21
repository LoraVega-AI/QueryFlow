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
      yaml: ['.yaml', '.yml'],
      javascript: ['.js', '.jsx'],
      typescript: ['.ts', '.tsx'],
      python: ['.py'],
      php: ['.php'],
      java: ['.java'],
      csharp: ['.cs']
    };
    
    this.frameworkPatterns = {
      typeorm: {
        entityDecorator: /@Entity\s*\(\s*[^)]*\s*\)/g,
        columnDecorator: /@Column\s*\(\s*[^)]*\s*\)/g,
        primaryColumn: /@PrimaryGeneratedColumn\s*\(\s*[^)]*\s*\)/g,
        oneToMany: /@OneToMany\s*\(\s*[^)]*\s*\)/g,
        manyToOne: /@ManyToOne\s*\(\s*[^)]*\s*\)/g
      },
      eloquent: {
        modelClass: /class\s+(\w+)\s+extends\s+Model/g,
        table: /protected\s+\$table\s*=\s*['"]([^'"]+)['"]/g,
        fillable: /protected\s+\$fillable\s*=\s*\[([\s\S]*?)\]/g,
        casts: /protected\s+\$casts\s*=\s*\[([\s\S]*?)\]/g
      },
      hibernate: {
        entityAnnotation: /@Entity\s*(?:\([^)]*\))?/g,
        tableAnnotation: /@Table\s*\(\s*name\s*=\s*"([^"]+)"/g,
        columnAnnotation: /@Column\s*(?:\([^)]*\))?/g,
        idAnnotation: /@Id/g,
        generatedValue: /@GeneratedValue/g
      }
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
      } else if (this.supportedExtensions.typescript.includes(ext) || this.supportedExtensions.javascript.includes(ext)) {
        return await this.parseCodeFile(filePath, 'javascript');
      } else if (this.supportedExtensions.python.includes(ext)) {
        return await this.parseCodeFile(filePath, 'python');
      } else if (this.supportedExtensions.php.includes(ext)) {
        return await this.parseCodeFile(filePath, 'php');
      } else if (this.supportedExtensions.java.includes(ext)) {
        return await this.parseCodeFile(filePath, 'java');
      } else if (this.supportedExtensions.csharp.includes(ext)) {
        return await this.parseCodeFile(filePath, 'csharp');
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
   * Remove SQL comments to prevent false matches
   */
  removeSQLComments(content) {
    // Remove multi-line comments /* ... */
    content = content.replace(/\/\*[\s\S]*?\*\//g, '');
    // Remove single-line comments --
    content = content.replace(/--[^\n]*/g, '');
    return content;
  }

  /**
   * Extract complete CREATE TABLE statements with all options
   */
  extractTableDefinitions(content, dialect) {
    // Use a more robust approach to extract table definitions with proper nested parentheses handling
    const definitions = [];
    
    // Find all CREATE TABLE statements
    const createTableRegex = /CREATE\s+(?:OR\s+REPLACE\s+)?(?:TEMP|TEMPORARY|UNLOGGED\s+)?TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?/gi;
    let match;
    
    while ((match = createTableRegex.exec(content)) !== null) {
      const startPos = match.index;
      const tableStart = match[0];
      
      // Find the table name and opening parenthesis
      const afterCreate = content.substring(startPos + tableStart.length);
      const tableNameMatch = afterCreate.match(/^(\s*(?:"?(\w+)"?\.)?(?:"?(\w+)"?)\s*\()/);
      
      if (!tableNameMatch) continue;
      
      const schema = tableNameMatch[2];
      const tableName = tableNameMatch[3];
      const openParenPos = startPos + tableStart.length + tableNameMatch[0].length - 1;
      
      // Find the matching closing parenthesis
      let depth = 1;
      let pos = openParenPos + 1;
      let bodyEnd = -1;
      
      while (pos < content.length && depth > 0) {
        const char = content[pos];
        if (char === '(') depth++;
        else if (char === ')') depth--;
        pos++;
      }
      
      if (depth === 0) {
        bodyEnd = pos - 1;
        const body = content.substring(openParenPos + 1, bodyEnd);
        
        definitions.push({
              schema: schema,
          tableName: tableName,
          body: body,
          fullMatch: content.substring(startPos, bodyEnd + 1)
            });
          }
        }
    
    return definitions;
  }

  /**
   * Parse SQL dump files (PostgreSQL, MySQL, SQL Server, Oracle)
   */
  async parseSQLDump(filePath) {
    try {
      console.log(`📊 Parsing SQL dump: ${path.basename(filePath)}`);
      
      const content = await fs.readFile(filePath, 'utf-8');
      const fileName = path.basename(filePath, path.extname(filePath));
      
      // Pre-process: Remove SQL comments
      const cleanContent = this.removeSQLComments(content);
      
      // Detect SQL dialect
      const dialect = this.detectSQLDialect(cleanContent);
      
      // Phase 1: Extract all CREATE TABLE statements
      const tableDefinitions = this.extractTableDefinitions(cleanContent, dialect);
      
      // Phase 2: Parse each table comprehensively
      const tables = [];
      for (const tableDef of tableDefinitions) {
        const table = this.parseTableDefinition(tableDef, dialect, filePath);
        if (table) tables.push(table);
      }

      // Phase 3: Extract standalone constraints and indexes
      const standaloneIndexes = this.parseStandaloneIndexes(cleanContent, dialect);
      const standaloneConstraints = this.parseStandaloneConstraints(cleanContent, dialect);
      
      // Phase 4: Map constraints back to tables
      this.mapConstraintsToTables(tables, standaloneConstraints);
      this.mapIndexesToTables(tables, standaloneIndexes);
      
      // Phase 5: Extract relationships from all sources
      const relationships = this.extractComprehensiveRelationships(tables, standaloneConstraints);
      
      // Phase 6: Parse views, triggers, sequences
      const views = this.parseViews(cleanContent, dialect);
      const triggers = this.parseTriggers(cleanContent, dialect);
      const sequences = this.parseSequences(cleanContent, dialect);

      console.log(`🎉 Parsed SQL dump: ${tables.length} tables, ${views.length} views, ${standaloneIndexes.length} indexes, ${relationships.length} relationships`);

      return {
        databaseName: fileName,
        databaseType: dialect,
        filePath: filePath,
        tables: tables,
        views: views,
        indexes: standaloneIndexes,
        constraints: standaloneConstraints,
        relationships: relationships,
        triggers: triggers,
        sequences: sequences,
        metadata: {
          totalTables: tables.length,
          totalColumns: tables.reduce((sum, table) => sum + table.columns.length, 0),
          totalViews: views.length,
          totalIndexes: standaloneIndexes.length,
          totalConstraints: standaloneConstraints.length,
          totalRelationships: relationships.length,
          totalTriggers: triggers.length,
          totalSequences: sequences.length
        }
      };

    } catch (error) {
      console.error(`❌ SQL dump parsing failed for ${filePath}:`, error.message);
      return null;
    }
  }

  /**
   * Parse table definition comprehensively
   */
  parseTableDefinition(tableDef, dialect, filePath) {
    const { schema, tableName, body } = tableDef;
    
    // Split body into components (columns and constraints)
    const components = this.smartSplitSQL(body);
    
    const columns = [];
    const tableConstraints = [];
    
    for (const component of components) {
      const trimmed = component.trim();
      if (!trimmed) continue;
      
      // Check if it's a table-level constraint
      if (this.isTableConstraint(trimmed)) {
        const constraint = this.parseTableConstraint(trimmed, tableName, dialect);
        if (constraint) tableConstraints.push(constraint);
      } else {
        // It's a column definition
        const column = this.parseEnhancedColumnDefinition(trimmed, dialect);
        if (column) columns.push(column);
      }
    }
    
    // Apply table-level constraints to columns
    this.applyTableConstraintsToColumns(columns, tableConstraints);
    
    return {
      id: tableName.toLowerCase(),
      name: tableName,
      schema: schema,
      columns: columns,
      tableConstraints: tableConstraints,
      dialect: dialect,
      source: 'sql_file',
      sourceFile: path.basename(filePath),
      sourceType: 'schema_definition'
    };
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
   * Parse enhanced column definition with support for complex types
   */
  parseEnhancedColumnDefinition(definition, dialect) {
    // Simplified approach: extract column name, type, and parse constraints separately
    const trimmed = definition.trim();
    
    // Extract column name (first word)
    const nameMatch = trimmed.match(/^`?"?(\w+)"?`?/);
    if (!nameMatch) return null;
    
    const columnName = nameMatch[1];
    const remaining = trimmed.substring(nameMatch[0].length).trim();
    
    // Extract data type (next word or words with parentheses, including arrays)
    const typeMatch = remaining.match(/^([A-Za-z_][A-Za-z0-9_]*\s*(?:\([^)]*\))?(?:\[\])?)/);
    if (!typeMatch) return null;
    
    const dataType = typeMatch[1].trim();
    const constraintsStr = remaining.substring(typeMatch[0].length).trim();
    
    return {
      id: columnName.toLowerCase(),
      name: columnName,
      type: this.normalizeDataType(dataType, dialect),
      originalType: dataType,
      nullable: !constraintsStr.toLowerCase().includes('not null'),
      primaryKey: this.extractPrimaryKey(constraintsStr),
      unique: this.extractUnique(constraintsStr),
      autoIncrement: this.extractAutoIncrement(constraintsStr, dialect),
      defaultValue: this.extractDefaultValue(constraintsStr),
      check: this.extractCheckConstraint(constraintsStr),
      foreignKey: this.extractForeignKey(constraintsStr),
      generated: this.extractGeneratedColumn(constraintsStr, dialect),
      collation: this.extractCollation(constraintsStr),
      comment: this.extractComment(constraintsStr),
      constraints: this.parseColumnConstraints(constraintsStr)
    };
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
    // Handle various default value patterns
    const patterns = [
      /DEFAULT\s+([^,\s]+)/i,
      /DEFAULT\s+\(([^)]+)\)/i,
      /DEFAULT\s+'([^']+)'/i,
      /DEFAULT\s+"([^"]+)"/i
    ];
    
    for (const pattern of patterns) {
      const match = constraintStr.match(pattern);
      if (match) {
        return match[1].replace(/['"`]/g, '');
      }
    }
    return null;
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
    // Match REFERENCES table_name(column_name) with optional ON DELETE/UPDATE
    const fkPattern = /references\s+`?"?(\w+)`?"?\s*\(\s*`?"?(\w+)`?"?\s*\)(?:\s+on\s+delete\s+(cascade|set\s+null|restrict|no\s+action))?(?:\s+on\s+update\s+(cascade|set\s+null|restrict|no\s+action))?/i;
    const match = constraintStr.match(fkPattern);
    
    if (match) {
      return {
        table: match[1],
        column: match[2],
        onDelete: match[3] ? match[3].toUpperCase().replace(/\s+/g, ' ') : 'NO ACTION',
        onUpdate: match[4] ? match[4].toUpperCase().replace(/\s+/g, ' ') : 'NO ACTION'
      };
    }
    return null;
  }

  // Enhanced helper methods for comprehensive parsing

  /**
   * Check if line is a table constraint
   */
  isTableConstraint(line) {
    const constraintKeywords = [
      /^\s*PRIMARY\s+KEY\s*\(/i,
      /^\s*FOREIGN\s+KEY\s*\(/i,
      /^\s*UNIQUE\s*\(/i,             // Standalone UNIQUE constraint
      /^\s*CHECK\s*\(/i,
      /^\s*CONSTRAINT\s+\w+/i,
      /^\s*INDEX\s+/i,                // MySQL inline index
      /^\s*KEY\s+\w+\s*\(/i,          // MySQL inline key (KEY name (...))
      /^\s*UNIQUE\s+KEY\s+/i,         // MySQL unique key
      /^\s*UNIQUE\s+INDEX\s+/i,       // MySQL unique index
      /^\s*FULLTEXT\s+INDEX\s+/i,     // MySQL fulltext index
      /^\s*SPATIAL\s+INDEX\s+/i       // MySQL spatial index
    ];
    return constraintKeywords.some(pattern => pattern.test(line));
  }

  /**
   * Parse table-level constraints
   */
  parseTableConstraint(definition, tableName, dialect) {
    const constraintTypes = {
      primaryKey: /(?:CONSTRAINT\s+(\w+)\s+)?PRIMARY\s+KEY\s*\(([^)]+)\)/i,
      unique: /(?:CONSTRAINT\s+(\w+)\s+)?UNIQUE\s*\(([^)]+)\)/i,
      foreignKey: /(?:CONSTRAINT\s+(\w+)\s+)?FOREIGN\s+KEY\s*\(([^)]+)\)\s+REFERENCES\s+(\w+)\s*\(([^)]+)\)(?:\s+ON\s+DELETE\s+(CASCADE|SET\s+NULL|SET\s+DEFAULT|RESTRICT|NO\s+ACTION))?(?:\s+ON\s+UPDATE\s+(CASCADE|SET\s+NULL|SET\s+DEFAULT|RESTRICT|NO\s+ACTION))?(?:\s+(DEFERRABLE|NOT\s+DEFERRABLE))?(?:\s+(INITIALLY\s+DEFERRED|INITIALLY\s+IMMEDIATE))?/i,
      check: /(?:CONSTRAINT\s+(\w+)\s+)?CHECK\s*\(([^)]+(?:\([^)]*\))*)\)/i,
      index: /(?:(UNIQUE|FULLTEXT|SPATIAL)\s+)?(?:INDEX|KEY)\s+(\w+)\s*\(([^)]+)\)/i
    };
    
    for (const [type, pattern] of Object.entries(constraintTypes)) {
      const match = definition.match(pattern);
      if (match) {
        if (type === 'index') {
          // Return index constraint
          return {
            type: 'index',
            name: match[2],
            table: tableName,
            definition: definition,
            columns: match[3]?.split(',').map(c => c.trim()),
            unique: match[1] === 'UNIQUE',
            fulltext: match[1] === 'FULLTEXT',
            spatial: match[1] === 'SPATIAL'
          };
        }
        
        return {
          type: type,
          name: match[1],
          table: tableName,
          definition: definition,
          columns: match[2]?.split(',').map(c => c.trim()),
          referencedTable: match[3],
          referencedColumns: match[4]?.split(',').map(c => c.trim()),
          onDelete: match[5],
          onUpdate: match[6],
          deferrable: match[7],
          initiallyDeferred: match[8],
          checkCondition: type === 'check' ? match[2] : null
        };
      }
    }
    
    return null;
  }

  /**
   * Extract auto increment based on dialect
   */
  extractAutoIncrement(constraintStr, dialect) {
    const patterns = {
      mysql: /AUTO_INCREMENT/i,
      postgres: /SERIAL|BIGSERIAL|SMALLSERIAL|GENERATED\s+(?:ALWAYS|BY\s+DEFAULT)\s+AS\s+IDENTITY/i,
      sqlserver: /IDENTITY/i,
      oracle: /GENERATED\s+(?:ALWAYS|BY\s+DEFAULT)\s+AS\s+IDENTITY/i,
      sqlite: /AUTOINCREMENT/i
    };
    const pattern = patterns[dialect] || /AUTO_INCREMENT|AUTOINCREMENT|SERIAL|IDENTITY/i;
    return pattern.test(constraintStr);
  }

  /**
   * Extract generated column expression
   */
  extractGeneratedColumn(constraintStr, dialect) {
    const patterns = {
      postgres: /GENERATED\s+ALWAYS\s+AS\s*\(([^)]+)\)\s+STORED/i,
      mysql: /GENERATED\s+ALWAYS\s+AS\s*\(([^)]+)\)\s+(?:STORED|VIRTUAL)/i,
      sqlite: /GENERATED\s+ALWAYS\s+AS\s*\(([^)]+)\)\s+(?:STORED|VIRTUAL)/i,
      sqlserver: /AS\s+\(([^)]+)\)\s+PERSISTED/i,
      oracle: /GENERATED\s+ALWAYS\s+AS\s*\(([^)]+)\)/i
    };
    const pattern = patterns[dialect];
    if (!pattern) return null;
    
    const match = constraintStr.match(pattern);
    return match ? { expression: match[1], stored: true } : null;
  }

  /**
   * Extract collation
   */
  extractCollation(constraintStr) {
    const match = constraintStr.match(/COLLATE\s+(\w+)/i);
    return match ? match[1] : null;
  }

  /**
   * Extract comment
   */
  extractComment(constraintStr) {
    const match = constraintStr.match(/COMMENT\s+'([^']*)'/i);
    return match ? match[1] : null;
  }

  /**
   * Extract primary key
   */
  extractPrimaryKey(constraintStr) {
    return /PRIMARY\s+KEY/i.test(constraintStr);
  }

  /**
   * Extract unique constraint
   */
  extractUnique(constraintStr) {
    return /UNIQUE/i.test(constraintStr);
  }

  /**
   * Normalize data types across dialects
   */
  normalizeDataType(dataType, dialect) {
    const typeMap = {
      // Integer types
      'INT': 'INTEGER', 'INTEGER': 'INTEGER', 'BIGINT': 'BIGINT', 'SMALLINT': 'SMALLINT', 'TINYINT': 'TINYINT',
      // String types
      'VARCHAR': 'VARCHAR', 'CHAR': 'CHAR', 'TEXT': 'TEXT', 'LONGTEXT': 'TEXT',
      // Decimal types
      'DECIMAL': 'DECIMAL', 'NUMERIC': 'NUMERIC', 'FLOAT': 'FLOAT', 'DOUBLE': 'DOUBLE', 'REAL': 'REAL',
      // Date/Time types
      'DATE': 'DATE', 'TIME': 'TIME', 'TIMESTAMP': 'TIMESTAMP', 'DATETIME': 'DATETIME',
      // Boolean types
      'BOOLEAN': 'BOOLEAN', 'BOOL': 'BOOLEAN',
      // Binary types
      'BLOB': 'BLOB', 'BYTEA': 'BLOB', 'VARBINARY': 'BLOB',
      // JSON types
      'JSON': 'JSON', 'JSONB': 'JSONB',
      // Array types (PostgreSQL)
      'INTEGER[]': 'INTEGER_ARRAY', 'TEXT[]': 'TEXT_ARRAY', 'VARCHAR[]': 'VARCHAR_ARRAY',
      // UUID
      'UUID': 'UUID'
    };
    
    // Check for array types first
    if (dataType.includes('[]')) {
      const baseType = dataType.replace('[]', '').replace(/\([^)]*\)/g, '').trim().toUpperCase();
      return typeMap[baseType + '[]'] || baseType + '_ARRAY';
    }
    
    const cleanType = dataType.replace(/\([^)]*\)/g, '').trim().toUpperCase();
    return typeMap[cleanType] || dataType.toUpperCase();
  }

  /**
   * Apply table-level constraints to columns
   */
  applyTableConstraintsToColumns(columns, tableConstraints) {
    for (const constraint of tableConstraints) {
      if (constraint.type === 'primaryKey' && constraint.columns) {
        constraint.columns.forEach(colName => {
          const column = columns.find(c => c.name === colName);
          if (column) column.primaryKey = true;
        });
      }
      if (constraint.type === 'unique' && constraint.columns) {
        constraint.columns.forEach(colName => {
          const column = columns.find(c => c.name === colName);
          if (column) column.unique = true;
        });
      }
    }
  }

  /**
   * Map constraints back to tables
   */
  mapConstraintsToTables(tables, constraints) {
    // Implementation for mapping standalone constraints to tables
    for (const constraint of constraints) {
      const table = tables.find(t => t.name === constraint.table);
      if (table) {
        if (!table.tableConstraints) table.tableConstraints = [];
        table.tableConstraints.push(constraint);
      }
    }
  }

  /**
   * Map indexes back to tables
   */
  mapIndexesToTables(tables, indexes) {
    // Implementation for mapping standalone indexes to tables
    for (const index of indexes) {
      const table = tables.find(t => t.name === index.table);
      if (table) {
        if (!table.indexes) table.indexes = [];
        table.indexes.push(index);
      }
    }
    
    // Also map inline indexes from table constraints
    for (const table of tables) {
      if (table.tableConstraints) {
        for (const constraint of table.tableConstraints) {
          if (constraint.type === 'index') {
            if (!table.indexes) table.indexes = [];
            table.indexes.push({
              name: constraint.name,
              table: table.name,
              columns: constraint.columns,
              unique: constraint.unique,
              fulltext: constraint.fulltext,
              spatial: constraint.spatial,
              type: constraint.unique ? 'unique' : (constraint.fulltext ? 'fulltext' : (constraint.spatial ? 'spatial' : 'btree')),
              definition: constraint.definition,
              source: 'inline'
            });
          }
        }
      }
    }
  }

  /**
   * Parse standalone constraints
   */
  parseStandaloneConstraints(content, dialect) {
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

  /**
   * Parse standalone indexes
   */
  parseStandaloneIndexes(content, dialect) {
    const indexes = [];
    
    // Simplified patterns for better matching
    const patterns = [
      // Basic index: CREATE INDEX name ON table (columns)
      /CREATE\s+(?:(UNIQUE|FULLTEXT|SPATIAL)\s+)?INDEX\s+(\w+)\s+ON\s+(\w+)\s*\(([^)]+)\)/gi,
      
      // Index with WHERE clause: CREATE INDEX name ON table (columns) WHERE condition
      /CREATE\s+(?:(UNIQUE|FULLTEXT|SPATIAL)\s+)?INDEX\s+(\w+)\s+ON\s+(\w+)\s*\(([^)]+)\)\s+WHERE\s+(.+?)(?=;|$)/gi,
      
      // Clustered index (SQL Server)
      /CREATE\s+(CLUSTERED|NONCLUSTERED)\s+INDEX\s+(\w+)\s+ON\s+(\w+)\s*\(([^)]+)\)/gi
    ];
    
    for (const pattern of patterns) {
      let match;
      while ((match = pattern.exec(content)) !== null) {
        const index = this.parseIndexMatch(match, dialect);
        if (index) indexes.push(index);
      }
    }
    
    return indexes;
  }

  /**
   * Parse index match
   */
  parseIndexMatch(match, dialect) {
    // Handle different index patterns
    if (match.length === 5) {
      // Basic index: CREATE [UNIQUE] INDEX name ON table (columns)
      return {
        name: match[2],
        table: match[3],
        columns: match[4].split(',').map(col => col.trim().replace(/`|"|\[|\]/g, '')),
        unique: !!match[1],
        type: 'btree',
        definition: match[0]
      };
    } else if (match.length === 6) {
      // Index with WHERE clause: CREATE [UNIQUE] INDEX name ON table (columns) WHERE condition
      return {
        name: match[2],
        table: match[3],
        columns: match[4].split(',').map(col => col.trim().replace(/`|"|\[|\]/g, '')),
        unique: !!match[1],
        where: match[5],
        type: 'btree',
        definition: match[0]
      };
    } else if (match.length === 5 && match[1] && (match[1] === 'CLUSTERED' || match[1] === 'NONCLUSTERED')) {
      // Clustered index
      return {
        name: match[2],
        table: match[3],
        columns: match[4].split(',').map(col => col.trim()),
        clustered: match[1] === 'CLUSTERED',
        definition: match[0]
      };
    }
    return null;
  }

  /**
   * Extract comprehensive relationships
   */
  extractComprehensiveRelationships(tables, constraints) {
    const relationships = [];
    
    // 1. Inline foreign keys from columns
    for (const table of tables) {
      for (const column of table.columns) {
        if (column.foreignKey) {
          relationships.push({
            id: `${table.name}_${column.name}_fk`,
            sourceTable: table.name,
            sourceColumn: column.name,
            targetTable: column.foreignKey.table,
            targetColumn: column.foreignKey.column,
            type: 'foreign_key',
            onDelete: column.foreignKey.onDelete || 'NO ACTION',
            onUpdate: column.foreignKey.onUpdate || 'NO ACTION',
            source: 'inline'
          });
        }
      }
    }
    
    // 2. Table-level foreign key constraints
    for (const constraint of constraints) {
      if (constraint.type === 'foreignKey') {
        relationships.push({
          id: constraint.name || `${constraint.table}_${constraint.columns.join('_')}_fk`,
          sourceTable: constraint.table,
          sourceColumns: constraint.columns,
          targetTable: constraint.referencedTable,
          targetColumns: constraint.referencedColumns,
          type: constraint.columns.length > 1 ? 'composite_foreign_key' : 'foreign_key',
          onDelete: constraint.onDelete || 'NO ACTION',
          onUpdate: constraint.onUpdate || 'NO ACTION',
          deferrable: constraint.deferrable,
          source: 'table_constraint'
        });
      }
    }
    
    // 2b. Table-level foreign key constraints from table.tableConstraints
    for (const table of tables) {
      if (table.tableConstraints) {
        for (const constraint of table.tableConstraints) {
          if (constraint.type === 'foreignKey') {
            relationships.push({
              id: constraint.name || `${constraint.table}_${constraint.columns.join('_')}_fk`,
              sourceTable: constraint.table,
              sourceColumns: constraint.columns,
              targetTable: constraint.referencedTable,
              targetColumns: constraint.referencedColumns,
              type: constraint.columns.length > 1 ? 'composite_foreign_key' : 'foreign_key',
              onDelete: constraint.onDelete || 'NO ACTION',
              onUpdate: constraint.onUpdate || 'NO ACTION',
              deferrable: constraint.deferrable,
              source: 'table_constraint'
            });
          }
        }
      }
    }
    
    // 3. Self-referencing relationships
    const selfRefs = relationships.filter(r => r.sourceTable === r.targetTable);
    selfRefs.forEach(r => r.selfReferencing = true);
    
    // 4. Inferred relationships from naming conventions (user_id -> users)
    for (const table of tables) {
      for (const column of table.columns) {
        if ((column.name.endsWith('_id') || column.name.endsWith('Id')) && 
            !column.primaryKey && !column.foreignKey) {
          const potentialTable = column.name.replace(/(_id|Id)$/, '');
          const targetTable = tables.find(t => 
            t.name.toLowerCase() === potentialTable.toLowerCase() ||
            t.name.toLowerCase() === `${potentialTable}s`.toLowerCase() ||
            t.name.toLowerCase() === potentialTable.toLowerCase() + 's' ||
            t.name.toLowerCase() + 's' === potentialTable.toLowerCase()
          );
          
          if (targetTable && !relationships.find(r => 
            r.sourceTable === table.name && r.sourceColumn === column.name
          )) {
            relationships.push({
              id: `${table.name}_${column.name}_inferred`,
              sourceTable: table.name,
              sourceColumn: column.name,
              targetTable: targetTable.name,
              targetColumn: 'id',
              type: 'foreign_key_inferred',
              confidence: 'medium',
              source: 'inferred'
            });
          }
        }
      }
    }
    
    // Remove duplicate relationships
    const uniqueRelationships = [];
    const seen = new Set();
    
    for (const rel of relationships) {
      const key = `${rel.sourceTable}.${rel.sourceColumn || rel.sourceColumns?.join(',')}->${rel.targetTable}.${rel.targetColumn || rel.targetColumns?.join(',')}`;
      if (!seen.has(key)) {
        seen.add(key);
        uniqueRelationships.push(rel);
      }
    }
    
    return uniqueRelationships;
  }

  /**
   * Parse triggers
   */
  parseTriggers(content, dialect) {
    const triggers = [];
    const triggerMatches = content.matchAll(/CREATE\s+(?:OR\s+REPLACE\s+)?TRIGGER\s+(\w+)\s+([\s\S]*?)(?=;|\n\n)/gi);
    
    for (const match of triggerMatches) {
      triggers.push({
        name: match[1],
        definition: match[2].trim()
      });
    }
    
    return triggers;
  }

  /**
   * Parse sequences
   */
  parseSequences(content, dialect) {
    const sequences = [];
    const sequenceMatches = content.matchAll(/CREATE\s+(?:OR\s+REPLACE\s+)?SEQUENCE\s+(\w+)\s+([\s\S]*?)(?=;|\n\n)/gi);
    
    for (const match of sequenceMatches) {
      sequences.push({
        name: match[1],
        definition: match[2].trim()
      });
    }
    
    return sequences;
  }

  parseViews(content, dialect) {
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
    
    // Match CREATE INDEX with various formats
    const patterns = [
      // Standard: CREATE [UNIQUE] INDEX index_name ON table_name (columns)
      /CREATE\s+(?:(UNIQUE)\s+)?INDEX\s+(?:IF\s+NOT\s+EXISTS\s+)?`?"?\[?(\w+)\]?`?"?\s+ON\s+`?"?\[?(\w+)\]?`?"?\s*\(([^)]+)\)/gi,
      // With USING: CREATE INDEX index_name ON table_name USING btree (columns)
      /CREATE\s+(?:(UNIQUE)\s+)?INDEX\s+(?:IF\s+NOT\s+EXISTS\s+)?`?"?\[?(\w+)\]?`?"?\s+ON\s+`?"?\[?(\w+)\]?`?"?\s+USING\s+(\w+)\s*\(([^)]+)\)/gi
    ];
    
    for (const pattern of patterns) {
      let match;
      while ((match = pattern.exec(content)) !== null) {
        const isStandard = match.length === 5;
        indexes.push({
          name: isStandard ? match[2] : match[2],
          table: isStandard ? match[3] : match[3],
          columns: (isStandard ? match[4] : match[5]).split(',').map(col => {
            // Remove quotes, brackets, and ordering keywords
            return col.trim().replace(/`|"|\[|\]/g, '').replace(/\s+(ASC|DESC)/gi, '').trim();
          }),
          unique: !!match[1],
          type: isStandard ? 'btree' : match[4],
          definition: match[0]
        });
      }
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

  /**
   * Extract relationships from parsed tables
   */
  extractRelationships(tables) {
    const relationships = [];
    
    for (const table of tables) {
      for (const column of table.columns) {
        // Check column constraints for foreign keys
        if (column.constraints && column.constraints.references) {
          const fk = column.constraints.references;
          relationships.push({
            id: `${table.name}_${column.name}_fk`,
            sourceTable: table.name,
            sourceColumn: column.name,
            targetTable: fk.table,
            targetColumn: fk.column,
            type: 'foreign_key',
            onDelete: fk.onDelete || 'NO ACTION',
            onUpdate: fk.onUpdate || 'NO ACTION'
          });
        }
        
        // Also check for column names ending in _id or Id
        if ((column.name.endsWith('_id') || column.name.endsWith('Id')) && 
            !column.primaryKey && 
            !column.constraints?.references) {
          const potentialTable = column.name.replace(/(_id|Id)$/, '');
          const targetTable = tables.find(t => 
            t.name.toLowerCase() === potentialTable.toLowerCase() ||
            t.name.toLowerCase() === `${potentialTable}s`.toLowerCase() ||
            t.name.toLowerCase() === potentialTable.toLowerCase() + 's'
          );
          
          if (targetTable) {
            relationships.push({
              id: `${table.name}_${column.name}_inferred`,
              sourceTable: table.name,
              sourceColumn: column.name,
              targetTable: targetTable.name,
              targetColumn: 'id',
              type: 'foreign_key_inferred',
              onDelete: 'NO ACTION',
              onUpdate: 'NO ACTION'
            });
          }
        }
      }
    }
    
    return relationships;
  }

  /**
   * Verify parsed indexes against actual SQLite database
   */
  async verifyIndexes(dbPath, parsedIndexes) {
    try {
      const sqlite3 = require('sqlite3');
      const { open } = require('sqlite');
      
      const db = await open({
        filename: dbPath,
        driver: sqlite3.Database
      });
      
      const actualIndexes = await db.all(`
        SELECT name, tbl_name as table_name, sql 
        FROM sqlite_master 
        WHERE type='index' 
        AND name NOT LIKE 'sqlite_%'
      `);
      
      await db.close();
      
      // Compare parsed vs actual
      const verification = {
        parsedCount: parsedIndexes.length,
        actualCount: actualIndexes.length,
        matched: [],
        missing: [],
        extra: []
      };
      
      const actualNames = new Set(actualIndexes.map(i => i.name));
      const parsedNames = new Set(parsedIndexes.map(i => i.name));
      
      parsedIndexes.forEach(pi => {
        if (actualNames.has(pi.name)) {
          verification.matched.push(pi.name);
        } else {
          verification.missing.push(pi.name);
        }
      });
      
      actualIndexes.forEach(ai => {
        if (!parsedNames.has(ai.name)) {
          verification.extra.push(ai.name);
        }
      });
      
      return verification;
    } catch (error) {
      console.error('Index verification failed:', error);
      return null;
    }
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

  /**
   * Enhanced code file parsing for all supported languages and frameworks
   */
  async parseCodeFile(filePath, language) {
    try {
      console.log(`📊 Parsing ${language} code file: ${path.basename(filePath)}`);
      
      const content = await fs.readFile(filePath, 'utf-8');
      const fileName = path.basename(filePath, path.extname(filePath));
      
      const tables = [];
      
      // Detect framework based on content
      const framework = this.detectFramework(content, language);
      console.log(`🔍 Detected framework: ${framework}`);
      
      switch (framework) {
        case 'typeorm':
          tables.push(...await this.parseTypeORMEntities(content, filePath));
          break;
        case 'sequelize':
          tables.push(...await this.parseSequelizeModels(content, filePath));
          break;
        case 'mongoose':
          tables.push(...await this.parseMongooseSchemas(content, filePath));
          break;
        case 'eloquent':
          tables.push(...await this.parseEloquentModels(content, filePath));
          break;
        case 'hibernate':
          tables.push(...await this.parseHibernateEntities(content, filePath));
          break;
        case 'django':
          tables.push(...await this.parseDjangoModels(content, filePath));
          break;
        default:
          // Try generic parsing for undetected frameworks
          tables.push(...await this.parseGenericModels(content, filePath, language));
      }

      if (tables.length > 0) {
        return {
          databaseName: fileName,
          databaseType: framework || language,
          filePath: filePath,
          tables: tables,
          metadata: {
            totalTables: tables.length,
            totalColumns: tables.reduce((sum, table) => sum + table.columns.length, 0),
            framework: framework
          }
        };
      }

      return null;
    } catch (error) {
      console.error(`❌ Code file parsing failed for ${filePath}:`, error.message);
      return null;
    }
  }

  /**
   * Detect framework based on file content
   */
  detectFramework(content, language) {
    const lowerContent = content.toLowerCase();
    
    // TypeORM detection
    if (content.includes('@Entity') && content.includes('@Column')) {
      return 'typeorm';
    }
    
    // Sequelize detection
    if (lowerContent.includes('sequelize.define') || lowerContent.includes('datatypes.')) {
      return 'sequelize';
    }
    
    // Mongoose detection
    if (lowerContent.includes('mongoose.schema') || lowerContent.includes('mongoose.model')) {
      return 'mongoose';
    }
    
    // Laravel Eloquent detection
    if (content.includes('extends Model') && language === 'php') {
      return 'eloquent';
    }
    
    // Hibernate/JPA detection
    if (content.includes('@Entity') && content.includes('@Table') && language === 'java') {
      return 'hibernate';
    }
    
    // Django detection
    if (content.includes('models.Model') && language === 'python') {
      return 'django';
    }
    
    return null;
  }

  // Enhanced framework-specific parsing methods
  async parseTypeORMEntities(content, filePath) {
    const tables = [];
    
    try {
      // Find entity classes with @Entity decorator
      const entityMatches = content.matchAll(/export\s+class\s+(\w+)\s*{([\s\S]*?)}/g);
      
      for (const match of entityMatches) {
        if (!content.includes('@Entity')) continue;
        
        const entityName = match[1];
        const entityBody = match[2];
        
        console.log(`📋 Found TypeORM entity: ${entityName}`);
        console.log(`📝 Entity body preview: ${entityBody.substring(0, 200)}...`);
        
        const columns = [];
        
        // Extract all property declarations and check for decorators
        const propertyRegex = /(\w+):\s*([^;]+);/g;
        const allProperties = Array.from(entityBody.matchAll(propertyRegex));
        console.log(`🔍 Found ${allProperties.length} properties in ${entityName}`);
        
        for (const propMatch of allProperties) {
          const propertyName = propMatch[1];
          const propertyType = propMatch[2].trim();
          
          // Look for decorators above this property
          const beforeProperty = entityBody.substring(0, propMatch.index);
          const lines = beforeProperty.split('\n');
          const lastFewLines = lines.slice(-5).join('\n'); // Check last 5 lines for decorators
          
          // Check if this property has any column decorators
          const hasColumnDecorator = /@(?:PrimaryGeneratedColumn|Column|PrimaryColumn|CreateDateColumn|UpdateDateColumn)/.test(lastFewLines);
          console.log(`🔍 Property ${propertyName}: hasDecorator=${hasColumnDecorator}, lastLines=${lastFewLines.replace(/\n/g, ' ')}`);
          
          if (hasColumnDecorator) {
            const isPrimaryKey = /@(?:PrimaryGeneratedColumn|PrimaryColumn)/.test(lastFewLines);
            const isAutoIncrement = /@PrimaryGeneratedColumn/.test(lastFewLines);
            const isCreateDate = /@CreateDateColumn/.test(lastFewLines);
            const isUpdateDate = /@UpdateDateColumn/.test(lastFewLines);
            
            // Extract column options from @Column decorator
            const columnMatch = lastFewLines.match(/@Column\s*\(([^)]*)\)/);
            let nullable = true;
            let unique = false;
            let defaultValue = null;
            
            if (columnMatch) {
              const options = columnMatch[1];
              nullable = !options.includes('nullable: false');
              unique = options.includes('unique: true');
              const defaultMatch = options.match(/default:\s*([^,}]+)/);
              if (defaultMatch) {
                defaultValue = defaultMatch[1].trim().replace(/['"]/g, '');
              }
            }
            
            columns.push({
              id: propertyName.toLowerCase(),
              name: propertyName,
              type: this.mapTypeScriptType(propertyType),
              nullable: nullable && !isPrimaryKey,
              primaryKey: isPrimaryKey,
              unique: unique || isPrimaryKey,
              autoIncrement: isAutoIncrement || isCreateDate || isUpdateDate,
              defaultValue: defaultValue
            });
          }
        }
        
        if (columns.length > 0) {
          tables.push({
            id: entityName.toLowerCase(),
            name: entityName,
            columns: columns,
            framework: 'typeorm'
          });
        }
      }
    } catch (error) {
      console.error(`Failed to parse TypeORM entities:`, error.message);
    }
    
    return tables;
  }

  async parseEloquentModels(content, filePath) {
    const tables = [];
    
    try {
      // Find model classes
      const modelMatches = content.matchAll(/class\s+(\w+)\s+extends\s+Model\s*{([\s\S]*?)}/g);
      
      for (const match of modelMatches) {
        const modelName = match[1];
        const modelBody = match[2];
        
        console.log(`📋 Found Eloquent model: ${modelName}`);
        
        // Extract fillable fields
        const fillableMatch = modelBody.match(/protected\s+\$fillable\s*=\s*\[([\s\S]*?)\]/);
        const fillableFields = [];
        
        if (fillableMatch) {
          const fillableStr = fillableMatch[1];
          const fieldMatches = fillableStr.matchAll(/['"]([^'"]+)['"]/g);
          for (const fieldMatch of fieldMatches) {
            fillableFields.push(fieldMatch[1]);
          }
        }
        
        // Create columns
        const columns = [
          {
            id: 'id',
            name: 'id',
            type: 'INTEGER',
            nullable: false,
            primaryKey: true,
            unique: true,
            autoIncrement: true,
            defaultValue: null
          }
        ];
        
        // Add fillable fields
        fillableFields.forEach(field => {
          columns.push({
            id: field.toLowerCase(),
            name: field,
            type: 'VARCHAR',
            nullable: true,
            primaryKey: false,
            unique: false,
            autoIncrement: false,
            defaultValue: null
          });
        });
        
        // Add timestamps if not disabled
        if (!modelBody.includes('$timestamps = false')) {
          columns.push(
            {
              id: 'created_at',
              name: 'created_at',
              type: 'TIMESTAMP',
              nullable: true,
              primaryKey: false,
              unique: false,
              autoIncrement: false,
              defaultValue: null
            },
            {
              id: 'updated_at',
              name: 'updated_at',
              type: 'TIMESTAMP',
              nullable: true,
              primaryKey: false,
              unique: false,
              autoIncrement: false,
              defaultValue: null
            }
          );
        }
        
        tables.push({
          id: modelName.toLowerCase(),
          name: modelName,
          columns: columns,
          framework: 'eloquent'
        });
      }
    } catch (error) {
      console.error(`Failed to parse Eloquent models:`, error.message);
    }
    
    return tables;
  }

  // Type mapping utilities
  mapTypeScriptType(tsType) {
    const cleanType = tsType.replace(/[\[\]?]/g, '').trim();
    
    const typeMap = {
      'string': 'VARCHAR',
      'number': 'INTEGER',
      'boolean': 'BOOLEAN',
      'Date': 'DATETIME',
      'Buffer': 'BLOB'
    };
    
    return typeMap[cleanType] || cleanType.toUpperCase();
  }

  async parseGenericModels(content, filePath, language) {
    // Fallback parsing for unrecognized frameworks
    return [];
  }

  // Placeholder methods for additional functionality
  async parseSequelizeModels(content, filePath) {
    // Enhanced Sequelize parsing - use existing implementation
    return [];
  }

  async parseMongooseSchemas(content, filePath) {
    // Enhanced Mongoose parsing - use existing implementation
    return [];
  }

  async parseHibernateEntities(content, filePath) {
    // Hibernate/JPA entity parsing
    return [];
  }

  async parseDjangoModels(content, filePath) {
    // Django model parsing
    return [];
  }

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
