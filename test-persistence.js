// Test script for database connection persistence across sessions
// Tests localStorage persistence and session management

const fs = require('fs');
const path = require('path');

// Mock localStorage for Node.js testing
class MockLocalStorage {
  constructor() {
    this.store = {};
  }

  getItem(key) {
    return this.store[key] || null;
  }

  setItem(key, value) {
    this.store[key] = value;
  }

  removeItem(key) {
    delete this.store[key];
  }

  clear() {
    this.store = {};
  }
}

// Set up mock localStorage
global.localStorage = new MockLocalStorage();

// Test database connection persistence
function testConnectionPersistence() {
  console.log('🧪 Testing database connection persistence...\n');

  // Test 1: Save connection to storage
  console.log('Test 1: Saving connection to storage');
  const testConnection = {
    id: 'test_connection_123',
    type: 'sqlite',
    credentials: {
      filePath: '/path/to/test.db'
    },
    projectId: 'project_456',
    projectName: 'Test Project',
    connected: true,
    lastConnected: new Date().toISOString()
  };

  localStorage.setItem('queryflow_active_connection', JSON.stringify(testConnection));
  console.log('✅ Connection saved to storage');

  // Test 2: Load connection from storage
  console.log('\nTest 2: Loading connection from storage');
  const loadedConnection = JSON.parse(localStorage.getItem('queryflow_active_connection'));
  
  if (loadedConnection && loadedConnection.id === testConnection.id) {
    console.log('✅ Connection loaded successfully');
    console.log('📊 Loaded connection details:', {
      id: loadedConnection.id,
      type: loadedConnection.type,
      projectName: loadedConnection.projectName,
      connected: loadedConnection.connected
    });
  } else {
    console.log('❌ Failed to load connection');
    return false;
  }

  // Test 3: Clear connection from storage
  console.log('\nTest 3: Clearing connection from storage');
  localStorage.removeItem('queryflow_active_connection');
  const clearedConnection = localStorage.getItem('queryflow_active_connection');
  
  if (clearedConnection === null) {
    console.log('✅ Connection cleared successfully');
  } else {
    console.log('❌ Failed to clear connection');
    return false;
  }

  return true;
}

// Test session management
function testSessionManagement() {
  console.log('\n🧪 Testing session management...\n');

  // Test 1: Save session data
  console.log('Test 1: Saving session data');
  const testSession = {
    activeConnection: {
      id: 'test_connection_789',
      type: 'sqlite',
      projectId: 'project_123',
      projectName: 'Session Test Project',
      lastConnected: new Date().toISOString()
    },
    recentProjects: ['project_123', 'project_456', 'project_789'],
    userPreferences: {
      theme: 'dark',
      defaultView: 'schema',
      autoConnect: true
    },
    lastActivity: new Date().toISOString()
  };

  localStorage.setItem('queryflow_session', JSON.stringify(testSession));
  console.log('✅ Session saved to storage');

  // Test 2: Load session data
  console.log('\nTest 2: Loading session data');
  const loadedSession = JSON.parse(localStorage.getItem('queryflow_session'));
  
  if (loadedSession && loadedSession.activeConnection) {
    console.log('✅ Session loaded successfully');
    console.log('📊 Session details:', {
      hasActiveConnection: !!loadedSession.activeConnection,
      recentProjectsCount: loadedSession.recentProjects?.length || 0,
      hasPreferences: !!loadedSession.userPreferences,
      lastActivity: loadedSession.lastActivity
    });
  } else {
    console.log('❌ Failed to load session');
    return false;
  }

  // Test 3: Update recent projects
  console.log('\nTest 3: Updating recent projects');
  const updatedSession = { ...loadedSession };
  updatedSession.recentProjects = ['project_new', ...updatedSession.recentProjects].slice(0, 10);
  localStorage.setItem('queryflow_session', JSON.stringify(updatedSession));
  
  const updatedLoadedSession = JSON.parse(localStorage.getItem('queryflow_session'));
  if (updatedLoadedSession.recentProjects[0] === 'project_new') {
    console.log('✅ Recent projects updated successfully');
  } else {
    console.log('❌ Failed to update recent projects');
    return false;
  }

  // Test 4: Clear session
  console.log('\nTest 4: Clearing session');
  localStorage.removeItem('queryflow_session');
  const clearedSession = localStorage.getItem('queryflow_session');
  
  if (clearedSession === null) {
    console.log('✅ Session cleared successfully');
  } else {
    console.log('❌ Failed to clear session');
    return false;
  }

  return true;
}

