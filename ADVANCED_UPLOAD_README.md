# Advanced Project Upload System

QueryFlow now supports advanced project upload capabilities that go far beyond simple database file uploads. The system can analyze entire project folders, extract database schemas from various sources, and automatically connect them to QueryFlow's query interface.

## 🚀 New Capabilities

### Multi-Format Support
- **Database Files**: `.db`, `.sqlite`, `.sqlite3`, `.db3`, `.s3db`, `.sl3`
- **Project Archives**: `.zip` files containing entire project folders
- **Source Code**: `.js`, `.ts`, `.py`, `.php`, `.java`, `.cs`, `.rb`, `.go`, `.rs`
- **SQL Files**: `.sql` files with schema definitions and migrations
- **Configuration Files**: `.env`, `.json`, `.yaml`, `.js`, `.ts`, `.php`, `.py`

### Advanced Schema Extraction

#### 1. SQL File Parsing
- **Raw SQL Files**: Parses `CREATE TABLE`, `ALTER TABLE`, and other DDL statements
- **Migration Files**: Extracts schema changes from migration scripts
- **Schema Files**: Processes structured schema definition files

#### 2. ORM Model Parsing
- **JavaScript/TypeScript**: Sequelize, Mongoose, Knex, Prisma, TypeORM
- **Python**: Django, SQLAlchemy, Flask-SQLAlchemy
- **PHP**: Laravel, Doctrine
- **Java**: JPA, Hibernate
- **C#**: Entity Framework
- **Ruby**: Rails ActiveRecord

#### 3. Configuration Parsing
- **Environment Files**: `.env`, `.env.local`, `.env.production`
- **JSON Configs**: `config.json`, `package.json`, `composer.json`
- **YAML Configs**: `config.yaml`, `docker-compose.yml`
- **Language-Specific**: `settings.py`, `database.php`, `ormconfig.js`

### Intelligent Project Detection

The system automatically detects:
- **Project Type**: Node.js, Python, Django, Laravel, Rails, etc.
- **Framework**: React, Next.js, Express, Flask, Spring Boot, etc.
- **Database Type**: SQLite, MySQL, PostgreSQL, etc.
- **ORM Library**: Sequelize, TypeORM, Django ORM, etc.

## 🏗️ Architecture

### Core Services

#### 1. AdvancedProjectScanner
- **Purpose**: Main orchestrator for project scanning
- **Features**: 
  - Recursive file scanning
  - Zip file extraction
  - Project type detection
  - Schema extraction coordination

#### 2. SQLParser
- **Purpose**: Parse SQL files and extract schema information
- **Features**:
  - CREATE TABLE statement parsing
  - Foreign key relationship detection
  - Index and constraint extraction
  - Migration file processing

#### 3. ORMParser
- **Purpose**: Extract schemas from ORM model definitions
- **Features**:
  - Multi-language support
  - Framework-specific parsing
  - Relationship mapping
  - Type conversion

#### 4. ConfigParser
- **Purpose**: Extract database configuration from config files
- **Features**:
  - Multiple config formats
  - Environment variable parsing
  - Connection string extraction
  - Database type detection

#### 5. SchemaNormalizer
- **Purpose**: Unify and normalize extracted schemas
- **Features**:
  - Schema merging
  - Type normalization
  - Relationship deduplication
  - Confidence scoring

### Data Flow

```
Upload Files → AdvancedProjectScanner → [SQLParser, ORMParser, ConfigParser] → SchemaNormalizer → Unified Schema
```

## 📊 Schema Extraction Process

### 1. File Discovery
- Recursively scans uploaded files
- Identifies database-related files by extension and content
- Filters out non-relevant files (images, videos, etc.)

### 2. Content Analysis
- **SQL Files**: Parses DDL statements to extract table definitions
- **ORM Models**: Analyzes model definitions to infer database structure
- **Config Files**: Extracts database connection information

### 3. Schema Normalization
- Converts all extracted schemas to a unified format
- Merges related schemas from different sources
- Resolves conflicts and deduplicates information

### 4. Auto-Connection
- Automatically connects extracted schemas to QueryFlow
- Makes them available in the query interface
- Preserves original project structure and metadata

