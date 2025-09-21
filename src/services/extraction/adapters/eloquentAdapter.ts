// Eloquent Framework Adapter

import { BaseAdapter } from './baseAdapter';
import { FileContent, ExtractionCandidate, IRTable, SupportedFramework, SupportedLanguage } from '@/types/extraction';

export class EloquentAdapter extends BaseAdapter {
  readonly name: SupportedFramework = 'eloquent';
  readonly language: SupportedLanguage = 'php';
  readonly filePatterns = ['app/Models/*.php', 'app/*.php'];
  readonly confidence = 85;

  protected matchesFrameworkPatterns(content: string): boolean {
    return /extends\s+Model|protected\s+\$fillable/i.test(content);
  }

  protected analyzeContentPatterns(content: string): number {
    return content.includes('extends Model') ? 20 : 0;
  }

  async extractDefinitions(file: FileContent): Promise<ExtractionCandidate[]> {
    return [];
  }

  async parseToIR(candidates: ExtractionCandidate[]): Promise<IRTable[]> {
    return [];
  }

  protected getDataTypeMap(): Record<string, any> {
    return { 'string': 'VARCHAR', 'integer': 'INTEGER' };
  }
}
