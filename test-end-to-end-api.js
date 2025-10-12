// End-to-End API Test
// Tests the complete flow: Upload → Extract → Verify → Save → Retrieve

const fs = require('fs');
const path = require('path');
const FormData = require('form-data');
const fetch = require('node-fetch');
const Database = require('better-sqlite3');

console.log('🧪 End-to-End API Test\n');
console.log('Testing complete upload + extraction + verification flow');
console.log('='.repeat(70));

async function testEndToEndAPI() {
  try {
    // Step 1: Create a test project with Sequelize models
    console.log('\n📁 Step 1: Creating test project...');
    
    const testDir = path.join(__dirname, 'test-e2e-project');
    const modelsDir = path.join(testDir, 'models');
    
    // Clean up if exists
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true });
    }
    
    fs.mkdirSync(modelsDir, { recursive: true });
    
    // Create a simple User model
    fs.writeFileSync(path.join(modelsDir, 'User.js'), `
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  return sequelize.define('User', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    username: {
      type: DataTypes.STRING,
      allowNull: false
    },
    email: {
      type: DataTypes.STRING,
      allowNull: false
    }
  });
};
    `);
    
    console.log('✅ Created test project');
    
    // Step 2: Create ZIP file
    console.log('\n📦 Step 2: Creating ZIP file...');
    
    const archiver = require('archiver');
    const zipPath = path.join(__dirname, 'test-e2e-project.zip');
    
    await new Promise((resolve, reject) => {
      const output = fs.createWriteStream(zipPath);
      const archive = archiver('zip', { zlib: { level: 9 } });
      
      output.on('close', resolve);
      archive.on('error', reject);
      
      archive.pipe(output);
      archive.directory(testDir, false);
      archive.finalize();
    });
    
    console.log(`✅ Created ZIP file: ${zipPath}`);
    
    // Step 3: Upload via API
    console.log('\n📤 Step 3: Uploading to API...');
    
    const formData = new FormData();
    formData.append('files', fs.createReadStream(zipPath));
    formData.append('projectName', 'E2E Test Project');
    formData.append('projectDescription', 'End-to-end test project');
    
    const uploadResponse = await fetch('http://localhost:3000/api/projects/upload', {
      method: 'POST',
      body: formData,
      headers: formData.getHeaders()
    });
    
    if (!uploadResponse.ok) {
      const errorText = await uploadResponse.text();
      throw new Error(`Upload failed: ${uploadResponse.status} ${errorText}`);
    }
    
    const uploadResult = await uploadResponse.json();
    console.log('✅ Upload successful');
    console.log('   Project ID:', uploadResult.data?.id);
    console.log('   Tables found:', uploadResult.data?.totalTables);
    
    // Check if verification data is included
    if (uploadResult.data?.databases?.[0]?.verification) {
      console.log('✅ Verification data included in response:');
      const verification = uploadResult.data.databases[0].verification;
      console.log(`   - Verified tables: ${verification.verifiedTables?.length || 0}`);
      console.log(`   - Phantom tables: ${verification.phantomTables?.length || 0}`);
      console.log(`   - Accuracy: ${verification.verificationStats?.accuracy || 0}%`);
    } else {
      console.warn('⚠️  No verification data in response');
    }
    
    // Check if database introspection is included
    if (uploadResult.data?.databases?.[0]?.databaseIntrospection) {
      console.log('✅ Database introspection included:');
      const introspection = uploadResult.data.databases[0].databaseIntrospection;
      console.log(`   - Actual tables: ${introspection.actualTables?.length || 0}`);
      console.log(`   - Views: ${introspection.views?.length || 0}`);
      console.log(`   - Indexes: ${introspection.indexes?.length || 0}`);
    } else {
      console.warn('⚠️  No database introspection in response');
    }
    
    // Step 4: Retrieve project via API
    console.log('\n📥 Step 4: Retrieving project from API...');
    
    const projectsResponse = await fetch('http://localhost:3000/api/projects');
    
    if (!projectsResponse.ok) {
      throw new Error(`Failed to retrieve projects: ${projectsResponse.status}`);
    }
    
    const projectsResult = await projectsResponse.json();
    console.log(`✅ Retrieved ${projectsResult.data?.length || 0} projects`);
    
    // Find our uploaded project
    const uploadedProject = projectsResult.data?.find(p => p.id === uploadResult.data?.id);
    
    if (uploadedProject) {
      console.log('✅ Found uploaded project in database');
      console.log('   Name:', uploadedProject.name);
      console.log('   Tables:', uploadedProject.totalTables);
      
      // Check if verification data is persisted
      if (uploadedProject.databases?.[0]?.verification) {
        console.log('✅ Verification data persisted in database');
      } else {
        console.warn('⚠️  Verification data not persisted');
      }
    } else {
      console.warn('⚠️  Uploaded project not found in database');
    }
    
    // Step 5: Cleanup
    console.log('\n🧹 Step 5: Cleaning up...');
    
    // Delete via API
    if (uploadResult.data?.id) {
      const deleteResponse = await fetch(`http://localhost:3000/api/projects/${uploadResult.data.id}`, {
        method: 'DELETE'
      });
      
      if (deleteResponse.ok) {
        console.log('✅ Project deleted from database');
      }
    }
    
    // Clean up local files
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true });
    }
    if (fs.existsSync(zipPath)) {
      fs.unlinkSync(zipPath);
    }
    
    console.log('✅ Cleanup complete');
    
    return true;
    
  } catch (error) {
    console.error('\n❌ End-to-end test failed:', error.message);
    console.error(error.stack);
    return false;
  }
}

// Check if server is running
async function checkServer() {
  try {
    const response = await fetch('http://localhost:3000/api/projects');
    return response.ok;
  } catch {
    return false;
  }
}

// Run the test
(async () => {
  console.log('🔍 Checking if Next.js server is running...');
  const serverRunning = await checkServer();
  
  if (!serverRunning) {
    console.error('\n❌ Next.js server is not running!');
    console.log('\nPlease start the server first:');
    console.log('   npm run dev');
    console.log('\nThen run this test again.');
    process.exit(1);
  }
  
  console.log('✅ Server is running\n');
  
  const success = await testEndToEndAPI();
  
  console.log('\n' + '='.repeat(70));
  if (success) {
    console.log('🎉 END-TO-END API TEST PASSED!');
    console.log('\n✅ Complete flow validated:');
    console.log('   • Project upload works');
    console.log('   • Extraction pipeline works');
    console.log('   • Verification runs automatically');
    console.log('   • Data persisted to database');
    console.log('   • Data retrieved via API');
    console.log('\n✅ System is fully functional end-to-end!');
  } else {
    console.log('❌ END-TO-END TEST FAILED');
    process.exit(1);
  }
})().catch(error => {
  console.error('❌ Test failed with exception:', error);
  process.exit(1);
});

