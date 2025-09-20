// Advanced Project Scanner Service
// Handles recursive scanning of uploaded projects and database schema extraction

import { readFile, readdir, stat, mkdir } from 'fs/promises';
import { join, extname, basename, dirname } from 'path';
import { createReadStream } from 'fs';
import { createUnzip } from 'zlib';
import { pipeline } from 'stream/promises';
import { SQLParser, ExtractedSchema, Table, Column, ForeignKey, Index, Constraint, Relationship, Migration } from './sqlParser';
import { ORMParser } from './ormParser';
import { ConfigParser, ConfigFile, DatabaseConfig } from './configParser';
import { SchemaNormalizer } from './schemaNormalizer';

export interface ProjectScanResult {
  projectName: string;
  projectType: string;
  confidence: number;
  extractedSchemas: ExtractedSchema[];
  databaseFiles: DatabaseFile[];
  configFiles: ConfigFile[];
  totalFiles: number;
  processedFiles: number;
  errors: ScanError[];
}

export interface DatabaseFile {
  id: string;
  name: string;
  type: 'sqlite' | 'mysql' | 'postgresql' | 'unknown';
  path: string;
  size: number;
  isConnected: boolean;
  schema?: ExtractedSchema;
}

export interface ScanError {
  file: string;
  error: string;
  type: 'parse' | 'read' | 'extract' | 'validation';
}

export class AdvancedProjectScanner {
  private sqlParser: SQLParser;
  private ormParser: ORMParser;
  private configParser: ConfigParser;
  private schemaNormalizer: SchemaNormalizer;

  // File patterns for different types
  private readonly DATABASE_EXTENSIONS = ['.db', '.sqlite', '.sqlite3', '.db3', '.s3db', '.sl3'];
  private readonly SQL_EXTENSIONS = ['.sql'];
  private readonly MIGRATION_PATHS = ['migrations', 'migration', 'db/migrate', 'database/migrations'];
  private readonly SCHEMA_PATHS = ['schema', 'schemas', 'db/schema', 'database/schema'];
  private readonly CONFIG_PATTERNS = [
    '.env', '.env.local', '.env.production', '.env.development',
    'config.js', 'config.ts', 'config.json', 'config.yaml', 'config.yml',
    'settings.py', 'settings.js', 'settings.ts',
    'database.php', 'database.js', 'database.ts',
    'ormconfig.js', 'ormconfig.ts',
    'knexfile.js', 'knexfile.ts',
    'prisma/schema.prisma',
    'typeorm.config.js', 'typeorm.config.ts'
  ];

  // Language-specific patterns
  private readonly LANGUAGE_PATTERNS = {
    javascript: ['.js', '.jsx', '.mjs'],
    typescript: ['.ts', '.tsx'],
    python: ['.py'],
    php: ['.php'],
    java: ['.java'],
    csharp: ['.cs'],
    ruby: ['.rb'],
    go: ['.go'],
    rust: ['.rs']
  };

  // ORM patterns for different languages
  private readonly ORM_PATTERNS = {
    javascript: [
      'sequelize.define', 'Sequelize.define',
      'mongoose.Schema', 'mongoose.model',
      'knex.schema', 'knex.table',
      'prisma.model', 'prisma.schema'
    ],
    typescript: [
      'sequelize.define', 'Sequelize.define',
      'mongoose.Schema', 'mongoose.model',
      'knex.schema', 'knex.table',
      'prisma.model', 'prisma.schema',
      '@Entity', '@Column', '@Table',
      'TypeORM', 'typeorm'
    ],
    python: [
      'db.Model', 'db.Column', 'db.relationship',
      'models.Model', 'models.CharField', 'models.ForeignKey',
      'Base.metadata', 'declarative_base',
      'Table(', 'Column(', 'ForeignKey(',
      'alembic', 'migrate'
    ],
    php: [
      'Schema::create', 'Schema::table',
      'DB::table', 'Model::',
      'Eloquent', 'Doctrine',
      'create_table', 'add_column'
    ],
    java: [
      '@Entity', '@Table', '@Column', '@Id',
      'JPA', 'Hibernate', 'Spring Data',
      'EntityManager', 'Repository'
    ],
    csharp: [
      'DbSet', 'EntityFramework',
      '[Table]', '[Column]', '[Key]',
      'DbContext', 'CodeFirst'
    ],
    ruby: [
      'ActiveRecord', 'create_table',
      'add_column', 'change_table',
      'Rails', 'Rake'
    ]
  };

