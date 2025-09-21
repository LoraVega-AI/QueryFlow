// TypeORM Framework Adapter

import { BaseAdapter } from './baseAdapter';
import { FileContent, ExtractionCandidate, IRTable, SupportedFramework, SupportedLanguage } from '@/types/extraction';

export class TypeORMAdapter extends BaseAdapter {
  readonly name: SupportedFramework = 'typeorm';
  readonly language: SupportedLanguage = 'typescript';
  readonly filePatterns = ['entities/**/*.ts', 'entity/**/*.ts', '**/*entity*.ts'];
  readonly confidence = 90;

  protected matchesFrameworkPatterns(content: string): boolean {
    return /@Entity|@Column|@PrimaryGeneratedColumn/i.test(content);
  }

  protected analyzeContentPatterns(content: string): number {
    let confidence = 0;
    if (content.includes('@Entity')) confidence += 25;
    if (content.includes('@Column')) confidence += 15;
    return confidence;
  }

  async extractDefinitions(file: FileContent): Promise<ExtractionCandidate[]> {
    return [];
  }

  async parseToIR(candidates: ExtractionCandidate[]): Promise<IRTable[]> {
    return [];
  }

  protected getDataTypeMap(): Record<string, any> {
    return {
      'varchar': 'VARCHAR',
      'int': 'INTEGER',
      'text': 'TEXT',
      'boolean': 'BOOLEAN',
      'datetime': 'DATETIME',
      'decimal': 'DECIMAL'
    };
  }
}
