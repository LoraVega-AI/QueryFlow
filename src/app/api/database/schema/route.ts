// API route for fetching database schema
// POST /api/database/schema

import { NextRequest, NextResponse } from 'next/server';
import { dbConnectionManager } from '@/utils/databaseConnection';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { connectionId } = body;

    if (!connectionId) {
      return NextResponse.json({
        success: false,
        message: 'Connection ID is required'
      }, { status: 400 });
    }

    // Fetch schema
    const schema = await dbConnectionManager.fetchSchema(connectionId);

    if (schema) {
      return NextResponse.json({
        success: true,
        message: 'Schema fetched successfully',
        data: schema
      });
    } else {
      return NextResponse.json({
        success: false,
        message: 'Failed to fetch schema'
      }, { status: 500 });
    }

  } catch (error: any) {
    console.error('Database schema API error:', error);
    return NextResponse.json({
      success: false,
      message: 'Internal server error',
      error: error.message
    }, { status: 500 });
  }
}
