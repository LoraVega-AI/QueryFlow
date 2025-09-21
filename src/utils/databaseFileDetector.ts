import { readdir, stat } from 'fs/promises';
import path from 'path';
import DatabaseConverter, { DatabaseConversionResult } from './databaseConverter';

// Comprehensive list of database-related file extensions
const DATABASE_FILE_EXTENSIONS = {
  // SQLite and embedded databases
  sqlite: ['.db', '.sqlite', '.sqlite3', '.db3', '.s3db', '.sl3'],
  
  // MySQL database files
  mysql: ['.frm', '.ibd', '.myd', '.myi', '.mrg'],
  
  // PostgreSQL database files
  postgresql: ['.sql', '.dump', '.backup'],
  
  // MongoDB database files
  mongodb: ['.bson', '.json', '.mongodb'],
  
  // Microsoft databases
  microsoft: ['.mdb', '.accdb', '.accde', '.accdr', '.mdf', '.ldf', '.ndf'],
  
  // Oracle database files
  oracle: ['.dmp', '.dbf', '.ora'],
  
  // NoSQL and key-value stores
  nosql: [
    // Redis
    '.rdb', '.aof', 
    // Cassandra
    '.cql', '.cqlsh', 
    // RocksDB
    '.rocksdb', '.sst', 
    // LevelDB
    '.ldb', '.log', 
    // Berkeley DB
    '.dat'
  ],
  
  // Other database-related files
  other: [
    // dBase
    '.dbf', '.ndx', '.mdx', 
    // KeePass
    '.kdbx', '.kdb', 
    // Backup files
    '.bak', '.backup', '.dump', '.sql'
  ]
};

// ORM and schema-related file patterns
const ORM_FILE_PATTERNS = {
  // Migration folders
  migrations: ['migrations', 'db/migrations', 'database/migrations'],
  
  // Schema files
  schemas: [
    'schema.rb',   // Ruby on Rails
    'schema.prisma', // Prisma
    'schema.json',   // JSON schema
    'schema.yml',   // YAML schema
    'schema.yaml'
  ],
  
  // Model folders
  models: ['models', 'entities', 'orm', 'database/models']
};

// Configuration and environment files
const CONFIG_FILE_EXTENSIONS = [
  '.prisma',   // Prisma schema
  '.sql',      // SQL scripts and schema files
  '.json',     // JSON data stores, configs
  '.yaml', '.yml', // Database configuration files
  '.toml',     // Configuration files
  '.env',      // Environment files with connection strings
  '.conf', '.cfg', // Configuration files
  '.xml'       // Configuration and schema files
];

// Programming language files with embedded database content
const LANGUAGE_FILE_EXTENSIONS = {
  javascript: ['.js', '.ts', '.jsx', '.tsx'],
  python: ['.py'],
  php: ['.php'],
  ruby: ['.rb'],
  java: ['.java'],
  csharp: ['.cs'],
  go: ['.go']
};

// IGNORE patterns for directories we should not traverse
const IGNORE_DIRECTORIES = [
  'node_modules',
  '.git',
  'dist',
  'build',
  'vendor',
  'coverage',
  '.next',
  '.cache',
  'logs'
];

