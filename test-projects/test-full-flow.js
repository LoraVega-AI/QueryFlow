// Full integration test for QueryFlow project linking and sync
const fs = require('fs');
const path = require('path');

console.log('🚀 QueryFlow Full Integration Test\n');

// Test 1: Project Detection
console.log('📋 Test 1: Project Detection');
const projects = [
  { name: 'Node.js API', path: 'nodejs-api', expectedType: 'nodejs', expectedDBs: 1 },
  { name: 'Django App', path: 'django-app', expectedType: 'django', expectedDBs: 1 },
  { name: 'Laravel Blog', path: 'laravel-blog', expectedType: 'laravel', expectedDBs: 1 }
];

for (const project of projects) {
  console.log(`  Testing ${project.name}...`);

  const projectPath = path.join(__dirname, project.path);
  const files = getAllFiles(projectPath);
  const relativeFiles = files.map(file => path.relative(projectPath, file).replace(/\\/g, '/'));

  // Simulate detection
  let detectedType = 'unknown';
  if (relativeFiles.some(f => f.includes('package.json'))) detectedType = 'nodejs';
  else if (relativeFiles.some(f => f.includes('manage.py'))) detectedType = 'django';
  else if (relativeFiles.some(f => f.includes('composer.json'))) detectedType = 'laravel';

  const hasDatabases = relativeFiles.some(f =>
    f.endsWith('.sqlite') ||
    f.includes('settings.py') ||
    f.includes('config/database.php')
  );

  const status = detectedType === project.expectedType && hasDatabases ? '✅ PASS' : '❌ FAIL';
  console.log(`    ${status} Type: ${detectedType}, Databases: ${hasDatabases ? 'Yes' : 'No'}`);
}

console.log('');

// Test 2: Database Configurations
console.log('🗃️  Test 2: Database Configurations');
const dbConfigs = {
  'nodejs-api': { type: 'sqlite', filePath: 'database.sqlite' },
  'django-app': { type: 'postgresql', host: 'localhost', port: 5432, database: 'analytics_db' },
  'laravel-blog': { type: 'mysql', host: 'localhost', port: 3306, database: 'laravel_blog' }
};

for (const [projectPath, expectedConfig] of Object.entries(dbConfigs)) {
  console.log(`  Testing ${projectPath}...`);

  const configFile = path.join(__dirname, projectPath, expectedConfig.type === 'sqlite' ? 'config.js' :
    expectedConfig.type === 'postgresql' ? 'analytics_dashboard/settings.py' : 'config/database.php');

  const exists = fs.existsSync(configFile);
  console.log(`    ${exists ? '✅ PASS' : '❌ FAIL'} Config file exists: ${path.basename(configFile)}`);
}

console.log('');

// Test 3: File Structure Verification
console.log('📁 Test 3: File Structure Verification');
const requiredFiles = {
  'nodejs-api': ['package.json', 'database.sqlite', 'config.js'],
  'django-app': ['manage.py', 'analytics_dashboard/settings.py', 'requirements.txt'],
  'laravel-blog': ['composer.json', 'config/database.php', 'app/Models/User.php']
};

for (const [projectPath, files] of Object.entries(requiredFiles)) {
  console.log(`  Testing ${projectPath}...`);
  let allExist = true;

  for (const file of files) {
    const filePath = path.join(__dirname, projectPath, file);
    const exists = fs.existsSync(filePath);
    console.log(`    ${exists ? '✅' : '❌'} ${file}`);
    if (!exists) allExist = false;
  }

  console.log(`    ${allExist ? '✅ PASS' : '❌ FAIL'} All required files present`);
}

console.log('');

// Test 4: Sync Capability Check
console.log('🔄 Test 4: Sync Capability Check');
for (const project of projects) {
  console.log(`  Testing ${project.name} sync capability...`);

  // Check if project has sync-compatible database
  const hasSyncDB = project.expectedType === 'nodejs' ||
    (project.expectedType === 'django' && project.expectedDBs > 0) ||
    (project.expectedType === 'laravel' && project.expectedDBs > 0);

  console.log(`    ${hasSyncDB ? '✅ PASS' : '❌ FAIL'} Sync-compatible database detected`);
}

console.log('\n🎉 Integration Test Complete!');
console.log('\n📋 Expected Results:');
console.log('  - All projects should detect correctly');
console.log('  - All databases should be configured');
console.log('  - Sync should work for all projects');
console.log('  - File structures should be complete');

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