  constructor() {
    this.sqlParser = new SQLParser();
    this.ormParser = new ORMParser();
    this.configParser = new ConfigParser();
    this.schemaNormalizer = new SchemaNormalizer();
  }

  async scanProject(uploadPath: string, options: ScanOptions = {}): Promise<ProjectScanResult> {
    const startTime = Date.now();
    console.log('🔍 Starting advanced project scan:', uploadPath);

    const result: ProjectScanResult = {
      projectName: '',
      projectType: 'unknown',
      confidence: 0,
      extractedSchemas: [],
      databaseFiles: [],
      configFiles: [],
      totalFiles: 0,
      processedFiles: 0,
      errors: []
    };

    try {
      // Handle zip files
      if (await this.isZipFile(uploadPath)) {
        const extractedPath = await this.extractZipFile(uploadPath);
        return this.scanProject(extractedPath, options);
      }

      // Detect project type
      result.projectType = await this.detectProjectType(uploadPath);
      result.projectName = await this.extractProjectName(uploadPath);
      result.confidence = this.calculateProjectConfidence(uploadPath, result.projectType);

      // Recursively scan all files
      const allFiles = await this.scanDirectory(uploadPath, options);
      result.totalFiles = allFiles.length;

      console.log(`📁 Found ${allFiles.length} files to process`);

      // Process files in parallel batches
      const batchSize = 10;
      for (let i = 0; i < allFiles.length; i += batchSize) {
        const batch = allFiles.slice(i, i + batchSize);
        await Promise.all(batch.map(file => this.processFile(file, result)));
        result.processedFiles = Math.min(i + batchSize, allFiles.length);
        
        // Update progress
        const progress = Math.round((result.processedFiles / result.totalFiles) * 100);
        console.log(`📊 Progress: ${progress}% (${result.processedFiles}/${result.totalFiles})`);
      }

      // Normalize and merge schemas
      result.extractedSchemas = await this.schemaNormalizer.normalizeSchemas(result.extractedSchemas);

      // Calculate final confidence
      result.confidence = this.calculateFinalConfidence(result);

      const duration = Date.now() - startTime;
      console.log(`✅ Project scan completed in ${duration}ms`);
      console.log(`📊 Results: ${result.extractedSchemas.length} schemas, ${result.databaseFiles.length} DB files, ${result.configFiles.length} config files`);

      return result;

    } catch (error) {
      console.error('❌ Project scan failed:', error);
      result.errors.push({
        file: uploadPath,
        error: error instanceof Error ? error.message : 'Unknown error',
        type: 'parse'
      });
      return result;
    }
  }

  private async scanDirectory(dirPath: string, options: ScanOptions): Promise<string[]> {
    const files: string[] = [];
    const ignorePatterns = options.ignorePatterns || [
      'node_modules', '.git', '.svn', '.hg',
      'coverage', 'dist', 'build', 'out',
      '.next', '.nuxt', '.vuepress',
      '*.log', '*.tmp', '*.temp'
    ];

    try {
      const entries = await readdir(dirPath, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = join(dirPath, entry.name);
        
        // Skip ignored files/directories
        if (this.shouldIgnore(fullPath, ignorePatterns)) {
          continue;
        }

        if (entry.isDirectory()) {
          const subFiles = await this.scanDirectory(fullPath, options);
          files.push(...subFiles);
        } else {
          files.push(fullPath);
        }
      }
    } catch (error) {
      console.warn(`⚠️ Could not scan directory ${dirPath}:`, error);
    }

    return files;
  }

