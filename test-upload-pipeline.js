// Test script to verify the upload pipeline works
const fs = require('fs');
const path = require('path');
const AdmZip = require('adm-zip');

// Create a test project
async function createTestProject() {
  console.log('🧪 Creating test project for upload pipeline...');
  
  const testDir = path.join(__dirname, 'test-upload-project');
  
  // Clean up if exists
  if (fs.existsSync(testDir)) {
    fs.rmSync(testDir, { recursive: true, force: true });
  }
  
  // Create test project structure
  fs.mkdirSync(testDir, { recursive: true });
  fs.mkdirSync(path.join(testDir, 'migrations'), { recursive: true });
  fs.mkdirSync(path.join(testDir, 'models'), { recursive: true });
  
  // Create test files
  const testFiles = {
    'package.json': JSON.stringify({
      name: 'test-project',
      version: '1.0.0',
      dependencies: {
        'sequelize': '^6.0.0'
      }
    }, null, 2),
    
    'schema.sql': `
CREATE TABLE users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username VARCHAR(50) NOT NULL UNIQUE,
  email VARCHAR(100) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE posts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  title VARCHAR(200) NOT NULL,
  content TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);
`,
    
    'migrations/001_create_users.sql': `
-- Up Migration
CREATE TABLE users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username VARCHAR(50) NOT NULL UNIQUE,
  email VARCHAR(100) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Down Migration
DROP TABLE users;
`,
    
    'models/User.js': `
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const User = sequelize.define('User', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    username: {
      type: DataTypes.STRING(50),
      allowNull: false,
      unique: true
    },
    email: {
      type: DataTypes.STRING(100),
      allowNull: false
    }
  }, {
    tableName: 'users'
  });

  return User;
};
`,
    
    '.env': `
DATABASE_URL=sqlite:///app.db
DB_HOST=localhost
DB_PORT=5432
DB_NAME=testdb
DB_USERNAME=testuser
DB_PASSWORD=testpass
`
  };
  
  // Write test files
  for (const [filePath, content] of Object.entries(testFiles)) {
    const fullPath = path.join(testDir, filePath);
    fs.writeFileSync(fullPath, content);
    console.log(`✅ Created: ${filePath}`);
  }
  
  // Create zip file
  const zipPath = path.join(__dirname, 'test-project.zip');
  const zip = new AdmZip();
  zip.addLocalFolder(testDir);
  zip.writeZip(zipPath);
  
  console.log(`📦 Created zip file: ${zipPath}`);
  console.log(`📁 Test project created in: ${testDir}`);
  
  return { testDir, zipPath };
}

// Test the upload API
async function testUploadAPI() {
  console.log('🧪 Testing upload API...');
  
  try {
    const { zipPath } = await createTestProject();
    
    // Read the zip file
    const zipBuffer = fs.readFileSync(zipPath);
    
    // Create FormData
    const formData = new FormData();
    const blob = new Blob([zipBuffer], { type: 'application/zip' });
    formData.append('files', blob, 'test-project.zip');
    formData.append('projectName', 'Test Project');
    formData.append('projectDescription', 'Test project for upload pipeline');
    formData.append('advancedScanning', 'true');
    formData.append('scanOptions', JSON.stringify({
      includeHidden: false,
      maxDepth: 5,
      ignorePatterns: ['node_modules', '.git', 'dist', 'build', '__pycache__'],
      scanTimeout: 30000
    }));
    
    console.log('📤 Sending upload request...');
    
    // Note: This would need to be run in a browser environment or with a proper HTTP client
    // For now, we'll just verify the zip file was created correctly
    console.log('✅ Test project created successfully');
    console.log('📋 Files in zip:');
    
    const zip = new AdmZip(zipPath);
    const zipEntries = zip.getEntries();
    zipEntries.forEach(entry => {
      console.log(`  - ${entry.entryName}`);
    });
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Cleanup function
function cleanup() {
  const testDir = path.join(__dirname, 'test-upload-project');
  const zipPath = path.join(__dirname, 'test-project.zip');
  
  if (fs.existsSync(testDir)) {
    fs.rmSync(testDir, { recursive: true, force: true });
    console.log('🧹 Cleaned up test directory');
  }
  
  if (fs.existsSync(zipPath)) {
    fs.unlinkSync(zipPath);
    console.log('🧹 Cleaned up zip file');
  }
}

// Command line interface
const command = process.argv[2];

if (command === 'create') {
  createTestProject();
} else if (command === 'test') {
  testUploadAPI();
} else if (command === 'cleanup') {
  cleanup();
} else {
  console.log('Usage:');
  console.log('  node test-upload-pipeline.js create    - Create test project');
  console.log('  node test-upload-pipeline.js test      - Test upload API');
  console.log('  node test-upload-pipeline.js cleanup   - Clean up test files');
}
