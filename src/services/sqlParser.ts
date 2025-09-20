// SQL Parser Service
// Parses SQL files, migrations, and schema files to extract database structure

// Define interfaces locally to avoid circular imports
export interface ExtractedSchema {
  id: string;
  name: string;
  type: 'sql' | 'orm' | 'config' | 'database';
  source: string;
  tables: Table[];
  relationships: Relationship[];
  indexes: Index[];
  migrations: Migration[];
  confidence: number;
  metadata: {
    language?: string;
    framework?: string;
    orm?: string;
    database?: string;
    filePath: string;
    lineNumbers?: number[];
  };
}

export interface Table {
  name: string;
  columns: Column[];
  primaryKey?: string[];
  foreignKeys: ForeignKey[];
  indexes: Index[];
  constraints: Constraint[];
  rowCount?: number;
}

export interface Column {
  name: string;
  type: string;
  nullable: boolean;
  defaultValue?: any;
  autoIncrement?: boolean;
  unique?: boolean;
  length?: number;
  precision?: number;
  scale?: number;
}

export interface ForeignKey {
  column: string;
  referencedTable: string;
  referencedColumn: string;
  onDelete?: string;
  onUpdate?: string;
}

export interface Index {
  name: string;
  columns: string[];
  unique: boolean;
  type?: string;
}

export interface Constraint {
  name: string;
  type: 'check' | 'unique' | 'not_null';
  expression?: string;
  columns?: string[];
}

export interface Relationship {
  id: string;
  fromTable: string;
  toTable: string;
  fromColumn: string;
  toColumn: string;
  type: 'one-to-one' | 'one-to-many' | 'many-to-many';
}

export interface Migration {
  id: string;
  name: string;
  up: string;
  down: string;
  timestamp: Date;
}

export class SQLParser {
  private readonly CREATE_TABLE_REGEX = /CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?(?:`?(\w+)`?\.)?`?(\w+)`?\s*\(/gi;
  private readonly ALTER_TABLE_REGEX = /ALTER\s+TABLE\s+(?:`?(\w+)`?\.)?`?(\w+)`?\s+(ADD|DROP|MODIFY|CHANGE|RENAME)/gi;
  private readonly COLUMN_REGEX = /`?(\w+)`?\s+(\w+(?:\(\d+(?:,\d+)?\))?)\s*(?:UNSIGNED)?\s*(?:NOT\s+NULL)?\s*(?:DEFAULT\s+([^,\s]+))?\s*(?:AUTO_INCREMENT)?\s*(?:PRIMARY\s+KEY)?\s*(?:UNIQUE)?/gi;
  private readonly FOREIGN_KEY_REGEX = /(?:CONSTRAINT\s+`?(\w+)`?\s+)?FOREIGN\s+KEY\s*\(`?(\w+)`?\)\s+REFERENCES\s+`?(\w+)`?\s*\(`?(\w+)`?\)/gi;
  private readonly INDEX_REGEX = /(?:CREATE\s+(?:UNIQUE\s+)?INDEX\s+`?(\w+)`?\s+ON\s+`?(\w+)`?|KEY\s+`?(\w+)`?\s*\(`?(\w+)`?\))/gi;
  private readonly CONSTRAINT_REGEX = /(?:CONSTRAINT\s+`?(\w+)`?\s+)?(CHECK|UNIQUE|NOT\s+NULL)\s*\(([^)]+)\)/gi;

