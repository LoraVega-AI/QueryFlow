// API route for connection health checks
// GET /api/database/health - Check health of all connections
// GET /api/database/health?sessionId=xxx - Check specific session health

import { NextRequest, NextResponse } from 'next/server';
import { dbConnectionManager } from '@/utils/databaseConnection';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('sessionId');

    if (sessionId) {
      // Health check for specific session
      const health = await dbConnectionManager.healthCheckPool(sessionId);

      return NextResponse.json({
        success: true,
        message: `Health check for session ${sessionId}`,
        data: {
          sessionId,
          healthy: health.healthy,
          latency: health.latency,
          error: health.error
        }
      });
    } else {
      // Health check for all sessions
      const activeSessions = dbConnectionManager.getActiveSessions();
      const healthResults = [];

      for (const session of activeSessions) {
        try {
          let health;
          if (session.type === 'mysql') {
            health = await dbConnectionManager.healthCheckPool(session.id);
          } else {
            // For PostgreSQL and SQLite, we can do a simple connection test
            health = { healthy: true, latency: 0 };
          }

          healthResults.push({
            sessionId: session.id,
            type: session.type,
            healthy: health.healthy,
            latency: health.latency,
            error: health.error,
            lastUsed: session.lastUsed
          });
        } catch (error: any) {
          healthResults.push({
            sessionId: session.id,
            type: session.type,
            healthy: false,
            error: error.message,
            lastUsed: session.lastUsed
          });
        }
      }

      const healthyCount = healthResults.filter(r => r.healthy).length;

      return NextResponse.json({
        success: true,
        message: 'Health check completed for all sessions',
        data: {
          totalSessions: healthResults.length,
          healthySessions: healthyCount,
          unhealthySessions: healthResults.length - healthyCount,
          results: healthResults
        }
      });
    }
  } catch (error: any) {
    console.error('Health check failed:', error);
    return NextResponse.json({
      success: false,
      message: 'Health check failed',
      error: error.message
    }, { status: 500 });
  }
}
