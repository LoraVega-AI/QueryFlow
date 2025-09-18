// API route for connection cleanup operations
// POST /api/database/cleanup - Cleanup idle connection pools

import { NextRequest, NextResponse } from 'next/server';
import { dbConnectionManager } from '@/utils/databaseConnection';

export async function POST(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const maxAge = searchParams.get('maxAge') ? parseInt(searchParams.get('maxAge')!) : undefined;

    const cleanedCount = await dbConnectionManager.cleanupIdleConnectionPools(maxAge);

    return NextResponse.json({
      success: true,
      message: `Cleaned up ${cleanedCount} idle connection pools`,
      data: {
        cleanedPools: cleanedCount,
        maxAge: maxAge || 3600000 // 1 hour default
      }
    });
  } catch (error: any) {
    console.error('Cleanup operation failed:', error);
    return NextResponse.json({
      success: false,
      message: 'Cleanup operation failed',
      error: error.message
    }, { status: 500 });
  }
}
