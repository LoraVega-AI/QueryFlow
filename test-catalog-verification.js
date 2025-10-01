// Test script to verify system catalog extraction in uploaded projects
const fetch = require('node-fetch').default;

async function testSystemCatalogVerification() {
  console.log('🔍 Verifying System Catalog Extraction in Projects');
  console.log('==================================================');

  try {
    // Get all projects
    console.log('📋 Fetching projects...');
    const projectsResponse = await fetch('http://localhost:3001/api/projects');
    const projectsData = await projectsResponse.json();
    const projects = projectsData.projects || [];
    
    console.log(`📊 Found ${projects.length} projects`);
    
    // Find projects with system catalog data
    const projectsWithCatalog = projects.filter(p => p.systemCatalog);
    console.log(`🎯 Projects with system catalog: ${projectsWithCatalog.length}`);
    
    if (projectsWithCatalog.length > 0) {
      console.log('\n📋 System Catalog Details:');
      console.log('==========================');
      
      projectsWithCatalog.forEach((project, index) => {
        console.log(`\n${index + 1}. Project: ${project.name}`);
        console.log(`   ID: ${project.id}`);
        console.log(`   Technology: ${project.technology}`);
        console.log(`   Total Tables: ${project.totalTables}`);
        
        if (project.systemCatalog) {
          const catalog = project.systemCatalog;
          console.log(`   📊 System Catalog Summary:`);
          console.log(`      - Database Type: ${catalog.metadata?.databaseType || 'Unknown'}`);
          console.log(`      - Version: ${catalog.metadata?.version || 'Unknown'}`);
          console.log(`      - Encoding: ${catalog.metadata?.encoding || 'Unknown'}`);
          console.log(`      - Extracted: ${catalog.metadata?.extractedAt ? new Date(catalog.metadata.extractedAt).toLocaleString() : 'Unknown'}`);
          console.log(`      - Tables: ${catalog.tables?.length || 0}`);
          console.log(`      - Views: ${catalog.views?.length || 0}`);
          console.log(`      - Indexes: ${catalog.indexes?.length || 0}`);
          console.log(`      - Triggers: ${catalog.triggers?.length || 0}`);
          
          if (catalog.tables && catalog.tables.length > 0) {
            console.log(`\n   📋 Table Details:`);
            catalog.tables.forEach((table, tableIndex) => {
              console.log(`      ${tableIndex + 1}. ${table.name}`);
              console.log(`         - Columns: ${table.columns?.length || 0}`);
              console.log(`         - Row Count: ${table.statistics?.rowCount || 'Unknown'}`);
              console.log(`         - Foreign Keys: ${table.constraints?.length || 0}`);
              
              if (table.columns && table.columns.length > 0) {
                console.log(`         - Sample Columns:`);
                table.columns.slice(0, 3).forEach(col => {
                  const constraints = [];
                  if (col.primaryKey) constraints.push('PK');
                  if (!col.nullable) constraints.push('NOT NULL');
                  if (col.defaultValue) constraints.push(`DEFAULT ${col.defaultValue}`);
                  
                  console.log(`           * ${col.name}: ${col.type} ${constraints.length ? `(${constraints.join(', ')})` : ''}`);
                });
                if (table.columns.length > 3) {
                  console.log(`           * ... and ${table.columns.length - 3} more columns`);
                }
              }
            });
          }
          
          if (catalog.indexes && catalog.indexes.length > 0) {
            console.log(`\n   🔍 Index Details:`);
            catalog.indexes.forEach((index, idx) => {
              console.log(`      ${idx + 1}. ${index.name} on ${index.tableName} (${index.unique ? 'UNIQUE' : 'NON-UNIQUE'})`);
            });
          }
        }
      });
      
    } else {
      console.log('❌ No projects found with system catalog data');
      console.log('💡 Try uploading a project with a database file first');
    }

  } catch (error) {
    console.error('❌ Verification failed:', error.message);
  }
}

// Run the test
if (require.main === module) {
  testSystemCatalogVerification().catch(console.error);
}

module.exports = { testSystemCatalogVerification };
