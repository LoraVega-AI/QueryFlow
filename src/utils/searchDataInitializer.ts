// Search Data Initializer for Real-time Search System
// Populates the search system with comprehensive real data for testing and demonstration

import { enhancedRealTimeSearchEngine } from './enhancedRealTimeSearchEngine';
import { semanticSearchEngine } from './semanticSearchEngine';
import { searchDataManager } from './searchDataManager';

export interface SampleDocument {
  id: string;
  title: string;
  content: string;
  type: 'table' | 'schema' | 'query' | 'workflow' | 'documentation';
  metadata: Record<string, any>;
}

export class SearchDataInitializer {
  private static instance: SearchDataInitializer;
  private isInitialized = false;

  private constructor() {}

  static getInstance(): SearchDataInitializer {
    if (!SearchDataInitializer.instance) {
      SearchDataInitializer.instance = new SearchDataInitializer();
    }
    return SearchDataInitializer.instance;
  }

  // Initialize the search system with comprehensive sample data
  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      console.log('Initializing search system with real data...');
      
      // Generate sample documents
      const sampleDocuments = this.generateSampleDocuments();
      
      // Add documents to both search engines
      for (const doc of sampleDocuments) {
        await enhancedRealTimeSearchEngine.addDocument(doc);
        await semanticSearchEngine.addDocument(doc);
      }

      // Initialize search history with realistic data
      this.initializeSearchHistory();

      // Initialize saved searches
      this.initializeSavedSearches();

      // Initialize search alerts
      this.initializeSearchAlerts();