  async parseSQLFile(filePath: string, content: string): Promise<ExtractedSchema | null> {
    try {
      console.log(`🔍 Parsing SQL file: ${filePath}`);
      
      const tables: Table[] = [];
      const relationships: any[] = [];
      const indexes: Index[] = [];
      const migrations: Migration[] = [];

      // Extract tables from CREATE TABLE statements
      const createTableMatches = this.extractCreateTableStatements(content);
      for (const match of createTableMatches) {
        const table = this.parseCreateTableStatement(match);
        if (table) {
          tables.push(table);
        }
      }

      // Extract relationships from FOREIGN KEY statements
      const foreignKeyMatches = this.extractForeignKeyStatements(content);
      for (const match of foreignKeyMatches) {
        const fk = this.parseForeignKeyStatement(match);
        if (fk) {
          relationships.push(fk);
        }
      }

      // Extract indexes
      const indexMatches = this.extractIndexStatements(content);
      for (const match of indexMatches) {
        const index = this.parseIndexStatement(match);
        if (index) {
          indexes.push(index);
        }
      }

      // If this looks like a migration file, extract migration info
      if (this.isMigrationFile(filePath)) {
        const migration = this.extractMigrationInfo(filePath, content);
        if (migration) {
          migrations.push(migration);
        }
      }

      if (tables.length === 0) {
        return null;
      }

      return {
        id: `sql_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        name: this.extractSchemaName(filePath),
        type: 'sql',
        source: filePath,
        tables,
        relationships,
        indexes,
        migrations,
        confidence: this.calculateSQLConfidence(content, tables.length),
        metadata: {
          filePath,
          language: 'sql'
        }
      };

    } catch (error) {
      console.warn(`⚠️ Error parsing SQL file ${filePath}:`, error);
      return null;
    }
  }

  async parseMigrationFile(filePath: string, content: string): Promise<ExtractedSchema | null> {
    try {
      console.log(`🔍 Parsing migration file: ${filePath}`);
      
      const tables: Table[] = [];
      const relationships: any[] = [];
      const migrations: Migration[] = [];

      // Extract migration info
      const migration = this.extractMigrationInfo(filePath, content);
      if (migration) {
        migrations.push(migration);
      }

      // Parse the migration content for schema changes
      const schema = await this.parseSQLFile(filePath, content);
      if (schema) {
        tables.push(...schema.tables);
        relationships.push(...schema.relationships);
      }

      if (tables.length === 0 && migrations.length === 0) {
        return null;
      }

      return {
        id: `migration_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        name: this.extractMigrationName(filePath),
        type: 'sql',
        source: filePath,
        tables,
        relationships,
        indexes: [],
        migrations,
        confidence: 0.9, // High confidence for migration files
        metadata: {
          filePath,
          language: 'sql',
          framework: this.detectMigrationFramework(filePath)
        }
      };

    } catch (error) {
      console.warn(`⚠️ Error parsing migration file ${filePath}:`, error);
      return null;
    }
  }

  async parseSchemaFile(filePath: string, content: string): Promise<ExtractedSchema | null> {
    try {
      console.log(`🔍 Parsing schema file: ${filePath}`);
      
      // Schema files are typically more structured, so we can be more confident
      const schema = await this.parseSQLFile(filePath, content);
      if (schema) {
        schema.confidence = Math.min(schema.confidence + 0.1, 1.0);
        schema.metadata.framework = this.detectSchemaFramework(filePath);
      }
      
      return schema;

    } catch (error) {
      console.warn(`⚠️ Error parsing schema file ${filePath}:`, error);
      return null;
    }
  }

  private extractCreateTableStatements(content: string): string[] {
    const matches: string[] = [];
    let match;
    
    while ((match = this.CREATE_TABLE_REGEX.exec(content)) !== null) {
      // Find the complete CREATE TABLE statement
      const start = match.index;
      const tableName = match[2];
      
      // Find the matching closing parenthesis
      let depth = 0;
      let end = start;
      let inString = false;
      let stringChar = '';
      
      for (let i = start; i < content.length; i++) {
        const char = content[i];
        
        if (!inString) {
          if (char === "'" || char === '"' || char === '`') {
            inString = true;
            stringChar = char;
          } else if (char === '(') {
            depth++;
          } else if (char === ')') {
            depth--;
            if (depth === 0) {
              end = i + 1;
              break;
            }
          }
        } else if (char === stringChar) {
          inString = false;
        }
      }
      
      if (end > start) {
        matches.push(content.substring(start, end));
      }
    }
    
    return matches;
  }

