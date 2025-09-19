#!/usr/bin/env node

const { spawn } = require('child_process');
const path = require('path');

console.log('🚀 QueryFlow Upload Workflow Test Runner');
console.log('==========================================\n');

// Check if the development server is running
async function checkServerRunning() {
  try {
    const response = await fetch('http://localhost:3000/api/projects');
    return response.ok;
  } catch (error) {
    return false;
  }
}

// Start the development server if not running
async function startDevServer() {
  console.log('🔧 Starting development server...');
  
  return new Promise((resolve, reject) => {
    const server = spawn('npm', ['run', 'dev'], {
      cwd: __dirname,
      stdio: 'pipe',
      shell: true
    });
    
    let serverReady = false;
    
    server.stdout.on('data', (data) => {
      const output = data.toString();
      console.log(output);
      
      if (output.includes('Ready') || output.includes('started server')) {
        if (!serverReady) {
          serverReady = true;
          console.log('✅ Development server started');
          resolve(server);
        }
      }
    });
    
    server.stderr.on('data', (data) => {
      console.error(data.toString());
    });
    
    server.on('error', (error) => {
      console.error('❌ Failed to start development server:', error);
      reject(error);
    });
    
    // Timeout after 30 seconds
    setTimeout(() => {
      if (!serverReady) {
        console.error('❌ Server startup timeout');
        reject(new Error('Server startup timeout'));
      }
    }, 30000);
  });
}

// Wait for server to be ready
async function waitForServer() {
  console.log('⏳ Waiting for server to be ready...');
  
  for (let i = 0; i < 30; i++) {
    if (await checkServerRunning()) {
      console.log('✅ Server is ready');
      return true;
    }
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  throw new Error('Server did not become ready within 30 seconds');
}

// Run the comprehensive test
async function runTest() {
  try {
    console.log('🧪 Running comprehensive upload workflow test...\n');
    
    const { runComprehensiveTest } = require('./test-upload-workflow.js');
    await runComprehensiveTest();
    
    console.log('\n🎉 All tests completed successfully!');
    console.log('\n📋 Test Summary:');
    console.log('  ✅ Database creation');
    console.log('  ✅ File upload API');
    console.log('  ✅ Project storage in database');
    console.log('  ✅ Projects list API');
    console.log('  ✅ Project deletion API');
    console.log('  ✅ Real-time project updates');
    
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    process.exit(1);
  }
}

// Main execution
async function main() {
  let server = null;
  
  try {
    // Check if server is already running
    if (await checkServerRunning()) {
      console.log('✅ Development server is already running');
    } else {
      server = await startDevServer();
      await waitForServer();
    }
    
    // Run the test
    await runTest();
    
  } catch (error) {
    console.error('❌ Test runner failed:', error.message);
    process.exit(1);
  } finally {
    // Clean up server if we started it
    if (server) {
      console.log('\n🛑 Stopping development server...');
      server.kill();
    }
  }
}

// Handle process termination
process.on('SIGINT', () => {
  console.log('\n🛑 Test interrupted by user');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n🛑 Test terminated');
  process.exit(0);
});

// Run the main function
main().catch(console.error);
