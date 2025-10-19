// Base Framework Adapter
// Common functionality for all framework adapters

import {
  FrameworkAdapter,
  SupportedFramework,
  SupportedLanguage,
  FileInfo,
  FileContent,
  ExtractionCandidate,
  IRTable,
  IRField,
  DataType,
  SourceLocation
} from '@/types/extraction';

export abstract class BaseAdapter implements FrameworkAdapter {
  abstract readonly name: SupportedFramework;
  abstract readonly language: SupportedLanguage;
  abstract readonly filePatterns: string[];
  abstract readonly confidence: number;

  get extensions(): string[] {
    return this.getExtensionsForLanguage(this.language);
  }

  /**
   * Basic framework detection based on file patterns and content
   */
  canHandle(file: FileInfo, content: string): boolean {
    // Check file extension
    if (!this.extensions.includes(file.extension)) {
      return false;
    }

    // Check file patterns
    const matchesPattern = this.filePatterns.some(pattern => {
      const regex = new RegExp(pattern, 'i');
      return regex.test(file.path) || regex.test(file.name);
    });

    if (matchesPattern) {
      return true;
    }

    // Check content patterns
    return this.matchesFrameworkPatterns(content);
  }

  /**
   * Detect framework confidence based on content analysis
   */
  detectFramework(file: FileInfo, content: string): number {
    let confidence = 0;

    // Base confidence if file can be handled
    if (this.canHandle(file, content)) {
      confidence = this.confidence;
    }

    // Boost confidence based on specific patterns
    confidence += this.analyzeContentPatterns(content);

    // Boost if file is in expected location
    confidence += this.analyzeFileLocation(file.path);

    // Cap at 100
    return Math.min(100, confidence);
  }

  /**
   * Abstract methods to be implemented by specific adapters
   */
  abstract extractDefinitions(file: FileContent): Promise<ExtractionCandidate[]>;
  abstract parseToIR(candidates: ExtractionCandidate[]): Promise<IRTable[]>;

  // Protected helper methods

  /**
   * Check if content matches framework-specific patterns
   */
  protected abstract matchesFrameworkPatterns(content: string): boolean;

  /**
   * Analyze content for framework-specific patterns and return confidence boost
   */
  protected abstract analyzeContentPatterns(content: string): number;

  /**
   * Analyze file location for framework-specific paths
   */
  protected analyzeFileLocation(filePath: string): number {
    // Can be overridden by specific adapters
    return 0;
  }

  /**
   * Create source location from file and line numbers
   */
  protected createSourceLocation(
    file: FileInfo,
    startLine: number,
    endLine: number,
    startColumn?: number,
    endColumn?: number
  ): SourceLocation {
    return {
      file: file.path,
      startLine,
      endLine,
      startColumn,
      endColumn
    };
  }

