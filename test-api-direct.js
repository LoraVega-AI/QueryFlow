const fs = require('fs');
const path = require('path');
const archiver = require('archiver');

async function testUpload() {
  console.log('🧪 Testing Upload with Detailed Logging...\n');
  
  // Create zip
  const zipPath = path.join(__dirname, 'test-upload.zip');
  if (fs.existsSync(zipPath)) fs.unlinkSync(zipPath);
  
  const output = fs.createWriteStream(zipPath);
  const archive = archiver('zip', { zlib: { level: 9 } });
  
  await new Promise((resolve, reject) => {
    output.on('close', resolve);
    archive.on('error', reject);
    archive.pipe(output);
    
    // Add only essential files
    const projectDir = path.join(__dirname, 'comprehensive-test-project');
    archive.file(path.join(projectDir, 'comprehensive_test.db'), { name: 'comprehensive_test.db' });
    archive.file(path.join(projectDir, 'index.js'), { name: 'index.js' });
    
    const modelsDir = path.join(projectDir, 'models');
    fs.readdirSync(modelsDir).forEach(file => {
      if (file.endsWith('.js')) {
        archive.file(path.join(modelsDir, file), { name: `models/${file}` });
      }
    });
    
    archive.finalize();
  });
  
  console.log(`📦 Created zip: ${(fs.statSync(zipPath).size / 1024).toFixed(2)} KB\n`);
  
  // Upload using FormData
  const FormData = globalThis.FormData;
  const Blob = globalThis.Blob;
  
  const formData = new FormData();
  const zipBuffer = fs.readFileSync(zipPath);
  const zipBlob = new Blob([zipBuffer], { type: 'application/zip' });
  formData.append('file', zipBlob, 'test-upload.zip');
  formData.append('projectName', 'API Test Upload');
  
  console.log('📤 Uploading...');
  const response = await fetch('http://localhost:3000/api/projects/upload', {
    method: 'POST',
    body: formData
  });
  
  if (!response.ok) {
    const text = await response.text();
    console.error('❌ Upload failed:', response.status, text);
    return;
  }
  
  const result = await response.json();
  console.log('✅ Upload successful!\n');
  
  // Detailed analysis
  console.log('📊 API RESPONSE ANALYSIS:\n');
  console.log('Project:', result.data?.name);
  console.log('ID:', result.data?.id);
  console.log('\n🔢 COUNTS:');
  console.log(`   totalTables: ${result.data?.totalTables}`);
  console.log(`   totalRows: ${result.data?.totalRows}`);
  console.log(`   totalColumns: ${result.data?.totalColumns}`);
  
  console.log('\n📦 ACTUAL DATABASE TABLES:');
  const actualTables = result.data?.actualDatabaseTables || [];
  console.log(`   Count: ${actualTables.length}`);
  if (actualTables.length > 0) {
    actualTables.forEach(table => {
      console.log(`   - ${table.name}: ${table.rowCount || 0} rows, ${table.columns?.length || 0} cols`);
    });
  }
  
  console.log('\n🔧 EXTRACTED MODELS:');
  const extractedModels = result.data?.extractedModels || [];
  console.log(`   Count: ${extractedModels.length}`);
  if (extractedModels.length > 0) {
    extractedModels.slice(0, 5).forEach(model => {
      console.log(`   - ${model.name}`);
    });
    if (extractedModels.length > 5) {
      console.log(`   ... and ${extractedModels.length - 5} more`);
    }
  }
  
  console.log('\n📈 STATISTICS:');
  if (result.data?.statistics) {
    console.log(`   totalTables: ${result.data.statistics.totalTables}`);
    console.log(`   totalRows: ${result.data.statistics.totalRows}`);
    console.log(`   databaseSize: ${result.data.statistics.databaseSize || 'N/A'}`);
  }
  
  console.log('\n🔍 DATABASE INTROSPECTION:');
  if (result.data?.databaseIntrospection) {
    console.log(`   tables: ${result.data.databaseIntrospection.tables?.length || 0}`);
    console.log(`   indexes: ${result.data.databaseIntrospection.indexes?.length || 0}`);
    console.log(`   views: ${result.data.databaseIntrospection.views?.length || 0}`);
  }
  
  console.log('\n' + '='.repeat(60));
  console.log('EXPECTED:');
  console.log('   Tables: 7');
  console.log('   Rows: 91');
  console.log('   Columns: 57');
  console.log('='.repeat(60));
  
  const success = 
    result.data?.totalTables === 7 &&
    result.data?.totalRows === 91 &&
    result.data?.totalColumns === 57;
  
  if (success) {
    console.log('\n✅ ALL TESTS PASSED!');
  } else {
    console.log('\n❌ TESTS FAILED - Numbers don\'t match expected values');
  }
  
  // Cleanup
  if (fs.existsSync(zipPath)) fs.unlinkSync(zipPath);
}

testUpload().catch(console.error);

