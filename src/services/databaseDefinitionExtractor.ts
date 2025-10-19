// Database Definition Extraction Service
// Main orchestrator for the multi-stage extraction pipeline

import {
  ExtractionOptions,
  ExtractionResult,
  ExtractionProgress,
  IRSchema,
  FileInfo,
  FileContent,
  ExtractionCandidate,
  SupportedLanguage,
  SupportedFramework,
  ExtractionPerformance,
  ExtractionWarning,
  ExtractionError
} from '../types/extraction';

import { FileIntakeService } from './extraction/fileIntakeService';
import { RegexFilterService } from './extraction/regexFilterService';
import { ASTParsingService } from './extraction/astParsingService';
import { FrameworkAdapterService } from './extraction/frameworkAdapterService';
import { SchemaNormalizationService } from './extraction/schemaNormalizationService';
import { SQLiteConversionService } from './extraction/sqliteConversionService';
import { WorkerPoolService } from './extraction/workerPoolService';
import { CacheService } from './extraction/cacheService';
import { SystemCatalogExtractor } from './extraction/systemCatalogExtractor';
import { DatabaseVerificationService } from './extraction/databaseVerificationService';
import { TempFileManager } from './extraction/tempFileManager';

export class DatabaseDefinitionExtractor {
  private fileIntake: FileIntakeService;
  private regexFilter: RegexFilterService;
  private astParser: ASTParsingService;
  private frameworkAdapter: FrameworkAdapterService;
  private normalization: SchemaNormalizationService;
  private sqliteConverter: SQLiteConversionService;
  private workerPool: WorkerPoolService;
  private cache: CacheService;
  private verificationService: DatabaseVerificationService;
  private tempFileManager: TempFileManager;

  private progress: ExtractionProgress;
  private performance: ExtractionPerformance;
  private warnings: ExtractionWarning[] = [];
  private errors: ExtractionError[] = [];

  constructor() {
    this.fileIntake = new FileIntakeService();
    this.regexFilter = new RegexFilterService();
    this.astParser = new ASTParsingService();
    this.frameworkAdapter = new FrameworkAdapterService();
    this.normalization = new SchemaNormalizationService();
    this.sqliteConverter = new SQLiteConversionService();
    this.workerPool = new WorkerPoolService();
    this.cache = new CacheService();
    this.verificationService = new DatabaseVerificationService();
    this.tempFileManager = new TempFileManager();

    this.progress = this.initializeProgress();
    this.performance = this.initializePerformance();
  }

