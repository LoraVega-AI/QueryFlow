// ORM Parser Service
// Parses ORM models from various languages to extract database schemas

import { ExtractedSchema, Table, Column, ForeignKey, Index, Constraint } from './sqlParser';

export class ORMParser {
  private readonly ORM_PATTERNS = {
    javascript: {
      sequelize: {
        define: /sequelize\.define\s*\(\s*['"`]([^'"`]+)['"`]\s*,\s*\{([\s\S]*?)\}\s*,\s*\{[\s\S]*?\}\)?/gi,
        column: /(\w+):\s*\{\s*type:\s*Sequelize\.(\w+)(?:\([^)]*\))?/gi,
        foreignKey: /(\w+):\s*\{\s*type:\s*Sequelize\.INTEGER\s*,\s*references:\s*\{\s*model:\s*['"`]([^'"`]+)['"`]\s*,\s*key:\s*['"`]([^'"`]+)['"`]/gi
      },
      mongoose: {
        schema: /mongoose\.Schema\s*\(\s*\{([\s\S]*?)\}\s*\)/gi,
        field: /(\w+):\s*\{\s*type:\s*(\w+)(?:\([^)]*\))?/gi
      },
      knex: {
        table: /knex\.schema\.createTable\s*\(\s*['"`]([^'"`]+)['"`]\s*,\s*\([\s\S]*?\)\s*\)/gi,
        column: /table\.(\w+)\(['"`]([^'"`]+)['"`]\)/gi
      }
    },
    typescript: {
      sequelize: {
        define: /sequelize\.define\s*<\s*(\w+)\s*>\s*\(\s*['"`]([^'"`]+)['"`]\s*,\s*\{([\s\S]*?)\}\s*,\s*\{[\s\S]*?\}\)?/gi,
        column: /(\w+):\s*\{\s*type:\s*DataTypes\.(\w+)(?:\([^)]*\))?/gi,
        foreignKey: /(\w+):\s*\{\s*type:\s*DataTypes\.INTEGER\s*,\s*references:\s*\{\s*model:\s*['"`]([^'"`]+)['"`]\s*,\s*key:\s*['"`]([^'"`]+)['"`]/gi
      },
      typeorm: {
        entity: /@Entity\s*\(\s*['"`]([^'"`]+)['"`]\s*\)\s*export\s+class\s+(\w+)/gi,
        column: /@Column\s*\(\s*\{([^}]*)\}\s*\)\s*(\w+):\s*(\w+)/gi,
        primaryKey: /@PrimaryGeneratedColumn\s*\(\s*\{([^}]*)\}\s*\)\s*(\w+):\s*(\w+)/gi,
        foreignKey: /@ManyToOne\s*\(\s*\(\)\s*=>\s*(\w+)/gi
      },
      prisma: {
        model: /model\s+(\w+)\s*\{([\s\S]*?)\}/gi,
        field: /(\w+)\s+(\w+)(?:\s+@[^@\n]*)*/gi
      }
    },
    python: {
      django: {
        model: /class\s+(\w+)\s*\(\s*models\.Model\s*\):([\s\S]*?)(?=class|\Z)/gi,
        field: /(\w+)\s*=\s*models\.(\w+)\([^)]*\)/gi,
        foreignKey: /(\w+)\s*=\s*models\.ForeignKey\s*\(\s*['"`]([^'"`]+)['"`]/gi
      },
      sqlalchemy: {
        table: /class\s+(\w+)\s*\(\s*Base\s*\):([\s\S]*?)(?=class|\Z)/gi,
        column: /(\w+)\s*=\s*Column\s*\(\s*(\w+)(?:\([^)]*\))?/gi,
        foreignKey: /(\w+)\s*=\s*Column\s*\(\s*Integer\s*,\s*ForeignKey\s*\(\s*['"`]([^'"`]+)['"`]/gi
      },
      flask: {
        model: /class\s+(\w+)\s*\(\s*db\.Model\s*\):([\s\S]*?)(?=class|\Z)/gi,
        field: /(\w+)\s*=\s*db\.(\w+)\([^)]*\)/gi
      }
    },
    php: {
      laravel: {
        model: /class\s+(\w+)\s+extends\s+Model\s*\{([\s\S]*?)\}/gi,
        migration: /Schema::create\s*\(\s*['"`]([^'"`]+)['"`]\s*,\s*function\s*\(\s*Blueprint\s+\$table\s*\)\s*\{([\s\S]*?)\}\s*\)/gi,
        column: /\$table->(\w+)\(['"`]([^'"`]+)['"`]\)/gi
      },
      doctrine: {
        entity: /@Entity\s*class\s+(\w+)/gi,
        column: /@Column\s*\(\s*\{([^}]*)\}\s*\)\s*private\s+\$(\w+)/gi
      }
    },
    java: {
      jpa: {
        entity: /@Entity\s*@Table\s*\(\s*name\s*=\s*['"`]([^'"`]+)['"`]\s*\)\s*public\s+class\s+(\w+)/gi,
        column: /@Column\s*\(\s*\{([^}]*)\}\s*\)\s*private\s+(\w+)\s+(\w+)/gi,
        id: /@Id\s*@GeneratedValue\s*private\s+(\w+)\s+(\w+)/gi
      },
      hibernate: {
        entity: /@Entity\s*@Table\s*\(\s*name\s*=\s*['"`]([^'"`]+)['"`]\s*\)\s*public\s+class\s+(\w+)/gi,
        column: /@Column\s*\(\s*\{([^}]*)\}\s*\)\s*private\s+(\w+)\s+(\w+)/gi
      }
    },
    csharp: {
      entityframework: {
        entity: /public\s+class\s+(\w+)\s*\{([\s\S]*?)\}/gi,
        property: /public\s+(\w+)\s+(\w+)\s*\{\s*get;\s*set;\s*\}/gi,
        key: /\[Key\]\s*public\s+(\w+)\s+(\w+)/gi
      }
    },
    ruby: {
      rails: {
        model: /class\s+(\w+)\s*<\s*ActiveRecord::Base\s*\{([\s\S]*?)\}/gi,
        migration: /create_table\s*:\s*(\w+)\s*do\s*\|t\|([\s\S]*?)end/gi,
        column: /t\.(\w+)\(['"`]([^'"`]+)['"`]\)/gi
      }
    }
  };

  async parseORMModels(filePath: string, content: string, language: string): Promise<ExtractedSchema[]> {
    const schemas: ExtractedSchema[] = [];
    
    try {
      console.log(`🔍 Parsing ORM models in ${language}: ${filePath}`);
      
      const patterns = this.ORM_PATTERNS[language as keyof typeof this.ORM_PATTERNS];
      if (!patterns) {
        console.warn(`No ORM patterns found for language: ${language}`);
        return schemas;
      }

      // Try different ORM frameworks for this language
      for (const [framework, frameworkPatterns] of Object.entries(patterns)) {
        const schema = await this.parseWithFramework(filePath, content, language, framework, frameworkPatterns);
        if (schema) {
          schemas.push(schema);
        }
      }

      return schemas;

    } catch (error) {
      console.warn(`⚠️ Error parsing ORM models in ${filePath}:`, error);
      return schemas;
    }
  }

  private async parseWithFramework(
    filePath: string, 
    content: string, 
    language: string, 
    framework: string, 
    patterns: any
  ): Promise<ExtractedSchema | null> {
    try {
      const tables: Table[] = [];
      const relationships: any[] = [];

      // Parse based on framework
      switch (framework) {
        case 'sequelize':
          return this.parseSequelizeModels(filePath, content, patterns);
        case 'mongoose':
          return this.parseMongooseModels(filePath, content, patterns);
        case 'knex':
          return this.parseKnexModels(filePath, content, patterns);
        case 'typeorm':
          return this.parseTypeOrmModels(filePath, content, patterns);
        case 'prisma':
          return this.parsePrismaModels(filePath, content, patterns);
        case 'django':
          return this.parseDjangoModels(filePath, content, patterns);
        case 'sqlalchemy':
          return this.parseSQLAlchemyModels(filePath, content, patterns);
        case 'flask':
          return this.parseFlaskModels(filePath, content, patterns);
        case 'laravel':
          return this.parseLaravelModels(filePath, content, patterns);
        case 'jpa':
        case 'hibernate':
          return this.parseJPAModels(filePath, content, patterns);
        case 'entityframework':
          return this.parseEntityFrameworkModels(filePath, content, patterns);
        case 'rails':
          return this.parseRailsModels(filePath, content, patterns);
        default:
          console.warn(`Unknown framework: ${framework}`);
          return null;
      }

    } catch (error) {
      console.warn(`Error parsing ${framework} models:`, error);
      return null;
    }
  }

  private parseSequelizeModels(filePath: string, content: string, patterns: any): ExtractedSchema | null {
    const tables: Table[] = [];
    let match;

    while ((match = patterns.define.exec(content)) !== null) {
      const tableName = match[1];
      const modelDefinition = match[2];
      
      const columns: Column[] = [];
      let columnMatch;
      
      // Reset regex lastIndex for column matching
      patterns.column.lastIndex = 0;
      while ((columnMatch = patterns.column.exec(modelDefinition)) !== null) {
        const columnName = columnMatch[1];
        const columnType = this.mapSequelizeType(columnMatch[2]);
        
        columns.push({
          name: columnName,
          type: columnType,
          nullable: !modelDefinition.includes(`${columnName}: {`) || !modelDefinition.includes('allowNull: false'),
          autoIncrement: modelDefinition.includes('autoIncrement: true'),
          unique: modelDefinition.includes('unique: true')
        });
      }

      if (columns.length > 0) {
        tables.push({
          name: tableName,
          columns,
          primaryKey: this.extractPrimaryKeyFromSequelize(modelDefinition),
          foreignKeys: this.extractForeignKeysFromSequelize(modelDefinition),
          indexes: [],
          constraints: []
        });
      }
    }

    if (tables.length === 0) return null;

    return {
      id: `sequelize_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name: this.extractSchemaName(filePath),
      type: 'orm',
      source: filePath,
      tables,
      relationships: [],
      indexes: [],
      migrations: [],
      confidence: 0.8,
      metadata: {
        filePath,
        language: language,
        framework: 'sequelize',
        orm: 'sequelize'
      }
    };
  }

  private parseTypeOrmModels(filePath: string, content: string, patterns: any): ExtractedSchema | null {
    const tables: Table[] = [];
    let match;

    while ((match = patterns.entity.exec(content)) !== null) {
      const tableName = match[1];
      const className = match[2];
      
      // Find the class definition
      const classMatch = content.match(new RegExp(`class\\s+${className}\\s*\\{([\\s\\S]*?)\\n\\}`, 'i'));
      if (!classMatch) continue;

      const classBody = classMatch[1];
      const columns: Column[] = [];

      // Parse columns
      let columnMatch;
      patterns.column.lastIndex = 0;
      while ((columnMatch = patterns.column.exec(classBody)) !== null) {
        const columnName = columnMatch[2];
        const columnType = this.mapTypeScriptType(columnMatch[3]);
        const options = this.parseColumnOptions(columnMatch[1]);
        
        columns.push({
          name: columnName,
          type: columnType,
          nullable: !options.required,
          autoIncrement: options.autoIncrement,
          unique: options.unique,
          length: options.length
        });
      }

      // Parse primary keys
      let pkMatch;
      patterns.primaryKey.lastIndex = 0;
      while ((pkMatch = patterns.primaryKey.exec(classBody)) !== null) {
        const columnName = pkMatch[2];
        const columnType = this.mapTypeScriptType(pkMatch[3]);
        
        columns.push({
          name: columnName,
          type: columnType,
          nullable: false,
          autoIncrement: true
        });
      }

      if (columns.length > 0) {
        tables.push({
          name: tableName,
          columns,
          primaryKey: [columns.find(c => c.autoIncrement)?.name || columns[0]?.name].filter(Boolean),
          foreignKeys: [],
          indexes: [],
          constraints: []
        });
      }
    }

    if (tables.length === 0) return null;

    return {
      id: `typeorm_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name: this.extractSchemaName(filePath),
      type: 'orm',
      source: filePath,
      tables,
      relationships: [],
      indexes: [],
      migrations: [],
      confidence: 0.9,
      metadata: {
        filePath,
        language: language,
        framework: 'typeorm',
        orm: 'typeorm'
      }
    };
  }

  private parseDjangoModels(filePath: string, content: string, patterns: any): ExtractedSchema | null {
    const tables: Table[] = [];
    let match;

    while ((match = patterns.model.exec(content)) !== null) {
      const className = match[1];
      const modelBody = match[2];
      
      // Convert class name to table name (Django convention)
      const tableName = this.djangoClassNameToTableName(className);
      
      const columns: Column[] = [];
      let fieldMatch;
      
      patterns.field.lastIndex = 0;
      while ((fieldMatch = patterns.field.exec(modelBody)) !== null) {
        const fieldName = fieldMatch[1];
        const fieldType = fieldMatch[2];
        
        columns.push({
          name: fieldName,
          type: this.mapDjangoFieldType(fieldType),
          nullable: !modelBody.includes(`${fieldName} = models.${fieldType}(null=False`),
          autoIncrement: fieldType === 'AutoField' || fieldType === 'BigAutoField',
          unique: modelBody.includes(`${fieldName} = models.${fieldType}(unique=True`)
        });
      }

      if (columns.length > 0) {
        tables.push({
          name: tableName,
          columns,
          primaryKey: ['id'], // Django convention
          foreignKeys: this.extractDjangoForeignKeys(modelBody),
          indexes: [],
          constraints: []
        });
      }
    }

    if (tables.length === 0) return null;

    return {
      id: `django_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name: this.extractSchemaName(filePath),
      type: 'orm',
      source: filePath,
      tables,
      relationships: [],
      indexes: [],
      migrations: [],
      confidence: 0.9,
      metadata: {
        filePath,
        language: language,
        framework: 'django',
        orm: 'django'
      }
    };
  }

  private parseLaravelModels(filePath: string, content: string, patterns: any): ExtractedSchema | null {
    const tables: Table[] = [];
    let match;

    while ((match = patterns.migration.exec(content)) !== null) {
      const tableName = match[1];
      const migrationBody = match[2];
      
      const columns: Column[] = [];
      let columnMatch;
      
      patterns.column.lastIndex = 0;
      while ((columnMatch = patterns.column.exec(migrationBody)) !== null) {
        const columnType = columnMatch[1];
        const columnName = columnMatch[2];
        
        columns.push({
          name: columnName,
          type: this.mapLaravelColumnType(columnType),
          nullable: !migrationBody.includes(`->${columnType}('${columnName}', false)`),
          autoIncrement: columnType === 'id' || columnType === 'increments'
        });
      }

      if (columns.length > 0) {
        tables.push({
          name: tableName,
          columns,
          primaryKey: ['id'], // Laravel convention
          foreignKeys: [],
          indexes: [],
          constraints: []
        });
      }
    }

    if (tables.length === 0) return null;

    return {
      id: `laravel_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name: this.extractSchemaName(filePath),
      type: 'orm',
      source: filePath,
      tables,
      relationships: [],
      indexes: [],
      migrations: [],
      confidence: 0.8,
      metadata: {
        filePath,
        language: language,
        framework: 'laravel',
        orm: 'laravel'
      }
    };
  }

  // Helper methods for different ORM frameworks
  private parseMongooseModels(filePath: string, content: string, patterns: any): ExtractedSchema | null {
    // Implementation for Mongoose schemas
    return null;
  }

  private parseKnexModels(filePath: string, content: string, patterns: any): ExtractedSchema | null {
    // Implementation for Knex schemas
    return null;
  }

  private parsePrismaModels(filePath: string, content: string, patterns: any): ExtractedSchema | null {
    // Implementation for Prisma schemas
    return null;
  }

  private parseSQLAlchemyModels(filePath: string, content: string, patterns: any): ExtractedSchema | null {
    // Implementation for SQLAlchemy models
    return null;
  }

  private parseFlaskModels(filePath: string, content: string, patterns: any): ExtractedSchema | null {
    // Implementation for Flask-SQLAlchemy models
    return null;
  }

  private parseJPAModels(filePath: string, content: string, patterns: any): ExtractedSchema | null {
    // Implementation for JPA/Hibernate entities
    return null;
  }

  private parseEntityFrameworkModels(filePath: string, content: string, patterns: any): ExtractedSchema | null {
    // Implementation for Entity Framework models
    return null;
  }

  private parseRailsModels(filePath: string, content: string, patterns: any): ExtractedSchema | null {
    // Implementation for Rails models
    return null;
  }

  // Type mapping methods
  private mapSequelizeType(sequelizeType: string): string {
    const typeMap: { [key: string]: string } = {
      'STRING': 'VARCHAR',
      'TEXT': 'TEXT',
      'INTEGER': 'INTEGER',
      'BIGINT': 'BIGINT',
      'FLOAT': 'FLOAT',
      'DOUBLE': 'DOUBLE',
      'DECIMAL': 'DECIMAL',
      'BOOLEAN': 'BOOLEAN',
      'DATE': 'DATE',
      'DATEONLY': 'DATE',
      'TIME': 'TIME',
      'NOW': 'TIMESTAMP',
      'JSON': 'JSON',
      'JSONB': 'JSONB',
      'UUID': 'UUID',
      'UUIDV1': 'UUID',
      'UUIDV4': 'UUID'
    };
    return typeMap[sequelizeType.toUpperCase()] || 'VARCHAR';
  }

  private mapTypeScriptType(tsType: string): string {
    const typeMap: { [key: string]: string } = {
      'string': 'VARCHAR',
      'number': 'INTEGER',
      'boolean': 'BOOLEAN',
      'Date': 'TIMESTAMP',
      'DateString': 'DATE'
    };
    return typeMap[tsType.toLowerCase()] || 'VARCHAR';
  }

  private mapDjangoFieldType(fieldType: string): string {
    const typeMap: { [key: string]: string } = {
      'CharField': 'VARCHAR',
      'TextField': 'TEXT',
      'IntegerField': 'INTEGER',
      'BigIntegerField': 'BIGINT',
      'FloatField': 'FLOAT',
      'DecimalField': 'DECIMAL',
      'BooleanField': 'BOOLEAN',
      'DateField': 'DATE',
      'DateTimeField': 'TIMESTAMP',
      'TimeField': 'TIME',
      'EmailField': 'VARCHAR',
      'URLField': 'VARCHAR',
      'AutoField': 'INTEGER',
      'BigAutoField': 'BIGINT',
      'ForeignKey': 'INTEGER',
      'OneToOneField': 'INTEGER',
      'ManyToManyField': 'INTEGER'
    };
    return typeMap[fieldType] || 'VARCHAR';
  }

  private mapLaravelColumnType(columnType: string): string {
    const typeMap: { [key: string]: string } = {
      'string': 'VARCHAR',
      'text': 'TEXT',
      'integer': 'INTEGER',
      'bigInteger': 'BIGINT',
      'float': 'FLOAT',
      'decimal': 'DECIMAL',
      'boolean': 'BOOLEAN',
      'date': 'DATE',
      'datetime': 'TIMESTAMP',
      'time': 'TIME',
      'timestamp': 'TIMESTAMP',
      'json': 'JSON',
      'id': 'INTEGER',
      'increments': 'INTEGER'
    };
    return typeMap[columnType] || 'VARCHAR';
  }

  // Helper methods
  private extractPrimaryKeyFromSequelize(modelDefinition: string): string[] {
    const pkMatch = modelDefinition.match(/primaryKey:\s*['"`]([^'"`]+)['"`]/i);
    return pkMatch ? [pkMatch[1]] : [];
  }

  private extractForeignKeysFromSequelize(modelDefinition: string): ForeignKey[] {
    const fks: ForeignKey[] = [];
    const fkRegex = /(\w+):\s*\{\s*type:\s*Sequelize\.INTEGER\s*,\s*references:\s*\{\s*model:\s*['"`]([^'"`]+)['"`]\s*,\s*key:\s*['"`]([^'"`]+)['"`]/gi;
    let match;
    
    while ((match = fkRegex.exec(modelDefinition)) !== null) {
      fks.push({
        column: match[1],
        referencedTable: match[2],
        referencedColumn: match[3]
      });
    }
    
    return fks;
  }

  private extractDjangoForeignKeys(modelBody: string): ForeignKey[] {
    const fks: ForeignKey[] = [];
    const fkRegex = /(\w+)\s*=\s*models\.ForeignKey\s*\(\s*['"`]([^'"`]+)['"`]/gi;
    let match;
    
    while ((match = fkRegex.exec(modelBody)) !== null) {
      fks.push({
        column: match[1],
        referencedTable: this.djangoClassNameToTableName(match[2]),
        referencedColumn: 'id'
      });
    }
    
    return fks;
  }

  private djangoClassNameToTableName(className: string): string {
    // Convert Django model class name to table name
    // e.g., "UserProfile" -> "app_userprofile"
    return className.toLowerCase();
  }

  private parseColumnOptions(optionsString: string): any {
    const options: any = {};
    
    if (optionsString.includes('required: true')) options.required = true;
    if (optionsString.includes('unique: true')) options.unique = true;
    if (optionsString.includes('autoIncrement: true')) options.autoIncrement = true;
    
    const lengthMatch = optionsString.match(/length:\s*(\d+)/);
    if (lengthMatch) options.length = parseInt(lengthMatch[1]);
    
    return options;
  }

  private extractSchemaName(filePath: string): string {
    const fileName = filePath.split(/[/\\]/).pop() || '';
    return fileName.replace(/\.[^/.]+$/, '');
  }
}

export default ORMParser;
