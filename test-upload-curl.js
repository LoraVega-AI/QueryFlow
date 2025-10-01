const fs = require('fs');
const { exec } = require('child_process');
const { promisify } = require('util');

const execAsync = promisify(exec);

async function testUploadWithCurl() {
  try {
    console.log('🧪 Testing upload with curl...');
    
    // Use the existing test database
    const testDbPath = 'test.db';
    
    if (!fs.existsSync(testDbPath)) {
      throw new Error('Test database file does not exist');
    }
    
    console.log('✅ Using existing test database');
    
    // Use curl to upload the file
    const curlCommand = `curl -X POST -F "files=@${testDbPath}" -F "projectName=Simple Test Project" http://localhost:3000/api/projects/upload`;
    
    console.log('📤 Uploading file with curl...');
    const { stdout, stderr } = await execAsync(curlCommand);
    
    if (stderr) {
      console.error('❌ Curl error:', stderr);
    }
    
    console.log('📊 Response:', stdout);
    
    // Try to parse the response as JSON
    try {
      const result = JSON.parse(stdout);
      console.log('✅ Upload successful!');
      console.log('📊 Project ID:', result.project?.id);
      console.log('📊 Project name:', result.project?.name);
      console.log('📊 System catalog:', result.project?.systemCatalog ? 'PRESENT' : 'NULL');
    } catch (parseError) {
      console.log('📊 Raw response:', stdout);
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

testUploadWithCurl();
