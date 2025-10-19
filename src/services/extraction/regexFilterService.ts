// Regex Filter Service
// Stage 2: Fast pre-filtering using regex patterns to identify database code

import {
  FileInfo,
  FileContent,
  ExtractionCandidate,
  ExtractionOptions,
  RegexPattern,
  RegexMatch,
  SupportedFramework
} from '@/types/extraction';

export class RegexFilterService {
  private readonly patterns: RegexPattern[] = [
    // SQL DDL Patterns
    {
      name: 'create_table',
      pattern: /CREATE\s+TABLE\s+[\w`"'\[\]]+\s*\(/gim,
      frameworks: [],
      confidence: 90,
      description: 'SQL CREATE TABLE statement'
    },
    {
      name: 'alter_table',
      pattern: /ALTER\s+TABLE\s+[\w`"'\[\]]+/gim,
      frameworks: [],
      confidence: 85,
      description: 'SQL ALTER TABLE statement'
    },
    {
      name: 'drop_table',
      pattern: /DROP\s+TABLE\s+[\w`"'\[\]]+/gim,
      frameworks: [],
      confidence: 80,
      description: 'SQL DROP TABLE statement'
    },

    // SQL DML Patterns
    {
      name: 'insert_into',
      pattern: /INSERT\s+INTO\s+[\w`"'\[\]]+/gim,
      frameworks: [],
      confidence: 70,
      description: 'SQL INSERT statement'
    },
    {
      name: 'select_from',
      pattern: /SELECT\s+.*\s+FROM\s+[\w`"'\[\]]+/gim,
      frameworks: [],
      confidence: 60,
      description: 'SQL SELECT statement'
    },

    // JavaScript/TypeScript ORM Patterns
    {
      name: 'sequelize_define',
      pattern: /sequelize\.define\s*\(\s*['"`][\w]+['"`]/gim,
      frameworks: ['sequelize'],
      confidence: 95,
      description: 'Sequelize model definition'
    },
    {
      name: 'sequelize_datatypes',
      pattern: /DataTypes\.\w+/gim,
      frameworks: ['sequelize'],
      confidence: 85,
      description: 'Sequelize DataTypes usage'
    },
    {
      name: 'sequelize_migration',
      pattern: /queryInterface\.(createTable|addColumn|removeColumn|addIndex)/gim,
      frameworks: ['sequelize'],
      confidence: 90,
      description: 'Sequelize migration'
    },
    {
      name: 'mongoose_schema',
      pattern: /new\s+mongoose\.Schema\s*\(/gim,
      frameworks: ['mongoose'],
      confidence: 95,
      description: 'Mongoose schema definition'
    },
    {
      name: 'mongoose_model',
      pattern: /mongoose\.model\s*\(\s*['"`][\w]+['"`]/gim,
      frameworks: ['mongoose'],
      confidence: 90,
      description: 'Mongoose model creation'
    },
    {
      name: 'typeorm_entity',
      pattern: /@Entity\s*\(\s*['"`]?[\w]*['"`]?\s*\)/gim,
      frameworks: ['typeorm'],
      confidence: 95,
      description: 'TypeORM entity decorator'
    },
    {
      name: 'typeorm_column',
      pattern: /@Column\s*\(/gim,
      frameworks: ['typeorm'],
      confidence: 85,
      description: 'TypeORM column decorator'
    },
    {
      name: 'prisma_model',
      pattern: /model\s+\w+\s*\{/gim,
      frameworks: ['prisma'],
      confidence: 95,
      description: 'Prisma model definition'
    },

    // Python ORM Patterns
    {
      name: 'django_model',
      pattern: /class\s+\w+\s*\(\s*models\.Model\s*\)/gim,
      frameworks: ['django'],
      confidence: 95,
      description: 'Django model class'
    },
    {
      name: 'django_field',
      pattern: /models\.\w+Field\s*\(/gim,
      frameworks: ['django'],
      confidence: 85,
      description: 'Django model field'
    },
    {
      name: 'django_migration',
      pattern: /migrations\.CreateModel\s*\(/gim,
      frameworks: ['django'],
      confidence: 90,
      description: 'Django migration operation'
    },
    {
      name: 'sqlalchemy_table',
      pattern: /__tablename__\s*=\s*['"`][\w]+['"`]/gim,
      frameworks: ['sqlalchemy'],
      confidence: 90,
      description: 'SQLAlchemy table name'
    },
    {
      name: 'sqlalchemy_column',
      pattern: /Column\s*\(\s*\w+/gim,
      frameworks: ['sqlalchemy'],
      confidence: 85,
      description: 'SQLAlchemy column definition'
    },
    {
      name: 'alembic_operation',
      pattern: /op\.(create_table|drop_table|add_column|drop_column)/gim,
      frameworks: ['alembic'],
      confidence: 90,
      description: 'Alembic migration operation'
    },

    // PHP ORM Patterns
    {
      name: 'laravel_migration',
      pattern: /Schema::(create|table|drop)\s*\(\s*['"`][\w]+['"`]/gim,
      frameworks: ['laravel'],
      confidence: 90,
      description: 'Laravel migration schema'
    },
    {
      name: 'laravel_eloquent',
      pattern: /extends\s+Model/gim,
      frameworks: ['eloquent'],
      confidence: 80,
      description: 'Laravel Eloquent model'
    },
    {
      name: 'laravel_relationship',
      pattern: /(belongsTo|hasMany|hasOne|belongsToMany)\s*\(/gim,
      frameworks: ['eloquent'],
      confidence: 85,
      description: 'Laravel Eloquent relationship'
    },

    // Java ORM Patterns
    {
      name: 'jpa_entity',
      pattern: /@Entity/gim,
      frameworks: ['jpa', 'hibernate'],
      confidence: 95,
      description: 'JPA Entity annotation'
    },
    {
      name: 'jpa_table',
      pattern: /@Table\s*\(\s*name\s*=\s*['"`][\w]+['"`]/gim,
      frameworks: ['jpa', 'hibernate'],
      confidence: 90,
      description: 'JPA Table annotation'
    },
    {
      name: 'jpa_column',
      pattern: /@Column\s*\(/gim,
      frameworks: ['jpa', 'hibernate'],
      confidence: 85,
      description: 'JPA Column annotation'
    },
    {
      name: 'hibernate_entity',
      pattern: /org\.hibernate\.annotations\.\w+/gim,
      frameworks: ['hibernate'],
      confidence: 85,
      description: 'Hibernate annotation'
    },
    {
      name: 'spring_repository',
      pattern: /@Repository/gim,
      frameworks: ['spring-data'],
      confidence: 80,
      description: 'Spring Repository annotation'
    },

    // Database Connection Patterns
    {
      name: 'sqlite_connection',
      pattern: /sqlite3?\.connect\s*\(/gim,
      frameworks: [],
      confidence: 85,
      description: 'SQLite connection'
    },
    {
      name: 'mysql_connection',
      pattern: /mysql\.createConnection\s*\(/gim,
      frameworks: [],
      confidence: 85,
      description: 'MySQL connection'
    },
    {
      name: 'postgres_connection',
      pattern: /pg\.Client\s*\(|Pool\s*\(/gim,
      frameworks: [],
      confidence: 85,
      description: 'PostgreSQL connection'
    },
    {
      name: 'mongodb_connection',
      pattern: /MongoClient\.connect|mongoose\.connect/gim,
      frameworks: ['mongoose'],
      confidence: 85,
      description: 'MongoDB connection'
    },

    // Configuration Patterns
    {
      name: 'database_config',
      pattern: /database\s*:\s*\{[\s\S]*?\}/gim,
      frameworks: [],
      confidence: 75,
      description: 'Database configuration object'
    },
    {
      name: 'connection_string',
      pattern: /(connectionString|DATABASE_URL)\s*[:=]\s*['"`][^'"`]+['"`]/gim,
      frameworks: [],
      confidence: 80,
      description: 'Database connection string'
    },
    {
      name: 'env_database',
      pattern: /DB_(HOST|USER|PASS|NAME|PORT)\s*[:=]/gim,
      frameworks: [],
      confidence: 70,
      description: 'Environment database variables'
    }
  ];

  /**
   * Filter files to find database definition candidates
   */
  async filterCandidates(files: FileInfo[], options: ExtractionOptions): Promise<ExtractionCandidate[]> {
    const candidates: ExtractionCandidate[] = [];
    const startTime = Date.now();

    console.log(`🎯 Filtering ${files.length} files for database definitions...`);

    // Process files in parallel if enabled
    if (options.parallelProcessing) {
      const batchSize = Math.ceil(files.length / options.maxWorkers);
      const batches = this.createBatches(files, batchSize);
      
      const batchPromises = batches.map(batch => 
        this.processBatch(batch, options)
      );
      
      const batchResults = await Promise.all(batchPromises);
      
      for (const batchCandidates of batchResults) {
        candidates.push(...batchCandidates);
      }
    } else {
      // Sequential processing
      for (const file of files) {
        const fileCandidates = await this.processFile(file, options);
        candidates.push(...fileCandidates);
      }
    }

    // Filter by confidence threshold
    const filteredCandidates = candidates.filter(
      candidate => candidate.confidence >= options.confidence.minimum
    );

    const filterTime = Date.now() - startTime;
    console.log(`🎯 Found ${filteredCandidates.length} candidates in ${filterTime}ms`);

    return filteredCandidates.sort((a, b) => b.confidence - a.confidence);
  }

  /**
   * Process a batch of files
   */
  private async processBatch(files: FileInfo[], options: ExtractionOptions): Promise<ExtractionCandidate[]> {
    const candidates: ExtractionCandidate[] = [];
    
    for (const file of files) {
      try {
        const fileCandidates = await this.processFile(file, options);
        candidates.push(...fileCandidates);
      } catch (error) {
        console.warn(`Failed to process file ${file.path}:`, error instanceof Error ? error.message : 'Unknown error');
      }
    }
    
    return candidates;
  }

  /**
   * Process a single file for database patterns
   */
  private async processFile(file: FileInfo, options: ExtractionOptions): Promise<ExtractionCandidate[]> {
    const candidates: ExtractionCandidate[] = [];
    
    // Skip if file doesn't match target languages/frameworks
    if (!this.shouldProcessFile(file, options)) {
      return candidates;
    }

    try {
      // Read file content (in a real implementation, this would come from the file system)
      const content = await this.readFileContent(file.path);
      const lines = content.split('\n');

      // Get applicable patterns for this file
      const applicablePatterns = this.getApplicablePatterns(file, options);

      for (const pattern of applicablePatterns) {
        const matches = this.findMatches(content, lines, pattern);
        
        for (const match of matches) {
          const candidate = this.createCandidate(file, match, content, lines);
          if (candidate) {
            candidates.push(candidate);
          }
        }
      }

    } catch (error) {
      console.warn(`Failed to read file ${file.path}:`, error instanceof Error ? error.message : 'Unknown error');
    }

    return candidates;
  }

  /**
   * Check if file should be processed based on options
   */
  private shouldProcessFile(file: FileInfo, options: ExtractionOptions): boolean {
    // Check language filter
    if (file.language && !options.languages.includes(file.language)) {
      return false;
    }

    // Check framework filter
    if (file.framework && !options.frameworks.includes(file.framework)) {
      return false;
    }

    // Always process SQL files and config files
    if (['.sql', '.ddl', '.dml', '.prisma', '.json', '.yaml', '.yml'].includes(file.extension)) {
      return true;
    }

    // Process if language is supported
    return file.language !== undefined;
  }

  /**
   * Get patterns applicable to this file
   */
  private getApplicablePatterns(file: FileInfo, options: ExtractionOptions): RegexPattern[] {
    return this.patterns.filter(pattern => {
      // Include patterns with no framework restriction
      if (pattern.frameworks.length === 0) {
        return true;
      }

      // Include if file framework matches pattern frameworks
      if (file.framework && pattern.frameworks.includes(file.framework)) {
        return true;
      }

      // Include if any pattern framework is in options
      return pattern.frameworks.some(fw => options.frameworks.includes(fw));
    });
  }

  /**
   * Find regex matches in content
   */
  private findMatches(content: string, lines: string[], pattern: RegexPattern): RegexMatch[] {
    const matches: RegexMatch[] = [];
    let match: RegExpExecArray | null;

    // Reset regex state
    pattern.pattern.lastIndex = 0;

    while ((match = pattern.pattern.exec(content)) !== null) {
      const startPos = match.index;
      const endPos = startPos + match[0].length;

      // Find line numbers
      const startLine = this.getLineNumber(content, startPos);
      const endLine = this.getLineNumber(content, endPos);

      matches.push({
        pattern,
        match,
        startLine,
        endLine,
        confidence: pattern.confidence
      });

      // Prevent infinite loops with global regex
      if (!pattern.pattern.global) {
        break;
      }
    }

    return matches;
  }

  /**
   * Create extraction candidate from regex match
   */
  private createCandidate(
    file: FileInfo,
    regexMatch: RegexMatch,
    content: string,
    lines: string[]
  ): ExtractionCandidate | null {
    try {
      // Determine candidate type based on pattern
      const type = this.determineType(regexMatch.pattern);

      // Extract surrounding context (5 lines before and after)
      const contextStart = Math.max(0, regexMatch.startLine - 5);
      const contextEnd = Math.min(lines.length - 1, regexMatch.endLine + 5);
      const contextLines = lines.slice(contextStart, contextEnd + 1);
      const contextContent = contextLines.join('\n');

      // Calculate confidence based on pattern and context
      let confidence = regexMatch.confidence;
      
      // Boost confidence for framework-specific patterns
      if (regexMatch.pattern.frameworks.length > 0 && file.framework) {
        if (regexMatch.pattern.frameworks.includes(file.framework)) {
          confidence += 10;
        }
      }

      // Boost confidence for files with strong framework indicators
      if (file.framework && regexMatch.pattern.frameworks.includes(file.framework)) {
        confidence += 5;
      }

      // Cap confidence at 100
      confidence = Math.min(100, confidence);

      const candidate: ExtractionCandidate = {
        file,
        type,
        confidence,
        startLine: regexMatch.startLine,
        endLine: regexMatch.endLine,
        content: contextContent,
        framework: file.framework,
        metadata: {
          pattern: regexMatch.pattern.name,
          match: regexMatch.match[0],
          contextStart,
          contextEnd,
          description: regexMatch.pattern.description
        }
      };

      return candidate;

    } catch (error) {
      console.warn(`Failed to create candidate:`, error instanceof Error ? error.message : 'Unknown error');
      return null;
    }
  }

  /**
   * Determine candidate type from pattern
   */
  private determineType(pattern: RegexPattern): ExtractionCandidate['type'] {
    if (pattern.name.includes('model') || pattern.name.includes('entity')) {
      return 'model';
    }
    
    if (pattern.name.includes('migration') || pattern.name.includes('create_table') || 
        pattern.name.includes('alter_table')) {
      return 'migration';
    }
    
    if (pattern.name.includes('schema') || pattern.name === 'prisma_model') {
      return 'schema';
    }
    
    if (pattern.name.includes('config') || pattern.name.includes('connection')) {
      return 'config';
    }
    
    if (pattern.name.includes('select') || pattern.name.includes('insert') || 
        pattern.name.includes('update') || pattern.name.includes('delete')) {
      return 'raw-sql';
    }
    
    return 'table';
  }

  /**
   * Get line number from character position
   */
  private getLineNumber(content: string, position: number): number {
    const beforePos = content.substring(0, position);
    return beforePos.split('\n').length - 1;
  }

  /**
   * Create batches for parallel processing
   */
  private createBatches<T>(items: T[], batchSize: number): T[][] {
    const batches: T[][] = [];
    for (let i = 0; i < items.length; i += batchSize) {
      batches.push(items.slice(i, i + batchSize));
    }
    return batches;
  }

  /**
   * Read file content from filesystem
   */
  private async readFileContent(filePath: string): Promise<string> {
    try {
      const fs = await import('fs/promises');
      const content = await fs.readFile(filePath, 'utf-8');
      return content;
    } catch (error) {
      // Try alternative encodings if UTF-8 fails
      try {
        const fs = await import('fs/promises');
        const buffer = await fs.readFile(filePath);
        // Try latin1 encoding
        return buffer.toString('latin1');
      } catch (fallbackError) {
        console.warn(`Failed to read file ${filePath}:`, error instanceof Error ? error.message : 'Unknown error');
        return '';
      }
    }
  }

  /**
   * Get pattern statistics
   */
  getPatternStatistics(): {
    totalPatterns: number;
    byFramework: Record<string, number>;
    byType: Record<string, number>;
  } {
    const stats = {
      totalPatterns: this.patterns.length,
      byFramework: {} as Record<string, number>,
      byType: {} as Record<string, number>
    };

    for (const pattern of this.patterns) {
      // Count by framework
      if (pattern.frameworks.length === 0) {
        stats.byFramework['generic'] = (stats.byFramework['generic'] || 0) + 1;
      } else {
        for (const framework of pattern.frameworks) {
          stats.byFramework[framework] = (stats.byFramework[framework] || 0) + 1;
        }
      }

      // Count by type (simplified)
      const type = this.determineType(pattern);
      stats.byType[type] = (stats.byType[type] || 0) + 1;
    }

    return stats;
  }
}
