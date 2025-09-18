// API route for individual project management
// GET /api/projects/[id] - Get project by ID
// PUT /api/projects/[id] - Update project
// DELETE /api/projects/[id] - Delete project

import { NextRequest, NextResponse } from 'next/server';
import { dbConnectionManager } from '@/utils/databaseConnection';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;

    await dbConnectionManager.initializeAppData();
    const project = await dbConnectionManager.getProject(id);

    if (!project) {
      return NextResponse.json({
        success: false,
        message: 'Project not found'
      }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: 'Project retrieved successfully',
      data: project
    });
  } catch (error: any) {
    console.error('Failed to get project:', error);
    return NextResponse.json({
      success: false,
      message: 'Failed to retrieve project',
      error: error.message
    }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await request.json();

    await dbConnectionManager.initializeAppData();

    // Get existing project
    const existingProject = await dbConnectionManager.getProject(id);
    if (!existingProject) {
      return NextResponse.json({
        success: false,
        message: 'Project not found'
      }, { status: 404 });
    }

    // Update project
    const updatedProject = {
      ...existingProject,
      ...body,
      id, // Ensure ID doesn't change
      updatedAt: new Date().toISOString()
    };

    await dbConnectionManager.saveProject(updatedProject);

    return NextResponse.json({
      success: true,
      message: 'Project updated successfully',
      data: updatedProject
    });
  } catch (error: any) {
    console.error('Failed to update project:', error);
    return NextResponse.json({
      success: false,
      message: 'Failed to update project',
      error: error.message
    }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;

    await dbConnectionManager.initializeAppData();

    // Check if project exists
    const project = await dbConnectionManager.getProject(id);
    if (!project) {
      return NextResponse.json({
        success: false,
        message: 'Project not found'
      }, { status: 404 });
    }

    await dbConnectionManager.deleteProject(id);

    return NextResponse.json({
      success: true,
      message: 'Project deleted successfully'
    });
  } catch (error: any) {
    console.error('Failed to delete project:', error);
    return NextResponse.json({
      success: false,
      message: 'Failed to delete project',
      error: error.message
    }, { status: 500 });
  }
}
