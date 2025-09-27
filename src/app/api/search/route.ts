// REST API endpoint for basic search
// GET /api/search?q=query&limit=10&offset=0

import { NextRequest, NextResponse } from 'next/server';
import { semanticSearchEngine } from '@/utils/semanticSearchEngine';
import { ApiResponseBuilder, ApiValidator } from '@/utils/apiResponse';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q');
    const limit = searchParams.get('limit') || '10';
    const offset = searchParams.get('offset') || '0';
    const sortBy = searchParams.get('sortBy') || 'relevance';
    const sortOrder = searchParams.get('sortOrder') || 'desc';

    // Validate required parameters
    if (!query) {
      return NextResponse.json(
        ApiResponseBuilder.validationError('The "q" parameter is mandatory for search', 'Query parameter is required'),
        { status: 400 }
      );
    }

    if (query.trim().length === 0) {
      return NextResponse.json(
        ApiResponseBuilder.validationError('Search query must contain at least one character', 'Query cannot be empty'),
        { status: 400 }
      );
    }

    // Validate and parse numeric parameters
    let parsedLimit, parsedOffset;
    
    parsedLimit = parseInt(limit);
    parsedOffset = parseInt(offset);
    
    if (isNaN(parsedLimit) || isNaN(parsedOffset)) {
      return NextResponse.json(
        ApiResponseBuilder.validationError('Limit and offset must be valid numbers', 'Invalid numeric parameters'),
        { status: 400 }
      );
    }

    if (parsedLimit < 1 || parsedLimit > 100) {
      return NextResponse.json(
        ApiResponseBuilder.validationError('Limit must be between 1 and 100', 'Invalid limit parameter'),
        { status: 400 }
      );
    }

    if (parsedOffset < 0) {
      return NextResponse.json(
        ApiResponseBuilder.validationError('Offset must be 0 or greater', 'Invalid offset parameter'),
        { status: 400 }
      );
    }

    // Validate sort parameters
    const validSortBy = ['relevance', 'date', 'title'];
    const validSortOrder = ['asc', 'desc'];
    
    if (!validSortBy.includes(sortBy)) {
      return NextResponse.json(
        ApiResponseBuilder.validationError(`SortBy must be one of: ${validSortBy.join(', ')}`, 'Invalid sortBy parameter'),
        { status: 400 }
      );
    }

    if (!validSortOrder.includes(sortOrder)) {
      return NextResponse.json(
        ApiResponseBuilder.validationError(`SortOrder must be one of: ${validSortOrder.join(', ')}`, 'Invalid sortOrder parameter'),
        { status: 400 }
      );
    }

    console.log('🔍 Search query:', { query, limit: parsedLimit, offset: parsedOffset, sortBy, sortOrder });

    const searchOptions = {
      query: query.trim(),
      limit: parsedLimit,
      offset: parsedOffset,
      sortBy: sortBy as 'relevance' | 'date' | 'title',
      sortOrder: sortOrder as 'asc' | 'desc'
    };

    const result = await semanticSearchEngine.search(searchOptions);

    console.log('✅ Search completed:', { 
      query: searchOptions.query, 
      resultsCount: result.results?.length || 0,
      totalResults: result.totalResults || 0
    });

    return NextResponse.json(
      ApiResponseBuilder.success(result, 'Search completed successfully')
    );

  } catch (error: any) {
    console.error('❌ Search API error:', error);
    console.error('❌ Error stack:', error.stack);
    
    return NextResponse.json(
      ApiResponseBuilder.serverError('Search service temporarily unavailable', process.env.NODE_ENV === 'development' ? error.message : undefined),
      { status: 500 }
    );
  }
}
