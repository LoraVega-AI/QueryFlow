// Mongoose Framework Adapter
// Extracts database definitions from Mongoose schemas

import { BaseAdapter } from './baseAdapter';
import {
  FileContent,
  ExtractionCandidate,
  IRTable,
  SupportedFramework,
  SupportedLanguage
} from '@/types/extraction';

export class MongooseAdapter extends BaseAdapter {
  readonly name: SupportedFramework = 'mongoose';
  readonly language: SupportedLanguage = 'javascript';
  readonly filePatterns = ['models/**/*.js', 'schemas/**/*.js', '**/*model*.js'];
  readonly confidence = 85;

  protected matchesFrameworkPatterns(content: string): boolean {
    return /mongoose\.Schema|new\s+Schema/i.test(content);
  }

  protected analyzeContentPatterns(content: string): number {
    let confidence = 0;
    if (content.includes('mongoose.Schema')) confidence += 20;
    if (content.includes('mongoose.model')) confidence += 15;
    return confidence;
  }

  async extractDefinitions(file: FileContent): Promise<ExtractionCandidate[]> {
    return []; // Placeholder
  }

  async parseToIR(candidates: ExtractionCandidate[]): Promise<IRTable[]> {
    return []; // Placeholder
  }

  protected getDataTypeMap(): Record<string, any> {
    return {
      'string': 'VARCHAR',
      'number': 'REAL',
      'boolean': 'BOOLEAN',
      'date': 'DATETIME',
      'objectid': 'VARCHAR',
      'array': 'JSON',
      'mixed': 'JSON'
    };
  }
}
