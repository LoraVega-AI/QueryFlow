// API route for query history management
// GET /api/query-history - Get query history

import { NextRequest, NextResponse } from 'next/server';
import { dbConnectionManager } from '@/utils/databaseConnection';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('sessionId');
    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : 50;

    await dbConnectionManager.initializeAppData();
    const history = await dbConnectionManager.getQueryHistory(sessionId || undefined, limit);

    return NextResponse.json({
      success: true,
      message: 'Query history retrieved successfully',
      data: history
    });
  } catch (error: any) {
    console.error('Failed to get query history:', error);
    return NextResponse.json({
      success: false,
      message: 'Failed to retrieve query history',
      error: error.message
    }, { status: 500 });
  }
}
