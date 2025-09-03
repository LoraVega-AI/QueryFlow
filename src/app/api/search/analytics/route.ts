// REST API endpoint for search analytics
// GET /api/search/analytics

import { NextRequest, NextResponse } from 'next/server';
import { semanticSearchEngine } from '@/utils/semanticSearchEngine';

export async function GET(request: NextRequest) {
  try {
    const analytics = semanticSearchEngine.getAnalytics();
    const indexStats = semanticSearchEngine.getIndexStats();

    return NextResponse.json({
      success: true,
      data: {
        ...analytics,
        indexStats
      },
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    console.error('Analytics API error:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error',
      message: error.message
    }, { status: 500 });
  }
}
