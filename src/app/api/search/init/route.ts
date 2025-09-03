// API endpoint to manually initialize search data
// GET /api/search/init

import { NextRequest, NextResponse } from 'next/server';
import { semanticSearchEngine } from '@/utils/semanticSearchEngine';

export async function GET(request: NextRequest) {
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
      }
    ];

    // Add documents to search index
    await semanticSearchEngine.addDocuments(sampleDocuments);
    
    const indexStats = semanticSearchEngine.getIndexStats();
    
    return NextResponse.json({
      success: true,
      message: `Initialized search index with ${sampleDocuments.length} documents`,
      indexStats
    });

  } catch (error: any) {
    console.error('Failed to initialize search data:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to initialize search data',
      message: error.message
    }, { status: 500 });
  }
}