  /**
   * Main extraction method - orchestrates the entire pipeline
   */
  async extractFromProject(
    projectPath: string,
    options: Partial<ExtractionOptions> = {}
  ): Promise<ExtractionResult> {
    const startTime = Date.now();
    this.performance.startTime = new Date();
    
    try {
      // Merge default options
      const extractionOptions = this.mergeDefaultOptions(options);
      
      console.log('🔍 Starting database definition extraction...');
      console.log(`📁 Project path: ${projectPath}`);
      console.log(`⚙️  Options:`, extractionOptions);

      // Stage 1: File Intake & Detection
      await this.updateProgress('scanning');
      const files = await this.fileIntake.scanProject(projectPath, extractionOptions);
      this.progress.filesTotal = files.length;
      console.log(`📋 Found ${files.length} files`);

      // Stage 2: Regex Pre-Filter
      await this.updateProgress('filtering');
      const candidates = await this.regexFilter.filterCandidates(files, extractionOptions);
      this.progress.candidatesFound = candidates.length;
      console.log(`🎯 Identified ${candidates.length} database definition candidates`);

      // Stage 3: AST Parsing
      await this.updateProgress('parsing');
      const parsedCandidates = await this.astParser.parseAll(candidates, extractionOptions);
      console.log(`🌳 AST parsed ${parsedCandidates.length} files`);

      // Stage 4: Framework Adapters
      await this.updateProgress('adapting');
      const extractedTables = await this.frameworkAdapter.extractAll(parsedCandidates, extractionOptions);
      this.progress.tablesExtracted = extractedTables.length;
      console.log(`🏗️  Extracted ${extractedTables.length} table definitions`);

      // Stage 5: Schema Normalization & Validation
      await this.updateProgress('normalizing');
      const irSchema = await this.normalization.normalize(extractedTables, extractionOptions);
      console.log(`✅ Normalized schema with ${irSchema.tables.length} tables`);

      // Comprehensive schema validation
      this.validateExtractedSchema(irSchema);

      // Stage 6: SQLite Conversion
      await this.updateProgress('converting');
      const sqliteDb = await this.sqliteConverter.convert(irSchema, {
        preserveEnums: true,
        createIndexes: true,
        addMetadata: true,
        enableConstraints: true,
      });
      console.log(`🗄️  Generated SQLite database`);

      // Stage 7: Database Verification and Introspection
      await this.updateProgress('verifying');
      let verificationResult = null;
      let databaseIntrospection = null;
      let tempDbPath: string | undefined;
      
      // Check verification mode
      if (options.verification.enabled && options.verification.mode !== 'disabled') {
        try {
          // Create temp file from buffer for verification
          if (sqliteDb) {
            tempDbPath = await this.tempFileManager.createTempDatabase(sqliteDb, `extraction_${Date.now()}`);
            console.log(`📁 Created temp database for verification: ${tempDbPath}`);
            
            // Perform table verification against actual database
            verificationResult = await this.verificationService.verifyTables(
              irSchema.tables,
              'sqlite',
              { filePath: tempDbPath }
            );
            
            // Perform database introspection based on depth setting
            if (options.verification.introspectionDepth !== 'shallow') {
              databaseIntrospection = await this.verificationService.introspectDatabase(
                'sqlite',
                { filePath: tempDbPath }
              );
            }
            
            console.log(`✅ Verification completed with ${verificationResult.verifiedTables.length} verified tables`);
            if (databaseIntrospection) {
              console.log(`🔍 Database introspection found ${databaseIntrospection.actualTables.length} actual tables`);
            }
            
            // Handle strict mode
            if (options.verification.mode === 'strict') {
              if (verificationResult.verificationStats.accuracy < 0.9) {
                throw new Error(`Verification accuracy too low: ${verificationResult.verificationStats.accuracy}`);
              }
            }
          }
        } catch (error) {
          if (options.verification.failOnError) {
            throw error;
          } else {
            console.warn('⚠️ Verification failed in lenient mode:', error);
            this.addWarning(`Verification failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
          }
        } finally {
          // Always cleanup temp file
          if (tempDbPath) {
            await this.tempFileManager.cleanup(tempDbPath);
          }
        }
      }

      await this.updateProgress('complete');
      this.performance.endTime = new Date();
      this.performance.totalTime = Date.now() - startTime;

      // Build comprehensive unified report
      const result: ExtractionResult = {
        schema: irSchema,
        sqliteDb,
        progress: this.progress,
        performance: this.performance,
        metadata: {
          totalFiles: files.length,
          processedFiles: this.progress.filesProcessed,
          extractionTime: this.performance.totalTime,
          confidence: this.calculateOverallConfidence(irSchema)
        },
        // Add verification results if available
        ...(verificationResult && { verification: verificationResult }),
        // Add database introspection results if available
        ...(databaseIntrospection && { databaseIntrospection }),
        // Build comprehensive sections from available data
        schemaObjects: this.buildSchemaObjectsSection(irSchema, databaseIntrospection),
        columns: this.buildColumnsSection(irSchema, databaseIntrospection),
        constraints: this.buildConstraintsSection(irSchema, databaseIntrospection),
        statistics: this.buildStatisticsSection(databaseIntrospection),
        functions: this.buildFunctionsSection(databaseIntrospection),
        security: this.buildSecuritySection(databaseIntrospection),
        runtimeState: this.buildRuntimeStateSection(databaseIntrospection),
        engineFeatures: this.buildEngineFeaturesSection(databaseIntrospection)
      };

      console.log('🎉 Extraction completed successfully!');
      console.log(`⏱️  Total time: ${this.performance.totalTime}ms`);
      console.log(`📊 Confidence: ${result.metadata.confidence}%`);
      
      return result;

    } catch (error) {
      this.addError({
        type: 'system',
        message: `Extraction failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        fatal: true,
        stack: error instanceof Error ? error.stack : undefined
      });
      
      throw error;
    }
  }

  /**
   * Build comprehensive schema objects section
   */
  private buildSchemaObjectsSection(irSchema: IRSchema, databaseIntrospection: any): any {
    return {
      tables: irSchema.tables.map(table => ({
        name: table.name,
        schema: table.schema,
        fields: table.fields,
        indexes: table.indexes,
        constraints: table.constraints,
        triggers: table.triggers,
        metadata: table.metadata,
        sourceLocation: table.sourceLocation
      })),
      views: databaseIntrospection?.views || [],
      indexes: databaseIntrospection?.indexes || [],
      triggers: databaseIntrospection?.triggers || [],
      sequences: databaseIntrospection?.sequences || [],
      procedures: databaseIntrospection?.procedures || [],
      functions: databaseIntrospection?.functions || [],
      events: databaseIntrospection?.events || [],
      materializedViews: databaseIntrospection?.views?.filter((v: any) => v.isMaterialized) || [],
      partitionedTables: databaseIntrospection?.partitioning?.partitionedTables || [],
      temporaryTables: irSchema.tables.filter(table => table.name.startsWith('temp_') || table.name.startsWith('tmp_'))
    };
  }

  /**
   * Build comprehensive columns section
   */
  private buildColumnsSection(irSchema: IRSchema, databaseIntrospection: any): any {
    const detailedMetadata = [];
    const typeMappings = [];
    const constraintAnalysis = [];
    const relationshipMapping = [];
    const performanceMetrics = [];

    // Process each table's columns
    for (const table of irSchema.tables) {
      for (const field of table.fields) {
        detailedMetadata.push({
          tableName: table.name,
          columnName: field.name,
          type: field.type,
          nullable: field.nullable,
          primaryKey: field.primaryKey,
          unique: field.unique,
          autoIncrement: field.autoIncrement,
          defaultValue: field.defaultValue,
          constraints: field.constraints,
          foreignKey: field.foreignKey,
          documentation: field.documentation,
          sourceLocation: field.sourceLocation
        });

        // Type mappings
        typeMappings.push({
          ormType: field.type,
          databaseType: field.type, // This would be mapped from database introspection
          compatibility: 'compatible',
          notes: ''
        });

        // Constraint analysis
        if (field.constraints) {
          constraintAnalysis.push({
            tableName: table.name,
            columnName: field.name,
            constraints: field.constraints,
            validation: 'valid',
            recommendations: []
          });
        }

        // Relationship mapping
        if (field.foreignKey) {
          relationshipMapping.push({
            sourceTable: table.name,
            sourceColumn: field.name,
            targetTable: field.foreignKey.table,
            targetColumn: field.foreignKey.field,
            relationshipType: 'foreign_key',
            onDelete: field.foreignKey.onDelete,
            onUpdate: field.foreignKey.onUpdate
          });
        }
      }
    }

    return {
      detailedMetadata,
      typeMappings,
      constraintAnalysis,
      relationshipMapping,
      performanceMetrics
    };
  }

  /**
   * Build comprehensive constraints section
   */
  private buildConstraintsSection(irSchema: IRSchema, databaseIntrospection: any): any {
    const primaryKeys = [];
    const foreignKeys = [];
    const uniqueConstraints = [];
    const checkConstraints = [];
    const notNullConstraints = [];
    const exclusionConstraints = [];
    const constraintValidation = [];

    // Process constraints from IR schema
    for (const table of irSchema.tables) {
      // Primary keys
      const pkFields = table.fields.filter(f => f.primaryKey);
      if (pkFields.length > 0) {
        primaryKeys.push({
          tableName: table.name,
          columns: pkFields.map(f => f.name),
          constraintName: `pk_${table.name}`,
          isComposite: pkFields.length > 1
        });
      }

      // Foreign keys
      for (const field of table.fields) {
        if (field.foreignKey) {
          foreignKeys.push({
            tableName: table.name,
            columnName: field.name,
            referencedTable: field.foreignKey.table,
            referencedColumn: field.foreignKey.field,
            constraintName: `fk_${table.name}_${field.name}`,
            onDelete: field.foreignKey.onDelete,
            onUpdate: field.foreignKey.onUpdate
          });
        }
      }

      // Unique constraints
      const uniqueFields = table.fields.filter(f => f.unique && !f.primaryKey);
      for (const field of uniqueFields) {
        uniqueConstraints.push({
          tableName: table.name,
          columnName: field.name,
          constraintName: `uk_${table.name}_${field.name}`,
          isUnique: true
        });
      }

      // Not null constraints
      const notNullFields = table.fields.filter(f => !f.nullable);
      for (const field of notNullFields) {
        notNullConstraints.push({
          tableName: table.name,
          columnName: field.name,
          constraintName: `nn_${table.name}_${field.name}`,
          isNotNull: true
        });
      }

      // Check constraints
      for (const field of table.fields) {
        if (field.constraints?.check) {
          checkConstraints.push({
            tableName: table.name,
            columnName: field.name,
            expression: field.constraints.check,
            constraintName: `ck_${table.name}_${field.name}`,
            isEnabled: true
          });
        }
      }
    }

    // Add database introspection constraints
    if (databaseIntrospection?.tableMetadata) {
      for (const table of databaseIntrospection.tableMetadata) {
        if (table.constraints) {
          // Add primary key constraints from database
          if (table.constraints.primaryKeyConstraints) {
            for (const pk of table.constraints.primaryKeyConstraints) {
              primaryKeys.push({
                tableName: table.name,
                columns: pk.columns,
                constraintName: pk.name,
                isComposite: pk.columns.length > 1,
                source: 'database'
              });
            }
          }

          // Add foreign key constraints from database
          if (table.constraints.foreignKeyConstraints) {
            for (const fk of table.constraints.foreignKeyConstraints) {
              foreignKeys.push({
                tableName: table.name,
                columnName: fk.columns[0],
                referencedTable: fk.referencedTable,
                referencedColumn: fk.referencedColumns[0],
                constraintName: fk.name,
                onDelete: fk.onDelete,
                onUpdate: fk.onUpdate,
                source: 'database'
              });
            }
          }

          // Add unique constraints from database
          if (table.constraints.uniqueConstraints) {
            for (const uk of table.constraints.uniqueConstraints) {
              uniqueConstraints.push({
                tableName: table.name,
                columns: uk.columns,
                constraintName: uk.name,
                isUnique: true,
                source: 'database'
              });
            }
          }

          // Add check constraints from database
          if (table.constraints.checkConstraints) {
            for (const ck of table.constraints.checkConstraints) {
              checkConstraints.push({
                tableName: table.name,
                expression: ck.expression,
                constraintName: ck.name,
                isEnabled: ck.isEnabled,
                source: 'database'
              });
            }
          }
        }
      }
    }

    return {
      primaryKeys,
      foreignKeys,
      uniqueConstraints,
      checkConstraints,
      notNullConstraints,
      exclusionConstraints,
      constraintValidation
    };
  }

  /**
   * Build comprehensive statistics section
   */
  private buildStatisticsSection(databaseIntrospection: any): any {
    return {
      tableStatistics: databaseIntrospection?.statistics?.tableStatistics || [],
      indexStatistics: databaseIntrospection?.statistics?.indexStatistics || [],
      performanceMetrics: databaseIntrospection?.statistics?.performanceMetrics || [],
      sizeAnalysis: databaseIntrospection?.statistics?.sizeAnalysis || [],
      usagePatterns: databaseIntrospection?.statistics?.usagePatterns || []
    };
  }

  /**
   * Build comprehensive functions section
   */
  private buildFunctionsSection(databaseIntrospection: any): any {
    return {
      storedProcedures: databaseIntrospection?.procedures || [],
      userDefinedFunctions: databaseIntrospection?.functions || [],
      triggers: databaseIntrospection?.triggers || [],
      events: databaseIntrospection?.events || [],
      sequences: databaseIntrospection?.sequences || [],
      dependencies: databaseIntrospection?.dependencyGraph || []
    };
  }

  /**
   * Build comprehensive security section
   */
  private buildSecuritySection(databaseIntrospection: any): any {
    return {
      users: databaseIntrospection?.security?.users || [],
      roles: databaseIntrospection?.security?.roles || [],
      permissions: databaseIntrospection?.security?.permissions || [],
      grants: databaseIntrospection?.security?.grants || [],
      accessControl: databaseIntrospection?.security?.accessControl || []
    };
  }

  /**
   * Build comprehensive runtime state section
   */
  private buildRuntimeStateSection(databaseIntrospection: any): any {
    return {
      connections: databaseIntrospection?.runtimeState?.connections || [],
      transactions: databaseIntrospection?.runtimeState?.transactions || [],
      locks: databaseIntrospection?.runtimeState?.locks || [],
      blockingLocks: databaseIntrospection?.runtimeState?.blockingLocks || [],
      systemMetrics: databaseIntrospection?.runtimeState?.systemMetrics || []
    };
  }

  /**
   * Build comprehensive engine features section
   */
  private buildEngineFeaturesSection(databaseIntrospection: any): any {
    return {
      extensions: databaseIntrospection?.extensions || null,
      partitioning: databaseIntrospection?.partitioning || null,
      engineInfo: databaseIntrospection?.engineInfo || null,
      pragmas: databaseIntrospection?.pragmas || null,
      mongoOptions: databaseIntrospection?.mongoOptions || null,
      databaseConfiguration: databaseIntrospection?.databaseConfiguration || null
    };
  }

  /**
   * Extract from file list (for uploaded projects)
   */
  async extractFromFiles(
    files: { name: string; content: string }[],
    options: Partial<ExtractionOptions> = {}
  ): Promise<ExtractionResult> {
    const startTime = Date.now();
    this.performance.startTime = new Date();
    
    try {
      const extractionOptions = this.mergeDefaultOptions(options);
      
      console.log('🔍 Starting extraction from file list...');
      console.log(`📋 Processing ${files.length} files`);

      // Convert files to FileInfo objects
      const fileInfos = await Promise.all(
        files.map(file => this.fileIntake.analyzeFile(file.name, file.content))
      );
      
      this.progress.filesTotal = fileInfos.length;

      // Continue with the normal pipeline
      await this.updateProgress('filtering');
      const validFileInfos = fileInfos.filter((file): file is FileInfo => file !== null);
      const candidates = await this.regexFilter.filterCandidates(validFileInfos, extractionOptions);
      this.progress.candidatesFound = candidates.length;

      await this.updateProgress('parsing');
      const parsedCandidates = await this.astParser.parseAll(candidates, extractionOptions);

      await this.updateProgress('adapting');
      const extractedTables = await this.frameworkAdapter.extractAll(parsedCandidates, extractionOptions);
      this.progress.tablesExtracted = extractedTables.length;

      await this.updateProgress('normalizing');
      const irSchema = await this.normalization.normalize(extractedTables, extractionOptions);

      await this.updateProgress('converting');
      const sqliteDb = await this.sqliteConverter.convert(irSchema, {
        preserveEnums: true,
        createIndexes: true,
        addMetadata: true,
        enableConstraints: true,
      });

      // Stage 7: Database Verification and Introspection
      await this.updateProgress('verifying');
      let verificationResult = null;
      let databaseIntrospection = null;
      let tempDbPath: string | undefined;
      
      try {
        // Create temp file from buffer for verification
        if (sqliteDb) {
          tempDbPath = await this.tempFileManager.createTempDatabase(sqliteDb, `extraction_${Date.now()}`);
          console.log(`📁 Created temp database for verification: ${tempDbPath}`);
          
          // Perform table verification against actual database
          verificationResult = await this.verificationService.verifyTables(
            irSchema.tables,
            'sqlite',
            { filePath: tempDbPath }
          );
          
          // Perform database introspection
          databaseIntrospection = await this.verificationService.introspectDatabase(
            'sqlite',
            { filePath: tempDbPath }
          );
          
          console.log(`✅ Verification completed with ${verificationResult.verifiedTables.length} verified tables`);
          console.log(`🔍 Database introspection found ${databaseIntrospection.actualTables.length} actual tables`);
        }
      } catch (error) {
        console.warn('⚠️ Verification failed, continuing without verification:', error);
      } finally {
        // Always cleanup temp file
        if (tempDbPath) {
          await this.tempFileManager.cleanup(tempDbPath);
        }
      }

      await this.updateProgress('complete');
      this.performance.endTime = new Date();
      this.performance.totalTime = Date.now() - startTime;

      // Build comprehensive unified report
      return {
        schema: irSchema,
        sqliteDb,
        progress: this.progress,
        performance: this.performance,
        metadata: {
          totalFiles: fileInfos.length,
          processedFiles: this.progress.filesProcessed,
          extractionTime: this.performance.totalTime,
          confidence: this.calculateOverallConfidence(irSchema)
        },
        // Add verification results if available
        ...(verificationResult && { verification: verificationResult }),
        // Add database introspection results if available
        ...(databaseIntrospection && { databaseIntrospection }),
        // Build comprehensive sections from available data
        schemaObjects: this.buildSchemaObjectsSection(irSchema, databaseIntrospection),
        columns: this.buildColumnsSection(irSchema, databaseIntrospection),
        constraints: this.buildConstraintsSection(irSchema, databaseIntrospection),
        statistics: this.buildStatisticsSection(databaseIntrospection),
        functions: this.buildFunctionsSection(databaseIntrospection),
        security: this.buildSecuritySection(databaseIntrospection),
        runtimeState: this.buildRuntimeStateSection(databaseIntrospection),
        engineFeatures: this.buildEngineFeaturesSection(databaseIntrospection)
      };

    } catch (error) {
      this.addError({
        type: 'system',
        message: `File extraction failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        fatal: true,
        stack: error instanceof Error ? error.stack : undefined
      });
      
      throw error;
    }
  }

  /**
   * Extract system catalog information from database connections
   */
  async extractSystemCatalog(
    databaseType: 'postgresql' | 'mysql' | 'sqlite' | 'mongodb',
    connectionInfo: string | { filePath: string } | { connectionString: string }
  ): Promise<any> {
    console.log(`🔍 Starting system catalog extraction for ${databaseType}...`);
    
    try {
      let result;
      
      switch (databaseType) {
        case 'postgresql':
          if (typeof connectionInfo === 'string') {
            result = await SystemCatalogExtractor.extractPostgreSQL(connectionInfo);
          } else if ('connectionString' in connectionInfo) {
            result = await SystemCatalogExtractor.extractPostgreSQL(connectionInfo.connectionString);
          } else {
            throw new Error('PostgreSQL requires connection string');
          }
          break;
          
        case 'mysql':
          if (typeof connectionInfo === 'string') {
            result = await SystemCatalogExtractor.extractMySQL(connectionInfo);
          } else if ('connectionString' in connectionInfo) {
            result = await SystemCatalogExtractor.extractMySQL(connectionInfo.connectionString);
          } else {
            throw new Error('MySQL requires connection string');
          }
          break;
          
        case 'sqlite':
          if ('filePath' in connectionInfo) {
            result = await SystemCatalogExtractor.extractSQLite(connectionInfo.filePath);
          } else {
            throw new Error('SQLite requires file path');
          }
          break;
          
        case 'mongodb':
          if (typeof connectionInfo === 'string') {
            result = await SystemCatalogExtractor.extractMongoDB(connectionInfo);
          } else if ('connectionString' in connectionInfo) {
            result = await SystemCatalogExtractor.extractMongoDB(connectionInfo.connectionString);
          } else {
            throw new Error('MongoDB requires connection string');
          }
          break;
          
        default:
          throw new Error(`Unsupported database type: ${databaseType}`);
      }
      
      console.log(`✅ System catalog extraction completed for ${databaseType}`);
      return result;
      
    } catch (error) {
      console.error(`❌ System catalog extraction failed for ${databaseType}:`, error);
      throw error;
    }
  }

  /**
   * Get supported languages and frameworks
   */
  getSupportedFormats(): {
    languages: SupportedLanguage[];
    frameworks: SupportedFramework[];
  } {
    return {
      languages: ['javascript', 'typescript', 'python', 'php', 'java'],
      frameworks: [
        'sequelize', 'prisma', 'mongoose', 'typeorm',
        'django', 'sqlalchemy', 'alembic',
        'laravel', 'eloquent',
        'hibernate', 'jpa', 'spring-data'
      ]
    };
  }

  /**
   * Validate extraction options
   */
  validateOptions(options: Partial<ExtractionOptions>): {
    isValid: boolean;
    errors: string[];
    warnings: string[];
  } {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Set default verification options if not provided
    if (!options.verification) {
      (options as any).verification = {
        enabled: true,
        mode: 'lenient',
        failOnError: false,
        introspectionDepth: 'shallow'
      };
    }

    if (options.maxDepth && options.maxDepth < 1) {
      errors.push('maxDepth must be at least 1');
    }

    if (options.scanTimeout && options.scanTimeout < 1000) {
      warnings.push('scanTimeout below 1000ms may cause incomplete scans');
    }

    if (options.maxWorkers && options.maxWorkers > navigator.hardwareConcurrency) {
      warnings.push(`maxWorkers (${options.maxWorkers}) exceeds available cores (${navigator.hardwareConcurrency})`);
    }

    if (options.confidence?.minimum && (options.confidence.minimum < 0 || options.confidence.minimum > 100)) {
      errors.push('minimum confidence must be between 0 and 100');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Get current progress
   */
  getProgress(): ExtractionProgress {
    return { ...this.progress };
  }

  /**
   * Get performance metrics
   */
  getPerformance(): ExtractionPerformance {
    return { ...this.performance };
  }

  /**
   * Get warnings and errors
   */
  getDiagnostics(): {
    warnings: ExtractionWarning[];
    errors: ExtractionError[];
  } {
    return {
      warnings: [...this.warnings],
      errors: [...this.errors]
    };
  }

  /**
   * Clean up resources
   */
  async cleanup(): Promise<void> {
    await this.workerPool.terminate();
    await this.cache.clear();
  }

  /**
   * Validate extracted schema for common issues
   */
  private validateExtractedSchema(schema: any): void {
    console.log('🔍 Validating extracted schema...');
    
    const tableNames = new Set<string>();
    const allTableNames = schema.tables.map((t: any) => t.name);
    
    for (const table of schema.tables) {
      // Check for duplicate table names
      if (tableNames.has(table.name)) {
        this.addWarning(`Duplicate table name found: ${table.name}`);
      }
      tableNames.add(table.name);
      
      // Check for tables with no primary key
      const hasPrimaryKey = table.fields.some((f: any) => f.primaryKey);
      if (!hasPrimaryKey && !table.metadata?.inferred) {
        this.addWarning(`Table '${table.name}' has no primary key defined`);
      }
      
      // Check for fields with no type
      for (const field of table.fields) {
        if (!field.type) {
          this.addError(`Field '${field.name}' in table '${table.name}' has no type defined`);
        }
      }
      
      // Validate foreign key references
      for (const field of table.fields) {
        if (field.foreignKey) {
          const referencedTable = field.foreignKey.table;
          if (!allTableNames.includes(referencedTable)) {
            this.addWarning(
              `Foreign key in '${table.name}.${field.name}' references non-existent table '${referencedTable}'`
            );
          }
        }
      }
    }
    
    // Check for circular foreign key dependencies
    const circularDeps = this.detectCircularDependencies(schema.tables);
    if (circularDeps.length > 0) {
      this.addWarning(`Circular foreign key dependencies detected: ${circularDeps.join(' -> ')}`);
    }
    
    console.log(`✅ Schema validation complete`);
  }

  /**
   * Detect circular foreign key dependencies
   */
  private detectCircularDependencies(tables: any[]): string[] {
    const graph = new Map<string, string[]>();
    
    // Build dependency graph
    for (const table of tables) {
      const deps: string[] = [];
      for (const field of table.fields) {
        if (field.foreignKey) {
          deps.push(field.foreignKey.table);
        }
      }
      graph.set(table.name, deps);
    }
    
    // DFS to detect cycles
    const visited = new Set<string>();
    const recursionStack = new Set<string>();
    const path: string[] = [];
    
    const hasCycle = (node: string): boolean => {
      visited.add(node);
      recursionStack.add(node);
      path.push(node);
      
      const neighbors = graph.get(node) || [];
      for (const neighbor of neighbors) {
        if (!visited.has(neighbor)) {
          if (hasCycle(neighbor)) {
            return true;
          }
        } else if (recursionStack.has(neighbor)) {
          // Found cycle
          const cycleStart = path.indexOf(neighbor);
          path.push(neighbor); // Complete the cycle
          return true;
        }
      }
      
      recursionStack.delete(node);
      path.pop();
      return false;
    };
    
    for (const tableName of graph.keys()) {
      if (!visited.has(tableName)) {
        if (hasCycle(tableName)) {
          return path;
        }
      }
    }
    
    return [];
  }

  // Private methods

  private mergeDefaultOptions(options: Partial<ExtractionOptions>): ExtractionOptions {
    return {
      includeHidden: false,
      maxDepth: 10,
      ignorePatterns: [
        'node_modules/**',
        '.git/**',
        'dist/**',
        'build/**',
        '*.min.js',
        'vendor/**',
        '__pycache__/**',
        '.venv/**',
        'target/**'
      ],
      scanTimeout: 30000,
      enableASTCaching: true,
      enableIncrementalParsing: true,
      parallelProcessing: true,
      maxWorkers: Math.max(1, navigator.hardwareConcurrency - 1),
      frameworks: [
        'sequelize', 'prisma', 'mongoose', 'typeorm',
        'django', 'sqlalchemy', 'alembic',
        'laravel', 'eloquent',
        'hibernate', 'jpa', 'spring-data'
      ],
      languages: ['javascript', 'typescript', 'python', 'php', 'java'],
      confidence: {
        minimum: 60,
        regexWeight: 0.3,
        astWeight: 0.5,
        frameworkWeight: 0.2
      },
      ...options
    };
  }

  private initializeProgress(): ExtractionProgress {
    return {
      stage: 'scanning',
      filesTotal: 0,
      filesProcessed: 0,
      candidatesFound: 0,
      tablesExtracted: 0,
      errors: 0,
      warnings: 0,
      estimatedTimeRemaining: 0
    };
  }

  private initializePerformance(): ExtractionPerformance {
    return {
      startTime: new Date(),
      endTime: new Date(),
      totalTime: 0,
      stageTimings: {},
      memoryUsage: {
        peak: 0,
        average: 0,
        final: 0
      },
      cacheHits: 0,
      cacheMisses: 0
    };
  }

  private async updateProgress(stage: ExtractionProgress['stage']): Promise<void> {
    const previousStage = this.progress.stage;
    const stageStartTime = Date.now();
    
    this.progress.stage = stage;
    
    // Record timing for previous stage
    if (previousStage !== stage && this.performance.stageTimings[previousStage] === undefined) {
      this.performance.stageTimings[previousStage] = Date.now() - (this.performance.stageTimings.lastUpdate || Date.now());
    }
    
    this.performance.stageTimings.lastUpdate = stageStartTime;
    
    // Estimate remaining time based on progress
    const totalStages = 7; // scanning, filtering, parsing, adapting, normalizing, converting, complete
    const currentStageIndex = ['scanning', 'filtering', 'parsing', 'adapting', 'normalizing', 'converting', 'complete'].indexOf(stage);
    const progress = currentStageIndex / totalStages;
    const elapsedTime = Date.now() - this.performance.startTime.getTime();
    
    if (progress > 0) {
      this.progress.estimatedTimeRemaining = (elapsedTime / progress) - elapsedTime;
    }
    
    console.log(`📊 Progress: ${stage} (${Math.round(progress * 100)}%)`);
  }

  private calculateOverallConfidence(schema: IRSchema): number {
    if (schema.tables.length === 0) return 0;
    
    const totalConfidence = schema.tables.reduce((sum, table) => sum + table.metadata.confidence, 0);
    return Math.round(totalConfidence / schema.tables.length);
  }

  private addWarning(warning: ExtractionWarning): void {
    this.warnings.push(warning);
    this.progress.warnings++;
    console.warn(`⚠️  Warning: ${warning.message}`, warning);
  }

  private addError(error: ExtractionError): void {
    this.errors.push(error);
    this.progress.errors++;
    
    if (error.fatal) {
      console.error(`❌ Fatal Error: ${error.message}`, error);
    } else {
      console.error(`🔴 Error: ${error.message}`, error);
    }
  }
}
