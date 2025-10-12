#!/usr/bin/env node

/**
 * Simple Upload Test Project Script
 * Uploads one of the test projects through the QueryFlow API using built-in modules
 */

const fs = require('fs').promises;
const path = require('path');
const https = require('https');
const http = require('http');

async function uploadTestProject() {
  try {
    console.log('🚀 Uploading test project through QueryFlow API...\n');
    
    // Find the most recent test project directory
    const uploadsDir = path.join(__dirname, 'uploads');
    const entries = await fs.readdir(uploadsDir, { withFileTypes: true });
    const projectDirs = entries
      .filter(entry => entry.isDirectory() && entry.name.startsWith('project_'))
      .map(entry => entry.name)
      .sort()
      .reverse();
    
    if (projectDirs.length === 0) {
      console.log('❌ No test projects found in uploads directory');
      return;
    }
    
    const projectDir = projectDirs[0];
    const projectPath = path.join(uploadsDir, projectDir);
    console.log(`📁 Using project directory: ${projectDir}`);
    
    // Find database files in the project directory
    const files = await fs.readdir(projectPath);
    const dbFiles = files.filter(file => file.endsWith('.db'));
    
    if (dbFiles.length === 0) {
      console.log('❌ No database files found in project directory');
      return;
    }
    
    console.log(`📊 Found ${dbFiles.length} database files`);
    
    // Create multipart form data manually
    const boundary = '----formdata-' + Math.random().toString(36);
    const formData = [];
    
    // Add database files
    for (const dbFile of dbFiles) {
      const filePath = path.join(projectPath, dbFile);
      const fileBuffer = await fs.readFile(filePath);
      
      formData.push(`--${boundary}`);
      formData.push(`Content-Disposition: form-data; name="files"; filename="${dbFile}"`);
      formData.push('Content-Type: application/octet-stream');
      formData.push('');
      formData.push(fileBuffer);
    }
    
    // Add project metadata
    formData.push(`--${boundary}`);
    formData.push('Content-Disposition: form-data; name="projectName"');
    formData.push('');
    formData.push(`Test Project - ${projectDir}`);
    
    formData.push(`--${boundary}`);
    formData.push('Content-Disposition: form-data; name="projectDescription"');
    formData.push('');
    formData.push('Test project created for testing table count accuracy');
    
    formData.push(`--${boundary}--`);
    formData.push('');
    
    const body = Buffer.concat(formData.map(part => 
      typeof part === 'string' ? Buffer.from(part + '\r\n', 'utf8') : Buffer.concat([part, Buffer.from('\r\n', 'utf8')])
    ));
    
    console.log('📤 Uploading to QueryFlow API...');
    
    // Make HTTP request
    const options = {
      hostname: 'localhost',
      port: 3000,
      path: '/api/projects/upload',
      method: 'POST',
      headers: {
        'Content-Type': `multipart/form-data; boundary=${boundary}`,
        'Content-Length': body.length
      }
    };
    
    const req = http.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const result = JSON.parse(data);
          
          if (result.success) {
            console.log('✅ Project uploaded successfully!');
            console.log(`   Project ID: ${result.data.id}`);
            console.log(`   Project Name: ${result.data.name}`);
            console.log(`   Total Tables: ${result.data.totalTables}`);
            console.log(`   Total Rows: ${result.data.totalRows}`);
            console.log('\n🎉 Check the Projects tab in QueryFlow to see your project!');
          } else {
            console.log('❌ Upload failed:', result.message);
          }
        } catch (parseError) {
          console.log('❌ Failed to parse response:', data);
        }
      });
    });
    
    req.on('error', (error) => {
      console.error('❌ Request error:', error.message);
    });
    
    req.write(body);
    req.end();
    
  } catch (error) {
    console.error('❌ Error uploading project:', error.message);
  }
}

uploadTestProject().catch(console.error);
