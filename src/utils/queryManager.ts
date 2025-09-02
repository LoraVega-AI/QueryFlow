// Query management utilities for QueryFlow
// This module provides query history, templates, and optimization features

import { QueryHistoryItem, QueryTemplate, QueryParameter } from '@/types/database';

export class QueryManager {
  private static readonly HISTORY_KEY = 'queryflow_query_history';
  private static readonly TEMPLATES_KEY = 'queryflow_query_templates';
  private static readonly MAX_HISTORY_ITEMS = 100;

  /**
   * Save a query to history
   */
  static saveToHistory(query: string, executionTime: number, resultCount: number): void {
    const history = this.getHistory();
    
    const historyItem: QueryHistoryItem = {
      id: `query-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      query: query.trim(),
      executedAt: new Date(),
      executionTime,
      resultCount,
      isBookmarked: false,
      tags: this.extractTags(query)
    };

    // Remove duplicate queries (keep the most recent)
    const filteredHistory = history.filter(item => item.query !== historyItem.query);
    
    // Add new item at the beginning
    const newHistory = [historyItem, ...filteredHistory].slice(0, this.MAX_HISTORY_ITEMS);
    
    localStorage.setItem(this.HISTORY_KEY, JSON.stringify(newHistory));
  }

  /**
   * Get query history
   */
  static getHistory(): QueryHistoryItem[] {
    try {
      const stored = localStorage.getItem(this.HISTORY_KEY);
      if (!stored) return [];
      
      const history = JSON.parse(stored);
      return history.map((item: any) => ({
        ...item,
        executedAt: new Date(item.executedAt)
      }));
    } catch (error) {
      console.error('Error loading query history:', error);
      return [];
    }
  }

  /**
   * Search query history
   */
  static searchHistory(query: string): QueryHistoryItem[] {
    const history = this.getHistory();
    const lowercaseQuery = query.toLowerCase();
    
    return history.filter(item => 
      item.query.toLowerCase().includes(lowercaseQuery) ||
      item.tags.some(tag => tag.toLowerCase().includes(lowercaseQuery))
    );
  }

  /**
   * Bookmark/unbookmark a query
   */
  static toggleBookmark(historyItemId: string): void {
    const history = this.getHistory();
    const item = history.find(item => item.id === historyItemId);
    
    if (item) {
      item.isBookmarked = !item.isBookmarked;
      localStorage.setItem(this.HISTORY_KEY, JSON.stringify(history));
    }
  }

  /**
   * Get bookmarked queries
   */
  static getBookmarkedQueries(): QueryHistoryItem[] {
    return this.getHistory().filter(item => item.isBookmarked);
  }

  /**
   * Clear query history
   */
  static clearHistory(): void {
    localStorage.removeItem(this.HISTORY_KEY);
  }

  /**
   * Delete a specific history item
   */
  static deleteHistoryItem(historyItemId: string): void {
    const history = this.getHistory();
    const filteredHistory = history.filter(item => item.id !== historyItemId);
    localStorage.setItem(this.HISTORY_KEY, JSON.stringify(filteredHistory));
  }

  /**
   * Get built-in query templates
   */
  static getBuiltInTemplates(): QueryTemplate[] {
    return [
      {
        id: 'select-all',
        name: 'Select All Records',
        description: 'Select all records from a table',
        category: 'Basic Queries',
        query: 'SELECT * FROM {table_name};',
        parameters: [
          {
            name: 'table_name',
            type: 'TEXT',
            required: true
          }
        ],
        tags: ['select', 'basic']
      },
      {
        id: 'select-with-condition',
        name: 'Select with Condition',
        description: 'Select records with a WHERE condition',
        category: 'Basic Queries',
        query: 'SELECT * FROM {table_name} WHERE {column_name} = {value};',
        parameters: [
          {
            name: 'table_name',
            type: 'TEXT',
            required: true
          },
          {
            name: 'column_name',
            type: 'TEXT',
            required: true
          },
          {
            name: 'value',
            type: 'TEXT',
            required: true
          }
        ],
        tags: ['select', 'where', 'condition']
      },
      {
        id: 'insert-record',
        name: 'Insert Record',
        description: 'Insert a new record into a table',
        category: 'Data Modification',
        query: 'INSERT INTO {table_name} ({columns}) VALUES ({values});',
        parameters: [
          {
            name: 'table_name',
            type: 'TEXT',
            required: true
          },
          {
            name: 'columns',
            type: 'TEXT',
            required: true
          },
          {
            name: 'values',
            type: 'TEXT',
            required: true
          }
        ],
        tags: ['insert', 'create']
      },
      {
        id: 'update-record',
        name: 'Update Record',
        description: 'Update existing records',
        category: 'Data Modification',
        query: 'UPDATE {table_name} SET {column_name} = {new_value} WHERE {condition_column} = {condition_value};',
        parameters: [
          {
            name: 'table_name',
            type: 'TEXT',
            required: true
          },
          {
            name: 'column_name',
            type: 'TEXT',
            required: true
          },
          {
            name: 'new_value',
            type: 'TEXT',
            required: true
          },
          {
            name: 'condition_column',
            type: 'TEXT',
            required: true
          },
          {
            name: 'condition_value',
            type: 'TEXT',
            required: true
          }
        ],
        tags: ['update', 'modify']
      },
      {
        id: 'delete-record',
        name: 'Delete Record',
        description: 'Delete records with a condition',
        category: 'Data Modification',
        query: 'DELETE FROM {table_name} WHERE {column_name} = {value};',
        parameters: [
          {
            name: 'table_name',
            type: 'TEXT',
            required: true
          },
          {
            name: 'column_name',
            type: 'TEXT',
            required: true
          },
          {
            name: 'value',
            type: 'TEXT',
            required: true
          }
        ],
        tags: ['delete', 'remove']
      },
      {
        id: 'join-tables',
        name: 'Join Tables',
        description: 'Join two tables with a relationship',
        category: 'Advanced Queries',
        query: 'SELECT t1.*, t2.* FROM {table1} t1 JOIN {table2} t2 ON t1.{join_column1} = t2.{join_column2};',
        parameters: [
          {
            name: 'table1',
            type: 'TEXT',
            required: true
          },
          {
            name: 'table2',
            type: 'TEXT',
            required: true
          },
          {
            name: 'join_column1',
            type: 'TEXT',
            required: true
          },
          {
            name: 'join_column2',
            type: 'TEXT',
            required: true
          }
        ],
        tags: ['join', 'relationship']
      },
      {
        id: 'count-records',
        name: 'Count Records',
        description: 'Count total records in a table',
        category: 'Aggregate Queries',
        query: 'SELECT COUNT(*) as total_count FROM {table_name};',
        parameters: [
          {
            name: 'table_name',
            type: 'TEXT',
            required: true
          }
        ],
        tags: ['count', 'aggregate']
      },
      {
        id: 'group-by',
        name: 'Group By Query',
        description: 'Group records and apply aggregate functions',
        category: 'Aggregate Queries',
        query: 'SELECT {group_column}, COUNT(*) as count FROM {table_name} GROUP BY {group_column};',
        parameters: [
          {
            name: 'table_name',
            type: 'TEXT',
            required: true
          },
          {
            name: 'group_column',
            type: 'TEXT',
            required: true
          }
        ],
        tags: ['group', 'aggregate']
      },
      {
        id: 'schema-info',
        name: 'Schema Information',
        description: 'Get information about database schema',
        category: 'System Queries',
        query: 'SELECT name, sql FROM sqlite_master WHERE type = \'table\';',
        parameters: [],
        tags: ['schema', 'system']
      },
      {
        id: 'table-structure',
        name: 'Table Structure',
        description: 'Get the structure of a specific table',
        category: 'System Queries',
        query: 'PRAGMA table_info({table_name});',
        parameters: [
          {
            name: 'table_name',
            type: 'TEXT',
            required: true
          }
        ],
        tags: ['schema', 'structure']
      }
    ];
  }

  /**
   * Get user-defined templates
   */
  static getUserTemplates(): QueryTemplate[] {
    try {
      const stored = localStorage.getItem(this.TEMPLATES_KEY);
      if (!stored) return [];
      return JSON.parse(stored);
    } catch (error) {
      console.error('Error loading user templates:', error);
      return [];
    }
  }

  /**
   * Save a user template
   */
  static saveUserTemplate(template: Omit<QueryTemplate, 'id'>): void {
    const templates = this.getUserTemplates();
    const newTemplate: QueryTemplate = {
      ...template,
      id: `template-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    };
    
    templates.push(newTemplate);
    localStorage.setItem(this.TEMPLATES_KEY, JSON.stringify(templates));
  }

