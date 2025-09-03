// REST API endpoint for search suggestions
// GET /api/search/suggestions?q=query&limit=5

import { NextRequest, NextResponse } from 'next/server';
import { semanticSearchEngine } from '@/utils/semanticSearchEngine';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q');
    const limit = searchParams.get('limit') || '5';

    if (!query) {
      return NextResponse.json({ 
        error: 'Query parameter is required',
        example: '/api/search/suggestions?q=user&limit=5'
      }, { status: 400 });
    }

    const suggestions = semanticSearchEngine.getSuggestions(query, parseInt(limit));

    return NextResponse.json({
      success: true,
      data: {
        query,
        suggestions,
        count: suggestions.length
      },
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    console.error('Suggestions API error:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error',
      message: error.message
    }, { status: 500 });
  }
}
