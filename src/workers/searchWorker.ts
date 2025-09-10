// Web Worker for CPU-intensive search operations
// Handles semantic search, data processing, and heavy computations off the main thread

import { TransformersIntegration } from '../utils/transformersIntegration';

export interface SearchWorkerMessage {
  type: 'search' | 'embedding' | 'process_data' | 'cleanup';
  id: string;
  data: any;
}

export interface SearchWorkerResponse {
  type: 'search_result' | 'embedding_result' | 'data_processed' | 'error' | 'progress';
  id: string;
  data: any;
  progress?: number;
}

// Initialize transformers integration
let transformersIntegration: TransformersIntegration | null = null;

// Initialize the worker
async function initializeWorker() {
  try {
    const { TransformersIntegration } = await import('../utils/transformersIntegration');
    transformersIntegration = new TransformersIntegration();
    await transformersIntegration.initialize();
    console.log('Search worker initialized successfully');
  } catch (error) {
    console.error('Failed to initialize search worker:', error);
  }
}

// Perform semantic search
async function performSemanticSearch(query: string, documents: any[], options: any) {
  if (!transformersIntegration) {
    throw new Error('Transformers integration not initialized');
  }

  try {
    // Generate query embedding
    const queryEmbedding = await transformersIntegration.generateEmbedding(query);
    
    // Calculate similarities for all documents
    const results = documents.map((doc, index) => {
      const similarity = doc.embedding ? 
        cosineSimilarity(queryEmbedding, doc.embedding) : 0;
      
      return {
        ...doc,
        similarity,
        index
      };
    });

    // Sort by similarity
    results.sort((a, b) => b.similarity - a.similarity);

    // Apply pagination
    const offset = options.offset || 0;
    const limit = options.limit || 10;
    const paginatedResults = results.slice(offset, offset + limit);

    return {
      results: paginatedResults,
      total: results.length,
      query,
      executionTime: Date.now()
    };
  } catch (error) {
    throw new Error(`Semantic search failed: ${error}`);
  }
}

// Generate embeddings for multiple texts
async function generateEmbeddings(texts: string[]) {
  if (!transformersIntegration) {
    throw new Error('Transformers integration not initialized');
  }

  try {
    const embeddings = [];
    for (let i = 0; i < texts.length; i++) {
      const embedding = await transformersIntegration.generateEmbedding(texts[i]);
      embeddings.push(embedding);
      
      // Send progress update
      self.postMessage({
        type: 'progress',
        id: 'embedding_batch',
        data: { current: i + 1, total: texts.length },
        progress: ((i + 1) / texts.length) * 100
      } as SearchWorkerResponse);
    }

    return embeddings;
  } catch (error) {
    throw new Error(`Embedding generation failed: ${error}`);
  }
}

// Process large datasets
async function processLargeDataset(data: any[], operation: string, options: any) {
  const batchSize = options.batchSize || 100;
  const results = [];
  
  for (let i = 0; i < data.length; i += batchSize) {
    const batch = data.slice(i, i + batchSize);
    let batchResult;
    
    switch (operation) {
      case 'filter':
        batchResult = batch.filter(item => {
          const searchTerm = options.searchTerm?.toLowerCase() || '';
          return Object.values(item).some(value => 
            String(value).toLowerCase().includes(searchTerm)
          );
        });
        break;
        
      case 'sort':
        batchResult = [...batch].sort((a, b) => {
          const aVal = a[options.sortBy];
          const bVal = b[options.sortBy];
          
          if (aVal === null || aVal === undefined) return 1;
          if (bVal === null || bVal === undefined) return -1;
          
          if (typeof aVal === 'number' && typeof bVal === 'number') {
            return options.sortOrder === 'asc' ? aVal - bVal : bVal - aVal;
          }
          
          const aStr = String(aVal).toLowerCase();
          const bStr = String(bVal).toLowerCase();
          
          return options.sortOrder === 'asc' ? 
            aStr.localeCompare(bStr) : bStr.localeCompare(aStr);
        });
        break;
        
      case 'transform':
        batchResult = batch.map(item => {
          const transformed = { ...item };
          if (options.transformFunction) {
            // Apply transformation function
            try {
              return options.transformFunction(item);
            } catch (error) {
              console.error('Transform function error:', error);
              return item;
            }
          }
          return transformed;
        });
        break;
        
      default:
        batchResult = batch;
    }
    
    results.push(...batchResult);
    
    // Send progress update
    const progress = ((i + batchSize) / data.length) * 100;
    self.postMessage({
      type: 'progress',
      id: 'data_processing',
      data: { processed: i + batchSize, total: data.length },
      progress: Math.min(progress, 100)
    } as SearchWorkerResponse);
  }
  
  return results;
}

// Calculate cosine similarity
function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) return 0;
  
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  
  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  
  if (normA === 0 || normB === 0) return 0;
  
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

// Message handler
self.onmessage = async (event: MessageEvent<SearchWorkerMessage>) => {
  const { type, id, data } = event.data;
  
  try {
    switch (type) {
      case 'search': {
        const result = await performSemanticSearch(data.query, data.documents, data.options);
        self.postMessage({
          type: 'search_result',
          id,
          data: result
        } as SearchWorkerResponse);
        break;
      }
      
      case 'embedding': {
        const embeddings = await generateEmbeddings(data.texts);
        self.postMessage({
          type: 'embedding_result',
          id,
          data: { embeddings, texts: data.texts }
        } as SearchWorkerResponse);
        break;
      }
      
      case 'process_data': {
        const result = await processLargeDataset(data.dataset, data.operation, data.options);
        self.postMessage({
          type: 'data_processed',
          id,
          data: { result, operation: data.operation }
        } as SearchWorkerResponse);
        break;
      }
      
      case 'cleanup': {
        // Cleanup resources
        transformersIntegration = null;
        self.postMessage({
          type: 'cleanup',
          id,
          data: { success: true }
        } as SearchWorkerResponse);
        break;
      }
      
      default:
        throw new Error(`Unknown message type: ${type}`);
    }
  } catch (error) {
    self.postMessage({
      type: 'error',
      id,
      data: { error: error.message, type }
    } as SearchWorkerResponse);
  }
};

// Initialize worker on startup
initializeWorker();
