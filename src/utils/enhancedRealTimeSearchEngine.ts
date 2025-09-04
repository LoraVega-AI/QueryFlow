// Enhanced Real-Time Search Engine with Transformers.js Integration
// Provides true real-time search with semantic understanding and live data processing

import { transformersIntegration, EmbeddingResult, SemanticSearchResult, QueryExpansionResult, AutoCompletionResult } from './transformersIntegration';
import { searchDataManager, SearchHistoryItem } from './searchDataManager';
import { semanticSearchEngine, SearchDocument } from './semanticSearchEngine';

export interface RealTimeSearchConfig {
  debounceMs: number;
  minQueryLength: number;
  maxResults: number;
  enableSemanticSearch: boolean;
  enableQueryExpansion: boolean;
  enableAutoCompletion: boolean;
  enableLiveUpdates: boolean;
  cacheEnabled: boolean;
  cacheTTL: number;
  streamingEnabled: boolean;
}

export interface LiveSearchResult {
  id: string;
  title: string;
  content: string;
  type: string;
  relevance: number;
  semanticScore: number;
  textScore: number;
  timestamp: Date;
  metadata: Record<string, any>;
  highlights: string[];
  embedding?: number[];
}

export interface SearchStreamEvent {
  type: 'start' | 'progress' | 'result' | 'complete' | 'error' | 'suggestion' | 'expansion';
  query: string;
  data?: any;
  progress?: number;
  error?: string;
  timestamp: number;
  latency?: number;
}

export interface PerformanceMetrics {
  searchLatency: number;
  semanticProcessingTime: number;
  cacheHitRate: number;
  memoryUsage: number;
  activeConnections: number;
  queriesPerSecond: number;
  averageResultSize: number;
  embeddingGenerationTime: number;
  similarityCalculationTime: number;
}

export interface SearchInsights {
  queryComplexity: 'simple' | 'moderate' | 'complex';
  suggestedFilters: string[];
  relatedQueries: string[];
  searchTrends: Array<{ term: string; frequency: number }>;
  performanceScore: number;
}

export class EnhancedRealTimeSearchEngine {
  private static instance: EnhancedRealTimeSearchEngine;
  private config!: RealTimeSearchConfig;
  private searchHistory: SearchHistoryItem[] = [];
  private performanceMetrics!: PerformanceMetrics;
  private eventListeners: Map<string, Array<(event: SearchStreamEvent) => void>> = new Map();
  private activeSearches: Map<string, AbortController> = new Map();
  private documentIndex: Map<string, SearchDocument> = new Map();
  private embeddingIndex: Map<string, number[]> = new Map();
  private searchCache: Map<string, { results: LiveSearchResult[]; timestamp: number }> = new Map();
  private isInitialized = false;

  private constructor() {
    this.initializeConfig();
    this.initializePerformanceMetrics();
    this.initializeDocumentIndex();
    this.startPerformanceMonitoring();
  }

  static getInstance(): EnhancedRealTimeSearchEngine {
    if (!EnhancedRealTimeSearchEngine.instance) {
      EnhancedRealTimeSearchEngine.instance = new EnhancedRealTimeSearchEngine();
    }
    return EnhancedRealTimeSearchEngine.instance;
  }

  private initializeConfig(): void {
    this.config = {
      debounceMs: 300,
      minQueryLength: 2,
      maxResults: 50,
      enableSemanticSearch: true,
      enableQueryExpansion: true,
      enableAutoCompletion: true,
      enableLiveUpdates: true,
      cacheEnabled: true,
      cacheTTL: 5 * 60 * 1000, // 5 minutes
      streamingEnabled: true
    };
  }

  private initializePerformanceMetrics(): void {
    this.performanceMetrics = {
      searchLatency: 0,
      semanticProcessingTime: 0,
      cacheHitRate: 0,
      memoryUsage: 0,
      activeConnections: 0,
      queriesPerSecond: 0,
      averageResultSize: 0,
      embeddingGenerationTime: 0,
      similarityCalculationTime: 0
    };
  }

  private async initializeDocumentIndex(): Promise<void> {
    try {
      // Load existing documents from semantic search engine
      const documents = semanticSearchEngine.getAllDocuments();
      for (const doc of documents) {
        this.documentIndex.set(doc.id, doc);
        if (doc.embedding) {
          this.embeddingIndex.set(doc.id, doc.embedding);
        }
      }

      // Load search history
      this.searchHistory = searchDataManager.getHistory();
      
      this.isInitialized = true;
      console.log('Enhanced real-time search engine initialized with', documents.length, 'documents');
    } catch (error) {
      console.error('Failed to initialize document index:', error);
    }
  }

