// Real-Time Search System Integration
// Main entry point for the enhanced real-time search system with Transformers.js

import { transformersIntegration } from './transformersIntegration';
import { enhancedRealTimeSearchEngine } from './enhancedRealTimeSearchEngine';
import { realTimeDataStream } from './realtimeDataStream';
import { livePerformanceMonitor } from './livePerformanceMonitor';
import { searchDataInitializer } from './searchDataInitializer';
import { semanticSearchEngine } from './semanticSearchEngine';
import { searchDataManager } from './searchDataManager';

export interface SystemStatus {
  transformers: {
    initialized: boolean;
    modelName: string;
    cacheSize: number;
  };
  searchEngine: {
    documentCount: number;
    embeddingCount: number;
    cacheSize: number;
  };
  dataStream: {
    activeSessions: number;
    totalSessions: number;
    queuedEvents: number;
  };
  performance: {
    monitoring: boolean;
    totalMetrics: number;
    activeAlerts: number;
    averageLatency: number;
  };
  data: {
    initialized: boolean;
    documentCount: number;
    searchHistoryCount: number;
    savedSearchesCount: number;
    alertsCount: number;
  };
}

export class RealTimeSearchSystem {
  private static instance: RealTimeSearchSystem;
  private isInitialized = false;
  private initializationPromise: Promise<void> | null = null;

  private constructor() {}

  static getInstance(): RealTimeSearchSystem {
    if (!RealTimeSearchSystem.instance) {
      RealTimeSearchSystem.instance = new RealTimeSearchSystem();
    }
    return RealTimeSearchSystem.instance;
  }

  // Initialize the entire real-time search system
  async initialize(): Promise<void> {
    if (this.initializationPromise) {
      return this.initializationPromise;
    }

    this.initializationPromise = this.performInitialization();
    return this.initializationPromise;
  }

  private async performInitialization(): Promise<void> {
    try {
      console.log('🚀 Initializing Real-Time Search System...');

      // Step 1: Initialize Transformers.js
      console.log('📦 Loading Transformers.js model...');
      const modelInfo = transformersIntegration.getModelInfo();
      console.log(`✅ Model loaded: ${modelInfo.name} (Initialized: ${modelInfo.initialized})`);

      // Step 2: Initialize search data
      console.log('📊 Initializing search data...');
      await searchDataInitializer.initialize();
      const dataStats = searchDataInitializer.getSystemStats();
      console.log(`✅ Data initialized: ${dataStats.documentCount} documents, ${dataStats.searchHistoryCount} history items`);

      // Step 3: Start performance monitoring
      console.log('📈 Starting performance monitoring...');
      livePerformanceMonitor.startMonitoring();
      console.log('✅ Performance monitoring started');

      // Step 4: Set up event listeners
      console.log('🔗 Setting up event listeners...');
      this.setupEventListeners();
      console.log('✅ Event listeners configured');

      this.isInitialized = true;
      console.log('🎉 Real-Time Search System initialized successfully!');
      console.log('🔍 System ready for semantic search with Transformers.js');

    } catch (error) {
      console.error('❌ Failed to initialize Real-Time Search System:', error);
      throw error;
    }
  }

  // Set up event listeners for system coordination
  private setupEventListeners(): void {
    // Performance monitoring events
    livePerformanceMonitor.addEventListener('alert_created', (alert) => {
      console.warn(`⚠️ Performance Alert: ${alert.message}`);
    });

    // Search engine events
    enhancedRealTimeSearchEngine.addEventListener('complete', (event) => {
      // Record search completion in performance monitor
      livePerformanceMonitor.recordSearchPerformance(
        event.latency || 0,
        event.data?.length || 0,
        true
      );
    });

    enhancedRealTimeSearchEngine.addEventListener('error', (event) => {
      // Record search error in performance monitor
      livePerformanceMonitor.recordSearchPerformance(
        event.latency || 0,
        0,
        false
      );
    });
  }

  // Get comprehensive system status
  getSystemStatus(): SystemStatus {
    const transformersInfo = transformersIntegration.getModelInfo();
    const searchEngineStats = enhancedRealTimeSearchEngine.getIndexStats();
    const dataStreamStats = realTimeDataStream.getSessionStats();
    const performanceStats = livePerformanceMonitor.getSystemStats();
    const dataStats = searchDataInitializer.getSystemStats();

    return {
      transformers: {
        initialized: transformersInfo.initialized,
        modelName: transformersInfo.name,
        cacheSize: transformersInfo.cacheSize
      },
      searchEngine: {
        documentCount: searchEngineStats.documentCount,
        embeddingCount: searchEngineStats.embeddingCount,
        cacheSize: searchEngineStats.cacheSize
      },
      dataStream: {
        activeSessions: dataStreamStats.activeSessions,
        totalSessions: dataStreamStats.totalSessions,
        queuedEvents: dataStreamStats.queuedEvents
      },
      performance: {
        monitoring: livePerformanceMonitor.isMonitoringActive(),
        totalMetrics: performanceStats.totalMetrics,
        activeAlerts: performanceStats.activeAlerts,
        averageLatency: performanceStats.averageLatency
      },
      data: {
        initialized: dataStats.isInitialized,
        documentCount: dataStats.documentCount,
        searchHistoryCount: dataStats.searchHistoryCount,
        savedSearchesCount: dataStats.savedSearchesCount,
        alertsCount: dataStats.alertsCount
      }
    };
  }

