// Comprehensive Project Anomaly Detector
// Scans ALL directories for anomalies in database schemas, code quality, architecture, and more

import { readdir, readFile, stat } from 'fs/promises';
import path from 'path';

export interface ProjectAnomaly {
  id: string;
  type: 'schema' | 'migration' | 'orm' | 'architecture' | 'security' | 'performance' | 'consistency' | 'quality' | 'deprecated';
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  affectedFile?: string;
  affectedTable?: string;
  affectedColumn?: string;
  lineNumber?: number;
  recommendation: string;
  detectedAt: Date;
  confidence?: number; // 0-1
  category?: string;
  autoFixable?: boolean;
}

export class ProjectAnomalyDetector {
  
  /**
   * Detect schema-level anomalies
   */
  static async detectSchemaAnomalies(databases: any[]): Promise<ProjectAnomaly[]> {
    console.log('🔍 Detecting schema anomalies...');
    const anomalies: ProjectAnomaly[] = [];
    
    for (const db of databases) {
      if (!db.tables) continue;
      
      for (const table of db.tables) {
        // Check for missing primary keys
        const hasPrimaryKey = table.columns?.some((col: any) => 
          col.isPrimaryKey || 
          col.constraints?.includes('PRIMARY KEY') ||
          col.name?.toLowerCase() === 'id'
        );
        
        if (!hasPrimaryKey) {
          anomalies.push({
            id: `schema_missing_pk_${table.name}_${Date.now()}`,
            type: 'schema',
            severity: 'high',
            title: 'Missing Primary Key',
            description: `Table "${table.name}" lacks a primary key, which can cause data integrity issues`,
            affectedTable: table.name,
            recommendation: 'Add a primary key column (typically an auto-incrementing ID) to ensure unique row identification',
            detectedAt: new Date(),
            confidence: 0.9,
            autoFixable: true
          });
        }
        
        // Check for tables without indexes
        const hasIndexes = table.indexes?.length > 0 || table.columns?.some((col: any) => col.isIndexed);
        if (!hasIndexes && table.columns?.length > 3) {
          anomalies.push({
            id: `schema_no_indexes_${table.name}_${Date.now()}`,
            type: 'performance',
            severity: 'medium',
            title: 'No Indexes Found',
            description: `Table "${table.name}" has no indexes, which may impact query performance`,
            affectedTable: table.name,
            recommendation: 'Consider adding indexes on frequently queried columns',
            detectedAt: new Date(),
            confidence: 0.7
          });
        }
        
        // Check for very wide tables (many columns)
        if (table.columns?.length > 20) {
          anomalies.push({
            id: `schema_wide_table_${table.name}_${Date.now()}`,
            type: 'architecture',
            severity: 'medium',
            title: 'Very Wide Table',
            description: `Table "${table.name}" has ${table.columns.length} columns, which may indicate design issues`,
            affectedTable: table.name,
            recommendation: 'Consider normalizing the table by splitting into related tables',
            detectedAt: new Date(),
            confidence: 0.6
          });
        }
        
        // Check for suspicious column names
        table.columns?.forEach((column: any) => {
          const suspiciousPatterns = [
            { pattern: /password.*plain|plain.*password/i, issue: 'plaintext password' },
            { pattern: /secret.*key|key.*secret/i, issue: 'exposed secret' },
            { pattern: /credit.*card|card.*number/i, issue: 'sensitive payment data' },
            { pattern: /ssn|social.*security/i, issue: 'social security number' }
          ];
          
          suspiciousPatterns.forEach(({ pattern, issue }) => {
            if (pattern.test(column.name)) {
              anomalies.push({
                id: `schema_sensitive_${table.name}_${column.name}_${Date.now()}`,
                type: 'security',
                severity: 'critical',
                title: 'Potentially Sensitive Data',
                description: `Column "${column.name}" in table "${table.name}" may contain ${issue}`,
                affectedTable: table.name,
                affectedColumn: column.name,
                recommendation: 'Ensure sensitive data is properly encrypted and access is restricted',
                detectedAt: new Date(),
                confidence: 0.8
              });
            }
          });
        });
      }
    }
    
    console.log(`✅ Schema anomaly detection completed. Found ${anomalies.length} anomalies`);
    return anomalies;
  }
  
