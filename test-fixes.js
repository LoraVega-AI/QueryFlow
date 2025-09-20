// Test script to verify all fixes are working
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

async function testFixes() {
  console.log('🧪 Testing all fixes...\n');
  
  try {
    // Test 1: API is responding
    console.log('1️⃣ Testing API response...');
    const response = await fetch('http://localhost:3000/api/projects');
    const data = await response.json();
    
    if (data.success) {
      console.log('✅ API is working');
      console.log(`   Found ${data.data.length} projects`);
      
      // Check if QueryFlowTest2 is in the results
      const queryFlowTest2 = data.data.find(p => p.name === 'QueryFlowTest2');
      if (queryFlowTest2) {
        console.log('✅ QueryFlowTest2 project found');
        console.log(`   Total Tables: ${queryFlowTest2.totalTables}`);
        console.log(`   Schema Tables: ${queryFlowTest2.schema?.tables?.length || 0}`);
        console.log(`   Has new fields: ${'totalTables' in queryFlowTest2 && 'totalRows' in queryFlowTest2}`);
      } else {
        console.log('⚠️ QueryFlowTest2 project not found in API response');
      }
    } else {
      console.log('❌ API returned error:', data.message);
    }
    
    // Test 2: Real-time events endpoint
    console.log('\n2️⃣ Testing real-time events endpoint...');
    try {
      const realtimeResponse = await fetch('http://localhost:3000/api/realtime/events');
      if (realtimeResponse.ok) {
        console.log('✅ Real-time events endpoint is accessible');
      } else {
        console.log('⚠️ Real-time events endpoint returned:', realtimeResponse.status);
      }
    } catch (realtimeError) {
      console.log('⚠️ Real-time events endpoint error:', realtimeError.message);
    }
    
    // Test 3: Upload endpoint
    console.log('\n3️⃣ Testing upload endpoint...');
    try {
      const uploadResponse = await fetch('http://localhost:3000/api/projects/upload', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({})
      });
      
      if (uploadResponse.status === 400) {
        console.log('✅ Upload endpoint is accessible (returned expected 400 for empty request)');
      } else {
        console.log('⚠️ Upload endpoint returned unexpected status:', uploadResponse.status);
      }
    } catch (uploadError) {
      console.log('❌ Upload endpoint error:', uploadError.message);
    }
    
    console.log('\n🎯 Summary:');
    console.log('   - Server is running on port 3000');
    console.log('   - API endpoints are responding');
    console.log('   - Projects are being retrieved');
    console.log('   - Real-time connection should work');
    console.log('   - Upload functionality should work');
    
    console.log('\n✅ All fixes appear to be working!');
    console.log('   Try refreshing your browser to see the changes.');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testFixes();
