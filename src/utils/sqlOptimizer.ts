// SQL Query Optimizer - Dynamic optimization using real query parsing and schema analysis
// This utility provides personalized SQL optimization suggestions based on actual query structure and database schema

export interface OptimizationSuggestion {
  type: 'performance' | 'index' | 'join' | 'select' | 'where' | 'order' | 'group' | 'syntax';
  title: string;
  description: string;
  impact: 'high' | 'medium' | 'low';
  confidence: number;
  originalCode?: string;
  optimizedCode?: string;
  reason: string;
  tableName?: string;
  columnName?: string;
  lineNumber?: number;
}

export interface ParsedQuery {
  tables: string[];
  columns: string[];
  whereConditions: Array<{
    column: string;
    operator: string;
    value: string;
    table?: string;
  }>;
  joins: Array<{
    type: string;
    table: string;
    condition: string;
  }>;
  orderBy: Array<{
    column: string;
    direction: string;
    table?: string;
  }>;
  groupBy: string[];
  havingConditions: string[];
  selectStar: boolean;
  distinct: boolean;
  limit?: number;
  subqueries: ParsedQuery[];
}

export interface OptimizationResult {
  originalQuery: string;
  optimizedQuery: string;
  suggestions: OptimizationSuggestion[];
  estimatedImprovement: string;
  complexity: 'low' | 'medium' | 'high';
  riskLevel: 'low' | 'medium' | 'high';
  queryStats: {
    selectCount: number;
    joinCount: number;
    whereCount: number;
    orderByCount: number;
    groupByCount: number;
    subqueryCount: number;
    tableCount: number;
    columnCount: number;
  };
  parsedQuery: ParsedQuery;
}

