// Simple test for upload pipeline
const fs = require('fs');
const path = require('path');
const AdmZip = require('adm-zip');

async function testUploadPipeline() {
  console.log('🧪 Testing upload pipeline...');
  
  try {
    // Create a simple test project
    const testDir = path.join(__dirname, 'test-simple-project');
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true });
    }
    
    fs.mkdirSync(testDir, { recursive: true });
    
    // Create test files
    const testFiles = {
      'package.json': JSON.stringify({
        name: 'test-project',
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
    const zipPath = path.join(__dirname, 'test-simple-project.zip');
    const zip = new AdmZip();
    zip.addLocalFolder(testDir);
    zip.writeZip(zipPath);
    
    console.log(`📦 Created zip file: ${zipPath}`);
    
    // Test zip extraction
    const extractDir = path.join(__dirname, 'test-extracted');
    if (fs.existsSync(extractDir)) {
      fs.rmSync(extractDir, { recursive: true, force: true });
    }
    
    const zip2 = new AdmZip(zipPath);
    zip2.extractAllTo(extractDir, true);
    
    console.log(`📦 Extracted to: ${extractDir}`);
    
    // List extracted files
    const extractedFiles = fs.readdirSync(extractDir, { withFileTypes: true });
    console.log(`📁 Extracted ${extractedFiles.length} items:`);
    extractedFiles.forEach(file => {
      console.log(`  - ${file.name} (${file.isDirectory() ? 'dir' : 'file'})`);
    });
    
    // Test file reading
    const packageJsonPath = path.join(extractDir, 'package.json');
    if (fs.existsSync(packageJsonPath)) {
      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
      console.log('📦 Package.json:', packageJson.name);
    }
    
    const schemaPath = path.join(extractDir, 'schema.sql');
    if (fs.existsSync(schemaPath)) {
      const schema = fs.readFileSync(schemaPath, 'utf-8');
      console.log('📄 Schema.sql length:', schema.length);
      console.log('📄 Schema contains CREATE TABLE:', schema.includes('CREATE TABLE'));
    }
    
    const modelPath = path.join(extractDir, 'models', 'User.js');
    if (fs.existsSync(modelPath)) {
      const model = fs.readFileSync(modelPath, 'utf-8');
      console.log('🔧 User.js length:', model.length);
      console.log('🔧 Model contains sequelize.define:', model.includes('sequelize.define'));
    }
    
    const envPath = path.join(extractDir, '.env');
    if (fs.existsSync(envPath)) {
      const env = fs.readFileSync(envPath, 'utf-8');
      console.log('⚙️ .env length:', env.length);
      console.log('⚙️ Contains DATABASE_URL:', env.includes('DATABASE_URL'));
    }
    
    console.log('✅ Upload pipeline test completed successfully!');
    
    // Cleanup
    fs.rmSync(testDir, { recursive: true, force: true });
    fs.rmSync(extractDir, { recursive: true, force: true });
    fs.unlinkSync(zipPath);
    console.log('🧹 Cleaned up test files');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

testUploadPipeline();
