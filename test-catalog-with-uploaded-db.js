const fs = require('fs');
const path = require('path');

// Test the system catalog extraction function with the uploaded database file
async function testCatalogWithUploadedDb() {
  try {
    console.log('🧪 Testing system catalog extraction with uploaded database...');
    
    // Find the most recent uploaded database file
    const uploadsDir = path.join(process.cwd(), 'uploads');
    const projectDirs = fs.readdirSync(uploadsDir)
      .filter(dir => dir.startsWith('project_'))
      .sort()
      .reverse();
    
    if (projectDirs.length === 0) {
      throw new Error('No uploaded projects found');
    }
    
    const latestProjectDir = path.join(uploadsDir, projectDirs[0]);
    const dbFiles = fs.readdirSync(latestProjectDir)
      .filter(file => file.endsWith('.db'));
    
    if (dbFiles.length === 0) {
      throw new Error('No database files found in latest project');
    }
    
    const dbPath = path.join(latestProjectDir, dbFiles[0]);
    console.log('🔍 Testing with database:', dbPath);
    
    // Check if file exists
    if (!fs.existsSync(dbPath)) {
      console.error('❌ Database file does not exist:', dbPath);
      return;
    }
    
    console.log('✅ Database file exists');
    
    // Test the system catalog extraction function
    console.log('🔍 Testing system catalog extraction...');
    const { extractSQLiteSystemCatalog } = require('./src/services/extraction/systemCatalogExtractor.js');
    console.log('✅ Function imported successfully');
    
    const result = await extractSQLiteSystemCatalog(dbPath);
    console.log('✅ System catalog extraction successful!');
    console.log('📊 Result:', JSON.stringify(result, null, 2));
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    console.error('❌ Error details:', error.message);
    console.error('❌ Error stack:', error.stack);
  }
}

testCatalogWithUploadedDb();
