// API endpoint to manually initialize search data from real projects
// GET /api/search/init

import { NextRequest, NextResponse } from 'next/server';
import { semanticSearchEngine } from '@/utils/semanticSearchEngine';

export async function GET(request: NextRequest) {
  try {
    console.log('🔍 Initializing search index from real project data...');
    
    // Import database connection manager
    const { dbConnectionManager } = await import('@/utils/databaseConnection');
    await dbConnectionManager.initializeAppData();
    
    // Get all projects from database
    const projects = await dbConnectionManager.getAllProjects();
    console.log(`📊 Found ${projects.length} projects to index`);
    
    const documents: any[] = [];
    
    // Index each project and its schema
    for (const project of projects) {
      // Index project itself
      documents.push({
        id: `project-${project.id}`,
        title: project.name,
        content: `Project: ${project.name}. ${project.description || 'No description'}. Technology: ${project.technology || 'Unknown'}. Contains ${project.totalTables || 0} tables.`,
        type: 'project' as const,
        metadata: {
          projectId: project.id,
          projectName: project.name,
          technology: project.technology,
          tableCount: project.totalTables || 0,
          tags: ['project', project.technology || 'database']
        }
      });
      
      // Index tables from schema
      if (project.schema?.tables && Array.isArray(project.schema.tables)) {
        for (const table of project.schema.tables) {
          const columnNames = table.columns?.map((c: any) => c.name).join(', ') || '';
          const columnCount = table.columns?.length || 0;
          
          documents.push({
            id: `${project.id}-${table.name}`,
            title: `${table.name} - ${project.name}`,
            content: `Table ${table.name} in project ${project.name}. Columns: ${columnNames}. ${table.description || ''}`,
            type: 'table' as const,
            metadata: {
              tableName: table.name,
              projectId: project.id,
              projectName: project.name,
              columnCount: columnCount,
              tags: ['table', 'database', project.technology || 'schema']
            }
          });
        }
      }
      
      // Index system catalog tables if available
      if (project.systemCatalog?.tables && Array.isArray(project.systemCatalog.tables)) {
        for (const table of project.systemCatalog.tables) {
          const columnNames = table.columns?.map((c: any) => c.name).join(', ') || '';
          const columnCount = table.columns?.length || 0;
          
          // Avoid duplicates by checking if table was already indexed from schema
          const alreadyIndexed = documents.some(doc => 
            doc.id === `${project.id}-${table.name}`
          );
          
          if (!alreadyIndexed) {
            documents.push({
              id: `${project.id}-catalog-${table.name}`,
              title: `${table.name} - ${project.name} (Catalog)`,
              content: `System catalog table ${table.name} in project ${project.name}. Columns: ${columnNames}.`,
              type: 'table' as const,
              metadata: {
                tableName: table.name,
                projectId: project.id,
                projectName: project.name,
                columnCount: columnCount,
                tags: ['table', 'catalog', 'system']
              }
            });
          }
        }
      }
    }
    
    console.log(`📝 Indexing ${documents.length} documents...`);
    
    // Add all documents to search index
    if (documents.length > 0) {
      await semanticSearchEngine.addDocuments(documents);
    }
    
    const indexStats = semanticSearchEngine.getIndexStats();
    
    console.log('✅ Search index initialized successfully');
    console.log('📊 Index stats:', indexStats);
    
    return NextResponse.json({
      success: true,
      message: `Initialized search index with ${documents.length} documents from ${projects.length} projects`,
      indexed: documents.length,
      projects: projects.length,
      indexStats
    });

  } catch (error: any) {
    console.error('❌ Failed to initialize search data:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to initialize search data',
      message: error.message
    }, { status: 500 });
  }
}
