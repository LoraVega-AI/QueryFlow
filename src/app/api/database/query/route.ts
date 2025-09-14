// API route for executing database queries
// POST /api/database/query

import { NextRequest, NextResponse } from 'next/server';
import { dbConnectionManager } from '@/utils/databaseConnection';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { connectionId, sql, params = [] } = body;

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

    // Execute the query
    const result = await dbConnectionManager.executeQuery(connectionId, sql);

    return NextResponse.json({
      success: true,
      message: 'Query executed successfully',
      data: result
    });

  } catch (error: any) {
    console.error('Database query API error:', error);
    return NextResponse.json({
      success: false,
      message: 'Query execution failed',
      error: error.message
    }, { status: 500 });
  }
}