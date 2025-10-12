const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, 'queryflow_app.db');
const db = new Database(dbPath, { readonly: true });

const project = db.prepare(`
  SELECT * FROM projects 
  ORDER BY updated_at DESC 
  LIMIT 1
`).get();

if (!project) {
  console.log('❌ No projects found');
  db.close();
  process.exit(1);
}

console.log('📋 Latest Project RAW DATA:\n');
console.log('ID:', project.id);
console.log('Name:', project.name);
console.log('Total Tables:', project.total_tables);
console.log('Total Rows:', project.total_rows);
console.log('Total Columns:', project.total_columns);

console.log('\n📦 actual_database_tables field:');
if (project.actual_database_tables) {
  try {
    const data = JSON.parse(project.actual_database_tables);
    console.log(`   Type: ${Array.isArray(data) ? 'Array' : typeof data}`);
    console.log(`   Length: ${Array.isArray(data) ? data.length : 'N/A'}`);
    if (Array.isArray(data) && data.length > 0) {
      console.log('   Tables:');
      data.forEach(t => console.log(`      - ${t.name}: ${t.rowCount} rows`));
    }
  } catch (e) {
    console.log('   ERROR:', e.message);
  }
} else {
  console.log('   NULL or empty');
}

console.log('\n🔧 extracted_models field:');
if (project.extracted_models) {
  try {
    const data = JSON.parse(project.extracted_models);
    console.log(`   Type: ${Array.isArray(data) ? 'Array' : typeof data}`);
    console.log(`   Length: ${Array.isArray(data) ? data.length : 'N/A'}`);
  } catch (e) {
    console.log('   ERROR:', e.message);
  }
} else {
  console.log('   NULL or empty');
}

console.log('\n📈 statistics_data field:');
if (project.statistics_data) {
  try {
    const data = JSON.parse(project.statistics_data);
    console.log(`   totalTables: ${data.totalTables}`);
    console.log(`   totalRows: ${data.totalRows}`);
  } catch (e) {
    console.log('   ERROR:', e.message);
  }
} else {
  console.log('   NULL or empty');
}

console.log('\n🔍 database_introspection field:');
if (project.database_introspection) {
  try {
    const data = JSON.parse(project.database_introspection);
    console.log(`   tables: ${data.tables?.length || 0}`);
    console.log(`   indexes: ${data.indexes?.length || 0}`);
    if (data.statistics) {
      console.log(`   statistics.totalRows: ${data.statistics.totalRows || 0}`);
    }
  } catch (e) {
    console.log('   ERROR:', e.message);
  }
} else {
  console.log('   NULL or empty');
}

db.close();

