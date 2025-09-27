// API route for project management
// GET /api/projects - Get all projects
// POST /api/projects - Create new project

import { NextRequest, NextResponse } from 'next/server';
import { dbConnectionManager } from '@/utils/databaseConnection';
import { ApiResponseBuilder, ApiValidator } from '@/utils/apiResponse';

export async function GET() {
  try {
    console.log('🔄 Projects API: Force fresh database read...');
    
    // Force reinitialize to ensure fresh connection
    const { dbConnectionManager } = await import('@/utils/databaseConnection');
    await dbConnectionManager.initializeAppData();
    console.log('✅ Projects API: Fresh database connection initialized');
    
    // Get projects with fresh data
    const projects = await dbConnectionManager.getAllProjects();
    
    if (!Array.isArray(projects)) {
      console.error('❌ Projects API: Invalid projects data type:', typeof projects);
      return NextResponse.json({
        success: false,
        message: 'Invalid projects data format',
        error: 'Database returned non-array data'
      }, { status: 500 });
    }
    
    console.log('📊 Projects API: Fresh data retrieved:', projects.length, 'projects');
    
    // Sort by creation date to get latest first
    const sortedProjects = projects.sort((a, b) => {
      const dateA = new Date(a.createdAt || a.created_at || 0);
      const dateB = new Date(b.createdAt || b.created_at || 0);
      return dateB.getTime() - dateA.getTime();
    });
    
    console.log('📊 Projects API: Latest projects:', sortedProjects.slice(0, 3).map(p => ({
      id: p.id,
      name: p.name,
      totalTables: p.totalTables,
      createdAt: p.createdAt || p.created_at
    })));

    return NextResponse.json(
      ApiResponseBuilder.success(sortedProjects, 'Projects retrieved successfully', sortedProjects.length)
    );
  } catch (error: any) {
    console.error('❌ Projects API: Failed to get projects:', error);
    console.error('❌ Error stack:', error.stack);
    
    return NextResponse.json(
      ApiResponseBuilder.serverError('Failed to retrieve projects', process.env.NODE_ENV === 'development' ? error.message : 'Database connection error'),
      { status: 500 }
    );
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
