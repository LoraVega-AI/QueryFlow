// REST API endpoint for basic search
// GET /api/search?q=query&limit=10&offset=0

import { NextRequest, NextResponse } from 'next/server';
import { semanticSearchEngine } from '@/utils/semanticSearchEngine';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q');
    const limit = searchParams.get('limit') || '10';
    const offset = searchParams.get('offset') || '0';
    const sortBy = searchParams.get('sortBy') || 'relevance';
    const sortOrder = searchParams.get('sortOrder') || 'desc';

    if (!query) {
      return NextResponse.json({ 
        error: 'Query parameter is required',
        example: '/api/search?q=user authentication&limit=10'
      }, { status: 400 });
    }

    const searchOptions = {
      query,
      limit: parseInt(limit),
      offset: parseInt(offset),
      sortBy: sortBy as 'relevance' | 'date' | 'title',
      sortOrder: sortOrder as 'asc' | 'desc'
    };

    const result = await semanticSearchEngine.search(searchOptions);

    return NextResponse.json({
      success: true,
      data: result,
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    console.error('Search API error:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error',
      message: error.message
    }, { status: 500 });
  }
}
