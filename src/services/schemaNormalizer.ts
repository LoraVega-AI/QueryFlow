// Schema Normalizer Service
// Normalizes and merges extracted schemas from different sources

import { ExtractedSchema, Table, Column, ForeignKey, Index, Constraint, Relationship } from './sqlParser';

export class SchemaNormalizer {
  async normalizeSchemas(schemas: ExtractedSchema[]): Promise<ExtractedSchema[]> {
    if (schemas.length === 0) {
      return [];
    }

    console.log(`🔄 Normalizing ${schemas.length} extracted schemas`);

    // Group schemas by type and source
    const groupedSchemas = this.groupSchemasByType(schemas);
    
    // Normalize each group
    const normalizedGroups = await Promise.all(
      Object.entries(groupedSchemas).map(([type, schemaGroup]) => 
        this.normalizeSchemaGroup(type, schemaGroup)
      )
    );

    // Merge related schemas
    const mergedSchemas = this.mergeRelatedSchemas(normalizedGroups.flat());

    // Calculate final confidence scores
    const finalSchemas = mergedSchemas.map(schema => ({
      ...schema,
      confidence: this.calculateFinalConfidence(schema)
    }));

    console.log(`✅ Normalized to ${finalSchemas.length} schemas`);
    return finalSchemas;
  }

  private groupSchemasByType(schemas: ExtractedSchema[]): { [key: string]: ExtractedSchema[] } {
    const groups: { [key: string]: ExtractedSchema[] } = {};

    for (const schema of schemas) {
      const key = `${schema.type}_${schema.metadata.framework || 'unknown'}`;
      if (!groups[key]) {
        groups[key] = [];
      }
      groups[key].push(schema);
    }

    return groups;
  }

  private async normalizeSchemaGroup(type: string, schemas: ExtractedSchema[]): Promise<ExtractedSchema[]> {
    if (schemas.length === 1) {
      return [this.normalizeSingleSchema(schemas[0])];
    }

    // Merge schemas of the same type
    const mergedSchema = this.mergeSchemasOfSameType(schemas);
    return [mergedSchema];
  }

  private normalizeSingleSchema(schema: ExtractedSchema): ExtractedSchema {
    return {
      ...schema,
      tables: schema.tables.map(table => this.normalizeTable(table)),
      relationships: this.normalizeRelationships(schema.relationships),
      indexes: this.normalizeIndexes(schema.indexes)
    };
  }

  private mergeSchemasOfSameType(schemas: ExtractedSchema[]): ExtractedSchema {
    if (schemas.length === 0) {
      throw new Error('Cannot merge empty schema list');
    }

    const baseSchema = schemas[0];
    const mergedTables = new Map<string, Table>();
    const mergedRelationships: Relationship[] = [];
    const mergedIndexes: Index[] = [];
    const mergedMigrations = new Map<string, any>();

    // Merge tables
    for (const schema of schemas) {
      for (const table of schema.tables) {
        const existingTable = mergedTables.get(table.name);
        if (existingTable) {
          mergedTables.set(table.name, this.mergeTables(existingTable, table));
        } else {
          mergedTables.set(table.name, this.normalizeTable(table));
        }
      }

      // Merge relationships
      mergedRelationships.push(...schema.relationships);

      // Merge indexes
      mergedIndexes.push(...schema.indexes);

      // Merge migrations
      for (const migration of schema.migrations) {
        mergedMigrations.set(migration.id, migration);
      }
    }

    return {
      ...baseSchema,
      name: `${baseSchema.name} (Merged)`,
      tables: Array.from(mergedTables.values()),
      relationships: this.normalizeRelationships(mergedRelationships),
      indexes: this.normalizeIndexes(mergedIndexes),
      migrations: Array.from(mergedMigrations.values()),
      confidence: this.calculateMergedConfidence(schemas)
    };
  }

