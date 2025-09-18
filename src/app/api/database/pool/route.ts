// API route for connection pool management
// GET /api/database/pool - Get pool statistics
// DELETE /api/database/pool/[sessionId] - Close specific pool

import { NextRequest, NextResponse } from 'next/server';
import { dbConnectionManager } from '@/utils/databaseConnection';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('sessionId');

    const poolStats = dbConnectionManager.getConnectionPoolStats(sessionId || undefined);

    return NextResponse.json({
      success: true,
      message: 'Connection pool statistics retrieved',
      data: {
        pools: poolStats,
        totalPools: poolStats.length,
        summary: {
          totalConnections: poolStats.reduce((sum, pool) => sum + pool.totalConnections, 0),
          activeConnections: poolStats.reduce((sum, pool) => sum + pool.activeConnections, 0),
          idleConnections: poolStats.reduce((sum, pool) => sum + pool.idleConnections, 0),
          pendingConnections: poolStats.reduce((sum, pool) => sum + pool.pendingConnections, 0)
        }
      }
    });
  } catch (error: any) {
    console.error('Failed to get pool statistics:', error);
    return NextResponse.json({
      success: false,
      message: 'Failed to retrieve pool statistics',
      error: error.message
    }, { status: 500 });
  }
}
