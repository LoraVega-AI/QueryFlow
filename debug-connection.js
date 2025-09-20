// Debug script to test QueryFlow connectivity
// Run with: node debug-connection.js

const fetch = require('node-fetch');

async function testConnection() {
  console.log('🔍 Testing QueryFlow API connectivity...\n');
  
  const baseUrl = 'http://localhost:3000';
  
  try {
    // Test 1: Basic API endpoint
    console.log('1. Testing /api/projects endpoint...');
    const projectsResponse = await fetch(`${baseUrl}/api/projects`);
    console.log(`   Status: ${projectsResponse.status}`);
    console.log(`   OK: ${projectsResponse.ok}`);
    
    if (projectsResponse.ok) {
      const data = await projectsResponse.json();
      console.log(`   Response: ${JSON.stringify(data, null, 2)}`);
    } else {
      console.log(`   Error: ${await projectsResponse.text()}`);
    }
    
  } catch (error) {
    console.log(`   ❌ Error: ${error.message}`);
  }
  
  console.log('\n');
  
  try {
    // Test 2: Real-time events endpoint
    console.log('2. Testing /api/realtime/events endpoint...');
    const eventsResponse = await fetch(`${baseUrl}/api/realtime/events`);
    console.log(`   Status: ${eventsResponse.status}`);
    console.log(`   OK: ${eventsResponse.ok}`);
    console.log(`   Headers: ${JSON.stringify([...eventsResponse.headers.entries()], null, 2)}`);
    
  } catch (error) {
    console.log(`   ❌ Error: ${error.message}`);
  }
  
  console.log('\n');
  
  try {
    // Test 3: Upload endpoint (without files)
    console.log('3. Testing /api/projects/upload endpoint...');
    const formData = new FormData();
    formData.append('projectName', 'test');
    formData.append('projectDescription', 'test upload');
    
    const uploadResponse = await fetch(`${baseUrl}/api/projects/upload`, {
      method: 'POST',
      body: formData
    });
    
    console.log(`   Status: ${uploadResponse.status}`);
    console.log(`   OK: ${uploadResponse.ok}`);
    
    if (!uploadResponse.ok) {
      const errorText = await uploadResponse.text();
      console.log(`   Error: ${errorText}`);
    }
    
  } catch (error) {
    console.log(`   ❌ Error: ${error.message}`);
  }
  
  console.log('\n✅ Connection test completed!');
}

// Run the test
testConnection().catch(console.error);