  /**
   * Detect migration-related anomalies
   */
  static async detectMigrationAnomalies(migrationHistory: any): Promise<ProjectAnomaly[]> {
    console.log('🔍 Detecting migration anomalies...');
    const anomalies: ProjectAnomaly[] = [];
    
    if (!migrationHistory?.migrations) return anomalies;
    
    const migrations = migrationHistory.migrations;
    
    // Check for missing rollback migrations
    const missingRollbacks = migrations.filter((m: any) => !m.down && m.framework !== 'django');
    missingRollbacks.forEach((migration: any) => {
      anomalies.push({
        id: `migration_no_rollback_${migration.id}_${Date.now()}`,
        type: 'migration',
        severity: 'medium',
        title: 'Missing Rollback Migration',
        description: `Migration "${migration.name}" lacks a rollback (down) method`,
        affectedFile: migration.filename,
        recommendation: 'Add rollback logic to allow safe migration reversal',
        detectedAt: new Date(),
        confidence: 0.8
      });
    });
    
    // Check for large migration gaps
    const sortedMigrations = migrations.sort((a: any, b: any) => (a.version || '').localeCompare(b.version || ''));
    for (let i = 1; i < sortedMigrations.length; i++) {
      const prev = sortedMigrations[i - 1];
      const curr = sortedMigrations[i];
      
      if (prev.version && curr.version) {
        const prevNum = parseInt(prev.version.replace(/\D/g, ''));
        const currNum = parseInt(curr.version.replace(/\D/g, ''));
        
        if (!isNaN(prevNum) && !isNaN(currNum) && (currNum - prevNum) > 10) {
          anomalies.push({
            id: `migration_gap_${prev.id}_${curr.id}_${Date.now()}`,
            type: 'migration',
            severity: 'low',
            title: 'Large Migration Version Gap',
            description: `Large gap between migration versions ${prev.version} and ${curr.version}`,
            recommendation: 'Verify no migrations are missing between these versions',
            detectedAt: new Date(),
            confidence: 0.5
          });
        }
      }
    }
    
    // Check for conflicting migrations
    const migrationsByVersion = new Map();
    migrations.forEach((m: any) => {
      if (m.version) {
        if (migrationsByVersion.has(m.version)) {
          anomalies.push({
            id: `migration_conflict_${m.version}_${Date.now()}`,
            type: 'migration',
            severity: 'high',
            title: 'Conflicting Migration Versions',
            description: `Multiple migrations found with version ${m.version}`,
            recommendation: 'Resolve version conflicts by renumbering migrations',
            detectedAt: new Date(),
            confidence: 0.9
          });
        } else {
          migrationsByVersion.set(m.version, m);
        }
      }
    });
    
    console.log(`✅ Migration anomaly detection completed. Found ${anomalies.length} anomalies`);
    return anomalies;
  }
  
  /**
   * Detect ORM-related anomalies
   */
  static async detectORMAnomalies(ormModels: any[]): Promise<ProjectAnomaly[]> {
    console.log('🔍 Detecting ORM anomalies...');
    const anomalies: ProjectAnomaly[] = [];
    
    if (!ormModels?.length) return anomalies;
    
    // Check for models without relationships in a multi-model project
    if (ormModels.length > 1) {
      const modelsWithoutRelationships = ormModels.filter(model => 
        !model.relationships || model.relationships.length === 0
      );
      
      if (modelsWithoutRelationships.length === ormModels.length) {
        anomalies.push({
          id: `orm_no_relationships_${Date.now()}`,
          type: 'orm',
          severity: 'medium',
          title: 'No Model Relationships Defined',
          description: 'None of the ORM models have relationships defined, which may indicate missing associations',
          recommendation: 'Review model relationships and add foreign key associations where appropriate',
          detectedAt: new Date(),
          confidence: 0.7
        });
      }
    }
    
    // Check for inconsistent naming conventions
    const namingPatterns = {
      camelCase: /^[a-z][a-zA-Z0-9]*$/,
      PascalCase: /^[A-Z][a-zA-Z0-9]*$/,
      snake_case: /^[a-z][a-z0-9_]*$/
    };
    
    const modelNames = ormModels.map(m => m.name);
    const namingStyles = Object.entries(namingPatterns).filter(([style, pattern]) => 
      modelNames.some(name => pattern.test(name))
    );
    
    if (namingStyles.length > 1) {
      anomalies.push({
        id: `orm_inconsistent_naming_${Date.now()}`,
        type: 'quality',
        severity: 'low',
        title: 'Inconsistent Model Naming',
        description: 'ORM models use different naming conventions (camelCase, PascalCase, snake_case)',
        recommendation: 'Standardize on a single naming convention across all models',
        detectedAt: new Date(),
        confidence: 0.8
      });
    }
    
    // Check for missing validations on important fields
    ormModels.forEach(model => {
      if (model.properties?.length > 0) {
        const emailFields = model.properties.filter((prop: any) => 
          prop.name?.toLowerCase().includes('email')
        );
        const hasEmailValidation = model.validations?.some((val: any) => 
          val.type?.includes('email') || val.rule?.includes('email')
        );
        
        if (emailFields.length > 0 && !hasEmailValidation) {
          anomalies.push({
            id: `orm_missing_email_validation_${model.name}_${Date.now()}`,
            type: 'quality',
            severity: 'medium',
            title: 'Missing Email Validation',
            description: `Model "${model.name}" has email fields but no email validation`,
            recommendation: 'Add email format validation to ensure data quality',
            detectedAt: new Date(),
            confidence: 0.7
          });
        }
      }
    });
    
    console.log(`✅ ORM anomaly detection completed. Found ${anomalies.length} anomalies`);
    return anomalies;
  }
  
