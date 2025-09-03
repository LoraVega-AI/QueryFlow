// REST API endpoint for advanced search with filters
// POST /api/search/advanced

import { NextRequest, NextResponse } from 'next/server';
import { semanticSearchEngine, SearchFilters } from '@/utils/semanticSearchEngine';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      query, 
      filters, 
      limit = 10, 
      offset = 0, 
      sortBy = 'relevance', 
      sortOrder = 'desc' 
    } = body;

    if (!query || typeof query !== 'string') {
      return NextResponse.json({ 
        error: 'Query is required',
        example: {
          query: 'user authentication',
          filters: {
            types: ['table', 'schema'],
            dateRange: {
              start: '2024-01-01',
              end: '2024-12-31'
            }
          },
          limit: 20,
          offset: 0
        }
      }, { status: 400 });
    }

    // Parse date range if provided
    let parsedFilters: SearchFilters | undefined;
    if (filters) {
      parsedFilters = { ...filters };
      if (filters.dateRange) {
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

    const result = await semanticSearchEngine.search(searchOptions);

    return NextResponse.json({
      success: true,
      data: result,
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    console.error('Advanced search API error:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error',
      message: error.message
    }, { status: 500 });
  }
}
