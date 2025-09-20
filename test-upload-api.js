// Test the actual upload API endpoint
const fs = require('fs');
const path = require('path');
const AdmZip = require('adm-zip');
const FormData = require('form-data');
const https = require('https');
const http = require('http');

async function createTestProject() {
  console.log('🧪 Creating test project for API testing...');
  
  const testDir = path.join(__dirname, 'test-api-project');
  
  // Clean up if exists
  if (fs.existsSync(testDir)) {
    fs.rmSync(testDir, { recursive: true, force: true });
  }
  
  // Create test project structure
  fs.mkdirSync(testDir, { recursive: true });
  fs.mkdirSync(path.join(testDir, 'models'), { recursive: true });
  
  // Create test files
  const testFiles = {
    'package.json': JSON.stringify({
      name: 'test-api-project',
      version: '1.0.0',
      dependencies: { 'sequelize': '^6.0.0' }
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
`
  };
  
  // Write test files
  for (const [filePath, content] of Object.entries(testFiles)) {
    const fullPath = path.join(testDir, filePath);
    const dir = path.dirname(fullPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(fullPath, content);
    console.log(`✅ Created: ${filePath}`);
  }
  
  // Create zip file
  const zipPath = path.join(__dirname, 'test-api-project.zip');
  const zip = new AdmZip();
  zip.addLocalFolder(testDir);
  zip.writeZip(zipPath);
  
  console.log(`📦 Created zip file: ${zipPath}`);
  
  return { testDir, zipPath };
}

async function testUploadAPI() {
  console.log('🧪 Testing upload API endpoint...');
  
  let testDir;
  try {
    const result = await createTestProject();
    const { zipPath } = result;
    testDir = result.testDir;
    
    // Read zip file
    const zipBuffer = fs.readFileSync(zipPath);
    console.log(`📦 Zip file size: ${zipBuffer.length} bytes`);
    
    // Create form data
    const formData = new FormData();
    formData.append('files', zipBuffer, {
      filename: 'test-api-project.zip',
      contentType: 'application/zip'
    });
    formData.append('projectName', 'Test API Project');
    formData.append('projectDescription', 'A test project for API testing');
    formData.append('advancedScanning', 'true');
    formData.append('scanOptions', JSON.stringify({
      includeHidden: false,
      maxDepth: 5,
      ignorePatterns: ['node_modules', '.git', 'dist', 'build', '__pycache__'],
      scanTimeout: 30000
    }));
    
    console.log('📤 Sending upload request to API...');
    
    // Make the API request using http module
    const response = await new Promise((resolve, reject) => {
      const req = http.request('http://localhost:3001/api/projects/upload', {
        method: 'POST',
        headers: formData.getHeaders()
      }, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          resolve({
            status: res.statusCode,
            headers: res.headers,
            data: data
          });
        });
      });
      
      req.on('error', reject);
      formData.pipe(req);
    });
    
    console.log(`📡 Response status: ${response.status}`);
    console.log(`📡 Response headers:`, response.headers);
    
    if (response.status >= 200 && response.status < 300) {
      const result = JSON.parse(response.data);
      console.log('✅ Upload successful!');
      console.log('📊 Full response data:');
      console.log(JSON.stringify(result, null, 2));
      console.log('\n📊 Parsed response data:');
      console.log(`  - Success: ${result.success}`);
      console.log(`  - Project ID: ${result.projectId}`);
      console.log(`  - Project Name: ${result.projectName}`);
      console.log(`  - Database Count: ${result.databaseCount}`);
      console.log(`  - Schema Count: ${result.schemaCount}`);
      console.log(`  - Total Tables: ${result.totalTables}`);
      console.log(`  - Total Rows: ${result.totalRows}`);
      console.log(`  - Has Foreign Keys: ${result.hasForeignKeys}`);
      console.log(`  - Has Indexes: ${result.hasIndexes}`);
      
      if (result.extractedSchemas && result.extractedSchemas.length > 0) {
        console.log('\n📋 Extracted Schemas:');
        result.extractedSchemas.forEach((schema, index) => {
          console.log(`  ${index + 1}. ${schema.name} (${schema.type})`);
          console.log(`     - Tables: ${schema.tables?.length || 0}`);
          console.log(`     - Confidence: ${schema.confidence}`);
        });
      }
      
      if (result.databaseFiles && result.databaseFiles.length > 0) {
        console.log('\n🗄️ Database Files:');
        result.databaseFiles.forEach((db, index) => {
          console.log(`  ${index + 1}. ${db.name} (${db.type})`);
          console.log(`     - Path: ${db.path}`);
          console.log(`     - Size: ${db.size} bytes`);
        });
      }
      
    } else {
      console.log('❌ Upload failed!');
      console.log(`📡 Error response: ${response.data}`);
    }
    
    // Cleanup
    fs.rmSync(testDir, { recursive: true, force: true });
    fs.unlinkSync(zipPath);
    console.log('🧹 Cleaned up test files');
    
  } catch (error) {
    console.error('❌ Upload API test failed:', error);
    console.error('Stack trace:', error.stack);
  }
}

// Check if required dependencies are available
function checkDependencies() {
  try {
    require('form-data');
    console.log('✅ Required dependencies are available');
    return true;
  } catch (error) {
    console.log('❌ Missing dependencies. Installing...');
    return false;
  }
}

async function main() {
  console.log('🚀 Starting upload API test...\n');
  
  if (!checkDependencies()) {
    console.log('Please install dependencies first:');
    console.log('npm install form-data');
    return;
  }
  
  await testUploadAPI();
  
  console.log('\n🎉 Upload API test completed!');
}

main().catch(console.error);
