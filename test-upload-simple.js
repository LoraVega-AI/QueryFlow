const fs = require('fs');
const FormData = require('form-data');

async function testSimpleUpload() {
  try {
    console.log('🧪 Testing simple upload...');
    
    // Use the existing test database
    const testDbPath = 'test.db';
    
    if (!fs.existsSync(testDbPath)) {
      throw new Error('Test database file does not exist');
    }
    
    console.log('✅ Using existing test database');
    
    // Create form data
    const form = new FormData();
    form.append('files', fs.createReadStream(testDbPath), 'test.db');
    form.append('projectName', 'Simple Test Project');
    
    // Upload the file
    console.log('📤 Uploading file...');
    const response = await fetch('http://localhost:3000/api/projects/upload', {
      method: 'POST',
      body: form,
      headers: {
        ...form.getHeaders()
      }
    });
    
    console.log('📊 Response status:', response.status);
    console.log('📊 Response headers:', Object.fromEntries(response.headers.entries()));
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Upload failed:', errorText);
      return;
    }
    
    const result = await response.json();
    console.log('✅ Upload successful!');
    console.log('📊 Project ID:', result.project?.id);
    console.log('📊 Project name:', result.project?.name);
    
    // No cleanup needed for existing database
    console.log('✅ Test completed');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

testSimpleUpload();