  private mergeRelatedSchemas(schemas: ExtractedSchema[]): ExtractedSchema[] {
    const merged: ExtractedSchema[] = [];
    const processed = new Set<string>();

    for (const schema of schemas) {
      if (processed.has(schema.id)) {
        continue;
      }

      // Find related schemas (same project, different sources)
      const relatedSchemas = schemas.filter(s => 
        s.id !== schema.id && 
        !processed.has(s.id) &&
        this.areSchemasRelated(schema, s)
      );

      if (relatedSchemas.length > 0) {
        // Merge with related schemas
        const allRelated = [schema, ...relatedSchemas];
        const mergedSchema = this.mergeSchemasOfSameType(allRelated);
        merged.push(mergedSchema);
        
        // Mark all as processed
        allRelated.forEach(s => processed.add(s.id));
      } else {
        merged.push(schema);
        processed.add(schema.id);
      }
    }

    return merged;
  }

  private areSchemasRelated(schema1: ExtractedSchema, schema2: ExtractedSchema): boolean {
    // Check if schemas are from the same project
    const path1 = schema1.metadata.filePath;
    const path2 = schema2.metadata.filePath;
    
    // Same directory or parent directory
    const dir1 = path1.split(/[/\\]/).slice(0, -1).join('/');
    const dir2 = path2.split(/[/\\]/).slice(0, -1).join('/');
    
    return dir1 === dir2 || dir1.startsWith(dir2) || dir2.startsWith(dir1);
  }

  private normalizeTable(table: Table): Table {
    return {
      ...table,
      name: this.normalizeTableName(table.name),
      columns: table.columns.map(col => this.normalizeColumn(col)),
      primaryKey: table.primaryKey?.map(pk => this.normalizeColumnName(pk)),
      foreignKeys: table.foreignKeys.map(fk => this.normalizeForeignKey(fk)),
      indexes: table.indexes.map(idx => this.normalizeIndex(idx)),
      constraints: table.constraints.map(con => this.normalizeConstraint(con))
    };
  }

  private normalizeColumn(column: Column): Column {
    return {
      ...column,
      name: this.normalizeColumnName(column.name),
      type: this.normalizeDataType(column.type),
      nullable: column.nullable ?? true,
      autoIncrement: column.autoIncrement ?? false,
      unique: column.unique ?? false
    };
  }

  private normalizeForeignKey(fk: ForeignKey): ForeignKey {
    return {
      ...fk,
      column: this.normalizeColumnName(fk.column),
      referencedTable: this.normalizeTableName(fk.referencedTable),
      referencedColumn: this.normalizeColumnName(fk.referencedColumn)
    };
  }

  private normalizeIndex(index: Index): Index {
    return {
      ...index,
      name: this.normalizeIndexName(index.name),
      columns: index.columns.map(col => this.normalizeColumnName(col)),
      unique: index.unique ?? false,
      type: index.type || 'btree'
    };
  }

  private normalizeConstraint(constraint: Constraint): Constraint {
    return {
      ...constraint,
      name: this.normalizeConstraintName(constraint.name),
      columns: constraint.columns?.map(col => this.normalizeColumnName(col)) || []
    };
  }

