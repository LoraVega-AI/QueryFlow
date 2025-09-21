# Database Definition Extraction System

## Overview

A comprehensive database definition extraction system for QueryFlow that leverages AST parsing, regex filtering, and framework adapters to extract and normalize database schemas from any project. The system supports JavaScript/TypeScript, Python, PHP, and Java with high precision through a multi-stage pipeline.

## 🚀 Features

### Language & Framework Support

#### Supported Languages
- **JavaScript/TypeScript** → `@babel/parser`, `@babel/traverse`, `@babel/types`
- **Python** → Built-in `ast` module
- **PHP** → `php-parser`
- **Java** → `java-parser`

#### Supported Frameworks
- **JavaScript/TypeScript**: Sequelize, Prisma, Mongoose, TypeORM
- **Python**: Django, SQLAlchemy, Alembic
- **PHP**: Laravel, Eloquent
- **Java**: Hibernate, JPA, Spring Data

### Extraction Pipeline

#### Stage 1: File Intake & Detection
- **File Scanning**: Uses `chokidar` for recursive project scanning and watching
- **MIME Detection**: Uses `mime-types` + `file-type` for accurate file type detection
- **File Hashing**: Uses `crypto-js` to avoid rescanning unchanged files
- **Language Detection**: Automatic language and framework detection

#### Stage 2: Regex Pre-Filter (Universal Fast Pass)
Identifies candidate DB code via regex patterns:
```regex
CREATE\s+TABLE, INSERT\s+INTO, SELECT\s+\*\s+FROM
sqlite3?.connect\(, sequelize\.define, mongoose\.model\(
class\s+\w+Model, migration\s*\(\s*table\s*=>
database\s*:\s*['"][^'"]+['"], connectionString\s*=
```

#### Stage 3: AST Parsing (Accurate Extraction)
- **JS/TS**: Uses `@babel/parser` + `@babel/traverse` to extract schema from ORM configs
- **Python**: Uses `ast` to detect Django models, SQLAlchemy classes, Alembic migrations
- **PHP**: Uses `php-parser` to parse Laravel Eloquent models and migrations
- **Java**: Uses `java-parser` to extract Hibernate entities, JPA annotations

#### Stage 4: Framework Adapters
Specialized adapters for each framework:
- **SequelizeAdapter** → model definitions, migrations
- **PrismaAdapter** → .prisma schema files
- **MongooseAdapter** → schemas, mongoose.model
- **DjangoAdapter** → models.Model, migrations
- **SQLAlchemyAdapter** → classes extending Base
- **LaravelAdapter** → migrations + Eloquent
- **HibernateAdapter** → @Entity, @Table

#### Stage 5: Schema Normalization & Validation
- Converts all adapters' output into universal Intermediate Representation (IR)
- Validates IR with `ajv` + JSON schema
- Handles conflicts (priority: migrations > ORM models > raw SQL)
- Deduplicates and merges conflicting table definitions

#### Stage 6: SQLite Conversion
- Uses `better-sqlite3` for in-memory SQLite generation
- Converts Postgres (`pg`) and MySQL (`mysql2`) schemas via SQL translation
- Converts MongoDB collections (`mongodb`) to SQLite tables with inferred schema
- Preserves foreign keys, indexes, and constraints

#### Stage 7: QueryFlow Integration
- Auto-loads IR + SQLite DB into QueryFlow interface
- Provides REST API endpoints for integration
- React component for UI interaction
- Metadata attachment (source file, ORM, framework, confidence score)

### Performance & Scalability

- **Worker Threads**: Uses `piscina` for worker-thread pools
- **Parallel Processing**: Parallel AST parsing per language
- **Incremental Builds**: Hash checking with `crypto-js`
- **Async Orchestration**: Uses `async` library
- **Caching**: AST and extraction result caching

## 📁 File Structure

