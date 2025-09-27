// API route for fetching database schema
// POST /api/database/schema

import { NextRequest, NextResponse } from 'next/server';
import { dbConnectionManager } from '@/utils/databaseConnection';
import { ApiResponseBuilder, ApiValidator } from '@/utils/apiResponse';

export async function POST(request: NextRequest) {
  try {
    // Validate request content type
    const contentType = request.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      return NextResponse.json(
        ApiResponseBuilder.validationError('Content-Type must be application/json', 'Invalid content type'),
        { status: 400 }
      );
    }

    // Parse and validate request body
    let body;
    try {
      body = await request.json();
    } catch (parseError) {
      return NextResponse.json(
        ApiResponseBuilder.validationError('Invalid JSON in request body', 'JSON parse error'),
        { status: 400 }
      );
    }

    const { connectionId: sessionId } = body;

    if (!sessionId) {
      return NextResponse.json(
        ApiResponseBuilder.validationError('Session ID is required', 'Missing connectionId parameter'),
        { status: 400 }
      );
    }

    if (typeof sessionId !== 'string' || sessionId.trim().length === 0) {
      return NextResponse.json(
        ApiResponseBuilder.validationError('Session ID must be a non-empty string', 'Invalid sessionId format'),
        { status: 400 }
      );
    }

    console.log('🔍 Fetching schema for session:', sessionId);

    // Initialize database connection
    await dbConnectionManager.initializeAppData();

    // Fetch schema using the session
    const schema = await dbConnectionManager.fetchSchema(sessionId);

    if (!schema) {
      console.error('❌ Schema fetch returned null for session:', sessionId);
      return NextResponse.json(
        ApiResponseBuilder.notFoundError('Database schema'),
        { status: 404 }
      );
    }

    console.log('✅ Schema fetched successfully for session:', sessionId);

    return NextResponse.json(
      ApiResponseBuilder.success(schema, 'Schema fetched successfully')
    );

  } catch (error: any) {
    console.error('❌ Database schema API error:', error);
    console.error('❌ Error stack:', error.stack);
    
    // Return appropriate error based on error type
    if (error.name === 'SyntaxError') {
      return NextResponse.json(
        ApiResponseBuilder.validationError('Invalid JSON in request body', 'JSON syntax error'),
        { status: 400 }
      );
    }

    return NextResponse.json(
      ApiResponseBuilder.serverError('Internal server error', process.env.NODE_ENV === 'development' ? error.message : 'An unexpected error occurred'),
      { status: 500 }
    );
  }
}