  /**
   * Detect file-based anomalies across ALL directories
   */
  static async detectFileAnomalies(projectPath: string): Promise<ProjectAnomaly[]> {
    console.log('🔍 Detecting file anomalies across all directories...');
    const anomalies: ProjectAnomaly[] = [];
    
    try {
      await this.scanDirectoryForAnomalies(projectPath, anomalies);
    } catch (error) {
      console.error('❌ Error during file anomaly detection:', error);
    }
    
    console.log(`✅ File anomaly detection completed. Found ${anomalies.length} anomalies`);
    return anomalies;
  }
  
  /**
   * Recursively scan directories for file-based anomalies
   */
  private static async scanDirectoryForAnomalies(
    dirPath: string, 
    anomalies: ProjectAnomaly[], 
    depth: number = 0
  ): Promise<void> {
    if (depth > 10) return; // Prevent infinite recursion
    
    const ignoreDirs = ['node_modules', '.git', 'dist', 'build', '.next'];
    
    try {
      const entries = await readdir(dirPath, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(dirPath, entry.name);
        
        if (entry.isDirectory()) {
          if (!ignoreDirs.includes(entry.name)) {
            await this.scanDirectoryForAnomalies(fullPath, anomalies, depth + 1);
          }
        } else if (entry.isFile()) {
          await this.analyzeFileForAnomalies(fullPath, anomalies);
        }
      }
    } catch (error) {
      // Skip directories we can't read
    }
  }
  
  /**
   * Analyze individual files for anomalies
   */
  private static async analyzeFileForAnomalies(filePath: string, anomalies: ProjectAnomaly[]): Promise<void> {
    const filename = path.basename(filePath);
    const ext = path.extname(filePath).toLowerCase();
    
    try {
      // Check file size
      const stats = await stat(filePath);
      if (stats.size > 1024 * 1024) { // Files larger than 1MB
        anomalies.push({
          id: `file_large_${filename}_${Date.now()}`,
          type: 'performance',
          severity: 'medium',
          title: 'Large File Detected',
          description: `File "${filename}" is ${Math.round(stats.size / 1024 / 1024)}MB, which may impact performance`,
          affectedFile: filePath,
          recommendation: 'Consider splitting large files or optimizing file size',
          detectedAt: new Date(),
          confidence: 0.8
        });
      }
      
      // Skip binary files and very large files for content analysis
      if (stats.size > 10 * 1024 * 1024) return;
      
      // Analyze specific file types
      if (['.js', '.ts', '.py', '.php', '.rb', '.java', '.cs'].includes(ext)) {
        await this.analyzeCodeFile(filePath, anomalies);
      } else if (['.sql'].includes(ext)) {
        await this.analyzeSQLFile(filePath, anomalies);
      } else if (['.json', '.yml', '.yaml'].includes(ext)) {
        await this.analyzeConfigFile(filePath, anomalies);
      }
    } catch (error) {
      // Skip files we can't read
    }
  }
  
