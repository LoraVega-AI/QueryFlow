// Test script to verify real-time endpoint functionality
const http = require('http');

const testRealtimeEndpoint = () => {
  const options = {
    hostname: 'localhost',
    port: 3000,
    path: '/api/realtime/events',
    method: 'GET',
    headers: {
      'Accept': 'text/event-stream',
      'Cache-Control': 'no-cache'
    }
  };

  console.log('Testing real-time endpoint...');
  console.log('URL:', `http://${options.hostname}:${options.port}${options.path}`);

  const req = http.request(options, (res) => {
    console.log('Response status:', res.statusCode);
    console.log('Response headers:', res.headers);
    
    if (res.statusCode === 200) {
      console.log('✅ Real-time endpoint is accessible');
      
      let data = '';
      res.on('data', (chunk) => {
        data += chunk.toString();
        console.log('Received data:', chunk.toString());
      });
      
      res.on('end', () => {
        console.log('Connection ended');
        console.log('Total data received:', data);
      });
      
      // Close connection after 5 seconds
      setTimeout(() => {
        console.log('Closing test connection...');
        req.destroy();
        process.exit(0);
      }, 5000);
    } else {
      console.log('❌ Real-time endpoint returned error:', res.statusCode);
      process.exit(1);
    }
  });

  req.on('error', (error) => {
    console.error('❌ Request failed:', error.message);
    process.exit(1);
  });

  req.on('timeout', () => {
    console.log('❌ Request timed out');
    req.destroy();
    process.exit(1);
  });

  req.setTimeout(10000); // 10 second timeout
  req.end();
};

testRealtimeEndpoint();
