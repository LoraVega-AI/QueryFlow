// Test script for Django validation and constraint parsing
const path = require('path');
const fs = require('fs');

// Extract Django validations from a model
function extractDjangoValidations(modelBody, modelName) {
  console.log(`🔍 Extracting Django validations for model: ${modelName}`);
  
  const validations = [];
  
  // Extract meta constraints
  const metaConstraints = extractMetaConstraints(modelBody);
  validations.push(...metaConstraints);
  
  // Extract field validations
  const fieldValidations = extractFieldValidations(modelBody);
  validations.push(...fieldValidations);
  
  // Extract custom validation methods
  const customValidations = extractCustomValidations(modelBody);
  validations.push(...customValidations);
  
  return validations;
}

// Extract constraints from Meta class
function extractMetaConstraints(modelBody) {
  console.log('🔍 Extracting Meta constraints');
  
  const constraints = [];
  
  // Find Meta class
  const metaMatch = modelBody.match(/class\s+Meta\s*:\s*([^}]+?)(?=\n\s*(?:class|def|@|$))/s);
  
  if (metaMatch) {
    const metaBody = metaMatch[1];
    
    // Extract unique_together
    const uniqueTogetherMatch = metaBody.match(/unique_together\s*=\s*\(([^)]+)\)/);
    if (uniqueTogetherMatch) {
      const uniqueTogetherStr = uniqueTogetherMatch[1];
      
      // Handle different formats: ('field1', 'field2') or (('field1', 'field2'),)
      const nestedTupleMatch = uniqueTogetherStr.match(/\(\s*([^)]+)\s*\)/g);
      
      if (nestedTupleMatch) {
        // Handle multiple unique_together constraints
        nestedTupleMatch.forEach(tuple => {
          const fields = tuple.replace(/[()]/g, '').split(',').map(f => f.trim().replace(/['"]/g, '')).filter(Boolean);
          
          if (fields.length > 0) {
            constraints.push({
              type: 'uniqueTogether',
              fields,
              message: `Fields ${fields.join(', ')} must be unique together`
            });
            
            console.log(`📋 Found unique_together constraint: ${fields.join(', ')}`);
          }
        });
      } else {
        // Handle single unique_together constraint
        const fields = uniqueTogetherStr.split(',').map(f => f.trim().replace(/['"]/g, '')).filter(Boolean);
        
        if (fields.length > 0) {
          constraints.push({
            type: 'uniqueTogether',
            fields,
            message: `Fields ${fields.join(', ')} must be unique together`
          });
          
          console.log(`📋 Found unique_together constraint: ${fields.join(', ')}`);
        }
      }
    }
    
    // Extract index_together
    const indexTogetherMatch = metaBody.match(/index_together\s*=\s*\(([^)]+)\)/);
    if (indexTogetherMatch) {
      const indexTogetherStr = indexTogetherMatch[1];
      
      // Handle different formats: ('field1', 'field2') or (('field1', 'field2'),)
      const nestedTupleMatch = indexTogetherStr.match(/\(\s*([^)]+)\s*\)/g);
      
      if (nestedTupleMatch) {
        // Handle multiple index_together constraints
        nestedTupleMatch.forEach(tuple => {
          const fields = tuple.replace(/[()]/g, '').split(',').map(f => f.trim().replace(/['"]/g, '')).filter(Boolean);
          
          if (fields.length > 0) {
            constraints.push({
              type: 'indexTogether',
              fields,
              message: `Fields ${fields.join(', ')} are indexed together`
            });
            
            console.log(`📋 Found index_together constraint: ${fields.join(', ')}`);
          }
        });
      } else {
        // Handle single index_together constraint
        const fields = indexTogetherStr.split(',').map(f => f.trim().replace(/['"]/g, '')).filter(Boolean);
        
        if (fields.length > 0) {
          constraints.push({
            type: 'indexTogether',
            fields,
            message: `Fields ${fields.join(', ')} are indexed together`
          });
          
          console.log(`📋 Found index_together constraint: ${fields.join(', ')}`);
        }
      }
    }
    
    // Extract constraints (Django 2.2+)
    const constraintsMatch = metaBody.match(/constraints\s*=\s*\[(.*?)\]/s);
    if (constraintsMatch) {
      const constraintsStr = constraintsMatch[1];
      
      // Extract CheckConstraint
      const checkConstraintRegex = /models\.CheckConstraint\s*\(\s*check\s*=\s*(.*?),\s*name\s*=\s*['"]([^'"]+)['"]\s*\)/g;
      let checkMatch;
      
      while ((checkMatch = checkConstraintRegex.exec(constraintsStr)) !== null) {
        const check = checkMatch[1];
        const name = checkMatch[2];
        
        constraints.push({
          type: 'check',
          name,
          check,
          message: `Check constraint: ${check}`
        });
        
        console.log(`📋 Found check constraint: ${name} - ${check}`);
      }
      
      // Extract UniqueConstraint
      const uniqueConstraintRegex = /models\.UniqueConstraint\s*\(\s*fields\s*=\s*\[(.*?)\],\s*name\s*=\s*['"]([^'"]+)['"]\s*\)/g;
      let uniqueMatch;
      
      while ((uniqueMatch = uniqueConstraintRegex.exec(constraintsStr)) !== null) {
        const fieldsStr = uniqueMatch[1];
        const name = uniqueMatch[2];
        
        const fields = fieldsStr.split(',').map(f => f.trim().replace(/['"]/g, '')).filter(Boolean);
        
        constraints.push({
          type: 'unique',
          name,
          fields,
          message: `Fields ${fields.join(', ')} must be unique together`
        });
        
        console.log(`📋 Found unique constraint: ${name} - ${fields.join(', ')}`);
      }
    }
  }
  
  return constraints;
}

// Extract validations from field definitions
function extractFieldValidations(modelBody) {
  console.log('🔍 Extracting field validations');
  
  const validations = [];
  
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
    
    // Check for validators
    if (args.validators) {
      validations.push({
        type: 'validators',
        field: fieldName,
        value: args.validators,
        message: `${fieldName} has custom validators`
      });
      
      console.log(`📋 Found validators for field: ${fieldName}: ${args.validators}`);
    }
    
    // Type-specific validations
    switch (fieldType) {
      case 'EmailField':
        validations.push({
          type: 'email',
          field: fieldName,
          message: `${fieldName} must be a valid email address`
        });
        
        console.log(`📋 Found email validation for field: ${fieldName}`);
        break;
        
      case 'URLField':
        validations.push({
          type: 'url',
          field: fieldName,
          message: `${fieldName} must be a valid URL`
        });
        
        console.log(`📋 Found URL validation for field: ${fieldName}`);
        break;
        
      case 'IntegerField':
      case 'PositiveIntegerField':
      case 'PositiveSmallIntegerField':
      case 'SmallIntegerField':
      case 'BigIntegerField':
        if (args.min_value) {
          validations.push({
            type: 'min',
            field: fieldName,
            value: args.min_value,
            message: `${fieldName} must be greater than or equal to ${args.min_value}`
          });
          
          console.log(`📋 Found min validation for field: ${fieldName}: ${args.min_value}`);
        }
        
        if (args.max_value) {
          validations.push({
            type: 'max',
            field: fieldName,
            value: args.max_value,
            message: `${fieldName} must be less than or equal to ${args.max_value}`
          });
          
          console.log(`📋 Found max validation for field: ${fieldName}: ${args.max_value}`);
        }
        
        if (fieldType === 'PositiveIntegerField' || fieldType === 'PositiveSmallIntegerField') {
          validations.push({
            type: 'min',
            field: fieldName,
            value: 0,
            message: `${fieldName} must be greater than or equal to 0`
          });
          
          console.log(`📋 Found implicit min validation for field: ${fieldName}: 0`);
        }
        break;
        
      case 'DecimalField':
        if (args.max_digits) {
          validations.push({
            type: 'digits',
            field: fieldName,
            value: args.max_digits,
            message: `${fieldName} cannot have more than ${args.max_digits} digits`
          });
          
          console.log(`📋 Found max digits validation for field: ${fieldName}: ${args.max_digits}`);
        }
        
        if (args.decimal_places) {
          validations.push({
            type: 'decimalPlaces',
            field: fieldName,
            value: args.decimal_places,
            message: `${fieldName} cannot have more than ${args.decimal_places} decimal places`
          });
          
          console.log(`📋 Found decimal places validation for field: ${fieldName}: ${args.decimal_places}`);
        }
        break;
    }
  }
  
  return validations;
}

// Extract custom validation methods
function extractCustomValidations(modelBody) {
  console.log('🔍 Extracting custom validations');
  
  const validations = [];
  
  // Find clean_field methods
  const cleanMethodRegex = /def\s+clean_(\w+)\s*\(([^)]*)\):\s*([^@]+?)(?=\n\s*(?:class|def|@|$))/gs;
  let match;
  
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

// Test function for Django validation parsing
async function testDjangoValidationParsing() {
  console.log('🧪 Starting Django validation parsing test...');
  
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
    
    // Extract validations
    const validations = extractDjangoValidations(modelBody, modelName);
    
    // Print validations
    console.log(`\n📊 Found ${validations.length} validations for model ${modelName}`);
    
    validations.forEach((val, index) => {
      console.log(`\n📋 Validation ${index + 1}: ${val.type}`);
      
      if (val.field) {
        console.log(`📊 Field: ${val.field}`);
      }
      
      if (val.fields) {
        console.log(`📊 Fields: ${val.fields.join(', ')}`);
      }
      
      if (val.value !== undefined) {
        console.log(`📊 Value: ${val.value}`);
      }
      
      if (val.name) {
        console.log(`📊 Name: ${val.name}`);
      }
      
      if (val.check) {
        console.log(`📊 Check: ${val.check}`);
      }
      
      if (val.code) {
        console.log(`📊 Code: ${val.code.substring(0, 50)}${val.code.length > 50 ? '...' : ''}`);
      }
      
      console.log(`📊 Message: ${val.message}`);
    });
  }
  
  console.log('\n✅ Django validation parsing test completed');
}

// Create a Django model file with various validation types
async function createValidationTestModel() {
  console.log('🔧 Creating Django model file with various validation types...');
  
  const testDir = path.join(__dirname, 'test-models');
  const modelsPath = path.join(testDir, 'validation_models.py');
  
  // Create test directory if it doesn't exist
  if (!fs.existsSync(testDir)) {
    fs.mkdirSync(testDir, { recursive: true });
  }
  
  // Create validation models file
  const modelsContent = `from django.db import models
from django.core.validators import MinValueValidator, MaxValueValidator, RegexValidator, EmailValidator
from django.core.exceptions import ValidationError
import re

def validate_even(value):
    if value % 2 != 0:
        raise ValidationError('%(value)s is not an even number', params={'value': value})

class Product(models.Model):
    name = models.CharField(max_length=100, unique=True, help_text="Product name")
    description = models.TextField(blank=True, null=True)
    price = models.DecimalField(
        max_digits=10, 
        decimal_places=2,
        validators=[MinValueValidator(0.01)]
    )
    stock = models.PositiveIntegerField(default=0)
    sku = models.CharField(
        max_length=20, 
        unique=True,
        validators=[
            RegexValidator(
                regex=r'^[A-Z]{2}-\\d{6}$',
                message='SKU must be in format XX-123456'
            )
        ]
    )
    weight = models.DecimalField(
        max_digits=6,
        decimal_places=2,
        blank=True,
        null=True,
        validators=[MinValueValidator(0.01), MaxValueValidator(1000)]
    )
    is_active = models.BooleanField(default=True)
    even_field = models.IntegerField(validators=[validate_even])
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = "Product"
        verbose_name_plural = "Products"
        ordering = ['-created_at']
        unique_together = [('name', 'sku')]
        index_together = [('name', 'price')]
        constraints = [
            models.CheckConstraint(
                check=models.Q(price__gt=0),
                name='price_gt_0'
            ),
            models.UniqueConstraint(
                fields=['name', 'sku'],
                name='unique_name_sku'
            )
        ]
    
    def clean_sku(self):
        sku = self.sku
        if not re.match(r'^[A-Z]{2}-\\d{6}$', sku):
            raise ValidationError('SKU must be in format XX-123456')
        return sku
    
    def clean(self):
        if self.price > 1000 and self.stock < 10:
            raise ValidationError('Expensive products must have at least 10 in stock')
        if self.name == self.description:
            raise ValidationError('Name and description cannot be the same')
    
    def __str__(self):
        return self.name

class Order(models.Model):
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('processing', 'Processing'),
        ('shipped', 'Shipped'),
        ('delivered', 'Delivered'),
        ('cancelled', 'Cancelled'),
    ]
    
    order_number = models.CharField(max_length=20, unique=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    customer_email = models.EmailField(validators=[EmailValidator()])
    total = models.DecimalField(max_digits=10, decimal_places=2)
    shipping_address = models.TextField()
    billing_address = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        constraints = [
            models.CheckConstraint(
                check=models.Q(total__gte=0),
                name='total_gte_0'
            )
        ]
    
    def clean_customer_email(self):
        email = self.customer_email
        if email.endswith('.test'):
            raise ValidationError('Test emails are not allowed')
        return email
    
    def clean(self):
        if self.shipping_address == self.billing_address:
            # This is just a warning, not an error
            pass
        if self.status == 'cancelled' and self.total > 0:
            raise ValidationError('Cancelled orders should have zero total')
`;
  
  fs.writeFileSync(modelsPath, modelsContent);
  console.log(`✅ Created Django validation model file at: ${modelsPath}`);
  
  return modelsPath;
}

// Test function for complex Django validation parsing
async function testComplexDjangoValidationParsing() {
  console.log('🧪 Starting complex Django validation parsing test...');
  
  // Create validation test model
  const modelsPath = await createValidationTestModel();
  
  // Read models file
  const modelsContent = fs.readFileSync(modelsPath, 'utf-8');
  
  // Find model classes
  const modelClassRegex = /class\s+(\w+)\s*\(\s*models\.Model\s*\)\s*:/g;
  let match;
  
  // Track all validations
  const allValidations = [];
  
  while ((match = modelClassRegex.exec(modelsContent)) !== null) {
    const modelName = match[1];
    console.log(`\n📋 Found model class: ${modelName}`);
    
    // Extract model body
    const modelStart = match.index;
    const modelEnd = findModelEnd(modelsContent, modelStart);
    const modelBody = modelsContent.substring(modelStart, modelEnd);
    
    // Extract validations
    const validations = extractDjangoValidations(modelBody, modelName);
    
    // Add model name to validations
    validations.forEach(val => {
      val.model = modelName;
      allValidations.push(val);
    });
    
    // Print validations
    console.log(`\n📊 Found ${validations.length} validations for model ${modelName}`);
    
    validations.forEach((val, index) => {
      console.log(`\n📋 Validation ${index + 1}: ${val.type}`);
      
      if (val.field) {
        console.log(`📊 Field: ${val.field}`);
      }
      
      if (val.fields) {
        console.log(`📊 Fields: ${val.fields.join(', ')}`);
      }
      
      if (val.value !== undefined) {
        console.log(`📊 Value: ${val.value}`);
      }
      
      if (val.name) {
        console.log(`📊 Name: ${val.name}`);
      }
      
      if (val.check) {
        console.log(`📊 Check: ${val.check}`);
      }
      
      if (val.code) {
        console.log(`📊 Code: ${val.code.substring(0, 50)}${val.code.length > 50 ? '...' : ''}`);
      }
      
      console.log(`📊 Message: ${val.message}`);
    });
  }
  
  // Print validation statistics
  console.log('\n📊 Validation statistics:');
  
  // Count by type
  const typeCount = {};
  allValidations.forEach(val => {
    typeCount[val.type] = (typeCount[val.type] || 0) + 1;
  });
  
  Object.entries(typeCount).forEach(([type, count]) => {
    console.log(`📊 ${type}: ${count}`);
  });
  
  console.log('\n✅ Complex Django validation parsing test completed');
}

// Run both tests
async function runTests() {
  await testDjangoValidationParsing();
  console.log('\n' + '-'.repeat(80) + '\n');
  await testComplexDjangoValidationParsing();
}

runTests().catch(console.error);
