// Project Detection Utility
// Analyzes project files to detect project type, dependencies, and database configurations

import {
  ProjectType,
  ProjectDetectionResult,
  ProjectMetadata,
  DatabaseConnection,
  ConfigFile,
  ConfigFileType,
  DatabaseType,
  ProjectUploadOptions
} from '@/types/project';

export class ProjectDetector {
  private static readonly DETECTION_PATTERNS = {
    nodejs: [
      { file: 'package.json', weight: 100 },
      { file: 'node_modules', weight: 80 },
      { file: 'yarn.lock', weight: 60 },
      { file: 'package-lock.json', weight: 60 },
      { file: 'tsconfig.json', weight: 40 },
      { file: 'next.config.js', weight: 50 },
      { file: '.nvmrc', weight: 20 }
    ],
    python: [
      { file: 'requirements.txt', weight: 100 },
      { file: 'setup.py', weight: 90 },
      { file: 'Pipfile', weight: 80 },
      { file: 'pyproject.toml', weight: 80 },
      { file: '__init__.py', weight: 40 },
      { file: 'manage.py', weight: 60 }, // Django
      { file: 'app.py', weight: 30 },
      { file: 'main.py', weight: 30 }
    ],
    django: [
      { file: 'manage.py', weight: 100 },
      { file: 'settings.py', weight: 100 },
      { file: 'urls.py', weight: 80 },
      { file: 'wsgi.py', weight: 60 },
      { file: 'asgi.py', weight: 60 }
    ],
    flask: [
      { file: 'app.py', weight: 80 },
      { file: 'application.py', weight: 80 },
      { file: 'wsgi.py', weight: 60 }
    ],
    fastapi: [
      { file: 'main.py', weight: 60 },
      { pattern: /from fastapi import/, weight: 100 }
    ],
    laravel: [
      { file: 'artisan', weight: 100 },
      { file: 'composer.json', weight: 90 },
      { file: 'config/database.php', weight: 80 },
      { file: 'app/Http/Controllers', weight: 60 }
    ],
    rails: [
      { file: 'Gemfile', weight: 100 },
      { file: 'config/database.yml', weight: 90 },
      { file: 'config/routes.rb', weight: 80 },
      { file: 'app/controllers', weight: 60 }
    ],
    spring: [
      { file: 'pom.xml', weight: 90 },
      { file: 'build.gradle', weight: 90 },
      { file: 'application.properties', weight: 70 },
      { file: 'application.yml', weight: 70 }
    ],
    dotnet: [
      { file: '*.csproj', weight: 100 },
      { file: 'Program.cs', weight: 60 },
      { file: 'Startup.cs', weight: 60 },
      { file: 'appsettings.json', weight: 50 }
    ],
    react: [
      { file: 'src/App.js', weight: 60 },
      { file: 'src/index.js', weight: 50 },
      { file: 'public/index.html', weight: 40 },
      { file: 'src/components', weight: 30 }
    ],
    vue: [
      { file: 'src/App.vue', weight: 60 },
      { file: 'src/main.js', weight: 50 },
      { file: 'public/index.html', weight: 40 },
      { file: 'src/components', weight: 30 }
    ],
    angular: [
      { file: 'angular.json', weight: 100 },
      { file: 'src/app/app.module.ts', weight: 80 },
      { file: 'src/main.ts', weight: 60 }
    ],
    nextjs: [
      { file: 'package.json', weight: 50 },
      { file: 'next.config.js', weight: 80 },
      { file: 'pages', weight: 60 },
      { file: 'src/app', weight: 60 }
    ]
  };

  private static readonly DATABASE_CONFIG_PATTERNS = {
    sqlite: [
      { pattern: /\.db$|\.sqlite$|\.sqlite3$/, weight: 100 },
      { pattern: /sqlite.*database/i, weight: 80 },
      { pattern: /DATABASE_URL.*sqlite/i, weight: 90 },
      { pattern: /filename.*\.db|\.sqlite|\.sqlite3/i, weight: 90 }
    ],
    postgresql: [
      { pattern: /postgresql|postgres/i, weight: 90 },
      { pattern: /DATABASE_URL.*postgres/i, weight: 90 },
      { pattern: /PGHOST|PGPORT|PGDATABASE/i, weight: 70 }
    ],
    mysql: [
      { pattern: /mysql|mariadb/i, weight: 90 },
      { pattern: /DATABASE_URL.*mysql/i, weight: 90 },
      { pattern: /MYSQL_HOST|MYSQL_PORT/i, weight: 70 }
    ],
    mongodb: [
      { pattern: /mongodb/i, weight: 90 },
      { pattern: /MONGODB_URI/i, weight: 90 },
      { pattern: /MONGO_HOST|MONGO_PORT/i, weight: 70 }
    ],
    redis: [
      { pattern: /redis/i, weight: 80 },
      { pattern: /REDIS_URL/i, weight: 80 }
    ]
  };

