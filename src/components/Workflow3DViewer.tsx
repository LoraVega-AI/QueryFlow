'use client';

// 3D Workflow Viewer Component
// Provides interactive 3D visualization of workflows

import React, { useRef, useEffect, useState } from 'react';
import { WorkflowNode, WorkflowEdge } from '@/utils/visualWorkflowEngine';

interface Workflow3DViewerProps {
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
  onNodeSelect?: (nodeId: string) => void;
  onCameraChange?: (position: { x: number; y: number; z: number }) => void;
}

export function Workflow3DViewer({ 
  nodes, 
  edges, 
  onNodeSelect, 
  onCameraChange 
}: Workflow3DViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [cameraPosition, setCameraPosition] = useState({ x: 0, y: 0, z: 5 });

  useEffect(() => {
    if (onCameraChange) {
      onCameraChange(cameraPosition);
    }
  }, [cameraPosition, onCameraChange]);

  const handleNodeClick = (nodeId: string) => {
    setSelectedNode(nodeId);
    if (onNodeSelect) {
      onNodeSelect(nodeId);
    }
  };

  const getNodeColor = (nodeType: string) => {
    const colors = {
      'start': '#10B981',
      'end': '#EF4444',
      'action': '#3B82F6',
      'condition': '#F59E0B',
      'loop': '#8B5CF6',
      'parallel': '#F97316',
      'default': '#6B7280'
    };
    return colors[nodeType as keyof typeof colors] || colors.default;
  };

  const getNodeIcon = (nodeType: string) => {
    const icons = {
      'start': '▶️',
      'end': '⏹️',
      'action': '⚙️',
      'condition': '❓',
      'loop': '🔄',
      'parallel': '⚡',
      'default': '📦'
    };
    return icons[nodeType as keyof typeof icons] || icons.default;
  };

  return (
    <div className="w-full h-full bg-gray-900 rounded-lg overflow-hidden">
      <div className="p-4 border-b border-gray-700">
        <h3 className="text-lg font-semibold text-white mb-2">3D Workflow Visualization</h3>
        <div className="flex items-center space-x-4 text-sm text-gray-400">
          <span>Nodes: {nodes.length}</span>
          <span>Edges: {edges.length}</span>
          <span>Selected: {selectedNode || 'None'}</span>
        </div>
      </div>
      
      <div 
        ref={containerRef}
        className="w-full h-full relative overflow-hidden"
        style={{ height: 'calc(100% - 80px)' }}
      >
        {/* 3D Scene Container */}
        <div className="w-full h-full relative">
          {/* Background Grid */}
          <div className="absolute inset-0 opacity-20">
            <svg width="100%" height="100%" className="text-gray-600">
              <defs>
                <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                  <path d="M 40 0 L 0 0 0 40" fill="none" stroke="currentColor" strokeWidth="1"/>
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill="url(#grid)" />
            </svg>
          </div>

          {/* 3D Nodes */}
          <div className="absolute inset-0">
            {nodes.map((node, index) => {
              const angle = (index / nodes.length) * Math.PI * 2;
              const radius = 120;
              const x = Math.cos(angle) * radius + 200;
              const y = Math.sin(angle) * radius * 0.5 + 150;
              const isSelected = selectedNode === node.id;
              
              return (
                <div
                  key={node.id}
                  className="absolute transform -translate-x-1/2 -translate-y-1/2 cursor-pointer transition-all duration-300 hover:scale-110"
                  style={{
                    left: `${x}px`,
                    top: `${y}px`,
                    transform: `translate(-50%, -50%) ${isSelected ? 'scale(1.2)' : 'scale(1)'}`,
                    zIndex: isSelected ? 10 : 1
                  }}
                  onClick={() => handleNodeClick(node.id)}
                >
                  <div
                    className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold shadow-lg border-2 transition-all duration-300"
                    style={{
                      backgroundColor: getNodeColor(node.type),
                      borderColor: isSelected ? '#ffffff' : 'transparent',
                      boxShadow: isSelected ? '0 0 20px rgba(255,255,255,0.5)' : '0 4px 12px rgba(0,0,0,0.3)'
                    }}
                  >
                    <span className="text-lg">{getNodeIcon(node.type)}</span>
                  </div>
                  
                  {/* Node Label */}
                  <div className="absolute top-14 left-1/2 transform -translate-x-1/2 text-center">
                    <div className="bg-gray-800 text-white text-xs px-2 py-1 rounded shadow-lg whitespace-nowrap">
                      {node.data.label}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* 3D Edges */}
          <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ zIndex: 0 }}>
            {edges.map((edge, index) => {
              const sourceNode = nodes.find(n => n.id === edge.source);
              const targetNode = nodes.find(n => n.id === edge.target);
              
              if (!sourceNode || !targetNode) return null;
              
              const sourceIndex = nodes.findIndex(n => n.id === edge.source);
              const targetIndex = nodes.findIndex(n => n.id === edge.target);
              
              const sourceAngle = (sourceIndex / nodes.length) * Math.PI * 2;
              const targetAngle = (targetIndex / nodes.length) * Math.PI * 2;
              const radius = 120;
              
              const x1 = Math.cos(sourceAngle) * radius + 200;
              const y1 = Math.sin(sourceAngle) * radius * 0.5 + 150;
              const x2 = Math.cos(targetAngle) * radius + 200;
              const y2 = Math.sin(targetAngle) * radius * 0.5 + 150;
              
              const edgeColor = edge.type === 'conditional' ? '#00BCD4' : '#607D8B';
              
              return (
                <line
                  key={edge.id}
                  x1={x1}
                  y1={y1}
                  x2={x2}
                  y2={y2}
                  stroke={edgeColor}
                  strokeWidth="2"
                  opacity="0.7"
                />
              );
            })}
          </svg>

          {/* Camera Controls */}
          <div className="absolute bottom-4 right-4 flex flex-col space-y-2">
            <button
              onClick={() => setCameraPosition({ x: 0, y: 0, z: 5 })}
              className="bg-gray-800 text-white p-2 rounded hover:bg-gray-700 transition-colors"
              title="Reset View"
            >
              🔄
            </button>
            <button
              onClick={() => setCameraPosition({ x: cameraPosition.x + 1, y: cameraPosition.y, z: cameraPosition.z })}
              className="bg-gray-800 text-white p-2 rounded hover:bg-gray-700 transition-colors"
              title="Rotate Right"
            >
              ➡️
            </button>
            <button
              onClick={() => setCameraPosition({ x: cameraPosition.x - 1, y: cameraPosition.y, z: cameraPosition.z })}
              className="bg-gray-800 text-white p-2 rounded hover:bg-gray-700 transition-colors"
              title="Rotate Left"
            >
              ⬅️
            </button>
          </div>

          {/* Legend */}
          <div className="absolute top-4 left-4 bg-gray-800 bg-opacity-90 text-white p-3 rounded-lg">
            <h4 className="font-semibold mb-2">Node Types</h4>
            <div className="space-y-1 text-xs">
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#10B981' }}></div>
                <span>Start</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#EF4444' }}></div>
                <span>End</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#3B82F6' }}></div>
                <span>Action</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#F59E0B' }}></div>
                <span>Condition</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}