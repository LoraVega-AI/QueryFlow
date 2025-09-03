// Natural Language Query Processor
// Converts plain English queries to SQL statements

export interface NLQueryResult {
  sql: string;
  confidence: number;
  explanation: string;
  suggestions?: string[];
  warnings?: string[];
  parameters?: Record<string, any>;
}

export interface QueryPattern {
  pattern: RegExp;
  sqlTemplate: string;
  confidence: number;
  description: string;
  examples: string[];
  requiredFields?: string[];
  optionalFields?: string[];
}

export interface TableInfo {
  name: string;
  columns: string[];
  primaryKey?: string;
  foreignKeys?: Record<string, string>;
  sampleData?: Record<string, any>[];
}

export class NaturalLanguageProcessor {
  private patterns: QueryPattern[] = [];
  private tableInfo: TableInfo[] = [];
  private commonWords: Set<string>;

  constructor() {
    this.initializeCommonWords();
    this.initializeQueryPatterns();
  }

  // Initialize common English words to filter out
  private initializeCommonWords(): void {
    this.commonWords = new Set([
      'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by',
      'from', 'up', 'about', 'into', 'through', 'during', 'before', 'after', 'above', 'below',
      'between', 'among', 'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has',
      'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might', 'must',
      'can', 'shall', 'this', 'that', 'these', 'those', 'i', 'you', 'he', 'she', 'it', 'we',
      'they', 'me', 'him', 'her', 'us', 'them', 'my', 'your', 'his', 'her', 'its', 'our',
      'their', 'what', 'which', 'who', 'whom', 'whose', 'where', 'when', 'why', 'how',
      'all', 'any', 'both', 'each', 'few', 'more', 'most', 'other', 'some', 'such', 'no',
      'nor', 'not', 'only', 'own', 'same', 'so', 'than', 'too', 'very', 'just', 'now'
    ]);
  }

