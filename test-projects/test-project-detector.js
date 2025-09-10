// Test the actual ProjectDetector
const fs = require('fs');
const path = require('path');

// Mock ProjectDetector (simplified version)
class MockProjectDetector {
  static async detectProject(fileList, options = {}) {
    const projectPath = fileList[0]?.split('/')[0] || '';

    // Detect project type
    let projectType = 'unknown';
    if (fileList.some(f => f.includes('package.json'))) {
      projectType = 'nodejs';
    } else if (fileList.some(f => f.includes('manage.py'))) {
      projectType = 'django';
    } else if (fileList.some(f => f.includes('composer.json'))) {
      projectType = 'laravel';
    }

    // Detect databases
    const databases = [];
    const dbFiles = new Map();

    // First, detect actual database files
    for (const file of fileList) {
      if (file.endsWith('.db') || file.endsWith('.sqlite') || file.endsWith('.sqlite3')) {
        if (!dbFiles.has('sqlite')) {
          dbFiles.set('sqlite', []);
        }
        dbFiles.get('sqlite').push(file);
      }
    }

    // Then detect configuration patterns
    for (const file of fileList) {
      // Check for database config patterns
      if (file.includes('settings.py') && projectType === 'django') {
        if (!dbFiles.has('postgresql')) {
          dbFiles.set('postgresql', []);
        }
        dbFiles.get('postgresql').push(file);
      }

      if (file.includes('config/database.php') && projectType === 'laravel') {
        if (!dbFiles.has('mysql')) {
          dbFiles.set('mysql', []);
        }
        dbFiles.get('mysql').push(file);
      }

      if (file.includes('config.js') && projectType === 'nodejs') {
        if (!dbFiles.has('sqlite')) {
          dbFiles.set('sqlite', []);
        }
        dbFiles.get('sqlite').push(file);
      }
    }

    // Create database connections
    for (const [dbType, dbFileList] of dbFiles) {
      let config = null;

      if (dbType === 'sqlite') {
        const sqliteFile = dbFileList.find(f => f.endsWith('.db') || f.endsWith('.sqlite') || f.endsWith('.sqlite3'));
        if (sqliteFile) {
          config = { filePath: sqliteFile };
        } else {
          // Default SQLite config
          config = { filePath: './database.sqlite' };
        }
      } else if (dbType === 'postgresql') {
        config = {
          host: 'localhost',
          port: 5432,
          database: 'analytics_db',
          username: 'analytics_user',
          password: 'analytics_password'
        };
      } else if (dbType === 'mysql') {
        config = {
          host: 'localhost',
          port: 3306,
          database: 'laravel_blog',
          username: 'blog_user',
          password: 'blog_password'
        };
      }

      if (config) {
        databases.push({
          id: `db_${dbType}_${Date.now()}`,
          type: dbType,
          name: `${dbType.charAt(0).toUpperCase() + dbType.slice(1)} Database`,
          config,
          status: 'disconnected',
          syncEnabled: true,
          syncDirection: 'bidirectional'
        });
      }
    }

    return {
      projectType,
      confidence: databases.length > 0 ? 95 : 85,
      indicators: fileList.filter(f => f.includes('.json') || f.includes('.py') || f.includes('.php')),
      databases,
      configFiles: fileList.filter(f => f.includes('config') || f.includes('settings')).map(f => ({
        path: f,
        type: f.includes('package.json') ? 'package.json' : f.includes('settings.py') ? 'settings.py' : 'config/database.php',
        lastModified: new Date()
      })),
      metadata: {}
    };
  }
}

async function testProjectDetection() {
  const projects = [
    { name: 'Node.js API', path: 'nodejs-api' },
    { name: 'Django App', path: 'django-app' },
    { name: 'Laravel Blog', path: 'laravel-blog' }
  ];

  for (const project of projects) {
    console.log(`\n📁 Testing ${project.name} (${project.path})`);

    // Get all files
    const projectPath = path.join(__dirname, project.path);
    const files = getAllFiles(projectPath);
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
      result.databases.forEach(db => {
        console.log(`    💾 ${db.name} (${db.type})`);
        console.log(`       Config: ${JSON.stringify(db.config, null, 2)}`);
      });
    } else {
      console.log(`    ❌ No databases detected`);
    }
  }
}

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

testProjectDetection().catch(console.error);
