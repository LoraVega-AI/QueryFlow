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

import { DatabaseSchema, Table, Column, DataType, FlowNode, FlowEdge } from '@/types/database';
import { TableNode } from './nodes/TableNode';
import { RelationshipEdge } from './edges/RelationshipEdge';
import { TableEditor } from './TableEditor';
import { Plus, Save, Trash2 } from 'lucide-react';

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
      <div className="flex items-center justify-between p-4 bg-white border-b border-gray-200">
        <div className="flex items-center space-x-4">
          <h2 className="text-xl font-semibold text-gray-800">Schema Designer</h2>
          <div className="flex items-center space-x-2">
            <button
              onClick={handleAddTable}
              className="flex items-center space-x-2 px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>Add Table</span>
            </button>
            <button
              onClick={handleSaveSchema}
              className="flex items-center space-x-2 px-3 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
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
        <div className="text-sm text-gray-500">
          {schema?.tables.length || 0} tables
        </div>
      </div>

      {/* React Flow Canvas */}
      <div className="flex-1 relative">
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
          <Background variant={BackgroundVariant.Dots} gap={12} size={1} />
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
    </div>
  );
}
