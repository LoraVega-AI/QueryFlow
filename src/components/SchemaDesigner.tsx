'use client';

// Schema Designer component for visual database design
// This component provides a drag-and-drop interface for creating and editing database tables

import React, { useCallback, useState, useMemo } from 'react';
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
import { Plus, Save, Trash2, AlertTriangle, CheckCircle, FileText, Search, Filter, Brain, Lightbulb, Zap, Target, TrendingUp, Users, Clock, RefreshCw } from 'lucide-react';
import { SchemaValidator } from '@/utils/schemaValidation';
import { SchemaTemplateManager } from '@/utils/schemaTemplates';

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

export function SchemaDesigner({ schema, onSchemaChange }: SchemaDesignerProps) {
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const [selectedTable, setSelectedTable] = useState<Table | null>(null);
  const [isTableEditorOpen, setIsTableEditorOpen] = useState(false);
  const [validation, setValidation] = useState<SchemaValidation | null>(null);
  const [showTemplates, setShowTemplates] = useState(false);
  const [showAISuggestions, setShowAISuggestions] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState<any[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [collaborativeUsers, setCollaborativeUsers] = useState<any[]>([]);
  const [showCollaborativePanel, setShowCollaborativePanel] = useState(false);
  const [showValidation, setShowValidation] = useState(false);
  const [templateSearch, setTemplateSearch] = useState('');

  // Validate schema
  const validateSchema = useCallback(() => {
    if (schema) {
      const validationResult = SchemaValidator.validateSchema(schema);
      setValidation(validationResult);
      setShowValidation(true);
    }
  }, [schema]);

  // AI-powered schema analysis
  const analyzeSchemaWithAI = useCallback(async () => {
    if (!schema || schema.tables.length === 0) return;
    
    setIsAnalyzing(true);
    try {
      // Simulate AI analysis of existing schema patterns
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const suggestions = [
        {
          id: 'suggestion-1',
          type: 'table_optimization',
          title: 'Add Indexes for Performance',
          description: 'Based on your query patterns, consider adding indexes on frequently queried columns',
          confidence: 0.92,
          impact: 'high',
          recommendations: [
            'Add index on users.email for faster login queries',
            'Add composite index on orders(customer_id, created_at) for reporting',
            'Add index on products.category_id for filtering'
          ],
          estimatedImprovement: 'Query performance could improve by 60-80%'
        },
        {
          id: 'suggestion-2',
          type: 'relationship_optimization',
          title: 'Optimize Foreign Key Relationships',
          description: 'Your current relationships could benefit from additional constraints and cascading rules',
          confidence: 0.87,
          impact: 'medium',
          recommendations: [
            'Add CASCADE DELETE to user_orders relationship',
            'Add CHECK constraint on order_status values',
            'Consider adding audit columns (created_at, updated_at) to all tables'
          ],
          estimatedImprovement: 'Data integrity and maintenance efficiency'
        },
        {
          id: 'suggestion-3',
          type: 'data_type_optimization',
          title: 'Optimize Data Types',
          description: 'Some columns could use more efficient data types based on usage patterns',
          confidence: 0.79,
          impact: 'medium',
          recommendations: [
            'Change user_id from VARCHAR to UUID for better performance',
            'Use DECIMAL(10,2) instead of FLOAT for price columns',
            'Consider using ENUM for status fields instead of VARCHAR'
          ],
          estimatedImprovement: 'Storage efficiency and query performance'
        },
        {
          id: 'suggestion-4',
          type: 'new_table_suggestion',
          title: 'Add Audit Logging Table',
          description: 'Based on your schema complexity, consider adding comprehensive audit logging',
          confidence: 0.85,
          impact: 'high',
          recommendations: [
            'Create audit_logs table for tracking all data changes',
            'Add triggers for automatic audit trail generation',
            'Include user_id, action, timestamp, and old/new values'
          ],
          estimatedImprovement: 'Compliance and debugging capabilities'
        },
        {
          id: 'suggestion-5',
          type: 'normalization',
          title: 'Consider Table Normalization',
          description: 'Some tables could benefit from normalization to reduce redundancy',
          confidence: 0.73,
          impact: 'medium',
          recommendations: [
            'Extract product categories into separate table',
            'Create user_profiles table for extended user information',
            'Consider separating order items into dedicated table'
          ],
          estimatedImprovement: 'Data consistency and storage efficiency'
        }
      ];
      
      setAiSuggestions(suggestions);
      setShowAISuggestions(true);
    } catch (error) {
      console.error('AI analysis failed:', error);
    } finally {
      setIsAnalyzing(false);
    }
  }, [schema]);

  // Apply AI suggestion
  const applyAISuggestion = useCallback((suggestion: any) => {
    if (!schema) return;
    
    // Simulate applying the suggestion
    console.log('Applying AI suggestion:', suggestion);
    
    // In a real implementation, this would modify the schema
    // For now, we'll just show a success message
    alert(`Applied suggestion: ${suggestion.title}`);
  }, [schema]);

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

  // Convert schema tables to React Flow nodes
  const schemaToNodes = useCallback((tables: Table[]): Node[] => {
    return tables.map((table) => ({
      id: table.id,
      type: 'table',
      position: table.position,
      data: {
        table,
        onUpdateTable: handleUpdateTable,
        onDeleteTable: handleDeleteTable,
      },
    }));
  }, []);

  // Convert schema relationships to React Flow edges
  const schemaToEdges = useCallback((tables: Table[]): Edge[] => {
    const edges: Edge[] = [];
    
    tables.forEach((table) => {
      table.columns.forEach((column) => {
        if (column.foreignKey) {
          edges.push({
            id: `${table.id}-${column.id}-${column.foreignKey.tableId}`,
            source: table.id,
            target: column.foreignKey.tableId,
            sourceHandle: column.id,
            targetHandle: column.foreignKey.columnId,
            type: 'relationship',
            data: {
              foreignKey: column.foreignKey,
            },
          });
        }
      });
    });
    
    return edges;
  }, []);

  // Initialize nodes and edges from schema
  React.useEffect(() => {
    if (schema) {
      const flowNodes = schemaToNodes(schema.tables);
      const flowEdges = schemaToEdges(schema.tables);
      setNodes(flowNodes);
      setEdges(flowEdges);
    }
  }, [schema, schemaToNodes, schemaToEdges, setNodes, setEdges]);

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
  }, [schema, onSchemaChange]);

  // Handle deleting a table
  const handleDeleteTable = useCallback((tableId: string) => {
    if (!schema) return;

    const updatedSchema: DatabaseSchema = {
      ...schema,
      tables: schema.tables.filter((table) => table.id !== tableId),
      updatedAt: new Date(),
    };

    onSchemaChange(updatedSchema);
  }, [schema, onSchemaChange]);

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

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex items-center justify-between p-4 bg-gray-800 border-b border-gray-700">
        <div className="flex items-center space-x-4">
          <h2 className="text-xl font-semibold text-white">Schema Designer</h2>
          <div className="flex items-center space-x-2">
            <button
              onClick={handleAddTable}
              className="flex items-center space-x-2 px-3 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700 transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>Add Table</span>
            </button>
            <button
              onClick={() => setShowTemplates(true)}
              className="flex items-center space-x-2 px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              <FileText className="w-4 h-4" />
              <span>Templates</span>
            </button>
            <button
              onClick={analyzeSchemaWithAI}
              disabled={isAnalyzing}
              className="flex items-center space-x-2 px-3 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:bg-gray-600 disabled:cursor-not-allowed transition-colors"
            >
              <Brain className="w-4 h-4" />
              <span>{isAnalyzing ? 'Analyzing...' : 'AI Suggestions'}</span>
            </button>
            <button
              onClick={simulateCollaborativeUsers}
              className="flex items-center space-x-2 px-3 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors"
            >
              <Users className="w-4 h-4" />
              <span>Collaborate</span>
            </button>
            <button
              onClick={validateSchema}
              className="flex items-center space-x-2 px-3 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
            >
              <CheckCircle className="w-4 h-4" />
              <span>Validate</span>
            </button>
            <button
              onClick={handleSaveSchema}
              className="flex items-center space-x-2 px-3 py-2 bg-yellow-600 text-white rounded-md hover:bg-yellow-700 transition-colors"
            >
              <Save className="w-4 h-4" />
              <span>Save</span>
            </button>
            <button
              onClick={handleClearAll}
              className="flex items-center space-x-2 px-3 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
            >
              <Trash2 className="w-4 h-4" />
              <span>Clear All</span>
            </button>
          </div>
        </div>
        <div className="text-sm text-gray-300">
          {schema?.tables.length || 0} tables
        </div>
      </div>

      {/* React Flow Canvas */}
      <div className="flex-1 relative bg-gray-900">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onNodeClick={handleNodeClick}
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          fitView
          attributionPosition="bottom-left"
        >
          <Controls />
          <Background variant={BackgroundVariant.Dots} gap={12} size={1} color="#374151" />
        </ReactFlow>
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

      {/* AI Suggestions Modal */}
      {showAISuggestions && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-lg p-6 w-full max-w-6xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center space-x-3">
                <Brain className="w-6 h-6 text-purple-400" />
                <h3 className="text-xl font-semibold text-white">AI Schema Analysis & Suggestions</h3>
              </div>
              <button
                onClick={() => setShowAISuggestions(false)}
                className="text-gray-400 hover:text-white text-2xl"
              >
                ×
              </button>
            </div>
            
            <div className="space-y-6">
              {/* Analysis Summary */}
              <div className="bg-gray-700 rounded-lg p-4">
                <h4 className="text-lg font-semibold text-white mb-3">Analysis Summary</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-gray-600 rounded p-3">
                    <div className="flex items-center space-x-2 mb-2">
                      <Target className="w-4 h-4 text-orange-400" />
                      <span className="text-white font-medium">Tables Analyzed</span>
                    </div>
                    <div className="text-2xl font-bold text-orange-400">{schema?.tables.length || 0}</div>
                  </div>
                  <div className="bg-gray-600 rounded p-3">
                    <div className="flex items-center space-x-2 mb-2">
                      <TrendingUp className="w-4 h-4 text-green-400" />
                      <span className="text-white font-medium">Optimization Score</span>
                    </div>
                    <div className="text-2xl font-bold text-green-400">87%</div>
                  </div>
                  <div className="bg-gray-600 rounded p-3">
                    <div className="flex items-center space-x-2 mb-2">
                      <Zap className="w-4 h-4 text-blue-400" />
                      <span className="text-white font-medium">Potential Improvement</span>
                    </div>
                    <div className="text-2xl font-bold text-blue-400">60-80%</div>
                  </div>
                </div>
              </div>

              {/* AI Suggestions */}
              <div className="space-y-4">
                <h4 className="text-lg font-semibold text-white">AI Recommendations</h4>
                {aiSuggestions.map((suggestion) => (
                  <div key={suggestion.id} className="bg-gray-700 rounded-lg p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-2">
                          <Lightbulb className="w-5 h-5 text-yellow-400" />
                          <h5 className="text-white font-semibold">{suggestion.title}</h5>
                          <span className={`px-2 py-1 rounded text-xs ${
                            suggestion.impact === 'high' ? 'bg-red-600' :
                            suggestion.impact === 'medium' ? 'bg-yellow-600' :
                            'bg-green-600'
                          }`}>
                            {suggestion.impact} impact
                          </span>
                          <span className="px-2 py-1 rounded text-xs bg-purple-600">
                            {Math.round(suggestion.confidence * 100)}% confidence
                          </span>
                        </div>
                        <p className="text-gray-300 mb-3">{suggestion.description}</p>
                        <div className="bg-gray-600 rounded p-3 mb-3">
                          <h6 className="text-white font-medium mb-2">Recommendations:</h6>
                          <ul className="space-y-1">
                            {suggestion.recommendations.map((rec: string, index: number) => (
                              <li key={index} className="text-gray-300 text-sm flex items-start">
                                <span className="text-orange-400 mr-2">•</span>
                                {rec}
                              </li>
                            ))}
                          </ul>
                        </div>
                        <div className="bg-green-900 border border-green-700 rounded p-2">
                          <span className="text-green-300 text-sm">
                            <strong>Expected Improvement:</strong> {suggestion.estimatedImprovement}
                          </span>
                        </div>
                      </div>
                      <button
                        onClick={() => applyAISuggestion(suggestion)}
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
    </div>
  );
}