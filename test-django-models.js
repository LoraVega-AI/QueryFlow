// Test script for Django model detection and parsing
const path = require('path');
const fs = require('fs');

// Mock implementation of the Django model detection and parsing
function detectDjangoModels(projectPath) {
  console.log(`🔍 Detecting Django models in: ${projectPath}`);
  
  const models = [];
  
  // Common Django app directories
  const possibleAppDirs = [
    '', // Project root
    'app',
    'apps',
    'src',
    'core',
    'api',
    'users',
    'accounts',
    'blog',
    'posts',
    'products',
    'analytics'
  ];
  
  // Keep track of processed files to avoid duplicates
  const processedFiles = new Set();
  
  // Check each possible app directory for models.py
  for (const appDir of possibleAppDirs) {
    const appPath = path.join(projectPath, appDir);
    
    // Skip if the app directory doesn't exist
    if (!fs.existsSync(appPath)) {
      continue;
    }
    
    // Check if it's a directory
    try {
      const appStats = fs.statSync(appPath);
      if (!appStats.isDirectory()) {
        continue;
      }
    } catch (error) {
      continue;
    }
    
    console.log(`📁 Checking app directory: ${appPath}`);
    
    // Look for models.py
    const modelsPath = path.join(appPath, 'models.py');
    if (fs.existsSync(modelsPath) && !processedFiles.has(modelsPath)) {
      processedFiles.add(modelsPath);
      console.log(`✅ Found models.py: ${modelsPath}`);
      
      // Read models.py
      const modelsContent = fs.readFileSync(modelsPath, 'utf-8');
      
      // Parse models
      const parsedModels = parseDjangoModels(modelsContent, modelsPath);
      models.push(...parsedModels);
    }
    
    // Check subdirectories
    try {
      const subDirs = fs.readdirSync(appPath);
      
      for (const subDir of subDirs) {
        const subDirPath = path.join(appPath, subDir);
        
        // Skip if not a directory
        try {
          const subDirStats = fs.statSync(subDirPath);
          if (!subDirStats.isDirectory()) {
            continue;
          }
        } catch (error) {
          continue;
        }
        
        // Skip migrations directory
        if (subDir === 'migrations') {
          continue;
        }
        
        console.log(`📁 Checking subdirectory: ${subDirPath}`);
        
        // Look for models.py
        const subModelsPath = path.join(subDirPath, 'models.py');
        if (fs.existsSync(subModelsPath) && !processedFiles.has(subModelsPath)) {
          processedFiles.add(subModelsPath);
          console.log(`✅ Found models.py: ${subModelsPath}`);
          
          // Read models.py
          const modelsContent = fs.readFileSync(subModelsPath, 'utf-8');
          
          // Parse models
          const parsedModels = parseDjangoModels(modelsContent, subModelsPath);
          models.push(...parsedModels);
        }
      }
    } catch (error) {
      // Skip if we can't read the directory
    }
  }
  
  return models;
}

// Parse Django models from content
function parseDjangoModels(content, filePath) {
  console.log(`🔍 Parsing Django models from: ${filePath}`);
  
  const models = [];
  
  // Find model classes
  const modelClassRegex = /class\s+(\w+)\s*\(\s*models\.Model\s*\)\s*:/g;
  let match;
  
  while ((match = modelClassRegex.exec(content)) !== null) {
    const modelName = match[1];
    console.log(`📋 Found model class: ${modelName}`);
    
    // Extract model body
    const modelStart = match.index;
    const modelEnd = findModelEnd(content, modelStart);
    const modelBody = content.substring(modelStart, modelEnd);
    
    // Parse model
    const model = parseDjangoModel(modelName, modelBody, filePath);
    models.push(model);
  }
  
  return models;
}

// Find the end of a model class definition
function findModelEnd(content, start) {
  // Find the next class definition or the end of the file
  const nextClassMatch = content.substring(start + 1).match(/\nclass\s+\w+/);
  
  if (nextClassMatch) {
    return start + 1 + nextClassMatch.index;
  }
  
  return content.length;
}

