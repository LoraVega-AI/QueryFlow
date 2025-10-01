// Simple test to upload a project and check the response
const FormData = require('form-data');
const fs = require('fs');
const fetch = require('node-fetch').default;

async function testSimpleUpload() {
  console.log('🧪 Testing Simple Project Upload');
  console.log('=================================');

  try {
    // Create form data
    const formData = new FormData();
    
    // Add the test database file
    const dbPath = './test.db';
    if (fs.existsSync(dbPath)) {
      formData.append('files', fs.createReadStream(dbPath));
      console.log('✅ Added test.db to upload');
    } else {
      console.log('❌ test.db not found');
      return;
    }
    
    // Add project metadata
    formData.append('projectName', 'Simple Test Project');
    formData.append('projectDescription', 'Testing simple upload');

    console.log('📤 Uploading project...');
    
    // Upload the project
    const response = await fetch('http://localhost:3000/api/projects/upload', {
      method: 'POST',
      body: formData
    });

    console.log('📊 Response status:', response.status);
    console.log('📊 Response ok:', response.ok);
    
    const result = await response.json();
    
    console.log('📊 Full response structure:', JSON.stringify(result, null, 2));
    
    if (response.ok && result.success) {
      console.log('✅ Project upload successful!');
      console.log('📊 Project details:', {
        id: result.project?.id,
        name: result.project?.name,
        totalTables: result.project?.totalTables,
        hasSystemCatalog: !!result.project?.systemCatalog,
        systemCatalogTables: result.project?.systemCatalog?.tables?.length || 0,
        testValue: result.project?.testValue,
        testSqliteFilesCount: result.project?.testSqliteFilesCount,
        testSqliteFiles: result.project?.testSqliteFiles
      });
      
      if (result.project.systemCatalog) {
        console.log('🎉 System Catalog Data Found!');
        console.log('📋 System Catalog Summary:', {
          databaseType: result.project.systemCatalog.metadata?.databaseType,
          version: result.project.systemCatalog.metadata?.version,
          encoding: result.project.systemCatalog.metadata?.encoding,
          tables: result.project.systemCatalog.tables?.length || 0,
          views: result.project.systemCatalog.views?.length || 0,
          indexes: result.project.systemCatalog.indexes?.length || 0,
          triggers: result.project.systemCatalog.triggers?.length || 0
        });
      } else {
        console.log('❌ No system catalog data found in project');
      }
      
    } else {
      console.log('❌ Project upload failed:', result.message || 'Unknown error');
      console.log('📊 Full response:', JSON.stringify(result, null, 2));
    }

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Run the test
if (require.main === module) {
  testSimpleUpload().catch(console.error);
}

module.exports = { testSimpleUpload };
