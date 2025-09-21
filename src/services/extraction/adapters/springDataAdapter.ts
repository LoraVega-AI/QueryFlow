// Spring Data Framework Adapter

import { BaseAdapter } from './baseAdapter';
import { FileContent, ExtractionCandidate, IRTable, SupportedFramework, SupportedLanguage } from '@/types/extraction';

export class SpringDataAdapter extends BaseAdapter {
  readonly name: SupportedFramework = 'spring-data';
  readonly language: SupportedLanguage = 'java';
  readonly filePatterns = ['**/*Repository*.java'];
  readonly confidence = 75;

  protected matchesFrameworkPatterns(content: string): boolean {
    return /@Repository|JpaRepository/i.test(content);
  }

  protected analyzeContentPatterns(content: string): number {
    return content.includes('@Repository') ? 15 : 0;
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
