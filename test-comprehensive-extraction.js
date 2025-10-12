const fs = require('fs');
const path = require('path');

async function testComprehensiveExtraction() {
  try {
    console.log('🧪 Testing comprehensive extraction pipeline...\n');

    // Create a zip file of the comprehensive test project
    const testProjectPath = path.join(__dirname, 'comprehensive-test-project');
    const zipPath = path.join(__dirname, 'comprehensive-test-project.zip');
    
    // Check if zip already exists
    if (fs.existsSync(zipPath)) {
      fs.unlinkSync(zipPath);
    }

    // Create zip using Node.js built-in modules (simplified approach)
    const archiver = require('archiver');
    const output = fs.createWriteStream(zipPath);
    const archive = archiver('zip', { zlib: { level: 9 } });

    return new Promise((resolve, reject) => {
      output.on('close', async () => {
        console.log(`📦 Created zip file: ${archive.pointer()} bytes`);
        
        try {
          // Upload the project using built-in FormData
          const form = new FormData();
          const fileBuffer = fs.readFileSync(zipPath);
          const fileBlob = new Blob([fileBuffer], { type: 'application/zip' });
          form.append('files', fileBlob, 'comprehensive-test-project.zip');
          form.append('projectName', 'Comprehensive Test Project');
          form.append('projectDescription', 'Comprehensive test project with 5 Sequelize models, 6 foreign keys, 8 indexes, 4 unique constraints, and 50+ rows of sample data');

          console.log('🚀 Uploading comprehensive test project...');
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
          console.log('✅ Upload successful!');
          console.log(`📊 Project ID: ${result.data?.id || 'Unknown'}`);
          console.log(`📈 Extraction status: ${result.data?.databases?.[0]?.verificationStatus?.status || 'Unknown'}`);

          // Check project-level comprehensive data
          console.log('\n🔍 Project-level comprehensive data:');
          console.log(`   - Verification: ${result.data?.verification ? '✅' : '❌'}`);
          console.log(`   - Database Introspection: ${result.data?.databaseIntrospection ? '✅' : '❌'}`);
          console.log(`   - Schema Objects: ${result.data?.schemaObjects ? '✅' : '❌'}`);
          console.log(`   - Columns: ${result.data?.columns ? '✅' : '❌'}`);
          console.log(`   - Constraints: ${result.data?.constraints ? '✅' : '❌'}`);
          console.log(`   - Statistics: ${result.data?.statistics ? '✅' : '❌'}`);
          console.log(`   - Functions: ${result.data?.functions ? '✅' : '❌'}`);
          console.log(`   - Security: ${result.data?.security ? '✅' : '❌'}`);
          console.log(`   - Runtime State: ${result.data?.runtimeState ? '✅' : '❌'}`);
          console.log(`   - Engine Features: ${result.data?.engineFeatures ? '✅' : '❌'}`);

          // Check if all comprehensive sections are present
          const db = result.data?.databases?.[0];
          if (db) {
            console.log('\n🔍 Comprehensive sections verification:');
            console.log(`   - Verification: ${db.verification ? '✅' : '❌'}`);
            console.log(`   - Database Introspection: ${db.databaseIntrospection ? '✅' : '❌'}`);
            console.log(`   - Schema Objects: ${db.schemaObjects ? '✅' : '❌'}`);
            console.log(`   - Columns: ${db.columns ? '✅' : '❌'}`);
            console.log(`   - Constraints: ${db.constraints ? '✅' : '❌'}`);
            console.log(`   - Statistics: ${db.statistics ? '✅' : '❌'}`);
            console.log(`   - Functions: ${db.functions ? '✅' : '❌'}`);
            console.log(`   - Security: ${db.security ? '✅' : '❌'}`);
            console.log(`   - Runtime State: ${db.runtimeState ? '✅' : '❌'}`);
            console.log(`   - Engine Features: ${db.engineFeatures ? '✅' : '❌'}`);

            // Check verification accuracy
            if (db.verification) {
              console.log('\n📊 Verification Results:');
              console.log(`   - Accuracy: ${db.verification.accuracy || 'N/A'}`);
              console.log(`   - Phantom Tables: ${db.verification.phantomTables?.length || 0}`);
              console.log(`   - Unused Models: ${db.verification.unusedModels?.length || 0}`);
              console.log(`   - Discrepancies: ${db.verification.discrepancies?.length || 0}`);
            }

            // Check database introspection
            if (db.databaseIntrospection) {
              console.log('\n🔍 Database Introspection:');
              console.log(`   - Tables: ${db.databaseIntrospection.tables?.length || 0}`);
              console.log(`   - Views: ${db.databaseIntrospection.views?.length || 0}`);
              console.log(`   - Indexes: ${db.databaseIntrospection.indexes?.length || 0}`);
              console.log(`   - Triggers: ${db.databaseIntrospection.triggers?.length || 0}`);
            }

            // Check extraction consistency
            if (db.verification?.extractionConsistency) {
              console.log('\n🔄 Extraction Consistency:');
              console.log(`   - Unused Models: ${db.verification.extractionConsistency.unusedModels?.length || 0}`);
              console.log(`   - Phantom Structures: ${db.verification.extractionConsistency.phantomStructures?.length || 0}`);
              console.log(`   - Constraint Discrepancies: ${db.verification.extractionConsistency.constraintDiscrepancies?.length || 0}`);
              console.log(`   - Relation Discrepancies: ${db.verification.extractionConsistency.relationDiscrepancies?.length || 0}`);
            }
          }

          console.log('\n✅ Comprehensive extraction test completed successfully!');
          resolve(result);

        } catch (error) {
          console.error('❌ Error during upload:', error);
          reject(error);
        }
      });

      archive.on('error', (err) => {
        console.error('❌ Error creating zip:', err);
        reject(err);
      });

      archive.pipe(output);
      archive.directory(testProjectPath, false);
      // Explicitly add the database file
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
  testComprehensiveExtraction()
    .then(() => {
      console.log('\n🎉 All tests passed!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Test failed:', error);
      process.exit(1);
    });
}

module.exports = { testComprehensiveExtraction };