export class SQLOptimizer {
  // Parse SQL query into structured components
  static parseQuery(query: string): ParsedQuery {
    const normalizedQuery = query.trim().replace(/\s+/g, ' ');
    const parsed: ParsedQuery = {
      tables: [],
      columns: [],
      whereConditions: [],
      joins: [],
      orderBy: [],
      groupBy: [],
      havingConditions: [],
      selectStar: false,
      distinct: false,
      subqueries: []
    };

    // Extract SELECT clause
    const selectMatch = normalizedQuery.match(/SELECT\s+(DISTINCT\s+)?(.+?)\s+FROM/i);
    if (selectMatch) {
      parsed.distinct = !!selectMatch[1];
      const selectClause = selectMatch[2];
      parsed.selectStar = selectClause.trim() === '*';
      
      if (!parsed.selectStar) {
        // Extract column names
        const columnMatches = selectClause.match(/(\w+(?:\.\w+)?)/g);
        if (columnMatches) {
          parsed.columns = columnMatches.map(col => col.trim());
        }
      }
    }

    // Extract FROM clause and tables
    const fromMatch = normalizedQuery.match(/FROM\s+([^WHERE|GROUP|ORDER|HAVING|LIMIT]+)/i);
    if (fromMatch) {
      const fromClause = fromMatch[1];
      // Extract table names (handle aliases)
      const tableMatches = fromClause.match(/(\w+)(?:\s+AS\s+\w+)?/g);
      if (tableMatches) {
        parsed.tables = tableMatches.map(table => table.split(/\s+/)[0]);
      }
    }

    // Extract JOIN clauses
    const joinMatches = normalizedQuery.match(/(INNER|LEFT|RIGHT|FULL|CROSS)?\s*JOIN\s+(\w+)(?:\s+ON\s+(.+?))?(?=\s+(?:INNER|LEFT|RIGHT|FULL|CROSS)?\s*JOIN|\s+WHERE|\s+GROUP|\s+ORDER|\s+HAVING|\s+LIMIT|$)/gi);
    if (joinMatches) {
      joinMatches.forEach(join => {
        const joinType = join.match(/(INNER|LEFT|RIGHT|FULL|CROSS)?\s*JOIN/i)?.[1] || 'INNER';
        const tableMatch = join.match(/JOIN\s+(\w+)/i);
        const conditionMatch = join.match(/ON\s+(.+?)(?=\s+(?:INNER|LEFT|RIGHT|FULL|CROSS)?\s*JOIN|\s+WHERE|\s+GROUP|\s+ORDER|\s+HAVING|\s+LIMIT|$)/i);
        
        if (tableMatch) {
          parsed.joins.push({
            type: joinType,
            table: tableMatch[1],
            condition: conditionMatch ? conditionMatch[1] : ''
          });
          parsed.tables.push(tableMatch[1]);
        }
      });
    }

    // Extract WHERE conditions
    const whereMatch = normalizedQuery.match(/WHERE\s+([^GROUP|ORDER|HAVING|LIMIT]+)/i);
    if (whereMatch) {
      const whereClause = whereMatch[1];
      // Parse individual conditions
      const conditionMatches = whereClause.match(/(\w+(?:\.\w+)?)\s*([=<>!]+|LIKE|IN|BETWEEN)\s*([^AND|OR]+)/gi);
      if (conditionMatches) {
        conditionMatches.forEach(condition => {
          const parts = condition.match(/(\w+(?:\.\w+)?)\s*([=<>!]+|LIKE|IN|BETWEEN)\s*(.+)/i);
          if (parts) {
            parsed.whereConditions.push({
              column: parts[1].trim(),
              operator: parts[2].trim(),
              value: parts[3].trim(),
              table: parts[1].includes('.') ? parts[1].split('.')[0] : undefined
            });
          }
        });
      }
    }

    // Extract ORDER BY
    const orderByMatch = normalizedQuery.match(/ORDER\s+BY\s+([^LIMIT]+)/i);
    if (orderByMatch) {
      const orderClause = orderByMatch[1];
      const orderMatches = orderClause.match(/(\w+(?:\.\w+)?)(?:\s+(ASC|DESC))?/gi);
      if (orderMatches) {
        orderMatches.forEach(order => {
          const parts = order.match(/(\w+(?:\.\w+)?)(?:\s+(ASC|DESC))?/i);
          if (parts) {
            parsed.orderBy.push({
              column: parts[1].trim(),
              direction: parts[2] || 'ASC',
              table: parts[1].includes('.') ? parts[1].split('.')[0] : undefined
            });
          }
        });
      }
    }

    // Extract GROUP BY
    const groupByMatch = normalizedQuery.match(/GROUP\s+BY\s+([^HAVING|ORDER|LIMIT]+)/i);
    if (groupByMatch) {
      const groupClause = groupByMatch[1];
      const groupMatches = groupClause.match(/(\w+(?:\.\w+)?)/g);
      if (groupMatches) {
        parsed.groupBy = groupMatches.map(group => group.trim());
      }
    }

    // Extract LIMIT
    const limitMatch = normalizedQuery.match(/LIMIT\s+(\d+)/i);
    if (limitMatch) {
      parsed.limit = parseInt(limitMatch[1]);
    }

    return parsed;
  }

  static analyzeQuery(query: string, schema?: any): OptimizationResult {
    const normalizedQuery = query.trim();
    const parsedQuery = this.parseQuery(normalizedQuery);
    const suggestions: OptimizationSuggestion[] = [];
    
    // Generate dynamic suggestions based on parsed query
    suggestions.push(...this.generateSelectOptimizations(parsedQuery, schema));
    suggestions.push(...this.generateWhereOptimizations(parsedQuery, schema));
    suggestions.push(...this.generateJoinOptimizations(parsedQuery, schema));
    suggestions.push(...this.generateOrderByOptimizations(parsedQuery, schema));
    suggestions.push(...this.generateIndexSuggestions(parsedQuery, schema));
    suggestions.push(...this.generatePerformanceOptimizations(parsedQuery, schema));

    // Analyze query structure
    const stats = this.analyzeQueryStructure(normalizedQuery, parsedQuery);
    
    // Generate optimized query
    const optimizedQuery = this.generateOptimizedQuery(normalizedQuery, parsedQuery, suggestions);
    
    // Calculate complexity and risk
    const complexity = this.calculateComplexity(stats);
    const riskLevel = this.calculateRiskLevel(suggestions);
    const estimatedImprovement = this.estimateImprovement(suggestions);

    return {
      originalQuery: normalizedQuery,
      optimizedQuery,
      suggestions: this.deduplicateSuggestions(suggestions),
      estimatedImprovement,
      complexity,
      riskLevel,
      queryStats: stats,
      parsedQuery
    };
  }