  /**
   * Delete a user template
   */
  static deleteUserTemplate(templateId: string): void {
    const templates = this.getUserTemplates();
    const filteredTemplates = templates.filter(template => template.id !== templateId);
    localStorage.setItem(this.TEMPLATES_KEY, JSON.stringify(filteredTemplates));
  }

  /**
   * Get all templates (built-in + user-defined)
   */
  static getAllTemplates(): QueryTemplate[] {
    return [...this.getBuiltInTemplates(), ...this.getUserTemplates()];
  }

  /**
   * Get templates by category
   */
  static getTemplatesByCategory(category: string): QueryTemplate[] {
    return this.getAllTemplates().filter(template => template.category === category);
  }

  /**
   * Search templates
   */
  static searchTemplates(query: string): QueryTemplate[] {
    const templates = this.getAllTemplates();
    const lowercaseQuery = query.toLowerCase();
    
    return templates.filter(template => 
      template.name.toLowerCase().includes(lowercaseQuery) ||
      template.description.toLowerCase().includes(lowercaseQuery) ||
      template.tags.some(tag => tag.toLowerCase().includes(lowercaseQuery))
    );
  }

  /**
   * Process a template with parameters
   */
  static processTemplate(template: QueryTemplate, parameters: Record<string, string>): string {
    let query = template.query;
    
    template.parameters.forEach(param => {
      const value = parameters[param.name] || param.defaultValue || '';
      const placeholder = `{${param.name}}`;
      query = query.replace(new RegExp(placeholder, 'g'), value);
    });
    
    return query;
  }

