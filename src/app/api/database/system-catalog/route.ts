// API route for system catalog extraction
// POST /api/database/system-catalog

import { NextRequest, NextResponse } from 'next/server';
import { DatabaseDefinitionExtractor } from '../../../services/databaseDefinitionExtractor';

export async function POST(request: NextRequest) {
  try {
    // Validate request content type
    const contentType = request.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Content-Type must be application/json' 
        },
        { status: 400 }
      );
    }

    // Parse request body
    let body;
    try {
      body = await request.json();
    } catch (parseError) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Invalid JSON in request body' 
        },
        { status: 400 }
      );
    }

    const { databaseType, connectionInfo } = body;

    // Validate required parameters
    if (!databaseType) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'databaseType is required' 
        },
        { status: 400 }
      );
    }

    if (!connectionInfo) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'connectionInfo is required' 
        },
        { status: 400 }
      );
    }

    // Validate database type
    const supportedTypes = ['postgresql', 'mysql', 'sqlite', 'mongodb'];
    if (!supportedTypes.includes(databaseType)) {
      return NextResponse.json(
        { 
          success: false, 
          error: `Unsupported database type. Supported types: ${supportedTypes.join(', ')}` 
        },
        { status: 400 }
      );
    }

    console.log(`🔍 Starting system catalog extraction for ${databaseType}...`);

    // Initialize the extractor
    const extractor = new DatabaseDefinitionExtractor();

    // Extract system catalog information
    const result = await extractor.extractSystemCatalog(databaseType, connectionInfo);

    console.log(`✅ System catalog extraction completed for ${databaseType}`);
    console.log(`📊 Extracted: ${result.tables.length} tables, ${result.views.length} views, ${result.indexes.length} indexes`);

    return NextResponse.json({
      success: true,
      data: result,
      metadata: {
        databaseType: result.metadata.databaseType,
        version: result.metadata.version,
        extractedAt: result.metadata.extractedAt,
        summary: {
          tables: result.tables.length,
          views: result.views.length,
          indexes: result.indexes.length,
          triggers: result.triggers.length,
          sequences: result.sequences.length,
          functions: result.functions.length,
          procedures: result.procedures.length
        }
      }
    });

  } catch (error) {
    console.error('❌ System catalog extraction failed:', error);
    
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        details: error instanceof Error ? error.stack : undefined
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    success: true,
    message: 'System Catalog Extraction API',
    supportedTypes: ['postgresql', 'mysql', 'sqlite', 'mongodb'],
    usage: {
      method: 'POST',
      endpoint: '/api/database/system-catalog',
      body: {
        databaseType: 'postgresql | mysql | sqlite | mongodb',
        connectionInfo: 'Connection string or file path object'
      }
    },
    examples: {
      sqlite: {
        databaseType: 'sqlite',
        connectionInfo: { filePath: '/path/to/database.db' }
      },
      postgresql: {
        databaseType: 'postgresql',
        connectionInfo: 'postgresql://user:pass@localhost:5432/dbname'
      },
      mysql: {
        databaseType: 'mysql',
        connectionInfo: 'mysql://user:pass@localhost:3306/dbname'
      },
      mongodb: {
        databaseType: 'mongodb',
        connectionInfo: 'mongodb://localhost:27017/dbname'
      }
    }
  });
}
