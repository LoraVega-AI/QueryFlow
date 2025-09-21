// JPA Framework Adapter

import { BaseAdapter } from './baseAdapter';
import { FileContent, ExtractionCandidate, IRTable, SupportedFramework, SupportedLanguage } from '@/types/extraction';

export class JPAAdapter extends BaseAdapter {
  readonly name: SupportedFramework = 'jpa';
  readonly language: SupportedLanguage = 'java';
  readonly filePatterns = ['**/*Entity*.java'];
  readonly confidence = 85;

  protected matchesFrameworkPatterns(content: string): boolean {
    return /@Entity|@Id/i.test(content);
  }

  protected analyzeContentPatterns(content: string): number {
    return content.includes('@Entity') ? 20 : 0;
  }

  async extractDefinitions(file: FileContent): Promise<ExtractionCandidate[]> {
    return [];
  }

  async parseToIR(candidates: ExtractionCandidate[]): Promise<IRTable[]> {
    return [];
  }

  protected getDataTypeMap(): Record<string, any> {
    return { 'string': 'VARCHAR', 'int': 'INTEGER' };
  }
}