  // Generate SELECT clause optimizations
  private static generateSelectOptimizations(parsed: ParsedQuery, schema?: any): OptimizationSuggestion[] {
    const suggestions: OptimizationSuggestion[] = [];

    // SELECT * optimization
    if (parsed.selectStar) {
      const tableName = parsed.tables[0];
      const tableColumns = schema?.tables?.find((t: any) => t.name === tableName)?.columns || [];
      
      suggestions.push({
        type: 'select',
        title: `Replace SELECT * with specific columns from ${tableName}`,
        description: `Using SELECT * returns all ${tableColumns.length} columns from ${tableName}. Specify only the columns you need to improve performance.`,
        impact: 'medium',
        confidence: 0.95,
        reason: `SELECT * returns ${tableColumns.length} columns, increasing data transfer and memory usage`,
        tableName,
        originalCode: 'SELECT *',
        optimizedCode: `SELECT ${tableColumns.slice(0, 3).map((c: any) => c.name).join(', ')}`
      });
    }

    // DISTINCT optimization
    if (parsed.distinct) {
      suggestions.push({
        type: 'select',
        title: 'Review DISTINCT usage',
        description: `DISTINCT on ${parsed.columns.length} columns can be expensive. Consider if duplicates can be avoided at the data model level.`,
        impact: 'medium',
        confidence: 0.80,
        reason: 'DISTINCT requires sorting and deduplication which can be expensive',
        originalCode: 'SELECT DISTINCT',
        optimizedCode: 'SELECT'
      });
    }

    // Unused columns detection
    if (parsed.columns.length > 5) {
      suggestions.push({
        type: 'select',
        title: 'Consider reducing selected columns',
        description: `You're selecting ${parsed.columns.length} columns. Review if all are necessary for your use case.`,
        impact: 'low',
        confidence: 0.70,
        reason: 'Fewer columns reduce data transfer and memory usage'
      });
    }

    return suggestions;
  }