  private parseCreateTableStatement(statement: string): Table | null {
    try {
      const tableNameMatch = statement.match(/CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?(?:`?(\w+)`?\.)?`?(\w+)`?/i);
      if (!tableNameMatch) return null;
      
      const tableName = tableNameMatch[2];
      const columns: Column[] = [];
      const foreignKeys: ForeignKey[] = [];
      const indexes: Index[] = [];
      const constraints: Constraint[] = [];

      // Extract column definitions
      const columnMatches = this.extractColumnDefinitions(statement);
      for (const colMatch of columnMatches) {
        const column = this.parseColumnDefinition(colMatch);
        if (column) {
          columns.push(column);
        }
      }

      // Extract foreign keys
      const fkMatches = this.extractForeignKeyStatements(statement);
      for (const fkMatch of fkMatches) {
        const fk = this.parseForeignKeyStatement(fkMatch);
        if (fk) {
          foreignKeys.push(fk);
        }
      }

      // Extract indexes
      const indexMatches = this.extractIndexStatements(statement);
      for (const indexMatch of indexMatches) {
        const index = this.parseIndexStatement(indexMatch);
        if (index) {
          indexes.push(index);
        }
      }

      // Extract constraints
      const constraintMatches = this.extractConstraintStatements(statement);
      for (const constraintMatch of constraintMatches) {
        const constraint = this.parseConstraintStatement(constraintMatch);
        if (constraint) {
          constraints.push(constraint);
        }
      }

      return {
        name: tableName,
        columns,
        primaryKey: this.extractPrimaryKey(statement),
        foreignKeys,
        indexes,
        constraints
      };

    } catch (error) {
      console.warn('Error parsing CREATE TABLE statement:', error);
      return null;
    }
  }

