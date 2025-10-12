const fs = require('fs/promises');
const path = require('path');

async function findDbFiles(dir, files = []) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    
    if (entry.isDirectory() && entry.name !== 'node_modules' && entry.name !== '.git') {
      await findDbFiles(fullPath, files);
    } else if (entry.isFile()) {
      const ext = path.extname(entry.name).toLowerCase();
      const fileName = entry.name.toLowerCase();
      
      // Check if it's a database file (not converted)
      if ((ext === '.db' || ext === '.sqlite' || ext === '.sqlite3') && 
          !fileName.includes('_converted_') && 
          !fileName.includes('converted.sqlite')) {
        
        const stats = await fs.stat(fullPath);
        // Only include non-empty files
        if (stats.size > 1024) { // At least 1KB
          files.push({
            name: entry.name,
            filePath: fullPath,
            size: stats.size
          });
          console.log(`✅ Found: ${entry.name} (${(stats.size / 1024).toFixed(2)} KB)`);
        }
      }
    }
  }
  
  return files;
}

async function test() {
  // Find latest upload
  const uploadsDir = path.join(__dirname, 'uploads');
  const dirs = (await fs.readdir(uploadsDir, { withFileTypes: true }))
    .filter(f => f.isDirectory() && f.name.startsWith('project_'))
    .map(f => ({
      name: f.name,
      path: path.join(uploadsDir, f.name)
    }));
  
  if (dirs.length === 0) {
    console.log('No uploads found');
    return;
  }
  
  // Sort by name (timestamp)
  dirs.sort((a, b) => b.name.localeCompare(a.name));
  const latest = dirs[0].path;
  
  console.log('📁 Scanning:', latest);
  console.log('');
  
  const dbFiles = await findDbFiles(latest);
  
  console.log('');
  console.log(`📊 Total found: ${dbFiles.length}`);
  console.log('');
  console.log('Files:');
  dbFiles.forEach(f => {
    console.log(`   - ${f.name}: ${f.filePath}`);
  });
}

test().catch(console.error);

