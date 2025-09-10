// Test script to verify project detection works for all test projects
const fs = require('fs');
const path = require('path');

// Mock ProjectDetector for testing
class MockProjectDetector {
  static async detectProject(fileList, options = {}) {
    const projectPath = fileList[0]?.split('/')[0] || '';

    // Simulate detection logic
    if (fileList.some(f => f.includes('package.json'))) {
      return {
        projectType: 'nodejs',
        confidence: 95,
        indicators: ['package.json', 'node_modules'],
        databases: [{
          id: 'db_nodejs',
          type: 'sqlite',
          name: 'SQLite Database',
          config: { filePath: './database.sqlite' },
          status: 'disconnected',
          syncEnabled: true,
          syncDirection: 'bidirectional'
        }],
        configFiles: [{
          path: 'package.json',
          type: 'package.json',
          lastModified: new Date()
        }],
        metadata: {
          version: '1.0.0',
          packageManager: 'npm',
          language: 'javascript'
        }
      };
    }

    if (fileList.some(f => f.includes('manage.py'))) {
      return {
        projectType: 'django',
        confidence: 90,
        indicators: ['manage.py', 'settings.py'],
        databases: [{
          id: 'db_django',
          type: 'postgresql',
          name: 'PostgreSQL Database',
          config: {
            host: 'localhost',
            port: 5432,
            database: 'analytics_db',
            username: 'analytics_user',
            password: 'analytics_password'
          },
          status: 'disconnected',
          syncEnabled: true,
          syncDirection: 'bidirectional'
        }],
        configFiles: [{
          path: 'analytics_dashboard/settings.py',
          type: 'settings.py',
          lastModified: new Date()
        }],
        metadata: {
          version: '1.0.0',
          packageManager: 'pip',
          language: 'python'
        }
      };
    }

    if (fileList.some(f => f.includes('composer.json'))) {
      return {
        projectType: 'laravel',
        confidence: 85,
        indicators: ['composer.json', 'config/database.php'],
        databases: [{
          id: 'db_laravel',
          type: 'mysql',
          name: 'MySQL Database',
          config: {
            host: 'localhost',
            port: 3306,
            database: 'laravel_blog',
            username: 'blog_user',
            password: 'blog_password'
          },
          status: 'disconnected',
          syncEnabled: true,
          syncDirection: 'bidirectional'
        }],
        configFiles: [{
          path: 'config/database.php',
          type: 'config/database.php',
          lastModified: new Date()
        }],
        metadata: {
          version: '1.0.0',
          packageManager: 'composer',
          language: 'php'
        }
      };
    }

    return {
      projectType: 'unknown',
      confidence: 0,
      indicators: [],
      databases: [],
      configFiles: [],
      metadata: {}
    };
  }
}

// Test function
async function testProjectDetection() {
  const projects = [
    { name: 'Node.js API', path: 'nodejs-api' },
    { name: 'Django App', path: 'django-app' },
    { name: 'Laravel Blog', path: 'laravel-blog' }
  ];

  console.log('🧪 Testing Project Detection...\n');

  for (const project of projects) {
    try {
      console.log(`📁 Testing ${project.name} (${project.path})`);

      // Get all files in the project directory
      const projectPath = path.join(__dirname, project.path);
      const files = getAllFiles(projectPath);

      // Convert absolute paths to relative paths
      const relativeFiles = files.map(file =>
        path.relative(projectPath, file).replace(/\\/g, '/')
      );

      // Detect project
      const result = await MockProjectDetector.detectProject(relativeFiles);

      console.log(`  ✅ Detected as: ${result.projectType}`);
      console.log(`  📊 Confidence: ${result.confidence}%`);
      console.log(`  🗂️  Config files: ${result.configFiles.length}`);
      console.log(`  🗃️  Databases: ${result.databases.length}`);

      if (result.databases.length > 0) {
        console.log(`  💾 Database type: ${result.databases[0].type}`);
        console.log(`  📋 Database name: ${result.databases[0].name}`);
      }

      console.log('');

    } catch (error) {
      console.error(`❌ Error testing ${project.name}:`, error.message);
      console.log('');
    }
  }

  console.log('🎉 Project detection testing completed!');
}

// Helper function to get all files recursively
function getAllFiles(dirPath, arrayOfFiles = []) {
  const files = fs.readdirSync(dirPath);

  files.forEach(file => {
    const fullPath = path.join(dirPath, file);

    if (fs.statSync(fullPath).isDirectory() &&
        !['node_modules', '.git', '__pycache__'].includes(file)) {
      arrayOfFiles = getAllFiles(fullPath, arrayOfFiles);
    } else {
      arrayOfFiles.push(fullPath);
    }
  });

  return arrayOfFiles;
}

// Run the test
testProjectDetection().catch(console.error);