  // Generate WHERE clause optimizations
  private static generateWhereOptimizations(parsed: ParsedQuery, schema?: any): OptimizationSuggestion[] {
    const suggestions: OptimizationSuggestion[] = [];

    parsed.whereConditions.forEach((condition, index) => {
      const { column, operator, value } = condition;
      
      // LIKE pattern optimization
      if (operator.toUpperCase() === 'LIKE' && value.includes('%')) {
        const isLeadingWildcard = value.startsWith('%');
        suggestions.push({
          type: 'where',
          title: `Optimize LIKE pattern on ${column}`,
          description: `LIKE pattern '${value}' ${isLeadingWildcard ? 'starts with wildcard' : 'contains wildcards'}, preventing index usage.`,
          impact: isLeadingWildcard ? 'high' : 'medium',
          confidence: 0.90,
          reason: isLeadingWildcard ? 'Leading wildcards prevent index usage' : 'Wildcards in middle reduce index effectiveness',
          columnName: column,
          tableName: condition.table,
          originalCode: `${column} LIKE ${value}`,
          optimizedCode: isLeadingWildcard ? `Use full-text search or restructure query` : `Consider using = or IN for exact matches`
        });
      }

      // Function usage in WHERE
      if (value.match(/\b(UPPER|LOWER|SUBSTRING|LENGTH|TRIM|DATE|YEAR|MONTH|DAY)\s*\(/i)) {
        const functionName = value.match(/\b(UPPER|LOWER|SUBSTRING|LENGTH|TRIM|DATE|YEAR|MONTH|DAY)\s*\(/i)?.[1];
        suggestions.push({
          type: 'where',
          title: `Avoid ${functionName} function in WHERE clause`,
          description: `Using ${functionName}() on ${column} prevents index usage. Consider using computed columns or restructuring the query.`,
          impact: 'high',
          confidence: 0.85,
          reason: 'Functions in WHERE clauses prevent index optimization',
          columnName: column,
          tableName: condition.table,
          originalCode: `${column} ${operator} ${value}`,
          optimizedCode: `Move ${functionName}() to SELECT clause or use computed column`
        });
      }

      // Index suggestions for WHERE conditions
      if (['=', '>', '<', '>=', '<=', '!='].includes(operator)) {
        suggestions.push({
          type: 'index',
          title: `Add index on ${column} for WHERE filtering`,
          description: `Column ${column} is used in WHERE clause with ${operator} operator. An index would significantly improve performance.`,
          impact: 'high',
          confidence: 0.90,
          reason: 'Indexes dramatically improve WHERE clause performance',
          columnName: column,
          tableName: condition.table
        });
      }
    });

    return suggestions;
  }

  // Generate JOIN optimizations
  private static generateJoinOptimizations(parsed: ParsedQuery, schema?: any): OptimizationSuggestion[] {
    const suggestions: OptimizationSuggestion[] = [];

    parsed.joins.forEach((join, index) => {
      // Missing JOIN conditions
      if (!join.condition) {
        suggestions.push({
          type: 'join',
          title: `Add JOIN condition for ${join.table}`,
          description: `${join.type} JOIN with ${join.table} is missing ON condition, creating a cross join.`,
          impact: 'high',
          confidence: 0.95,
          reason: 'Missing JOIN conditions create Cartesian products',
          tableName: join.table,
          originalCode: `${join.type} JOIN ${join.table}`,
          optimizedCode: `${join.type} JOIN ${join.table} ON condition`
        });
      }

      // CROSS JOIN detection
      if (join.type.toUpperCase() === 'CROSS') {
        suggestions.push({
          type: 'join',
          title: `Review CROSS JOIN with ${join.table}`,
          description: `CROSS JOIN with ${join.table} creates Cartesian product. Ensure this is intentional.`,
          impact: 'high',
          confidence: 0.90,
          reason: 'CROSS JOINs can create very large result sets',
          tableName: join.table
        });
      }
    });

    // Multiple JOIN optimization
    if (parsed.joins.length > 3) {
      suggestions.push({
        type: 'join',
        title: 'Optimize multiple JOINs',
        description: `Query has ${parsed.joins.length} JOINs. Consider if all are necessary or if some can be combined.`,
        impact: 'medium',
        confidence: 0.75,
        reason: 'Multiple JOINs increase query complexity and execution time'
      });
    }

    return suggestions;
  }

  // Generate ORDER BY optimizations
  private static generateOrderByOptimizations(parsed: ParsedQuery, schema?: any): OptimizationSuggestion[] {
    const suggestions: OptimizationSuggestion[] = [];

    parsed.orderBy.forEach((order, index) => {
      // Index suggestion for ORDER BY
      suggestions.push({
        type: 'index',
        title: `Add index on ${order.column} for sorting`,
        description: `Column ${order.column} is used in ORDER BY ${order.direction}. An index would eliminate the need for sorting.`,
        impact: 'medium',
        confidence: 0.85,
        reason: 'Indexes can eliminate sorting operations',
        columnName: order.column,
        tableName: order.table
      });

      // Multiple ORDER BY columns
      if (parsed.orderBy.length > 2) {
        suggestions.push({
          type: 'order',
          title: 'Consider reducing ORDER BY columns',
          description: `Sorting by ${parsed.orderBy.length} columns can be expensive. Review if all are necessary.`,
          impact: 'medium',
          confidence: 0.70,
          reason: 'Multiple sort columns increase complexity'
        });
      }
    });

    // ORDER BY without LIMIT
    if (parsed.orderBy.length > 0 && !parsed.limit) {
      suggestions.push({
        type: 'order',
        title: 'Add LIMIT with ORDER BY',
        description: `ORDER BY without LIMIT can be expensive on large tables. Consider adding LIMIT to control result size.`,
        impact: 'medium',
        confidence: 0.80,
        reason: 'Sorting large result sets without LIMIT is resource-intensive',
        originalCode: 'ORDER BY without LIMIT',
        optimizedCode: 'ORDER BY ... LIMIT 1000'
      });
    }

    return suggestions;
  }

  // Generate index suggestions
  private static generateIndexSuggestions(parsed: ParsedQuery, schema?: any): OptimizationSuggestion[] {
    const suggestions: OptimizationSuggestion[] = [];
    const indexCandidates = new Set<string>();

    // Collect columns that would benefit from indexes
    parsed.whereConditions.forEach(condition => {
      if (['=', '>', '<', '>=', '<=', '!='].includes(condition.operator)) {
        indexCandidates.add(`${condition.table || parsed.tables[0]}.${condition.column}`);
      }
    });

    parsed.orderBy.forEach(order => {
      indexCandidates.add(`${order.table || parsed.tables[0]}.${order.column}`);
    });

    // Generate composite index suggestions
    if (parsed.whereConditions.length > 1) {
      const whereColumns = parsed.whereConditions
        .filter(c => ['=', '>', '<', '>=', '<=', '!='].includes(c.operator))
        .map(c => c.column)
        .slice(0, 3);
      
      if (whereColumns.length > 1) {
        suggestions.push({
          type: 'index',
          title: `Add composite index on (${whereColumns.join(', ')})`,
          description: `Multiple WHERE conditions on ${whereColumns.join(', ')} would benefit from a composite index.`,
          impact: 'high',
          confidence: 0.85,
          reason: 'Composite indexes optimize multi-column WHERE clauses'
        });
      }
    }

    return suggestions;
  }

  // Generate performance optimizations
  private static generatePerformanceOptimizations(parsed: ParsedQuery, schema?: any): OptimizationSuggestion[] {
    const suggestions: OptimizationSuggestion[] = [];

    // Missing LIMIT on large queries
    if (!parsed.limit && (parsed.tables.length > 1 || parsed.joins.length > 0)) {
      suggestions.push({
        type: 'performance',
        title: 'Consider adding LIMIT clause',
        description: `Query involves ${parsed.tables.length} tables and ${parsed.joins.length} JOINs. Consider adding LIMIT to control result size.`,
        impact: 'medium',
        confidence: 0.75,
        reason: 'LIMIT prevents returning unnecessarily large result sets',
        originalCode: 'No LIMIT',
        optimizedCode: 'LIMIT 1000'
      });
    }

    // Complex query analysis
    const complexityScore = parsed.tables.length + parsed.joins.length + parsed.whereConditions.length + parsed.orderBy.length;
    if (complexityScore > 8) {
      suggestions.push({
        type: 'performance',
        title: 'Query complexity is high',
        description: `Query has high complexity (${complexityScore} components). Consider breaking into smaller queries or using views.`,
        impact: 'medium',
        confidence: 0.70,
        reason: 'Complex queries are harder to optimize and debug'
      });
    }

    return suggestions;
  }

  private static analyzeQueryStructure(query: string, parsed: ParsedQuery) {
    const stats = {
      selectCount: (query.match(/SELECT/gi) || []).length,
      joinCount: parsed.joins.length,
      whereCount: parsed.whereConditions.length,
      orderByCount: parsed.orderBy.length,
      groupByCount: parsed.groupBy.length,
      subqueryCount: (query.match(/\(SELECT/gi) || []).length,
      tableCount: parsed.tables.length,
      columnCount: parsed.columns.length
    };
    
    return stats;
  }

  private static generateOptimizedQuery(originalQuery: string, parsed: ParsedQuery, suggestions: OptimizationSuggestion[]): string {
    let optimizedQuery = originalQuery;
    
    // Apply SELECT * optimization
    const selectStarSuggestion = suggestions.find(s => s.title.includes('SELECT *'));
    if (selectStarSuggestion && selectStarSuggestion.optimizedCode) {
      optimizedQuery = optimizedQuery.replace(
        /SELECT\s+\*/gi,
        selectStarSuggestion.optimizedCode.replace('SELECT ', '')
      );
    }

    // Add LIMIT if missing and ORDER BY exists
    const hasOrderBy = parsed.orderBy.length > 0;
    const hasLimit = !!parsed.limit;
    if (hasOrderBy && !hasLimit) {
      optimizedQuery += ' LIMIT 1000';
    }

    // Replace implicit joins with explicit JOIN syntax
    if (parsed.tables.length > 1 && parsed.joins.length === 0) {
      // This is an implicit cross join
      const firstTable = parsed.tables[0];
      const secondTable = parsed.tables[1];
      optimizedQuery = optimizedQuery.replace(
        new RegExp(`FROM\\s+${firstTable}\\s*,\\s*${secondTable}`, 'gi'),
        `FROM ${firstTable} INNER JOIN ${secondTable} ON ${firstTable}.id = ${secondTable}.${firstTable}_id`
      );
    }

    return optimizedQuery;
  }

  private static calculateComplexity(stats: any): 'low' | 'medium' | 'high' {
    const complexityScore = 
      stats.selectCount * 1 +
      stats.joinCount * 2 +
      stats.whereCount * 1 +
      stats.orderByCount * 1 +
      stats.groupByCount * 2 +
      stats.subqueryCount * 3 +
      stats.tableCount * 1;

    if (complexityScore <= 4) return 'low';
    if (complexityScore <= 10) return 'medium';
    return 'high';
  }

  private static calculateRiskLevel(suggestions: OptimizationSuggestion[]): 'low' | 'medium' | 'high' {
    const highImpactCount = suggestions.filter(s => s.impact === 'high').length;
    const mediumImpactCount = suggestions.filter(s => s.impact === 'medium').length;
    
    if (highImpactCount >= 3) return 'high';
    if (highImpactCount >= 1 || mediumImpactCount >= 4) return 'medium';
    return 'low';
  }

  private static estimateImprovement(suggestions: OptimizationSuggestion[]): string {
    const highImpactCount = suggestions.filter(s => s.impact === 'high').length;
    const mediumImpactCount = suggestions.filter(s => s.impact === 'medium').length;
    const indexSuggestions = suggestions.filter(s => s.type === 'index').length;
    
    if (indexSuggestions >= 3) return '70-90% faster execution with proper indexes';
    if (highImpactCount >= 2) return '50-70% faster execution';
    if (highImpactCount >= 1) return '30-50% faster execution';
    if (mediumImpactCount >= 2) return '20-40% faster execution';
    return '10-20% faster execution';
  }

  private static deduplicateSuggestions(suggestions: OptimizationSuggestion[]): OptimizationSuggestion[] {
    const seen = new Set<string>();
    return suggestions.filter(suggestion => {
      const key = `${suggestion.type}-${suggestion.columnName || suggestion.tableName || suggestion.title}`;
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });
  }

  // Validate query syntax
  static validateQuery(query: string): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    // Basic syntax checks
    if (!query.trim()) {
      errors.push('Query cannot be empty');
      return { isValid: false, errors };
    }

    // Check for balanced parentheses
    const openParens = (query.match(/\(/g) || []).length;
    const closeParens = (query.match(/\)/g) || []).length;
    if (openParens !== closeParens) {
      errors.push('Unbalanced parentheses in query');
    }

    // Check for basic SQL structure
    if (!/SELECT/i.test(query)) {
      errors.push('Query must contain SELECT statement');
    }

    // Check for semicolon at end (optional but recommended)
    if (!query.trim().endsWith(';')) {
      errors.push('Consider adding semicolon at end of query');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }
}
