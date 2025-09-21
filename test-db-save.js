const { dbConnectionManager } = require('./src/utils/databaseConnection');

async function testDatabaseSave() {
  try {
    console.log('🧪 Testing database save operation...');
    
    // Initialize the database
    await dbConnectionManager.initializeAppData();
    console.log('✅ Database initialized');
    
    // Create a test project
    const testProject = {
      id: 'test_project_' + Date.now(),
      name: 'Test Database Save',
      description: 'Testing database save functionality',
      technology: 'test',
      status: 'disconnected',
      lastSynced: null,
      databaseCount: 1,
      totalTables: 3,
      totalRows: 0,
      hasForeignKeys: false,
      hasIndexes: false,
      icon: '🧪',
      color: 'blue',
      isExample: false,
      schema: {
        tables: [
          { id: 'table1', name: 'Table1', columns: [] },
          { id: 'table2', name: 'Table2', columns: [] },
          { id: 'table3', name: 'Table3', columns: [] }
        ],
        relationships: [],
        indexes: []
      }
    };
    
    console.log('💾 Saving test project...');
    await dbConnectionManager.saveProject(testProject);
    console.log('✅ Test project saved successfully');
    
    // Retrieve the project
    console.log('📖 Retrieving test project...');
    const retrievedProject = await dbConnectionManager.getProject(testProject.id);
    console.log('✅ Test project retrieved:', {
      id: retrievedProject?.id,
      name: retrievedProject?.name,
      totalTables: retrievedProject?.totalTables,
      totalRows: retrievedProject?.totalRows
    });
    
    // Get all projects
    console.log('📋 Getting all projects...');
    const allProjects = await dbConnectionManager.getAllProjects();
    console.log('✅ Total projects in database:', allProjects.length);
    console.log('📊 Recent projects:', allProjects.slice(0, 3).map(p => ({
      id: p.id,
      name: p.name,
      totalTables: p.totalTables,
      created_at: p.created_at
    })));
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

testDatabaseSave();
