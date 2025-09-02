// Advanced search utilities for QueryFlow
// This module provides full-text search across schemas, queries, and data

import { DatabaseSchema, Table, Column, QueryHistoryItem, AuditLog } from '@/types/database';
import { QueryManager } from './queryManager';
import { PerformanceMonitor } from './performanceMonitor';

export interface SearchResult {
  id: string;
  type: 'schema' | 'table' | 'column' | 'query' | 'audit' | 'data';
  title: string;
  description: string;
  content: string;
  relevance: number;
  metadata: Record<string, any>;
  timestamp?: Date;
}

export interface SearchFilters {
  types?: string[];
  dateRange?: { start: Date; end: Date };
  tags?: string[];
  tableId?: string;
  userId?: string;
}

export interface SearchOptions {
  caseSensitive?: boolean;
  wholeWords?: boolean;
  regex?: boolean;
  maxResults?: number;
  includeMetadata?: boolean;
}

export class AdvancedSearch {
  private static readonly SEARCH_INDEX_KEY = 'queryflow_search_index';
  private static searchIndex: Map<string, SearchResult> = new Map();

  /**
   * Initialize search system
   */
  static initialize(): void {
    this.loadSearchIndex();
    this.buildSearchIndex();
  }

  /**
   * Perform a comprehensive search across all QueryFlow data
   */
  static search(
    query: string,
    filters: SearchFilters = {},
    options: SearchOptions = {}
  ): SearchResult[] {
    const {
      caseSensitive = false,
      wholeWords = false,
      regex = false,
      maxResults = 100,
      includeMetadata = true
    } = options;

    if (!query.trim()) return [];

    const searchQuery = caseSensitive ? query : query.toLowerCase();
    const results: SearchResult[] = [];

    // Search through indexed data
    for (const [id, result] of this.searchIndex) {
      if (this.matchesFilters(result, filters)) {
        const relevance = this.calculateRelevance(result, searchQuery, {
          wholeWords,
          regex,
          caseSensitive
        });

        if (relevance > 0) {
          results.push({
            ...result,
            relevance
          });
        }
      }
    }

    // Sort by relevance and limit results
    return results
      .sort((a, b) => b.relevance - a.relevance)
      .slice(0, maxResults);
  }

  /**
   * Search schemas
   */
  static searchSchemas(query: string, schemas: DatabaseSchema[]): SearchResult[] {
    const results: SearchResult[] = [];
    const searchQuery = query.toLowerCase();

    schemas.forEach(schema => {
      if (this.matchesText(schema.name, searchQuery) || 
          this.matchesText(schema.description || '', searchQuery)) {
        results.push({
          id: schema.id,
          type: 'schema',
          title: schema.name,
          description: schema.description || 'Database schema',
          content: `${schema.name} ${schema.description || ''}`,
          relevance: this.calculateTextRelevance(schema.name, searchQuery),
          metadata: {
            tableCount: schema.tables.length,
            version: schema.version,
            createdAt: schema.createdAt,
            updatedAt: schema.updatedAt
          },
          timestamp: schema.updatedAt
        });
      }
    });

    return results.sort((a, b) => b.relevance - a.relevance);
  }

  /**
   * Search tables
   */
  static searchTables(query: string, tables: Table[]): SearchResult[] {
    const results: SearchResult[] = [];
    const searchQuery = query.toLowerCase();

    tables.forEach(table => {
      if (this.matchesText(table.name, searchQuery)) {
        const columnNames = table.columns.map(c => c.name).join(' ');
        
        results.push({
          id: table.id,
          type: 'table',
          title: table.name,
          description: `Table with ${table.columns.length} columns`,
          content: `${table.name} ${columnNames}`,
          relevance: this.calculateTextRelevance(table.name, searchQuery),
          metadata: {
            columnCount: table.columns.length,
            primaryKeys: table.columns.filter(c => c.primaryKey).length,
            foreignKeys: table.columns.filter(c => c.foreignKey).length,
            position: table.position
          }
        });
      }
    });

    return results.sort((a, b) => b.relevance - a.relevance);
  }

