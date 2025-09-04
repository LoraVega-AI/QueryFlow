// GraphQL API endpoint for search functionality
// POST /api/graphql

import { NextRequest, NextResponse } from 'next/server';
import { semanticSearchEngine, SearchFilters } from '@/utils/semanticSearchEngine';

// GraphQL resolvers
const resolvers = {
  Query: {
    searchContent: async (_: any, args: any) => {
      const { query, filters, limit = 10, offset = 0, sortBy = 'relevance', sortOrder = 'desc' } = args;
      
      // Parse date range if provided
      let parsedFilters: SearchFilters | undefined;
      if (filters) {
        parsedFilters = { ...filters };
        if (filters.dateRange && parsedFilters) {
          parsedFilters.dateRange = {
            start: new Date(filters.dateRange.start),
            end: new Date(filters.dateRange.end)
          };
        }
      }

      const searchOptions = {
        query,
        filters: parsedFilters,
        limit,
        offset,
        sortBy,
        sortOrder
      };

      return await semanticSearchEngine.search(searchOptions);
    },

    searchSuggestions: async (_: any, args: any) => {
      const { query, limit = 5 } = args;
      return semanticSearchEngine.getSuggestions(query, limit);
    },

    searchAnalytics: async () => {
      const analytics = semanticSearchEngine.getAnalytics();
      const indexStats = semanticSearchEngine.getIndexStats();
      
      return {
        ...analytics,
        indexStats: {
          ...indexStats,
          lastUpdated: indexStats.lastUpdated.toISOString()
        }
      };
    }
  }
};

// Simple GraphQL executor
function executeGraphQL(query: string, variables: any = {}) {
  // This is a simplified GraphQL executor
  // In production, you'd use a proper GraphQL library like graphql-js
  
  try {
    // Parse the query (simplified)
    const operationMatch = query.match(/(?:query|mutation)\s+(\w+)?\s*\{([^}]+)\}/);
    if (!operationMatch) {
      throw new Error('Invalid GraphQL query');
    }

    const operationName = operationMatch[1];
    const selectionSet = operationMatch[2];

    // Handle different operations
    if (selectionSet.includes('searchContent')) {
      const argsMatch = selectionSet.match(/searchContent\(([^)]*)\)/);
      let args = {};
      
      if (argsMatch && argsMatch[1]) {
        // Parse arguments (simplified)
        const argString = argsMatch[1];
        if (argString.includes('query:')) {
          const queryMatch = argString.match(/query:\s*"([^"]+)"/);
          if (queryMatch) args = { ...args, query: queryMatch[1] };
        }
        if (argString.includes('limit:')) {
          const limitMatch = argString.match(/limit:\s*(\d+)/);
          if (limitMatch) args = { ...args, limit: parseInt(limitMatch[1]) };
        }
        if (argString.includes('offset:')) {
          const offsetMatch = argString.match(/offset:\s*(\d+)/);
          if (offsetMatch) args = { ...args, offset: parseInt(offsetMatch[1]) };
        }
      }

      return resolvers.Query.searchContent(null, { ...args, ...variables });
    }
    
    if (selectionSet.includes('searchSuggestions')) {
      const argsMatch = selectionSet.match(/searchSuggestions\(([^)]*)\)/);
      let args = {};
      
      if (argsMatch && argsMatch[1]) {
        const argString = argsMatch[1];
        if (argString.includes('query:')) {
          const queryMatch = argString.match(/query:\s*"([^"]+)"/);
          if (queryMatch) args = { ...args, query: queryMatch[1] };
        }
        if (argString.includes('limit:')) {
          const limitMatch = argString.match(/limit:\s*(\d+)/);
          if (limitMatch) args = { ...args, limit: parseInt(limitMatch[1]) };
        }
      }

      return resolvers.Query.searchSuggestions(null, { ...args, ...variables });
    }
    
    if (selectionSet.includes('searchAnalytics')) {
      return resolvers.Query.searchAnalytics();
    }

    throw new Error('Unknown GraphQL operation');
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new Error(`GraphQL execution error: ${errorMessage}`);
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { query, variables = {} } = body;

    if (!query || typeof query !== 'string') {
      return NextResponse.json({ 
        error: 'GraphQL query is required',
        example: {
          query: 'query { searchContent(query: "user authentication", limit: 10) { results { id title relevance } total } }'
        }
      }, { status: 400 });
    }

    const result = await executeGraphQL(query, variables);

    return NextResponse.json({
      data: result,
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    console.error('GraphQL API error:', error);
    return NextResponse.json({
      errors: [{
        message: error.message,
        locations: [],
        path: []
      }],
      timestamp: new Date().toISOString()
    }, { status: 400 });
  }
}