export class DatabaseFileDetector {
  /**
   * Recursively find all database-related files in a directory
   * @param dir Directory to search
   * @returns Array of database-related file paths
   */
  static async findDatabaseFiles(dir: string): Promise<string[]> {
    const databaseFiles: string[] = [];

    // Attempt to read ignore patterns from a .gitignore (best-effort – simple prefix match)
    let ignorePatterns: string[] = [];
    try {
      const fs = await import('fs/promises');
      const gitignorePath = path.join(dir, '.gitignore');
      const gitStats = await fs.stat(gitignorePath).catch(() => null);
      if (gitStats && gitStats.isFile()) {
        const gitignoreContent = await fs.readFile(gitignorePath, 'utf-8');
        ignorePatterns = gitignoreContent
          .split('\n')
          .map(line => line.trim())
          .filter(line => line && !line.startsWith('#'));
      }
    } catch {
      // ignore errors – fallback to defaults only
    }
 
    async function searchRecursively(currentDir: string): Promise<void> {
      const entries = await readdir(currentDir, { withFileTypes: true });
 
      for (const entry of entries) {
        const fullPath = path.join(currentDir, entry.name);

        // Skip ignored directories or paths matched by .gitignore patterns (simple test)
        const relativePath = path.relative(dir, fullPath).replace(/\\/g, '/');
        if (
          (entry.isDirectory() && IGNORE_DIRECTORIES.includes(entry.name)) ||
          ignorePatterns.some(pattern => relativePath.startsWith(pattern))
        ) {
          continue;
        }
        
        if (entry.isDirectory()) {
          // Check for ORM-related directories (still traverse inside to inspect files)
          if (ORM_FILE_PATTERNS.migrations.includes(entry.name) ||
              ORM_FILE_PATTERNS.models.includes(entry.name)) {
            const migrationFiles = await DatabaseFileDetector.findDatabaseFiles(fullPath);
            databaseFiles.push(...migrationFiles);
          } else if (entry.name !== 'node_modules' && entry.name !== '.git') {
            // Recursively search other directories
            await searchRecursively(fullPath);
          }
        } else {
          // Check file extensions
          const ext = path.extname(entry.name).toLowerCase();
          const fileName = entry.name.toLowerCase();
          
          // Check database file extensions
          for (const category of Object.values(DATABASE_FILE_EXTENSIONS)) {
            if (category.includes(ext)) {
              databaseFiles.push(fullPath);
              break;
            }
          }
          
          // Check configuration file extensions
          if (CONFIG_FILE_EXTENSIONS.includes(ext)) {
            databaseFiles.push(fullPath);
          }
          
          // Check ORM schema files
          if (ORM_FILE_PATTERNS.schemas.includes(fileName)) {
            databaseFiles.push(fullPath);
          }
 
          // Language-agnostic embedded database detection on reasonably small files (<=1 MB)
          const fileStats = await stat(fullPath);
          if (fileStats.size > 0 && fileStats.size < 1024 * 1024) {
            const content = await DatabaseFileDetector.checkEmbeddedDatabaseContent(fullPath);
            if (content) {
              databaseFiles.push(fullPath);
            }
          }
        }
      }
    }
    
    await searchRecursively(dir);
    return databaseFiles;
  }
  