  private normalizeRelationships(relationships: Relationship[]): Relationship[] {
    const normalized = relationships.map(rel => ({
      ...rel,
      id: rel.id || `rel_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      fromTable: this.normalizeTableName(rel.fromTable),
      toTable: this.normalizeTableName(rel.toTable),
      fromColumn: this.normalizeColumnName(rel.fromColumn),
      toColumn: this.normalizeColumnName(rel.toColumn)
    }));

    // Remove duplicates
    const unique = new Map<string, Relationship>();
    for (const rel of normalized) {
      const key = `${rel.fromTable}.${rel.fromColumn}->${rel.toTable}.${rel.toColumn}`;
      if (!unique.has(key)) {
        unique.set(key, rel);
      }
    }

    return Array.from(unique.values());
  }

  private normalizeIndexes(indexes: Index[]): Index[] {
    const normalized = indexes.map(idx => this.normalizeIndex(idx));
    
    // Remove duplicates
    const unique = new Map<string, Index>();
    for (const idx of normalized) {
      const key = `${idx.name}_${idx.columns.join('_')}`;
      if (!unique.has(key)) {
        unique.set(key, idx);
      }
    }

    return Array.from(unique.values());
  }

  private mergeTables(table1: Table, table2: Table): Table {
    const mergedColumns = new Map<string, Column>();
    
    // Add columns from both tables
    [...table1.columns, ...table2.columns].forEach(col => {
      const existing = mergedColumns.get(col.name);
      if (existing) {
        // Merge column properties, preferring non-null values
        mergedColumns.set(col.name, {
          ...existing,
          ...col,
          nullable: col.nullable ?? existing.nullable,
          autoIncrement: col.autoIncrement ?? existing.autoIncrement,
          unique: col.unique ?? existing.unique
        });
      } else {
        mergedColumns.set(col.name, col);
      }
    });

    return {
      name: table1.name,
      columns: Array.from(mergedColumns.values()),
      primaryKey: [...new Set([...(table1.primaryKey || []), ...(table2.primaryKey || [])])],
      foreignKeys: [...table1.foreignKeys, ...table2.foreignKeys],
      indexes: [...table1.indexes, ...table2.indexes],
      constraints: [...table1.constraints, ...table2.constraints]
    };
  }

  // Normalization helper methods
  private normalizeTableName(name: string): string {
    return name.toLowerCase().replace(/[^a-z0-9_]/g, '_');
  }

  private normalizeColumnName(name: string): string {
    return name.toLowerCase().replace(/[^a-z0-9_]/g, '_');
  }

  private normalizeDataType(type: string): string {
    const normalized = type.toUpperCase();
    
    // Map common type variations
    const typeMap: { [key: string]: string } = {
      'VARCHAR': 'VARCHAR',
      'CHAR': 'CHAR',
      'TEXT': 'TEXT',
      'LONGTEXT': 'TEXT',
      'MEDIUMTEXT': 'TEXT',
      'TINYTEXT': 'TEXT',
      'INT': 'INTEGER',
      'INTEGER': 'INTEGER',
      'BIGINT': 'BIGINT',
      'SMALLINT': 'SMALLINT',
      'TINYINT': 'TINYINT',
      'FLOAT': 'FLOAT',
      'DOUBLE': 'DOUBLE',
      'DECIMAL': 'DECIMAL',
      'NUMERIC': 'DECIMAL',
      'BOOLEAN': 'BOOLEAN',
      'BOOL': 'BOOLEAN',
      'DATE': 'DATE',
      'DATETIME': 'TIMESTAMP',
      'TIMESTAMP': 'TIMESTAMP',
      'TIME': 'TIME',
      'YEAR': 'YEAR',
      'JSON': 'JSON',
      'JSONB': 'JSON',
      'UUID': 'UUID',
      'BLOB': 'BLOB',
      'LONGBLOB': 'BLOB',
      'MEDIUMBLOB': 'BLOB',
      'TINYBLOB': 'BLOB'
    };

    return typeMap[normalized] || normalized;
  }

  private normalizeIndexName(name: string): string {
    return name.toLowerCase().replace(/[^a-z0-9_]/g, '_');
  }

  private normalizeConstraintName(name: string): string {
    return name.toLowerCase().replace(/[^a-z0-9_]/g, '_');
  }

  private calculateMergedConfidence(schemas: ExtractedSchema[]): number {
    if (schemas.length === 0) return 0;
    
    const totalConfidence = schemas.reduce((sum, schema) => sum + schema.confidence, 0);
    const averageConfidence = totalConfidence / schemas.length;
    
    // Boost confidence for merged schemas (more sources = more reliable)
    const boost = Math.min(schemas.length * 0.05, 0.2);
    
    return Math.min(averageConfidence + boost, 1.0);
  }

  private calculateFinalConfidence(schema: ExtractedSchema): number {
    let confidence = schema.confidence;
    
    // Boost confidence based on schema completeness
    if (schema.tables.length > 0) confidence += 0.1;
    if (schema.relationships.length > 0) confidence += 0.05;
    if (schema.indexes.length > 0) confidence += 0.05;
    if (schema.migrations.length > 0) confidence += 0.05;
    
    // Boost confidence for well-structured schemas
    const hasPrimaryKeys = schema.tables.some(table => table.primaryKey && table.primaryKey.length > 0);
    if (hasPrimaryKeys) confidence += 0.05;
    
    const hasForeignKeys = schema.tables.some(table => table.foreignKeys.length > 0);
    if (hasForeignKeys) confidence += 0.05;
    
    return Math.min(confidence, 1.0);
  }
}

export default SchemaNormalizer;