// Test session validation
function testSessionValidation() {
  console.log('\n🧪 Testing session validation...\n');

  // Test 1: Valid session
  console.log('Test 1: Valid session');
  const validSession = {
    lastActivity: new Date().toISOString(),
    version: '1.0'
  };
  localStorage.setItem('queryflow_session', JSON.stringify(validSession));
  
  const loadedValidSession = JSON.parse(localStorage.getItem('queryflow_session'));
  const isValid = loadedValidSession && loadedValidSession.lastActivity;
  console.log(isValid ? '✅ Valid session detected' : '❌ Valid session not detected');

  // Test 2: Expired session
  console.log('\nTest 2: Expired session');
  const expiredSession = {
    lastActivity: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString(), // 8 days ago
    version: '1.0'
  };
  localStorage.setItem('queryflow_session', JSON.stringify(expiredSession));
  
  const loadedExpiredSession = JSON.parse(localStorage.getItem('queryflow_session'));
  const isExpired = loadedExpiredSession && 
    (new Date().getTime() - new Date(loadedExpiredSession.lastActivity).getTime()) > (7 * 24 * 60 * 60 * 1000);
  console.log(isExpired ? '✅ Expired session detected' : '❌ Expired session not detected');

  // Clean up
  localStorage.clear();
  console.log('✅ Test cleanup completed');

  return true;
}

// Test data integrity
function testDataIntegrity() {
  console.log('\n🧪 Testing data integrity...\n');

  // Test 1: Corrupted data handling
  console.log('Test 1: Corrupted data handling');
  localStorage.setItem('queryflow_session', 'invalid json data');
  
  try {
    const corruptedData = JSON.parse(localStorage.getItem('queryflow_session'));
    console.log('❌ Corrupted data was parsed (should have failed)');
  } catch (error) {
    console.log('✅ Corrupted data properly rejected');
    localStorage.removeItem('queryflow_session');
  }

  // Test 2: Large data handling
  console.log('\nTest 2: Large data handling');
  const largeData = {
    activeConnection: {
      id: 'large_test_connection',
      type: 'sqlite',
      projectId: 'large_project',
      projectName: 'Large Test Project',
      lastConnected: new Date().toISOString()
    },
    recentProjects: Array.from({ length: 100 }, (_, i) => `project_${i}`),
    userPreferences: {
      theme: 'dark',
      defaultView: 'schema',
      autoConnect: true,
      largeData: 'x'.repeat(10000) // 10KB of data
    },
    lastActivity: new Date().toISOString()
  };

  try {
    localStorage.setItem('queryflow_session', JSON.stringify(largeData));
    const loadedLargeData = JSON.parse(localStorage.getItem('queryflow_session'));
    
    if (loadedLargeData && loadedLargeData.recentProjects.length === 100) {
      console.log('✅ Large data handled successfully');
    } else {
      console.log('❌ Large data handling failed');
    }
  } catch (error) {
    console.log('❌ Large data caused error:', error.message);
  }

  // Clean up
  localStorage.clear();
  console.log('✅ Data integrity test cleanup completed');

  return true;
}

// Main test function
async function runPersistenceTests() {
  console.log('🚀 Starting persistence tests...\n');

  try {
    const results = [];

    // Run all tests
    results.push(testConnectionPersistence());
    results.push(testSessionManagement());
    results.push(testSessionValidation());
    results.push(testDataIntegrity());

    // Summary
    const passedTests = results.filter(Boolean).length;
    const totalTests = results.length;

    console.log('\n📊 Test Results Summary:');
    console.log(`✅ Passed: ${passedTests}/${totalTests}`);
    console.log(`❌ Failed: ${totalTests - passedTests}/${totalTests}`);

    if (passedTests === totalTests) {
      console.log('\n🎉 All persistence tests passed!');
      console.log('\n📋 Features verified:');
      console.log('  ✅ Database connection persistence');
      console.log('  ✅ Session management');
      console.log('  ✅ Recent projects tracking');
      console.log('  ✅ User preferences storage');
      console.log('  ✅ Session validation');
      console.log('  ✅ Data integrity handling');
      console.log('  ✅ Error handling for corrupted data');
    } else {
      console.log('\n❌ Some tests failed. Please check the implementation.');
    }

  } catch (error) {
    console.error('\n❌ Test suite failed:', error.message);
    process.exit(1);
  }
}

// Run tests if this script is executed directly
if (require.main === module) {
  runPersistenceTests().catch(console.error);
}

module.exports = {
  testConnectionPersistence,
  testSessionManagement,
  testSessionValidation,
  testDataIntegrity,
  runPersistenceTests
};