  // Initialize query patterns for natural language processing
  private initializeQueryPatterns(): void {
    this.patterns = [
      // SELECT queries
      {
        pattern: /show me (?:all )?(?:the )?(\w+)(?:\s+where\s+(.+))?/i,
        sqlTemplate: 'SELECT * FROM {table} {where}',
        confidence: 0.9,
        description: 'Show all records from a table',
        examples: ['show me all users', 'show me the products where price > 100'],
        requiredFields: ['table']
      },
      {
        pattern: /find (?:all )?(?:the )?(\w+)(?:\s+where\s+(.+))?/i,
        sqlTemplate: 'SELECT * FROM {table} {where}',
        confidence: 0.9,
        description: 'Find records in a table',
        examples: ['find all customers', 'find the orders where status = pending'],
        requiredFields: ['table']
      },
      {
        pattern: /list (?:all )?(?:the )?(\w+)(?:\s+where\s+(.+))?/i,
        sqlTemplate: 'SELECT * FROM {table} {where}',
        confidence: 0.9,
        description: 'List records from a table',
        examples: ['list all products', 'list the users where active = true'],
        requiredFields: ['table']
      },
      {
        pattern: /get (?:all )?(?:the )?(\w+)(?:\s+where\s+(.+))?/i,
        sqlTemplate: 'SELECT * FROM {table} {where}',
        confidence: 0.9,
        description: 'Get records from a table',
        examples: ['get all orders', 'get the customers where city = New York'],
        requiredFields: ['table']
      },

      // SELECT with specific columns
      {
        pattern: /show me (?:the )?(\w+(?:\s+and\s+\w+)*) (?:from|in) (?:the )?(\w+) table/i,
        sqlTemplate: 'SELECT {columns} FROM {table}',
        confidence: 0.8,
        description: 'Show specific columns from a table',
        examples: ['show me name and email from users table', 'show me id and title from products table'],
        requiredFields: ['columns', 'table']
      },
      {
        pattern: /what (?:are )?(?:the )?(\w+(?:\s+and\s+\w+)*) (?:of|for) (?:the )?(\w+)/i,
        sqlTemplate: 'SELECT {columns} FROM {table}',
        confidence: 0.7,
        description: 'Get specific attributes of records',
        examples: ['what are the names of the users', 'what are the prices of the products'],
        requiredFields: ['columns', 'table']
      },

      // COUNT queries
      {
        pattern: /how many (\w+)(?:\s+are there)?(?:\s+where\s+(.+))?/i,
        sqlTemplate: 'SELECT COUNT(*) FROM {table} {where}',
        confidence: 0.9,
        description: 'Count records in a table',
        examples: ['how many users are there', 'how many orders where status = completed'],
        requiredFields: ['table']
      },
      {
        pattern: /count (?:all )?(?:the )?(\w+)(?:\s+where\s+(.+))?/i,
        sqlTemplate: 'SELECT COUNT(*) FROM {table} {where}',
        confidence: 0.9,
        description: 'Count records in a table',
        examples: ['count all products', 'count the users where active = true'],
        requiredFields: ['table']
      },

      // INSERT queries
      {
        pattern: /add (?:a )?new (\w+)(?:\s+with\s+(.+))?/i,
        sqlTemplate: 'INSERT INTO {table} {values}',
        confidence: 0.8,
        description: 'Add a new record to a table',
        examples: ['add a new user', 'add a new product with name = Laptop and price = 999'],
        requiredFields: ['table']
      },
      {
        pattern: /create (?:a )?new (\w+)(?:\s+with\s+(.+))?/i,
        sqlTemplate: 'INSERT INTO {table} {values}',
        confidence: 0.8,
        description: 'Create a new record in a table',
        examples: ['create a new order', 'create a new customer with name = John and email = john@example.com'],
        requiredFields: ['table']
      },

      // UPDATE queries
      {
        pattern: /update (?:the )?(\w+)(?:\s+where\s+(.+))?(?:\s+set\s+(.+))?/i,
        sqlTemplate: 'UPDATE {table} SET {set} {where}',
        confidence: 0.8,
        description: 'Update records in a table',
        examples: ['update users set status = active', 'update products where id = 1 set price = 199'],
        requiredFields: ['table']
      },
      {
        pattern: /change (?:the )?(\w+)(?:\s+where\s+(.+))?(?:\s+to\s+(.+))?/i,
        sqlTemplate: 'UPDATE {table} SET {set} {where}',
        confidence: 0.7,
        description: 'Change values in a table',
        examples: ['change user status to active', 'change product price where id = 1 to 199'],
        requiredFields: ['table']
      },

      // DELETE queries
      {
        pattern: /delete (?:all )?(?:the )?(\w+)(?:\s+where\s+(.+))?/i,
        sqlTemplate: 'DELETE FROM {table} {where}',
        confidence: 0.8,
        description: 'Delete records from a table',
        examples: ['delete all users', 'delete the orders where status = cancelled'],
        requiredFields: ['table']
      },
      {
        pattern: /remove (?:all )?(?:the )?(\w+)(?:\s+where\s+(.+))?/i,
        sqlTemplate: 'DELETE FROM {table} {where}',
        confidence: 0.8,
        description: 'Remove records from a table',
        examples: ['remove all products', 'remove the customers where inactive = true'],
        requiredFields: ['table']
      },

      // JOIN queries
      {
        pattern: /show me (?:the )?(\w+) (?:and|with) (?:their )?(\w+)(?:\s+where\s+(.+))?/i,
        sqlTemplate: 'SELECT * FROM {table1} JOIN {table2} ON {table1}.{key} = {table2}.{key} {where}',
        confidence: 0.7,
        description: 'Show records with related data',
        examples: ['show me users and their orders', 'show me products and their categories'],
        requiredFields: ['table1', 'table2']
      },

      // ORDER BY queries
      {
        pattern: /show me (?:all )?(?:the )?(\w+)(?:\s+where\s+(.+))?(?:\s+sorted by\s+(\w+)(?:\s+(asc|desc))?)?/i,
        sqlTemplate: 'SELECT * FROM {table} {where} ORDER BY {orderBy} {direction}',
        confidence: 0.8,
        description: 'Show records sorted by a column',
        examples: ['show me all users sorted by name', 'show me products where price > 100 sorted by price desc'],
        requiredFields: ['table']
      },

      // GROUP BY queries
      {
        pattern: /group (?:the )?(\w+) by (\w+)(?:\s+and show\s+(.+))?/i,
        sqlTemplate: 'SELECT {groupBy}, {aggregate} FROM {table} GROUP BY {groupBy}',
        confidence: 0.7,
        description: 'Group records by a column',
        examples: ['group users by city', 'group orders by status and show count'],
        requiredFields: ['table', 'groupBy']
      },

      // AGGREGATE queries
      {
        pattern: /what is (?:the )?(average|sum|min|max) (?:of )?(\w+)(?:\s+in\s+(?:the )?(\w+))?(?:\s+where\s+(.+))?/i,
        sqlTemplate: 'SELECT {aggregate}({column}) FROM {table} {where}',
        confidence: 0.8,
        description: 'Calculate aggregate values',
        examples: ['what is the average price of products', 'what is the sum of orders where status = completed'],
        requiredFields: ['aggregate', 'column', 'table']
      }
    ];
  }