## 🎯 Usage Examples

### Upload a Django Project
```bash
# Zip your Django project
zip -r my-django-project.zip my-django-project/

# Upload through QueryFlow
# The system will:
# 1. Detect Django project type
# 2. Parse models.py files
# 3. Extract database configuration from settings.py
# 4. Create unified schema representation
# 5. Make it queryable in QueryFlow
```

### Upload a Node.js Project with Sequelize
```bash
# Upload your Node.js project folder
# The system will:
# 1. Detect Node.js project type
# 2. Parse Sequelize model files
# 3. Extract database config from config files
# 4. Parse any SQL migration files
# 5. Create comprehensive schema view
```

### Upload Raw SQL Files
```bash
# Upload multiple SQL files
# The system will:
# 1. Parse each SQL file
# 2. Extract table definitions
# 3. Identify relationships
# 4. Merge into unified schema
```

## 🔧 Configuration Options

### Scan Options
```javascript
{
  includeHidden: false,        // Include hidden files
  maxDepth: 5,                 // Maximum directory depth
  ignorePatterns: [            // Files/directories to ignore
    'node_modules',
    '.git',
    'dist',
    'build',
    '__pycache__'
  ],
  scanTimeout: 30000          // Maximum scan time (ms)
}
```

### Supported File Patterns

#### Database Files
- `.db`, `.sqlite`, `.sqlite3`, `.db3`, `.s3db`, `.sl3`

#### SQL Files
- `.sql` (any SQL file)

#### Migration Directories
- `migrations/`, `migration/`, `db/migrate/`, `database/migrations/`

#### Schema Directories
- `schema/`, `schemas/`, `db/schema/`, `database/schema/`

#### Configuration Files
- `.env`, `.env.local`, `.env.production`, `.env.development`
- `config.js`, `config.ts`, `config.json`, `config.yaml`
- `settings.py`, `database.php`, `ormconfig.js`

## 🧪 Testing

### Create Test Project
```bash
node test-advanced-upload.js create
```

This creates a test project with:
- SQL schema files
- Migration files
- Django models
- Sequelize models
- TypeORM entities
- Configuration files
- Package.json

### Test Upload
1. Zip the test project: `zip -r test-project.zip test-advanced-project/`
2. Upload through QueryFlow's ProjectUploader
3. Observe the advanced schema extraction in action

### Cleanup
```bash
node test-advanced-upload.js cleanup
```

## 🚀 Benefits

### For Developers
- **No Manual Schema Creation**: Upload your project and get instant schema visualization
- **Multi-Language Support**: Works with projects in any supported language
- **Framework Agnostic**: Supports all major web frameworks
- **Migration Support**: Automatically processes database migrations

### For Teams
- **Project Understanding**: Quickly understand database structure of any project
- **Documentation**: Auto-generated schema documentation
- **Collaboration**: Share database schemas across team members
- **Migration Tracking**: Visualize database evolution over time

### For QueryFlow
- **Expanded Use Cases**: Beyond simple database files
- **Better User Experience**: One-click project analysis
- **Rich Metadata**: Detailed project and schema information
- **Intelligent Processing**: Context-aware schema extraction

## 🔮 Future Enhancements

- **Real-time Sync**: Keep schemas in sync with live projects
- **Version Control Integration**: Connect with Git repositories
- **Cloud Integration**: Direct integration with cloud databases
- **AI-Powered Analysis**: Intelligent schema optimization suggestions
- **Team Collaboration**: Real-time collaborative schema editing

## 📝 Technical Notes

### Performance Considerations
- Large projects are processed in batches to avoid memory issues
- File scanning is optimized to skip irrelevant files
- Schema normalization is cached for repeated operations

### Security
- All file processing happens server-side
- Sensitive configuration data is handled securely
- No credentials are exposed to the client

### Error Handling
- Graceful degradation for unsupported file types
- Detailed error reporting for debugging
- Partial success handling (some schemas extracted even if others fail)

---

The advanced upload system transforms QueryFlow from a simple database tool into a comprehensive project analysis platform, making it easier than ever to understand and work with database schemas across different technologies and frameworks.