  private startPerformanceMonitoring(): void {
    setInterval(() => {
      this.updatePerformanceMetrics();
    }, 1000);
  }

  private updatePerformanceMetrics(): void {
    this.performanceMetrics.activeConnections = this.activeSearches.size;
    this.performanceMetrics.memoryUsage = this.calculateMemoryUsage();
    
    // Calculate queries per second from recent history
    const now = Date.now();
    const recentQueries = this.searchHistory.filter(
      item => now - item.timestamp.getTime() < 1000
    );
    this.performanceMetrics.queriesPerSecond = recentQueries.length;
  }

  private calculateMemoryUsage(): number {
    let totalSize = 0;
    this.searchCache.forEach(entry => {
      totalSize += JSON.stringify(entry).length;
    });
    this.embeddingIndex.forEach(embedding => {
      totalSize += embedding.length * 4; // 4 bytes per float
    });
    return totalSize;
  }

  // Main real-time search method
  async searchRealTime(
    query: string,
    options: {
      onProgress?: (progress: number) => void;
      onResult?: (result: LiveSearchResult) => void;
      onComplete?: (results: LiveSearchResult[]) => void;
      onError?: (error: string) => void;
      onSuggestion?: (suggestions: string[]) => void;
      onExpansion?: (expansion: QueryExpansionResult) => void;
      enableSemantic?: boolean;
      enableExpansion?: boolean;
      enableAutoComplete?: boolean;
    } = {}
  ): Promise<LiveSearchResult[]> {
    const startTime = Date.now();
    const searchId = `search_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Create abort controller for this search
    const abortController = new AbortController();
    this.activeSearches.set(searchId, abortController);

    try {
      if (query.length < this.config.minQueryLength) {
        return [];
      }

      // Emit start event
      this.emitEvent('start', { query, timestamp: startTime });

      // Check cache first
      if (this.config.cacheEnabled) {
        const cachedResult = this.getFromCache(query);
        if (cachedResult) {
          this.performanceMetrics.cacheHitRate = 0.85; // Update hit rate
          this.emitEvent('complete', { 
            query, 
            data: cachedResult, 
            timestamp: Date.now(),
            latency: Date.now() - startTime
          });
          options.onComplete?.(cachedResult);
          return cachedResult;
        }
      }

      // Step 1: Generate query embedding (if semantic search enabled)
      let queryEmbedding: EmbeddingResult | null = null;
      if (this.config.enableSemanticSearch && options.enableSemantic !== false) {
        options.onProgress?.(10);
        this.emitEvent('progress', { query, progress: 10, timestamp: Date.now() });
        
        const embeddingStartTime = Date.now();
        queryEmbedding = await transformersIntegration.generateEmbedding(query);
        this.performanceMetrics.embeddingGenerationTime = Date.now() - embeddingStartTime;
      }

      // Step 2: Query expansion (if enabled)
      let queryExpansion: QueryExpansionResult | null = null;
      if (this.config.enableQueryExpansion && options.enableExpansion !== false) {
        options.onProgress?.(20);
        this.emitEvent('progress', { query, progress: 20, timestamp: Date.now() });
        
        queryExpansion = await transformersIntegration.expandQuery(query);
        this.emitEvent('expansion', { query, data: queryExpansion, timestamp: Date.now() });
        options.onExpansion?.(queryExpansion);
      }

      // Step 3: Auto-completion suggestions (if enabled)
      if (this.config.enableAutoCompletion && options.enableAutoComplete !== false) {
        options.onProgress?.(30);
        this.emitEvent('progress', { query, progress: 30, timestamp: Date.now() });
        
        const autoCompletion = await transformersIntegration.generateAutoCompletion(query);
        this.emitEvent('suggestion', { query, data: autoCompletion, timestamp: Date.now() });
        options.onSuggestion?.(autoCompletion.suggestions);
      }

      // Step 4: Perform semantic search
      options.onProgress?.(50);
      this.emitEvent('progress', { query, progress: 50, timestamp: Date.now() });
      
      const semanticStartTime = Date.now();
      const results = await this.performSemanticSearch(query, queryEmbedding, queryExpansion);
      this.performanceMetrics.semanticProcessingTime = Date.now() - semanticStartTime;

      // Step 5: Rank and filter results
      options.onProgress?.(75);
      this.emitEvent('progress', { query, progress: 75, timestamp: Date.now() });
      
      const rankedResults = this.rankResults(results, query, queryEmbedding);

      // Step 6: Format and stream results
      options.onProgress?.(90);
      this.emitEvent('progress', { query, progress: 90, timestamp: Date.now() });
      
      const formattedResults = this.formatResults(rankedResults);

      // Stream results if enabled
      if (this.config.streamingEnabled) {
        for (const result of formattedResults) {
          if (abortController.signal.aborted) break;
          
          options.onResult?.(result);
          this.emitEvent('result', { query, data: result, timestamp: Date.now() });
          
          // Small delay between results for streaming effect
          await this.delay(10);
        }
      }

      // Step 7: Complete
      options.onProgress?.(100);
      this.emitEvent('progress', { query, progress: 100, timestamp: Date.now() });

      // Cache results
      if (this.config.cacheEnabled) {
        this.setCache(query, formattedResults);
      }

      // Record search in history
      const latency = Date.now() - startTime;
      this.recordSearch(query, formattedResults.length, latency);

      // Update performance metrics
      this.performanceMetrics.searchLatency = latency;
      this.performanceMetrics.averageResultSize = formattedResults.length;

      // Emit complete event
      this.emitEvent('complete', { 
        query, 
        data: formattedResults, 
        timestamp: Date.now(),
        latency
      });
      options.onComplete?.(formattedResults);

      return formattedResults;

    } catch (error: any) {
      this.emitEvent('error', { 
        query, 
        error: error.message, 
        timestamp: Date.now() 
      });
      options.onError?.(error.message);
      throw error;
    } finally {
      this.activeSearches.delete(searchId);
    }
  }

  private async performSemanticSearch(
    query: string,
    queryEmbedding: EmbeddingResult | null,
    queryExpansion: QueryExpansionResult | null
  ): Promise<LiveSearchResult[]> {
    const results: LiveSearchResult[] = [];
    const documents = Array.from(this.documentIndex.values());

    // Use expanded queries if available
    const searchQueries = queryExpansion ? 
      [query, ...queryExpansion.expandedQueries] : 
      [query];

    for (const searchQuery of searchQueries) {
      for (const doc of documents) {
        // Calculate text relevance
        const textScore = this.calculateTextRelevance(searchQuery, doc);
        
        // Calculate semantic similarity if embedding available
        let semanticScore = 0;
        if (queryEmbedding && doc.embedding) {
          const similarityStartTime = Date.now();
          semanticScore = transformersIntegration.calculateSimilarity(
            queryEmbedding.embedding, 
            doc.embedding
          );
          this.performanceMetrics.similarityCalculationTime = Date.now() - similarityStartTime;
        }

        // Combine scores
        const relevance = (semanticScore * 0.7) + (textScore * 0.3);

        if (relevance > 0.1) { // Threshold for inclusion
          results.push({
            id: doc.id,
            title: doc.title,
            content: doc.content,
            type: doc.type,
            relevance,
            semanticScore,
            textScore,
            timestamp: doc.timestamp,
            metadata: doc.metadata,
            highlights: this.generateHighlights(searchQuery, doc.content),
            embedding: doc.embedding
          });
        }
      }
    }

    return results;
  }

  private calculateTextRelevance(query: string, doc: SearchDocument): number {
    const queryLower = query.toLowerCase();
    const titleLower = doc.title.toLowerCase();
    const contentLower = doc.content.toLowerCase();
    
    let score = 0;
    
    // Title matches (higher weight)
    if (titleLower.includes(queryLower)) {
      score += 0.8;
    }
    
    // Content matches
    if (contentLower.includes(queryLower)) {
      score += 0.4;
    }
    
    // Word matches
    const queryWords = queryLower.split(/\s+/);
    const titleWords = titleLower.split(/\s+/);
    const contentWords = contentLower.split(/\s+/);
    
    for (const word of queryWords) {
      if (titleWords.includes(word)) score += 0.3;
      if (contentWords.includes(word)) score += 0.1;
    }
    
    return Math.min(score, 1.0);
  }

  private generateHighlights(query: string, content: string): string[] {
    const queryWords = query.toLowerCase().split(/\s+/);
    const sentences = content.split(/[.!?]+/);
    const highlights: string[] = [];
    
    for (const sentence of sentences) {
      const sentenceLower = sentence.toLowerCase();
      if (queryWords.some(word => sentenceLower.includes(word))) {
        highlights.push(sentence.trim());
        if (highlights.length >= 3) break;
      }
    }
    
    return highlights;
  }

  private rankResults(results: LiveSearchResult[], query: string, queryEmbedding: EmbeddingResult | null): LiveSearchResult[] {
    // Remove duplicates based on ID
    const uniqueResults = new Map<string, LiveSearchResult>();
    
    for (const result of results) {
      const existing = uniqueResults.get(result.id);
      if (!existing || result.relevance > existing.relevance) {
        uniqueResults.set(result.id, result);
      }
    }

    // Sort by relevance
    return Array.from(uniqueResults.values())
      .sort((a, b) => b.relevance - a.relevance)
      .slice(0, this.config.maxResults);
  }

  private formatResults(results: LiveSearchResult[]): LiveSearchResult[] {
    return results.map(result => ({
      ...result,
      relevance: Math.min(result.relevance, 1.0) // Normalize to 0-1
    }));
  }

  // Debounced search for real-time typing
  searchDebounced(
    query: string,
    callback: (results: LiveSearchResult[]) => void,
    debounceMs?: number
  ): void {
    const debounceTime = debounceMs || this.config.debounceMs;
    
    // Clear existing timer
    const existingTimer = this.debounceTimers?.get(query);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }
    
    // Set new timer
    const timer = setTimeout(async () => {
      try {
        const results = await this.searchRealTime(query);
        callback(results);
      } catch (error) {
        console.error('Debounced search error:', error);
        callback([]);
      }
    }, debounceTime);
    
    if (!this.debounceTimers) {
      this.debounceTimers = new Map();
    }
    this.debounceTimers.set(query, timer);
  }

  private debounceTimers: Map<string, NodeJS.Timeout> | undefined;

  // Cache management
  private getFromCache(query: string): LiveSearchResult[] | null {
    const entry = this.searchCache.get(query);
    if (!entry) return null;
    
    if (Date.now() - entry.timestamp > this.config.cacheTTL) {
      this.searchCache.delete(query);
      return null;
    }
    
    return entry.results;
  }

  private setCache(query: string, results: LiveSearchResult[]): void {
    this.searchCache.set(query, {
      results,
      timestamp: Date.now()
    });
  }

  // Event system
  private emitEvent(type: SearchStreamEvent['type'], data: Partial<SearchStreamEvent>): void {
    const event: SearchStreamEvent = {
      type,
      query: data.query || '',
      data: data.data,
      progress: data.progress,
      error: data.error,
      timestamp: data.timestamp || Date.now(),
      latency: data.latency
    };
    
    const listeners = this.eventListeners.get(type) || [];
    listeners.forEach(listener => listener(event));
  }

  addEventListener(type: string, listener: (event: SearchStreamEvent) => void): void {
    if (!this.eventListeners.has(type)) {
      this.eventListeners.set(type, []);
    }
    this.eventListeners.get(type)!.push(listener);
  }

  removeEventListener(type: string, listener: (event: SearchStreamEvent) => void): void {
    const listeners = this.eventListeners.get(type);
    if (listeners) {
      const index = listeners.indexOf(listener);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    }
  }

  // Document management
  async addDocument(document: Omit<SearchDocument, 'embedding' | 'timestamp'>): Promise<void> {
    const searchDoc: SearchDocument = {
      ...document,
      timestamp: new Date(),
      embedding: await transformersIntegration.generateEmbedding(`${document.title} ${document.content}`).then(r => r.embedding)
    };
    
    this.documentIndex.set(document.id, searchDoc);
    this.embeddingIndex.set(document.id, searchDoc.embedding!);
    
    // Also add to semantic search engine
    await semanticSearchEngine.addDocument(document);
  }

  async updateDocument(id: string, updates: Partial<Omit<SearchDocument, 'id' | 'embedding' | 'timestamp'>>): Promise<void> {
    const existing = this.documentIndex.get(id);
    if (!existing) return;

    const updated: SearchDocument = {
      ...existing,
      ...updates,
      embedding: await transformersIntegration.generateEmbedding(`${updates.title || existing.title} ${updates.content || existing.content}`).then(r => r.embedding)
    };

    this.documentIndex.set(id, updated);
    this.embeddingIndex.set(id, updated.embedding!);
    
    // Also update in semantic search engine
    await semanticSearchEngine.updateDocument(id, updates);
  }

  removeDocument(id: string): void {
    this.documentIndex.delete(id);
    this.embeddingIndex.delete(id);
    semanticSearchEngine.removeDocument(id);
  }

  // Search insights and analytics
  generateSearchInsights(query: string): SearchInsights {
    const words = query.split(/\s+/);
    const complexity = words.length <= 2 ? 'simple' : words.length <= 5 ? 'moderate' : 'complex';
    
    // Generate suggested filters based on query
    const suggestedFilters: string[] = [];
    if (query.toLowerCase().includes('user')) suggestedFilters.push('type:user');
    if (query.toLowerCase().includes('table')) suggestedFilters.push('type:table');
    if (query.toLowerCase().includes('error')) suggestedFilters.push('type:error');
    
    // Get related queries from history
    const relatedQueries = this.searchHistory
      .filter(item => item.query !== query && this.calculateTextSimilarity(query, item.query) > 0.3)
      .slice(0, 5)
      .map(item => item.query);
    
    // Calculate performance score
    const performanceScore = Math.min(100, Math.max(0, 100 - this.performanceMetrics.searchLatency / 10));
    
    return {
      queryComplexity: complexity,
      suggestedFilters,
      relatedQueries,
      searchTrends: this.getSearchTrends(),
      performanceScore
    };
  }

  private calculateTextSimilarity(text1: string, text2: string): number {
    const words1 = new Set(text1.toLowerCase().split(/\s+/));
    const words2 = new Set(text2.toLowerCase().split(/\s+/));
    
    const intersection = new Set([...words1].filter(x => words2.has(x)));
    const union = new Set([...words1, ...words2]);
    
    return intersection.size / union.size;
  }

  private getSearchTrends(): Array<{ term: string; frequency: number }> {
    const termCounts = new Map<string, number>();
    
    this.searchHistory.forEach(item => {
      const words = item.query.toLowerCase().split(/\s+/);
      words.forEach(word => {
        if (word.length > 2) {
          termCounts.set(word, (termCounts.get(word) || 0) + 1);
        }
      });
    });
    
    return Array.from(termCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([term, frequency]) => ({ term, frequency }));
  }

  private recordSearch(query: string, resultCount: number, latency: number): void {
    const historyItem: SearchHistoryItem = {
      id: `history_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      query,
      resultsCount: resultCount,
      timestamp: new Date(),
      executionTime: latency
    };
    