  /**
   * Search columns
   */
  static searchColumns(query: string, tables: Table[]): SearchResult[] {
    const results: SearchResult[] = [];
    const searchQuery = query.toLowerCase();

    tables.forEach(table => {
      table.columns.forEach(column => {
        if (this.matchesText(column.name, searchQuery) || 
            this.matchesText(column.type, searchQuery)) {
          results.push({
            id: column.id,
            type: 'column',
            title: `${table.name}.${column.name}`,
            description: `${column.type} column${column.primaryKey ? ' (Primary Key)' : ''}`,
            content: `${column.name} ${column.type} ${table.name}`,
            relevance: this.calculateTextRelevance(column.name, searchQuery),
            metadata: {
              tableName: table.name,
              tableId: table.id,
              dataType: column.type,
              nullable: column.nullable,
              primaryKey: column.primaryKey,
              foreignKey: column.foreignKey,
              defaultValue: column.defaultValue
            }
          });
        }
      });
    });

    return results.sort((a, b) => b.relevance - a.relevance);
  }

  /**
   * Search query history
   */
  static searchQueryHistory(query: string): SearchResult[] {
    const history = QueryManager.getHistory();
    const results: SearchResult[] = [];
    const searchQuery = query.toLowerCase();

    history.forEach(item => {
      if (this.matchesText(item.query, searchQuery) ||
          item.tags.some(tag => this.matchesText(tag, searchQuery))) {
        results.push({
          id: item.id,
          type: 'query',
          title: item.query.substring(0, 50) + (item.query.length > 50 ? '...' : ''),
          description: `Executed ${item.executedAt.toLocaleString()}`,
          content: item.query,
          relevance: this.calculateTextRelevance(item.query, searchQuery),
          metadata: {
            executionTime: item.executionTime,
            resultCount: item.resultCount,
            isBookmarked: item.isBookmarked,
            tags: item.tags
          },
          timestamp: item.executedAt
        });
      }
    });

    return results.sort((a, b) => b.relevance - a.relevance);
  }

  /**
   * Search audit logs
   */
  static searchAuditLogs(query: string, filters: SearchFilters = {}): SearchResult[] {
    const auditLogs = PerformanceMonitor.getAuditLogs();
    const results: SearchResult[] = [];
    const searchQuery = query.toLowerCase();

    auditLogs.forEach(log => {
      if ((this.matchesFilters({
        id: log.id,
        type: 'audit',
        title: log.action,
        description: '',
        content: '',
        relevance: 0,
        metadata: {}
      }, filters)) &&
          (this.matchesText(log.action, searchQuery) ||
           this.matchesText(JSON.stringify(log.details), searchQuery))) {
        results.push({
          id: log.id,
          type: 'audit',
          title: log.action,
          description: `${log.tableId ? `Table: ${log.tableId}` : 'System action'}`,
          content: `${log.action} ${JSON.stringify(log.details)}`,
          relevance: this.calculateTextRelevance(log.action, searchQuery),
          metadata: {
            tableId: log.tableId,
            recordId: log.recordId,
            userId: log.userId,
            details: log.details
          },
          timestamp: log.timestamp
        });
      }
    });

    return results.sort((a, b) => b.relevance - a.relevance);
  }

  /**
   * Get search suggestions
   */
  static getSearchSuggestions(query: string, maxSuggestions: number = 10): string[] {
    if (!query.trim()) return [];

    const suggestions = new Set<string>();
    const searchQuery = query.toLowerCase();

    // Add suggestions from search index
    for (const result of this.searchIndex.values()) {
      const words = result.content.toLowerCase().split(/\s+/);
      words.forEach(word => {
        if (word.startsWith(searchQuery) && word.length > searchQuery.length) {
          suggestions.add(word);
        }
      });
    }

    // Add suggestions from query history
    const history = QueryManager.getHistory();
    history.forEach(item => {
      const words = item.query.toLowerCase().split(/\s+/);
      words.forEach(word => {
        if (word.startsWith(searchQuery) && word.length > searchQuery.length) {
          suggestions.add(word);
        }
      });
    });

    return Array.from(suggestions)
      .sort()
      .slice(0, maxSuggestions);
  }

