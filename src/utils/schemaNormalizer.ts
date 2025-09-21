import { writeFile } from 'fs/promises';

export interface NormalizedColumn {
  name: string;
  type: string;
  nullable?: boolean;
  primaryKey?: boolean;
  defaultValue?: string | number | null;
  unique?: boolean;
  autoIncrement?: boolean;
}

export interface NormalizedTable {
  name: string;
  columns: NormalizedColumn[];
  rowCount?: number;
  relationships?: NormalizedRelationship[];
  indexes?: NormalizedIndex[];
}

export interface NormalizedRelationship {
  fromTable: string;
  fromColumn: string;
  toTable: string;
  toColumn: string;
  onUpdate?: string;
  onDelete?: string;
}

export interface NormalizedIndex {
  name: string;
  columns?: string[];
  unique?: boolean;
}

export interface NormalizedSchema {
  name: string;
  tables: NormalizedTable[];
  relationships: NormalizedRelationship[];
  indexes: NormalizedIndex[];
  version?: number;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Merge and normalize schema fragments coming from various adapters into a single
 * SQLite-compatible representation. It can also output a `schema.sql` file for debugging.
 */
export class SchemaNormalizer {
  static normalize(inputTables: NormalizedTable[], name = 'Normalized Schema'): NormalizedSchema {
    const relationships = inputTables.flatMap(t => t.relationships || []);
    const indexes = inputTables.flatMap(t => t.indexes || []);

    return {
      name,
      tables: inputTables,
      relationships,
      indexes,
      version: 1,
      createdAt: new Date(),
      updatedAt: new Date()
    };
  }

  /**
   * Generate SQLite-compatible CREATE statements from the normalized schema.
   */
  static toSQLiteDDL(schema: NormalizedSchema): string {
    const ddl: string[] = [];
    for (const table of schema.tables) {
      const colsDDL = table.columns.map(col => {
        const parts = [
          `\`${col.name}\``,
          col.type || 'TEXT',
          col.primaryKey ? 'PRIMARY KEY' : '',
          col.autoIncrement ? 'AUTOINCREMENT' : '',
          col.unique ? 'UNIQUE' : '',
          col.nullable === false ? 'NOT NULL' : '',
          col.defaultValue != null ? `DEFAULT '${col.defaultValue}'` : ''
        ].filter(Boolean).join(' ');
        return parts;
      });
      ddl.push(`CREATE TABLE IF NOT EXISTS \`${table.name}\` (\n  ${colsDDL.join(',\n  ')}\n);`);
    }
    return ddl.join('\n\n');
  }

  static async writeDDLToFile(schema: NormalizedSchema, filePath: string): Promise<void> {
    const ddl = this.toSQLiteDDL(schema);
    await writeFile(filePath, ddl);
  }
}

export default SchemaNormalizer;
