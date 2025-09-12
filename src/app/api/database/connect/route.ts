// API route for database connection testing
// POST /api/database/connect

import { NextRequest, NextResponse } from 'next/server';
import { dbConnectionManager, DatabaseCredentials } from '@/utils/databaseConnection';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const credentials: DatabaseCredentials = {
      type: body.type,
      host: body.host,
      port: body.port,
      username: body.username,
      password: body.password,
      database: body.database,
      filePath: body.filePath
    };

    // Validate required fields
    if (!credentials.type) {
      return NextResponse.json({
        success: false,
        message: 'Database type is required'
      }, { status: 400 });
    }

    // Validate type-specific required fields
    if (credentials.type === 'mysql' || credentials.type === 'postgresql') {
      if (!credentials.host || !credentials.username || !credentials.database) {
        return NextResponse.json({
          success: false,
          message: 'Host, username, and database are required for MySQL/PostgreSQL'
        }, { status: 400 });
      }
    } else if (credentials.type === 'sqlite') {
      if (!credentials.filePath && credentials.filePath !== ':memory:') {
        return NextResponse.json({
          success: false,
          message: 'File path is required for SQLite (use ":memory:" for in-memory database)'
        }, { status: 400 });
      }
    }

    // Test the connection
    const result = await dbConnectionManager.testConnection(credentials);

    if (result.success) {
      return NextResponse.json({
        success: true,
        message: result.message,
        connectionId: result.connectionId,
        data: {
          type: credentials.type,
          database: credentials.database,
          host: credentials.host
        }
      });
    } else {
      return NextResponse.json({
        success: false,
        message: result.message,
        error: result.error
      }, { status: 400 });
    }

  } catch (error: any) {
    console.error('Database connection API error:', error);
    return NextResponse.json({
      success: false,
      message: 'Internal server error',
      error: error.message
    }, { status: 500 });
  }
}

// GET /api/database/connect - List active connections (for debugging)
export async function GET() {
  try {
    // In production, you might want to store connections in a session or database
    // For now, we'll just return a success response
    return NextResponse.json({
      success: true,
      message: 'Connection endpoint ready'
    });
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      message: 'Failed to get connections',
      error: error.message
    }, { status: 500 });
  }
}