```
src/
├── types/extraction.ts                 # Type definitions for IR and extraction pipeline
├── services/
│   ├── databaseDefinitionExtractor.ts  # Main orchestrator service
│   └── extraction/
│       ├── fileIntakeService.ts        # Stage 1: File scanning & detection
│       ├── regexFilterService.ts       # Stage 2: Regex pre-filtering
│       ├── astParsingService.ts        # Stage 3: AST parsing
│       ├── frameworkAdapterService.ts  # Stage 4: Framework adapters
│       ├── schemaNormalizationService.ts # Stage 5: Schema normalization
│       ├── sqliteConversionService.ts  # Stage 6: SQLite conversion
│       ├── workerPoolService.ts        # Worker thread management
│       ├── cacheService.ts             # Caching layer
│       └── adapters/
│           ├── baseAdapter.ts          # Base adapter class
│           ├── sequelizeAdapter.ts     # Sequelize framework adapter
│           ├── prismaAdapter.ts        # Prisma framework adapter
│           ├── mongooseAdapter.ts      # Mongoose framework adapter
│           ├── typeormAdapter.ts       # TypeORM framework adapter
│           ├── djangoAdapter.ts        # Django framework adapter
│           ├── sqlalchemyAdapter.ts    # SQLAlchemy framework adapter
│           └── alembicAdapter.ts       # Alembic + other adapters
├── components/
│   └── DatabaseDefinitionExtractor.tsx # React UI component
└── app/api/
    └── extract-database-definitions/
        └── route.ts                    # REST API endpoint
```

## 🔧 Usage

### REST API

#### Extract from Project Directory
```javascript
POST /api/extract-database-definitions
{
  "projectPath": "/path/to/project",
  "options": {
    "languages": ["javascript", "typescript"],
    "frameworks": ["sequelize", "prisma"],
    "confidence": { "minimum": 70 },
    "parallelProcessing": true,
    "maxWorkers": 4
  }
}
```

#### Extract from Uploaded Files
```javascript
POST /api/extract-database-definitions
{
  "files": [
    {
      "name": "models/User.js",
      "content": "const User = sequelize.define('User', { name: DataTypes.STRING });"
    }
  ],
  "options": {
    "frameworks": ["sequelize"]
  }
}
```

### React Component

```tsx
import DatabaseDefinitionExtractor from '@/components/DatabaseDefinitionExtractor';

function MyApp() {
  const handleSchemaExtracted = (result) => {
    console.log('Extracted schema:', result.schema);
    console.log('SQLite database:', result.sqliteDb);
  };

  return (
    <DatabaseDefinitionExtractor
      onSchemaExtracted={handleSchemaExtracted}
      onSQLiteGenerated={(db) => console.log('SQLite ready:', db)}
    />
  );
}
```

### Direct Service Usage

```typescript
import { DatabaseDefinitionExtractor } from '@/services/databaseDefinitionExtractor';

const extractor = new DatabaseDefinitionExtractor();

// Extract from project
const result = await extractor.extractFromProject('/path/to/project', {
  languages: ['typescript', 'python'],
  frameworks: ['typeorm', 'django'],
  confidence: { minimum: 80 }
});

// Extract from files
const filesResult = await extractor.extractFromFiles([
  { name: 'model.py', content: 'class User(models.Model): ...' }
]);

console.log(`Found ${result.schema.tables.length} tables`);
console.log(`Confidence: ${result.metadata.confidence}%`);
```

## 📊 Output Format

### Intermediate Representation (IR)

The system outputs a normalized IR schema:

```typescript
interface IRSchema {
  name: string;
  tables: IRTable[];
  relationships: IRRelationship[];
  metadata: IRSchemaMetadata;
}

interface IRTable {
  name: string;
  fields: IRField[];
  indexes: IRIndex[];
  constraints: IRConstraint[];
  metadata: IRTableMetadata;
  sourceLocation: SourceLocation;
}

interface IRField {
  name: string;
  type: DataType;
  nullable: boolean;
  primaryKey: boolean;
  unique: boolean;
  autoIncrement: boolean;
  defaultValue?: any;
  foreignKey?: {
    table: string;
    field: string;
    onDelete?: 'CASCADE' | 'SET NULL' | 'RESTRICT' | 'NO ACTION';
    onUpdate?: 'CASCADE' | 'SET NULL' | 'RESTRICT' | 'NO ACTION';
  };
  constraints?: FieldConstraints;
  sourceLocation: SourceLocation;
}
```

