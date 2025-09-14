// API route for fetching database schema
// POST /api/database/schema

import { NextRequest, NextResponse } from 'next/server';
import { dbConnectionManager } from '@/utils/databaseConnection';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { connectionId, credentials } = body;

    if (!connectionId) {
      return NextResponse.json({
        success: false,
        message: 'Connection ID is required'
      }, { status: 400 });
    }

    // Fetch schema using the existing connection
    const schema = await dbConnectionManager.fetchSchema(connectionId);

    if (!schema) {
      console.error('Schema fetch returned null for connection:', connectionId);
      return NextResponse.json({
        success: false,
        message: 'Failed to fetch database schema',
        error: 'Schema introspection failed - no schema returned'
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: 'Schema fetched successfully',
      schema
    });

  } catch (error: any) {
    console.error('Database schema API error:', error);
    return NextResponse.json({
      success: false,
      message: 'Internal server error',
      error: error.message
    }, { status: 500 });
  }
}