  /**
   * Analyze code files for anomalies
   */
  private static async analyzeCodeFile(filePath: string, anomalies: ProjectAnomaly[]): Promise<void> {
    try {
      const content = await readFile(filePath, 'utf-8');
      const lines = content.split('\n');
      const filename = path.basename(filePath);
      
      // Check for extremely long lines
      lines.forEach((line, index) => {
        if (line.length > 200) {
          anomalies.push({
            id: `code_long_line_${filename}_${index}_${Date.now()}`,
            type: 'quality',
            severity: 'low',
            title: 'Very Long Code Line',
            description: `Line ${index + 1} in "${filename}" has ${line.length} characters`,
            affectedFile: filePath,
            lineNumber: index + 1,
            recommendation: 'Break long lines for better readability',
            detectedAt: new Date(),
            confidence: 0.6
          });
        }
      });
      
      // Check for security issues
      const securityPatterns = [
        { pattern: /password\s*=\s*["'][^"']+["']/i, issue: 'Hardcoded password' },
        { pattern: /api[_-]?key\s*=\s*["'][^"']+["']/i, issue: 'Hardcoded API key' },
        { pattern: /secret\s*=\s*["'][^"']+["']/i, issue: 'Hardcoded secret' },
        { pattern: /eval\s*\(/i, issue: 'Use of eval() function' },
        { pattern: /exec\s*\(/i, issue: 'Use of exec() function' }
      ];
      
      securityPatterns.forEach(({ pattern, issue }) => {
        const matches = content.match(new RegExp(pattern.source, 'gi'));
        if (matches) {
          anomalies.push({
            id: `security_${issue.replace(/\s+/g, '_').toLowerCase()}_${filename}_${Date.now()}`,
            type: 'security',
            severity: 'high',
            title: 'Security Issue Detected',
            description: `${issue} found in "${filename}"`,
            affectedFile: filePath,
            recommendation: 'Move sensitive data to environment variables or secure configuration',
            detectedAt: new Date(),
            confidence: 0.8
          });
        }
      });
      
      // Check for deprecated patterns
      const deprecatedPatterns = [
        { pattern: /mysql_query|mysql_connect/i, issue: 'Deprecated MySQL functions' },
        { pattern: /var_dump|print_r/i, issue: 'Debug functions in production code' },
        { pattern: /console\.log|console\.debug/i, issue: 'Console statements in production code' }
      ];
      
      deprecatedPatterns.forEach(({ pattern, issue }) => {
        if (pattern.test(content)) {
          anomalies.push({
            id: `deprecated_${issue.replace(/\s+/g, '_').toLowerCase()}_${filename}_${Date.now()}`,
            type: 'deprecated',
            severity: 'medium',
            title: 'Deprecated Code Detected',
            description: `${issue} found in "${filename}"`,
            affectedFile: filePath,
            recommendation: 'Update to use modern alternatives',
            detectedAt: new Date(),
            confidence: 0.7
          });
        }
      });
      
    } catch (error) {
      // Skip files we can't read
    }
  }
  
  /**
   * Analyze SQL files for anomalies
   */
  private static async analyzeSQLFile(filePath: string, anomalies: ProjectAnomaly[]): Promise<void> {
    try {
      const content = await readFile(filePath, 'utf-8');
      const filename = path.basename(filePath);
      
      // Check for SQL injection vulnerabilities
      const injectionPatterns = [
        /\$_GET|\$_POST|\$_REQUEST/i,
        /\+\s*["'][^"']*["']\s*\+/,
        /UNION\s+SELECT/i,
        /DROP\s+TABLE/i
      ];
      
      injectionPatterns.forEach((pattern, index) => {
        if (pattern.test(content)) {
          anomalies.push({
            id: `sql_injection_risk_${filename}_${index}_${Date.now()}`,
            type: 'security',
            severity: 'critical',
            title: 'Potential SQL Injection Risk',
            description: `SQL file "${filename}" contains patterns that may be vulnerable to injection attacks`,
            affectedFile: filePath,
            recommendation: 'Use parameterized queries and input validation',
            detectedAt: new Date(),
            confidence: 0.7
          });
        }
      });
      
      // Check for missing transaction handling
      if (content.includes('INSERT') || content.includes('UPDATE') || content.includes('DELETE')) {
        if (!content.includes('BEGIN') && !content.includes('COMMIT') && !content.includes('ROLLBACK')) {
          anomalies.push({
            id: `sql_no_transaction_${filename}_${Date.now()}`,
            type: 'quality',
            severity: 'medium',
            title: 'No Transaction Handling',
            description: `SQL file "${filename}" contains data modification without transaction handling`,
            affectedFile: filePath,
            recommendation: 'Wrap data modifications in transactions for data integrity',
            detectedAt: new Date(),
            confidence: 0.6
          });
        }
      }
      
    } catch (error) {
      // Skip files we can't read
    }
  }
  
  /**
   * Analyze configuration files for anomalies
   */
  private static async analyzeConfigFile(filePath: string, anomalies: ProjectAnomaly[]): Promise<void> {
    try {
      const content = await readFile(filePath, 'utf-8');
      const filename = path.basename(filePath);
      
      // Check for sensitive data in config files
      const sensitivePatterns = [
        { pattern: /"password":\s*"[^"]+"/i, field: 'password' },
        { pattern: /"secret":\s*"[^"]+"/i, field: 'secret' },
        { pattern: /"api[_-]?key":\s*"[^"]+"/i, field: 'API key' }
      ];
      
      sensitivePatterns.forEach(({ pattern, field }) => {
        if (pattern.test(content)) {
          anomalies.push({
            id: `config_sensitive_${field.replace(/\s+/g, '_')}_${filename}_${Date.now()}`,
            type: 'security',
            severity: 'critical',
            title: 'Sensitive Data in Config File',
            description: `Configuration file "${filename}" contains ${field} in plaintext`,
            affectedFile: filePath,
            recommendation: 'Move sensitive configuration to environment variables',
            detectedAt: new Date(),
            confidence: 0.9
          });
        }
      });
      
    } catch (error) {
      // Skip files we can't read
    }
  }
  
  /**
   * Detect architecture-level anomalies
   */
  static async detectArchitectureAnomalies(
    projectPath: string, 
    databases: any[], 
    ormModels: any[]
  ): Promise<ProjectAnomaly[]> {
    console.log('🔍 Detecting architecture anomalies...');
    const anomalies: ProjectAnomaly[] = [];
    
    try {
      // Check for missing documentation
      const hasReadme = await this.fileExists(path.join(projectPath, 'README.md')) ||
                       await this.fileExists(path.join(projectPath, 'readme.md')) ||
                       await this.fileExists(path.join(projectPath, 'README.txt'));
      
      if (!hasReadme) {
        anomalies.push({
          id: `arch_no_readme_${Date.now()}`,
          type: 'quality',
          severity: 'low',
          title: 'Missing Project Documentation',
          description: 'No README file found in the project root',
          recommendation: 'Add a README.md file to document project setup and usage',
          detectedAt: new Date(),
          confidence: 0.9
        });
      }
      
      // Check for missing dependency management
      const hasDependencyFile = await this.fileExists(path.join(projectPath, 'package.json')) ||
                               await this.fileExists(path.join(projectPath, 'requirements.txt')) ||
                               await this.fileExists(path.join(projectPath, 'composer.json')) ||
                               await this.fileExists(path.join(projectPath, 'Gemfile'));
      
      if (!hasDependencyFile) {
        anomalies.push({
          id: `arch_no_deps_${Date.now()}`,
          type: 'architecture',
          severity: 'medium',
          title: 'Missing Dependency Management',
          description: 'No dependency management file found (package.json, requirements.txt, etc.)',
          recommendation: 'Add appropriate dependency management for your technology stack',
          detectedAt: new Date(),
          confidence: 0.8
        });
      }
      
      // Check for database without ORM or vice versa
      if (databases.length > 0 && ormModels?.length === 0) {
        anomalies.push({
          id: `arch_db_no_orm_${Date.now()}`,
          type: 'architecture',
          severity: 'medium',
          title: 'Database Without ORM Models',
          description: 'Database files found but no ORM models detected',
          recommendation: 'Consider adding ORM models for better data access patterns',
          detectedAt: new Date(),
          confidence: 0.6
        });
      }
      
      if (ormModels?.length > 0 && databases.length === 0) {
        anomalies.push({
          id: `arch_orm_no_db_${Date.now()}`,
          type: 'architecture',
          severity: 'low',
          title: 'ORM Models Without Database',
          description: 'ORM models found but no database files detected',
          recommendation: 'Ensure database is properly configured and accessible',
          detectedAt: new Date(),
          confidence: 0.6
        });
      }
      
    } catch (error) {
      console.error('❌ Error in architecture anomaly detection:', error);
    }
    
    console.log(`✅ Architecture anomaly detection completed. Found ${anomalies.length} anomalies`);
    return anomalies;
  }
  
  /**
   * Check if a file exists
   */
  private static async fileExists(filePath: string): Promise<boolean> {
    try {
      await stat(filePath);
      return true;
    } catch {
      return false;
    }
  }
}
