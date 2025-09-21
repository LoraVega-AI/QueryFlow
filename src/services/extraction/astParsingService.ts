// AST Parsing Service
// Stage 3: Language-specific AST parsing for accurate code analysis

import * as babelParser from '@babel/parser';
import traverse from '@babel/traverse';
import * as t from '@babel/types';
import { Engine as PhpParser } from 'php-parser';
import { parse as javaParser } from 'java-parser';

import {
  FileContent,
  ExtractionCandidate,
  ExtractionOptions,
  LanguageParser,
  ASTVisitor,
  SupportedLanguage
} from '@/types/extraction';

export class ASTParsingService {
  private parsers: Map<SupportedLanguage, LanguageParser>;
  private cache: Map<string, any> = new Map();

  constructor() {
    this.parsers = new Map();
    this.initializeParsers();
  }

  /**
   * Parse all candidates using appropriate AST parsers
   */
  async parseAll(candidates: ExtractionCandidate[], options: ExtractionOptions): Promise<ExtractionCandidate[]> {
    const startTime = Date.now();
    console.log(`🌳 AST parsing ${candidates.length} candidates...`);

    const parsed: ExtractionCandidate[] = [];

    if (options.parallelProcessing) {
      // Process in parallel batches
      const batchSize = Math.ceil(candidates.length / options.maxWorkers);
      const batches = this.createBatches(candidates, batchSize);
      
      const batchPromises = batches.map(batch => 
        this.processBatch(batch, options)
      );
      
      const batchResults = await Promise.all(batchPromises);
      
      for (const batchCandidates of batchResults) {
        parsed.push(...batchCandidates);
      }
    } else {
      // Sequential processing
      for (const candidate of candidates) {
        try {
          const parsedCandidate = await this.parseCandidate(candidate, options);
          if (parsedCandidate) {
            parsed.push(parsedCandidate);
          }
        } catch (error) {
          console.warn(`Failed to parse candidate in ${candidate.file.path}:`, error instanceof Error ? error.message : 'Unknown error');
        }
      }
    }

    const parseTime = Date.now() - startTime;
    console.log(`🌳 Parsed ${parsed.length}/${candidates.length} candidates in ${parseTime}ms`);

    return parsed;
  }

  /**
   * Parse a single candidate
   */
  async parseCandidate(candidate: ExtractionCandidate, options: ExtractionOptions): Promise<ExtractionCandidate | null> {
    const { file } = candidate;
    
    if (!file.language) {
      return candidate; // Return as-is if no language detected
    }

    try {
      // Check cache first
      const cacheKey = `${file.hash}_${file.language}`;
      if (options.enableASTCaching && this.cache.has(cacheKey)) {
        const ast = this.cache.get(cacheKey);
        return {
          ...candidate,
          metadata: {
            ...candidate.metadata,
            ast,
            parsed: true,
            fromCache: true
          }
        };
      }

      // Get appropriate parser
      const parser = this.parsers.get(file.language);
      if (!parser) {
        console.warn(`No parser available for language: ${file.language}`);
        return candidate;
      }

      // Parse the content
      const ast = await parser.parse(candidate.content);
      
      if (!ast) {
        return candidate;
      }

      // Cache the result
      if (options.enableASTCaching) {
        this.cache.set(cacheKey, ast);
      }

      // Extract relevant nodes based on candidate type
      const relevantNodes = await this.extractRelevantNodes(ast, candidate, parser);

      return {
        ...candidate,
        metadata: {
          ...candidate.metadata,
          ast,
          relevantNodes,
          parsed: true,
          nodeCount: this.countNodes(ast)
        }
      };

    } catch (error) {
      console.warn(`AST parsing failed for ${file.path}:`, error instanceof Error ? error.message : 'Unknown error');
      return candidate; // Return original candidate if parsing fails
    }
  }

  /**
   * Process a batch of candidates
   */
  private async processBatch(candidates: ExtractionCandidate[], options: ExtractionOptions): Promise<ExtractionCandidate[]> {
    const parsed: ExtractionCandidate[] = [];
    
    for (const candidate of candidates) {
      try {
        const result = await this.parseCandidate(candidate, options);
        if (result) {
          parsed.push(result);
        }
      } catch (error) {
        console.warn(`Batch parsing failed for ${candidate.file.path}:`, error instanceof Error ? error.message : 'Unknown error');
      }
    }
    
    return parsed;
  }

