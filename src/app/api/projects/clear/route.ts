import { NextRequest, NextResponse } from 'next/server';
import { dbConnectionManager } from '@/utils/databaseConnection';

export async function POST(request: NextRequest) {
  try {
    console.log('🗑️ API: Clearing all projects...');
    
    // Clear all projects from database
    await dbConnectionManager.clearAllProjects();
    
    return NextResponse.json({
      success: true,
      message: 'All projects cleared successfully',
      data: {
        clearedAt: new Date().toISOString(),
        projectsCleared: true
      }
    });
    
  } catch (error) {
    console.error('❌ API: Failed to clear projects:', error);
    
    return NextResponse.json({
      success: false,
      message: 'Failed to clear projects',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
