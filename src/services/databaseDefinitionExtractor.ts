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
} from '@/types/extraction';

import { FileIntakeService } from './extraction/fileIntakeService';
import { RegexFilterService } from './extraction/regexFilterService';
import { ASTParsingService } from './extraction/astParsingService';
import { FrameworkAdapterService } from './extraction/frameworkAdapterService';
import { SchemaNormalizationService } from './extraction/schemaNormalizationService';
import { SQLiteConversionService } from './extraction/sqliteConversionService';
import { WorkerPoolService } from './extraction/workerPoolService';
import { CacheService } from './extraction/cacheService';

export class DatabaseDefinitionExtractor {
  private fileIntake: FileIntakeService;
  private regexFilter: RegexFilterService;
  private astParser: ASTParsingService;
  private frameworkAdapter: FrameworkAdapterService;
  private normalization: SchemaNormalizationService;
  private sqliteConverter: SQLiteConversionService;
  private workerPool: WorkerPoolService;
  private cache: CacheService;

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

      // Stage 6: SQLite Conversion
      await this.updateProgress('converting');
      const sqliteDb = await this.sqliteConverter.convert(irSchema, {
        preserveEnums: true,
        createIndexes: true,
        addMetadata: true,
        enableConstraints: true,
        generateSampleData: false
      });
      console.log(`🗄️  Generated SQLite database`);

      await this.updateProgress('complete');
      this.performance.endTime = new Date();
      this.performance.totalTime = Date.now() - startTime;

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
        }
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
        generateSampleData: false
      });

      await this.updateProgress('complete');
      this.performance.endTime = new Date();
      this.performance.totalTime = Date.now() - startTime;

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
        }
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