  // Set table information for better query processing
  setTableInfo(tables: TableInfo[]): void {
    this.tableInfo = tables;
  }

  // Process natural language query
  processQuery(query: string): NLQueryResult {
    const normalizedQuery = this.normalizeQuery(query);
    
    // Find matching pattern
    for (const pattern of this.patterns) {
      const match = normalizedQuery.match(pattern.pattern);
      if (match) {
        try {
          const result = this.buildSQLFromPattern(pattern, match, normalizedQuery);
          if (result) {
            return result;
          }
        } catch (error) {
          console.warn('Error processing pattern:', error);
        }
      }
    }

    // If no pattern matches, try to extract basic information
    return this.fallbackProcessing(normalizedQuery);
  }

  // Normalize the query for better pattern matching
  private normalizeQuery(query: string): string {
    return query
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ') // Remove punctuation
      .replace(/\s+/g, ' ') // Normalize whitespace
      .trim();
  }

  // Build SQL from matched pattern
  private buildSQLFromPattern(pattern: QueryPattern, match: RegExpMatchArray, query: string): NLQueryResult | null {
    const sqlTemplate = pattern.sqlTemplate;
    let sql = sqlTemplate;
    let confidence = pattern.confidence;
    const warnings: string[] = [];
    const suggestions: string[] = [];
    const parameters: Record<string, any> = {};

    try {
      // Extract table name
      const tableName = this.extractTableName(match, pattern);
      if (!tableName) {
        return null;
      }

      // Validate table exists
      const tableInfo = this.tableInfo.find(t => t.name.toLowerCase() === tableName.toLowerCase());
      if (!tableInfo) {
        warnings.push(`Table "${tableName}" not found in schema`);
        confidence *= 0.7;
      }

      // Replace placeholders
      sql = sql.replace('{table}', tableName);

      // Handle WHERE clause
      if (sql.includes('{where}')) {
        const whereClause = this.extractWhereClause(match, query, tableInfo);
        sql = sql.replace('{where}', whereClause ? `WHERE ${whereClause}` : '');
      }

      // Handle SET clause for UPDATE
      if (sql.includes('{set}')) {
        const setClause = this.extractSetClause(match, query, tableInfo);
        sql = sql.replace('{set}', setClause || '');
      }

      // Handle VALUES clause for INSERT
      if (sql.includes('{values}')) {
        const valuesClause = this.extractValuesClause(match, query, tableInfo);
        sql = sql.replace('{values}', valuesClause || '');
      }

      // Handle columns
      if (sql.includes('{columns}')) {
        const columns = this.extractColumns(match, query, tableInfo);
        sql = sql.replace('{columns}', columns || '*');
      }

      // Handle ORDER BY
      if (sql.includes('{orderBy}')) {
        const orderBy = this.extractOrderBy(match, query, tableInfo);
        sql = sql.replace('{orderBy}', orderBy || '');
        sql = sql.replace('{direction}', this.extractDirection(match) || '');
      }

      // Handle GROUP BY
      if (sql.includes('{groupBy}')) {
        const groupBy = this.extractGroupBy(match, query, tableInfo);
        sql = sql.replace('{groupBy}', groupBy || '');
      }

      // Handle aggregate functions
      if (sql.includes('{aggregate}')) {
        const aggregate = this.extractAggregate(match, query);
        sql = sql.replace('{aggregate}', aggregate || 'COUNT');
      }

      // Handle column for aggregate
      if (sql.includes('{column}')) {
        const column = this.extractColumn(match, query, tableInfo);
        sql = sql.replace('{column}', column || '*');
      }

      // Clean up SQL
      sql = this.cleanSQL(sql);

      // Generate explanation
      const explanation = this.generateExplanation(pattern, match, sql);

      // Generate suggestions
      if (tableInfo) {
        suggestions.push(...this.generateSuggestions(pattern, tableInfo));
      }

      return {
        sql,
        confidence,
        explanation,
        suggestions,
        warnings,
        parameters
      };

    } catch (error) {
      console.error('Error building SQL:', error);
      return null;
    }
  }

