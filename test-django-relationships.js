// Test script for Django relationship extraction
const path = require('path');
const fs = require('fs');

// Extract Django relationships from a model
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
    let target = targetMatch ? targetMatch[1] : relationArgs.split(',')[0].trim();
    
    // Handle 'self' references
    if (target === 'self') {
      target = 'Self';
    }
    
    // Parse relationship arguments
    const args = parseFieldArgs(relationArgs);
    
    // Extract on_delete behavior
    let onDelete = 'CASCADE'; // Default
    if (args.on_delete) {
      onDelete = args.on_delete.replace('models.', '').replace(/['"]/g, '');
    }
    
    // Extract related_name
    let relatedName = null;
    if (args.related_name) {
      relatedName = args.related_name.replace(/['"]/g, '');
    }
    
    // Extract related_query_name
    let relatedQueryName = null;
    if (args.related_query_name) {
      relatedQueryName = args.related_query_name.replace(/['"]/g, '');
    }
    
    // Extract through model (for ManyToManyField)
    let through = null;
    if (args.through) {
      through = args.through.replace(/['"]/g, '');
    }
    
    // Extract through_fields (for ManyToManyField)
    let throughFields = null;
    if (args.through_fields) {
      throughFields = args.through_fields.replace(/[()]/g, '').split(',').map(f => f.trim().replace(/['"]/g, ''));
    }
    
    // Extract limit_choices_to
    let limitChoicesTo = null;
    if (args.limit_choices_to) {
      limitChoicesTo = args.limit_choices_to;
    }
    
    // Extract db_constraint
    let dbConstraint = true; // Default
    if (args.db_constraint === 'False') {
      dbConstraint = false;
    }
    
    // Extract to_field
    let toField = null;
    if (args.to_field) {
      toField = args.to_field.replace(/['"]/g, '');
    }
    
    // Extract db_column
    let dbColumn = null;
    if (args.db_column) {
      dbColumn = args.db_column.replace(/['"]/g, '');
    }
    
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
    
    // Determine foreign key column name
    let foreignKey = null;
    if (type === 'belongsTo') {
      foreignKey = dbColumn || `${fieldName}_id`;
    }
    
    // Determine if the relationship is nullable
    const nullable = args.null === 'True' || args.blank === 'True';
    
    // Create relationship object
    const relationship = {
      name: fieldName,
      type,
      djangoType: relationType,
      target,
      foreignKey,
      nullable,
      onDelete,
      relatedName,
      relatedQueryName,
      through,
      throughFields,
      limitChoicesTo,
      dbConstraint,
      toField,
      dbColumn
    };
    
    relationships.push(relationship);
  }
  
  return relationships;
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
  } else {
    // Handle positional arguments (first one is usually the target model)
    if (!args.target) {
      args.target = arg;
    }
  }
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

// Test function for Django relationship extraction
async function testDjangoRelationshipExtraction() {
  console.log('🧪 Starting Django relationship extraction test...');
  
  // Test project path
  const testProjectPath = path.join(__dirname, 'test-projects', 'django-app');
  const modelsPath = path.join(testProjectPath, 'analytics', 'models.py');
  
  // Check if the models file exists
  if (!fs.existsSync(modelsPath)) {
    console.log('❌ Models file not found');
    return;
  }
  
  console.log('✅ Models file found');
  
  // Read models file
  const modelsContent = fs.readFileSync(modelsPath, 'utf-8');
  
  // Find model classes
  const modelClassRegex = /class\s+(\w+)\s*\(\s*models\.Model\s*\)\s*:/g;
  let match;
  
  while ((match = modelClassRegex.exec(modelsContent)) !== null) {
    const modelName = match[1];
    console.log(`\n📋 Found model class: ${modelName}`);
    
    // Extract model body
    const modelStart = match.index;
    const modelEnd = findModelEnd(modelsContent, modelStart);
    const modelBody = modelsContent.substring(modelStart, modelEnd);
    
    // Extract relationships
    const relationships = extractDjangoRelationships(modelBody);
    
    // Print relationships
    console.log(`\n📊 Found ${relationships.length} relationships for model ${modelName}`);
    
    relationships.forEach((rel, index) => {
      console.log(`\n📋 Relationship ${index + 1}: ${rel.name}`);
      console.log(`📊 Type: ${rel.type} (${rel.djangoType})`);
      console.log(`📊 Target: ${rel.target}`);
      
      if (rel.foreignKey) {
        console.log(`📊 Foreign key: ${rel.foreignKey}`);
      }
      
      console.log(`📊 Nullable: ${rel.nullable}`);
      console.log(`📊 On delete: ${rel.onDelete}`);
      
      if (rel.relatedName) {
        console.log(`📊 Related name: ${rel.relatedName}`);
      }
      
      if (rel.through) {
        console.log(`📊 Through: ${rel.through}`);
      }
      
      if (rel.throughFields) {
        console.log(`📊 Through fields: ${rel.throughFields.join(', ')}`);
      }
      
      if (rel.toField) {
        console.log(`📊 To field: ${rel.toField}`);
      }
      
      if (rel.dbColumn) {
        console.log(`📊 DB column: ${rel.dbColumn}`);
      }
    });
  }
  
  console.log('\n✅ Django relationship extraction test completed');
}

// Create a more complex Django model file with various relationship types
async function createComplexDjangoModelFile() {
  console.log('🔧 Creating complex Django model file with various relationship types...');
  
  const testDir = path.join(__dirname, 'test-models');
  const modelsPath = path.join(testDir, 'complex_models.py');
  
  // Create test directory if it doesn't exist
  if (!fs.existsSync(testDir)) {
    fs.mkdirSync(testDir, { recursive: true });
  }
  
  // Create complex models file
  const modelsContent = `from django.db import models
from django.contrib.auth.models import User

class Category(models.Model):
    name = models.CharField(max_length=100)
    parent = models.ForeignKey('self', on_delete=models.CASCADE, null=True, blank=True, related_name='children')
    
    class Meta:
        verbose_name_plural = 'Categories'
    
    def __str__(self):
        return self.name

class Product(models.Model):
    name = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    price = models.DecimalField(max_digits=10, decimal_places=2)
    category = models.ForeignKey(Category, on_delete=models.PROTECT, related_name='products')
    tags = models.ManyToManyField('Tag', related_name='products')
    created_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='created_products')
    updated_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='updated_products')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    def __str__(self):
        return self.name

class ProductImage(models.Model):
    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name='images')
    image = models.ImageField(upload_to='products/')
    is_primary = models.BooleanField(default=False)
    
    def __str__(self):
        return f"Image for {self.product.name}"

class Tag(models.Model):
    name = models.CharField(max_length=50, unique=True)
    
    def __str__(self):
        return self.name

class Customer(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE)
    phone = models.CharField(max_length=20, blank=True)
    address = models.TextField(blank=True)
    
    def __str__(self):
        return self.user.username

class Order(models.Model):
    ORDER_STATUS = [
        ('pending', 'Pending'),
        ('processing', 'Processing'),
        ('shipped', 'Shipped'),
        ('delivered', 'Delivered'),
        ('cancelled', 'Cancelled'),
    ]
    
    customer = models.ForeignKey(Customer, on_delete=models.CASCADE, related_name='orders')
    status = models.CharField(max_length=20, choices=ORDER_STATUS, default='pending')
    total = models.DecimalField(max_digits=10, decimal_places=2)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    def __str__(self):
        return f"Order #{self.id} - {self.customer.user.username}"

class OrderItem(models.Model):
    order = models.ForeignKey(Order, on_delete=models.CASCADE, related_name='items')
    product = models.ForeignKey(Product, on_delete=models.PROTECT)
    quantity = models.PositiveIntegerField(default=1)
    price = models.DecimalField(max_digits=10, decimal_places=2)
    
    def __str__(self):
        return f"{self.quantity} x {self.product.name}"

class ProductReview(models.Model):
    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name='reviews')
    customer = models.ForeignKey(Customer, on_delete=models.CASCADE, related_name='reviews')
    rating = models.PositiveSmallIntegerField()
    comment = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        unique_together = ('product', 'customer')
    
    def __str__(self):
        return f"Review for {self.product.name} by {self.customer.user.username}"

class Wishlist(models.Model):
    customer = models.OneToOneField(Customer, on_delete=models.CASCADE, related_name='wishlist')
    products = models.ManyToManyField(Product, related_name='wishlists')
    
    def __str__(self):
        return f"Wishlist for {self.customer.user.username}"

class ProductVariant(models.Model):
    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name='variants')
    name = models.CharField(max_length=100)
    sku = models.CharField(max_length=50, unique=True)
    price_adjustment = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    
    def __str__(self):
        return f"{self.product.name} - {self.name}"

class AttributeType(models.Model):
    name = models.CharField(max_length=50, unique=True)
    
    def __str__(self):
        return self.name

class AttributeValue(models.Model):
    attribute_type = models.ForeignKey(AttributeType, on_delete=models.CASCADE, related_name='values')
    value = models.CharField(max_length=50)
    
    class Meta:
        unique_together = ('attribute_type', 'value')
    
    def __str__(self):
        return f"{self.attribute_type.name}: {self.value}"

class ProductVariantAttribute(models.Model):
    variant = models.ForeignKey(ProductVariant, on_delete=models.CASCADE, related_name='attributes')
    attribute_value = models.ForeignKey(AttributeValue, on_delete=models.CASCADE, related_name='variants')
    
    class Meta:
        unique_together = ('variant', 'attribute_value')
    
    def __str__(self):
        return f"{self.variant.name} - {self.attribute_value}"
`;
  
  fs.writeFileSync(modelsPath, modelsContent);
  console.log(`✅ Created complex Django model file at: ${modelsPath}`);
  
  return modelsPath;
}

// Test function for complex Django relationship extraction
async function testComplexDjangoRelationshipExtraction() {
  console.log('🧪 Starting complex Django relationship extraction test...');
  
  // Create complex Django model file
  const modelsPath = await createComplexDjangoModelFile();
  
  // Read models file
  const modelsContent = fs.readFileSync(modelsPath, 'utf-8');
  
  // Find model classes
  const modelClassRegex = /class\s+(\w+)\s*\(\s*models\.Model\s*\)\s*:/g;
  let match;
  
  // Track all relationships
  const allRelationships = [];
  
  while ((match = modelClassRegex.exec(modelsContent)) !== null) {
    const modelName = match[1];
    console.log(`\n📋 Found model class: ${modelName}`);
    
    // Extract model body
    const modelStart = match.index;
    const modelEnd = findModelEnd(modelsContent, modelStart);
    const modelBody = modelsContent.substring(modelStart, modelEnd);
    
    // Extract relationships
    const relationships = extractDjangoRelationships(modelBody);
    
    // Add model name to relationships
    relationships.forEach(rel => {
      rel.sourceModel = modelName;
      allRelationships.push(rel);
    });
    
    // Print relationships
    console.log(`\n📊 Found ${relationships.length} relationships for model ${modelName}`);
    
    relationships.forEach((rel, index) => {
      console.log(`\n📋 Relationship ${index + 1}: ${rel.name}`);
      console.log(`📊 Type: ${rel.type} (${rel.djangoType})`);
      console.log(`📊 Target: ${rel.target}`);
      
      if (rel.foreignKey) {
        console.log(`📊 Foreign key: ${rel.foreignKey}`);
      }
      
      console.log(`📊 Nullable: ${rel.nullable}`);
      console.log(`📊 On delete: ${rel.onDelete}`);
      
      if (rel.relatedName) {
        console.log(`📊 Related name: ${rel.relatedName}`);
      }
      
      if (rel.through) {
        console.log(`📊 Through: ${rel.through}`);
      }
      
      if (rel.throughFields) {
        console.log(`📊 Through fields: ${rel.throughFields.join(', ')}`);
      }
      
      if (rel.toField) {
        console.log(`📊 To field: ${rel.toField}`);
      }
      
      if (rel.dbColumn) {
        console.log(`📊 DB column: ${rel.dbColumn}`);
      }
    });
  }
  
  // Print relationship statistics
  console.log('\n📊 Relationship statistics:');
  
  // Count by type
  const typeCount = {};
  allRelationships.forEach(rel => {
    typeCount[rel.djangoType] = (typeCount[rel.djangoType] || 0) + 1;
  });
  
  Object.entries(typeCount).forEach(([type, count]) => {
    console.log(`📊 ${type}: ${count}`);
  });
  
  // Count by target
  const targetCount = {};
  allRelationships.forEach(rel => {
    targetCount[rel.target] = (targetCount[rel.target] || 0) + 1;
  });
  
  console.log('\n📊 Target models:');
  Object.entries(targetCount).forEach(([target, count]) => {
    console.log(`📊 ${target}: ${count}`);
  });
  
  // Count by on_delete
  const onDeleteCount = {};
  allRelationships.forEach(rel => {
    if (rel.onDelete) {
      onDeleteCount[rel.onDelete] = (onDeleteCount[rel.onDelete] || 0) + 1;
    }
  });
  
  console.log('\n📊 On delete behaviors:');
  Object.entries(onDeleteCount).forEach(([onDelete, count]) => {
    console.log(`📊 ${onDelete}: ${count}`);
  });
  
  console.log('\n✅ Complex Django relationship extraction test completed');
}

// Run both tests
async function runTests() {
  await testDjangoRelationshipExtraction();
  console.log('\n' + '-'.repeat(80) + '\n');
  await testComplexDjangoRelationshipExtraction();
}

runTests().catch(console.error);