  private async processFile(filePath: string, result: ProjectScanResult): Promise<void> {
    try {
      const ext = extname(filePath).toLowerCase();
      const fileName = basename(filePath);
      const relativePath = filePath.replace(process.cwd(), '').replace(/\\/g, '/');

      // Check if it's a database file
      if (this.DATABASE_EXTENSIONS.includes(ext)) {
        await this.processDatabaseFile(filePath, result);
        return;
      }

      // Check if it's a SQL file
      if (this.SQL_EXTENSIONS.includes(ext)) {
        await this.processSQLFile(filePath, result);
        return;
      }

      // Check if it's a config file
      if (this.isConfigFile(fileName)) {
        await this.processConfigFile(filePath, result);
        return;
      }

      // Check if it's a migration file
      if (this.isMigrationFile(filePath)) {
        await this.processMigrationFile(filePath, result);
        return;
      }

      // Check if it's a schema file
      if (this.isSchemaFile(filePath)) {
        await this.processSchemaFile(filePath, result);
        return;
      }

      // Check for ORM models in source code
      const language = this.detectLanguage(filePath);
      if (language && this.ORM_PATTERNS[language as keyof typeof this.ORM_PATTERNS]) {
        await this.processORMModelFile(filePath, result, language);
        return;
      }

    } catch (error) {
      console.warn(`⚠️ Error processing file ${filePath}:`, error);
      result.errors.push({
        file: filePath,
        error: error instanceof Error ? error.message : 'Unknown error',
        type: 'parse'
      });
    }
  }