  // Extract table name from match
  private extractTableName(match: RegExpMatchArray, pattern: QueryPattern): string | null {
    // Try to find table name in the match groups
    for (let i = 1; i < match.length; i++) {
      const group = match[i];
      if (group && this.isValidTableName(group)) {
        return group;
      }
    }

    // Try to extract from the full match
    const fullMatch = match[0];
    const words = fullMatch.split(' ');
    
    // Look for common table indicators
    for (let i = 0; i < words.length; i++) {
      const word = words[i];
      if (this.isValidTableName(word)) {
        return word;
      }
    }

    return null;
  }

  // Check if a word is a valid table name
  private isValidTableName(word: string): boolean {
    if (!word || word.length < 2) return false;
    if (this.commonWords.has(word.toLowerCase())) return false;
    if (word.match(/^\d+$/)) return false; // Not just numbers
    return true;
  }

  // Extract WHERE clause
  private extractWhereClause(match: RegExpMatchArray, query: string, tableInfo?: TableInfo): string | null {
    // Look for "where" in the original query
    const whereMatch = query.match(/where\s+(.+)/i);
    if (whereMatch) {
      return this.parseCondition(whereMatch[1], tableInfo);
    }
    return null;
  }

  // Extract SET clause for UPDATE
  private extractSetClause(match: RegExpMatchArray, query: string, tableInfo?: TableInfo): string | null {
    const setMatch = query.match(/set\s+(.+)/i);
    if (setMatch) {
      return this.parseAssignment(setMatch[1], tableInfo);
    }
    return null;
  }

  // Extract VALUES clause for INSERT
  private extractValuesClause(match: RegExpMatchArray, query: string, tableInfo?: TableInfo): string | null {
    const withMatch = query.match(/with\s+(.+)/i);
    if (withMatch) {
      return this.parseAssignment(withMatch[1], tableInfo);
    }
    return null;
  }

  // Extract columns
  private extractColumns(match: RegExpMatchArray, query: string, tableInfo?: TableInfo): string | null {
    // Look for column names in the match
    for (let i = 1; i < match.length; i++) {
      const group = match[i];
      if (group && group.includes(' and ')) {
        // Handle multiple columns
        const columns = group.split(' and ').map(col => col.trim());
        return columns.join(', ');
      } else if (group && this.isValidColumnName(group, tableInfo)) {
        return group;
      }
    }
    return null;
  }

  // Extract ORDER BY clause
  private extractOrderBy(match: RegExpMatchArray, query: string, tableInfo?: TableInfo): string | null {
    const sortedMatch = query.match(/sorted by\s+(\w+)/i);
    if (sortedMatch) {
      return sortedMatch[1];
    }
    return null;
  }

  // Extract sort direction
  private extractDirection(match: RegExpMatchArray): string | null {
    const directionMatch = match[0].match(/(asc|desc)/i);
    return directionMatch ? directionMatch[1].toUpperCase() : null;
  }

  // Extract GROUP BY clause
  private extractGroupBy(match: RegExpMatchArray, query: string, tableInfo?: TableInfo): string | null {
    const groupMatch = query.match(/group.*?by\s+(\w+)/i);
    if (groupMatch) {
      return groupMatch[1];
    }
    return null;
  }

  // Extract aggregate function
  private extractAggregate(match: RegExpMatchArray, query: string): string | null {
    const aggregateMatch = query.match(/(average|sum|min|max|count)/i);
    if (aggregateMatch) {
      const agg = aggregateMatch[1].toLowerCase();
      const mapping: Record<string, string> = {
        'average': 'AVG',
        'sum': 'SUM',
        'min': 'MIN',
        'max': 'MAX',
        'count': 'COUNT'
      };
      return mapping[agg] || 'COUNT';
    }
    return null;
  }

  // Extract column for aggregate
  private extractColumn(match: RegExpMatchArray, query: string, tableInfo?: TableInfo): string | null {
    // Look for column names after aggregate functions
    const columnMatch = query.match(/(?:average|sum|min|max|count)\s+(?:of\s+)?(\w+)/i);
    if (columnMatch) {
      return columnMatch[1];
    }
    return null;
  }