  private static readonly CONFIG_FILE_TYPES: Record<string, ConfigFileType> = {
    'package.json': 'package.json',
    'requirements.txt': 'requirements.txt',
    'Pipfile': 'requirements.txt',
    'pyproject.toml': 'requirements.txt',
    'composer.json': 'composer.json',
    'Gemfile': 'Gemfile',
    'config/database.php': 'config/database.php',
    'settings.py': 'settings.py',
    'application.yml': 'application.yml',
    'application.properties': 'application.properties',
    'config/database.yml': 'config/database.php',
    '.env': '.env',
    '.env.local': '.env.local',
    'config.json': 'config.json',
    'database.json': 'database.json',
    'db.config.js': 'db.config.js'
  };

  /**
   * Detect project type and configuration from file list
   */
  static async detectProject(
    fileList: string[],
    options: ProjectUploadOptions = {
      includeHidden: false,
      maxDepth: 5,
      ignorePatterns: ['node_modules', '.git', 'dist', 'build'],
      scanTimeout: 30000
    }
  ): Promise<ProjectDetectionResult> {
    const startTime = Date.now();

    try {
      // Filter files based on options
      const filteredFiles = this.filterFiles(fileList, options);

      // Detect project type
      const projectTypeResult = this.detectProjectType(filteredFiles);

      // Detect databases
      const databases = await this.detectDatabases(filteredFiles);

      // Detect config files
      const configFiles = await this.detectConfigFiles(filteredFiles);

      // Extract metadata
      const metadata = await this.extractMetadata(filteredFiles, projectTypeResult.type);

      const confidence = Math.min(projectTypeResult.confidence, 100);
      const indicators = projectTypeResult.indicators;

      return {
        projectType: projectTypeResult.type,
        confidence,
        indicators,
        databases,
        configFiles,
        metadata
      };
    } catch (error) {
      console.error('Project detection failed:', error);
      return {
        projectType: 'unknown',
        confidence: 0,
        indicators: [],
        databases: [],
        configFiles: [],
        metadata: {}
      };
    }
  }

  /**
   * Filter files based on upload options
   */
  private static filterFiles(files: string[], options: ProjectUploadOptions): string[] {
    return files.filter(file => {
      // Skip hidden files if not included
      if (!options.includeHidden && file.includes('/.')) {
        return false;
      }

      // Check depth
      const depth = file.split('/').length;
      if (depth > options.maxDepth) {
        return false;
      }

      // Check ignore patterns
      for (const pattern of options.ignorePatterns) {
        if (file.includes(pattern)) {
          return false;
        }
      }

      return true;
    });
  }

  /**
   * Detect project type based on file patterns
   */
  private static detectProjectType(files: string[]): {
    type: ProjectType;
    confidence: number;
    indicators: string[];
  } {
    const scores: Record<ProjectType, { score: number; indicators: string[] }> = {} as any;

    // Initialize scores
    Object.keys(this.DETECTION_PATTERNS).forEach(type => {
      scores[type as ProjectType] = { score: 0, indicators: [] };
    });

    // Score each file against patterns
    for (const file of files) {
      for (const [projectType, patterns] of Object.entries(this.DETECTION_PATTERNS)) {
        for (const pattern of patterns) {
          let matches = false;

          if (pattern.file) {
            if (pattern.file.includes('*')) {
              // Handle wildcards
              const regex = new RegExp(pattern.file.replace(/\*/g, '.*'));
              matches = regex.test(file);
            } else {
              matches = file.includes(pattern.file);
            }
          } else if (pattern.pattern) {
            matches = pattern.pattern.test(file);
          }

          if (matches) {
            scores[projectType as ProjectType].score += pattern.weight;
            scores[projectType as ProjectType].indicators.push(file);
          }
        }
      }
    }

    // Find the highest scoring project type
    let bestType: ProjectType = 'unknown';
    let bestScore = 0;
    let bestIndicators: string[] = [];

    for (const [type, result] of Object.entries(scores)) {
      if (result.score > bestScore) {
        bestScore = result.score;
        bestType = type as ProjectType;
        bestIndicators = result.indicators;
      }
    }

    // Normalize confidence to 0-100
    const confidence = Math.min(bestScore, 100);

    return {
      type: bestType,
      confidence,
      indicators: bestIndicators
    };
  }

