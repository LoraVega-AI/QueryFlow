const FormData = require('form-data');
const fs = require('fs');
const fetch = require('node-fetch').default;

async function testLawDatabaseUpload() {
  try {
    const form = new FormData();
    form.append('files', fs.createReadStream('law-firm-project.zip'));
    form.append('projectName', 'Law Firm Database Project');
    form.append('projectDescription', 'Testing real SQLite database with 8 tables and actual data');

    console.log('🚀 Testing law firm database upload...');
    console.log('📁 File exists:', fs.existsSync('law-firm-project.zip'));
    console.log('📁 File size:', fs.statSync('law-firm-project.zip').size, 'bytes');

    const response = await fetch('http://localhost:3000/api/projects/upload', {
      method: 'POST',
      body: form
    });

    const result = await response.json();
    console.log('📊 Response status:', response.status);

    if (result.success) {
      console.log('✅ Law firm database upload successful!');
      console.log('📊 Total tables extracted:', result.data.totalTables);
      console.log('📊 Total rows:', result.data.totalRows || 0);
      console.log('📊 Has foreign keys:', result.data.hasForeignKeys || false);
      console.log('📊 Has indexes:', result.data.hasIndexes || false);
      
      console.log('\n📋 Tables found:');
      if (result.data.schema?.tables) {
        result.data.schema.tables.forEach((table, index) => {
          console.log(`  ${index + 1}. ${table.name} (${table.columns?.length || 0} columns${table.rowCount !== undefined ? `, ${table.rowCount} rows` : ''})`);
        });
      }
      
      console.log('\n📊 Detailed schema info:');
      if (result.data.schema?.tables) {
        result.data.schema.tables.forEach(table => {
          if (table.columns && table.columns.length > 0) {
            console.log(`\n📋 ${table.name}:`);
            table.columns.forEach(col => {
              const constraints = [];
              if (col.primaryKey) constraints.push('PK');
              if (col.unique) constraints.push('UNIQUE');
              if (col.autoIncrement) constraints.push('AUTO');
              if (!col.nullable) constraints.push('NOT NULL');
              if (col.foreignKey) constraints.push(`FK -> ${col.foreignKey.table}.${col.foreignKey.column}`);
              
              console.log(`    ${col.name}: ${col.type}${constraints.length > 0 ? ' (' + constraints.join(', ') + ')' : ''}`);
            });
            
            if (table.rowCount !== undefined) {
              console.log(`    → ${table.rowCount} rows`);
            }
          }
        });
      }
      
    } else {
      console.log('❌ Law firm database upload failed:', result.message);
      console.log('📊 Full response:', JSON.stringify(result, null, 2));
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

testLawDatabaseUpload();