  /**
   * Build search index from all available data
   */
  static buildSearchIndex(): void {
    this.searchIndex.clear();

    // Index query history
    const history = QueryManager.getHistory();
    history.forEach(item => {
      this.searchIndex.set(item.id, {
        id: item.id,
        type: 'query',
        title: item.query.substring(0, 50) + (item.query.length > 50 ? '...' : ''),
        description: `Query executed ${item.executedAt.toLocaleString()}`,
        content: item.query,
        relevance: 0,
        metadata: {
          executionTime: item.executionTime,
          resultCount: item.resultCount,
          isBookmarked: item.isBookmarked,
          tags: item.tags
        },
        timestamp: item.executedAt
      });
    });

    // Index audit logs
    const auditLogs = PerformanceMonitor.getAuditLogs();
    auditLogs.forEach(log => {
      this.searchIndex.set(log.id, {
        id: log.id,
        type: 'audit',
        title: log.action,
        description: `Audit log entry`,
        content: `${log.action} ${JSON.stringify(log.details)}`,
        relevance: 0,
        metadata: {
          tableId: log.tableId,
          recordId: log.recordId,
          userId: log.userId,
          details: log.details
        },
        timestamp: log.timestamp
      });
    });

    this.saveSearchIndex();
  }

  /**
   * Clear search index
   */
  static clearSearchIndex(): void {
    this.searchIndex.clear();
    this.saveSearchIndex();
  }

  /**
   * Check if result matches filters
   */
  private static matchesFilters(result: SearchResult, filters: SearchFilters): boolean {
    if (filters.types && !filters.types.includes(result.type)) {
      return false;
    }

    if (filters.dateRange && result.timestamp) {
      if (result.timestamp < filters.dateRange.start || result.timestamp > filters.dateRange.end) {
        return false;
      }
    }

    if (filters.tags && result.metadata.tags) {
      const hasMatchingTag = filters.tags.some(tag => 
        result.metadata.tags.includes(tag)
      );
      if (!hasMatchingTag) return false;
    }

    if (filters.tableId && result.metadata.tableId !== filters.tableId) {
      return false;
    }

    if (filters.userId && result.metadata.userId !== filters.userId) {
      return false;
    }

    return true;
  }

  /**
   * Calculate relevance score for a search result
   */
  private static calculateRelevance(
    result: SearchResult,
    query: string,
    options: { wholeWords: boolean; regex: boolean; caseSensitive: boolean }
  ): number {
    let relevance = 0;

    // Title match (highest weight)
    relevance += this.calculateTextRelevance(result.title, query) * 3;

    // Description match (medium weight)
    relevance += this.calculateTextRelevance(result.description, query) * 2;

    // Content match (lowest weight)
    relevance += this.calculateTextRelevance(result.content, query);

    // Boost for exact matches
    if (result.title.toLowerCase().includes(query.toLowerCase())) {
      relevance += 5;
    }

    return relevance;
  }

  /**
   * Calculate text relevance score
   */
  private static calculateTextRelevance(text: string, query: string): number {
    if (!text || !query) return 0;

    const textLower = text.toLowerCase();
    const queryLower = query.toLowerCase();

    if (textLower === queryLower) return 10;
    if (textLower.startsWith(queryLower)) return 8;
    if (textLower.includes(queryLower)) return 5;

    // Check for word boundaries
    const words = textLower.split(/\s+/);
    const queryWords = queryLower.split(/\s+/);
    
    let wordMatches = 0;
    queryWords.forEach(queryWord => {
      if (words.some(word => word.startsWith(queryWord))) {
        wordMatches++;
      }
    });

    return wordMatches * 2;
  }

  /**
   * Check if text matches query
   */
  private static matchesText(text: string, query: string): boolean {
    if (!text || !query) return false;
    return text.toLowerCase().includes(query.toLowerCase());
  }

  /**
   * Load search index from localStorage
   */
  private static loadSearchIndex(): void {
    try {
      const stored = localStorage.getItem(this.SEARCH_INDEX_KEY);
      if (stored) {
        const indexData = JSON.parse(stored);
        this.searchIndex = new Map(indexData.map((item: any) => [
          item.id,
          {
            ...item,
            timestamp: item.timestamp ? new Date(item.timestamp) : undefined
          }
        ]));
      }
    } catch (error) {
      console.error('Error loading search index:', error);
      this.searchIndex = new Map();
    }
  }

  /**
   * Save search index to localStorage
   */
  private static saveSearchIndex(): void {
    try {
      const indexData = Array.from(this.searchIndex.values());
      localStorage.setItem(this.SEARCH_INDEX_KEY, JSON.stringify(indexData));
    } catch (error) {
      console.error('Error saving search index:', error);
    }
  }
}
