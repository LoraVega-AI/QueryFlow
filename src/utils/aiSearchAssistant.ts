// AI-Powered Search Assistant for Intelligent Query Enhancement
// Provides smart suggestions, auto-classification, and query understanding

export interface AIResponse {
  type: 'suggestion' | 'classification' | 'summary' | 'trend' | 'insight';
  content: string;
  confidence: number;
  metadata?: Record<string, any>;
}

export interface QueryEnhancement {
  originalQuery: string;
  enhancedQuery: string;
  suggestions: string[];
  intent: string;
  entities: string[];
  confidence: number;
}

export interface SearchInsight {
  type: 'trend' | 'pattern' | 'recommendation' | 'warning';
  title: string;
  description: string;
  confidence: number;
  actionable: boolean;
  metadata?: Record<string, any>;
}

export interface AutoClassification {
  category: string;
  subcategory?: string;
  tags: string[];
  confidence: number;
  reasoning: string;
}

export class AISearchAssistant {
  private static instance: AISearchAssistant;
  private queryHistory: Array<{ query: string; timestamp: Date; results: number }> = [];
  private userPreferences: Record<string, any> = {};
  private searchPatterns: Map<string, number> = new Map();

  private constructor() {
    this.initializeAssistant();
  }

  static getInstance(): AISearchAssistant {
    if (!AISearchAssistant.instance) {
      AISearchAssistant.instance = new AISearchAssistant();
    }
    return AISearchAssistant.instance;
  }

  private initializeAssistant(): void {
    // Initialize with common search patterns and intents
    this.searchPatterns.set('authentication', 0.9);
    this.searchPatterns.set('database', 0.8);
    this.searchPatterns.set('performance', 0.85);
    this.searchPatterns.set('security', 0.9);
    this.searchPatterns.set('api', 0.8);
    this.searchPatterns.set('documentation', 0.75);
  }

  // Intelligent Query Enhancement
  enhanceQuery(query: string): QueryEnhancement {
    const intent = this.detectIntent(query);
    const entities = this.extractEntities(query);
    const suggestions = this.generateQuerySuggestions(query, intent, entities);
    const enhancedQuery = this.buildEnhancedQuery(query, intent, entities);

    return {
      originalQuery: query,
      enhancedQuery,
      suggestions,
      intent,
      entities,
      confidence: this.calculateConfidence(query, intent, entities)
    };
  }

  private detectIntent(query: string): string {
    const lowerQuery = query.toLowerCase();
    
    // Intent detection patterns
    if (lowerQuery.includes('how to') || lowerQuery.includes('how do')) {
      return 'tutorial';
    }
    if (lowerQuery.includes('what is') || lowerQuery.includes('define')) {
      return 'definition';
    }
    if (lowerQuery.includes('error') || lowerQuery.includes('problem') || lowerQuery.includes('issue')) {
      return 'troubleshooting';
    }
    if (lowerQuery.includes('best practice') || lowerQuery.includes('recommend')) {
      return 'best_practice';
    }
    if (lowerQuery.includes('compare') || lowerQuery.includes('vs') || lowerQuery.includes('difference')) {
      return 'comparison';
    }
    if (lowerQuery.includes('example') || lowerQuery.includes('sample')) {
      return 'example';
    }
    
    return 'general_search';
  }