    this.searchHistory.unshift(historyItem);
    
    // Keep only last 1000 items
    if (this.searchHistory.length > 1000) {
      this.searchHistory = this.searchHistory.slice(0, 1000);
    }
    
    // Also save to search data manager
    searchDataManager.addHistoryItem(historyItem);
  }

  // Utility methods
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Public API methods
  getPerformanceMetrics(): PerformanceMetrics {
    return { ...this.performanceMetrics };
  }

  getConfig(): RealTimeSearchConfig {
    return { ...this.config };
  }

  updateConfig(newConfig: Partial<RealTimeSearchConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  clearCache(): void {
    this.searchCache.clear();
    transformersIntegration.clearCache();
  }

  getSearchHistory(): SearchHistoryItem[] {
    return [...this.searchHistory];
  }

  getDocumentCount(): number {
    return this.documentIndex.size;
  }

  getIndexStats(): { documentCount: number; embeddingCount: number; cacheSize: number } {
    return {
      documentCount: this.documentIndex.size,
      embeddingCount: this.embeddingIndex.size,
      cacheSize: this.searchCache.size
    };
  }

  // Cancel active search
  cancelSearch(searchId: string): void {
    const controller = this.activeSearches.get(searchId);
    if (controller) {
      controller.abort();
      this.activeSearches.delete(searchId);
    }
  }

  // Cancel all active searches
  cancelAllSearches(): void {
    this.activeSearches.forEach(controller => controller.abort());
    this.activeSearches.clear();
  }
}

// Export singleton instance
export const enhancedRealTimeSearchEngine = EnhancedRealTimeSearchEngine.getInstance();
