// API route for executing database queries
// POST /api/database/query

import { NextRequest, NextResponse } from 'next/server';
import { dbConnectionManager } from '@/utils/databaseConnection';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { connectionId, sql } = body;

    if (!connectionId) {
      return NextResponse.json({
        success: false,
        message: 'Connection ID is required'
      }, { status: 400 });
    }

    if (!sql) {
      return NextResponse.json({
        success: false,
        message: 'SQL query is required'
      }, { status: 400 });
    }

    // Validate SQL query (only allow SELECT)
    const upperSQL = sql.trim().toUpperCase();
    if (!upperSQL.startsWith('SELECT')) {
      return NextResponse.json({
        success: false,
        message: 'Only SELECT queries are allowed for security reasons'
      }, { status: 403 });
    }

    // Execute query
    const result = await dbConnectionManager.executeQuery(connectionId, sql);

    if (result.success) {
      return NextResponse.json({
        success: true,
        message: 'Query executed successfully',
        data: {
          rows: result.data,
          rowCount: result.rowCount,
          executionTime: result.executionTime
        }
      });
    } else {
      return NextResponse.json({
        success: false,
        message: 'Query execution failed',
        error: result.error
      }, { status: 400 });
    }

  } catch (error: any) {
    console.error('Database query API error:', error);
    return NextResponse.json({
      success: false,
      message: 'Internal server error',
      error: error.message
    }, { status: 500 });
  }
}