  private extractEntities(query: string): string[] {
    const entities: string[] = [];
    const lowerQuery = query.toLowerCase();
    
    // Technical entities
    const techTerms = [
      'authentication', 'authorization', 'database', 'api', 'rest', 'graphql',
      'react', 'typescript', 'javascript', 'nodejs', 'express', 'mongodb',
      'postgresql', 'mysql', 'redis', 'docker', 'kubernetes', 'aws', 'azure',
      'jwt', 'oauth', 'ssl', 'tls', 'encryption', 'hashing', 'caching',
      'microservices', 'monolith', 'serverless', 'lambda', 'elasticsearch'
    ];
    
    techTerms.forEach(term => {
      if (lowerQuery.includes(term)) {
        entities.push(term);
      }
    });
    
    // Extract quoted strings as potential entities
    const quotedMatches = query.match(/"([^"]+)"/g);
    if (quotedMatches) {
      quotedMatches.forEach(match => {
        entities.push(match.replace(/"/g, ''));
      });
    }
    
    return [...new Set(entities)];
  }

  private generateQuerySuggestions(query: string, intent: string, entities: string[]): string[] {
    const suggestions: string[] = [];
    
    // Intent-based suggestions
    switch (intent) {
      case 'tutorial':
        suggestions.push(`${query} step by step`);
        suggestions.push(`${query} guide`);
        suggestions.push(`${query} tutorial`);
        break;
      case 'definition':
        suggestions.push(`what is ${query}`);
        suggestions.push(`${query} meaning`);
        suggestions.push(`${query} definition`);
        break;
      case 'troubleshooting':
        suggestions.push(`${query} error fix`);
        suggestions.push(`${query} solution`);
        suggestions.push(`${query} debugging`);
        break;
      case 'best_practice':
        suggestions.push(`${query} best practices`);
        suggestions.push(`${query} guidelines`);
        suggestions.push(`${query} recommendations`);
        break;
    }
    
    // Entity-based suggestions
    entities.forEach(entity => {
      if (entity === 'authentication') {
        suggestions.push('authentication best practices');
        suggestions.push('JWT vs OAuth authentication');
        suggestions.push('authentication security');
      } else if (entity === 'database') {
        suggestions.push('database optimization');
        suggestions.push('database design patterns');
        suggestions.push('database performance tuning');
      } else if (entity === 'api') {
        suggestions.push('REST API design');
        suggestions.push('API documentation');
        suggestions.push('API security');
      }
    });
    
    return [...new Set(suggestions)].slice(0, 5);
  }

  private buildEnhancedQuery(query: string, intent: string, entities: string[]): string {
    let enhancedQuery = query;
    
    // Add intent-specific enhancements
    switch (intent) {
      case 'tutorial':
        enhancedQuery += ' tutorial guide';
        break;
      case 'definition':
        enhancedQuery += ' definition explanation';
        break;
      case 'troubleshooting':
        enhancedQuery += ' error solution fix';
        break;
      case 'best_practice':
        enhancedQuery += ' best practices guidelines';
        break;
    }
    
    // Add entity-specific enhancements
    if (entities.includes('authentication')) {
      enhancedQuery += ' security JWT OAuth';
    }
    if (entities.includes('database')) {
      enhancedQuery += ' SQL optimization performance';
    }
    if (entities.includes('api')) {
      enhancedQuery += ' REST GraphQL endpoints';
    }
    
    return enhancedQuery;
  }

  private calculateConfidence(query: string, intent: string, entities: string[]): number {
    let confidence = 0.5; // Base confidence
    
    // Intent confidence
    if (intent !== 'general_search') {
      confidence += 0.2;
    }
    
    // Entity confidence
    confidence += Math.min(entities.length * 0.1, 0.3);
    
    // Query length confidence
    if (query.length > 10) {
      confidence += 0.1;
    }
    
    return Math.min(confidence, 1.0);
  }

  // Auto-Classification
  classifySearchResult(result: any): AutoClassification {
    const content = `${result.title} ${result.content} ${result.tags?.join(' ') || ''}`.toLowerCase();
    
    // Category classification
    let category = 'General';
    let confidence = 0.5;
    let reasoning = 'Based on content analysis';
    
    if (content.includes('authentication') || content.includes('security') || content.includes('jwt') || content.includes('oauth')) {
      category = 'Security';
      confidence = 0.9;
      reasoning = 'Contains security-related terms';
    } else if (content.includes('database') || content.includes('sql') || content.includes('query') || content.includes('schema')) {
      category = 'Database';
      confidence = 0.85;
      reasoning = 'Contains database-related terms';
    } else if (content.includes('api') || content.includes('endpoint') || content.includes('rest') || content.includes('graphql')) {
      category = 'API';
      confidence = 0.8;
      reasoning = 'Contains API-related terms';
    } else if (content.includes('performance') || content.includes('optimization') || content.includes('caching') || content.includes('speed')) {
      category = 'Performance';
      confidence = 0.85;
      reasoning = 'Contains performance-related terms';
    } else if (content.includes('documentation') || content.includes('guide') || content.includes('tutorial') || content.includes('example')) {
      category = 'Documentation';
      confidence = 0.8;
      reasoning = 'Contains documentation-related terms';
    }
    
    // Tag extraction
    const tags: string[] = [];
    const tagPatterns = [
      'authentication', 'authorization', 'security', 'database', 'api', 'performance',
      'optimization', 'caching', 'documentation', 'tutorial', 'example', 'best-practice',
      'react', 'typescript', 'javascript', 'nodejs', 'express', 'mongodb', 'postgresql'
    ];
    
    tagPatterns.forEach(tag => {
      if (content.includes(tag)) {
        tags.push(tag);
      }
    });
    
    return {
      category,
      subcategory: this.getSubcategory(category, content),
      tags,
      confidence,
      reasoning
    };
  }

  private getSubcategory(category: string, content: string): string | undefined {
    switch (category) {
      case 'Security':
        if (content.includes('jwt')) return 'JWT Authentication';
        if (content.includes('oauth')) return 'OAuth';
        if (content.includes('encryption')) return 'Encryption';
        return 'General Security';
      case 'Database':
        if (content.includes('query')) return 'Query Optimization';
        if (content.includes('schema')) return 'Schema Design';
        if (content.includes('index')) return 'Indexing';
        return 'General Database';
      case 'API':
        if (content.includes('rest')) return 'REST API';
        if (content.includes('graphql')) return 'GraphQL';
        if (content.includes('documentation')) return 'API Documentation';
        return 'General API';
      default:
        return undefined;
    }
  }

  // Result Summarization
  summarizeResults(results: any[]): AIResponse {
    if (results.length === 0) {
      return {
        type: 'summary',
        content: 'No results found for your search query.',
        confidence: 1.0
      };
    }
    
    const categories = [...new Set(results.map(r => r.category))];
    const sources = [...new Set(results.map(r => r.source))];
    const avgRelevance = results.reduce((sum, r) => sum + (r.relevance || 0), 0) / results.length;
    
    let summary = `Found ${results.length} results across ${categories.length} categories. `;
    
    if (categories.length > 0) {
      summary += `Main categories: ${categories.slice(0, 3).join(', ')}. `;
    }
    
    if (sources.length > 0) {
      summary += `Sources include: ${sources.slice(0, 3).join(', ')}. `;
    }
    
    if (avgRelevance > 0.8) {
      summary += 'Results show high relevance to your query.';
    } else if (avgRelevance > 0.6) {
      summary += 'Results show moderate relevance to your query.';
    } else {
      summary += 'Consider refining your search terms for better results.';
    }
    
    return {
      type: 'summary',
      content: summary,
      confidence: 0.8,
      metadata: {
        resultCount: results.length,
        categories,
        sources,
        averageRelevance: avgRelevance
      }
    };
  }

  // Trend Analysis
  analyzeTrends(searchHistory: Array<{ query: string; timestamp: Date; results: number }>): SearchInsight[] {
    const insights: SearchInsight[] = [];
    
    // Analyze query frequency
    const queryCounts = new Map<string, number>();
    searchHistory.forEach(entry => {
      const count = queryCounts.get(entry.query) || 0;
      queryCounts.set(entry.query, count + 1);
    });
    
    // Find trending queries
    const sortedQueries = Array.from(queryCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);
    
    if (sortedQueries.length > 0) {
      insights.push({
        type: 'trend',
        title: 'Popular Search Queries',
        description: `Most searched terms: ${sortedQueries.map(([query, count]) => `${query} (${count})`).join(', ')}`,
        confidence: 0.9,
        actionable: true,
        metadata: { trendingQueries: sortedQueries }
      });
    }
    
    // Analyze search success rate
    const successfulSearches = searchHistory.filter(entry => entry.results > 0).length;
    const successRate = successfulSearches / searchHistory.length;
    
    if (successRate < 0.5) {
      insights.push({
        type: 'warning',
        title: 'Low Search Success Rate',
        description: `Only ${Math.round(successRate * 100)}% of searches returned results. Consider improving search terms or expanding the search index.`,
        confidence: 0.8,
        actionable: true,
        metadata: { successRate }
      });
    }
    
    // Analyze search patterns
    const recentSearches = searchHistory
      .filter(entry => Date.now() - entry.timestamp.getTime() < 7 * 24 * 60 * 60 * 1000) // Last 7 days
      .length;
    
    if (recentSearches > 20) {
      insights.push({
        type: 'pattern',
        title: 'High Search Activity',
        description: `${recentSearches} searches in the last 7 days. This indicates active usage of the search feature.`,
        confidence: 0.7,
        actionable: false,
        metadata: { recentSearches }
      });
    }
    
    return insights;
  }

  // Smart Filter Suggestions
  generateSmartFilters(query: string, results: any[]): AIResponse {
    const filters: string[] = [];
    
    // Category-based filters
    const categories = [...new Set(results.map(r => r.category))];
    if (categories.length > 1) {
      filters.push(`Filter by category: ${categories.join(', ')}`);
    }
    
    // Source-based filters
    const sources = [...new Set(results.map(r => r.source))];
    if (sources.length > 1) {
      filters.push(`Filter by source: ${sources.join(', ')}`);
    }
    
    // Date-based filters
    const dates = results.map(r => r.timestamp).filter(Boolean);
    if (dates.length > 0) {
      const recent = dates.filter(d => Date.now() - d.getTime() < 30 * 24 * 60 * 60 * 1000).length;
      if (recent > 0) {
        filters.push(`Show recent results (last 30 days): ${recent} results`);
      }
    }
    
    // Relevance-based filters
    const highRelevance = results.filter(r => r.relevance > 0.8).length;
    if (highRelevance > 0) {
      filters.push(`Show high relevance results: ${highRelevance} results`);
    }
    
    return {
      type: 'suggestion',
      content: filters.length > 0 ? `Smart filter suggestions: ${filters.join('; ')}` : 'No additional filters needed for this search.',
      confidence: 0.7,
      metadata: { suggestedFilters: filters }
    };
  }

  // Public API methods
  getQueryHistory(): Array<{ query: string; timestamp: Date; results: number }> {
    return [...this.queryHistory];
  }

  addQueryToHistory(query: string, results: number): void {
    this.queryHistory.push({
      query,
      timestamp: new Date(),
      results
    });
    
    // Keep only last 100 queries
    if (this.queryHistory.length > 100) {
      this.queryHistory = this.queryHistory.slice(-100);
    }
  }

  getUserPreferences(): Record<string, any> {
    return { ...this.userPreferences };
  }

  updateUserPreferences(preferences: Record<string, any>): void {
    this.userPreferences = { ...this.userPreferences, ...preferences };
  }
}

// Export singleton instance
export const aiSearchAssistant = AISearchAssistant.getInstance();
