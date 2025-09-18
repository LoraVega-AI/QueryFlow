// API route for managing specific connection pools
// DELETE /api/database/pool/[sessionId] - Close specific pool

import { NextRequest, NextResponse } from 'next/server';
import { dbConnectionManager } from '@/utils/databaseConnection';

interface RouteParams {
  params: Promise<{
    sessionId: string;
  }>;
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { sessionId } = await params;

    const success = await dbConnectionManager.closeConnectionPool(sessionId);

    if (success) {
      return NextResponse.json({
        success: true,
        message: `Connection pool ${sessionId} closed successfully`
      });
    } else {
      return NextResponse.json({
        success: false,
        message: `Failed to close connection pool ${sessionId}`
      }, { status: 500 });
    }
  } catch (error: any) {
    const { sessionId } = await params;
    console.error(`Failed to close pool ${sessionId}:`, error);
    return NextResponse.json({
      success: false,
      message: 'Failed to close connection pool',
      error: error.message
    }, { status: 500 });
  }
}
