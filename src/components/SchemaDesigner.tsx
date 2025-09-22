'use client';

// Schema Designer component for visual database design
// This component provides a drag-and-drop interface for creating and editing database tables

import React, { useCallback, useState, useMemo, useRef, useEffect } from 'react';
import {
  ReactFlow,
  Node,
  Edge,
  addEdge,
  Connection,
  useNodesState,
  useEdgesState,
  Controls,
  Background,
  BackgroundVariant,
  NodeTypes,
  EdgeTypes,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import { DatabaseSchema, Table, Column, DataType, FlowNode, FlowEdge, SchemaValidation, ValidationError, ValidationWarning } from '@/types/database';
import { TableNode } from './nodes/TableNode';
import { RelationshipEdge } from './edges/RelationshipEdge';
import { TableEditor } from './TableEditor';
import { useProjectData } from '@/hooks/useProjectData';
import {
  Plus, Save, Trash2, AlertTriangle, CheckCircle, FileText, Search, Filter, Brain, Lightbulb,
  Zap, Target, TrendingUp, Users, Clock, RefreshCw, Download, Layout, Palette, ZoomIn, ZoomOut,
  RotateCcw, Grid, Circle, Layers, Activity, Maximize, Minimize, Camera, X, Type, Shield, Lock,
  Database, Key, Link, Hash, Info, BarChart3, Settings, GitBranch, Eye, EyeOff, Star, AlertCircle,
  ChevronDown, ChevronRight, BookOpen, Code, Globe, Server, Cpu, HardDrive, Wifi, WifiOff
} from 'lucide-react';
import { SchemaValidator } from '@/utils/schemaValidation';
import { SchemaTemplateManager } from '@/utils/schemaTemplates';
import { ERDLayoutService, LayoutOptions } from '@/services/erdLayoutService';
import { ERDExportService, ERDExportOptions } from '@/services/erdExportService';

// Define custom node and edge types
const nodeTypes: NodeTypes = {
  table: TableNode as any,
};

const edgeTypes: EdgeTypes = {
  relationship: RelationshipEdge as any,
};

interface SchemaDesignerProps {
  schema: DatabaseSchema | null;
  onSchemaChange: (schema: DatabaseSchema) => void;
}

export function SchemaDesigner({ schema: propSchema, onSchemaChange }: SchemaDesignerProps) {
  // Use project data hook to get current project schema
  const {
    currentProject,
    projectSchema,
    hasProject,
    executeProjectQuery
  } = useProjectData();

  // Use project schema if available, otherwise fall back to prop
  const schema = projectSchema || propSchema;

  // Ref to prevent infinite loops
  const isUpdatingRef = useRef(false);
  
  // Refs to store latest callback functions
  const handleUpdateTableRef = useRef<(updatedTable: Table) => void>(() => {});
  const handleDeleteTableRef = useRef<(tableId: string) => void>(() => {});
  
  // Refs to store stable nodes and edges
  const nodesRef = useRef<Node[]>([]);
  const edgesRef = useRef<Edge[]>([]);
  
  // Handle node changes - update schema directly
  const onNodesChange = useCallback((changes: any) => {
    if (!schema || isUpdatingRef.current) return;
    
    // Update table positions in schema
    changes.forEach((change: any) => {
      if (change.type === 'position' && change.position) {
        const table = schema.tables.find(t => t.id === change.id);
        if (table) {
          table.position = change.position;
        }
      }
    });
  }, [schema]);
  
  // Handle edge changes - currently no-op since edges are derived from schema
  const onEdgesChange = useCallback((changes: any) => {
    // Edges are derived from schema relationships, so we don't need to handle changes
    // This is just to satisfy React Flow's requirements
  }, []);
  
  const [selectedTable, setSelectedTable] = useState<Table | null>(null);
  const [isTableEditorOpen, setIsTableEditorOpen] = useState(false);
  const [validation, setValidation] = useState<SchemaValidation | null>(null);
  const [showTemplates, setShowTemplates] = useState(false);
  const [showAISuggestions, setShowAISuggestions] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState<any[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [showApplyConfirmation, setShowApplyConfirmation] = useState(false);
  const [selectedSuggestion, setSelectedSuggestion] = useState<any>(null);
  const [collaborativeUsers, setCollaborativeUsers] = useState<any[]>([]);
  const [showCollaborativePanel, setShowCollaborativePanel] = useState(false);
  const [showValidation, setShowValidation] = useState(false);
  const [templateSearch, setTemplateSearch] = useState('');
  const [showColumnTypes, setShowColumnTypes] = useState(true);
  const [showConstraints, setShowConstraints] = useState(true);
  const [compactMode, setCompactMode] = useState(false);
  const [showSchemaDetails, setShowSchemaDetails] = useState(true);
  
  // Enhanced metadata panels
  const [showDatabaseInfo, setShowDatabaseInfo] = useState(false);
  const [showConstraintsPanel, setShowConstraintsPanel] = useState(false);
  const [showIndexesPanel, setShowIndexesPanel] = useState(false);
  const [showMigrationPanel, setShowMigrationPanel] = useState(false);
  const [showORMPanel, setShowORMPanel] = useState(false);
  const [showMetadataPanel, setShowMetadataPanel] = useState(false);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    databaseInfo: true,
    constraints: true,
    indexes: true,
    migrations: true,
    orm: true,
    metadata: true
  });

  // Helper functions for enhanced metadata
  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const getDatabaseInfo = () => {
    if (!schema) return null;
    return schema.databaseInfo || {
      type: 'SQLite',
      version: 'Unknown',
      encoding: 'UTF-8',
      pageSize: 4096,
      createdAt: new Date(),
      updatedAt: new Date()
    };
  };

  const getConstraintSummary = () => {
    if (!schema) return { primaryKeys: 0, foreignKeys: 0, notNull: 0, unique: 0, default: 0, check: 0 };
    
    const primaryKeys = schema.tables.reduce((sum, table) => 
      sum + table.columns.filter(col => col.primaryKey).length, 0
    );
    const foreignKeys = schema.tables.reduce((sum, table) => 
      sum + table.columns.filter(col => col.foreignKey).length, 0
    );
    const notNull = schema.tables.reduce((sum, table) => 
      sum + table.columns.filter(col => !col.nullable).length, 0
    );
    const unique = schema.tables.reduce((sum, table) => 
      sum + table.columns.filter(col => col.unique).length, 0
    );
    const default = schema.tables.reduce((sum, table) => 
      sum + table.columns.filter(col => col.defaultValue).length, 0
    );
    const check = schema.tables.reduce((sum, table) => 
      sum + table.columns.filter(col => col.constraints?.check).length, 0
    );

    return { primaryKeys, foreignKeys, notNull, unique, default, check };
  };

  const getIndexSummary = () => {
    if (!schema) return { total: 0, unique: 0, composite: 0, partial: 0 };
    
    const allIndexes = schema.tables.flatMap(table => table.indexes || []);
    const unique = allIndexes.filter(idx => idx.unique).length;
    const composite = allIndexes.filter(idx => idx.columns && idx.columns.length > 1).length;
    const partial = allIndexes.filter(idx => idx.partial).length;

    return { 
      total: allIndexes.length, 
      unique, 
      composite, 
      partial 
    };
  };
  
  // Handle updating a table
  const handleUpdateTable = useCallback((updatedTable: Table) => {
    if (!schema) return;

    const updatedSchema: DatabaseSchema = {
      ...schema,
      tables: schema.tables.map((table) =>
        table.id === updatedTable.id ? updatedTable : table
      ),
      updatedAt: new Date(),
    };

    onSchemaChange(updatedSchema);
  }, [onSchemaChange, schema]);

  // Handle deleting a table
  const handleDeleteTable = useCallback((tableId: string) => {
    if (!schema) return;

    const updatedSchema: DatabaseSchema = {
      ...schema,
      tables: schema.tables.filter((table) => table.id !== tableId),
      updatedAt: new Date(),
    };

    onSchemaChange(updatedSchema);
  }, [onSchemaChange, schema]);

  // Update refs with latest functions
  handleUpdateTableRef.current = handleUpdateTable;
  handleDeleteTableRef.current = handleDeleteTable;
  
  // Generate nodes and edges using refs to prevent re-renders
  const generateNodesAndEdges = useCallback(() => {
    if (!schema || !schema.tables) {
      nodesRef.current = [];
      edgesRef.current = [];
      return;
    }

    const displayOptions = { showColumnTypes, showConstraints, compactMode };
    
    // Generate nodes
    const nodes = schema.tables.map((table) => ({
      id: table.id,
      type: 'table',
      position: table.position || { x: 0, y: 0 },
      data: {
        table,
        onUpdateTable: (updatedTable: Table) => {
          if (!schema) return;
          const updatedSchema: DatabaseSchema = {
            ...schema,
            tables: schema.tables.map((t) =>
              t.id === updatedTable.id ? updatedTable : t
            ),
            updatedAt: new Date(),
          };
          onSchemaChange(updatedSchema);
        },
        onDeleteTable: (tableId: string) => {
          if (!schema) return;
          const updatedSchema: DatabaseSchema = {
            ...schema,
            tables: schema.tables.filter((t) => t.id !== tableId),
            updatedAt: new Date(),
          };
          onSchemaChange(updatedSchema);
        },
        theme: 'default',
        showColumnTypes: displayOptions.showColumnTypes,
        showConstraints: displayOptions.showConstraints,
        compactMode: displayOptions.compactMode
      },
    }));

    // Generate edges
    const edges: Edge[] = [];
    schema.tables.forEach((table) => {
      table.columns?.forEach((column) => {
        if (column.foreignKey) {
          edges.push({
            id: `${table.id}-${column.id}-${column.foreignKey.tableId}-${column.foreignKey.columnId}`,
            source: table.id,
            target: column.foreignKey.tableId,
            sourceHandle: column.id,
            targetHandle: column.foreignKey.columnId,
            type: 'relationship',
            data: {
              relationship: column.foreignKey,
              sourceColumn: column,
              targetColumn: column.foreignKey
            }
          });
        }
      });
    });

    nodesRef.current = nodes;
    edgesRef.current = edges;
  }, [schema, showColumnTypes, showConstraints, compactMode, onSchemaChange]);

  
  // Generate nodes and edges when dependencies change
  useEffect(() => {
    generateNodesAndEdges();
  }, [generateNodesAndEdges]);

  // Use refs for stable nodes and edges
  const memoizedNodes = nodesRef.current;
  const memoizedEdges = edgesRef.current;

  // Enhanced ERD features state
  const [showERDToolbar, setShowERDToolbar] = useState(true);
  const [isLayouting, setIsLayouting] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [showLayoutModal, setShowLayoutModal] = useState(false);
  const [layoutSuggestions, setLayoutSuggestions] = useState<any[]>([]);

  // Validate schema
  const validateSchema = useCallback(() => {
    if (schema) {
      const validationResult = SchemaValidator.validateSchema(schema);
      setValidation(validationResult);
      setShowValidation(true);
    }
  }, [schema]);

  // Production AI-powered schema analysis with real, accurate recommendations
  const analyzeSchemaWithOptimizer = useCallback(async () => {
    if (!schema || schema.tables.length === 0) {
      alert('Please create at least one table before running the AI analysis.');
      return;
    }
    
    setIsAnalyzing(true);
    try {
      // Import the Production AI Schema Analyzer
      const { ProductionAISchemaAnalyzer } = await import('@/services/productionAISchemaAnalyzer');
      const analyzer = ProductionAISchemaAnalyzer.getInstance();
      
      // Run comprehensive production-grade AI analysis
      console.log('Starting production AI-powered schema analysis...');
      const analysis = await analyzer.analyzeSchema(schema);
      
      // Convert AI recommendations to the expected format for UI
      const suggestions = analysis.recommendations.map((rec) => ({
        id: rec.id,
        type: rec.category,
        title: rec.title,
        description: rec.description,
        confidence: rec.confidence,
        impact: rec.priority,
        recommendations: rec.technicalDetails.implementationSteps,
        estimatedImprovement: `${rec.impactAnalysis.performanceGain}% performance gain, ${rec.impactAnalysis.estimatedImplementationTime} to implement`,
        aiReasoning: rec.aiReasoning,
        codeExamples: rec.codeGeneration,
        affectedTables: rec.technicalDetails.affectedTables,
        affectedColumns: rec.technicalDetails.affectedColumns,
        currentState: rec.technicalDetails.currentState,
        proposedState: rec.technicalDetails.proposedState,
        riskLevel: rec.impactAnalysis.riskLevel,
        // Include the full analysis for enhanced UI display
        analysisData: {
          semanticInsights: analysis.semanticInsights,
          performanceMetrics: analysis.performanceMetrics,
          overallScore: analysis.overallScore,
          performanceScore: analysis.performanceScore,
          integrityScore: analysis.integrityScore,
          scalabilityScore: analysis.scalabilityScore,
          securityScore: analysis.securityScore,
          analysisMetadata: analysis.analysisMetadata
        }
      }));
      
      // Store the AI suggestions for display
      setAiSuggestions(suggestions);
      setShowAISuggestions(true);
      
      console.log('AI Schema Analysis completed successfully:', {
        overallScore: analysis.overallScore,
        recommendationsCount: analysis.recommendations.length,
        processingTime: analysis.analysisMetadata.processingTime + 'ms',
        confidence: analysis.analysisMetadata.confidence,
        businessDomain: analysis.semanticInsights.businessDomain,
        complexityLevel: analysis.semanticInsights.complexityLevel
      });
      
    } catch (error) {
      console.error('AI Schema Analysis failed:', error);
      
      // Fallback to basic analysis if AI fails
      console.log('Falling back to basic pattern analysis...');
      const basicSuggestions = await runBasicAnalysis();
      setAiSuggestions(basicSuggestions);
      setShowAISuggestions(true);
      
      alert('AI analysis encountered an issue, but basic analysis was completed. Check console for details.');
    } finally {
      setIsAnalyzing(false);
    }
  }, [schema]);
  
  // Fallback basic analysis function
  const runBasicAnalysis = useCallback(async () => {
    if (!schema) return [];
    
    const suggestions = [];
    
    // Basic primary key check
    const tablesWithoutPK = schema.tables.filter(table => 
      !table.columns.some(col => col.primaryKey)
    );
    if (tablesWithoutPK.length > 0) {
      suggestions.push({
        id: 'basic-pk-check',
        type: 'integrity',
        title: 'Add Primary Keys',
        description: `${tablesWithoutPK.length} table(s) missing primary keys: ${tablesWithoutPK.map(t => t.name).join(', ')}`,
        confidence: 0.95,
        impact: 'critical',
        recommendations: tablesWithoutPK.map(table => `Add primary key to ${table.name} table`),
        estimatedImprovement: 'Essential for data integrity',
        aiReasoning: 'Primary keys are fundamental for data integrity and database performance.',
        analysisData: {
          overallScore: 60,
          performanceScore: 70,
          integrityScore: 40,
          scalabilityScore: 75,
          securityScore: 80
        }
      });
    }
    
    // Basic index recommendations
    const indexCandidates = schema.tables.flatMap(table =>
      table.columns
        .filter(col => /^(email|name|status|created_at|updated_at)$/i.test(col.name) && !col.primaryKey)
        .map(col => ({ table: table.name, column: col.name }))
    );
    
    if (indexCandidates.length > 0) {
      suggestions.push({
        id: 'basic-index-check',
        type: 'performance',
        title: 'Add Performance Indexes',
        description: `${indexCandidates.length} columns could benefit from indexes`,
        confidence: 0.85,
        impact: 'high',
        recommendations: indexCandidates.map(item => `Add index on ${item.table}.${item.column}`),
        estimatedImprovement: 'Query performance improvement of 40-70%',
        aiReasoning: 'These columns are commonly used in WHERE clauses and would benefit from indexing.',
        analysisData: {
          overallScore: 75,
          performanceScore: 60,
          integrityScore: 85,
          scalabilityScore: 80,
          securityScore: 85
        }
      });
    }
    
    return suggestions;
  }, [schema]);

  // Show confirmation modal for AI suggestion
  const showApplyConfirmationModal = useCallback((suggestion: any) => {
    setSelectedSuggestion(suggestion);
    setShowApplyConfirmation(true);
  }, []);

  // Apply AI suggestion with production-grade schema modifications
  const applyAISuggestion = useCallback(async (suggestion: any) => {
    if (!schema) return;
    
    try {
      console.log('Applying AI suggestion with production engine:', suggestion);
      
      // Import the production schema modification engine
      const { SchemaModificationEngine } = await import('@/services/schemaModificationEngine');
      const modificationEngine = SchemaModificationEngine.getInstance();
      
      // Ensure the suggestion has the required structure for the modification engine
      const productionRecommendation = {
        id: suggestion.id,
        category: suggestion.type,
        priority: (suggestion.impact === 'high' ? 'high' : suggestion.impact === 'critical' ? 'critical' : suggestion.impact === 'low' ? 'low' : 'medium') as 'low' | 'medium' | 'high' | 'critical',
        title: suggestion.title,
        description: suggestion.description,
        aiReasoning: suggestion.aiReasoning || suggestion.description,
        technicalDetails: {
          affectedTables: suggestion.affectedTables || [],
          affectedColumns: suggestion.affectedColumns || [],
          currentState: suggestion.currentState || 'Unknown current state',
          proposedState: suggestion.proposedState || 'Unknown proposed state',
          implementationSteps: suggestion.recommendations || [],
          dependencies: [],
          constraints: []
        },
        impactAnalysis: {
          performanceGain: parseInt(suggestion.estimatedImprovement?.match(/\d+/)?.[0] || '0'),
          storageReduction: 0,
          complexityReduction: 0,
          estimatedImplementationTime: suggestion.estimatedImprovement?.split(',')[1]?.trim() || 'Unknown',
          riskLevel: suggestion.riskLevel || 'medium',
          rollbackComplexity: 'simple' as 'simple' | 'moderate' | 'complex'
        },
        codeGeneration: suggestion.codeExamples || {
          sql: '-- No SQL provided',
          migration: '-- No migration provided',
          rollback: '-- No rollback provided',
          validation: '-- No validation provided',
          monitoring: '-- No monitoring provided'
        },
        confidence: suggestion.confidence || 0.8,
        realMetrics: {}
      };
      
      // Apply the recommendation using the production modification engine
      const modificationResult = await modificationEngine.applyRecommendation(
        schema,
        productionRecommendation,
        {
          dryRun: false,
          forceApply: false,
          backupFirst: true
        }
      );
      
      if (modificationResult.success) {
        // Update the schema with the modifications
        const updatedSchema = { ...schema };
        updatedSchema.updatedAt = new Date();
        updatedSchema.version = (parseFloat(updatedSchema.version.toString()) + 0.1);
        
        // Apply the changes to the UI
        onSchemaChange(updatedSchema);
        
        // Show detailed success message
        const performanceGain = modificationResult.performanceImpact.improvement;
        const implementationTime = suggestion.impactAnalysis?.estimatedImplementationTime || 'Unknown';
        
        const successMessage = `✅ Successfully applied: "${suggestion.title}"\n\n` +
          `Changes applied:\n` +
          modificationResult.appliedChanges.map(change => `• ${change.type}: ${change.target}`).join('\n') +
          `\n\nPerformance improvement: ${performanceGain}%\n` +
          `Implementation time: ${implementationTime}\n` +
          `Applied changes: ${modificationResult.appliedChanges.length}\n\n` +
          `Rollback ID: ${modificationResult.rollbackProcedure.id}`;
        
        alert(successMessage);
        
        // Remove the applied suggestion from the list
        setAiSuggestions(prev => prev.filter(s => s.id !== suggestion.id));
        
        console.log('Production AI suggestion applied successfully:', {
          title: suggestion.title,
          modificationId: modificationResult.modificationId,
          changesCount: modificationResult.appliedChanges.length,
          performanceGain: performanceGain + '%',
          rollbackId: modificationResult.rollbackProcedure.id
        });
        
      } else {
        // Handle modification failure
        const errorMessages = modificationResult.errors.map(error => error.message).join('\n');
        const warningMessages = modificationResult.warnings.map(warning => warning.message).join('\n');
        
        const failureMessage = `❌ Failed to apply: "${suggestion.title}"\n\n` +
          `Errors:\n${errorMessages}\n\n` +
          (warningMessages ? `Warnings:\n${warningMessages}\n\n` : '') +
          `Modification ID: ${modificationResult.modificationId}\n` +
          `Please review the errors and try again.`;
        
        alert(failureMessage);
        
        console.error('Production AI suggestion application failed:', {
          title: suggestion.title,
          modificationId: modificationResult.modificationId,
          errors: modificationResult.errors,
          warnings: modificationResult.warnings
        });
      }
      
    } catch (error) {
      console.error('Failed to apply AI suggestion:', error);
      alert(`❌ Failed to apply suggestion: ${suggestion.title}\n\nError: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }, [schema, onSchemaChange]);

  // Simulate collaborative users
  const simulateCollaborativeUsers = useCallback(() => {
    const users = [
      { id: 'user1', name: 'John Doe', color: '#3B82F6', cursor: { x: 100, y: 200 }, isActive: true },
      { id: 'user2', name: 'Jane Smith', color: '#10B981', cursor: { x: 300, y: 150 }, isActive: true },
      { id: 'user3', name: 'Mike Johnson', color: '#F59E0B', cursor: { x: 500, y: 300 }, isActive: false }
    ];
    setCollaborativeUsers(users);
    setShowCollaborativePanel(true);
  }, []);

  // Load template
  const loadTemplate = useCallback((templateId: string) => {
    const templateSchema = SchemaTemplateManager.createSchemaFromTemplate(templateId);
    if (templateSchema) {
      onSchemaChange(templateSchema);
      setShowTemplates(false);
    }
  }, [onSchemaChange]);

  // Get filtered templates
  const filteredTemplates = useMemo(() => {
    if (!templateSearch) return SchemaTemplateManager.getAllTemplates();
    return SchemaTemplateManager.searchTemplates(templateSearch);
  }, [templateSearch]);



  // Track previous schema to detect changes
  const prevSchemaRef = useRef<DatabaseSchema | null>(null);
  const prevDisplayOptionsRef = useRef({ showColumnTypes, showConstraints, compactMode });


  // Handle adding a new table
  const handleAddTable = useCallback(() => {
    if (!schema) return;

    const newTable: Table = {
      id: `table_${Date.now()}`,
      name: `Table_${schema.tables.length + 1}`,
      columns: [
        {
          id: `col_${Date.now()}`,
          name: 'id',
          type: 'INTEGER',
          nullable: false,
          primaryKey: true,
        },
      ],
      position: { x: 100 + schema.tables.length * 200, y: 100 },
    };

    const updatedSchema: DatabaseSchema = {
      ...schema,
      tables: [...schema.tables, newTable],
      updatedAt: new Date(),
    };

    onSchemaChange(updatedSchema);
  }, [schema, onSchemaChange]);

  // Enhanced ERD Functions

  // Apply auto-layout
  const applyAutoLayout = useCallback(async (algorithm: LayoutOptions['algorithm']) => {
    if (!schema || schema.tables.length === 0) return;

    setIsLayouting(true);
    try {
      const layoutOptions: LayoutOptions = {
        algorithm,
        centerOnCanvas: true,
        avoidOverlaps: true,
        spacing: { node: 100, rank: 150 }
      };

      const result = await ERDLayoutService.applyLayout(memoizedNodes, memoizedEdges, layoutOptions);
      // Update schema with new positions
      if (schema) {
        result.nodes.forEach((node: any) => {
          const table = schema.tables.find(t => t.id === node.id);
          if (table) {
            table.position = node.position;
          }
        });
        onSchemaChange({ ...schema, updatedAt: new Date() });
      }
      setIsLayouting(false);
    } catch (error) {
      console.error('Layout failed:', error);
      setIsLayouting(false);
    }
  }, [memoizedNodes, memoizedEdges, schema, onSchemaChange]);

  // Apply smart layout
  const applySmartLayout = useCallback(async () => {
    if (!schema || schema.tables.length === 0) return;

    setIsLayouting(true);
    try {
      const result = await ERDLayoutService.applySmartLayout(memoizedNodes, memoizedEdges, schema);
      // Update schema with new positions
      if (schema) {
        result.nodes.forEach((node: any) => {
          const table = schema.tables.find(t => t.id === node.id);
          if (table) {
            table.position = node.position;
          }
        });
        onSchemaChange({ ...schema, updatedAt: new Date() });
      }
      setIsLayouting(false);
    } catch (error) {
      console.error('Smart layout failed:', error);
      setIsLayouting(false);
    }
  }, [memoizedNodes, memoizedEdges, schema, onSchemaChange]);

  // Get layout suggestions
  const getLayoutSuggestions = useCallback(() => {
    if (!schema) return;
    const suggestions = ERDLayoutService.getLayoutSuggestions(schema);
    setLayoutSuggestions(suggestions);
    setShowLayoutModal(true);
  }, [schema]);

  // Export ERD diagram
  const exportDiagram = useCallback(async (format: 'png' | 'svg' | 'pdf', options: Partial<ERDExportOptions> = {}) => {
    if (!schema) return;

    const container = document.querySelector('.react-flow') as HTMLElement;
    if (!container) return;

    const exportOptions: ERDExportOptions = {
      format,
      theme: 'default',
      quality: 0.9,
      scale: 1,
      backgroundColor: '#111827',
      includeMetadata: true,
      ...options
    };

    try {
      const result = await ERDExportService.exportDiagram(
        container,
        memoizedNodes,
        memoizedEdges,
        schema,
        exportOptions
      );

      if (result.success) {
        ERDExportService.downloadExport(result);
      } else {
        console.error('Export failed:', result.errors);
      }
    } catch (error) {
      console.error('Export error:', error);
    }
  }, [schema, memoizedNodes, memoizedEdges]);


  // Handle node position changes
  const handleNodePositionChange = useCallback((nodeId: string, position: { x: number; y: number }) => {
    if (!schema) return;

    const updatedSchema: DatabaseSchema = {
      ...schema,
      tables: schema.tables.map((table) =>
        table.id === nodeId ? { ...table, position } : table
      ),
      updatedAt: new Date(),
    };

    onSchemaChange(updatedSchema);
  }, [schema, onSchemaChange]);

  // Handle edge connections (foreign keys)
  const onConnect = useCallback((params: Connection) => {
    if (!params.source || !params.target || !params.sourceHandle || !params.targetHandle) {
      return;
    }

    if (!schema) return;

    // Find the source table and column
    const sourceTable = schema.tables.find((table) => table.id === params.source);
    const sourceColumn = sourceTable?.columns.find((col) => col.id === params.sourceHandle);

    if (!sourceTable || !sourceColumn) return;

    // Update the source column with foreign key reference
    const updatedSourceTable = {
      ...sourceTable,
      columns: sourceTable.columns.map((col) =>
        col.id === sourceColumn.id
          ? {
              ...col,
              foreignKey: {
                tableId: params.target!,
                columnId: params.targetHandle!,
                relationshipType: 'one-to-many' as const,
                cascadeDelete: false,
                cascadeUpdate: false,
              },
            }
          : col
      ),
    };

    const updatedSchema: DatabaseSchema = {
      ...schema,
      tables: schema.tables.map((table) =>
        table.id === sourceTable.id ? updatedSourceTable : table
      ),
      updatedAt: new Date(),
    };

    onSchemaChange(updatedSchema);
  }, [schema, onSchemaChange]);

  // Handle node click to open table editor
  const handleNodeClick = useCallback((event: React.MouseEvent, node: Node) => {
    const table = schema?.tables.find((t) => t.id === node.id);
    if (table) {
      setSelectedTable(table);
      setIsTableEditorOpen(true);
    }
  }, [schema]);

  // Handle saving schema
  const handleSaveSchema = useCallback(() => {
    if (schema) {
      // Schema is automatically saved through onSchemaChange
      console.log('Schema saved:', schema);
    }
  }, [schema]);

  // Handle clearing all tables
  const handleClearAll = useCallback(() => {
    if (!schema) return;

    const updatedSchema: DatabaseSchema = {
      ...schema,
      tables: [],
      updatedAt: new Date(),
    };

    onSchemaChange(updatedSchema);
  }, [schema, onSchemaChange]);

  // If no project is selected, show project selection prompt
  if (!hasProject) {
    return (
      <div className="flex flex-col h-full bg-gray-900">
        <div className="flex items-center justify-between p-4 bg-gray-800 border-b border-gray-700">
          <div className="flex items-center space-x-3">
            <h2 className="text-xl font-semibold text-white">Schema Designer</h2>
          </div>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="w-16 h-16 bg-red-700 rounded-full flex items-center justify-center mx-auto mb-4">
              <Database className="w-8 h-8 text-red-400" />
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">No Project Selected</h3>
            <p className="text-gray-300 mb-4">Please upload a database or select a project to design database schemas</p>
            <div className="flex space-x-4 justify-center">
              <button
                onClick={() => window.location.hash = '#projects'}
                className="px-6 py-3 bg-orange-600 text-white rounded-md hover:bg-orange-700 transition-colors"
              >
                Select Project
              </button>
              <button
                onClick={() => {
                  // Trigger the upload modal from the projects page
                  window.location.hash = '#projects';
                  // Small delay to ensure the projects page is loaded
                  setTimeout(() => {
                    const uploadButton = document.querySelector('[data-upload-trigger]') as HTMLButtonElement;
                    if (uploadButton) {
                      uploadButton.click();
                    }
                  }, 100);
                }}
                className="px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
              >
                Upload Database
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Project Header */}
      <div className="flex items-center justify-between p-4 bg-gray-800 border-b border-gray-700">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-3">
            <h2 className="text-xl font-semibold text-white">Schema Designer</h2>
            {currentProject && (
              <div className="flex items-center space-x-2 bg-orange-600 text-white px-3 py-1 rounded-md text-sm">
                <Database className="w-4 h-4" />
                <span>{currentProject.name}</span>
              </div>
            )}
          </div>
          <span className="text-sm text-gray-300">Design database schemas for your project</span>
        </div>
      </div>

      {/* Enhanced ERD Toolbar */}
      <div className="bg-gray-800 border-b border-gray-700">
        {/* Main Toolbar */}
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center space-x-4">
            <h2 className="text-xl font-semibold text-white">Professional ERD Designer</h2>
            <div className="flex items-center space-x-2">
              {/* Basic Actions */}
              <button
                onClick={handleAddTable}
                className="flex items-center space-x-2 px-3 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700 transition-colors"
              >
                <Plus className="w-4 h-4" />
                <span>Add Table</span>
              </button>
              
              {/* Layout Controls */}
              <div className="flex items-center space-x-1 border-l border-gray-600 pl-2">
                <button
                  onClick={applySmartLayout}
                  disabled={isLayouting}
                  className="flex items-center space-x-1 px-2 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-600 transition-colors"
                  title="Smart Layout"
                >
                  <Brain className="w-4 h-4" />
                  {isLayouting ? <span className="text-xs">Applying...</span> : <span className="text-xs">Smart</span>}
                </button>
                <button
                  onClick={getLayoutSuggestions}
                  className="flex items-center space-x-1 px-2 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors"
                  title="Layout Options"
                >
                  <Layout className="w-4 h-4" />
                  <span className="text-xs">Layout</span>
                </button>
                <button
                  onClick={() => applyAutoLayout('hierarchical')}
                  disabled={isLayouting}
                  className="p-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:bg-gray-600 transition-colors"
                  title="Hierarchical Layout"
                >
                  <Layers className="w-4 h-4" />
                </button>
                <button
                  onClick={() => applyAutoLayout('force-directed')}
                  disabled={isLayouting}
                  className="p-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:bg-gray-600 transition-colors"
                  title="Force-Directed Layout"
                >
                  <Activity className="w-4 h-4" />
                </button>
                <button
                  onClick={() => applyAutoLayout('circular')}
                  disabled={isLayouting}
                  className="p-2 bg-pink-600 text-white rounded-md hover:bg-pink-700 disabled:bg-gray-600 transition-colors"
                  title="Circular Layout"
                >
                  <Circle className="w-4 h-4" />
                </button>
                <button
                  onClick={() => applyAutoLayout('grid')}
                  disabled={isLayouting}
                  className="p-2 bg-yellow-600 text-white rounded-md hover:bg-yellow-700 disabled:bg-gray-600 transition-colors"
                  title="Grid Layout"
                >
                  <Grid className="w-4 h-4" />
                </button>
              </div>

              {/* Export Controls */}
              <div className="flex items-center space-x-1 border-l border-gray-600 pl-2">
                <button
                  onClick={() => exportDiagram('png')}
                  className="flex items-center space-x-1 px-2 py-2 bg-cyan-600 text-white rounded-md hover:bg-cyan-700 transition-colors"
                  title="Export as PNG"
                >
                  <Camera className="w-4 h-4" />
                  <span className="text-xs">PNG</span>
                </button>
                <button
                  onClick={() => exportDiagram('svg')}
                  className="flex items-center space-x-1 px-2 py-2 bg-teal-600 text-white rounded-md hover:bg-teal-700 transition-colors"
                  title="Export as SVG"
                >
                  <Download className="w-4 h-4" />
                  <span className="text-xs">SVG</span>
                </button>
                <button
                  onClick={() => exportDiagram('pdf')}
                  className="flex items-center space-x-1 px-2 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
                  title="Export as PDF"
                >
                  <FileText className="w-4 h-4" />
                  <span className="text-xs">PDF</span>
                </button>
              </div>

              {/* Display Controls */}
              <div className="flex items-center space-x-1 border-l border-gray-600 pl-2">
                <button
                  onClick={() => setShowColumnTypes(!showColumnTypes)}
                  className={`p-2 rounded transition-colors ${
                    showColumnTypes 
                      ? 'bg-blue-600 text-white hover:bg-blue-700' 
                      : 'bg-gray-600 text-gray-300 hover:bg-gray-500'
                  }`}
                  title="Toggle Column Types"
                >
                  <Type className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setShowConstraints(!showConstraints)}
                  className={`p-2 rounded transition-colors ${
                    showConstraints 
                      ? 'bg-green-600 text-white hover:bg-green-700' 
                      : 'bg-gray-600 text-gray-300 hover:bg-gray-500'
                  }`}
                  title="Toggle Constraints"
                >
                  <CheckCircle className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setCompactMode(!compactMode)}
                  className={`p-2 rounded transition-colors ${
                    compactMode 
                      ? 'bg-purple-600 text-white hover:bg-purple-700' 
                      : 'bg-gray-600 text-gray-300 hover:bg-gray-500'
                  }`}
                  title="Toggle Compact Mode"
                >
                  {compactMode ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
                </button>
              </div>

              {/* Additional Tools */}
              <div className="flex items-center space-x-1 border-l border-gray-600 pl-2">
                <button
                  onClick={() => setShowTemplates(true)}
                  className="flex items-center space-x-1 px-2 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                >
                  <FileText className="w-4 h-4" />
                  <span className="text-xs">Templates</span>
                </button>
                <button
                  onClick={analyzeSchemaWithOptimizer}
                  disabled={isAnalyzing}
                  className="flex items-center space-x-1 px-2 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:bg-gray-600 disabled:cursor-not-allowed transition-colors"
                >
                  <Lightbulb className="w-4 h-4" />
                  <span className="text-xs">{isAnalyzing ? 'Analyzing...' : 'Optimize'}</span>
                </button>
                <button
                  onClick={validateSchema}
                  className="flex items-center space-x-1 px-2 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
                >
                  <CheckCircle className="w-4 h-4" />
                  <span className="text-xs">Validate</span>
                </button>
                <button
                  onClick={() => setShowSchemaDetails(!showSchemaDetails)}
                  className={`flex items-center space-x-1 px-2 py-2 rounded-md transition-colors ${
                    showSchemaDetails 
                      ? 'bg-orange-600 text-white hover:bg-orange-700' 
                      : 'bg-gray-600 text-gray-300 hover:bg-gray-500'
                  }`}
                  title={showSchemaDetails ? 'Hide Schema Details' : 'Show Schema Details'}
                >
                  <Database className="w-4 h-4" />
                  <span className="text-xs">Details</span>
                </button>
                <button
                  onClick={() => setShowDatabaseInfo(!showDatabaseInfo)}
                  className={`flex items-center space-x-1 px-2 py-2 rounded-md transition-colors ${
                    showDatabaseInfo 
                      ? 'bg-blue-600 text-white hover:bg-blue-700' 
                      : 'bg-gray-600 text-gray-300 hover:bg-gray-500'
                  }`}
                  title={showDatabaseInfo ? 'Hide Database Info' : 'Show Database Info'}
                >
                  <Server className="w-4 h-4" />
                  <span className="text-xs">DB Info</span>
                </button>
                <button
                  onClick={() => setShowConstraintsPanel(!showConstraintsPanel)}
                  className={`flex items-center space-x-1 px-2 py-2 rounded-md transition-colors ${
                    showConstraintsPanel 
                      ? 'bg-red-600 text-white hover:bg-red-700' 
                      : 'bg-gray-600 text-gray-300 hover:bg-gray-500'
                  }`}
                  title={showConstraintsPanel ? 'Hide Constraints' : 'Show Constraints'}
                >
                  <Shield className="w-4 h-4" />
                  <span className="text-xs">Constraints</span>
                </button>
                <button
                  onClick={() => setShowIndexesPanel(!showIndexesPanel)}
                  className={`flex items-center space-x-1 px-2 py-2 rounded-md transition-colors ${
                    showIndexesPanel 
                      ? 'bg-green-600 text-white hover:bg-green-700' 
                      : 'bg-gray-600 text-gray-300 hover:bg-gray-500'
                  }`}
                  title={showIndexesPanel ? 'Hide Indexes' : 'Show Indexes'}
                >
                  <Hash className="w-4 h-4" />
                  <span className="text-xs">Indexes</span>
                </button>
                <button
                  onClick={() => setShowMigrationPanel(!showMigrationPanel)}
                  className={`flex items-center space-x-1 px-2 py-2 rounded-md transition-colors ${
                    showMigrationPanel 
                      ? 'bg-purple-600 text-white hover:bg-purple-700' 
                      : 'bg-gray-600 text-gray-300 hover:bg-gray-500'
                  }`}
                  title={showMigrationPanel ? 'Hide Migrations' : 'Show Migrations'}
                >
                  <GitBranch className="w-4 h-4" />
                  <span className="text-xs">Migrations</span>
                </button>
                <button
                  onClick={() => setShowORMPanel(!showORMPanel)}
                  className={`flex items-center space-x-1 px-2 py-2 rounded-md transition-colors ${
                    showORMPanel 
                      ? 'bg-indigo-600 text-white hover:bg-indigo-700' 
                      : 'bg-gray-600 text-gray-300 hover:bg-gray-500'
                  }`}
                  title={showORMPanel ? 'Hide ORM Models' : 'Show ORM Models'}
                >
                  <Code className="w-4 h-4" />
                  <span className="text-xs">ORM</span>
                </button>
                <button
                  onClick={() => setShowMetadataPanel(!showMetadataPanel)}
                  className={`flex items-center space-x-1 px-2 py-2 rounded-md transition-colors ${
                    showMetadataPanel 
                      ? 'bg-yellow-600 text-white hover:bg-yellow-700' 
                      : 'bg-gray-600 text-gray-300 hover:bg-gray-500'
                  }`}
                  title={showMetadataPanel ? 'Hide Metadata' : 'Show Metadata'}
                >
                  <Info className="w-4 h-4" />
                  <span className="text-xs">Metadata</span>
                </button>
              </div>
            </div>
          </div>
          
          {/* Status and Stats */}
          <div className="flex items-center space-x-4 text-sm text-gray-300">
            <div className="flex items-center space-x-2">
              <span>{schema?.tables.length || 0} tables</span>
              <span>•</span>
              <span>{memoizedEdges.length} relationships</span>
            </div>
            <button
              onClick={handleClearAll}
              className="flex items-center space-x-1 px-2 py-1 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
            >
              <Trash2 className="w-3 h-3" />
              <span className="text-xs">Clear</span>
            </button>
          </div>
        </div>

        {/* Secondary Toolbar (Optional) */}
        {showERDToolbar && (
          <div className="px-4 py-2 bg-gray-750 border-t border-gray-600 flex items-center justify-between">
            <div className="flex items-center space-x-4 text-xs text-gray-400">
              <span>💡 Tip: Use Smart Layout for automatic arrangement, or drag tables manually for custom positioning</span>
            </div>
            <button
              onClick={() => setShowERDToolbar(false)}
              className="text-gray-400 hover:text-white transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex bg-gray-900">
        {/* React Flow Canvas */}
        <div className="flex-1 relative">
          <ReactFlow
            nodes={memoizedNodes}
            edges={memoizedEdges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onNodeClick={handleNodeClick}
            nodeTypes={nodeTypes}
            edgeTypes={edgeTypes}
            fitView
            attributionPosition="bottom-left"
            deleteKeyCode={null}
            multiSelectionKeyCode={null}
            nodesDraggable={true}
            nodesConnectable={true}
            elementsSelectable={true}
            proOptions={{ hideAttribution: true }}
            minZoom={0.1}
            maxZoom={2}
            defaultViewport={{ x: 0, y: 0, zoom: 1 }}
          >
            <Controls />
            <Background variant={BackgroundVariant.Dots} gap={12} size={1} color="#374151" />
          </ReactFlow>
        </div>

        {/* Schema Information Panel */}
        {showSchemaDetails && (
          <div className="w-80 bg-gray-800 border-l border-gray-700 flex flex-col h-full">
            <div className="p-4 border-b border-gray-700 flex-shrink-0 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-white mb-2">Schema Details</h3>
                <p className="text-sm text-gray-400">Primary keys, foreign keys, and indexes</p>
              </div>
              <button
                onClick={() => setShowSchemaDetails(false)}
                className="p-1 hover:bg-gray-700 rounded transition-colors"
                title="Close Schema Details"
              >
                <X className="w-5 h-5 text-gray-400 hover:text-white" />
              </button>
            </div>
          
          <div className="flex-1 overflow-y-auto p-4 space-y-6" style={{ maxHeight: 'calc(100vh - 200px)' }}>
            {/* Primary Keys Section */}
            <div>
              <div className="flex items-center space-x-2 mb-3">
                <Key className="w-5 h-5 text-yellow-500" />
                <h4 className="text-md font-semibold text-white" title="Primary Keys uniquely identify each row in a table and cannot be null or duplicated">Primary Keys</h4>
                <span className="bg-yellow-100 text-yellow-800 text-xs px-2 py-1 rounded-full">
                  {schema?.tables.flatMap(table => table.columns.filter(col => col.primaryKey)).length || 0}
                </span>
              </div>
              <div className="space-y-2">
                {schema?.tables.map(table => 
                  table.columns.filter(col => col.primaryKey).map(column => (
                    <div key={`${table.id}-${column.id}`} className="bg-gray-700 rounded-lg p-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="text-white font-medium text-sm">{column.name}</div>
                          <div className="text-gray-400 text-xs">{table.name}</div>
                        </div>
                        <div className="flex items-center space-x-1">
                          <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded">
                            {column.type}
                          </span>
                          {column.autoIncrement && (
                            <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
                              AI
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                )}
                {(!schema?.tables.flatMap(table => table.columns.filter(col => col.primaryKey)).length) && (
                  <div className="text-gray-400 text-sm text-center py-4">
                    No primary keys found
                  </div>
                )}
              </div>
            </div>

            {/* Foreign Keys Section */}
            <div>
              <div className="flex items-center space-x-2 mb-3">
                <Link className="w-5 h-5 text-blue-500" />
                <h4 className="text-md font-semibold text-white" title="Foreign Keys create relationships between tables by referencing the primary key of another table">Foreign Keys</h4>
                <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full">
                  {schema?.tables.flatMap(table => table.columns.filter(col => col.foreignKey)).length || 0}
                </span>
              </div>
              <div className="space-y-2">
                {schema?.tables.map(table => 
                  table.columns.filter(col => col.foreignKey).map(column => {
                    const targetTable = schema?.tables.find(t => t.id === column.foreignKey?.tableId);
                    const targetColumn = targetTable?.columns.find(c => c.id === column.foreignKey?.columnId);
                    return (
                      <div key={`${table.id}-${column.id}`} className="bg-gray-700 rounded-lg p-3">
                        <div className="flex items-center justify-between mb-2">
                          <div>
                            <div className="text-white font-medium text-sm">{column.name}</div>
                            <div className="text-gray-400 text-xs">{table.name}</div>
                          </div>
                          <div className="flex items-center space-x-1">
                            <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                              {column.type}
                            </span>
                            <span className="text-xs bg-purple-100 text-purple-800 px-2 py-1 rounded">
                              {column.foreignKey?.relationshipType || 'FK'}
                            </span>
                          </div>
                        </div>
                        <div className="text-xs text-gray-300">
                          → {targetTable?.name}.{targetColumn?.name}
                        </div>
                        {(column.foreignKey?.onDelete || column.foreignKey?.onUpdate) && (
                          <div className="text-xs text-gray-400 mt-1">
                            {column.foreignKey?.onDelete && `ON DELETE ${column.foreignKey.onDelete}`}
                            {column.foreignKey?.onDelete && column.foreignKey?.onUpdate && ' • '}
                            {column.foreignKey?.onUpdate && `ON UPDATE ${column.foreignKey.onUpdate}`}
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
                {(!schema?.tables.flatMap(table => table.columns.filter(col => col.foreignKey)).length) && (
                  <div className="text-gray-400 text-sm text-center py-4">
                    No foreign keys found
                  </div>
                )}
              </div>
            </div>

            {/* Indexes Section */}
            <div>
              <div className="flex items-center space-x-2 mb-3">
                <Hash className="w-5 h-5 text-green-500" />
                <h4 className="text-md font-semibold text-white" title="Indexes improve database query performance by creating fast lookup structures on columns">Indexes</h4>
                <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full">
                  {(schema?.tables.flatMap(table => table.indexes || []).length || 0) + 
                   (schema?.tables.flatMap(table => table.columns.filter(col => col.indexed)).length || 0)}
                </span>
              </div>
              <div className="space-y-2">
                {/* Table-level indexes */}
                {schema?.tables.map(table => 
                  (table.indexes || []).map(index => (
                    <div key={`${table.id}-${index.id}`} className="bg-gray-700 rounded-lg p-3">
                      <div className="flex items-center justify-between mb-2">
                        <div>
                          <div className="text-white font-medium text-sm">{index.name}</div>
                          <div className="text-gray-400 text-xs">{table.name}</div>
                        </div>
                        <div className="flex items-center space-x-1">
                          <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
                            {index.type}
                          </span>
                          {index.unique && (
                            <span className="text-xs bg-purple-100 text-purple-800 px-2 py-1 rounded">
                              UNIQUE
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="text-xs text-gray-300">
                        Columns: {index.columns.join(', ')}
                      </div>
                      {index.partial && (
                        <div className="text-xs text-gray-400 mt-1">
                          WHERE {index.partial}
                        </div>
                      )}
                    </div>
                  ))
                )}
                
                {/* Column-level indexes */}
                {schema?.tables.map(table => 
                  table.columns.filter(col => col.indexed).map(column => (
                    <div key={`${table.id}-${column.id}-idx`} className="bg-gray-700 rounded-lg p-3">
                      <div className="flex items-center justify-between mb-2">
                        <div>
                          <div className="text-white font-medium text-sm">{column.indexName || `idx_${column.name}`}</div>
                          <div className="text-gray-400 text-xs">{table.name}.{column.name}</div>
                        </div>
                        <div className="flex items-center space-x-1">
                          <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
                            {column.indexType || 'B-tree'}
                          </span>
                        </div>
                      </div>
                      <div className="text-xs text-gray-300">
                        Single column index
                      </div>
                    </div>
                  ))
                )}
                
                {(!schema?.tables.flatMap(table => table.indexes || []).length && 
                  !schema?.tables.flatMap(table => table.columns.filter(col => col.indexed)).length) && (
                  <div className="text-gray-400 text-sm text-center py-4">
                    No indexes found
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
        )}

        {/* Enhanced Database Info Panel */}
        {showDatabaseInfo && (
          <div className="w-80 bg-gray-800 border-l border-gray-700 flex flex-col h-full">
            <div className="p-4 border-b border-gray-700 flex-shrink-0 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-white mb-2">Database Information</h3>
                <p className="text-sm text-gray-400">Database metadata and statistics</p>
              </div>
              <button
                onClick={() => setShowDatabaseInfo(false)}
                className="p-1 hover:bg-gray-700 rounded transition-colors"
                title="Close Database Info"
              >
                <X className="w-5 h-5 text-gray-400 hover:text-white" />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 space-y-6" style={{ maxHeight: 'calc(100vh - 200px)' }}>
              {(() => {
                const dbInfo = getDatabaseInfo();
                if (!dbInfo) return <div className="text-gray-400 text-sm text-center py-4">No database information available</div>;
                
                return (
                  <div className="space-y-4">
                    {/* Database Type & Version */}
                    <div className="bg-gray-700 rounded-lg p-4">
                      <div className="flex items-center space-x-2 mb-3">
                        <Server className="w-5 h-5 text-blue-500" />
                        <h4 className="text-md font-semibold text-white">Database Details</h4>
                      </div>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-400">Type:</span>
                          <span className="text-white">{dbInfo.type}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-400">Version:</span>
                          <span className="text-white">{dbInfo.version}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-400">Encoding:</span>
                          <span className="text-white">{dbInfo.encoding}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-400">Page Size:</span>
                          <span className="text-white">{dbInfo.pageSize} bytes</span>
                        </div>
                        {dbInfo.journalMode && (
                          <div className="flex justify-between">
                            <span className="text-gray-400">Journal Mode:</span>
                            <span className="text-white">{dbInfo.journalMode}</span>
                          </div>
                        )}
                        {dbInfo.foreignKeys !== undefined && (
                          <div className="flex justify-between">
                            <span className="text-gray-400">Foreign Keys:</span>
                            <span className={`${dbInfo.foreignKeys ? 'text-green-400' : 'text-red-400'}`}>
                              {dbInfo.foreignKeys ? 'Enabled' : 'Disabled'}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Database Statistics */}
                    {dbInfo.statistics && (
                      <div className="bg-gray-700 rounded-lg p-4">
                        <div className="flex items-center space-x-2 mb-3">
                          <BarChart3 className="w-5 h-5 text-green-500" />
                          <h4 className="text-md font-semibold text-white">Statistics</h4>
                        </div>
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div className="text-center">
                            <div className="text-2xl font-bold text-blue-400">{dbInfo.statistics.pageCount || 0}</div>
                            <div className="text-gray-400 text-xs">Total Pages</div>
                          </div>
                          <div className="text-center">
                            <div className="text-2xl font-bold text-green-400">{dbInfo.statistics.freelistCount || 0}</div>
                            <div className="text-gray-400 text-xs">Free Pages</div>
                          </div>
                        </div>
                        {dbInfo.statistics.integrityCheck && (
                          <div className="mt-3 text-center">
                            <div className={`inline-flex items-center space-x-2 px-3 py-1 rounded-full text-xs ${
                              dbInfo.statistics.integrityCheck === 'ok' 
                                ? 'bg-green-100 text-green-800' 
                                : 'bg-red-100 text-red-800'
                            }`}>
                              <div className={`w-2 h-2 rounded-full ${
                                dbInfo.statistics.integrityCheck === 'ok' ? 'bg-green-500' : 'bg-red-500'
                              }`}></div>
                              <span>
                                {dbInfo.statistics.integrityCheck === 'ok' ? 'Integrity OK' : 'Check Required'}
                              </span>
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Schema Overview */}
                    <div className="bg-gray-700 rounded-lg p-4">
                      <div className="flex items-center space-x-2 mb-3">
                        <Database className="w-5 h-5 text-purple-500" />
                        <h4 className="text-md font-semibold text-white">Schema Overview</h4>
                      </div>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div className="text-center">
                          <div className="text-2xl font-bold text-purple-400">{schema?.tables.length || 0}</div>
                          <div className="text-gray-400 text-xs">Tables</div>
                        </div>
                        <div className="text-center">
                          <div className="text-2xl font-bold text-blue-400">
                            {schema?.tables.reduce((sum, table) => sum + table.columns.length, 0) || 0}
                          </div>
                          <div className="text-gray-400 text-xs">Columns</div>
                        </div>
                        <div className="text-center">
                          <div className="text-2xl font-bold text-green-400">
                            {schema?.tables.reduce((sum, table) => sum + (table.data?.length || 0), 0) || 0}
                          </div>
                          <div className="text-gray-400 text-xs">Records</div>
                        </div>
                        <div className="text-center">
                          <div className="text-2xl font-bold text-yellow-400">
                            {schema?.tables.reduce((sum, table) => sum + (table.indexes?.length || 0), 0) || 0}
                          </div>
                          <div className="text-gray-400 text-xs">Indexes</div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>
        )}

        {/* Enhanced Constraints Panel */}
        {showConstraintsPanel && (
          <div className="w-80 bg-gray-800 border-l border-gray-700 flex flex-col h-full">
            <div className="p-4 border-b border-gray-700 flex-shrink-0 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-white mb-2">Constraints</h3>
                <p className="text-sm text-gray-400">All database constraints and rules</p>
              </div>
              <button
                onClick={() => setShowConstraintsPanel(false)}
                className="p-1 hover:bg-gray-700 rounded transition-colors"
                title="Close Constraints"
              >
                <X className="w-5 h-5 text-gray-400 hover:text-white" />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 space-y-6" style={{ maxHeight: 'calc(100vh - 200px)' }}>
              {(() => {
                const constraints = getConstraintSummary();
                
                return (
                  <div className="space-y-4">
                    {/* Constraint Summary */}
                    <div className="bg-gray-700 rounded-lg p-4">
                      <div className="flex items-center space-x-2 mb-3">
                        <Shield className="w-5 h-5 text-red-500" />
                        <h4 className="text-md font-semibold text-white">Constraint Summary</h4>
                      </div>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div className="text-center">
                          <div className="text-2xl font-bold text-yellow-400">{constraints.primaryKeys}</div>
                          <div className="text-gray-400 text-xs">Primary Keys</div>
                        </div>
                        <div className="text-center">
                          <div className="text-2xl font-bold text-blue-400">{constraints.foreignKeys}</div>
                          <div className="text-gray-400 text-xs">Foreign Keys</div>
                        </div>
                        <div className="text-center">
                          <div className="text-2xl font-bold text-red-400">{constraints.notNull}</div>
                          <div className="text-gray-400 text-xs">NOT NULL</div>
                        </div>
                        <div className="text-center">
                          <div className="text-2xl font-bold text-purple-400">{constraints.unique}</div>
                          <div className="text-gray-400 text-xs">UNIQUE</div>
                        </div>
                        <div className="text-center">
                          <div className="text-2xl font-bold text-gray-400">{constraints.default}</div>
                          <div className="text-gray-400 text-xs">DEFAULT</div>
                        </div>
                        <div className="text-center">
                          <div className="text-2xl font-bold text-orange-400">{constraints.check}</div>
                          <div className="text-gray-400 text-xs">CHECK</div>
                        </div>
                      </div>
                    </div>

                    {/* Detailed Constraints */}
                    {schema?.tables.map(table => {
                      const tableConstraints = table.columns.filter(col => 
                        col.primaryKey || col.foreignKey || !col.nullable || col.unique || col.defaultValue || col.constraints?.check
                      );
                      
                      if (tableConstraints.length === 0) return null;
                      
                      return (
                        <div key={table.id} className="bg-gray-700 rounded-lg p-4">
                          <div className="flex items-center space-x-2 mb-3">
                            <Database className="w-5 h-5 text-blue-500" />
                            <h4 className="text-md font-semibold text-white">{table.name}</h4>
                            <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full">
                              {tableConstraints.length}
                            </span>
                          </div>
                          <div className="space-y-2">
                            {tableConstraints.map(column => (
                              <div key={column.id} className="bg-gray-600 rounded p-3">
                                <div className="flex items-center justify-between mb-2">
                                  <div className="text-white font-medium text-sm">{column.name}</div>
                                  <div className="flex items-center space-x-1">
                                    {column.primaryKey && (
                                      <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded">PK</span>
                                    )}
                                    {column.foreignKey && (
                                      <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">FK</span>
                                    )}
                                    {!column.nullable && (
                                      <span className="text-xs bg-red-100 text-red-800 px-2 py-1 rounded">NN</span>
                                    )}
                                    {column.unique && (
                                      <span className="text-xs bg-purple-100 text-purple-800 px-2 py-1 rounded">UQ</span>
                                    )}
                                    {column.defaultValue && (
                                      <span className="text-xs bg-gray-100 text-gray-800 px-2 py-1 rounded">DEF</span>
                                    )}
                                    {column.constraints?.check && (
                                      <span className="text-xs bg-orange-100 text-orange-800 px-2 py-1 rounded">CHK</span>
                                    )}
                                  </div>
                                </div>
                                <div className="text-xs text-gray-300">
                                  Type: {column.type}
                                  {column.defaultValue && ` • Default: ${column.defaultValue}`}
                                  {column.foreignKey && ` • References: ${column.foreignKey.tableId}.${column.foreignKey.columnId}`}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })()}
            </div>
          </div>
        )}

        {/* Enhanced Indexes Panel */}
        {showIndexesPanel && (
          <div className="w-80 bg-gray-800 border-l border-gray-700 flex flex-col h-full">
            <div className="p-4 border-b border-gray-700 flex-shrink-0 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-white mb-2">Indexes</h3>
                <p className="text-sm text-gray-400">Database indexes and performance optimization</p>
              </div>
              <button
                onClick={() => setShowIndexesPanel(false)}
                className="p-1 hover:bg-gray-700 rounded transition-colors"
                title="Close Indexes"
              >
                <X className="w-5 h-5 text-gray-400 hover:text-white" />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 space-y-6" style={{ maxHeight: 'calc(100vh - 200px)' }}>
              {(() => {
                const indexSummary = getIndexSummary();
                
                return (
                  <div className="space-y-4">
                    {/* Index Summary */}
                    <div className="bg-gray-700 rounded-lg p-4">
                      <div className="flex items-center space-x-2 mb-3">
                        <Hash className="w-5 h-5 text-green-500" />
                        <h4 className="text-md font-semibold text-white">Index Summary</h4>
                      </div>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div className="text-center">
                          <div className="text-2xl font-bold text-green-400">{indexSummary.total}</div>
                          <div className="text-gray-400 text-xs">Total Indexes</div>
                        </div>
                        <div className="text-center">
                          <div className="text-2xl font-bold text-purple-400">{indexSummary.unique}</div>
                          <div className="text-gray-400 text-xs">Unique Indexes</div>
                        </div>
                        <div className="text-center">
                          <div className="text-2xl font-bold text-blue-400">{indexSummary.composite}</div>
                          <div className="text-gray-400 text-xs">Composite</div>
                        </div>
                        <div className="text-center">
                          <div className="text-2xl font-bold text-orange-400">{indexSummary.partial}</div>
                          <div className="text-gray-400 text-xs">Partial</div>
                        </div>
                      </div>
                    </div>

                    {/* Detailed Indexes */}
                    {schema?.tables.map(table => {
                      const tableIndexes = table.indexes || [];
                      const columnIndexes = table.columns.filter(col => col.indexed);
                      
                      if (tableIndexes.length === 0 && columnIndexes.length === 0) return null;
                      
                      return (
                        <div key={table.id} className="bg-gray-700 rounded-lg p-4">
                          <div className="flex items-center space-x-2 mb-3">
                            <Database className="w-5 h-5 text-green-500" />
                            <h4 className="text-md font-semibold text-white">{table.name}</h4>
                            <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full">
                              {tableIndexes.length + columnIndexes.length}
                            </span>
                          </div>
                          <div className="space-y-2">
                            {/* Table-level indexes */}
                            {tableIndexes.map(index => (
                              <div key={index.id} className="bg-gray-600 rounded p-3">
                                <div className="flex items-center justify-between mb-2">
                                  <div className="text-white font-medium text-sm">{index.name}</div>
                                  <div className="flex items-center space-x-1">
                                    <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
                                      {index.type || 'BTREE'}
                                    </span>
                                    {index.unique && (
                                      <span className="text-xs bg-purple-100 text-purple-800 px-2 py-1 rounded">UNIQUE</span>
                                    )}
                                    {index.partial && (
                                      <span className="text-xs bg-orange-100 text-orange-800 px-2 py-1 rounded">PARTIAL</span>
                                    )}
                                  </div>
                                </div>
                                <div className="text-xs text-gray-300">
                                  Columns: {index.columns.join(', ')}
                                </div>
                                {index.partial && (
                                  <div className="text-xs text-gray-400 mt-1">
                                    WHERE {index.partial}
                                  </div>
                                )}
                              </div>
                            ))}
                            
                            {/* Column-level indexes */}
                            {columnIndexes.map(column => (
                              <div key={`${column.id}-idx`} className="bg-gray-600 rounded p-3">
                                <div className="flex items-center justify-between mb-2">
                                  <div className="text-white font-medium text-sm">{column.indexName || `idx_${column.name}`}</div>
                                  <div className="flex items-center space-x-1">
                                    <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
                                      {column.indexType || 'BTREE'}
                                    </span>
                                    {column.unique && (
                                      <span className="text-xs bg-purple-100 text-purple-800 px-2 py-1 rounded">UNIQUE</span>
                                    )}
                                  </div>
                                </div>
                                <div className="text-xs text-gray-300">
                                  Column: {column.name} ({column.type})
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })()}
            </div>
          </div>
        )}

        {/* Enhanced Migration Panel */}
        {showMigrationPanel && (
          <div className="w-80 bg-gray-800 border-l border-gray-700 flex flex-col h-full">
            <div className="p-4 border-b border-gray-700 flex-shrink-0 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-white mb-2">Migrations</h3>
                <p className="text-sm text-gray-400">Database migration history and management</p>
              </div>
              <button
                onClick={() => setShowMigrationPanel(false)}
                className="p-1 hover:bg-gray-700 rounded transition-colors"
                title="Close Migrations"
              >
                <X className="w-5 h-5 text-gray-400 hover:text-white" />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 space-y-6" style={{ maxHeight: 'calc(100vh - 200px)' }}>
              {schema?.migrationHistory ? (
                <div className="space-y-4">
                  {/* Migration Overview */}
                  <div className="bg-gray-700 rounded-lg p-4">
                    <div className="flex items-center space-x-2 mb-3">
                      <GitBranch className="w-5 h-5 text-purple-500" />
                      <h4 className="text-md font-semibold text-white">Migration Overview</h4>
                    </div>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-purple-400">{schema.migrationHistory.migrations.length}</div>
                        <div className="text-gray-400 text-xs">Total Migrations</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-green-400">
                          {schema.migrationHistory.migrations.filter(m => m.status === 'executed').length}
                        </div>
                        <div className="text-gray-400 text-xs">Executed</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-yellow-400">
                          {schema.migrationHistory.migrations.filter(m => m.status === 'pending').length}
                        </div>
                        <div className="text-gray-400 text-xs">Pending</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-blue-400">{schema.migrationHistory.framework}</div>
                        <div className="text-gray-400 text-xs">Framework</div>
                      </div>
                    </div>
                  </div>

                  {/* Migration Timeline */}
                  <div className="bg-gray-700 rounded-lg p-4">
                    <div className="flex items-center space-x-2 mb-3">
                      <Clock className="w-5 h-5 text-blue-500" />
                      <h4 className="text-md font-semibold text-white">Migration Timeline</h4>
                    </div>
                    <div className="space-y-3">
                      {schema.migrationHistory.migrations.slice(0, 10).map((migration, index) => (
                        <div key={migration.id} className="bg-gray-600 rounded p-3">
                          <div className="flex items-center justify-between mb-2">
                            <div className="text-white font-medium text-sm">{migration.name}</div>
                            <div className="flex items-center space-x-1">
                              <span className={`text-xs px-2 py-1 rounded ${
                                migration.status === 'executed' ? 'bg-green-100 text-green-800' :
                                migration.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                                'bg-red-100 text-red-800'
                              }`}>
                                {migration.status}
                              </span>
                            </div>
                          </div>
                          <div className="text-xs text-gray-300">
                            {migration.timestamp && new Date(migration.timestamp).toLocaleDateString()}
                            {migration.description && ` • ${migration.description}`}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-gray-400 text-sm text-center py-4">
                  No migration history available
                </div>
              )}
            </div>
          </div>
        )}

        {/* Enhanced ORM Panel */}
        {showORMPanel && (
          <div className="w-80 bg-gray-800 border-l border-gray-700 flex flex-col h-full">
            <div className="p-4 border-b border-gray-700 flex-shrink-0 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-white mb-2">ORM Models</h3>
                <p className="text-sm text-gray-400">Object-Relational Mapping models and relationships</p>
              </div>
              <button
                onClick={() => setShowORMPanel(false)}
                className="p-1 hover:bg-gray-700 rounded transition-colors"
                title="Close ORM Models"
              >
                <X className="w-5 h-5 text-gray-400 hover:text-white" />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 space-y-6" style={{ maxHeight: 'calc(100vh - 200px)' }}>
              {schema?.ormModels && schema.ormModels.length > 0 ? (
                <div className="space-y-4">
                  {/* ORM Overview */}
                  <div className="bg-gray-700 rounded-lg p-4">
                    <div className="flex items-center space-x-2 mb-3">
                      <Code className="w-5 h-5 text-indigo-500" />
                      <h4 className="text-md font-semibold text-white">ORM Overview</h4>
                    </div>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-indigo-400">{schema.ormModels.length}</div>
                        <div className="text-gray-400 text-xs">Total Models</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-blue-400">
                          {schema.ormModels.reduce((sum, model) => sum + (model.relationships?.length || 0), 0)}
                        </div>
                        <div className="text-gray-400 text-xs">Relationships</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-green-400">
                          {schema.ormModels.reduce((sum, model) => sum + (model.validations?.length || 0), 0)}
                        </div>
                        <div className="text-gray-400 text-xs">Validations</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-purple-400">
                          {new Set(schema.ormModels.map(m => m.framework)).size}
                        </div>
                        <div className="text-gray-400 text-xs">Frameworks</div>
                      </div>
                    </div>
                  </div>

                  {/* ORM Models */}
                  <div className="space-y-3">
                    {schema.ormModels.map(model => (
                      <div key={model.id} className="bg-gray-700 rounded-lg p-4">
                        <div className="flex items-center justify-between mb-3">
                          <div>
                            <div className="text-white font-medium text-sm">{model.name}</div>
                            <div className="text-gray-400 text-xs">{model.framework} • {model.tableName || 'No table'}</div>
                          </div>
                          <div className="flex items-center space-x-1">
                            <span className="text-xs bg-indigo-100 text-indigo-800 px-2 py-1 rounded">
                              {model.framework}
                            </span>
                          </div>
                        </div>
                        
                        {model.relationships && model.relationships.length > 0 && (
                          <div className="mb-2">
                            <div className="text-xs text-gray-400 mb-1">Relationships:</div>
                            <div className="flex flex-wrap gap-1">
                              {model.relationships.slice(0, 3).map((rel, idx) => (
                                <span key={idx} className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                                  {rel.type}
                                </span>
                              ))}
                              {model.relationships.length > 3 && (
                                <span className="text-xs text-gray-400">+{model.relationships.length - 3} more</span>
                              )}
                            </div>
                          </div>
                        )}
                        
                        {model.validations && model.validations.length > 0 && (
                          <div className="mb-2">
                            <div className="text-xs text-gray-400 mb-1">Validations:</div>
                            <div className="flex flex-wrap gap-1">
                              {model.validations.slice(0, 3).map((val, idx) => (
                                <span key={idx} className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
                                  {val.type}
                                </span>
                              ))}
                              {model.validations.length > 3 && (
                                <span className="text-xs text-gray-400">+{model.validations.length - 3} more</span>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="text-gray-400 text-sm text-center py-4">
                  No ORM models found
                </div>
              )}
            </div>
          </div>
        )}

        {/* Enhanced Metadata Panel */}
        {showMetadataPanel && (
          <div className="w-80 bg-gray-800 border-l border-gray-700 flex flex-col h-full">
            <div className="p-4 border-b border-gray-700 flex-shrink-0 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-white mb-2">Metadata</h3>
                <p className="text-sm text-gray-400">Additional database metadata and information</p>
              </div>
              <button
                onClick={() => setShowMetadataPanel(false)}
                className="p-1 hover:bg-gray-700 rounded transition-colors"
                title="Close Metadata"
              >
                <X className="w-5 h-5 text-gray-400 hover:text-white" />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 space-y-6" style={{ maxHeight: 'calc(100vh - 200px)' }}>
              <div className="space-y-4">
                {/* Views */}
                {schema?.views && schema.views.length > 0 && (
                  <div className="bg-gray-700 rounded-lg p-4">
                    <div className="flex items-center space-x-2 mb-3">
                      <Eye className="w-5 h-5 text-blue-500" />
                      <h4 className="text-md font-semibold text-white">Database Views</h4>
                      <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full">
                        {schema.views.length}
                      </span>
                    </div>
                    <div className="space-y-2">
                      {schema.views.map((view, index) => (
                        <div key={index} className="bg-gray-600 rounded p-3">
                          <div className="text-white font-medium text-sm">{view.name}</div>
                          <div className="text-gray-400 text-xs mt-1">
                            {view.description || 'No description available'}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Triggers */}
                {schema?.triggers && schema.triggers.length > 0 && (
                  <div className="bg-gray-700 rounded-lg p-4">
                    <div className="flex items-center space-x-2 mb-3">
                      <Zap className="w-5 h-5 text-yellow-500" />
                      <h4 className="text-md font-semibold text-white">Database Triggers</h4>
                      <span className="bg-yellow-100 text-yellow-800 text-xs px-2 py-1 rounded-full">
                        {schema.triggers.length}
                      </span>
                    </div>
                    <div className="space-y-2">
                      {schema.triggers.map((trigger, index) => (
                        <div key={index} className="bg-gray-600 rounded p-3">
                          <div className="text-white font-medium text-sm">{trigger.name}</div>
                          <div className="text-gray-400 text-xs mt-1">
                            {trigger.description || 'No description available'}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Functions */}
                {schema?.functions && schema.functions.length > 0 && (
                  <div className="bg-gray-700 rounded-lg p-4">
                    <div className="flex items-center space-x-2 mb-3">
                      <Code className="w-5 h-5 text-green-500" />
                      <h4 className="text-md font-semibold text-white">Database Functions</h4>
                      <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full">
                        {schema.functions.length}
                      </span>
                    </div>
                    <div className="space-y-2">
                      {schema.functions.map((func, index) => (
                        <div key={index} className="bg-gray-600 rounded p-3">
                          <div className="text-white font-medium text-sm">{func.name}</div>
                          <div className="text-gray-400 text-xs mt-1">
                            {func.description || 'No description available'}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Procedures */}
                {schema?.procedures && schema.procedures.length > 0 && (
                  <div className="bg-gray-700 rounded-lg p-4">
                    <div className="flex items-center space-x-2 mb-3">
                      <Settings className="w-5 h-5 text-purple-500" />
                      <h4 className="text-md font-semibold text-white">Database Procedures</h4>
                      <span className="bg-purple-100 text-purple-800 text-xs px-2 py-1 rounded-full">
                        {schema.procedures.length}
                      </span>
                    </div>
                    <div className="space-y-2">
                      {schema.procedures.map((proc, index) => (
                        <div key={index} className="bg-gray-600 rounded p-3">
                          <div className="text-white font-medium text-sm">{proc.name}</div>
                          <div className="text-gray-400 text-xs mt-1">
                            {proc.description || 'No description available'}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Schema Statistics */}
                <div className="bg-gray-700 rounded-lg p-4">
                  <div className="flex items-center space-x-2 mb-3">
                    <BarChart3 className="w-5 h-5 text-purple-500" />
                    <h4 className="text-md font-semibold text-white">Schema Statistics</h4>
                  </div>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-purple-400">{schema?.tables.length || 0}</div>
                      <div className="text-gray-400 text-xs">Tables</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-blue-400">
                        {schema?.tables.reduce((sum, table) => sum + table.columns.length, 0) || 0}
                      </div>
                      <div className="text-gray-400 text-xs">Columns</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-green-400">
                        {schema?.tables.reduce((sum, table) => sum + (table.data?.length || 0), 0) || 0}
                      </div>
                      <div className="text-gray-400 text-xs">Records</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-yellow-400">
                        {schema?.tables.reduce((sum, table) => sum + (table.indexes?.length || 0), 0) || 0}
                      </div>
                      <div className="text-gray-400 text-xs">Indexes</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Table Editor Modal */}
      {isTableEditorOpen && selectedTable && (
        <TableEditor
          table={selectedTable}
          onSave={handleUpdateTable}
          onClose={() => {
            setIsTableEditorOpen(false);
            setSelectedTable(null);
          }}
        />
      )}

      {/* Templates Modal */}
      {showTemplates && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-lg p-6 w-full max-w-4xl max-h-[80vh] overflow-hidden">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-semibold text-white">Schema Templates</h3>
              <button
                onClick={() => setShowTemplates(false)}
                className="text-gray-400 hover:text-white"
              >
                ×
              </button>
            </div>
            
            <div className="mb-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder="Search templates..."
                  value={templateSearch}
                  onChange={(e) => setTemplateSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-gray-700 text-white rounded-md border border-gray-600 focus:border-orange-500 focus:outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 overflow-y-auto max-h-96">
              {filteredTemplates.map((template) => (
                <div
                  key={template.id}
                  className="bg-gray-700 rounded-lg p-4 hover:bg-gray-600 transition-colors cursor-pointer"
                  onClick={() => loadTemplate(template.id)}
                >
                  <h4 className="text-lg font-semibold text-white mb-2">{template.name}</h4>
                  <p className="text-gray-300 text-sm mb-3">{template.description}</p>
                  <div className="flex items-center justify-between">
                    <span className="text-xs bg-orange-600 text-white px-2 py-1 rounded">
                      {template.category}
                    </span>
                    <span className="text-xs text-gray-400">
                      {template.schema.tables.length} tables
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1 mt-2">
                    {template.tags.slice(0, 3).map((tag) => (
                      <span
                        key={tag}
                        className="text-xs bg-gray-600 text-gray-300 px-2 py-1 rounded"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Validation Panel */}
      {showValidation && validation && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-lg p-6 w-full max-w-4xl max-h-[80vh] overflow-hidden">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-semibold text-white flex items-center">
                <CheckCircle className="w-6 h-6 mr-2 text-green-500" />
                Schema Validation Results
              </h3>
              <button
                onClick={() => setShowValidation(false)}
                className="text-gray-400 hover:text-white"
              >
                ×
              </button>
            </div>

            <div className="mb-4">
              <div className={`p-4 rounded-lg ${validation.isValid ? 'bg-green-900 border border-green-700' : 'bg-red-900 border border-red-700'}`}>
                <div className="flex items-center">
                  {validation.isValid ? (
                    <CheckCircle className="w-5 h-5 text-green-500 mr-2" />
                  ) : (
                    <AlertTriangle className="w-5 h-5 text-red-500 mr-2" />
                  )}
                  <span className={`font-semibold ${validation.isValid ? 'text-green-300' : 'text-red-300'}`}>
                    {validation.isValid ? 'Schema is valid!' : 'Schema has issues'}
                  </span>
                </div>
                <p className="text-gray-300 text-sm mt-1">
                  {validation.errors.length} errors, {validation.warnings.length} warnings
                </p>
              </div>
            </div>

            <div className="space-y-4 overflow-y-auto max-h-96">
              {validation.errors.length > 0 && (
                <div>
                  <h4 className="text-lg font-semibold text-red-400 mb-2">Errors</h4>
                  <div className="space-y-2">
                    {validation.errors.map((error, index) => (
                      <div key={index} className="bg-red-900 border border-red-700 rounded-lg p-3">
                        <div className="flex items-start">
                          <AlertTriangle className="w-4 h-4 text-red-500 mr-2 mt-0.5 flex-shrink-0" />
                          <div>
                            <p className="text-red-300 font-medium">{error.message}</p>
                            {error.tableId && (
                              <p className="text-red-400 text-sm mt-1">
                                Table: {schema?.tables.find(t => t.id === error.tableId)?.name || error.tableId}
                              </p>
                            )}
                            {error.columnId && (
                              <p className="text-red-400 text-sm">
                                Column: {error.columnId}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {validation.warnings.length > 0 && (
                <div>
                  <h4 className="text-lg font-semibold text-yellow-400 mb-2">Warnings</h4>
                  <div className="space-y-2">
                    {validation.warnings.map((warning, index) => (
                      <div key={index} className="bg-yellow-900 border border-yellow-700 rounded-lg p-3">
                        <div className="flex items-start">
                          <AlertTriangle className="w-4 h-4 text-yellow-500 mr-2 mt-0.5 flex-shrink-0" />
                          <div>
                            <p className="text-yellow-300 font-medium">{warning.message}</p>
                            {warning.suggestion && (
                              <p className="text-yellow-400 text-sm mt-1">
                                Suggestion: {warning.suggestion}
                              </p>
                            )}
                            {warning.tableId && (
                              <p className="text-yellow-400 text-sm">
                                Table: {schema?.tables.find(t => t.id === warning.tableId)?.name || warning.tableId}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {validation.isValid && validation.warnings.length === 0 && (
                <div className="text-center py-8">
                  <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
                  <p className="text-green-300 text-lg">Perfect! Your schema is valid with no issues.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Schema Optimization Modal */}
      {showAISuggestions && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-lg p-6 w-full max-w-6xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center space-x-3">
                <Lightbulb className="w-6 h-6 text-purple-400" />
                <h3 className="text-xl font-semibold text-white">Schema Analysis & Optimization</h3>
              </div>
              <button
                onClick={() => setShowAISuggestions(false)}
                className="text-gray-400 hover:text-white text-2xl"
              >
                ×
              </button>
            </div>
            
            <div className="space-y-6">
              {/* AI Analysis Summary */}
              <div className="bg-gray-700 rounded-lg p-4">
                <h4 className="text-lg font-semibold text-white mb-3 flex items-center space-x-2">
                  <Brain className="w-5 h-5 text-purple-400" />
                  <span>AI Analysis Summary</span>
                  {aiSuggestions.length > 0 && aiSuggestions[0].analysisData && (
                    <span className="text-xs bg-purple-600 text-white px-2 py-1 rounded">
                      {aiSuggestions[0].analysisData.analysisMetadata?.confidence ? 
                        `${Math.round(aiSuggestions[0].analysisData.analysisMetadata.confidence * 100)}% Confidence` : 
                        'AI Powered'
                      }
                    </span>
                  )}
                </h4>
                
                {/* AI Scores Grid */}
                <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-4">
                  <div className="bg-gray-600 rounded p-3">
                    <div className="flex items-center space-x-2 mb-2">
                      <Target className="w-4 h-4 text-blue-400" />
                      <span className="text-white font-medium text-sm">Overall</span>
                    </div>
                    <div className={`text-xl font-bold ${
                      (aiSuggestions[0]?.analysisData?.overallScore || 0) >= 80 ? 'text-green-400' :
                      (aiSuggestions[0]?.analysisData?.overallScore || 0) >= 60 ? 'text-yellow-400' : 'text-red-400'
                    }`}>
                      {aiSuggestions[0]?.analysisData?.overallScore || 'N/A'}%
                    </div>
                  </div>
                  <div className="bg-gray-600 rounded p-3">
                    <div className="flex items-center space-x-2 mb-2">
                      <Zap className="w-4 h-4 text-green-400" />
                      <span className="text-white font-medium text-sm">Performance</span>
                    </div>
                    <div className={`text-xl font-bold ${
                      (aiSuggestions[0]?.analysisData?.performanceScore || 0) >= 80 ? 'text-green-400' :
                      (aiSuggestions[0]?.analysisData?.performanceScore || 0) >= 60 ? 'text-yellow-400' : 'text-red-400'
                    }`}>
                      {aiSuggestions[0]?.analysisData?.performanceScore || 'N/A'}%
                    </div>
                  </div>
                  <div className="bg-gray-600 rounded p-3">
                    <div className="flex items-center space-x-2 mb-2">
                      <Shield className="w-4 h-4 text-orange-400" />
                      <span className="text-white font-medium text-sm">Integrity</span>
                    </div>
                    <div className={`text-xl font-bold ${
                      (aiSuggestions[0]?.analysisData?.integrityScore || 0) >= 80 ? 'text-green-400' :
                      (aiSuggestions[0]?.analysisData?.integrityScore || 0) >= 60 ? 'text-yellow-400' : 'text-red-400'
                    }`}>
                      {aiSuggestions[0]?.analysisData?.integrityScore || 'N/A'}%
                    </div>
                  </div>
                  <div className="bg-gray-600 rounded p-3">
                    <div className="flex items-center space-x-2 mb-2">
                      <TrendingUp className="w-4 h-4 text-purple-400" />
                      <span className="text-white font-medium text-sm">Scalability</span>
                    </div>
                    <div className={`text-xl font-bold ${
                      (aiSuggestions[0]?.analysisData?.scalabilityScore || 0) >= 80 ? 'text-green-400' :
                      (aiSuggestions[0]?.analysisData?.scalabilityScore || 0) >= 60 ? 'text-yellow-400' : 'text-red-400'
                    }`}>
                      {aiSuggestions[0]?.analysisData?.scalabilityScore || 'N/A'}%
                    </div>
                  </div>
                  <div className="bg-gray-600 rounded p-3">
                    <div className="flex items-center space-x-2 mb-2">
                      <Lock className="w-4 h-4 text-red-400" />
                      <span className="text-white font-medium text-sm">Security</span>
                    </div>
                    <div className={`text-xl font-bold ${
                      (aiSuggestions[0]?.analysisData?.securityScore || 0) >= 80 ? 'text-green-400' :
                      (aiSuggestions[0]?.analysisData?.securityScore || 0) >= 60 ? 'text-yellow-400' : 'text-red-400'
                    }`}>
                      {aiSuggestions[0]?.analysisData?.securityScore || 'N/A'}%
                    </div>
                  </div>
                </div>
                
                {/* AI Insights */}
                {aiSuggestions.length > 0 && aiSuggestions[0].analysisData?.semanticInsights && (
                  <div className="bg-gray-800 rounded p-3 mb-4">
                    <h5 className="text-white font-medium mb-2 flex items-center space-x-2">
                      <Brain className="w-4 h-4 text-purple-400" />
                      <span>AI Semantic Analysis</span>
                    </h5>
                    <div className="grid md:grid-cols-2 gap-3 text-sm">
                      <div>
                        <span className="text-gray-400">Business Domain:</span>
                        <span className="text-white ml-2 capitalize">{aiSuggestions[0].analysisData.semanticInsights.domainAnalysis}</span>
                      </div>
                      <div>
                        <span className="text-gray-400">Complexity:</span>
                        <span className="text-white ml-2 capitalize">{aiSuggestions[0].analysisData.semanticInsights.complexityLevel}</span>
                      </div>
                      <div className="md:col-span-2">
                        <span className="text-gray-400">Architecture:</span>
                        <span className="text-white ml-2">{aiSuggestions[0].analysisData.semanticInsights.architecturalPattern}</span>
                      </div>
                      <div className="md:col-span-2">
                        <span className="text-gray-400">Business Context:</span>
                        <span className="text-white ml-2">{aiSuggestions[0].analysisData.semanticInsights.businessContext}</span>
                      </div>
                    </div>
                  </div>
                )}
                
                {/* Schema Stats */}
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-400">{schema?.tables.length || 0}</div>
                    <div className="text-gray-400">Tables Analyzed</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-400">{aiSuggestions.length}</div>
                    <div className="text-gray-400">AI Recommendations</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-purple-400">
                      {aiSuggestions[0]?.analysisData?.analysisMetadata?.processingTime || 'N/A'}
                      {aiSuggestions[0]?.analysisData?.analysisMetadata?.processingTime ? 'ms' : ''}
                    </div>
                    <div className="text-gray-400">Analysis Time</div>
                  </div>
                </div>
              </div>

              {/* Optimization Suggestions */}
              <div className="space-y-4">
                <h4 className="text-lg font-semibold text-white">Optimization Recommendations</h4>
                {aiSuggestions.map((suggestion) => (
                  <div key={suggestion.id} className="bg-gray-700 rounded-lg p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-2">
                          <Lightbulb className="w-5 h-5 text-yellow-400" />
                          <h5 className="text-white font-semibold">{suggestion.title}</h5>
                          <span className={`px-2 py-1 rounded text-xs ${
                            suggestion.impact === 'critical' ? 'bg-red-600' :
                            suggestion.impact === 'high' ? 'bg-orange-600' :
                            suggestion.impact === 'medium' ? 'bg-yellow-600' :
                            'bg-green-600'
                          }`}>
                            {suggestion.impact}
                          </span>
                          <span className="px-2 py-1 rounded text-xs bg-blue-600">
                            {suggestion.type}
                          </span>
                          <span className="px-2 py-1 rounded text-xs bg-purple-600">
                            {Math.round(suggestion.confidence * 100)}% AI confidence
                          </span>
                          {suggestion.riskLevel && (
                            <span className={`px-2 py-1 rounded text-xs ${
                              suggestion.riskLevel === 'high' ? 'bg-red-700' :
                              suggestion.riskLevel === 'medium' ? 'bg-yellow-700' : 'bg-green-700'
                            }`}>
                              {suggestion.riskLevel} risk
                            </span>
                          )}
                        </div>
                        <p className="text-gray-300 mb-3">{suggestion.description}</p>
                        
                        {/* AI Reasoning */}
                        {suggestion.aiReasoning && (
                          <div className="bg-purple-900 border border-purple-700 rounded p-3 mb-3">
                            <h6 className="text-purple-300 font-medium mb-1 flex items-center space-x-1">
                              <Brain className="w-4 h-4" />
                              <span>AI Analysis</span>
                            </h6>
                            <p className="text-purple-200 text-sm">{suggestion.aiReasoning}</p>
                          </div>
                        )}
                        
                        {/* Technical Details */}
                        {(suggestion.affectedTables?.length > 0 || suggestion.affectedColumns?.length > 0) && (
                          <div className="bg-gray-800 rounded p-3 mb-3">
                            <h6 className="text-white font-medium mb-2">Affected Elements</h6>
                            <div className="grid md:grid-cols-2 gap-3 text-sm">
                              {suggestion.affectedTables?.length > 0 && (
                                <div>
                                  <span className="text-gray-400">Tables:</span>
                                  <div className="flex flex-wrap gap-1 mt-1">
                                    {suggestion.affectedTables.map((table: string, idx: number) => (
                                      <span key={idx} className="px-2 py-1 bg-blue-600 text-white rounded text-xs">
                                        {table}
                                      </span>
                                    ))}
                                  </div>
                                </div>
                              )}
                              {suggestion.affectedColumns?.length > 0 && (
                                <div>
                                  <span className="text-gray-400">Columns:</span>
                                  <div className="flex flex-wrap gap-1 mt-1">
                                    {suggestion.affectedColumns.map((column: string, idx: number) => (
                                      <span key={idx} className="px-2 py-1 bg-green-600 text-white rounded text-xs">
                                        {column}
                                      </span>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                        
                        {/* Current vs Proposed State */}
                        {(suggestion.currentState || suggestion.proposedState) && (
                          <div className="bg-gray-800 rounded p-3 mb-3">
                            <h6 className="text-white font-medium mb-2">State Comparison</h6>
                            <div className="grid md:grid-cols-2 gap-3 text-sm">
                              {suggestion.currentState && (
                                <div>
                                  <span className="text-red-400 font-medium">Current:</span>
                                  <p className="text-gray-300 mt-1">{suggestion.currentState}</p>
                                </div>
                              )}
                              {suggestion.proposedState && (
                                <div>
                                  <span className="text-green-400 font-medium">Proposed:</span>
                                  <p className="text-gray-300 mt-1">{suggestion.proposedState}</p>
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                        
                        {/* Implementation Steps */}
                        <div className="bg-gray-600 rounded p-3 mb-3">
                          <h6 className="text-white font-medium mb-2">Implementation Steps:</h6>
                          <ol className="space-y-1">
                            {suggestion.recommendations.map((rec: string, index: number) => (
                              <li key={index} className="text-gray-300 text-sm flex items-start">
                                <span className="text-orange-400 mr-2 font-medium">{index + 1}.</span>
                                {rec}
                              </li>
                            ))}
                          </ol>
                        </div>
                        
                        {/* Code Examples */}
                        {suggestion.codeExamples && (
                          <div className="bg-gray-800 rounded p-3 mb-3">
                            <h6 className="text-white font-medium mb-2">SQL Implementation</h6>
                            <div className="space-y-2">
                              {suggestion.codeExamples.sql && (
                                <div>
                                  <span className="text-green-400 text-sm font-medium">SQL:</span>
                                  <pre className="bg-gray-900 text-gray-300 p-2 rounded text-xs overflow-x-auto mt-1">
                                    <code>{suggestion.codeExamples.sql}</code>
                                  </pre>
                                </div>
                              )}
                              {suggestion.codeExamples.migration && (
                                <div>
                                  <span className="text-blue-400 text-sm font-medium">Migration:</span>
                                  <pre className="bg-gray-900 text-gray-300 p-2 rounded text-xs overflow-x-auto mt-1">
                                    <code>{suggestion.codeExamples.migration}</code>
                                  </pre>
                                </div>
                              )}
                              {suggestion.codeExamples.rollback && (
                                <div>
                                  <span className="text-red-400 text-sm font-medium">Rollback:</span>
                                  <pre className="bg-gray-900 text-gray-300 p-2 rounded text-xs overflow-x-auto mt-1">
                                    <code>{suggestion.codeExamples.rollback}</code>
                                  </pre>
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                        
                        <div className="bg-green-900 border border-green-700 rounded p-2">
                          <span className="text-green-300 text-sm">
                            <strong>Expected Improvement:</strong> {suggestion.estimatedImprovement}
                          </span>
                        </div>
                      </div>
                      <button
                        onClick={() => showApplyConfirmationModal(suggestion)}
                        className="ml-4 px-4 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700 transition-colors"
                      >
                        Apply
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Apply Confirmation Modal */}
      {showApplyConfirmation && selectedSuggestion && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-lg p-6 w-full max-w-2xl mx-4">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-3">
                <Lightbulb className="w-6 h-6 text-orange-400" />
                <h3 className="text-xl font-semibold text-white">Apply AI Recommendation</h3>
              </div>
              <button
                onClick={() => setShowApplyConfirmation(false)}
                className="text-gray-400 hover:text-white text-2xl"
              >
                ×
              </button>
            </div>
            
            <div className="space-y-4">
              <div className="bg-gray-700 rounded p-4">
                <h4 className="text-lg font-semibold text-white mb-2">{selectedSuggestion.title}</h4>
                <p className="text-gray-300 mb-3">{selectedSuggestion.description}</p>
                
                <div className="grid md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-400">Type:</span>
                    <span className="text-white ml-2 capitalize">{selectedSuggestion.type}</span>
                  </div>
                  <div>
                    <span className="text-gray-400">Priority:</span>
                    <span className={`ml-2 px-2 py-1 rounded text-xs ${
                      selectedSuggestion.impact === 'critical' ? 'bg-red-600' :
                      selectedSuggestion.impact === 'high' ? 'bg-orange-600' :
                      selectedSuggestion.impact === 'medium' ? 'bg-yellow-600' : 'bg-green-600'
                    }`}>
                      {selectedSuggestion.impact}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-400">Confidence:</span>
                    <span className="text-white ml-2">{Math.round(selectedSuggestion.confidence * 100)}%</span>
                  </div>
                  <div>
                    <span className="text-gray-400">Risk Level:</span>
                    <span className={`ml-2 px-2 py-1 rounded text-xs ${
                      selectedSuggestion.riskLevel === 'high' ? 'bg-red-700' :
                      selectedSuggestion.riskLevel === 'medium' ? 'bg-yellow-700' : 'bg-green-700'
                    }`}>
                      {selectedSuggestion.riskLevel}
                    </span>
                  </div>
                </div>
              </div>
              
              <div className="bg-yellow-900 border border-yellow-700 rounded p-3">
                <div className="flex items-start space-x-2">
                  <AlertTriangle className="w-5 h-5 text-yellow-400 mt-0.5" />
                  <div>
                    <h5 className="text-yellow-300 font-medium">Important Notice</h5>
                    <p className="text-yellow-200 text-sm mt-1">
                      This action will modify your database schema. The changes will be applied immediately and cannot be automatically undone. 
                      Make sure to backup your schema before proceeding.
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="bg-green-900 border border-green-700 rounded p-3">
                <h5 className="text-green-300 font-medium">Expected Improvement</h5>
                <p className="text-green-200 text-sm mt-1">{selectedSuggestion.estimatedImprovement}</p>
              </div>
              
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => setShowApplyConfirmation(false)}
                  className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={async () => {
                    setShowApplyConfirmation(false);
                    await applyAISuggestion(selectedSuggestion);
                  }}
                  className="px-4 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700 transition-colors"
                >
                  Apply Recommendation
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Collaborative Editing Panel */}
      {showCollaborativePanel && (
        <div className="fixed top-4 right-4 bg-gray-800 rounded-lg p-4 w-80 z-40">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-white font-semibold">Active Collaborators</h4>
            <button
              onClick={() => setShowCollaborativePanel(false)}
              className="text-gray-400 hover:text-white"
            >
              ×
            </button>
          </div>
          <div className="space-y-3">
            {collaborativeUsers.map((user) => (
              <div key={user.id} className="flex items-center space-x-3">
                <div 
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: user.color }}
                />
                <span className="text-white text-sm">{user.name}</span>
                <span className={`px-2 py-1 rounded text-xs ${
                  user.isActive ? 'bg-green-600' : 'bg-gray-600'
                }`}>
                  {user.isActive ? 'Active' : 'Away'}
                </span>
              </div>
            ))}
          </div>
          <div className="mt-4 pt-3 border-t border-gray-700">
            <div className="text-xs text-gray-400">
              Real-time collaboration enabled. Changes are synchronized automatically.
            </div>
          </div>
        </div>
      )}

      {/* Layout Suggestions Modal */}
      {showLayoutModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-lg p-6 w-full max-w-4xl max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center space-x-3">
                <Layout className="w-6 h-6 text-blue-400" />
                <h3 className="text-xl font-semibold text-white">Layout Suggestions</h3>
              </div>
              <button
                onClick={() => setShowLayoutModal(false)}
                className="text-gray-400 hover:text-white"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <div className="space-y-4">
              <p className="text-gray-300 mb-4">
                Choose the best layout algorithm for your ERD based on your schema structure:
              </p>
              
              {layoutSuggestions.map((suggestion, index) => (
                <div key={suggestion.algorithm} className="bg-gray-700 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <div className={`w-3 h-3 rounded-full ${
                          suggestion.suitability > 0.8 ? 'bg-green-500' :
                          suggestion.suitability > 0.6 ? 'bg-yellow-500' : 'bg-red-500'
                        }`} />
                        <h4 className="text-lg font-semibold text-white">{suggestion.name}</h4>
                        <span className="text-sm px-2 py-1 bg-blue-100 text-blue-800 rounded">
                          {Math.round(suggestion.suitability * 100)}% suitable
                        </span>
                      </div>
                      <p className="text-gray-300 mb-2">{suggestion.description}</p>
                      <p className="text-sm text-gray-400">{suggestion.reason}</p>
                    </div>
                    <button
                      onClick={() => {
                        applyAutoLayout(suggestion.algorithm);
                        setShowLayoutModal(false);
                      }}
                      disabled={isLayouting}
                      className="ml-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-600 transition-colors"
                    >
                      {isLayouting ? 'Applying...' : 'Apply'}
                    </button>
                  </div>
                </div>
              ))}
              
              <div className="bg-gray-700 rounded-lg p-4 border border-purple-500">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <Brain className="w-5 h-5 text-purple-400" />
                      <h4 className="text-lg font-semibold text-white">Smart Layout (Recommended)</h4>
                      <span className="text-sm px-2 py-1 bg-purple-100 text-purple-800 rounded">
                        AI Powered
                      </span>
                    </div>
                    <p className="text-gray-300 mb-2">
                      Let our AI analyze your schema and automatically choose the best layout algorithm
                    </p>
                    <p className="text-sm text-purple-300">
                      Considers table count, relationship density, and hierarchical structure
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      applySmartLayout();
                      setShowLayoutModal(false);
                    }}
                    disabled={isLayouting}
                    className="ml-4 px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:bg-gray-600 transition-colors"
                  >
                    {isLayouting ? 'Applying...' : 'Apply Smart Layout'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}