// Parse a Django model
function parseDjangoModel(modelName, modelBody, filePath) {
  console.log(`🔍 Parsing Django model: ${modelName}`);
  
  // Extract fields
  const fields = extractDjangoFields(modelBody);
  
  // Extract relationships
  const relationships = extractDjangoRelationships(modelBody);
  
  // Extract meta
  const meta = extractDjangoMeta(modelBody);
  
  // Extract methods
  const methods = extractDjangoMethods(modelBody);
  
  // Extract validations
  const validations = extractDjangoValidations(modelBody, meta);
  
  // Determine table name
  const tableName = meta.tableName || `${path.basename(path.dirname(filePath))}_${modelName.toLowerCase()}`;
  
  return {
    name: modelName,
    tableName,
    fields,
    relationships,
    methods,
    validations,
    meta,
    filePath
  };
}

// Extract Django fields
function extractDjangoFields(modelBody) {
  console.log('🔍 Extracting Django fields');
  
  const fields = [];
  
  // Find field definitions
  const fieldRegex = /(\w+)\s*=\s*models\.(\w+)\(([^)]*)\)/g;
  let match;
  
  while ((match = fieldRegex.exec(modelBody)) !== null) {
    const fieldName = match[1];
    const fieldType = match[2];
    const fieldArgs = match[3];
    
    // Skip relationship fields
    if (['ForeignKey', 'OneToOneField', 'ManyToManyField'].includes(fieldType)) {
      continue;
    }
    
    console.log(`📋 Found field: ${fieldName} (${fieldType})`);
    
    // Parse field arguments
    const args = parseFieldArgs(fieldArgs);
    
    fields.push({
      name: fieldName,
      type: fieldType,
      args,
      // Common field attributes
      primaryKey: args.primary_key === 'True',
      unique: args.unique === 'True',
      nullable: args.null === 'True' || args.blank === 'True',
      defaultValue: args.default,
      maxLength: args.max_length,
      choices: args.choices
    });
  }
  
  return fields;
}

// Parse field arguments
function parseFieldArgs(argsString) {
  const args = {};
  
  // Handle empty args
  if (!argsString.trim()) {
    return args;
  }
  
  // Split by commas, but respect nested structures
  let inQuote = false;
  let quoteChar = '';
  let inParens = 0;
  let inBrackets = 0;
  let currentArg = '';
  
  for (let i = 0; i < argsString.length; i++) {
    const char = argsString[i];
    
    // Handle quotes
    if ((char === "'" || char === '"') && (i === 0 || argsString[i - 1] !== '\\')) {
      if (!inQuote) {
        inQuote = true;
        quoteChar = char;
      } else if (char === quoteChar) {
        inQuote = false;
      }
    }
    
    // Handle nested structures
    if (!inQuote) {
      if (char === '(') inParens++;
      if (char === ')') inParens--;
      if (char === '[') inBrackets++;
      if (char === ']') inBrackets--;
    }
    
    // Split on commas outside of quotes and nested structures
    if (char === ',' && !inQuote && inParens === 0 && inBrackets === 0) {
      processArg(currentArg.trim(), args);
      currentArg = '';
    } else {
      currentArg += char;
    }
  }
  
  // Process the last argument
  if (currentArg.trim()) {
    processArg(currentArg.trim(), args);
  }
  
  return args;
}

// Process a single argument
function processArg(arg, args) {
  // Handle keyword arguments
  const keywordMatch = arg.match(/^(\w+)\s*=\s*(.+)$/);
  if (keywordMatch) {
    const key = keywordMatch[1];
    const value = keywordMatch[2];
    args[key] = value;
  }
}

