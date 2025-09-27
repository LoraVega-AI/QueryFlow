// API route for individual project operations
// GET /api/projects/[id] - Get project by ID
// DELETE /api/projects/[id] - Delete project

import { NextRequest, NextResponse } from 'next/server';
import { dbConnectionManager } from '@/utils/databaseConnection';
import { broadcastMessage } from '@/utils/realtimeBroadcast';
import { ApiResponseBuilder, ApiValidator } from '@/utils/apiResponse';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: projectId } = await params;
    
    if (!projectId) {
      return NextResponse.json(
        ApiResponseBuilder.validationError('Project ID is required'),
        { status: 400 }
      );
    }

    console.log('🔍 Getting project:', projectId);
    
    await dbConnectionManager.initializeAppData();
    const project = await dbConnectionManager.getProject(projectId);

    if (!project) {
      console.log('❌ Project not found:', projectId);
      return NextResponse.json(
        ApiResponseBuilder.notFoundError('Project'),
        { status: 404 }
      );
    }

    console.log('✅ Project retrieved successfully:', project.name);
    
    return NextResponse.json(
      ApiResponseBuilder.success(project, 'Project retrieved successfully')
    );
  } catch (error: any) {
    console.error('❌ Failed to get project:', error);
    console.error('❌ Error stack:', error.stack);
    return NextResponse.json(
      ApiResponseBuilder.serverError('Failed to retrieve project', error.message),
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: projectId } = await params;
    
    if (!projectId) {
      return NextResponse.json({
        success: false,
        message: 'Project ID is required'
      }, { status: 400 });
    }

    console.log('🗑️ Deleting project:', projectId);
    
    await dbConnectionManager.initializeAppData();
    
    // Check if project exists
    const project = await dbConnectionManager.getProject(projectId);
    if (!project) {
      console.log('❌ Project not found for deletion:', projectId);
      return NextResponse.json({
        success: false,
        message: 'Project not found'
      }, { status: 404 });
    }

    // Delete project
    await dbConnectionManager.deleteProject(projectId);
    console.log('✅ Project deleted successfully:', project.name);

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
    console.error('❌ Failed to delete project:', error);
    console.error('❌ Error stack:', error.stack);
    return NextResponse.json({
      success: false,
      message: 'Failed to delete project',
      error: error.message
    }, { status: 500 });
  }
}