### SQLite Output

The system generates a complete SQLite database with:
- All tables with proper field types and constraints
- Foreign key relationships
- Indexes for performance
- Metadata tables for tracking source information

## ⚙️ Configuration Options

```typescript
interface ExtractionOptions {
  // File scanning
  includeHidden: boolean;
  maxDepth: number;
  ignorePatterns: string[];
  scanTimeout: number;

  // Performance
  enableASTCaching: boolean;
  enableIncrementalParsing: boolean;
  parallelProcessing: boolean;
  maxWorkers: number;

  // Filtering
  frameworks: SupportedFramework[];
  languages: SupportedLanguage[];
  confidence: {
    minimum: number;
    regexWeight: number;
    astWeight: number;
    frameworkWeight: number;
  };
}
```

## 🎯 Confidence Scoring

The system provides confidence scores based on:
- **Regex Weight (30%)**: Pattern matching accuracy
- **AST Weight (50%)**: Syntactic analysis confidence
- **Framework Weight (20%)**: Framework-specific pattern recognition

## 🔍 Example Extractions

### Sequelize Model
```javascript
// Input
const User = sequelize.define('User', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  name: {
    type: DataTypes.STRING(100),
    allowNull: false
  },
  email: {
    type: DataTypes.STRING,
    unique: true
  }
});

// Output IR
{
  name: "users",
  fields: [
    {
      name: "id",
      type: "INTEGER",
      primaryKey: true,
      autoIncrement: true,
      nullable: false
    },
    {
      name: "name",
      type: "VARCHAR",
      nullable: false,
      constraints: { maxLength: 100 }
    },
    {
      name: "email",
      type: "VARCHAR",
      unique: true,
      nullable: true
    }
  ]
}
```

### Django Model
```python
# Input
class User(models.Model):
    name = models.CharField(max_length=100)
    email = models.EmailField(unique=True)
    created_at = models.DateTimeField(auto_now_add=True)

# Output IR
{
  name: "users",
  fields: [
    {
      name: "id",
      type: "INTEGER",
      primaryKey: true,
      autoIncrement: true
    },
    {
      name: "name",
      type: "VARCHAR",
      constraints: { maxLength: 100 }
    },
    {
      name: "email",
      type: "VARCHAR",
      unique: true
    },
    {
      name: "created_at",
      type: "DATETIME"
    }
  ]
}
```

## 🚀 Production Benefits

### High Precision
- **Pure AST parsing** ensures accurate code analysis
- **Framework adapters** provide specialized extraction logic
- **Multi-stage validation** prevents false positives

### Reliability
- **No dependency on Tree-sitter** or unavailable parsers
- **Fallback mechanisms** for parsing failures
- **Incremental processing** with hash-based change detection

### Performance
- **Parallel processing** across multiple CPU cores
- **Intelligent caching** prevents redundant work
- **Streaming file processing** for large projects

### QueryFlow Compatibility
- **Native SQLite output** integrates seamlessly
- **IR format** enables ERD visualization
- **Metadata preservation** maintains traceability

## 🎉 Result

The system successfully:
- ✅ Supports JS/TS, Python, PHP, Java at production level
- ✅ Uses pure AST + adapters for reliable schema extraction
- ✅ Outputs IR + SQLite format ensuring QueryFlow compatibility
- ✅ Provides no reliance on unavailable parsers or Tree-sitter
- ✅ Delivers high-performance extraction with worker threads
- ✅ Maintains comprehensive metadata and confidence scoring

This extraction system transforms QueryFlow into a universal database schema analysis platform capable of understanding and visualizing database structures from any supported codebase.
