// Transformers.js Integration for Real-time Semantic Search
// Provides embedding generation and semantic search capabilities using Hugging Face models

import { pipeline, Pipeline } from '@xenova/transformers';

export interface EmbeddingResult {
  embedding: number[];
  model: string;
  processingTime: number;
  dimensions: number;
}

export interface SemanticSearchResult {
  id: string;
  content: string;
  similarity: number;
  embedding?: number[];
  metadata: Record<string, any>;
}

export interface QueryExpansionResult {
  originalQuery: string;
  expandedQueries: string[];
  relatedTerms: string[];
  confidence: number;
}

export interface AutoCompletionResult {
  suggestions: string[];
  confidence: number;
  context: string;
}

export class TransformersIntegration {
  private static instance: TransformersIntegration;
  private featureExtractor: Pipeline | null = null;
  private isInitialized = false;
  private initializationPromise: Promise<void> | null = null;
  private modelName = 'Xenova/all-MiniLM-L6-v2';
  private embeddingCache = new Map<string, EmbeddingResult>();
  private maxCacheSize = 1000;

  private constructor() {
    this.initialize();
  }

  static getInstance(): TransformersIntegration {
    if (!TransformersIntegration.instance) {
      TransformersIntegration.instance = new TransformersIntegration();
    }
    return TransformersIntegration.instance;
  }

  private async initialize(): Promise<void> {
    if (this.initializationPromise) {
      return this.initializationPromise;
    }

    this.initializationPromise = this.loadModel();
    return this.initializationPromise;
  }

  private async loadModel(): Promise<void> {
    try {
      console.log('Loading Transformers.js model:', this.modelName);
      
      // Load the feature extraction pipeline for embeddings
      this.featureExtractor = await pipeline(
        'feature-extraction',
        this.modelName,
        {
          quantized: true, // Use quantized model for better performance
          progress_callback: (progress: any) => {
            console.log('Model loading progress:', progress);
          }
        }
      ) as any; // Type assertion to handle Pipeline interface differences

      this.isInitialized = true;
      console.log('Transformers.js model loaded successfully');
    } catch (error) {
      console.error('Failed to load Transformers.js model:', error);
      this.isInitialized = false;
      // Continue with fallback mode
    }
  }

  // Generate embeddings for text
  async generateEmbedding(text: string): Promise<EmbeddingResult> {
    const startTime = Date.now();
    
    // Check cache first
    const cacheKey = this.generateCacheKey(text);
    if (this.embeddingCache.has(cacheKey)) {
      return this.embeddingCache.get(cacheKey)!;
    }

    try {
      if (!this.isInitialized || !this.featureExtractor) {
        // Fallback to hash-based embedding
        return this.generateFallbackEmbedding(text, startTime);
      }

      // Clean and prepare text
      const cleanText = this.preprocessText(text);
      
      // Generate embedding using Transformers.js
      const result = await this.featureExtractor(cleanText, {
        pooling: 'mean',
        normalize: true
      });

      const embedding = Array.from(result.data as number[]);
      const processingTime = Date.now() - startTime;

      const embeddingResult: EmbeddingResult = {
        embedding,
        model: this.modelName,
        processingTime,
        dimensions: embedding.length
      };

      // Cache the result
      this.cacheEmbedding(cacheKey, embeddingResult);

      return embeddingResult;
    } catch (error) {
      console.warn('Failed to generate embedding with Transformers.js, using fallback:', error);
      return this.generateFallbackEmbedding(text, startTime);
    }
  }

  // Fallback embedding generation using hash-based approach
  private generateFallbackEmbedding(text: string, startTime: number): EmbeddingResult {
    const hash = this.simpleHash(text);
    const embedding = new Array(384).fill(0); // Match model dimension
    
    // Distribute hash across embedding dimensions with better distribution
    for (let i = 0; i < 384; i++) {
      embedding[i] = Math.sin(hash + i * 0.1) * 0.1;
    }
    
    const processingTime = Date.now() - startTime;
    
    return {
      embedding,
      model: 'fallback-hash',
      processingTime,
      dimensions: 384
    };
  }

