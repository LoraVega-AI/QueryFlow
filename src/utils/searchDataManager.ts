// Search Data Manager for Advanced Search CRUD operations
// Handles persistence and management of search-related data

import { safeStorage } from './safeStorage';

export interface SearchAlert {
  id: string;
  name: string;
  description: string;
  severity: 'low' | 'medium' | 'high';
  active: boolean;
  conditions: {
    type: 'search_volume' | 'response_time' | 'error_rate' | 'custom_query';
    threshold: number;
    operator: 'greater_than' | 'less_than' | 'equals' | 'contains';
    value: string | number;
  };
  notifications: {
    email: boolean;
    inApp: boolean;
    webhook?: string;
  };
  createdAt: Date;
  lastTriggered?: Date;
}

export interface SearchHistoryItem {
  id: string;
  query: string;
  filters?: any;
  resultsCount: number;
  timestamp: Date;
  executionTime: number;
}

export interface SavedSearch {
  id: string;
  name: string;
  query: string;
  filters?: any;
  resultsCount: number;
  createdAt: Date;
  lastUsed?: Date;
  category?: string;
  tags: string[];
  isPublic: boolean;
}

export interface AnalyticsMetric {
  id: string;
  name: string;
  type: 'counter' | 'gauge' | 'histogram';
  description: string;
  query: string;
  enabled: boolean;
  schedule?: {
    frequency: 'hourly' | 'daily' | 'weekly' | 'monthly';
    time?: string;
  };
}

export interface AnalyticsReport {
  id: string;
  name: string;
  metrics: string[];
  format: 'csv' | 'json' | 'pdf';
  schedule: {
    frequency: 'daily' | 'weekly' | 'monthly';
    time: string;
    recipients: string[];
  };
  lastGenerated?: Date;
  nextRun?: Date;
}

export class SearchDataManager {
  private static instance: SearchDataManager;
  private alerts: SearchAlert[] = [];
  private history: SearchHistoryItem[] = [];
  private savedSearches: SavedSearch[] = [];
  private analyticsMetrics: AnalyticsMetric[] = [];
  private analyticsReports: AnalyticsReport[] = [];

  private constructor() {
    this.loadFromStorage();
  }

  static getInstance(): SearchDataManager {
    if (!SearchDataManager.instance) {
      SearchDataManager.instance = new SearchDataManager();
    }
    return SearchDataManager.instance;
  }

  // Storage management
  private loadFromStorage(): void {
    try {
      const alertsData = safeStorage.getItem('searchAlerts');
      if (alertsData) {
        this.alerts = JSON.parse(alertsData).map((alert: any) => ({
          ...alert,
          createdAt: new Date(alert.createdAt),
          lastTriggered: alert.lastTriggered ? new Date(alert.lastTriggered) : undefined
        }));
      }

      const historyData = safeStorage.getItem('searchHistory');
      if (historyData) {
        this.history = JSON.parse(historyData).map((item: any) => ({
          ...item,
          timestamp: new Date(item.timestamp)
        }));
      }

      const savedSearchesData = safeStorage.getItem('savedSearches');
      if (savedSearchesData) {
        this.savedSearches = JSON.parse(savedSearchesData).map((search: any) => ({
          ...search,
          createdAt: new Date(search.createdAt),
          lastUsed: search.lastUsed ? new Date(search.lastUsed) : undefined
        }));
      }

      const metricsData = safeStorage.getItem('analyticsMetrics');
      if (metricsData) {
        this.analyticsMetrics = JSON.parse(metricsData);
      }

      const reportsData = safeStorage.getItem('analyticsReports');
      if (reportsData) {
        this.analyticsReports = JSON.parse(reportsData).map((report: any) => ({
          ...report,
          lastGenerated: report.lastGenerated ? new Date(report.lastGenerated) : undefined,
          nextRun: report.nextRun ? new Date(report.nextRun) : undefined
        }));
      }
    } catch (error) {
      console.error('Failed to load search data from storage:', error);
    }
  }

  private saveToStorage(): void {
    try {
      safeStorage.setItem('searchAlerts', JSON.stringify(this.alerts));
      safeStorage.setItem('searchHistory', JSON.stringify(this.history));
      safeStorage.setItem('savedSearches', JSON.stringify(this.savedSearches));
      safeStorage.setItem('analyticsMetrics', JSON.stringify(this.analyticsMetrics));
      safeStorage.setItem('analyticsReports', JSON.stringify(this.analyticsReports));
    } catch (error) {
      console.error('Failed to save search data to storage:', error);
    }
  }