  /**
   * Extract relevant AST nodes based on candidate type
   */
  private async extractRelevantNodes(ast: any, candidate: ExtractionCandidate, parser: LanguageParser): Promise<any[]> {
    const nodes: any[] = [];

    switch (candidate.type) {
      case 'model':
        nodes.push(...this.extractModelNodes(ast, parser, candidate.file.language || 'javascript'));
        break;
      case 'table':
        nodes.push(...this.extractTableNodes(ast, parser, candidate.file.language || 'javascript'));
        break;
      case 'migration':
        nodes.push(...this.extractMigrationNodes(ast, parser, candidate.file.language || 'javascript'));
        break;
      case 'schema':
        nodes.push(...this.extractSchemaNodes(ast, parser, candidate.file.language || 'javascript'));
        break;
      case 'config':
        nodes.push(...this.extractConfigNodes(ast, parser, candidate.file.language || 'javascript'));
        break;
      default:
        // Extract all potentially relevant nodes
        nodes.push(...this.extractAllRelevantNodes(ast, parser, candidate.file.language || 'javascript'));
    }

    return nodes;
  }

  /**
   * Extract model definition nodes
   */
  private extractModelNodes(ast: any, parser: LanguageParser, language: SupportedLanguage): any[] {
    const nodes: any[] = [];

    switch (language) {
      case 'javascript':
      case 'typescript':
        // Look for class declarations, object definitions, function calls
        nodes.push(...parser.extractNodes(ast, ['ClassDeclaration', 'ObjectExpression', 'CallExpression']));
        break;
      case 'python':
        // Look for class definitions and function calls
        nodes.push(...parser.extractNodes(ast, ['ClassDef', 'Call', 'Assign']));
        break;
      case 'php':
        // Look for class declarations and method calls
        nodes.push(...parser.extractNodes(ast, ['class', 'call', 'assign']));
        break;
      case 'java':
        // Look for class declarations and annotations
        nodes.push(...parser.extractNodes(ast, ['ClassDeclaration', 'MethodInvocation', 'Annotation']));
        break;
    }

    return nodes;
  }

  /**
   * Extract table definition nodes
   */
  private extractTableNodes(ast: any, parser: LanguageParser, language: SupportedLanguage): any[] {
    // Similar to model nodes but with different focus
    return this.extractModelNodes(ast, parser, language);
  }

  /**
   * Extract migration nodes
   */
  private extractMigrationNodes(ast: any, parser: LanguageParser, language: SupportedLanguage): any[] {
    const nodes: any[] = [];

    switch (language) {
      case 'javascript':
      case 'typescript':
        // Look for migration function calls
        nodes.push(...parser.extractNodes(ast, ['CallExpression', 'ArrowFunctionExpression', 'FunctionDeclaration']));
        break;
      case 'python':
        // Look for migration operations
        nodes.push(...parser.extractNodes(ast, ['Call', 'FunctionDef', 'ClassDef']));
        break;
      case 'php':
        // Look for Laravel migration methods
        nodes.push(...parser.extractNodes(ast, ['call', 'method', 'class']));
        break;
      case 'java':
        // Look for migration annotations and methods
        nodes.push(...parser.extractNodes(ast, ['MethodDeclaration', 'Annotation']));
        break;
    }

    return nodes;
  }

  /**
   * Extract schema definition nodes
   */
  private extractSchemaNodes(ast: any, parser: LanguageParser, language: SupportedLanguage): any[] {
    const nodes: any[] = [];

    switch (language) {
      case 'javascript':
      case 'typescript':
        // Look for schema objects and definitions
        nodes.push(...parser.extractNodes(ast, ['ObjectExpression', 'VariableDeclaration', 'CallExpression']));
        break;
      case 'python':
        // Look for schema classes and dictionaries
        nodes.push(...parser.extractNodes(ast, ['ClassDef', 'Dict', 'Call']));
        break;
      case 'php':
        // Look for array definitions and class properties
        nodes.push(...parser.extractNodes(ast, ['array', 'property', 'class']));
        break;
      case 'java':
        // Look for configuration classes and annotations
        nodes.push(...parser.extractNodes(ast, ['ClassDeclaration', 'Annotation', 'FieldDeclaration']));
        break;
    }

    return nodes;
  }

  /**
   * Extract configuration nodes
   */
  private extractConfigNodes(ast: any, parser: LanguageParser, language: SupportedLanguage): any[] {
    const nodes: any[] = [];

    switch (language) {
      case 'javascript':
      case 'typescript':
        // Look for config objects and exports
        nodes.push(...parser.extractNodes(ast, ['ObjectExpression', 'ExportDefaultDeclaration', 'VariableDeclaration']));
        break;
      case 'python':
        // Look for dictionaries and assignments
        nodes.push(...parser.extractNodes(ast, ['Dict', 'Assign', 'Call']));
        break;
      case 'php':
        // Look for arrays and return statements
        nodes.push(...parser.extractNodes(ast, ['array', 'return', 'assign']));
        break;
      case 'java':
        // Look for properties and configuration classes
        nodes.push(...parser.extractNodes(ast, ['FieldDeclaration', 'MethodDeclaration', 'Annotation']));
        break;
    }

    return nodes;
  }