// Extract Django relationships
function extractDjangoRelationships(modelBody) {
  console.log('🔍 Extracting Django relationships');
  
  const relationships = [];
  
  // Find relationship fields
  const relationshipRegex = /(\w+)\s*=\s*models\.(ForeignKey|OneToOneField|ManyToManyField)\(([^)]+)\)/g;
  let match;
  
  while ((match = relationshipRegex.exec(modelBody)) !== null) {
    const fieldName = match[1];
    const relationType = match[2];
    const relationArgs = match[3];
    
    console.log(`📋 Found relationship: ${fieldName} (${relationType})`);
    
    // Extract target model
    const targetMatch = relationArgs.match(/^['"](.*?)['"]/);
    const target = targetMatch ? targetMatch[1] : relationArgs.split(',')[0].trim();
    
    // Parse relationship arguments
    const args = parseFieldArgs(relationArgs);
    
    // Map Django relationship type to standard relationship type
    let type;
    switch (relationType) {
      case 'ForeignKey':
        type = 'belongsTo';
        break;
      case 'OneToOneField':
        type = 'hasOne';
        break;
      case 'ManyToManyField':
        type = 'belongsToMany';
        break;
      default:
        type = 'unknown';
    }
    
    relationships.push({
      name: fieldName,
      type,
      target,
      args,
      // Common relationship attributes
      onDelete: args.on_delete?.replace('models.', '') || 'CASCADE',
      related_name: args.related_name?.replace(/['"]/g, '')
    });
  }
  
  return relationships;
}

// Extract Django meta
function extractDjangoMeta(modelBody) {
  console.log('🔍 Extracting Django meta');
  
  const meta = {};
  
  // Find meta class
  const metaMatch = modelBody.match(/class\s+Meta\s*:\s*([^}]+?)(?=\n\s*(?:class|def|@|$))/s);
  
  if (metaMatch) {
    const metaBody = metaMatch[1];
    
    // Extract table name
    const tableNameMatch = metaBody.match(/db_table\s*=\s*['"]([^'"]+)['"]/);
    if (tableNameMatch) {
      meta.tableName = tableNameMatch[1];
      console.log(`📋 Found table name: ${meta.tableName}`);
    }
    
    // Extract ordering
    const orderingMatch = metaBody.match(/ordering\s*=\s*\[([^\]]+)\]/);
    if (orderingMatch) {
      meta.ordering = orderingMatch[1].split(',').map(o => o.trim().replace(/['"]/g, ''));
      console.log(`📋 Found ordering: ${meta.ordering.join(', ')}`);
    }
    
    // Extract unique together
    const uniqueTogetherMatch = metaBody.match(/unique_together\s*=\s*\(([^)]+)\)/);
    if (uniqueTogetherMatch) {
      meta.uniqueTogether = uniqueTogetherMatch[1].split(',').map(f => f.trim().replace(/['"]/g, ''));
      console.log(`📋 Found unique together: ${meta.uniqueTogether.join(', ')}`);
    }
    
    // Extract verbose name
    const verboseNameMatch = metaBody.match(/verbose_name\s*=\s*['"]([^'"]+)['"]/);
    if (verboseNameMatch) {
      meta.verboseName = verboseNameMatch[1];
      console.log(`📋 Found verbose name: ${meta.verboseName}`);
    }
    
    // Extract verbose name plural
    const verboseNamePluralMatch = metaBody.match(/verbose_name_plural\s*=\s*['"]([^'"]+)['"]/);
    if (verboseNamePluralMatch) {
      meta.verboseNamePlural = verboseNamePluralMatch[1];
      console.log(`📋 Found verbose name plural: ${meta.verboseNamePlural}`);
    }
  }
  
  return meta;
}

// Extract Django methods
function extractDjangoMethods(modelBody) {
  console.log('🔍 Extracting Django methods');
  
  const methods = [];
  
  // Find method definitions
  const methodRegex = /def\s+(\w+)\s*\(([^)]*)\):\s*([^@]+?)(?=\n\s*(?:class|def|@|$))/gs;
  let match;
  
  while ((match = methodRegex.exec(modelBody)) !== null) {
    const methodName = match[1];
    const methodArgs = match[2];
    const methodBody = match[3];
    
    // Skip special methods
    if (methodName.startsWith('__') && methodName.endsWith('__')) {
      continue;
    }
    
    console.log(`📋 Found method: ${methodName}`);
    
    methods.push({
      name: methodName,
      args: methodArgs,
      body: methodBody.trim()
    });
  }
  
  return methods;
}

// Extract Django validations
function extractDjangoValidations(modelBody, meta) {
  console.log('🔍 Extracting Django validations');
  
  const validations = [];
  
  // Add unique together validation
  if (meta.uniqueTogether) {
    validations.push({
      type: 'uniqueTogether',
      fields: meta.uniqueTogether,
      message: `Fields ${meta.uniqueTogether.join(', ')} must be unique together`
    });
    
    console.log(`📋 Found unique together validation: ${meta.uniqueTogether.join(', ')}`);
  }
  
  // Find field validations
  const fieldRegex = /(\w+)\s*=\s*models\.(\w+)\(([^)]*)\)/g;
  let match;
  
  while ((match = fieldRegex.exec(modelBody)) !== null) {
    const fieldName = match[1];
    const fieldType = match[2];
    const fieldArgs = match[3];
    
    // Parse field arguments
    const args = parseFieldArgs(fieldArgs);
    
    // Check for unique constraint
    if (args.unique === 'True') {
      validations.push({
        type: 'unique',
        field: fieldName,
        message: `${fieldName} must be unique`
      });
      
      console.log(`📋 Found unique validation for field: ${fieldName}`);
    }
    
    // Check for required constraint
    if (args.null !== 'True' && args.blank !== 'True' && !['AutoField', 'BigAutoField'].includes(fieldType)) {
      validations.push({
        type: 'required',
        field: fieldName,
        message: `${fieldName} is required`
      });
      
      console.log(`📋 Found required validation for field: ${fieldName}`);
    }
    
    // Check for max length constraint
    if (args.max_length) {
      validations.push({
        type: 'maxLength',
        field: fieldName,
        value: args.max_length,
        message: `${fieldName} cannot be longer than ${args.max_length} characters`
      });
      
      console.log(`📋 Found max length validation for field: ${fieldName}: ${args.max_length}`);
    }
    
    // Check for choices constraint
    if (args.choices) {
      validations.push({
        type: 'choices',
        field: fieldName,
        value: args.choices,
        message: `${fieldName} must be one of the allowed choices`
      });
      
      console.log(`📋 Found choices validation for field: ${fieldName}`);
    }
  }
  
  // Find custom clean methods
  const cleanMethodRegex = /def\s+clean_(\w+)\s*\(([^)]*)\):\s*([^@]+?)(?=\n\s*(?:class|def|@|$))/gs;
  
  while ((match = cleanMethodRegex.exec(modelBody)) !== null) {
    const fieldName = match[1];
    const methodBody = match[3];
    
    validations.push({
      type: 'custom',
      field: fieldName,
      message: `Custom validation for ${fieldName}`,
      code: methodBody.trim()
    });
    
    console.log(`📋 Found custom validation for field: ${fieldName}`);
  }
  
  // Find clean method (model-level validation)
  const cleanMatch = modelBody.match(/def\s+clean\s*\(([^)]*)\):\s*([^@]+?)(?=\n\s*(?:class|def|@|$))/s);
  
  if (cleanMatch) {
    validations.push({
      type: 'modelClean',
      message: 'Model-level validation',
      code: cleanMatch[2].trim()
    });
    
    console.log('📋 Found model-level validation');
  }
  
  return validations;
}

// Test function for Django model detection and parsing
async function testDjangoModelDetection() {
  console.log('🧪 Starting Django model detection test...');
  
  // Test project path
  const testProjectPath = path.join(__dirname, 'test-projects', 'django-app');
  
  // Check if the project exists
  if (!fs.existsSync(testProjectPath)) {
    console.log('❌ Test project not found');
    return;
  }
  
  console.log('✅ Test project found');
  
  // Detect Django models
  const models = detectDjangoModels(testProjectPath);
  
  // Print results
  console.log(`\n📊 Found ${models.length} Django models`);
  
  // Print model details
  models.forEach((model, index) => {
    console.log(`\n📋 Model ${index + 1}: ${model.name}`);
    console.log(`📊 Table name: ${model.tableName}`);
    console.log(`📊 Fields: ${model.fields.length}`);
    console.log(`📊 Relationships: ${model.relationships.length}`);
    console.log(`📊 Methods: ${model.methods.length}`);
    console.log(`📊 Validations: ${model.validations.length}`);
    
    // Print fields
    if (model.fields.length > 0) {
      console.log('\n📋 Fields:');
      model.fields.forEach(field => {
        console.log(`  - ${field.name}: ${field.type}${field.primaryKey ? ' (PK)' : ''}${field.unique ? ' (unique)' : ''}${field.nullable ? ' (nullable)' : ''}`);
      });
    }
    
    // Print relationships
    if (model.relationships.length > 0) {
      console.log('\n📋 Relationships:');
      model.relationships.forEach(rel => {
        console.log(`  - ${rel.name}: ${rel.type} -> ${rel.target}${rel.related_name ? ` (related_name: ${rel.related_name})` : ''}`);
      });
    }
    
    // Print validations
    if (model.validations.length > 0) {
      console.log('\n📋 Validations:');
      model.validations.forEach(val => {
        console.log(`  - ${val.type}${val.field ? ` for ${val.field}` : ''}: ${val.message}`);
      });
    }
    
    // Print meta
    if (Object.keys(model.meta).length > 0) {
      console.log('\n📋 Meta:');
      Object.entries(model.meta).forEach(([key, value]) => {
        console.log(`  - ${key}: ${Array.isArray(value) ? value.join(', ') : value}`);
      });
    }
  });
  
  console.log('\n✅ Django model detection test completed');
}

testDjangoModelDetection().catch(console.error);