  // Search Alerts CRUD
  createAlert(alert: Omit<SearchAlert, 'id' | 'createdAt'>): SearchAlert {
    const newAlert: SearchAlert = {
      ...alert,
      id: `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      createdAt: new Date()
    };
    this.alerts.push(newAlert);
    this.saveToStorage();
    return newAlert;
  }

  updateAlert(id: string, updates: Partial<SearchAlert>): SearchAlert | null {
    const index = this.alerts.findIndex(alert => alert.id === id);
    if (index === -1) return null;
    
    this.alerts[index] = { ...this.alerts[index], ...updates };
    this.saveToStorage();
    return this.alerts[index];
  }

  deleteAlert(id: string): boolean {
    const index = this.alerts.findIndex(alert => alert.id === id);
    if (index === -1) return false;
    
    this.alerts.splice(index, 1);
    this.saveToStorage();
    return true;
  }

  getAlerts(): SearchAlert[] {
    return [...this.alerts];
  }

  toggleAlert(id: string): SearchAlert | null {
    const alert = this.alerts.find(alert => alert.id === id);
    if (!alert) return null;
    
    alert.active = !alert.active;
    this.saveToStorage();
    return alert;
  }

  // Search History CRUD
  addHistoryItem(item: Omit<SearchHistoryItem, 'id' | 'timestamp'>): SearchHistoryItem {
    const newItem: SearchHistoryItem = {
      ...item,
      id: `history_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date()
    };
    this.history.unshift(newItem); // Add to beginning
    
    // Keep only last 1000 items
    if (this.history.length > 1000) {
      this.history = this.history.slice(0, 1000);
    }
    
    this.saveToStorage();
    return newItem;
  }

  deleteHistoryItem(id: string): boolean {
    const index = this.history.findIndex(item => item.id === id);
    if (index === -1) return false;
    
    this.history.splice(index, 1);
    this.saveToStorage();
    return true;
  }

  clearHistory(): void {
    this.history = [];
    this.saveToStorage();
  }

  getHistory(): SearchHistoryItem[] {
    return [...this.history];
  }

  searchHistory(query: string): SearchHistoryItem[] {
    const lowerQuery = query.toLowerCase();
    return this.history.filter(item => 
      item.query.toLowerCase().includes(lowerQuery)
    );
  }

  // Saved Searches CRUD
  createSavedSearch(search: Omit<SavedSearch, 'id' | 'createdAt' | 'tags'>): SavedSearch {
    const newSearch: SavedSearch = {
      ...search,
      id: `saved_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      createdAt: new Date(),
      tags: []
    };
    this.savedSearches.push(newSearch);
    this.saveToStorage();
    return newSearch;
  }

  updateSavedSearch(id: string, updates: Partial<SavedSearch>): SavedSearch | null {
    const index = this.savedSearches.findIndex(search => search.id === id);
    if (index === -1) return null;
    
    this.savedSearches[index] = { ...this.savedSearches[index], ...updates };
    this.saveToStorage();
    return this.savedSearches[index];
  }

  deleteSavedSearch(id: string): boolean {
    const index = this.savedSearches.findIndex(search => search.id === id);
    if (index === -1) return false;
    
    this.savedSearches.splice(index, 1);
    this.saveToStorage();
    return true;
  }

  getSavedSearches(): SavedSearch[] {
    return [...this.savedSearches];
  }

  useSavedSearch(id: string): SavedSearch | null {
    const search = this.savedSearches.find(search => search.id === id);
    if (!search) return null;
    
    search.lastUsed = new Date();
    this.saveToStorage();
    return search;
  }

  // Analytics Metrics CRUD
  createMetric(metric: Omit<AnalyticsMetric, 'id'>): AnalyticsMetric {
    const newMetric: AnalyticsMetric = {
      ...metric,
      id: `metric_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    };
    this.analyticsMetrics.push(newMetric);
    this.saveToStorage();
    return newMetric;
  }

  updateMetric(id: string, updates: Partial<AnalyticsMetric>): AnalyticsMetric | null {
    const index = this.analyticsMetrics.findIndex(metric => metric.id === id);
    if (index === -1) return null;
    
    this.analyticsMetrics[index] = { ...this.analyticsMetrics[index], ...updates };
    this.saveToStorage();
    return this.analyticsMetrics[index];
  }

