// Enhanced Profile Service for Accurate Data Validation
// Provides comprehensive statistical analysis and data quality assessment

import { Table, Column, DatabaseRecord, DatabaseSchema } from '@/types/database';

export interface EnhancedColumnProfile {
  columnId: string;
  columnName: string;
  dataType: string;
  totalCount: number;
  nullCount: number;
  uniqueCount: number;
  duplicateCount: number;
  
  // Statistical measures
  completeness: number; // % non-null values
  uniqueness: number; // % unique values
  validity: number; // % values matching expected format/type
  consistency: number; // % values following detected patterns
  
  // Type-specific statistics
  minLength?: number;
  maxLength?: number;
  avgLength?: number;
  minValue?: number;
  maxValue?: number;
  avgValue?: number;
  medianValue?: number;
  standardDeviation?: number;
  
  // Data distribution
  mostCommonValues: Array<{ value: any; count: number; percentage: number }>;
  valueDistribution: Array<{ range: string; count: number; percentage: number }>;
  patterns: Array<{ pattern: string; count: number; percentage: number; description: string }>;
  outliers: Array<{ value: any; score: number; reason: string }>;
  
  // Quality assessment
  qualityScore: number;
  qualityIssues: Array<{ type: string; severity: 'low' | 'medium' | 'high'; description: string; count: number }>;
  
  // Data type validation
  typeViolations: Array<{ value: any; expectedType: string; actualType: string; row: number }>;
  formatViolations: Array<{ value: any; expectedFormat: string; row: number }>;
  
  // Constraints validation
  constraintViolations: Array<{ constraint: string; value: any; row: number; description: string }>;
}

export interface EnhancedTableProfile {
  tableId: string;
  tableName: string;
  totalRecords: number;
  validRecords: number;
  invalidRecords: number;
  duplicateRecords: number;
  
  // Enhanced metrics
  dataCompleteness: number; // Overall % of non-null values
  dataConsistency: number; // Overall format consistency
  referentialIntegrity: number; // % valid foreign key references
  businessRuleCompliance: number; // % records passing business rules
  
  columnProfiles: EnhancedColumnProfile[];
  
  // Relationship analysis
  relationshipIssues: Array<{
    type: 'orphaned_record' | 'missing_reference' | 'circular_reference';
    fromTable: string;
    toTable: string;
    count: number;
    severity: 'low' | 'medium' | 'high';
  }>;
  
  // Table-level quality
  overallQualityScore: number;
  profiledAt: Date;
  
  // Data patterns and anomalies
  recordPatterns: Array<{ pattern: string; count: number; percentage: number }>;
  suspiciousRecords: Array<{ rowIndex: number; issues: string[]; severity: 'low' | 'medium' | 'high' }>;
}

export class EnhancedProfileService {
  
  /**
   * Generate comprehensive table profile with real statistical analysis
   */
  static async generateTableProfile(
    table: Table, 
    records: DatabaseRecord[], 
    schema?: DatabaseSchema
  ): Promise<EnhancedTableProfile> {
    console.log(`🔍 Generating enhanced profile for table: ${table.name} (${records.length} records)`);
    
    // Generate column profiles
    const columnProfiles: EnhancedColumnProfile[] = [];
    for (const column of table.columns) {
      const profile = await this.generateColumnProfile(column, records, table);
      columnProfiles.push(profile);
    }
    
    // Analyze table-level metrics
    const duplicateRecords = this.findDuplicateRecords(records, table);
    const validRecords = this.findValidRecords(records, table, columnProfiles);
    const invalidRecords = records.length - validRecords.length;
    
    // Calculate completeness across all columns
    const dataCompleteness = this.calculateDataCompleteness(columnProfiles);
    
    // Calculate consistency across all columns
    const dataConsistency = this.calculateDataConsistency(columnProfiles);
    
    // Analyze referential integrity
    const referentialIntegrity = schema 
      ? await this.analyzeReferentialIntegrity(table, records, schema)
      : 100;
    
    // Analyze relationships
    const relationshipIssues = schema 
      ? await this.analyzeRelationshipIssues(table, records, schema)
      : [];
    
    // Detect record patterns
    const recordPatterns = this.detectRecordPatterns(records, table);
    
    // Find suspicious records
    const suspiciousRecords = this.findSuspiciousRecords(records, table, columnProfiles);
    
    // Calculate overall quality score
    const overallQualityScore = this.calculateOverallQuality(columnProfiles, {
      dataCompleteness,
      dataConsistency,
      referentialIntegrity,
      duplicatePercentage: (duplicateRecords.length / records.length) * 100
    });
    
    return {
      tableId: table.id,
      tableName: table.name,
      totalRecords: records.length,
      validRecords: validRecords.length,
      invalidRecords: invalidRecords,
      duplicateRecords: duplicateRecords.length,
      dataCompleteness,
      dataConsistency,
      referentialIntegrity,
      businessRuleCompliance: this.calculateBusinessRuleCompliance(validRecords, records),
      columnProfiles,
      relationshipIssues,
      overallQualityScore,
      profiledAt: new Date(),
      recordPatterns,
      suspiciousRecords
    };
  }
  