  /**
   * Validate query syntax (basic validation)
   */
  static validateQuery(query: string): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];
    const trimmedQuery = query.trim();
    
    if (!trimmedQuery) {
      errors.push('Query cannot be empty');
      return { isValid: false, errors };
    }
    
    // Check for balanced parentheses
    const openParens = (trimmedQuery.match(/\(/g) || []).length;
    const closeParens = (trimmedQuery.match(/\)/g) || []).length;
    if (openParens !== closeParens) {
      errors.push('Unbalanced parentheses');
    }
    
    // Check for balanced quotes
    const singleQuotes = (trimmedQuery.match(/'/g) || []).length;
    const doubleQuotes = (trimmedQuery.match(/"/g) || []).length;
    if (singleQuotes % 2 !== 0) {
      errors.push('Unbalanced single quotes');
    }
    if (doubleQuotes % 2 !== 0) {
      errors.push('Unbalanced double quotes');
    }
    
    // Check for basic SQL keywords
    const upperQuery = trimmedQuery.toUpperCase();
    const hasSelect = upperQuery.includes('SELECT');
    const hasInsert = upperQuery.includes('INSERT');
    const hasUpdate = upperQuery.includes('UPDATE');
    const hasDelete = upperQuery.includes('DELETE');
    const hasCreate = upperQuery.includes('CREATE');
    const hasDrop = upperQuery.includes('DROP');
    const hasAlter = upperQuery.includes('ALTER');
    
    if (!hasSelect && !hasInsert && !hasUpdate && !hasDelete && !hasCreate && !hasDrop && !hasAlter) {
      errors.push('Query must contain a valid SQL keyword (SELECT, INSERT, UPDATE, DELETE, CREATE, DROP, ALTER)');
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Extract tags from query for categorization
   */
  private static extractTags(query: string): string[] {
    const tags: string[] = [];
    const upperQuery = query.toUpperCase();
    
    if (upperQuery.includes('SELECT')) tags.push('select');
    if (upperQuery.includes('INSERT')) tags.push('insert');
    if (upperQuery.includes('UPDATE')) tags.push('update');
    if (upperQuery.includes('DELETE')) tags.push('delete');
    if (upperQuery.includes('JOIN')) tags.push('join');
    if (upperQuery.includes('WHERE')) tags.push('where');
    if (upperQuery.includes('GROUP BY')) tags.push('group');
    if (upperQuery.includes('ORDER BY')) tags.push('order');
    if (upperQuery.includes('COUNT')) tags.push('count');
    if (upperQuery.includes('SUM')) tags.push('sum');
    if (upperQuery.includes('AVG')) tags.push('avg');
    if (upperQuery.includes('MAX')) tags.push('max');
    if (upperQuery.includes('MIN')) tags.push('min');
    
    return tags;
  }

  /**
   * Get query optimization suggestions
   */
  static getOptimizationSuggestions(query: string): string[] {
    const suggestions: string[] = [];
    const upperQuery = query.toUpperCase();
    
    // Check for SELECT *
    if (upperQuery.includes('SELECT *')) {
      suggestions.push('Consider specifying column names instead of using SELECT * for better performance');
    }
    
    // Check for missing WHERE clause on large tables
    if (upperQuery.includes('SELECT') && !upperQuery.includes('WHERE') && !upperQuery.includes('LIMIT')) {
      suggestions.push('Consider adding a WHERE clause or LIMIT to avoid scanning all records');
    }
    
    // Check for potential index usage
    if (upperQuery.includes('WHERE') && upperQuery.includes('=')) {
      suggestions.push('Ensure indexed columns are used in WHERE clauses for better performance');
    }
    
    // Check for ORDER BY without LIMIT
    if (upperQuery.includes('ORDER BY') && !upperQuery.includes('LIMIT')) {
      suggestions.push('Consider adding LIMIT when using ORDER BY to improve performance');
    }
    
    return suggestions;
  }
}