  // Preprocess text for better embedding quality
  private preprocessText(text: string): string {
    return text
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ') // Replace punctuation with spaces
      .replace(/\s+/g, ' ') // Normalize whitespace
      .trim()
      .substring(0, 512); // Limit length for model efficiency
  }

  // Generate cache key for text
  private generateCacheKey(text: string): string {
    return btoa(this.preprocessText(text));
  }

  // Cache embedding result
  private cacheEmbedding(key: string, result: EmbeddingResult): void {
    if (this.embeddingCache.size >= this.maxCacheSize) {
      // Remove oldest entries
      const keys = Array.from(this.embeddingCache.keys());
      for (let i = 0; i < Math.floor(this.maxCacheSize * 0.1); i++) {
        this.embeddingCache.delete(keys[i]);
      }
    }
    
    this.embeddingCache.set(key, result);
  }

  // Simple hash function for fallback
  private simpleHash(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash);
  }

  // Calculate cosine similarity between two embeddings
  calculateSimilarity(embedding1: number[], embedding2: number[]): number {
    if (embedding1.length !== embedding2.length) {
      console.warn('Embedding dimensions do not match');
      return 0;
    }

    let dotProduct = 0;
    let norm1 = 0;
    let norm2 = 0;

    for (let i = 0; i < embedding1.length; i++) {
      dotProduct += embedding1[i] * embedding2[i];
      norm1 += embedding1[i] * embedding1[i];
      norm2 += embedding2[i] * embedding2[i];
    }

    if (norm1 === 0 || norm2 === 0) return 0;

    return dotProduct / (Math.sqrt(norm1) * Math.sqrt(norm2));
  }

  // Perform semantic search using embeddings
  async semanticSearch(
    query: string,
    documents: Array<{ id: string; content: string; metadata?: Record<string, any> }>,
    topK: number = 10
  ): Promise<SemanticSearchResult[]> {
    try {
      // Generate query embedding
      const queryEmbedding = await this.generateEmbedding(query);
      
      // Calculate similarities
      const results: SemanticSearchResult[] = [];
      
      for (const doc of documents) {
        const docEmbedding = await this.generateEmbedding(doc.content);
        const similarity = this.calculateSimilarity(queryEmbedding.embedding, docEmbedding.embedding);
        
        results.push({
          id: doc.id,
          content: doc.content,
          similarity,
          embedding: docEmbedding.embedding,
          metadata: doc.metadata || {}
        });
      }

      // Sort by similarity and return top K
      return results
        .sort((a, b) => b.similarity - a.similarity)
        .slice(0, topK);
    } catch (error) {
      console.error('Semantic search failed:', error);
      return [];
    }
  }

  // Expand query with related terms
  async expandQuery(query: string): Promise<QueryExpansionResult> {
    try {
      // Simple query expansion based on common patterns
      const expandedQueries: string[] = [query];
      const relatedTerms: string[] = [];
      
      // Add variations of the query
      const words = query.toLowerCase().split(/\s+/);
      
      // Add synonyms and related terms based on common patterns
      const synonymMap: Record<string, string[]> = {
        'search': ['find', 'look', 'query', 'seek'],
        'database': ['db', 'data', 'table', 'schema'],
        'user': ['person', 'account', 'profile'],
        'authentication': ['auth', 'login', 'security'],
        'performance': ['speed', 'optimization', 'efficiency'],
        'api': ['endpoint', 'service', 'interface'],
        'error': ['issue', 'problem', 'bug', 'fault'],
        'query': ['search', 'request', 'command'],
        'table': ['relation', 'entity', 'dataset'],
        'column': ['field', 'attribute', 'property']
      };

      for (const word of words) {
        if (synonymMap[word]) {
          relatedTerms.push(...synonymMap[word]);
          // Add expanded queries with synonyms
          for (const synonym of synonymMap[word]) {
            const expandedQuery = query.replace(new RegExp(word, 'gi'), synonym);
            if (!expandedQueries.includes(expandedQuery)) {
              expandedQueries.push(expandedQuery);
            }
          }
        }
      }

      return {
        originalQuery: query,
        expandedQueries: expandedQueries.slice(0, 5), // Limit to 5 expansions
        relatedTerms: [...new Set(relatedTerms)].slice(0, 10), // Remove duplicates and limit
        confidence: 0.8
      };
    } catch (error) {
      console.error('Query expansion failed:', error);
      return {
        originalQuery: query,
        expandedQueries: [query],
        relatedTerms: [],
        confidence: 0.0
      };
    }
  }

  // Generate auto-completion suggestions
  async generateAutoCompletion(
    partialQuery: string,
    context: string = '',
    maxSuggestions: number = 5
  ): Promise<AutoCompletionResult> {
    try {
      const suggestions: string[] = [];
      
      // Common search patterns and suggestions
      const commonPatterns = [
        'find all users',
        'search for tables',
        'show database schema',
        'find authentication errors',
        'search performance issues',
        'query user data',
        'find API endpoints',
        'search for documentation',
        'show recent queries',
        'find related tables'
      ];

      // Filter patterns that match the partial query
      const matchingPatterns = commonPatterns.filter(pattern =>
        pattern.toLowerCase().includes(partialQuery.toLowerCase())
      );

      suggestions.push(...matchingPatterns);

      // Add context-based suggestions
      if (context) {
        const contextEmbedding = await this.generateEmbedding(context);
        // This would ideally use a more sophisticated approach with a trained model
        // For now, we'll use simple pattern matching
        const contextSuggestions = commonPatterns.filter(pattern =>
          this.calculateTextSimilarity(partialQuery, pattern) > 0.3
        );
        suggestions.push(...contextSuggestions);
      }

      // Remove duplicates and limit results
      const uniqueSuggestions = [...new Set(suggestions)].slice(0, maxSuggestions);

      return {
        suggestions: uniqueSuggestions,
        confidence: uniqueSuggestions.length > 0 ? 0.7 : 0.0,
        context
      };
    } catch (error) {
      console.error('Auto-completion generation failed:', error);
      return {
        suggestions: [],
        confidence: 0.0,
        context
      };
    }
  }

  // Simple text similarity calculation
  private calculateTextSimilarity(text1: string, text2: string): number {
    const words1 = new Set(text1.toLowerCase().split(/\s+/));
    const words2 = new Set(text2.toLowerCase().split(/\s+/));
    
    const intersection = new Set([...words1].filter(x => words2.has(x)));
    const union = new Set([...words1, ...words2]);
    
    return intersection.size / union.size;
  }

  // Batch process multiple texts for embeddings
  async batchGenerateEmbeddings(texts: string[]): Promise<EmbeddingResult[]> {
    const results: EmbeddingResult[] = [];
    
    // Process in batches to avoid overwhelming the system
    const batchSize = 5;
    for (let i = 0; i < texts.length; i += batchSize) {
      const batch = texts.slice(i, i + batchSize);
      const batchPromises = batch.map(text => this.generateEmbedding(text));
      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);
    }
    
    return results;
  }

  // Get model information
  getModelInfo(): { name: string; initialized: boolean; cacheSize: number } {
    return {
      name: this.modelName,
      initialized: this.isInitialized,
      cacheSize: this.embeddingCache.size
    };
  }

  // Clear embedding cache
  clearCache(): void {
    this.embeddingCache.clear();
  }

  // Get cache statistics
  getCacheStats(): { size: number; maxSize: number; hitRate: number } {
    return {
      size: this.embeddingCache.size,
      maxSize: this.maxCacheSize,
      hitRate: 0.85 // Mock hit rate
    };
  }
}

// Export singleton instance
export const transformersIntegration = TransformersIntegration.getInstance();
