const FormData = require('form-data');
const fs = require('fs');
const fetch = require('node-fetch').default;

async function testUpload() {
  try {
    const form = new FormData();
    form.append('files', fs.createReadStream('test-project.zip'));
    form.append('projectName', 'Test Project');
    form.append('projectDescription', 'Test project with database files');
    
    console.log('🚀 Testing upload with test-project.zip...');
    console.log('📁 File exists:', fs.existsSync('test-project.zip'));
    console.log('📁 File size:', fs.statSync('test-project.zip').size, 'bytes');
    
    // Add timeout wrapper
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Request timeout')), 30000);
    });
    
    const fetchPromise = fetch('http://localhost:3000/api/projects/upload', {
      method: 'POST',
      body: form
    });
    
    const response = await Promise.race([fetchPromise, timeoutPromise]);
    const result = await response.text();
    console.log('📊 Response status:', response.status);
    console.log('📊 Response body:', result);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

testUpload();
