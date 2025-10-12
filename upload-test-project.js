#!/usr/bin/env node

/**
 * Upload Test Project Script
 * Uploads one of the test projects through the QueryFlow API
 */

const fs = require('fs').promises;
const path = require('path');
const FormData = require('form-data');
const fetch = require('node-fetch');

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
    const sourceFiles = files.filter(file => !file.endsWith('.db') && !file.endsWith('.db-journal'));
    
    if (dbFiles.length === 0) {
      console.log('❌ No database files found in project directory');
      return;
    }
    
    console.log(`📊 Found ${dbFiles.length} database files and ${sourceFiles.length} source files`);
    
    // Create form data
    const formData = new FormData();
    
    // Add database files
    for (const dbFile of dbFiles) {
      const filePath = path.join(projectPath, dbFile);
      const fileBuffer = await fs.readFile(filePath);
      formData.append('files', fileBuffer, {
        filename: dbFile,
        contentType: 'application/octet-stream'
      });
    }
    
    // Add source files
    for (const sourceFile of sourceFiles) {
      const filePath = path.join(projectPath, sourceFile);
      const fileBuffer = await fs.readFile(filePath);
      formData.append('files', fileBuffer, {
        filename: sourceFile,
        contentType: 'text/plain'
      });
    }
    
    // Add project metadata
    formData.append('projectName', `Test Project - ${projectDir}`);
    formData.append('projectDescription', 'Test project created for testing table count accuracy');
    
    console.log('📤 Uploading to QueryFlow API...');
    
    // Upload to the API
    const response = await fetch('http://localhost:3000/api/projects/upload', {
      method: 'POST',
      body: formData
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.log('❌ Upload failed:', response.status, errorText);
      return;
    }
    
    const result = await response.json();
    
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
    
  } catch (error) {
    console.error('❌ Error uploading project:', error.message);
  }
}

// Check if required dependencies are available
async function checkDependencies() {
  try {
    require('form-data');
    require('node-fetch');
    return true;
  } catch (error) {
    console.log('📦 Installing required dependencies...');
    const { execSync } = require('child_process');
    try {
      execSync('npm install form-data node-fetch', { stdio: 'inherit' });
      return true;
    } catch (installError) {
      console.error('❌ Failed to install dependencies:', installError.message);
      return false;
    }
  }
}

async function main() {
  const depsOk = await checkDependencies();
  if (depsOk) {
    await uploadTestProject();
  }
}

main().catch(console.error);