      this.isInitialized = true;
      console.log(`Search system initialized with ${sampleDocuments.length} documents`);
    } catch (error) {
      console.error('Failed to initialize search system:', error);
    }
  }

  // Generate comprehensive sample documents
  private generateSampleDocuments(): SampleDocument[] {
    return [
      // Database Schema Documents
      {
        id: 'schema_users',
        title: 'Users Table Schema',
        content: 'Complete user management table with authentication, profile information, and role-based access control. Includes fields for user_id, username, email, password_hash, created_at, last_login, and user_role.',
        type: 'schema',
        metadata: {
          tableName: 'users',
          columns: ['user_id', 'username', 'email', 'password_hash', 'created_at', 'last_login', 'user_role'],
          tags: ['authentication', 'user-management', 'security', 'database']
        }
      },
      {
        id: 'schema_products',
        title: 'Products Table Schema',
        content: 'E-commerce product catalog table with inventory management, pricing, and categorization. Contains product_id, name, description, price, category_id, stock_quantity, and availability_status.',
        type: 'schema',
        metadata: {
          tableName: 'products',
          columns: ['product_id', 'name', 'description', 'price', 'category_id', 'stock_quantity', 'availability_status'],
          tags: ['ecommerce', 'inventory', 'catalog', 'products']
        }
      },
      {
        id: 'schema_orders',
        title: 'Orders Table Schema',
        content: 'Order management system with customer information, payment details, and order status tracking. Includes order_id, customer_id, order_date, total_amount, payment_status, and shipping_address.',
        type: 'schema',
        metadata: {
          tableName: 'orders',
          columns: ['order_id', 'customer_id', 'order_date', 'total_amount', 'payment_status', 'shipping_address'],
          tags: ['orders', 'payments', 'ecommerce', 'customer-management']
        }
      },

      // Query Documents
      {
        id: 'query_user_authentication',
        title: 'User Authentication Query',
        content: 'SQL query for user login authentication with password verification and session management. Includes parameterized queries for security and proper error handling.',
        type: 'query',
        metadata: {
          queryType: 'SELECT',
          complexity: 'medium',
          tags: ['authentication', 'login', 'security', 'sql']
        }
      },
      {
        id: 'query_product_search',
        title: 'Product Search Query',
        content: 'Advanced product search query with filtering by category, price range, and availability. Includes full-text search capabilities and performance optimization.',
        type: 'query',
        metadata: {
          queryType: 'SELECT',
          complexity: 'high',
          tags: ['search', 'products', 'filtering', 'performance']
        }
      },
      {
        id: 'query_sales_analytics',
        title: 'Sales Analytics Query',
        content: 'Complex analytics query for sales reporting with date ranges, customer segmentation, and revenue calculations. Includes aggregations and grouping.',
        type: 'query',
        metadata: {
          queryType: 'SELECT',
          complexity: 'high',
          tags: ['analytics', 'sales', 'reporting', 'aggregation']
        }
      },

      // Workflow Documents
      {
        id: 'workflow_order_processing',
        title: 'Order Processing Workflow',
        content: 'Complete order processing workflow from cart to delivery. Includes payment validation, inventory checks, shipping calculations, and notification systems.',
        type: 'workflow',
        metadata: {
          workflowType: 'business-process',
          steps: ['cart-validation', 'payment-processing', 'inventory-check', 'shipping', 'notification'],
          tags: ['workflow', 'order-processing', 'automation', 'business-logic']
        }
      },
      {
        id: 'workflow_user_onboarding',
        title: 'User Onboarding Workflow',
        content: 'User registration and onboarding process with email verification, profile setup, and welcome sequence. Includes validation rules and error handling.',
        type: 'workflow',
        metadata: {
          workflowType: 'user-journey',
          steps: ['registration', 'email-verification', 'profile-setup', 'welcome'],
          tags: ['onboarding', 'user-experience', 'registration', 'automation']
        }
      },

      // Documentation Documents
      {
        id: 'docs_api_reference',
        title: 'API Reference Documentation',
        content: 'Comprehensive API documentation with endpoints, authentication methods, request/response formats, and code examples. Includes rate limiting and error codes.',
        type: 'documentation',
        metadata: {
          docType: 'api-reference',
          version: 'v1.0',
          tags: ['api', 'documentation', 'reference', 'endpoints']
        }
      },
      {
        id: 'docs_database_guide',
        title: 'Database Design Guide',
        content: 'Database design principles and best practices for the application. Covers normalization, indexing strategies, performance optimization, and security considerations.',
        type: 'documentation',
        metadata: {
          docType: 'guide',
          category: 'database',
          tags: ['database', 'design', 'optimization', 'best-practices']
        }
      },
      {
        id: 'docs_security_policy',
        title: 'Security Policy Documentation',
        content: 'Application security policies and procedures including authentication, authorization, data encryption, and compliance requirements. Covers GDPR and security best practices.',
        type: 'documentation',
        metadata: {
          docType: 'policy',
          category: 'security',
          tags: ['security', 'policy', 'compliance', 'gdpr']
        }
      },

      // Performance and Optimization Documents
      {
        id: 'perf_query_optimization',
        title: 'Query Performance Optimization',
        content: 'Database query optimization techniques including indexing strategies, query analysis, and performance monitoring. Covers slow query identification and optimization methods.',
        type: 'documentation',
        metadata: {
          docType: 'guide',
          category: 'performance',
          tags: ['performance', 'optimization', 'database', 'monitoring']
        }
      },
      {
        id: 'perf_caching_strategy',
        title: 'Caching Strategy Implementation',
        content: 'Multi-level caching strategy for application performance including Redis, application-level caching, and CDN integration. Covers cache invalidation and consistency.',
        type: 'documentation',
        metadata: {
          docType: 'guide',
          category: 'performance',
          tags: ['caching', 'performance', 'redis', 'optimization']
        }
      },

      // Error Handling and Monitoring
      {
        id: 'error_handling_guide',
        title: 'Error Handling Best Practices',
        content: 'Comprehensive error handling strategies including exception management, logging, monitoring, and user-friendly error messages. Covers different error types and recovery methods.',
        type: 'documentation',
        metadata: {
          docType: 'guide',
          category: 'error-handling',
          tags: ['error-handling', 'logging', 'monitoring', 'debugging']
        }
      },
      {
        id: 'monitoring_alerting',
        title: 'System Monitoring and Alerting',
        content: 'System monitoring setup with metrics collection, alerting rules, and dashboard configuration. Includes performance metrics, error tracking, and uptime monitoring.',
        type: 'documentation',
        metadata: {
          docType: 'guide',
          category: 'monitoring',
          tags: ['monitoring', 'alerting', 'metrics', 'observability']
        }
      },

      // Integration and Deployment
      {
        id: 'integration_webhooks',
        title: 'Webhook Integration Guide',
        content: 'Webhook implementation for third-party integrations including event handling, security, retry logic, and monitoring. Covers popular services and best practices.',
        type: 'documentation',
        metadata: {
          docType: 'guide',
          category: 'integration',
          tags: ['webhooks', 'integration', 'api', 'third-party']
        }
      },
      {
        id: 'deployment_ci_cd',
        title: 'CI/CD Pipeline Configuration',
        content: 'Continuous integration and deployment pipeline setup with automated testing, code quality checks, and deployment strategies. Includes Docker and Kubernetes configuration.',
        type: 'documentation',
        metadata: {
          docType: 'guide',
          category: 'deployment',
          tags: ['ci-cd', 'deployment', 'docker', 'kubernetes']
        }
      }
    ];
  }

  // Initialize search history with realistic data
  private initializeSearchHistory(): void {
    const sampleHistory = [
      { query: 'user authentication', resultsCount: 15, executionTime: 45 },
      { query: 'database performance', resultsCount: 8, executionTime: 32 },
      { query: 'API documentation', resultsCount: 12, executionTime: 28 },
      { query: 'error handling', resultsCount: 6, executionTime: 35 },
      { query: 'caching strategy', resultsCount: 4, executionTime: 41 },
      { query: 'security policy', resultsCount: 9, executionTime: 38 },
      { query: 'order processing', resultsCount: 7, executionTime: 29 },
      { query: 'monitoring alerts', resultsCount: 5, executionTime: 33 },
      { query: 'webhook integration', resultsCount: 3, executionTime: 42 },
      { query: 'deployment pipeline', resultsCount: 6, executionTime: 36 }
    ];

    sampleHistory.forEach((item, index) => {
      const timestamp = new Date(Date.now() - (index * 24 * 60 * 60 * 1000)); // Spread over last 10 days
      searchDataManager.addHistoryItem({
        query: item.query,
        resultsCount: item.resultsCount,
        executionTime: item.executionTime
      });
    });
  }

  // Initialize saved searches
  private initializeSavedSearches(): void {
    const sampleSavedSearches = [
      {
        name: 'Authentication Issues',
        query: 'authentication error login failed',
        category: 'troubleshooting',
        tags: ['auth', 'errors', 'login'],
        isPublic: false
      },
      {
        name: 'Performance Queries',
        query: 'slow query database optimization',
        category: 'performance',
        tags: ['performance', 'database', 'optimization'],
        isPublic: true
      },
      {
        name: 'API Documentation',
        query: 'API endpoints documentation reference',
        category: 'development',
        tags: ['api', 'docs', 'reference'],
        isPublic: true
      },
      {
        name: 'Security Policies',
        query: 'security policy compliance GDPR',
        category: 'security',
        tags: ['security', 'policy', 'compliance'],
        isPublic: false
      }
    ];

    sampleSavedSearches.forEach(search => {
      searchDataManager.createSavedSearch({
        name: search.name,
        query: search.query,
        category: search.category,
        isPublic: search.isPublic,
        resultsCount: Math.floor(Math.random() * 20) + 5
      });
    });
  }

  // Initialize search alerts
  private initializeSearchAlerts(): void {
    const sampleAlerts = [
      {
        name: 'High Error Rate Alert',
        description: 'Alert when error rate exceeds 5%',
        severity: 'high' as const,
        active: true,
        conditions: {
          type: 'error_rate' as const,
          threshold: 5,
          operator: 'greater_than' as const,
          value: 5
        },
        notifications: {
          email: true,
          inApp: true
        }
      },
      {
        name: 'Slow Query Alert',
        description: 'Alert when query response time exceeds 2 seconds',
        severity: 'medium' as const,
        active: true,
        conditions: {
          type: 'response_time' as const,
          threshold: 2000,
          operator: 'greater_than' as const,
          value: 2000
        },
        notifications: {
          email: false,
          inApp: true
        }
      },
      {
        name: 'Search Volume Spike',
        description: 'Alert when search volume increases by 50%',
        severity: 'low' as const,
        active: true,
        conditions: {
          type: 'search_volume' as const,
          threshold: 50,
          operator: 'greater_than' as const,
          value: 50
        },
        notifications: {
          email: true,
          inApp: false
        }
      }
    ];

    sampleAlerts.forEach(alert => {
      searchDataManager.createAlert(alert);
    });
  }

  // Get initialization status
  isSystemInitialized(): boolean {
    return this.isInitialized;
  }

  // Reset the system (for testing)
  async reset(): Promise<void> {
    try {
      enhancedRealTimeSearchEngine.clearCache();
      semanticSearchEngine.clearIndex();
      searchDataManager.clearHistory();
      
      // Clear saved searches and alerts
      const savedSearches = searchDataManager.getSavedSearches();
      const alerts = searchDataManager.getAlerts();
      
      savedSearches.forEach(search => searchDataManager.deleteSavedSearch(search.id));
      alerts.forEach(alert => searchDataManager.deleteAlert(alert.id));
      
      this.isInitialized = false;
      console.log('Search system reset completed');
    } catch (error) {
      console.error('Failed to reset search system:', error);
    }
  }

  // Get system statistics
  getSystemStats(): {
    documentCount: number;
    searchHistoryCount: number;
    savedSearchesCount: number;
    alertsCount: number;
    isInitialized: boolean;
  } {
    return {
      documentCount: enhancedRealTimeSearchEngine.getDocumentCount(),
      searchHistoryCount: searchDataManager.getHistory().length,
      savedSearchesCount: searchDataManager.getSavedSearches().length,
      alertsCount: searchDataManager.getAlerts().length,
      isInitialized: this.isInitialized
    };
  }
}

// Export singleton instance
export const searchDataInitializer = SearchDataInitializer.getInstance();