  // Perform a comprehensive search with all features
  async search(
    query: string,
    options: {
      enableSemantic?: boolean;
      enableExpansion?: boolean;
      enableAutoComplete?: boolean;
      enableStreaming?: boolean;
      maxResults?: number;
    } = {}
  ): Promise<{
    results: any[];
    insights: any;
    performance: any;
    suggestions: string[];
  }> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    const searchOptions = {
      enableSemantic: true,
      enableExpansion: true,
      enableAutoComplete: true,
      enableStreaming: true,
      maxResults: 20,
      ...options
    };

    try {
      // Perform the search
      const results = await enhancedRealTimeSearchEngine.searchRealTime(query, searchOptions);

      // Generate insights
      const insights = enhancedRealTimeSearchEngine.generateSearchInsights(query);

      // Get performance metrics
      const performance = enhancedRealTimeSearchEngine.getPerformanceMetrics();

      // Generate suggestions
      const autoCompletion = await transformersIntegration.generateAutoCompletion(query);
      const suggestions = autoCompletion.suggestions;

      return {
        results,
        insights,
        performance,
        suggestions
      };

    } catch (error) {
      console.error('Search failed:', error);
      throw error;
    }
  }

  // Add a document to the search index
  async addDocument(document: {
    id: string;
    title: string;
    content: string;
    type: 'table' | 'schema' | 'query' | 'workflow' | 'documentation';
    metadata?: Record<string, any>;
  }): Promise<void> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    // Ensure metadata is always defined
    const documentWithMetadata = {
      ...document,
      metadata: document.metadata || {}
    };

    await enhancedRealTimeSearchEngine.addDocument(documentWithMetadata);
    await semanticSearchEngine.addDocument(documentWithMetadata);
  }

  // Get search suggestions
  async getSuggestions(query: string, limit: number = 5): Promise<string[]> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    const autoCompletion = await transformersIntegration.generateAutoCompletion(query, '', limit);
    return autoCompletion.suggestions;
  }

  // Expand a query
  async expandQuery(query: string): Promise<{
    originalQuery: string;
    expandedQueries: string[];
    relatedTerms: string[];
    confidence: number;
  }> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    return await transformersIntegration.expandQuery(query);
  }

  // Get performance dashboard data
  getPerformanceDashboard(): any {
    return livePerformanceMonitor.getDashboard();
  }

  // Get search analytics
  getSearchAnalytics(): any {
    return {
      searchHistory: searchDataManager.getHistory(),
      savedSearches: searchDataManager.getSavedSearches(),
      alerts: searchDataManager.getAlerts(),
      performance: livePerformanceMonitor.getDashboard()
    };
  }

  // Clear all caches
  clearCaches(): void {
    transformersIntegration.clearCache();
    enhancedRealTimeSearchEngine.clearCache();
    semanticSearchEngine.clearIndex();
  }

  // Reset the entire system
  async reset(): Promise<void> {
    try {
      console.log('🔄 Resetting Real-Time Search System...');

      // Stop monitoring
      livePerformanceMonitor.stopMonitoring();

      // Clear all data
      await searchDataInitializer.reset();
      this.clearCaches();

      // Reset initialization state
      this.isInitialized = false;
      this.initializationPromise = null;

      console.log('✅ System reset completed');
    } catch (error) {
      console.error('❌ Failed to reset system:', error);
      throw error;
    }
  }

  // Check if system is initialized
  isSystemInitialized(): boolean {
    return this.isInitialized;
  }

  // Get system health
  getSystemHealth(): {
    status: 'healthy' | 'degraded' | 'critical';
    issues: string[];
    recommendations: string[];
  } {
    const status = this.getSystemStatus();
    const issues: string[] = [];
    const recommendations: string[] = [];

    // Check Transformers.js status
    if (!status.transformers.initialized) {
      issues.push('Transformers.js model not initialized');
      recommendations.push('Restart the system to reload the model');
    }

    // Check performance
    if (status.performance.averageLatency > 1000) {
      issues.push('High search latency detected');
      recommendations.push('Consider optimizing queries or increasing resources');
    }

    if (status.performance.activeAlerts > 0) {
      issues.push(`${status.performance.activeAlerts} active performance alerts`);
      recommendations.push('Review performance metrics and resolve alerts');
    }

    // Check data initialization
    if (!status.data.initialized) {
      issues.push('Search data not initialized');
      recommendations.push('Initialize the search system');
    }

    // Determine overall status
    let overallStatus: 'healthy' | 'degraded' | 'critical' = 'healthy';
    if (issues.length > 2) {
      overallStatus = 'critical';
    } else if (issues.length > 0) {
      overallStatus = 'degraded';
    }

    return {
      status: overallStatus,
      issues,
      recommendations
    };
  }
}

// Export singleton instance
export const realTimeSearchSystem = RealTimeSearchSystem.getInstance();

// Auto-initialize the system when imported
realTimeSearchSystem.initialize().catch(error => {
  console.error('Failed to auto-initialize Real-Time Search System:', error);
});