  /**
   * Detect database configurations
   */
  private static async detectDatabases(files: string[]): Promise<DatabaseConnection[]> {
    const databases: DatabaseConnection[] = [];
    const dbFiles = new Map<DatabaseType, string[]>();

    // First, detect actual database files (SQLite, etc.)
    for (const file of files) {
      if (file.endsWith('.db') || file.endsWith('.sqlite') || file.endsWith('.sqlite3')) {
        if (!dbFiles.has('sqlite')) {
          dbFiles.set('sqlite', []);
        }
        dbFiles.get('sqlite')!.push(file);
      }
    }

    // Then, detect configuration patterns in files
    for (const file of files) {
      for (const [dbType, patterns] of Object.entries(this.DATABASE_CONFIG_PATTERNS)) {
        for (const pattern of patterns) {
          if (pattern.pattern.test(file)) {
            if (!dbFiles.has(dbType as DatabaseType)) {
              dbFiles.set(dbType as DatabaseType, []);
            }
            if (!dbFiles.get(dbType as DatabaseType)!.includes(file)) {
              dbFiles.get(dbType as DatabaseType)!.push(file);
            }
            break;
          }
        }
      }
    }

    // Also detect based on project type and config files
    const projectType = this.detectProjectType(files);
    for (const file of files) {
      if (file.includes('settings.py') && projectType.type === 'django') {
        if (!dbFiles.has('postgresql')) {
          dbFiles.set('postgresql', []);
        }
        if (!dbFiles.get('postgresql')!.includes(file)) {
          dbFiles.get('postgresql')!.push(file);
        }
      }

      if (file.includes('config/database.php') && projectType.type === 'laravel') {
        if (!dbFiles.has('mysql')) {
          dbFiles.set('mysql', []);
        }
        if (!dbFiles.get('mysql')!.includes(file)) {
          dbFiles.get('mysql')!.push(file);
        }
      }
    }

    // Create database connections
    for (const [dbType, dbFileList] of dbFiles) {
      const config = await this.extractDatabaseConfig(dbType as DatabaseType, dbFileList);
      if (config) {
        databases.push({
          id: `db_${dbType}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          type: dbType as DatabaseType,
          name: `${dbType.charAt(0).toUpperCase() + dbType.slice(1)} Database`,
          config,
          status: 'disconnected',
          syncEnabled: true,
          syncDirection: 'bidirectional'
        });
      }
    }

    return databases;
  }

  /**
   * Extract database configuration from files
   */
  private static async extractDatabaseConfig(
    type: DatabaseType,
    files: string[]
  ): Promise<any> {
    // First, check if we have actual database files
    if (type === 'sqlite') {
      const sqliteFile = files.find(f => f.endsWith('.db') || f.endsWith('.sqlite') || f.endsWith('.sqlite3'));
      if (sqliteFile) {
        return {
          filePath: sqliteFile
        };
      }
    }

    // For other types, look for configuration patterns
    // This would parse actual config files - for now, return basic configs
    switch (type) {
      case 'sqlite':
        // Check if we have a specific SQLite file
        const sqliteFile = files.find(f => f.endsWith('.db') || f.endsWith('.sqlite') || f.endsWith('.sqlite3'));
        return {
          filePath: sqliteFile || './database.sqlite'
        };
      case 'postgresql':
        return {
          host: 'localhost',
          port: 5432,
          database: 'analytics_db',
          username: 'analytics_user',
          password: 'analytics_password'
        };
      case 'mysql':
        return {
          host: 'localhost',
          port: 3306,
          database: 'laravel_blog',
          username: 'blog_user',
          password: 'blog_password'
        };
      case 'mongodb':
        return {
          connectionString: 'mongodb://localhost:27017/database'
        };
      case 'redis':
        return {
          host: 'localhost',
          port: 6379
        };
      default:
        return null;
    }
  }

  /**
   * Detect configuration files
   */
  private static async detectConfigFiles(files: string[]): Promise<ConfigFile[]> {
    const configFiles: ConfigFile[] = [];

    for (const file of files) {
      const configType = this.getConfigFileType(file);
      if (configType) {
        configFiles.push({
          path: file,
          type: configType,
          lastModified: new Date()
        });
      }
    }

    return configFiles;
  }

  /**
   * Get configuration file type from path
   */
  private static getConfigFileType(filePath: string): ConfigFileType | null {
    for (const [pattern, type] of Object.entries(this.CONFIG_FILE_TYPES)) {
      if (filePath.includes(pattern)) {
        return type;
      }
    }
    return null;
  }

  /**
   * Extract project metadata
   */
  private static async extractMetadata(
    files: string[],
    projectType: ProjectType
  ): Promise<Partial<ProjectMetadata>> {
    const metadata: Partial<ProjectMetadata> = {};

    // Extract version and dependencies based on project type
    switch (projectType) {
      case 'nodejs':
        const packageJson = files.find(f => f.includes('package.json'));
        if (packageJson) {
          // Would parse package.json here
          metadata.packageManager = 'npm';
          metadata.language = 'javascript';
        }
        break;

      case 'python':
        const requirements = files.find(f => f.includes('requirements.txt'));
        if (requirements) {
          metadata.packageManager = 'pip';
          metadata.language = 'python';
        }
        break;

      case 'laravel':
      case 'php':
        metadata.language = 'php';
        metadata.packageManager = 'composer';
        break;

      case 'rails':
        metadata.language = 'ruby';
        metadata.packageManager = 'bundler';
        break;
    }

    metadata.dependencies = [];
    metadata.scripts = {};
    metadata.environment = 'development';

    return metadata;
  }

  /**
   * Validate detection result
   */
  static validateDetection(result: ProjectDetectionResult): {
    isValid: boolean;
    issues: string[];
  } {
    const issues: string[] = [];

    if (result.confidence < 30) {
      issues.push('Low confidence in project type detection');
    }

    if (result.databases.length === 0) {
      issues.push('No databases detected');
    }

    if (result.configFiles.length === 0) {
      issues.push('No configuration files detected');
    }

    return {
      isValid: issues.length === 0,
      issues
    };
  }
}
