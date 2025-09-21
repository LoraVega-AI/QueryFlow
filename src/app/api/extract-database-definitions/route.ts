// API Route for Database Definition Extraction
// Integrates the extraction pipeline with QueryFlow

import { NextRequest, NextResponse } from 'next/server';
import { DatabaseDefinitionExtractor } from '@/services/databaseDefinitionExtractor';
import {
  ExtractionOptions,
  ExtractionResult,
  SupportedLanguage,
  SupportedFramework
} from '@/types/extraction';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      projectPath,
      files,
      options = {}
    } = body;

    // Validate input
    if (!projectPath && !files) {
      return NextResponse.json(
        { error: 'Either projectPath or files must be provided' },
        { status: 400 }
      );
    }

    // Initialize extractor
    const extractor = new DatabaseDefinitionExtractor();

    // Validate options
    const validation = extractor.validateOptions(options);
    if (!validation.isValid) {
      return NextResponse.json(
        { 
          error: 'Invalid extraction options',
          details: validation.errors
        },
        { status: 400 }
      );
    }

    let result: ExtractionResult;

    try {
      if (projectPath) {
        // Extract from project directory
        result = await extractor.extractFromProject(projectPath, options);
      } else {
        // Extract from uploaded files
        result = await extractor.extractFromFiles(files, options);
      }

      // Convert SQLite database to base64 for JSON transport
      const sqliteBase64 = result.sqliteDb ? 
        Buffer.from(result.sqliteDb).toString('base64') : undefined;

      const response = {
        success: true,
        schema: result.schema,
        sqliteDatabase: sqliteBase64,
        metadata: result.metadata,
        progress: result.progress,
        performance: {
          ...result.performance,
          // Convert dates to ISO strings for JSON
          startTime: result.performance.startTime.toISOString(),
          endTime: result.performance.endTime.toISOString()
        },
        diagnostics: extractor.getDiagnostics()
      };

      return NextResponse.json(response);

    } finally {
      // Cleanup resources
      await extractor.cleanup();
    }

  } catch (error) {
    console.error('Database extraction failed:', error);
    
      return NextResponse.json(
        {
          success: false,
          error: 'Extraction failed',
          message: error instanceof Error ? error.message : 'Unknown error',
          stack: process.env.NODE_ENV === 'development' ? (error instanceof Error ? error.stack : undefined) : undefined
        },
        { status: 500 }
      );
  }
}

export async function GET(request: NextRequest) {
  try {
    // Return supported formats and capabilities
    const extractor = new DatabaseDefinitionExtractor();
    const supported = extractor.getSupportedFormats();

    const response = {
      success: true,
      supportedLanguages: supported.languages,
      supportedFrameworks: supported.frameworks,
      defaultOptions: {
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
        maxWorkers: Math.max(1, (global as any).navigator?.hardwareConcurrency - 1 || 3),
        frameworks: supported.frameworks,
        languages: supported.languages,
        confidence: {
          minimum: 60,
          regexWeight: 0.3,
          astWeight: 0.5,
          frameworkWeight: 0.2
        }
      },
      examples: {
        projectPath: {
          description: 'Extract from local project directory',
          example: {
            projectPath: '/path/to/project',
            options: {
              languages: ['javascript', 'typescript'],
              frameworks: ['sequelize', 'prisma'],
              maxDepth: 5
            }
          }
        },
        files: {
          description: 'Extract from uploaded files',
          example: {
            files: [
              {
                name: 'models/User.js',
                content: 'const User = sequelize.define("User", { name: DataTypes.STRING });'
              }
            ],
            options: {
              frameworks: ['sequelize']
            }
          }
        }
      }
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('Failed to get extraction info:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to get extraction capabilities',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// Validation helper
function validateExtractionRequest(body: any): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (!body.projectPath && !body.files) {
    errors.push('Either projectPath or files must be provided');
  }

  if (body.files && !Array.isArray(body.files)) {
    errors.push('files must be an array');
  }

  if (body.files) {
    for (const file of body.files) {
      if (!file.name || !file.content) {
        errors.push('Each file must have name and content properties');
        break;
      }
    }
  }

  if (body.options) {
    if (body.options.maxDepth && body.options.maxDepth < 1) {
      errors.push('maxDepth must be at least 1');
    }

    if (body.options.scanTimeout && body.options.scanTimeout < 1000) {
      errors.push('scanTimeout must be at least 1000ms');
    }

    if (body.options.maxWorkers && body.options.maxWorkers < 1) {
      errors.push('maxWorkers must be at least 1');
    }
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}