  private extractColumnDefinitions(statement: string): string[] {
    const matches: string[] = [];
    const lines = statement.split('\n');
    
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('CREATE') && !trimmed.startsWith('(') && !trimmed.startsWith(')')) {
        // Skip constraint lines
        if (!trimmed.toUpperCase().includes('CONSTRAINT') && 
            !trimmed.toUpperCase().includes('FOREIGN KEY') &&
            !trimmed.toUpperCase().includes('PRIMARY KEY') &&
            !trimmed.toUpperCase().includes('KEY') &&
            !trimmed.toUpperCase().includes('INDEX')) {
          matches.push(trimmed.replace(/,$/, ''));
        }
      }
    }
    
    return matches;
  }

  private parseColumnDefinition(definition: string): Column | null {
    try {
      const parts = definition.trim().split(/\s+/);
      if (parts.length < 2) return null;
      
      const name = parts[0].replace(/`/g, '');
      const type = parts[1].toLowerCase();
      const nullable = !definition.toUpperCase().includes('NOT NULL');
      const autoIncrement = definition.toUpperCase().includes('AUTO_INCREMENT');
      const unique = definition.toUpperCase().includes('UNIQUE');
      
      // Extract default value
      const defaultMatch = definition.match(/DEFAULT\s+([^,\s]+)/i);
      const defaultValue = defaultMatch ? defaultMatch[1] : undefined;
      
      // Extract length/precision
      const lengthMatch = type.match(/(\w+)\((\d+)(?:,(\d+))?\)/);
      const length = lengthMatch ? parseInt(lengthMatch[2]) : undefined;
      const precision = lengthMatch ? parseInt(lengthMatch[2]) : undefined;
      const scale = lengthMatch && lengthMatch[3] ? parseInt(lengthMatch[3]) : undefined;
      
      return {
        name,
        type: type.split('(')[0],
        nullable,
        defaultValue,
        autoIncrement,
        unique,
        length,
        precision,
        scale
      };

    } catch (error) {
      console.warn('Error parsing column definition:', error);
      return null;
    }
  }

  private extractForeignKeyStatements(content: string): string[] {
    const matches: string[] = [];
    let match;
    
    while ((match = this.FOREIGN_KEY_REGEX.exec(content)) !== null) {
      matches.push(match[0]);
    }
    
    return matches;
  }

  private parseForeignKeyStatement(statement: string): ForeignKey | null {
    try {
      const match = statement.match(/(?:CONSTRAINT\s+`?(\w+)`?\s+)?FOREIGN\s+KEY\s*\(`?(\w+)`?\)\s+REFERENCES\s+`?(\w+)`?\s*\(`?(\w+)`?\)/i);
      if (!match) return null;
      
      return {
        column: match[2],
        referencedTable: match[3],
        referencedColumn: match[4],
        onDelete: this.extractOnAction(statement, 'DELETE'),
        onUpdate: this.extractOnAction(statement, 'UPDATE')
      };

    } catch (error) {
      console.warn('Error parsing foreign key statement:', error);
      return null;
    }
  }

  private extractIndexStatements(content: string): string[] {
    const matches: string[] = [];
    let match;
    
    while ((match = this.INDEX_REGEX.exec(content)) !== null) {
      matches.push(match[0]);
    }
    
    return matches;
  }

  private parseIndexStatement(statement: string): Index | null {
    try {
      // Handle CREATE INDEX statements
      const createIndexMatch = statement.match(/CREATE\s+(UNIQUE\s+)?INDEX\s+`?(\w+)`?\s+ON\s+`?(\w+)`?\s*\(`?(\w+)`?\)/i);
      if (createIndexMatch) {
        return {
          name: createIndexMatch[2],
          columns: [createIndexMatch[4]],
          unique: !!createIndexMatch[1],
          type: 'btree'
        };
      }
      
      // Handle KEY statements in CREATE TABLE
      const keyMatch = statement.match(/(?:UNIQUE\s+)?KEY\s+`?(\w+)`?\s*\(`?(\w+)`?\)/i);
      if (keyMatch) {
        return {
          name: keyMatch[1],
          columns: [keyMatch[2]],
          unique: statement.toUpperCase().includes('UNIQUE'),
          type: 'btree'
        };
      }
      
      return null;

    } catch (error) {
      console.warn('Error parsing index statement:', error);
      return null;
    }
  }

  private extractConstraintStatements(content: string): string[] {
    const matches: string[] = [];
    let match;
    
    while ((match = this.CONSTRAINT_REGEX.exec(content)) !== null) {
      matches.push(match[0]);
    }
    
    return matches;
  }

  private parseConstraintStatement(statement: string): Constraint | null {
    try {
      const match = statement.match(/(?:CONSTRAINT\s+`?(\w+)`?\s+)?(CHECK|UNIQUE|NOT\s+NULL)\s*\(([^)]+)\)/i);
      if (!match) return null;
      
      return {
        name: match[1] || `constraint_${Date.now()}`,
        type: match[2].toLowerCase().replace(/\s+/, '_') as 'check' | 'unique' | 'not_null',
        expression: match[3],
        columns: this.extractColumnsFromExpression(match[3])
      };

    } catch (error) {
      console.warn('Error parsing constraint statement:', error);
      return null;
    }
  }

  private extractPrimaryKey(statement: string): string[] {
    const pkMatch = statement.match(/PRIMARY\s+KEY\s*\(([^)]+)\)/i);
    if (pkMatch) {
      return pkMatch[1].split(',').map(col => col.trim().replace(/`/g, ''));
    }
    return [];
  }

  private extractOnAction(statement: string, action: string): string | undefined {
    const regex = new RegExp(`ON\\s+${action}\\s+(\\w+)`, 'i');
    const match = statement.match(regex);
    return match ? match[1].toUpperCase() : undefined;
  }

  private extractColumnsFromExpression(expression: string): string[] {
    // Simple extraction of column names from constraint expressions
    const columnMatches = expression.match(/`?(\w+)`?/g);
    return columnMatches ? columnMatches.map(match => match.replace(/`/g, '')) : [];
  }

  private extractMigrationInfo(filePath: string, content: string): Migration | null {
    try {
      const fileName = filePath.split(/[/\\]/).pop() || '';
      const timestamp = this.extractTimestampFromFileName(fileName);
      
      // Extract up and down migrations
      const upMatch = content.match(/--\s*Up\s*Migration\s*:?\s*([\s\S]*?)(?=--\s*Down|$)/i);
      const downMatch = content.match(/--\s*Down\s*Migration\s*:?\s*([\s\S]*?)$/i);
      
      return {
        id: `migration_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        name: fileName.replace(/\.[^/.]+$/, ''),
        up: upMatch ? upMatch[1].trim() : content,
        down: downMatch ? downMatch[1].trim() : '',
        timestamp: timestamp || new Date()
      };

    } catch (error) {
      console.warn('Error extracting migration info:', error);
      return null;
    }
  }

  private extractTimestampFromFileName(fileName: string): Date | null {
    // Common migration timestamp patterns
    const patterns = [
      /(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})/, // YYYYMMDDHHMMSS
      /(\d{4})_(\d{2})_(\d{2})_(\d{2})_(\d{2})_(\d{2})/, // YYYY_MM_DD_HH_MM_SS
      /(\d{10})/, // Unix timestamp
      /(\d{13})/ // Unix timestamp with milliseconds
    ];
    
    for (const pattern of patterns) {
      const match = fileName.match(pattern);
      if (match) {
        if (match.length === 7) {
          // YYYYMMDDHHMMSS format
          const [, year, month, day, hour, minute, second] = match;
          return new Date(parseInt(year), parseInt(month) - 1, parseInt(day), parseInt(hour), parseInt(minute), parseInt(second));
        } else if (match.length === 2) {
          // Unix timestamp
          const timestamp = parseInt(match[1]);
          return new Date(timestamp > 1e10 ? timestamp : timestamp * 1000);
        }
      }
    }
    
    return null;
  }

  private isMigrationFile(filePath: string): boolean {
    const fileName = filePath.toLowerCase();
    return fileName.includes('migration') || 
           fileName.includes('migrate') ||
           /^\d{4}[\d_]*\.sql$/.test(fileName) ||
           /^\d{10,13}_/.test(fileName);
  }

  private extractSchemaName(filePath: string): string {
    const fileName = filePath.split(/[/\\]/).pop() || '';
    return fileName.replace(/\.[^/.]+$/, '');
  }

  private extractMigrationName(filePath: string): string {
    const fileName = filePath.split(/[/\\]/).pop() || '';
    return fileName.replace(/\.[^/.]+$/, '').replace(/^\d+[_\d]*_/, '');
  }

  private detectMigrationFramework(filePath: string): string {
    const path = filePath.toLowerCase();
    if (path.includes('django')) return 'django';
    if (path.includes('laravel')) return 'laravel';
    if (path.includes('rails')) return 'rails';
    if (path.includes('sequelize')) return 'sequelize';
    if (path.includes('knex')) return 'knex';
    if (path.includes('prisma')) return 'prisma';
    return 'unknown';
  }

  private detectSchemaFramework(filePath: string): string {
    const path = filePath.toLowerCase();
    if (path.includes('django')) return 'django';
    if (path.includes('laravel')) return 'laravel';
    if (path.includes('rails')) return 'rails';
    if (path.includes('sequelize')) return 'sequelize';
    if (path.includes('knex')) return 'knex';
    if (path.includes('prisma')) return 'prisma';
    return 'unknown';
  }

  private calculateSQLConfidence(content: string, tableCount: number): number {
    let confidence = 0.5; // Base confidence
    
    // Boost confidence based on content quality
    if (content.includes('CREATE TABLE')) confidence += 0.2;
    if (content.includes('PRIMARY KEY')) confidence += 0.1;
    if (content.includes('FOREIGN KEY')) confidence += 0.1;
    if (tableCount > 0) confidence += Math.min(tableCount * 0.05, 0.2);
    
    return Math.min(confidence, 1.0);
  }
}

export default SQLParser;