  /**
   * Extract table name from various formats
   */
  protected extractTableName(input: string): string {
    // Remove quotes and clean up
    let name = input.replace(/['"``]/g, '');
    
    // Convert camelCase to snake_case for database table names
    name = name.replace(/([A-Z])/g, '_$1').toLowerCase();
    
    // Remove leading underscore
    if (name.startsWith('_')) {
      name = name.substring(1);
    }
    
    return name;
  }

  /**
   * Map framework-specific types to standard DataTypes
   */
  protected mapDataType(frameworkType: string): DataType {
    const typeMap = this.getDataTypeMap();
    const normalized = frameworkType.toLowerCase().trim();
    
    return typeMap[normalized] || 'TEXT';
  }

  /**
   * Get data type mapping for the framework
   */
  protected abstract getDataTypeMap(): Record<string, DataType>;

  /**
   * Parse field constraints from definition
   */
  protected parseConstraints(definition: string): {
    nullable: boolean;
    primaryKey: boolean;
    unique: boolean;
    autoIncrement: boolean;
    defaultValue?: any;
    maxLength?: number;
  } {
    const constraints = {
      nullable: true,
      primaryKey: false,
      unique: false,
      autoIncrement: false,
      maxLength: undefined
    } as {
      nullable: boolean;
      primaryKey: boolean;
      unique: boolean;
      autoIncrement: boolean;
      defaultValue?: any;
      maxLength?: number;
    };

    const lower = definition.toLowerCase();

    // Check for null constraints
    if (lower.includes('not null') || lower.includes('required')) {
      constraints.nullable = false;
    }

    // Check for primary key
    if (lower.includes('primary') || lower.includes('@id')) {
      constraints.primaryKey = true;
      constraints.nullable = false; // Primary keys are implicitly not null
    }

    // Check for unique
    if (lower.includes('unique')) {
      constraints.unique = true;
    }

    // Check for auto increment
    if (lower.includes('auto') || lower.includes('autoincrement') || lower.includes('generated')) {
      constraints.autoIncrement = true;
    }

    // Extract default value
    const defaultMatch = definition.match(/default\s*[(:]\s*['"]?([^'",)]+)['"]?\s*[)]/i);
    if (defaultMatch) {
      constraints.defaultValue = defaultMatch[1];
    }

    // Extract max length for strings
    const lengthMatch = definition.match(/\((\d+)\)/);
    if (lengthMatch) {
      constraints.maxLength = parseInt(lengthMatch[1]);
    }

    return constraints;
  }

  /**
   * Extract field name from various formats
   */
  protected extractFieldName(input: string): string {
    // Handle quoted names
    let name = input.replace(/['"``]/g, '');
    
    // Extract from decorator patterns like @Column('field_name')
    const decoratorMatch = name.match(/@\w+\s*\(\s*['"]([^'"]+)['"]/);
    if (decoratorMatch) {
      return decoratorMatch[1];
    }
    
    // Extract from property definitions
    const propertyMatch = name.match(/(\w+)\s*[:=]/);
    if (propertyMatch) {
      return propertyMatch[1];
    }
    
    return name.trim();
  }

  /**
   * Parse foreign key relationship from definition
   */
  protected parseForeignKey(definition: string): IRField['foreignKey'] | undefined {
    // Look for foreign key patterns
    const fkPatterns = [
      /references\s+(\w+)\s*\(\s*(\w+)\s*\)/i,
      /foreignkey\s*\(\s*['"](\w+)\.(\w+)['"]\s*\)/i,
      /@ForeignKey\s*\(\s*(\w+)\s*\)/i
    ];

    for (const pattern of fkPatterns) {
      const match = definition.match(pattern);
      if (match) {
        return {
          table: match[1],
          field: match[2] || 'id',
          onDelete: this.extractCascadeAction(definition, 'delete'),
          onUpdate: this.extractCascadeAction(definition, 'update')
        };
      }
    }

    return undefined;
  }

  /**
   * Extract cascade actions from foreign key definition
   */
  private extractCascadeAction(
    definition: string,
    actionType: 'delete' | 'update'
  ): 'CASCADE' | 'SET NULL' | 'RESTRICT' | 'NO ACTION' | undefined {
    const pattern = new RegExp(`on\\s+${actionType}\\s+(cascade|set\\s+null|restrict|no\\s+action)`, 'i');
    const match = definition.match(pattern);
    
    if (match) {
      const action = match[1].replace(/\s+/g, ' ').toUpperCase();
      return action as 'CASCADE' | 'SET NULL' | 'RESTRICT' | 'NO ACTION';
    }
    
    return undefined;
  }

  /**
   * Get file extensions for a language
   */
  private getExtensionsForLanguage(language: SupportedLanguage): string[] {
    const extensions: Record<SupportedLanguage, string[]> = {
      'javascript': ['.js', '.jsx', '.mjs', '.cjs'],
      'typescript': ['.ts', '.tsx'],
      'python': ['.py', '.pyx', '.pyi', '.pyw'],
      'php': ['.php', '.php3', '.php4', '.php5', '.phtml'],
      'java': ['.java']
    };

    return extensions[language] || [];
  }

  /**
   * Determine if primary key should be inferred for a table
   * Only returns true if framework always creates default primary keys and confidence is high
   */
  protected shouldInferPrimaryKey(candidate: ExtractionCandidate): boolean {
    // Only infer for frameworks that always create default primary keys
    const frameworksWithDefaultKeys = ['django', 'eloquent', 'mongoose'];
    
    if (!candidate.framework || !frameworksWithDefaultKeys.includes(candidate.framework)) {
      return false;
    }
    
    // Require high confidence score
    if (candidate.confidence < 85) {
      return false;
    }
    
    // Check that no explicit primary key definition exists in the content
    const hasPKPattern = /primary_key|primaryKey|@PrimaryKey|@Id/i.test(candidate.content);
    if (hasPKPattern) {
      return false;
    }
    
    return true;
  }

  /**
   * Validate extracted table definition
   */
  protected validateTable(table: IRTable): {
    isValid: boolean;
    errors: string[];
    warnings: string[];
  } {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check required fields
    if (!table.name.trim()) {
      errors.push('Table name is required');
    }

    if (table.fields.length === 0) {
      warnings.push('Table has no fields defined');
    }

    // Validate fields
    for (const field of table.fields) {
      if (!field.name.trim()) {
        errors.push('Field name is required');
      }
      
      if (!field.type) {
        errors.push(`Field '${field.name}' has no type defined`);
      }
    }

    // Check for primary key
    const hasPrimaryKey = table.fields.some(field => field.primaryKey);
    if (!hasPrimaryKey) {
      warnings.push('Table has no primary key defined');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Generate table documentation from comments and metadata
   */
  protected generateDocumentation(
    comments: string[],
    metadata: Record<string, any>
  ): string | undefined {
    const docs = comments.filter(comment => comment.trim().length > 0);
    
    if (docs.length === 0) {
      return undefined;
    }
    
    return docs.join('\n').trim();
  }

  /**
   * Extract comments from source code around a definition
   */
  protected extractComments(content: string, startLine: number, endLine: number): string[] {
    const lines = content.split('\n');
    const comments: string[] = [];
    
    // Look for comments before the definition
    for (let i = Math.max(0, startLine - 5); i < startLine; i++) {
      const line = lines[i];
      if (line) {
        const comment = this.extractCommentFromLine(line);
        if (comment) {
          comments.push(comment);
        }
      }
    }
    
    // Look for inline comments
    for (let i = startLine; i <= Math.min(lines.length - 1, endLine); i++) {
      const line = lines[i];
      if (line) {
        const comment = this.extractInlineComment(line);
        if (comment) {
          comments.push(comment);
        }
      }
    }
    
    return comments;
  }

  /**
   * Extract comment from a single line
   */
  private extractCommentFromLine(line: string): string | null {
    // Handle different comment styles
    const patterns = [
      /\/\*\s*(.*?)\s*\*\//,  // /* comment */
      /\/\/\s*(.*?)$/,        // // comment
      /#\s*(.*?)$/,           // # comment (Python)
      /\/\*\*\s*(.*?)\s*\*\//  // /** comment */
    ];
    
    for (const pattern of patterns) {
      const match = line.match(pattern);
      if (match) {
        return match[1].trim();
      }
    }
    
    return null;
  }

  /**
   * Extract inline comment from a line
   */
  private extractInlineComment(line: string): string | null {
    // Look for comments at the end of lines
    const patterns = [
      /\/\/\s*(.*?)$/,
      /#\s*(.*?)$/
    ];
    
    for (const pattern of patterns) {
      const match = line.match(pattern);
      if (match && match[1].trim().length > 2) {
        return match[1].trim();
      }
    }
    
    return null;
  }
}
