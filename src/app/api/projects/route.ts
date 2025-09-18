// API route for project management
// GET /api/projects - Get all projects
// POST /api/projects - Create new project

import { NextRequest, NextResponse } from 'next/server';
import { dbConnectionManager } from '@/utils/databaseConnection';

export async function GET() {
  try {
    await dbConnectionManager.initializeAppData();
    const projects = await dbConnectionManager.getAllProjects();

    return NextResponse.json({
      success: true,
      message: 'Projects retrieved successfully',
      data: projects
    });
  } catch (error: any) {
    console.error('Failed to get projects:', error);
    return NextResponse.json({
      success: false,
      message: 'Failed to retrieve projects',
      error: error.message
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, description, technology, icon, color } = body;

    if (!name) {
      return NextResponse.json({
        success: false,
        message: 'Project name is required'
      }, { status: 400 });
    }

    await dbConnectionManager.initializeAppData();

    const project = {
      id: `project_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name,
      description: description || '',
      technology: technology || '',
      status: 'disconnected',
      lastSynced: null,
      databaseCount: 0,
      icon: icon || '📄',
      color: color || 'blue',
      isExample: false,
      schema: { tables: [], relationships: [], indexes: [] },
      databases: [],
      tables: [],
      queries: []
    };

    await dbConnectionManager.saveProject(project);

    return NextResponse.json({
      success: true,
      message: 'Project created successfully',
      data: project
    });
  } catch (error: any) {
    console.error('Failed to create project:', error);
    return NextResponse.json({
      success: false,
      message: 'Failed to create project',
      error: error.message
    }, { status: 500 });
  }
}
