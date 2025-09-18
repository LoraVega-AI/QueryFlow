// API route for fetching database schema
// POST /api/database/schema

import { NextRequest, NextResponse } from 'next/server';
import { dbConnectionManager } from '@/utils/databaseConnection';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { connectionId: sessionId } = body;

    if (!sessionId) {
      return NextResponse.json({
        success: false,
        message: 'Session ID is required'
      }, { status: 400 });
    }

    // Fetch schema using the session
    const schema = await dbConnectionManager.fetchSchema(sessionId);

    if (!schema) {
      console.error('Schema fetch returned null for session:', sessionId);
      return NextResponse.json({
        success: false,
        message: 'Failed to fetch database schema',
        error: 'Schema introspection failed - no schema returned'
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: 'Schema fetched successfully',
      data: schema
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