  private async processDatabaseFile(filePath: string, result: ProjectScanResult): Promise<void> {
    try {
      const stats = await stat(filePath);
      const fileName = basename(filePath);
      
      const dbFile: DatabaseFile = {
        id: `db_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        name: fileName.replace(extname(fileName), ''),
        type: 'sqlite', // Default, could be enhanced to detect actual type
        path: filePath,
        size: stats.size,
        isConnected: false
      };

      // Try to extract schema from database file
      try {
        const schema = await this.extractSchemaFromDatabase(filePath);
        if (schema) {
          dbFile.schema = schema;
          result.extractedSchemas.push(schema);
        }
      } catch (error) {
        console.warn(`⚠️ Could not extract schema from database file ${filePath}:`, error);
      }

      result.databaseFiles.push(dbFile);
    } catch (error) {
      console.warn(`⚠️ Error processing database file ${filePath}:`, error);
    }
  }

  private async processSQLFile(filePath: string, result: ProjectScanResult): Promise<void> {
    try {
      const content = await readFile(filePath, 'utf-8');
      const schema = await this.sqlParser.parseSQLFile(filePath, content);
      
      if (schema && schema.tables.length > 0) {
        result.extractedSchemas.push(schema);
      }
    } catch (error) {
      console.warn(`⚠️ Error processing SQL file ${filePath}:`, error);
    }
  }

  private async processConfigFile(filePath: string, result: ProjectScanResult): Promise<void> {
    try {
      const content = await readFile(filePath, 'utf-8');
      const config = await this.configParser.parseConfigFile(filePath, content);
      
      if (config) {
        result.configFiles.push(config);
      }
    } catch (error) {
      console.warn(`⚠️ Error processing config file ${filePath}:`, error);
    }
  }

  private async processMigrationFile(filePath: string, result: ProjectScanResult): Promise<void> {
    try {
      const content = await readFile(filePath, 'utf-8');
      const schema = await this.sqlParser.parseMigrationFile(filePath, content);
      
      if (schema && schema.tables.length > 0) {
        result.extractedSchemas.push(schema);
      }
    } catch (error) {
      console.warn(`⚠️ Error processing migration file ${filePath}:`, error);
    }
  }

  private async processSchemaFile(filePath: string, result: ProjectScanResult): Promise<void> {
    try {
      const content = await readFile(filePath, 'utf-8');
      const schema = await this.sqlParser.parseSchemaFile(filePath, content);
      
      if (schema && schema.tables.length > 0) {
        result.extractedSchemas.push(schema);
      }
    } catch (error) {
      console.warn(`⚠️ Error processing schema file ${filePath}:`, error);
    }
  }

  private async processORMModelFile(filePath: string, result: ProjectScanResult, language: string): Promise<void> {
    try {
      const content = await readFile(filePath, 'utf-8');
      const schemas = await this.ormParser.parseORMModels(filePath, content, language);
      
      result.extractedSchemas.push(...schemas);
    } catch (error) {
      console.warn(`⚠️ Error processing ORM model file ${filePath}:`, error);
    }
  }

  private async extractSchemaFromDatabase(filePath: string): Promise<ExtractedSchema | null> {
    // This would integrate with the existing database connection system
    // For now, return null - this will be implemented in the database integration
    return null;
  }

  private async detectProjectType(uploadPath: string): Promise<string> {
    try {
      const files = await this.scanDirectory(uploadPath, {});
      const fileNames = files.map(f => basename(f).toLowerCase());
      
      // Check for framework-specific files
      if (fileNames.includes('package.json')) return 'nodejs';
      if (fileNames.includes('requirements.txt') || fileNames.includes('setup.py')) return 'python';
      if (fileNames.includes('manage.py') || fileNames.includes('settings.py')) return 'django';
      if (fileNames.includes('artisan') || fileNames.includes('composer.json')) return 'laravel';
      if (fileNames.includes('next.config.js') || fileNames.includes('pages')) return 'nextjs';
      if (fileNames.includes('pom.xml') || fileNames.includes('build.gradle')) return 'java';
      if (fileNames.includes('pom.xml') || fileNames.includes('build.gradle')) return 'java';
      if (fileNames.includes('Cargo.toml')) return 'rust';
      if (fileNames.includes('go.mod')) return 'go';
      
      return 'unknown';
    } catch (error) {
      console.warn('Error detecting project type:', error);
      return 'unknown';
    }
  }

  private async extractProjectName(uploadPath: string): Promise<string> {
    return basename(uploadPath);
  }

  private calculateProjectConfidence(uploadPath: string, projectType: string): number {
    // Simple confidence calculation based on project type detection
    return projectType === 'unknown' ? 0.3 : 0.8;
  }

  private calculateFinalConfidence(result: ProjectScanResult): number {
    let confidence = result.confidence;
    
    // Boost confidence based on findings
    if (result.extractedSchemas.length > 0) confidence += 0.1;
    if (result.databaseFiles.length > 0) confidence += 0.1;
    if (result.configFiles.length > 0) confidence += 0.05;
    
    return Math.min(confidence, 1.0);
  }

  private shouldIgnore(filePath: string, ignorePatterns: string[]): boolean {
    const fileName = basename(filePath);
    return ignorePatterns.some(pattern => {
      if (pattern.includes('*')) {
        const regex = new RegExp(pattern.replace(/\*/g, '.*'));
        return regex.test(fileName);
      }
      return fileName === pattern || filePath.includes(pattern);
    });
  }

  private isConfigFile(fileName: string): boolean {
    return this.CONFIG_PATTERNS.some(pattern => fileName === pattern);
  }

  private isMigrationFile(filePath: string): boolean {
    const pathParts = filePath.split(/[/\\]/);
    return this.MIGRATION_PATHS.some(pattern => 
      pathParts.some(part => part.toLowerCase().includes(pattern.toLowerCase()))
    );
  }

  private isSchemaFile(filePath: string): boolean {
    const pathParts = filePath.split(/[/\\]/);
    return this.SCHEMA_PATHS.some(pattern => 
      pathParts.some(part => part.toLowerCase().includes(pattern.toLowerCase()))
    );
  }

  private detectLanguage(filePath: string): string | null {
    const ext = extname(filePath).toLowerCase();
    
    for (const [language, extensions] of Object.entries(this.LANGUAGE_PATTERNS)) {
      if (extensions.includes(ext)) {
        return language;
      }
    }
    
    return null;
  }

  private async isZipFile(filePath: string): Promise<boolean> {
    try {
      const stats = await stat(filePath);
      return stats.isFile() && filePath.toLowerCase().endsWith('.zip');
    } catch {
      return false;
    }
  }

  private async extractZipFile(zipPath: string): Promise<string> {
    const extractDir = join(dirname(zipPath), `extracted_${Date.now()}`);
    await mkdir(extractDir, { recursive: true });
    
    try {
      // Use adm-zip for extraction
      const AdmZip = require('adm-zip');
      const zip = new AdmZip(zipPath);
      
      // Extract all files
      zip.extractAllTo(extractDir, true);
      
      console.log(`📦 Extracted zip file ${zipPath} to ${extractDir}`);
      
      // List extracted files for debugging
      const extractedFiles = await readdir(extractDir, { withFileTypes: true });
      console.log(`📦 Extracted ${extractedFiles.length} items:`, extractedFiles.map(f => f.name));
      
      return extractDir;
    } catch (error) {
      console.error('❌ Error extracting zip file:', error);
      throw error;
    }
  }
}

export interface ScanOptions {
  ignorePatterns?: string[];
  maxFileSize?: number;
  includeHidden?: boolean;
  depth?: number;
}

export default AdvancedProjectScanner;