  deleteMetric(id: string): boolean {
    const index = this.analyticsMetrics.findIndex(metric => metric.id === id);
    if (index === -1) return false;
    
    this.analyticsMetrics.splice(index, 1);
    this.saveToStorage();
    return true;
  }

  getMetrics(): AnalyticsMetric[] {
    return [...this.analyticsMetrics];
  }

  // Analytics Reports CRUD
  createReport(report: Omit<AnalyticsReport, 'id' | 'lastGenerated' | 'nextRun'>): AnalyticsReport {
    const newReport: AnalyticsReport = {
      ...report,
      id: `report_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      nextRun: this.calculateNextRun(report.schedule.frequency, report.schedule.time)
    };
    this.analyticsReports.push(newReport);
    this.saveToStorage();
    return newReport;
  }

  updateReport(id: string, updates: Partial<AnalyticsReport>): AnalyticsReport | null {
    const index = this.analyticsReports.findIndex(report => report.id === id);
    if (index === -1) return null;
    
    this.analyticsReports[index] = { ...this.analyticsReports[index], ...updates };
    this.saveToStorage();
    return this.analyticsReports[index];
  }

  deleteReport(id: string): boolean {
    const index = this.analyticsReports.findIndex(report => report.id === id);
    if (index === -1) return false;
    
    this.analyticsReports.splice(index, 1);
    this.saveToStorage();
    return true;
  }

  getReports(): AnalyticsReport[] {
    return [...this.analyticsReports];
  }

  private calculateNextRun(frequency: string, time: string): Date {
    const now = new Date();
    const nextRun = new Date(now);
    
    switch (frequency) {
      case 'daily':
        nextRun.setDate(now.getDate() + 1);
        break;
      case 'weekly':
        nextRun.setDate(now.getDate() + 7);
        break;
      case 'monthly':
        nextRun.setMonth(now.getMonth() + 1);
        break;
    }
    
    if (time) {
      const [hours, minutes] = time.split(':').map(Number);
      nextRun.setHours(hours, minutes, 0, 0);
    }
    
    return nextRun;
  }

  // Export functionality
  exportData(type: 'alerts' | 'history' | 'savedSearches' | 'metrics' | 'reports', format: 'csv' | 'json'): string {
    let data: any[] = [];
    
    switch (type) {
      case 'alerts':
        data = this.alerts;
        break;
      case 'history':
        data = this.history;
        break;
      case 'savedSearches':
        data = this.savedSearches;
        break;
      case 'metrics':
        data = this.analyticsMetrics;
        break;
      case 'reports':
        data = this.analyticsReports;
        break;
    }
    
    if (format === 'json') {
      return JSON.stringify(data, null, 2);
    } else {
      // CSV format
      if (data.length === 0) return '';
      
      const headers = Object.keys(data[0]);
      const csvRows = [headers.join(',')];
      
      for (const row of data) {
        const values = headers.map(header => {
          const value = row[header];
          if (value === null || value === undefined) return '';
          if (typeof value === 'object') return JSON.stringify(value);
          return String(value).replace(/"/g, '""');
        });
        csvRows.push(values.map(v => `"${v}"`).join(','));
      }
      
      return csvRows.join('\n');
    }
  }

  // Bulk operations
  bulkDelete(type: 'alerts' | 'history' | 'savedSearches' | 'metrics' | 'reports', ids: string[]): number {
    let deletedCount = 0;
    
    switch (type) {
      case 'alerts':
        ids.forEach(id => {
          if (this.deleteAlert(id)) deletedCount++;
        });
        break;
      case 'history':
        ids.forEach(id => {
          if (this.deleteHistoryItem(id)) deletedCount++;
        });
        break;
      case 'savedSearches':
        ids.forEach(id => {
          if (this.deleteSavedSearch(id)) deletedCount++;
        });
        break;
      case 'metrics':
        ids.forEach(id => {
          if (this.deleteMetric(id)) deletedCount++;
        });
        break;
      case 'reports':
        ids.forEach(id => {
          if (this.deleteReport(id)) deletedCount++;
        });
        break;
    }
    
    return deletedCount;
  }
}

// Export singleton instance
export const searchDataManager = SearchDataManager.getInstance();
