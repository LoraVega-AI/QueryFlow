// Simple test for database detection
const fs = require('fs');
const path = require('path');

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

console.log('🧪 Testing Database Detection...\n');

// Test Node.js project
console.log('Testing Node.js project...');
const nodejsFiles = getAllFiles(path.join(__dirname, 'nodejs-api'));
const nodejsRelativeFiles = nodejsFiles.map(file =>
  path.relative(path.join(__dirname, 'nodejs-api'), file).replace(/\\/g, '/')
);

console.log('Node.js files found:');
nodejsRelativeFiles.forEach(file => {
  if (file.includes('.sqlite') || file.includes('config.') || file.includes('package.')) {
    console.log(`  ✅ ${file}`);
  }
});

// Check for SQLite files
const sqliteFiles = nodejsRelativeFiles.filter(f => f.endsWith('.db') || f.endsWith('.sqlite') || f.endsWith('.sqlite3'));
console.log(`\nSQLite files detected: ${sqliteFiles.length}`);
sqliteFiles.forEach(file => console.log(`  📄 ${file}`));

// Test Django project
console.log('\nTesting Django project...');
const djangoFiles = getAllFiles(path.join(__dirname, 'django-app'));
const djangoRelativeFiles = djangoFiles.map(file =>
  path.relative(path.join(__dirname, 'django-app'), file).replace(/\\/g, '/')
);

console.log('Django files found:');
djangoRelativeFiles.forEach(file => {
  if (file.includes('settings.') || file.includes('requirements.')) {
    console.log(`  ✅ ${file}`);
  }
});

// Test Laravel project
console.log('\nTesting Laravel project...');
const laravelFiles = getAllFiles(path.join(__dirname, 'laravel-blog'));
const laravelRelativeFiles = laravelFiles.map(file =>
  path.relative(path.join(__dirname, 'laravel-blog'), file).replace(/\\/g, '/')
);

console.log('Laravel files found:');
laravelRelativeFiles.forEach(file => {
  if (file.includes('config/database.') || file.includes('composer.')) {
    console.log(`  ✅ ${file}`);
  }
});

console.log('\n🎉 Database detection test completed!');
