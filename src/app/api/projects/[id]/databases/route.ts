// API route for project databases management
// GET /api/projects/[id]/databases - Get project databases
// POST /api/projects/[id]/databases - Add database to project

import { NextRequest, NextResponse } from 'next/server';
import { dbConnectionManager } from '@/utils/databaseConnection';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: projectId } = await params;

    await dbConnectionManager.initializeAppData();
    const databases = await dbConnectionManager.getProjectDatabases(projectId);

    return NextResponse.json({
      success: true,
      message: 'Project databases retrieved successfully',
      data: databases
    });
  } catch (error: any) {
    console.error('Failed to get project databases:', error);
    return NextResponse.json({
      success: false,
      message: 'Failed to retrieve project databases',
      error: error.message
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: projectId } = await params;
    const body = await request.json();
    const { name, type, connectionString } = body;

    if (!name || !type) {
      return NextResponse.json({
        success: false,
        message: 'Database name and type are required'
      }, { status: 400 });
    }

    await dbConnectionManager.initializeAppData();

    const database = {
      id: `db_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name,
      type,
      connectionString: connectionString || '',
      isConnected: false,
      lastSync: null,
      tables: []
    };

    await dbConnectionManager.saveProjectDatabase(projectId, database);

    return NextResponse.json({
      success: true,
      message: 'Database added to project successfully',
      data: database
    });
  } catch (error: any) {
    console.error('Failed to add database to project:', error);
    return NextResponse.json({
      success: false,
      message: 'Failed to add database to project',
      error: error.message
    }, { status: 500 });
  }
}
