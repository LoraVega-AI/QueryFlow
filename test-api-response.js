const fs = require('fs');
const path = require('path');

async function testAPIResponse() {
  try {
    console.log('🧪 Testing API response structure...\n');

    // Create a simple zip file
    const archiver = require('archiver');
    const testProjectPath = path.join(__dirname, 'comprehensive-test-project');
    const zipPath = path.join(__dirname, 'api-test.zip');
    const output = fs.createWriteStream(zipPath);
    const archive = archiver('zip', { zlib: { level: 9 } });

    return new Promise((resolve, reject) => {
      output.on('close', async () => {
        console.log(`📦 Created zip file`);
        
        try {
          const form = new FormData();
          const fileBuffer = fs.readFileSync(zipPath);
          const fileBlob = new Blob([fileBuffer], { type: 'application/zip' });
          form.append('files', fileBlob, 'api-test.zip');
          form.append('projectName', 'API Response Test');
          form.append('projectDescription', 'Test project for API response');

          console.log('🚀 Uploading...');
          const response = await fetch('http://localhost:3000/api/projects/upload', {
            method: 'POST',
            body: form
          });

          if (!response.ok) {
            const errorText = await response.text();
            console.log('Error response:', errorText);
            throw new Error(`Upload failed: ${response.status} ${response.statusText}`);
          }

          const result = await response.json();
          
          // Write the full response to a file for inspection
          fs.writeFileSync('api-response.json', JSON.stringify(result, null, 2));
          console.log('✅ Response saved to api-response.json');
          
          // Check comprehensive data at all levels
          console.log('\n📊 Response structure:');
          console.log('- result.data:', !!result.data);
          console.log('- result.data.verification:', !!result.data?.verification);
          console.log('- result.data.databaseIntrospection:', !!result.data?.databaseIntrospection);
          console.log('- result.data.databases:', result.data?.databases?.length || 0);
          if (result.data?.databases?.length > 0) {
            result.data.databases.forEach((db, idx) => {
              console.log(`\n- Database ${idx + 1} (${db.name}):`);
              console.log(`  - type: ${db.type}`);
              console.log(`  - verification: ${!!db.verification}`);
              console.log(`  - databaseIntrospection: ${!!db.databaseIntrospection}`);
              console.log(`  - schemaObjects: ${!!db.schemaObjects}`);
              console.log(`  - columns: ${!!db.columns}`);
              console.log(`  - constraints: ${!!db.constraints}`);
              console.log(`  - statistics: ${!!db.statistics}`);
              console.log(`  - functions: ${!!db.functions}`);
              console.log(`  - security: ${!!db.security}`);
              console.log(`  - runtimeState: ${!!db.runtimeState}`);
              console.log(`  - engineFeatures: ${!!db.engineFeatures}`);
            });
          }

          resolve(result);

        } catch (error) {
          console.error('❌ Error:', error);
          reject(error);
        }
      });

      archive.on('error', (err) => {
        console.error('❌ Error creating zip:', err);
        reject(err);
      });

      archive.pipe(output);
      archive.directory(testProjectPath, false);
      archive.file(path.join(testProjectPath, 'comprehensive_test.db'), { name: 'comprehensive_test.db' });
      archive.finalize();
    });

  } catch (error) {
    console.error('❌ Test failed:', error);
    throw error;
  }
}

// Run the test
if (require.main === module) {
  testAPIResponse()
    .then(() => {
      console.log('\n🎉 Test completed!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Test failed:', error);
      process.exit(1);
    });
}

module.exports = { testAPIResponse };