  // Parse condition string
  private parseCondition(condition: string, tableInfo?: TableInfo): string {
    // Simple condition parsing
    // Look for common operators
    const operators = ['=', '>', '<', '>=', '<=', '!=', 'like', 'contains'];
    
    for (const op of operators) {
      if (condition.toLowerCase().includes(op)) {
        const parts = condition.toLowerCase().split(op);
        if (parts.length === 2) {
          const left = parts[0].trim();
          const right = parts[1].trim();
          
          // Clean up the right side (remove quotes, etc.)
          const cleanRight = right.replace(/['"]/g, '');
          
          return `${left} ${op.toUpperCase()} '${cleanRight}'`;
        }
      }
    }
    
    return condition;
  }

  // Parse assignment string
  private parseAssignment(assignment: string, tableInfo?: TableInfo): string {
    // Simple assignment parsing
    const assignments = assignment.split(' and ');
    const parsed = assignments.map(assign => {
      if (assign.includes('=')) {
        const parts = assign.split('=');
        if (parts.length === 2) {
          const left = parts[0].trim();
          const right = parts[1].trim().replace(/['"]/g, '');
          return `${left} = '${right}'`;
        }
      }
      return assign;
    });
    
    return parsed.join(', ');
  }

  // Check if column name is valid
  private isValidColumnName(column: string, tableInfo?: TableInfo): boolean {
    if (!tableInfo) return true; // Assume valid if no table info
    return tableInfo.columns.some(col => col.toLowerCase() === column.toLowerCase());
  }

  // Clean up SQL
  private cleanSQL(sql: string): string {
    return sql
      .replace(/\s+/g, ' ') // Normalize whitespace
      .replace(/\s*\{\w+\}\s*/g, '') // Remove any remaining placeholders
      .trim();
  }

  // Generate explanation
  private generateExplanation(pattern: QueryPattern, match: RegExpMatchArray, sql: string): string {
    let explanation = pattern.description;
    
    if (sql.includes('WHERE')) {
      explanation += ' with filtering conditions';
    }
    
    if (sql.includes('ORDER BY')) {
      explanation += ' sorted by specified column';
    }
    
    if (sql.includes('GROUP BY')) {
      explanation += ' grouped by specified column';
    }
    
    if (sql.includes('COUNT') || sql.includes('SUM') || sql.includes('AVG')) {
      explanation += ' with aggregate calculations';
    }
    
    return explanation;
  }

  // Generate suggestions
  private generateSuggestions(pattern: QueryPattern, tableInfo: TableInfo): string[] {
    const suggestions: string[] = [];
    
    // Suggest specific columns
    if (tableInfo.columns.length > 0) {
      suggestions.push(`Try specifying columns: "show me name, email from ${tableInfo.name}"`);
    }
    
    // Suggest filtering
    suggestions.push(`Add conditions: "show me ${tableInfo.name} where [condition]"`);
    
    // Suggest sorting
    suggestions.push(`Sort results: "show me ${tableInfo.name} sorted by [column]"`);
    
    return suggestions;
  }

  // Fallback processing when no pattern matches
  private fallbackProcessing(query: string): NLQueryResult {
    const words = query.split(' ');
    const potentialTables = words.filter(word => this.isValidTableName(word));
    
    if (potentialTables.length > 0) {
      const table = potentialTables[0];
      return {
        sql: `SELECT * FROM ${table}`,
        confidence: 0.3,
        explanation: `Basic query to show all records from ${table} table`,
        suggestions: [
          'Try being more specific about what you want to see',
          'Add conditions with "where" clause',
          'Specify columns you want to see'
        ],
        warnings: ['Low confidence - query may not be accurate']
      };
    }
    
    return {
      sql: 'SELECT * FROM users', // Default fallback
      confidence: 0.1,
      explanation: 'Could not understand the query. Showing default table.',
      suggestions: [
        'Try rephrasing your question',
        'Use specific table names',
        'Be more explicit about what you want to see'
      ],
      warnings: ['Could not parse the natural language query']
    };
  }

  // Get available patterns
  getPatterns(): QueryPattern[] {
    return [...this.patterns];
  }

  // Add custom pattern
  addPattern(pattern: QueryPattern): void {
    this.patterns.push(pattern);
  }

  // Get query examples
  getExamples(): string[] {
    const examples: string[] = [];
    this.patterns.forEach(pattern => {
      examples.push(...pattern.examples);
    });
    return examples;
  }
}

// Singleton instance
export const naturalLanguageProcessor = new NaturalLanguageProcessor();
