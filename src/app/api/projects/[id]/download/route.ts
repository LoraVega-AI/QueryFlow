// API route for downloading projects with updated database
// GET /api/projects/[id]/download

import { NextRequest, NextResponse } from 'next/server';
import { readFile, readdir, stat } from 'fs/promises';
import { join } from 'path';
import { dbConnectionManager } from '@/utils/databaseConnection';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    // Get project data
    await dbConnectionManager.initializeAppData();
    const project = await dbConnectionManager.getProject(id);
    
    if (!project) {
      return NextResponse.json({
        success: false,
        message: 'Project not found'
      }, { status: 404 });
    }

    // Get updated database information
    const databases = await dbConnectionManager.getProjectDatabases(id);
    
    // Create project package with updated database info
    const projectPackage = await createProjectPackage(project, databases);
    
    return new NextResponse(projectPackage.buffer as BodyInit, {
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="${project.name.replace(/[^a-zA-Z0-9]/g, '_')}.zip"`,
        'Content-Length': projectPackage.buffer.length.toString()
      }
    });

  } catch (error: any) {
    console.error('Project download error:', error);
    return NextResponse.json({
      success: false,
      message: 'Failed to download project',
      error: error.message
    }, { status: 500 });
  }
}

async function createProjectPackage(project: any, databases: any[]): Promise<{ buffer: Buffer }> {
  // For now, we'll create a simple JSON package
  // In a real implementation, this would create a proper ZIP file
  
  const projectData = {
    name: project.name,
    description: project.description,
    technology: project.technology,
    databases: databases.map(db => ({
      name: db.name,
      type: db.type,
      connectionString: db.connectionString,
      isConnected: db.isConnected,
      lastSync: db.lastSync,
      tables: db.tables,
      schema: db.schema
    })),
    schema: project.schema,
    uploadPath: project.uploadPath,
    lastUpdated: new Date().toISOString(),
    queryflowVersion: '1.0.0'
  };

  const jsonString = JSON.stringify(projectData, null, 2);
  const buffer = Buffer.from(jsonString, 'utf8');
  
  return { buffer };
}
