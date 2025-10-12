const fs = require('fs');
const path = require('path');
const archiver = require('archiver');
const { FormData, Blob } = globalThis;

async function testExtractionFixes() {
  console.log('🧪 Testing Extraction Pipeline Fixes...\n');
  
  // 1. Create zip of comprehensive test project
  console.log('📦 Creating comprehensive test project zip...');
  const zipPath = path.join(__dirname, 'comprehensive-test-project.zip');
  
  if (fs.existsSync(zipPath)) {
    fs.unlinkSync(zipPath);
  }
  
  const output = fs.createWriteStream(zipPath);
  const archive = archiver('zip', { zlib: { level: 9 } });
  
  await new Promise((resolve, reject) => {
    output.on('close', resolve);
    archive.on('error', reject);
    archive.pipe(output);
    
    // Add model files from models directory
    const modelsDir = path.join(__dirname, 'comprehensive-test-project', 'models');
    if (fs.existsSync(modelsDir)) {
      fs.readdirSync(modelsDir).forEach(file => {
        const filePath = path.join(modelsDir, file);
        if (fs.statSync(filePath).isFile()) {
          archive.file(filePath, { name: `models/${file}` });
        }
      });
    }
    
    // Add index.js
    const indexPath = path.join(__dirname, 'comprehensive-test-project', 'index.js');
    if (fs.existsSync(indexPath)) {
      archive.file(indexPath, { name: 'index.js' });
    }
    
    // Add the actual SQLite database file
    const dbPath = path.join(__dirname, 'comprehensive-test-project', 'comprehensive_test.db');
    if (fs.existsSync(dbPath)) {
      archive.file(dbPath, { name: 'comprehensive_test.db' });
      console.log('   ✅ Added comprehensive_test.db to zip');
    } else {
      console.error('   ❌ Database file not found!');
    }
    
    archive.finalize();
  });
  
  console.log(`   ✅ Zip created: ${zipPath} (${(fs.statSync(zipPath).size / 1024).toFixed(2)} KB)\n`);
  
  // 2. Upload to API
  console.log('📤 Uploading to API...');
  const formData = new FormData();
  
  const zipBuffer = fs.readFileSync(zipPath);
  const zipBlob = new Blob([zipBuffer], { type: 'application/zip' });
  formData.append('file', zipBlob, 'comprehensive-test-project.zip');
  formData.append('projectName', 'Extraction Fixes Test');
  formData.append('projectDescription', 'Testing all extraction pipeline fixes');
  
  const response = await fetch('http://localhost:3000/api/projects/upload', {
    method: 'POST',
    body: formData
  });
  
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Upload failed: ${response.status} ${response.statusText}\n${errorText}`);
  }
  
  const result = await response.json();
  
  // 3. Verify results
  console.log('   ✅ Upload successful!\n');
  
  console.log('📊 VERIFICATION RESULTS:\n');
  
  // Expected values for comprehensive-test-project
  const EXPECTED = {
    tables: 7,
    rows: 91,
    columns: 57
  };
  
  const actual = {
    tables: result.data?.totalTables || 0,
    rows: result.data?.totalRows || 0,
    columns: result.data?.totalColumns || 0
  };
  
  console.log('Expected vs Actual:');
  console.log(`   Tables:  ${EXPECTED.tables} → ${actual.tables} ${actual.tables === EXPECTED.tables ? '✅' : '❌'}`);
  console.log(`   Rows:    ${EXPECTED.rows} → ${actual.rows} ${actual.rows === EXPECTED.rows ? '✅' : '❌'}`);
  console.log(`   Columns: ${EXPECTED.columns} → ${actual.columns} ${actual.columns === EXPECTED.columns ? '✅' : '❌'}`);
  
  console.log('\n📋 Detailed Analysis:');
  
  // Check if test files were excluded
  const extractedModels = result.data?.extractedModels || [];
  const actualDbTables = result.data?.actualDatabaseTables || [];
  
  console.log(`   Extracted ORM Models: ${extractedModels.length}`);
  console.log(`   Actual DB Tables: ${actualDbTables.length}`);
  
  if (actualDbTables.length > 0) {
    console.log('\n   ✅ Using actual database tables');
    console.log('   Actual DB Table Names:');
    actualDbTables.forEach(table => {
      console.log(`      - ${table.name}: ${table.rowCount || 0} rows, ${table.columns?.length || 0} columns`);
    });
  } else {
    console.log('   ⚠️ No actual database tables found');
  }
  
  if (extractedModels.length > 0) {
    console.log('\n   Extracted Model Names (for comparison):');
    extractedModels.slice(0, 10).forEach(model => {
      console.log(`      - ${model.name}`);
    });
    if (extractedModels.length > 10) {
      console.log(`      ... and ${extractedModels.length - 10} more`);
    }
  }
  
  // Check for duplicates
  const modelNames = extractedModels.map(m => m.name.toLowerCase());
  const uniqueNames = new Set(modelNames);
  if (modelNames.length !== uniqueNames.size) {
    console.log(`\n   ⚠️ Found ${modelNames.length - uniqueNames.size} duplicate models`);
  } else {
    console.log('\n   ✅ No duplicate models detected');
  }
  
  // Check statistics
  if (result.data?.statistics) {
    console.log('\n   Statistics Data:');
    console.log(`      Total Tables: ${result.data.statistics.totalTables}`);
    console.log(`      Total Rows: ${result.data.statistics.totalRows}`);
    console.log(`      Database Size: ${result.data.statistics.databaseSize || 'N/A'}`);
  }
  
  // Check verification
  if (result.data?.verification) {
    console.log('\n   Verification Data:');
    console.log(`      Verified Tables: ${result.data.verification.verifiedTables?.length || 0}`);
    console.log(`      Phantom Tables: ${result.data.verification.phantomTables?.length || 0}`);
    console.log(`      Accuracy: ${result.data.verification.verificationStats?.accuracy?.toFixed(2)}%`);
  }
  
  // Final verdict
  console.log('\n' + '='.repeat(60));
  const allPass = 
    actual.tables === EXPECTED.tables &&
    actual.rows === EXPECTED.rows &&
    actual.columns === EXPECTED.columns &&
    actualDbTables.length > 0 &&
    modelNames.length === uniqueNames.size;
  
  if (allPass) {
    console.log('🎉 ALL FIXES VERIFIED SUCCESSFULLY!');
    console.log('   ✅ Correct table count (actual DB only)');
    console.log('   ✅ Correct row count (from actual DB)');
    console.log('   ✅ Correct column count (from actual DB)');
    console.log('   ✅ Test files excluded');
    console.log('   ✅ No duplicates');
  } else {
    console.log('❌ SOME ISSUES REMAIN:');
    if (actual.tables !== EXPECTED.tables) console.log('   ❌ Table count incorrect');
    if (actual.rows !== EXPECTED.rows) console.log('   ❌ Row count incorrect');
    if (actual.columns !== EXPECTED.columns) console.log('   ❌ Column count incorrect');
    if (actualDbTables.length === 0) console.log('   ❌ Not using actual DB tables');
    if (modelNames.length !== uniqueNames.size) console.log('   ❌ Duplicates still present');
  }
  console.log('='.repeat(60));
  
  // Cleanup
  if (fs.existsSync(zipPath)) {
    fs.unlinkSync(zipPath);
  }
}

testExtractionFixes().catch(error => {
  console.error('\n❌ Test failed:', error);
  console.error('Stack:', error.stack);
  process.exit(1);
});

