// API route for individual project operations
// GET /api/projects/[id] - Get project by ID
// DELETE /api/projects/[id] - Delete project

import { NextRequest, NextResponse } from 'next/server';
import { dbConnectionManager } from '@/utils/databaseConnection';
import { broadcastMessage } from '@/utils/realtimeBroadcast';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: projectId } = await params;
    
    await dbConnectionManager.initializeAppData();
    const project = await dbConnectionManager.getProject(projectId);

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

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: projectId } = await params;
    
    await dbConnectionManager.initializeAppData();
    
    // Check if project exists
    const project = await dbConnectionManager.getProject(projectId);
    if (!project) {
      return NextResponse.json({
        success: false,
        message: 'Project not found'
      }, { status: 404 });
    }

    // Delete project
    await dbConnectionManager.deleteProject(projectId);

    // Broadcast real-time update
    try {
      broadcastMessage({
        type: 'project_deleted',
        data: {
          id: projectId,
          name: project.name
        },
        timestamp: Date.now()
      });
      console.log('📡 Real-time update broadcasted');
    } catch (error) {
      console.warn('⚠️ Failed to broadcast real-time update:', error);
    }

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