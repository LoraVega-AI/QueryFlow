// Search Data Initializer
// Populates the semantic search engine with sample data

import { semanticSearchEngine } from './semanticSearchEngine';

export async function initializeSearchData(): Promise<void> {
  try {
    // Sample search documents
    const sampleDocuments = [
      {
        id: 'users-table',
        title: 'Users Table',
        content: 'Database table containing user information including authentication data, profile details, and account settings. Stores user credentials, email addresses, names, and registration timestamps.',
        type: 'table' as const,
        metadata: {
          tableName: 'users',
          columnCount: 8,
          recordCount: 1250,
          tags: ['authentication', 'user-management', 'database']
        }
      },
      {
        id: 'products-table',
        title: 'Products Table',
        content: 'Product catalog table with item details, pricing information, inventory levels, and product categories. Includes SKU codes, descriptions, and supplier information.',
        type: 'table' as const,
        metadata: {
          tableName: 'products',
          columnCount: 12,
          recordCount: 3400,
          tags: ['inventory', 'catalog', 'e-commerce']
        }
      },
      {
        id: 'orders-table',
        title: 'Orders Table',
        content: 'Order management table tracking customer purchases, order status, payment information, and shipping details. Links to users and products tables.',
        type: 'table' as const,
        metadata: {
          tableName: 'orders',
          columnCount: 15,
          recordCount: 8900,
          tags: ['orders', 'transactions', 'e-commerce']
        }
      },
      {
        id: 'database-schema',
        title: 'Database Schema Design',
        content: 'Complete database schema documentation including table relationships, foreign key constraints, indexes, and data types. Covers normalization principles and performance optimization.',
        type: 'schema' as const,
        metadata: {
          tableCount: 15,
          relationshipCount: 23,
          tags: ['schema', 'design', 'documentation']
        }
      },
      {
        id: 'user-authentication-query',
        title: 'User Authentication Query',
        content: 'SQL query for user login validation. Checks username and password against encrypted credentials, updates last login timestamp, and returns user session data.',
        type: 'query' as const,
        metadata: {
          queryType: 'SELECT',
          complexity: 'medium',
          executionTime: 45,
          tags: ['authentication', 'security', 'login']
        }
      },
      {
        id: 'product-search-query',
        title: 'Product Search Query',
        content: 'Advanced product search query with filtering by category, price range, and availability. Includes full-text search capabilities and sorting options.',
        type: 'query' as const,
        metadata: {
          queryType: 'SELECT',
          complexity: 'high',
          executionTime: 120,
          tags: ['search', 'products', 'filtering']
        }
      },
      {
        id: 'order-processing-workflow',
        title: 'Order Processing Workflow',
        content: 'Automated workflow for processing customer orders. Includes inventory checks, payment validation, shipping calculations, and notification triggers.',
        type: 'workflow' as const,
        metadata: {
          workflowType: 'automation',
          stepCount: 8,
          estimatedTime: 300,
          tags: ['automation', 'orders', 'processing']
        }
      },
      {
        id: 'data-backup-workflow',
        title: 'Data Backup Workflow',
        content: 'Scheduled workflow for automated database backups. Includes incremental backups, compression, and offsite storage with verification steps.',
        type: 'workflow' as const,
        metadata: {
          workflowType: 'maintenance',
          stepCount: 5,
          estimatedTime: 1800,
          tags: ['backup', 'maintenance', 'security']
        }
      },
      {
        id: 'api-documentation',
        title: 'REST API Documentation',
        content: 'Complete documentation for REST API endpoints including authentication, request/response formats, error codes, and usage examples for all available endpoints.',
        type: 'documentation' as const,
        metadata: {
          endpointCount: 25,
          version: 'v1.2',
          tags: ['api', 'documentation', 'rest']
        }
      },
      {
        id: 'performance-optimization',
        title: 'Database Performance Optimization',
        content: 'Guidelines and best practices for database performance optimization including index strategies, query optimization, and monitoring techniques.',
        type: 'documentation' as const,
        metadata: {
          category: 'performance',
          difficulty: 'advanced',
          tags: ['performance', 'optimization', 'database']
        }
      },
      {
        id: 'security-policies',
        title: 'Security Policies and Procedures',
        content: 'Comprehensive security documentation covering data encryption, access controls, audit logging, and compliance requirements for the database system.',
        type: 'documentation' as const,
        metadata: {
          category: 'security',
          compliance: 'GDPR',
          tags: ['security', 'compliance', 'policies']
        }
      },
      {
        id: 'user-management-system',
        title: 'User Management System',
        content: 'Complete user management system including registration, authentication, role-based access control, profile management, and account recovery features.',
        type: 'documentation' as const,
        metadata: {
          category: 'system',
          components: 6,
          tags: ['user-management', 'authentication', 'system']
        }
      },
      {
        id: 'inventory-tracking-query',
        title: 'Inventory Tracking Query',
        content: 'Real-time inventory tracking query that monitors stock levels, alerts for low inventory, and calculates reorder points based on sales velocity.',
        type: 'query' as const,
        metadata: {
          queryType: 'SELECT',
          complexity: 'medium',
          executionTime: 85,
          tags: ['inventory', 'tracking', 'monitoring']
        }
      },
      {
        id: 'sales-analytics-query',
        title: 'Sales Analytics Query',
        content: 'Complex analytics query for sales reporting including revenue calculations, trend analysis, customer segmentation, and performance metrics.',
        type: 'query' as const,
        metadata: {
          queryType: 'SELECT',
          complexity: 'high',
          executionTime: 250,
          tags: ['analytics', 'sales', 'reporting']
        }
      },
      {
        id: 'email-notification-workflow',
        title: 'Email Notification Workflow',
        content: 'Automated email notification system for order confirmations, shipping updates, and promotional campaigns with template management and delivery tracking.',
        type: 'workflow' as const,
        metadata: {
          workflowType: 'notification',
          stepCount: 6,
          estimatedTime: 120,
          tags: ['notifications', 'email', 'automation']
        }
      }
    ];

    // Add documents to search index
    await semanticSearchEngine.addDocuments(sampleDocuments);
    
    console.log(`Initialized search index with ${sampleDocuments.length} documents`);
    
  } catch (error) {
    console.error('Failed to initialize search data:', error);
  }
}

// Initialize search data when module loads
initializeSearchData();