  /**
   * Generate detailed column profile with comprehensive statistics
   */
  static async generateColumnProfile(
    column: Column, 
    records: DatabaseRecord[], 
    table: Table
  ): Promise<EnhancedColumnProfile> {
    const values = records.map((record, index) => ({
      value: record.data?.[column.name],
      rowIndex: index
    }));
    
    const nonNullValues = values.filter(item => 
      item.value !== null && 
      item.value !== undefined && 
      item.value !== ''
    );
    
    const nullCount = values.length - nonNullValues.length;
    const uniqueValues = new Set(nonNullValues.map(item => item.value));
    const duplicateCount = nonNullValues.length - uniqueValues.size;
    
    // Calculate basic percentages
    const completeness = values.length > 0 ? (nonNullValues.length / values.length) * 100 : 0;
    const uniqueness = nonNullValues.length > 0 ? (uniqueValues.size / nonNullValues.length) * 100 : 0;
    
    // Analyze value frequency
    const valueFrequency = new Map<any, number>();
    nonNullValues.forEach(item => {
      const value = item.value;
      valueFrequency.set(value, (valueFrequency.get(value) || 0) + 1);
    });
    
    const mostCommonValues = Array.from(valueFrequency.entries())
      .map(([value, count]) => ({
        value,
        count,
        percentage: (count / nonNullValues.length) * 100
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
    
    // Type validation
    const typeViolations = this.findTypeViolations(column, values);
    const formatViolations = this.findFormatViolations(column, values);
    const constraintViolations = this.findConstraintViolations(column, values);
    
    // Calculate validity based on type/format/constraint violations
    const totalViolations = typeViolations.length + formatViolations.length + constraintViolations.length;
    const validity = nonNullValues.length > 0 
      ? Math.max(0, ((nonNullValues.length - totalViolations) / nonNullValues.length) * 100)
      : 0;
    
    // Detect patterns
    const patterns = this.detectColumnPatterns(nonNullValues.map(item => item.value), column);
    const consistency = this.calculatePatternConsistency(patterns, nonNullValues.length);
    
    // Statistical analysis for numeric columns
    let minValue: number | undefined, maxValue: number | undefined, avgValue: number | undefined, medianValue: number | undefined, standardDeviation: number | undefined;
    if (this.isNumericType(column.type)) {
      const numericValues = nonNullValues
        .map(item => item.value)
        .filter(v => typeof v === 'number' && !isNaN(v));
      
      if (numericValues.length > 0) {
        minValue = Math.min(...numericValues);
        maxValue = Math.max(...numericValues);
        avgValue = numericValues.reduce((sum, val) => sum + val, 0) / numericValues.length;
        
        const sorted = [...numericValues].sort((a, b) => a - b);
        medianValue = sorted.length % 2 === 0
          ? (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2
          : sorted[Math.floor(sorted.length / 2)];
        
        const variance = numericValues.reduce((sum, val) => sum + Math.pow(val - (avgValue || 0), 2), 0) / numericValues.length;
        standardDeviation = Math.sqrt(variance);
      }
    }
    
    // Statistical analysis for text columns
    let minLength: number | undefined, maxLength: number | undefined, avgLength: number | undefined;
    if (this.isTextType(column.type)) {
      const textValues = nonNullValues
        .map(item => item.value)
        .filter(v => typeof v === 'string');
      
      if (textValues.length > 0) {
        const lengths = textValues.map(v => v.length);
        minLength = Math.min(...lengths);
        maxLength = Math.max(...lengths);
        avgLength = lengths.reduce((sum, len) => sum + len, 0) / lengths.length;
      }
    }
    
    // Detect outliers
    const outliers = this.detectOutliers(nonNullValues.map(item => item.value), column);
    
    // Generate value distribution
    const valueDistribution = this.generateValueDistribution(nonNullValues.map(item => item.value), column);
    
    // Identify quality issues
    const qualityIssues = this.identifyQualityIssues(column, {
      nullCount,
      duplicateCount,
      typeViolations,
      formatViolations,
      constraintViolations,
      outliers
    });
    
    // Calculate overall quality score
    const qualityScore = this.calculateColumnQualityScore({
      completeness,
      uniqueness,
      validity,
      consistency,
      violationCount: totalViolations,
      totalCount: values.length
    });
    
    return {
      columnId: column.id,
      columnName: column.name,
      dataType: column.type,
      totalCount: values.length,
      nullCount,
      uniqueCount: uniqueValues.size,
      duplicateCount,
      completeness,
      uniqueness,
      validity,
      consistency,
      minLength,
      maxLength,
      avgLength,
      minValue,
      maxValue,
      avgValue,
      medianValue,
      standardDeviation,
      mostCommonValues,
      valueDistribution,
      patterns,
      outliers,
      qualityScore,
      qualityIssues,
      typeViolations,
      formatViolations,
      constraintViolations
    };
  }
  
  /**
   * Find records with duplicate values across key columns
   */
  private static findDuplicateRecords(records: DatabaseRecord[], table: Table): DatabaseRecord[] {
    const keyColumns = table.columns.filter(col => 
      (col as any).isPrimaryKey || 
      col.constraints?.unique ||
      col.name.toLowerCase().includes('id')
    );
    
    if (keyColumns.length === 0) {
      // Use all columns if no key columns found
      return this.findExactDuplicates(records);
    }
    
    const seen = new Set<string>();
    const duplicates: DatabaseRecord[] = [];
    
    records.forEach(record => {
      const keyValue = keyColumns
        .map(col => record.data?.[col.name])
        .join('|');
      
      if (seen.has(keyValue)) {
        duplicates.push(record);
      } else {
        seen.add(keyValue);
      }
    });
    
    return duplicates;
  }
  
  /**
   * Find exact duplicate records
   */
  private static findExactDuplicates(records: DatabaseRecord[]): DatabaseRecord[] {
    const seen = new Set<string>();
    const duplicates: DatabaseRecord[] = [];
    
    records.forEach(record => {
      const recordString = JSON.stringify(record.data);
      
      if (seen.has(recordString)) {
        duplicates.push(record);
      } else {
        seen.add(recordString);
      }
    });
    
    return duplicates;
  }
  
  /**
   * Find valid records based on column profiles
   */
  private static findValidRecords(
    records: DatabaseRecord[], 
    table: Table,
    columnProfiles: EnhancedColumnProfile[]
  ): DatabaseRecord[] {
    return records.filter(record => {
      // Check each column for violations
      for (const profile of columnProfiles) {
        const value = record.data?.[profile.columnName];
        
        // Check required fields
        const column = table.columns.find(col => col.id === profile.columnId);
        if (column && !column.nullable && (value === null || value === undefined || value === '')) {
          return false;
        }
        
        // Check type violations
        if (profile.typeViolations.some(violation => 
          violation.value === value && violation.row === records.indexOf(record)
        )) {
          return false;
        }
        
        // Check constraint violations
        if (profile.constraintViolations.some(violation => 
          violation.value === value && violation.row === records.indexOf(record)
        )) {
          return false;
        }
      }
      
      return true;
    });
  }
  
  /**
   * Calculate data completeness across all columns
   */
  private static calculateDataCompleteness(columnProfiles: EnhancedColumnProfile[]): number {
    if (columnProfiles.length === 0) return 0;
    
    const totalCompleteness = columnProfiles.reduce((sum, profile) => sum + profile.completeness, 0);
    return totalCompleteness / columnProfiles.length;
  }
  
  /**
   * Calculate data consistency across all columns
   */
  private static calculateDataConsistency(columnProfiles: EnhancedColumnProfile[]): number {
    if (columnProfiles.length === 0) return 0;
    
    const totalConsistency = columnProfiles.reduce((sum, profile) => sum + profile.consistency, 0);
    return totalConsistency / columnProfiles.length;
  }
  
  /**
   * Analyze referential integrity
   */
  private static async analyzeReferentialIntegrity(
    table: Table, 
    records: DatabaseRecord[], 
    schema: DatabaseSchema
  ): Promise<number> {
    // Find foreign key relationships
    const foreignKeys = table.columns.filter(col => 
      (col as any).references || 
      (col.constraints as any)?.foreignKey ||
      col.name.toLowerCase().endsWith('_id')
    );
    
    if (foreignKeys.length === 0) return 100;
    
    let totalReferences = 0;
    let validReferences = 0;
    
    for (const fkColumn of foreignKeys) {
      for (const record of records) {
        const fkValue = record.data?.[fkColumn.name];
        if (fkValue !== null && fkValue !== undefined) {
          totalReferences++;
          
          // Check if reference exists in target table
          const targetTable = this.findTargetTable(fkColumn, schema);
          if (targetTable && this.referenceExists(fkValue, targetTable, schema)) {
            validReferences++;
          }
        }
      }
    }
    
    return totalReferences > 0 ? (validReferences / totalReferences) * 100 : 100;
  }
  
  /**
   * Analyze relationship issues
   */
  private static async analyzeRelationshipIssues(
    table: Table, 
    records: DatabaseRecord[], 
    schema: DatabaseSchema
  ): Promise<Array<{
    type: 'orphaned_record' | 'missing_reference' | 'circular_reference';
    fromTable: string;
    toTable: string;
    count: number;
    severity: 'low' | 'medium' | 'high';
  }>> {
    // Implementation would analyze relationship issues
    // For now, return empty array - this would be a complex analysis
    return [];
  }
  
  /**
   * Detect record patterns
   */
  private static detectRecordPatterns(records: DatabaseRecord[], table: Table): Array<{
    pattern: string;
    count: number;
    percentage: number;
  }> {
    // Analyze common record patterns
    const patterns = new Map<string, number>();
    
    records.forEach(record => {
      // Create pattern based on non-null fields
      const nonNullFields = Object.keys(record.data || {})
        .filter(key => record.data?.[key] !== null && record.data?.[key] !== undefined);
      
      const pattern = `Fields: ${nonNullFields.sort().join(', ')}`;
      patterns.set(pattern, (patterns.get(pattern) || 0) + 1);
    });
    
    return Array.from(patterns.entries())
      .map(([pattern, count]) => ({
        pattern,
        count,
        percentage: (count / records.length) * 100
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  }
  
  /**
   * Find suspicious records
   */
  private static findSuspiciousRecords(
    records: DatabaseRecord[], 
    table: Table, 
    columnProfiles: EnhancedColumnProfile[]
  ): Array<{
    rowIndex: number;
    issues: string[];
    severity: 'low' | 'medium' | 'high';
  }> {
    const suspiciousRecords: Array<{
      rowIndex: number;
      issues: string[];
      severity: 'low' | 'medium' | 'high';
    }> = [];
    
    records.forEach((record, index) => {
      const issues: string[] = [];
      
      // Check for too many null values
      const nullCount = Object.values(record.data || {})
        .filter(value => value === null || value === undefined).length;
      
      if (nullCount > table.columns.length * 0.5) {
        issues.push(`High null count: ${nullCount}/${table.columns.length} fields`);
      }
      
      // Check for outlier values
      columnProfiles.forEach(profile => {
        const value = record.data?.[profile.columnName];
        const isOutlier = profile.outliers.some(outlier => outlier.value === value);
        if (isOutlier) {
          issues.push(`Outlier in ${profile.columnName}: ${value}`);
        }
      });
      
      if (issues.length > 0) {
        suspiciousRecords.push({
          rowIndex: index,
          issues,
          severity: issues.length > 2 ? 'high' : issues.length > 1 ? 'medium' : 'low'
        });
      }
    });
    
    return suspiciousRecords.slice(0, 10); // Return top 10 suspicious records
  }
  
  /**
   * Find type violations
   */
  private static findTypeViolations(column: Column, values: Array<{ value: any; rowIndex: number }>): Array<{
    value: any;
    expectedType: string;
    actualType: string;
    row: number;
  }> {
    const violations: Array<{
      value: any;
      expectedType: string;
      actualType: string;
      row: number;
    }> = [];
    
    values.forEach(item => {
      if (item.value === null || item.value === undefined) return;
      
      const expectedType = this.getExpectedJSType(column.type);
      const actualType = typeof item.value;
      
      if (expectedType !== actualType && !this.isValidTypeCoercion(item.value, column.type)) {
        violations.push({
          value: item.value,
          expectedType,
          actualType,
          row: item.rowIndex
        });
      }
    });
    
    return violations;
  }
  
  /**
   * Find format violations
   */
  private static findFormatViolations(column: Column, values: Array<{ value: any; rowIndex: number }>): Array<{
    value: any;
    expectedFormat: string;
    row: number;
  }> {
    const violations: Array<{
      value: any;
      expectedFormat: string;
      row: number;
    }> = [];
    
    const expectedFormats = this.getExpectedFormats(column);
    
    values.forEach(item => {
      if (item.value === null || item.value === undefined) return;
      
      for (const format of expectedFormats) {
        if (!this.matchesFormat(item.value, format.pattern)) {
          violations.push({
            value: item.value,
            expectedFormat: format.description,
            row: item.rowIndex
          });
          break;
        }
      }
    });
    
    return violations;
  }
  
  /**
   * Find constraint violations
   */
  private static findConstraintViolations(column: Column, values: Array<{ value: any; rowIndex: number }>): Array<{
    constraint: string;
    value: any;
    row: number;
    description: string;
  }> {
    const violations: Array<{
      constraint: string;
      value: any;
      row: number;
      description: string;
    }> = [];
    
    values.forEach(item => {
      if (item.value === null || item.value === undefined) {
        if (!column.nullable) {
          violations.push({
            constraint: 'NOT NULL',
            value: item.value,
            row: item.rowIndex,
            description: `Column ${column.name} cannot be null`
          });
        }
        return;
      }
      
      // Check length constraints for text
      if (this.isTextType(column.type)) {
        const maxLength = column.constraints?.maxLength || this.getDefaultMaxLength(column.type);
        if (typeof item.value === 'string' && item.value.length > maxLength) {
          violations.push({
            constraint: 'MAX_LENGTH',
            value: item.value,
            row: item.rowIndex,
            description: `Value exceeds maximum length of ${maxLength}`
          });
        }
      }
      
      // Check numeric constraints
      if (this.isNumericType(column.type) && typeof item.value === 'number') {
        if ((column.constraints as any)?.min !== undefined && item.value < (column.constraints as any).min) {
          violations.push({
            constraint: 'MIN_VALUE',
            value: item.value,
            row: item.rowIndex,
            description: `Value is below minimum of ${(column.constraints as any).min}`
          });
        }
        
        if ((column.constraints as any)?.max !== undefined && item.value > (column.constraints as any).max) {
          violations.push({
            constraint: 'MAX_VALUE',
            value: item.value,
            row: item.rowIndex,
            description: `Value exceeds maximum of ${(column.constraints as any).max}`
          });
        }
      }
    });
    
    return violations;
  }
  
  /**
   * Detect column patterns
   */
  private static detectColumnPatterns(values: any[], column: Column): Array<{
    pattern: string;
    count: number;
    percentage: number;
    description: string;
  }> {
    if (!this.isTextType(column.type)) return [];
    
    const textValues = values.filter(v => typeof v === 'string');
    if (textValues.length === 0) return [];
    
    const patterns = [
      {
        name: 'Email',
        regex: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
        description: 'Valid email format'
      },
      {
        name: 'Phone',
        regex: /^[\+]?[\d\s\-\(\)]{7,15}$/,
        description: 'Phone number format'
      },
      {
        name: 'URL',
        regex: /^https?:\/\/[^\s]+$/,
        description: 'URL format'
      },
      {
        name: 'Date',
        regex: /^\d{4}-\d{2}-\d{2}$/,
        description: 'Date format (YYYY-MM-DD)'
      },
      {
        name: 'UUID',
        regex: /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
        description: 'UUID format'
      },
      {
        name: 'Alphanumeric',
        regex: /^[a-zA-Z0-9]+$/,
        description: 'Only letters and numbers'
      },
      {
        name: 'Numeric',
        regex: /^\d+$/,
        description: 'Only numbers'
      }
    ];
    
    const detectedPatterns = patterns
      .map(pattern => {
        const matchCount = textValues.filter(value => pattern.regex.test(value)).length;
        return {
          pattern: pattern.name,
          count: matchCount,
          percentage: (matchCount / textValues.length) * 100,
          description: pattern.description
        };
      })
      .filter(result => result.count > 0)
      .sort((a, b) => b.percentage - a.percentage);
    
    return detectedPatterns;
  }
  
  /**
   * Calculate pattern consistency
   */
  private static calculatePatternConsistency(
    patterns: Array<{ pattern: string; count: number; percentage: number }>,
    totalCount: number
  ): number {
    if (patterns.length === 0 || totalCount === 0) return 100;
    
    // Find the dominant pattern
    const dominantPattern = patterns[0];
    return dominantPattern ? dominantPattern.percentage : 0;
  }
  
  /**
   * Detect outliers in values
   */
  private static detectOutliers(values: any[], column: Column): Array<{
    value: any;
    score: number;
    reason: string;
  }> {
    const outliers: Array<{ value: any; score: number; reason: string }> = [];
    
    if (this.isNumericType(column.type)) {
      const numericValues = values.filter(v => typeof v === 'number' && !isNaN(v));
      if (numericValues.length < 3) return outliers;
      
      const mean = numericValues.reduce((sum, val) => sum + val, 0) / numericValues.length;
      const variance = numericValues.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / numericValues.length;
      const stdDev = Math.sqrt(variance);
      
      numericValues.forEach(value => {
        const zScore = Math.abs((value - mean) / stdDev);
        if (zScore > 2.5) { // Values beyond 2.5 standard deviations
          outliers.push({
            value,
            score: zScore,
            reason: `Value is ${zScore.toFixed(2)} standard deviations from mean`
          });
        }
      });
    } else if (this.isTextType(column.type)) {
      const textValues = values.filter(v => typeof v === 'string');
      if (textValues.length < 3) return outliers;
      
      const lengths = textValues.map(v => v.length);
      const avgLength = lengths.reduce((sum, len) => sum + len, 0) / lengths.length;
      
      textValues.forEach(value => {
        if (value.length > avgLength * 3) {
          outliers.push({
            value,
            score: value.length / avgLength,
            reason: `Text is ${(value.length / avgLength).toFixed(1)}x longer than average`
          });
        }
      });
    }
    
    return outliers.slice(0, 5); // Return top 5 outliers
  }
  
  /**
   * Generate value distribution
   */
  private static generateValueDistribution(values: any[], column: Column): Array<{
    range: string;
    count: number;
    percentage: number;
  }> {
    if (this.isNumericType(column.type)) {
      const numericValues = values.filter(v => typeof v === 'number' && !isNaN(v));
      if (numericValues.length === 0) return [];
      
      const min = Math.min(...numericValues);
      const max = Math.max(...numericValues);
      const bucketCount = Math.min(10, Math.ceil(Math.sqrt(numericValues.length)));
      const bucketSize = (max - min) / bucketCount;
      
      const buckets = Array.from({ length: bucketCount }, (_, i) => ({
        range: `${(min + i * bucketSize).toFixed(1)} - ${(min + (i + 1) * bucketSize).toFixed(1)}`,
        count: 0,
        percentage: 0
      }));
      
      numericValues.forEach(value => {
        const bucketIndex = Math.min(Math.floor((value - min) / bucketSize), bucketCount - 1);
        buckets[bucketIndex].count++;
      });
      
      buckets.forEach(bucket => {
        bucket.percentage = (bucket.count / numericValues.length) * 100;
      });
      
      return buckets.filter(bucket => bucket.count > 0);
    }
    
    return [];
  }
  
  /**
   * Identify quality issues
   */
  private static identifyQualityIssues(column: Column, metrics: {
    nullCount: number;
    duplicateCount: number;
    typeViolations: any[];
    formatViolations: any[];
    constraintViolations: any[];
    outliers: any[];
  }): Array<{
    type: string;
    severity: 'low' | 'medium' | 'high';
    description: string;
    count: number;
  }> {
    const issues: Array<{
      type: string;
      severity: 'low' | 'medium' | 'high';
      description: string;
      count: number;
    }> = [];
    
    if (metrics.nullCount > 0 && !column.nullable) {
      issues.push({
        type: 'null_values',
        severity: 'high',
        description: 'Null values in non-nullable column',
        count: metrics.nullCount
      });
    }
    
    if (metrics.typeViolations.length > 0) {
      issues.push({
        type: 'type_violations',
        severity: 'high',
        description: 'Values with incorrect data types',
        count: metrics.typeViolations.length
      });
    }
    
    if (metrics.formatViolations.length > 0) {
      issues.push({
        type: 'format_violations',
        severity: 'medium',
        description: 'Values not matching expected format',
        count: metrics.formatViolations.length
      });
    }
    
    if (metrics.constraintViolations.length > 0) {
      issues.push({
        type: 'constraint_violations',
        severity: 'high',
        description: 'Values violating column constraints',
        count: metrics.constraintViolations.length
      });
    }
    
    if (metrics.duplicateCount > 0 && column.constraints?.unique) {
      issues.push({
        type: 'duplicate_values',
        severity: 'medium',
        description: 'Duplicate values in unique column',
        count: metrics.duplicateCount
      });
    }
    
    if (metrics.outliers.length > 0) {
      issues.push({
        type: 'outliers',
        severity: 'low',
        description: 'Statistical outliers detected',
        count: metrics.outliers.length
      });
    }
    
    return issues;
  }
  
  /**
   * Calculate column quality score
   */
  private static calculateColumnQualityScore(metrics: {
    completeness: number;
    uniqueness: number;
    validity: number;
    consistency: number;
    violationCount: number;
    totalCount: number;
  }): number {
    // Weighted quality score calculation
    const weights = {
      completeness: 0.25,
      validity: 0.35,
      consistency: 0.25,
      uniqueness: 0.15
    };
    
    const score = 
      metrics.completeness * weights.completeness +
      metrics.validity * weights.validity +
      metrics.consistency * weights.consistency +
      metrics.uniqueness * weights.uniqueness;
    
    // Apply penalty for violations
    const violationPenalty = metrics.totalCount > 0 
      ? (metrics.violationCount / metrics.totalCount) * 20 
      : 0;
    
    return Math.max(0, Math.min(100, score - violationPenalty));
  }
  
  /**
   * Calculate overall table quality
   */
  private static calculateOverallQuality(
    columnProfiles: EnhancedColumnProfile[],
    tableMetrics: {
      dataCompleteness: number;
      dataConsistency: number;
      referentialIntegrity: number;
      duplicatePercentage: number;
    }
  ): number {
    if (columnProfiles.length === 0) return 0;
    
    const avgColumnQuality = columnProfiles.reduce((sum, profile) => sum + profile.qualityScore, 0) / columnProfiles.length;
    
    const weights = {
      columnQuality: 0.4,
      completeness: 0.2,
      consistency: 0.2,
      referentialIntegrity: 0.15,
      duplicates: 0.05
    };
    
    const score = 
      avgColumnQuality * weights.columnQuality +
      tableMetrics.dataCompleteness * weights.completeness +
      tableMetrics.dataConsistency * weights.consistency +
      tableMetrics.referentialIntegrity * weights.referentialIntegrity +
      (100 - tableMetrics.duplicatePercentage) * weights.duplicates;
    
    return Math.max(0, Math.min(100, score));
  }
  
  /**
   * Calculate business rule compliance
   */
  private static calculateBusinessRuleCompliance(validRecords: DatabaseRecord[], totalRecords: DatabaseRecord[]): number {
    return totalRecords.length > 0 ? (validRecords.length / totalRecords.length) * 100 : 0;
  }
  
  // Helper methods
  private static isNumericType(type: string): boolean {
    return /^(int|integer|bigint|smallint|decimal|numeric|float|double|real|money)$/i.test(type);
  }
  
  private static isTextType(type: string): boolean {
    return /^(varchar|char|text|string|nvarchar|nchar|ntext)$/i.test(type);
  }
  
  private static getExpectedJSType(sqlType: string): string {
    if (this.isNumericType(sqlType)) return 'number';
    if (this.isTextType(sqlType)) return 'string';
    if (/^(bit|boolean|bool)$/i.test(sqlType)) return 'boolean';
    if (/^(date|datetime|timestamp|time)$/i.test(sqlType)) return 'string'; // Dates often come as strings
    return 'string'; // Default to string
  }
  
  private static isValidTypeCoercion(value: any, sqlType: string): boolean {
    // Allow some common type coercion cases
    if (this.isNumericType(sqlType) && typeof value === 'string') {
      return !isNaN(Number(value));
    }
    return false;
  }
  
  private static getExpectedFormats(column: Column): Array<{ pattern: RegExp; description: string }> {
    const formats: Array<{ pattern: RegExp; description: string }> = [];
    
    if (column.name.toLowerCase().includes('email')) {
      formats.push({
        pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
        description: 'Valid email format'
      });
    }
    
    if (column.name.toLowerCase().includes('phone')) {
      formats.push({
        pattern: /^[\+]?[\d\s\-\(\)]{7,15}$/,
        description: 'Phone number format'
      });
    }
    
    if (column.name.toLowerCase().includes('url') || column.name.toLowerCase().includes('website')) {
      formats.push({
        pattern: /^https?:\/\/[^\s]+$/,
        description: 'URL format'
      });
    }
    
    return formats;
  }
  
  private static matchesFormat(value: any, pattern: RegExp): boolean {
    if (typeof value !== 'string') return false;
    return pattern.test(value);
  }
  
  private static getDefaultMaxLength(type: string): number {
    if (/varchar\((\d+)\)/i.test(type)) {
      const match = type.match(/varchar\((\d+)\)/i);
      return match ? parseInt(match[1]) : 255;
    }
    if (/char\((\d+)\)/i.test(type)) {
      const match = type.match(/char\((\d+)\)/i);
      return match ? parseInt(match[1]) : 255;
    }
    return 255; // Default max length
  }
  
  private static findTargetTable(column: Column, schema: DatabaseSchema): Table | null {
    // This would implement logic to find the target table for a foreign key
    // For now, return null - this would require more complex relationship analysis
    return null;
  }
  
  private static referenceExists(value: any, targetTable: Table, schema: DatabaseSchema): boolean {
    // This would check if the reference exists in the target table
    // For now, return true - this would require actual data lookup
    return true;
  }
}