  /**
   * Check for embedded database content in source code files
   * @param filePath Path to the source code file
   * @returns Detected database content or null
   */
  static async checkEmbeddedDatabaseContent(filePath: string): Promise<string | null> {
    // Import fs/promises dynamically to avoid issues in browser environments
    const fs = await import('fs/promises');
    
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      
      // Regex patterns for detecting database-related content
      const databasePatterns = [
        // SQLite in-memory or connection strings
        /sqlite:\/\/|sqlite3?\.connect\(/,
        
        // ORM and database model definitions
        /class\s+\w+Model\s*\{/,
        /export\s+const\s+\w+Schema\s*=\s*/,
        
        // Database connection configurations
        /connection\s*[:=]\s*{[\s\S]*?database/,
        /database\s*[:=]\s*['"][^'"]+['"]/,
        /connectionString\s*=/,
        
        // SQL query or schema definitions
        /CREATE\s+(TABLE|INDEX)|INSERT\s+INTO|SELECT\s+\*\s+FROM|ALTER\s+TABLE|DROP\s+TABLE/i,
        
        // NoSQL database operations
        /mongoose\.model\(/i,
        /Sequelize\.define/i,
        /ActiveRecord::Base/,
        /Entity\s*\(/i,
        
        // Database migration or schema creation
        /migration\s*\(\s*table\s*=>/
      ];
      
      // Check if any pattern matches
      for (const pattern of databasePatterns) {
        if (pattern.test(content)) {
          return content;
        }
      }
      
      return null;
    } catch (error) {
      console.error(`Error checking embedded database content in ${filePath}:`, error);
      return null;
    }
  }
  
  /**
   * Convert detected database files to a compatible format
   * @param databaseFiles Array of database file paths
   * @param targetDir Target directory for converted files
   * @returns Converted database files with enhanced metadata
   */
  static async convertDatabaseFiles(databaseFiles: string[], targetDir?: string): Promise<any[]> {
    const convertedDatabases: any[] = [];
    const converter = DatabaseConverter.getInstance();

    console.log(`🔄 Starting conversion of ${databaseFiles.length} database files...`);

    for (const filePath of databaseFiles) {
      const startTime = Date.now();
      try {
        console.log(`🔄 Processing database file: ${filePath}`);

        // Determine database type based on file extension
        const ext = path.extname(filePath).toLowerCase();
        const fileName = path.basename(filePath);

        // Default to SQLite for unknown types
        const dbType = this.getDatabaseType(ext);

        // Basic database file info
        const dbInfo = {
          id: `db_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          name: fileName.replace(ext, ''),
          type: dbType,
          filePath: filePath,
          originalExtension: ext,
          size: (await stat(filePath)).size,
          status: 'processing',
          processingStartTime: new Date().toISOString(),
          conversionLogs: [] as string[]
        };

        // Log conversion start
        dbInfo.conversionLogs.push(`[${new Date().toISOString()}] Starting conversion of ${dbType} file: ${fileName}`);

        // Handle different database types
        if (dbType === 'sqlite') {
          // Test SQLite database directly
          const testResult = await this.testSQLiteDatabase(filePath);
          if (testResult.success) {
            (dbInfo as any)['tables'] = testResult.tables || [];
            (dbInfo as any)['schema'] = testResult.schema || null;
            dbInfo.status = 'ready';
            dbInfo.conversionLogs.push(`[${new Date().toISOString()}] SQLite database validated successfully`);
          } else {
            dbInfo.status = 'error';
            dbInfo.conversionLogs.push(`[${new Date().toISOString()}] SQLite validation failed: ${(testResult as any).error || 'Unknown error'}`);
          }
        } else if (dbType !== 'unknown') {
          // Attempt conversion for other database types
          const conversionResult = await converter.convertToSQLite(filePath, dbType);

          if (conversionResult.success && conversionResult.convertedPath) {
            // Update database info with converted file
            dbInfo.filePath = conversionResult.convertedPath;
            dbInfo.type = 'sqlite'; // Now it's SQLite
            (dbInfo as any).conversionMetadata = conversionResult.metadata;

            // Test the converted SQLite database
            const testResult = await this.testSQLiteDatabase(conversionResult.convertedPath);
            if (testResult.success) {
              (dbInfo as any)['tables'] = testResult.tables || [];
              (dbInfo as any)['schema'] = testResult.schema || null;
              dbInfo.status = 'ready';
              dbInfo.conversionLogs.push(`[${new Date().toISOString()}] Successfully converted ${dbType} to SQLite`);
              dbInfo.conversionLogs.push(`[${new Date().toISOString()}] Original size: ${conversionResult.metadata?.originalSize} bytes`);
              dbInfo.conversionLogs.push(`[${new Date().toISOString()}] Converted size: ${conversionResult.metadata?.convertedSize} bytes`);
            } else {
              dbInfo.status = 'error';
              dbInfo.conversionLogs.push(`[${new Date().toISOString()}] Conversion successful but SQLite validation failed`);
            }
          } else {
            dbInfo.status = 'error';
            dbInfo.conversionLogs.push(`[${new Date().toISOString()}] Conversion failed: ${(conversionResult as any).error}`);
          }
        } else {
          // Handle config files and embedded content
          if (ext === '.json' || ext === '.yaml' || ext === '.yml' || ext === '.toml') {
            (dbInfo as any)['configContent'] = await this.parseConfigFile(filePath);
            dbInfo.status = 'ready';
            dbInfo.conversionLogs.push(`[${new Date().toISOString()}] Configuration file parsed successfully`);
          } else if (this.isSourceCodeFile(ext)) {
            const embeddedContent = await this.extractEmbeddedDatabaseContent(filePath);
            if (embeddedContent) {
              (dbInfo as any)['embeddedContent'] = embeddedContent;
              dbInfo.status = 'ready';
              dbInfo.conversionLogs.push(`[${new Date().toISOString()}] Embedded database content extracted`);
            } else {
              dbInfo.status = 'skipped';
              dbInfo.conversionLogs.push(`[${new Date().toISOString()}] No embedded database content found`);
            }
          } else {
            dbInfo.status = 'unknown';
            dbInfo.conversionLogs.push(`[${new Date().toISOString()}] Unknown database file type`);
          }
        }

        // Calculate processing time
        const processingTime = Date.now() - startTime;
        (dbInfo as any).processingTime = processingTime;
        dbInfo.conversionLogs.push(`[${new Date().toISOString()}] Processing completed in ${processingTime}ms`);

        convertedDatabases.push(dbInfo);
        console.log(`✅ Processed ${fileName} in ${processingTime}ms - Status: ${dbInfo.status}`);

      } catch (error) {
        const processingTime = Date.now() - startTime;
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';

        console.error(`❌ Error processing database file ${filePath}:`, error);

        // Create error database info
        const fileName = path.basename(filePath);
        const ext = path.extname(filePath);
        const dbType = this.getDatabaseType(ext);
        const errorDbInfo = {
          id: `db_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          name: fileName.replace(ext, ''),
          type: dbType,
          filePath: filePath,
          originalExtension: ext,
          size: 0,
          status: 'error',
          error: errorMessage,
          processingTime: processingTime,
          conversionLogs: [
            `[${new Date().toISOString()}] Starting conversion of ${dbType} file: ${fileName}`,
            `[${new Date().toISOString()}] Error occurred: ${errorMessage}`,
            `[${new Date().toISOString()}] Processing failed after ${processingTime}ms`
          ]
        };

        convertedDatabases.push(errorDbInfo);
      }
    }

    // Summary logging
    const successCount = convertedDatabases.filter(db => db.status === 'ready').length;
    const errorCount = convertedDatabases.filter(db => db.status === 'error').length;
    const skippedCount = convertedDatabases.filter(db => db.status === 'skipped').length;

    console.log(`📊 Database conversion summary:`);
    console.log(`   ✅ Successfully converted: ${successCount}`);
    console.log(`   ❌ Failed conversions: ${errorCount}`);
    console.log(`   ⏭️ Skipped files: ${skippedCount}`);
    console.log(`   📁 Total processed: ${convertedDatabases.length}`);

    return convertedDatabases;
  }
  
  /**
   * Determine database type based on file extension
   * @param ext File extension
   * @returns Database type
   */
  static getDatabaseType(ext: string): string {
    for (const [type, extensions] of Object.entries(DATABASE_FILE_EXTENSIONS)) {
      if (extensions.includes(ext)) return type;
    }
    
    if (CONFIG_FILE_EXTENSIONS.includes(ext)) return 'config';
    
    return 'unknown';
  }
  
  
  /**
   * Parse configuration files
   * @param filePath Path to configuration file
   */
  static async parseConfigFile(filePath: string): Promise<any> {
    const fs = await import('fs/promises');
    const ext = path.extname(filePath).toLowerCase();
    
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      
      switch (ext) {
        case '.json':
          return JSON.parse(content);
        case '.yaml':
        case '.yml':
          const yaml = await import('js-yaml');
          return yaml.load(content);
        case '.toml':
          const toml = await import('toml');
          return toml.parse(content);
        default:
          return content;
      }
    } catch (error) {
      console.error(`Error parsing configuration file ${filePath}:`, error);
      return null;
    }
  }
  
  /**
   * Extract embedded database content from source code files
   * @param filePath Path to source code file
   */
  static async extractEmbeddedDatabaseContent(filePath: string): Promise<string | null> {
    return this.checkEmbeddedDatabaseContent(filePath);
  }

  /**
   * Check if file extension is a source code file
   * @param ext File extension
   * @returns True if it's a source code file
   */
  static isSourceCodeFile(ext: string): boolean {
    const sourceCodeExtensions = [
      '.js', '.ts', '.jsx', '.tsx', '.py', '.php', '.rb', '.java', '.cs', '.go'
    ];

    return sourceCodeExtensions.includes(ext);
  }

  /**
   * Test SQLite database file (placeholder - replace with actual implementation)
   * @param filePath Path to SQLite database file
   */
  static async testSQLiteDatabase(filePath: string): Promise<{ success: boolean; tables?: any[]; schema?: any; error?: string }> {
    // Placeholder implementation - replace with actual SQLite testing logic
    try {
      // Basic file validation
      const stats = await stat(filePath);
      if (stats.size === 0) {
        return { success: false, error: 'Empty database file' };
      }

      // This would be replaced with actual SQLite database testing
      // For now, assume it's a valid SQLite file if it has the right extension
      return {
        success: true,
        tables: [],
        schema: null
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
}

export default DatabaseFileDetector;
