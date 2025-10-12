const fs = require('fs');
const path = require('path');

async function testSimpleUpload() {
  try {
    console.log('🧪 Testing simple upload...\n');

    // Create a simple test file
    const testContent = `
// Simple test model
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const TestModel = sequelize.define('TestModel', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    name: {
      type: DataTypes.STRING(100),
      allowNull: false
    }
  });

  return TestModel;
};
`;

    const testDir = path.join(__dirname, 'simple-test');
    if (!fs.existsSync(testDir)) {
      fs.mkdirSync(testDir);
    }

    fs.writeFileSync(path.join(testDir, 'TestModel.js'), testContent);

    // Create zip
    const archiver = require('archiver');
    const zipPath = path.join(__dirname, 'simple-test.zip');
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
          form.append('files', fileBlob, 'simple-test.zip');
          form.append('projectName', 'Simple Test Project');
          form.append('projectDescription', 'Simple test project');

          console.log('🚀 Uploading simple test project...');
          const response = await fetch('http://localhost:3000/api/projects/upload', {
            method: 'POST',
            body: form
          });

          console.log('Response status:', response.status);
          console.log('Response headers:', Object.fromEntries(response.headers.entries()));

          if (!response.ok) {
            const errorText = await response.text();
            console.log('Error response:', errorText);
            throw new Error(`Upload failed: ${response.status} ${response.statusText}`);
          }

          const result = await response.json();
          console.log('✅ Upload successful!');
          console.log('Result:', JSON.stringify(result, null, 2));

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
      archive.directory(testDir, false);
      archive.finalize();
    });

  } catch (error) {
    console.error('❌ Test failed:', error);
    throw error;
  }
}

// Run the test
if (require.main === module) {
  testSimpleUpload()
    .then(() => {
      console.log('\n🎉 Simple test passed!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Simple test failed:', error);
      process.exit(1);
    });
}

module.exports = { testSimpleUpload };