  /**
   * Extract all potentially relevant nodes
   */
  private extractAllRelevantNodes(ast: any, parser: LanguageParser, language: SupportedLanguage): any[] {
    const allTypes = this.getAllRelevantNodeTypes(language);
    return parser.extractNodes(ast, allTypes);
  }

  /**
   * Get all relevant node types for a language
   */
  private getAllRelevantNodeTypes(language: SupportedLanguage): string[] {
    switch (language) {
      case 'javascript':
      case 'typescript':
        return [
          'ClassDeclaration', 'ObjectExpression', 'CallExpression', 
          'VariableDeclaration', 'FunctionDeclaration', 'ArrowFunctionExpression',
          'ExportDefaultDeclaration', 'ExportNamedDeclaration'
        ];
      case 'python':
        return [
          'ClassDef', 'FunctionDef', 'Call', 'Assign', 'Dict', 'List'
        ];
      case 'php':
        return [
          'class', 'method', 'call', 'assign', 'array', 'property', 'return'
        ];
      case 'java':
        return [
          'ClassDeclaration', 'MethodDeclaration', 'FieldDeclaration',
          'Annotation', 'MethodInvocation', 'VariableDeclarationFragment'
        ];
      default:
        return [];
    }
  }

  /**
   * Count total nodes in AST
   */
  private countNodes(ast: any): number {
    let count = 0;
    
    const visitor = {
      enter: () => count++
    };

    // This would need to be implemented for each language parser
    // For now, return a simple estimate
    return JSON.stringify(ast).length / 50; // Rough estimate
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
   * Initialize language parsers
   */
  private initializeParsers(): void {
    // JavaScript/TypeScript Parser
    this.parsers.set('javascript', new JavaScriptParser());
    this.parsers.set('typescript', new TypeScriptParser());
    
    // Python Parser
    this.parsers.set('python', new PythonParser());
    
    // PHP Parser
    this.parsers.set('php', new PHPParser());
    
    // Java Parser
    this.parsers.set('java', new JavaParser());
  }

  /**
   * Clear AST cache
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { size: number; hitRate: number } {
    return {
      size: this.cache.size,
      hitRate: 0 // Would track hits/misses in real implementation
    };
  }
}

// Language-specific parser implementations

class JavaScriptParser implements LanguageParser {
  readonly language: SupportedLanguage = 'javascript';
  readonly extensions = ['.js', '.jsx', '.mjs', '.cjs'];

  async parse(content: string, options: any = {}): Promise<any> {
    try {
      return babelParser.parse(content, {
        sourceType: 'module',
        allowImportExportEverywhere: true,
        allowReturnOutsideFunction: true,
        plugins: [
          'jsx',
          'objectRestSpread',
          'decorators-legacy',
          'classProperties',
          'asyncGenerators',
          'functionBind',
          'dynamicImport',
          'nullishCoalescingOperator',
          'optionalChaining'
        ],
        ...options
      });
    } catch (error) {
      // Try as script if module parsing fails
      return babelParser.parse(content, {
        sourceType: 'script',
        allowReturnOutsideFunction: true,
        plugins: ['jsx', 'objectRestSpread'],
        ...options
      });
    }
  }

  async traverse(ast: any, visitor: ASTVisitor): Promise<void> {
    traverse(ast, visitor as any);
  }

  extractNodes(ast: any, nodeTypes: string[]): any[] {
    const nodes: any[] = [];
    
    traverse(ast, {
      enter(path) {
        if (nodeTypes.includes(path.node.type)) {
          nodes.push({
            type: path.node.type,
            node: path.node,
            path: path.getPathLocation(),
            source: path.toString()
          });
        }
      }
    });
    
    return nodes;
  }
}

class TypeScriptParser implements LanguageParser {
  readonly language: SupportedLanguage = 'typescript';
  readonly extensions = ['.ts', '.tsx'];

  async parse(content: string, options: any = {}): Promise<any> {
    try {
      return babelParser.parse(content, {
        sourceType: 'module',
        allowImportExportEverywhere: true,
        allowReturnOutsideFunction: true,
        plugins: [
          'typescript',
          'jsx',
          'objectRestSpread',
          'decorators-legacy',
          'classProperties',
          'asyncGenerators',
          'functionBind',
          'dynamicImport',
          'nullishCoalescingOperator',
          'optionalChaining'
        ],
        ...options
      });
    } catch (error) {
      throw new Error(`TypeScript parsing failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async traverse(ast: any, visitor: ASTVisitor): Promise<void> {
    traverse(ast, visitor as any);
  }

  extractNodes(ast: any, nodeTypes: string[]): any[] {
    const nodes: any[] = [];
    
    traverse(ast, {
      enter(path) {
        if (nodeTypes.includes(path.node.type)) {
          nodes.push({
            type: path.node.type,
            node: path.node,
            path: path.getPathLocation(),
            source: path.toString()
          });
        }
      }
    });
    
    return nodes;
  }
}

class PythonParser implements LanguageParser {
  readonly language: SupportedLanguage = 'python';
  readonly extensions = ['.py', '.pyx', '.pyi', '.pyw'];

  async parse(content: string, options: any = {}): Promise<any> {
    try {
      // In a real implementation, we would use the Python AST module
      // For now, we'll create a simplified AST structure
      const lines = content.split('\n');
      const ast = {
        type: 'Module',
        body: [] as any[],
        source: content,
        lines: lines.length
      };
      
      // Simple pattern matching for Python constructs
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        
        if (line.startsWith('class ') && line.includes('Model')) {
          ast.body.push({
            type: 'ClassDef',
            name: this.extractClassName(line),
            lineno: i + 1,
            source: line
          });
        }
        
        if (line.includes('models.') && line.includes('Field')) {
          ast.body.push({
            type: 'Assign',
            lineno: i + 1,
            source: line
          });
        }
      }
      
      return ast;
    } catch (error) {
      throw new Error(`Python parsing failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async traverse(ast: any, visitor: ASTVisitor): Promise<void> {
    if (visitor.enter) visitor.enter(ast);
    
    for (const node of ast.body || []) {
      if (visitor.enter) visitor.enter(node, ast);
      if (visitor.exit) visitor.exit(node, ast);
    }
    
    if (visitor.exit) visitor.exit(ast);
  }

  extractNodes(ast: any, nodeTypes: string[]): any[] {
    const nodes: any[] = [];
    
    for (const node of ast.body || []) {
      if (nodeTypes.includes(node.type)) {
        nodes.push(node);
      }
    }
    
    return nodes;
  }

  private extractClassName(line: string): string {
    const match = line.match(/class\s+(\w+)/);
    return match ? match[1] : 'Unknown';
  }
}

class PHPParser implements LanguageParser {
  readonly language: SupportedLanguage = 'php';
  readonly extensions = ['.php', '.php3', '.php4', '.php5', '.phtml'];
  private parser: PhpParser;

  constructor() {
    this.parser = new PhpParser({
      parser: {
        extractDoc: true,
        php7: true
      },
      ast: {
        withPositions: true,
        withSource: true
      }
    });
  }

  async parse(content: string, options: any = {}): Promise<any> {
    try {
      return this.parser.parseEval(content);
    } catch (error) {
      throw new Error(`PHP parsing failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async traverse(ast: any, visitor: ASTVisitor): Promise<void> {
    this.traverseNode(ast, visitor);
  }

  private traverseNode(node: any, visitor: ASTVisitor, parent?: any): void {
    if (!node || typeof node !== 'object') return;

    if (visitor.enter) visitor.enter(node, parent);

    // Traverse child nodes
    for (const key in node) {
      if (key === 'parent' || key === 'loc') continue;
      
      const child = node[key];
      if (Array.isArray(child)) {
        for (const item of child) {
          this.traverseNode(item, visitor, node);
        }
      } else if (child && typeof child === 'object' && child.kind) {
        this.traverseNode(child, visitor, node);
      }
    }

    if (visitor.exit) visitor.exit(node, parent);
  }

  extractNodes(ast: any, nodeTypes: string[]): any[] {
    const nodes: any[] = [];
    
    this.traverse(ast, {
      enter: (node) => {
        if (nodeTypes.includes(node.kind)) {
          nodes.push(node);
        }
      }
    });
    
    return nodes;
  }
}

class JavaParser implements LanguageParser {
  readonly language: SupportedLanguage = 'java';
  readonly extensions = ['.java'];

  async parse(content: string, options: any = {}): Promise<any> {
    try {
      // Use java-parser library
      return javaParser(content);
    } catch (error) {
      throw new Error(`Java parsing failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async traverse(ast: any, visitor: ASTVisitor): Promise<void> {
    this.traverseNode(ast, visitor);
  }

  private traverseNode(node: any, visitor: ASTVisitor, parent?: any): void {
    if (!node || typeof node !== 'object') return;

    if (visitor.enter) visitor.enter(node, parent);

    // Traverse child nodes
    for (const key in node) {
      const child = node[key];
      if (Array.isArray(child)) {
        for (const item of child) {
          if (item && typeof item === 'object') {
            this.traverseNode(item, visitor, node);
          }
        }
      } else if (child && typeof child === 'object') {
        this.traverseNode(child, visitor, node);
      }
    }

    if (visitor.exit) visitor.exit(node, parent);
  }

  extractNodes(ast: any, nodeTypes: string[]): any[] {
    const nodes: any[] = [];
    
    this.traverse(ast, {
      enter: (node) => {
        if (node.node && nodeTypes.includes(node.node)) {
          nodes.push(node);
        }
      }
    });
    
    return nodes;
  }
}
