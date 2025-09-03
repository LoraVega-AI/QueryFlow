'use client';

// Workflow Manager component for automation and workflow management
// This component provides workflow creation, execution, and monitoring capabilities

import React, { useState, useEffect, useCallback } from 'react';
import { Workflow, WorkflowExecution, WorkflowStep } from '@/types/database';
import { WorkflowAutomation } from '@/utils/workflowAutomation';
import { Play, Pause, Settings, Plus, Trash2, Eye, Clock, CheckCircle, XCircle, AlertTriangle, Palette, GitBranch, Zap, Database, Globe, Mail, Timer, BarChart3, Layers, Workflow as WorkflowIcon, Save, Download, Upload, Maximize2, Minimize2, RotateCcw } from 'lucide-react';
import { visualWorkflowEngine, WorkflowNode, WorkflowEdge, WorkflowTemplate, WorkflowExecution as VisualExecution } from '@/utils/visualWorkflowEngine';

interface WorkflowManagerProps {
  schema: any;
}

export function WorkflowManager({ schema }: WorkflowManagerProps) {
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [executions, setExecutions] = useState<WorkflowExecution[]>([]);
  const [selectedWorkflow, setSelectedWorkflow] = useState<Workflow | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  
  // Visual workflow designer state
  const [showVisualDesigner, setShowVisualDesigner] = useState(false);
  const [visualNodes, setVisualNodes] = useState<WorkflowNode[]>([]);
  const [visualEdges, setVisualEdges] = useState<WorkflowEdge[]>([]);
  const [selectedNode, setSelectedNode] = useState<WorkflowNode | null>(null);
  const [selectedEdge, setSelectedEdge] = useState<WorkflowEdge | null>(null);
  const [isDesignerFullscreen, setIsDesignerFullscreen] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const [showNodePalette, setShowNodePalette] = useState(true);
  const [workflowValidation, setWorkflowValidation] = useState<{ isValid: boolean; errors: string[]; warnings: string[] } | null>(null);
  const [visualExecutions, setVisualExecutions] = useState<VisualExecution[]>([]);
  
  // Workflow creation form state
  const [newWorkflow, setNewWorkflow] = useState({
    name: '',
    description: '',
    trigger: 'manual' as 'schema_change' | 'data_change' | 'query_execution' | 'manual' | 'scheduled',
    steps: [] as any[]
  });
  const [currentStep, setCurrentStep] = useState({
    name: '',
    description: '',
    type: 'schema_validation' as 'schema_validation' | 'data_migration' | 'performance_check' | 'backup' | 'notification',
    config: {} as Record<string, any>
  });

  // Load workflows and executions
  const loadData = useCallback(() => {
    setWorkflows(WorkflowAutomation.getWorkflows());
    setExecutions(WorkflowAutomation.getExecutions());
  }, []);

  useEffect(() => {
    WorkflowAutomation.initialize();
    loadData();
  }, [loadData]);

  // Execute workflow
  const executeWorkflow = useCallback(async (workflowId: string) => {
    setIsLoading(true);
    try {
      const execution = await WorkflowAutomation.executeWorkflow(workflowId, { schema });
      setExecutions(prev => [execution, ...prev]);
      
      // Show execution result notification
      if (execution.status === 'completed') {
        setNotification({ type: 'success', message: `Workflow executed successfully in ${Math.round((execution.endTime!.getTime() - execution.startTime.getTime()) / 1000)}s` });
      } else if (execution.status === 'failed') {
        setNotification({ type: 'error', message: `Workflow execution failed: ${execution.error}` });
      }
      setTimeout(() => setNotification(null), 5000);
    } catch (error: any) {
      console.error('Workflow execution failed:', error);
      setNotification({ type: 'error', message: `Workflow execution failed: ${error.message}` });
      setTimeout(() => setNotification(null), 5000);
    } finally {
      setIsLoading(false);
    }
  }, [schema]);

  // Toggle workflow enabled state
  const toggleWorkflow = useCallback((workflowId: string) => {
    const workflow = workflows.find(w => w.id === workflowId);
    if (workflow) {
      WorkflowAutomation.updateWorkflow(workflowId, { enabled: !workflow.enabled });
      loadData();
    }
  }, [workflows, loadData]);

  // Delete workflow
  const deleteWorkflow = useCallback((workflowId: string) => {
    if (confirm('Are you sure you want to delete this workflow?')) {
      WorkflowAutomation.deleteWorkflow(workflowId);
      loadData();
    }
  }, [loadData]);

  // Create new workflow
  const createWorkflow = useCallback(() => {
    if (!newWorkflow.name.trim() || !newWorkflow.description.trim()) {
      setNotification({ type: 'error', message: 'Please fill in workflow name and description' });
      setTimeout(() => setNotification(null), 3000);
      return;
    }

    if (newWorkflow.steps.length === 0) {
      setNotification({ type: 'error', message: 'Please add at least one step to the workflow' });
      setTimeout(() => setNotification(null), 3000);
      return;
    }

    try {
      const workflow = WorkflowAutomation.createWorkflow({
        name: newWorkflow.name,
        description: newWorkflow.description,
        trigger: newWorkflow.trigger,
        enabled: true,
        steps: newWorkflow.steps.map((step, index) => ({
          id: `step-${Date.now()}-${index}`,
          type: step.type,
          name: step.name,
          description: step.description,
          config: step.config,
          enabled: true,
          order: index + 1
        }))
      });

      setWorkflows(prev => [workflow, ...prev]);
      setShowCreateForm(false);
      setNewWorkflow({ name: '', description: '', trigger: 'manual', steps: [] });
      setCurrentStep({ name: '', description: '', type: 'schema_validation', config: {} });
      
      setNotification({ type: 'success', message: `Workflow "${workflow.name}" created successfully` });
      setTimeout(() => setNotification(null), 3000);
    } catch (error: any) {
      setNotification({ type: 'error', message: `Failed to create workflow: ${error.message}` });
      setTimeout(() => setNotification(null), 5000);
    }
  }, [newWorkflow]);

  // Add step to workflow
  const addStep = useCallback(() => {
    if (!currentStep.name.trim() || !currentStep.description.trim()) {
      setNotification({ type: 'error', message: 'Please fill in step name and description' });
      setTimeout(() => setNotification(null), 3000);
      return;
    }

    const step = {
      ...currentStep,
      id: `step-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    };

    setNewWorkflow(prev => ({
      ...prev,
      steps: [...prev.steps, step]
    }));

    setCurrentStep({ name: '', description: '', type: 'schema_validation', config: {} });
    setNotification({ type: 'success', message: 'Step added to workflow' });
    setTimeout(() => setNotification(null), 2000);
  }, [currentStep]);

  // Remove step from workflow
  const removeStep = useCallback((stepIndex: number) => {
    setNewWorkflow(prev => ({
      ...prev,
      steps: prev.steps.filter((_, index) => index !== stepIndex)
    }));
  }, []);

  // Update step configuration based on type
  const updateStepConfig = useCallback((type: string) => {
    let config = {};
    
    switch (type) {
      case 'data_migration':
        config = {
          sourceTable: '',
          targetTable: '',
          migrationQuery: ''
        };
        break;
      case 'backup':
        config = {
          backupType: 'full',
          includeData: true
        };
        break;
      case 'notification':
        config = {
          message: '',
          type: 'info',
          recipients: ['admin']
        };
        break;
      default:
        config = {};
    }
    
    setCurrentStep(prev => ({ ...prev, config }));
  }, []);

  // Visual workflow designer functions
  const openVisualDesigner = useCallback(() => {
    setShowVisualDesigner(true);
    setVisualNodes([]);
    setVisualEdges([]);
    setSelectedNode(null);
    setSelectedEdge(null);
    setWorkflowValidation(null);
  }, []);

  const closeVisualDesigner = useCallback(() => {
    setShowVisualDesigner(false);
    setSelectedNode(null);
    setSelectedEdge(null);
    setWorkflowValidation(null);
  }, []);

  const addNode = useCallback((type: string, position: { x: number; y: number }) => {
    try {
      const node = visualWorkflowEngine.createNode(type, position);
      setVisualNodes(prev => [...prev, node]);
      validateWorkflow();
    } catch (error: any) {
      setNotification({ type: 'error', message: `Failed to add node: ${error.message}` });
      setTimeout(() => setNotification(null), 3000);
    }
  }, []);

  const updateNodePosition = useCallback((nodeId: string, position: { x: number; y: number }) => {
    visualWorkflowEngine.updateNodePosition(nodeId, position);
    setVisualNodes(prev => prev.map(node => 
      node.id === nodeId ? { ...node, position } : node
    ));
  }, []);

  const updateNodeData = useCallback((nodeId: string, data: any) => {
    visualWorkflowEngine.updateNodeData(nodeId, data);
    setVisualNodes(prev => prev.map(node => 
      node.id === nodeId ? { ...node, data: { ...node.data, ...data } } : node
    ));
    validateWorkflow();
  }, []);

  const deleteNode = useCallback((nodeId: string) => {
    visualWorkflowEngine.deleteNode(nodeId);
    setVisualNodes(prev => prev.filter(node => node.id !== nodeId));
    setVisualEdges(prev => prev.filter(edge => edge.source !== nodeId && edge.target !== nodeId));
    setSelectedNode(null);
    validateWorkflow();
  }, []);

  const addEdge = useCallback((source: string, target: string, type: string = 'default') => {
    try {
      const edge = visualWorkflowEngine.createEdge(source, target, type);
      setVisualEdges(prev => [...prev, edge]);
      validateWorkflow();
    } catch (error: any) {
      setNotification({ type: 'error', message: `Failed to add connection: ${error.message}` });
      setTimeout(() => setNotification(null), 3000);
    }
  }, []);

  const deleteEdge = useCallback((edgeId: string) => {
    visualWorkflowEngine.deleteEdge(edgeId);
    setVisualEdges(prev => prev.filter(edge => edge.id !== edgeId));
    setSelectedEdge(null);
    validateWorkflow();
  }, []);

  const validateWorkflow = useCallback(() => {
    const validation = visualWorkflowEngine.validateWorkflow();
    setWorkflowValidation(validation);
  }, []);

  const loadTemplate = useCallback((templateId: string) => {
    try {
      const { nodes, edges } = visualWorkflowEngine.loadTemplate(templateId);
      setVisualNodes(nodes);
      setVisualEdges(edges);
      validateWorkflow();
      setShowTemplates(false);
      setNotification({ type: 'success', message: 'Template loaded successfully' });
      setTimeout(() => setNotification(null), 3000);
    } catch (error: any) {
      setNotification({ type: 'error', message: `Failed to load template: ${error.message}` });
      setTimeout(() => setNotification(null), 3000);
    }
  }, []);

  const saveWorkflow = useCallback(() => {
    if (!workflowValidation?.isValid) {
      setNotification({ type: 'error', message: 'Please fix workflow errors before saving' });
      setTimeout(() => setNotification(null), 3000);
      return;
    }

    try {
      const workflowData = {
        name: `Visual Workflow ${Date.now()}`,
        description: 'Created with Visual Designer',
        trigger: 'manual' as const,
        enabled: true,
        steps: visualNodes.map((node, index) => ({
          id: node.id,
          type: 'schema_validation' as const, // Map visual node types to workflow step types
          name: node.data.label,
          description: node.data.description || '',
          config: node.data.config || {},
          enabled: true,
          order: index + 1
        }))
      };

      const workflow = WorkflowAutomation.createWorkflow(workflowData);
      setWorkflows(prev => [workflow, ...prev]);
      closeVisualDesigner();
      
      setNotification({ type: 'success', message: 'Visual workflow saved successfully' });
      setTimeout(() => setNotification(null), 3000);
    } catch (error: any) {
      setNotification({ type: 'error', message: `Failed to save workflow: ${error.message}` });
      setTimeout(() => setNotification(null), 3000);
    }
  }, [workflowValidation, visualNodes, closeVisualDesigner]);

  const executeVisualWorkflow = useCallback(async () => {
    if (!workflowValidation?.isValid) {
      setNotification({ type: 'error', message: 'Please fix workflow errors before executing' });
      setTimeout(() => setNotification(null), 3000);
      return;
    }

    setIsLoading(true);
    try {
      const execution = await visualWorkflowEngine.executeWorkflow('visual_workflow', {});
      setVisualExecutions(prev => [execution, ...prev]);
      
      setNotification({ type: 'success', message: 'Visual workflow executed successfully' });
      setTimeout(() => setNotification(null), 3000);
    } catch (error: any) {
      setNotification({ type: 'error', message: `Failed to execute workflow: ${error.message}` });
      setTimeout(() => setNotification(null), 3000);
    } finally {
      setIsLoading(false);
    }
  }, [workflowValidation]);

  const exportWorkflow = useCallback(() => {
    try {
      const workflowJson = visualWorkflowEngine.exportWorkflow();
      const blob = new Blob([workflowJson], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `workflow_${Date.now()}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      setNotification({ type: 'success', message: 'Workflow exported successfully' });
      setTimeout(() => setNotification(null), 3000);
    } catch (error: any) {
      setNotification({ type: 'error', message: `Failed to export workflow: ${error.message}` });
      setTimeout(() => setNotification(null), 3000);
    }
  }, []);

  const importWorkflow = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        visualWorkflowEngine.importWorkflow(content);
        const nodes = visualWorkflowEngine.getNodes();
        const edges = visualWorkflowEngine.getEdges();
        setVisualNodes(nodes);
        setVisualEdges(edges);
        validateWorkflow();
        
        setNotification({ type: 'success', message: 'Workflow imported successfully' });
        setTimeout(() => setNotification(null), 3000);
      } catch (error: any) {
        setNotification({ type: 'error', message: `Failed to import workflow: ${error.message}` });
        setTimeout(() => setNotification(null), 3000);
      }
    };
    reader.readAsText(file);
  }, [validateWorkflow]);

  return (
    <div className="flex flex-col h-full bg-gray-900">
      {/* Header */}
      <div className="flex items-center justify-between p-4 bg-gray-800 border-b border-gray-700">
        <div className="flex items-center space-x-4">
          <h2 className="text-xl font-semibold text-white">Workflow Manager</h2>
          <span className="text-sm text-gray-300">Automate database operations</span>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={openVisualDesigner}
            className="flex items-center space-x-2 px-3 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors"
          >
            <Palette className="w-4 h-4" />
            <span>Visual Designer</span>
          </button>
          <button
            onClick={() => setShowCreateForm(true)}
            className="flex items-center space-x-2 px-3 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Create Workflow</span>
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="space-y-6">
          {/* Workflows List */}
          <div className="bg-gray-800 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Active Workflows</h3>
            <div className="space-y-3">
              {workflows.map((workflow) => (
                <div key={workflow.id} className="bg-gray-700 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3">
                        <h4 className="text-white font-medium">{workflow.name}</h4>
                        <span className={`px-2 py-1 rounded text-xs ${
                          workflow.enabled ? 'bg-green-600 text-white' : 'bg-gray-600 text-white'
                        }`}>
                          {workflow.enabled ? 'Enabled' : 'Disabled'}
                        </span>
                        <span className="text-xs bg-orange-600 text-white px-2 py-1 rounded">
                          {workflow.trigger}
                        </span>
                      </div>
                      <p className="text-gray-300 text-sm mt-1">{workflow.description}</p>
                      <div className="flex items-center space-x-4 mt-2 text-sm text-gray-400">
                        <span>{workflow.steps.length} steps</span>
                        {workflow.lastRun && (
                          <span>Last run: {workflow.lastRun.toLocaleString()}</span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => executeWorkflow(workflow.id)}
                        disabled={isLoading}
                        className="p-2 text-green-400 hover:text-green-300 transition-colors"
                        title="Execute workflow"
                      >
                        <Play className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => toggleWorkflow(workflow.id)}
                        className="p-2 text-yellow-400 hover:text-yellow-300 transition-colors"
                        title={workflow.enabled ? 'Disable workflow' : 'Enable workflow'}
                      >
                        {workflow.enabled ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                      </button>
                      <button
                        onClick={() => setSelectedWorkflow(workflow)}
                        className="p-2 text-blue-400 hover:text-blue-300 transition-colors"
                        title="View details"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => deleteWorkflow(workflow.id)}
                        className="p-2 text-red-400 hover:text-red-300 transition-colors"
                        title="Delete workflow"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
              {workflows.length === 0 && (
                <div className="text-center py-8 text-gray-400">
                  No workflows created yet. Create your first workflow to get started.
                </div>
              )}
            </div>
          </div>

          {/* Recent Executions */}
          <div className="bg-gray-800 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Recent Executions</h3>
            <div className="space-y-2">
              {executions.slice(0, 10).map((execution) => (
                <div key={execution.id} className="bg-gray-700 rounded-lg p-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      {execution.status === 'completed' ? (
                        <CheckCircle className="w-4 h-4 text-green-400" />
                      ) : execution.status === 'failed' ? (
                        <XCircle className="w-4 h-4 text-red-400" />
                      ) : execution.status === 'running' ? (
                        <Clock className="w-4 h-4 text-yellow-400" />
                      ) : (
                        <AlertTriangle className="w-4 h-4 text-gray-400" />
                      )}
                      <div>
                        <span className="text-white font-medium">
                          {workflows.find(w => w.id === execution.workflowId)?.name || 'Unknown Workflow'}
                        </span>
                        <span className="text-gray-400 ml-2">
                          {execution.startTime.toLocaleString()}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className={`px-2 py-1 rounded text-xs ${
                        execution.status === 'completed' ? 'bg-green-600 text-white' :
                        execution.status === 'failed' ? 'bg-red-600 text-white' :
                        execution.status === 'running' ? 'bg-yellow-600 text-white' :
                        'bg-gray-600 text-white'
                      }`}>
                        {execution.status}
                      </span>
                      {execution.endTime && (
                        <span className="text-sm text-gray-400">
                          {Math.round((execution.endTime.getTime() - execution.startTime.getTime()) / 1000)}s
                        </span>
                      )}
                    </div>
                  </div>
                  {execution.error && (
                    <div className="mt-2 text-red-300 text-sm">
                      Error: {execution.error}
                    </div>
                  )}
                </div>
              ))}
              {executions.length === 0 && (
                <div className="text-center py-8 text-gray-400">
                  No workflow executions yet.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Workflow Details Modal */}
      {selectedWorkflow && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-lg p-6 w-full max-w-4xl max-h-[80vh] overflow-hidden">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-semibold text-white">{selectedWorkflow.name}</h3>
              <button
                onClick={() => setSelectedWorkflow(null)}
                className="text-gray-400 hover:text-white"
              >
                ×
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <h4 className="text-lg font-semibold text-white mb-2">Description</h4>
                <p className="text-gray-300">{selectedWorkflow.description}</p>
              </div>
              
              <div>
                <h4 className="text-lg font-semibold text-white mb-2">Workflow Steps</h4>
                <div className="space-y-2">
                  {selectedWorkflow.steps.map((step, index) => (
                    <div key={step.id} className="bg-gray-700 rounded-lg p-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="text-white font-medium">{index + 1}. {step.name}</span>
                          <span className="text-gray-400 ml-2">({step.type})</span>
                        </div>
                        <span className={`px-2 py-1 rounded text-xs ${
                          step.enabled ? 'bg-green-600 text-white' : 'bg-gray-600 text-white'
                        }`}>
                          {step.enabled ? 'Enabled' : 'Disabled'}
                        </span>
                      </div>
                      <p className="text-gray-300 text-sm mt-1">{step.description}</p>
                      {step.config && Object.keys(step.config).length > 0 && (
                        <div className="mt-2 text-xs text-gray-400">
                          <strong>Config:</strong> {JSON.stringify(step.config, null, 2)}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
              
              <div>
                <h4 className="text-lg font-semibold text-white mb-2">Recent Executions</h4>
                <div className="space-y-2">
                  {executions
                    .filter(exec => exec.workflowId === selectedWorkflow.id)
                    .slice(0, 5)
                    .map((execution) => (
                    <div key={execution.id} className="bg-gray-700 rounded-lg p-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          {execution.status === 'completed' ? (
                            <CheckCircle className="w-4 h-4 text-green-400" />
                          ) : execution.status === 'failed' ? (
                            <XCircle className="w-4 h-4 text-red-400" />
                          ) : execution.status === 'running' ? (
                            <Clock className="w-4 h-4 text-yellow-400" />
                          ) : (
                            <AlertTriangle className="w-4 h-4 text-gray-400" />
                          )}
                          <div>
                            <span className="text-white font-medium">
                              {execution.startTime.toLocaleString()}
                            </span>
                            {execution.endTime && (
                              <span className="text-gray-400 ml-2">
                                ({Math.round((execution.endTime.getTime() - execution.startTime.getTime()) / 1000)}s)
                              </span>
                            )}
                          </div>
                        </div>
                        <span className={`px-2 py-1 rounded text-xs ${
                          execution.status === 'completed' ? 'bg-green-600 text-white' :
                          execution.status === 'failed' ? 'bg-red-600 text-white' :
                          execution.status === 'running' ? 'bg-yellow-600 text-white' :
                          'bg-gray-600 text-white'
                        }`}>
                          {execution.status}
                        </span>
                      </div>
                      {execution.error && (
                        <div className="mt-2 text-red-300 text-sm">
                          Error: {execution.error}
                        </div>
                      )}
                    </div>
                  ))}
                  {executions.filter(exec => exec.workflowId === selectedWorkflow.id).length === 0 && (
                    <div className="text-center py-4 text-gray-400">
                      No executions yet for this workflow.
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Create Workflow Modal */}
      {showCreateForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-semibold text-white">Create New Workflow</h3>
              <button
                onClick={() => {
                  setShowCreateForm(false);
                  setNewWorkflow({ name: '', description: '', trigger: 'manual', steps: [] });
                  setCurrentStep({ name: '', description: '', type: 'schema_validation', config: {} });
                }}
                className="text-gray-400 hover:text-white text-2xl"
              >
                ×
              </button>
            </div>
            
            <div className="space-y-6">
              {/* Basic Workflow Information */}
              <div className="bg-gray-700 rounded-lg p-4">
                <h4 className="text-lg font-semibold text-white mb-4">Workflow Information</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Name</label>
                    <input
                      type="text"
                      value={newWorkflow.name}
                      onChange={(e) => setNewWorkflow(prev => ({ ...prev, name: e.target.value }))}
                      className="w-full px-3 py-2 bg-gray-600 border border-gray-500 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                      placeholder="Enter workflow name"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Trigger</label>
                    <select
                      value={newWorkflow.trigger}
                      onChange={(e) => setNewWorkflow(prev => ({ ...prev, trigger: e.target.value as any }))}
                      className="w-full px-3 py-2 bg-gray-600 border border-gray-500 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                    >
                      <option value="manual">Manual</option>
                      <option value="schema_change">Schema Change</option>
                      <option value="data_change">Data Change</option>
                      <option value="query_execution">Query Execution</option>
                      <option value="scheduled">Scheduled</option>
                    </select>
                  </div>
                </div>
                <div className="mt-4">
                  <label className="block text-sm font-medium text-gray-300 mb-2">Description</label>
                  <textarea
                    value={newWorkflow.description}
                    onChange={(e) => setNewWorkflow(prev => ({ ...prev, description: e.target.value }))}
                    className="w-full px-3 py-2 bg-gray-600 border border-gray-500 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                    rows={3}
                    placeholder="Describe what this workflow does"
                  />
                </div>
              </div>

              {/* Add Step Section */}
              <div className="bg-gray-700 rounded-lg p-4">
                <h4 className="text-lg font-semibold text-white mb-4">Add Workflow Step</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Step Name</label>
                    <input
                      type="text"
                      value={currentStep.name}
                      onChange={(e) => setCurrentStep(prev => ({ ...prev, name: e.target.value }))}
                      className="w-full px-3 py-2 bg-gray-600 border border-gray-500 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                      placeholder="Enter step name"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Step Type</label>
                    <select
                      value={currentStep.type}
                      onChange={(e) => {
                        setCurrentStep(prev => ({ ...prev, type: e.target.value as any }));
                        updateStepConfig(e.target.value);
                      }}
                      className="w-full px-3 py-2 bg-gray-600 border border-gray-500 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                    >
                      <option value="schema_validation">Schema Validation</option>
                      <option value="data_migration">Data Migration</option>
                      <option value="performance_check">Performance Check</option>
                      <option value="backup">Backup</option>
                      <option value="notification">Notification</option>
                    </select>
                  </div>
                </div>
                <div className="mt-4">
                  <label className="block text-sm font-medium text-gray-300 mb-2">Step Description</label>
                  <textarea
                    value={currentStep.description}
                    onChange={(e) => setCurrentStep(prev => ({ ...prev, description: e.target.value }))}
                    className="w-full px-3 py-2 bg-gray-600 border border-gray-500 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                    rows={2}
                    placeholder="Describe what this step does"
                  />
                </div>

                {/* Step Configuration */}
                {currentStep.type === 'data_migration' && (
                  <div className="mt-4 space-y-3">
                    <h5 className="text-md font-medium text-white">Migration Configuration</h5>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <input
                        type="text"
                        placeholder="Source Table"
                        value={currentStep.config.sourceTable || ''}
                        onChange={(e) => setCurrentStep(prev => ({ 
                          ...prev, 
                          config: { ...prev.config, sourceTable: e.target.value }
                        }))}
                        className="px-3 py-2 bg-gray-600 border border-gray-500 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                      />
                      <input
                        type="text"
                        placeholder="Target Table"
                        value={currentStep.config.targetTable || ''}
                        onChange={(e) => setCurrentStep(prev => ({ 
                          ...prev, 
                          config: { ...prev.config, targetTable: e.target.value }
                        }))}
                        className="px-3 py-2 bg-gray-600 border border-gray-500 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                      />
                    </div>
                    <textarea
                      placeholder="Migration Query (SQL)"
                      value={currentStep.config.migrationQuery || ''}
                      onChange={(e) => setCurrentStep(prev => ({ 
                        ...prev, 
                        config: { ...prev.config, migrationQuery: e.target.value }
                      }))}
                      className="w-full px-3 py-2 bg-gray-600 border border-gray-500 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                      rows={3}
                    />
                  </div>
                )}

                {currentStep.type === 'notification' && (
                  <div className="mt-4 space-y-3">
                    <h5 className="text-md font-medium text-white">Notification Configuration</h5>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <select
                        value={currentStep.config.type || 'info'}
                        onChange={(e) => setCurrentStep(prev => ({ 
                          ...prev, 
                          config: { ...prev.config, type: e.target.value }
                        }))}
                        className="px-3 py-2 bg-gray-600 border border-gray-500 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                      >
                        <option value="info">Info</option>
                        <option value="success">Success</option>
                        <option value="warning">Warning</option>
                        <option value="error">Error</option>
                      </select>
                      <input
                        type="text"
                        placeholder="Recipients (comma-separated)"
                        value={Array.isArray(currentStep.config.recipients) ? currentStep.config.recipients.join(', ') : ''}
                        onChange={(e) => setCurrentStep(prev => ({ 
                          ...prev, 
                          config: { ...prev.config, recipients: e.target.value.split(',').map(r => r.trim()) }
                        }))}
                        className="px-3 py-2 bg-gray-600 border border-gray-500 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                      />
                    </div>
                    <textarea
                      placeholder="Notification Message"
                      value={currentStep.config.message || ''}
                      onChange={(e) => setCurrentStep(prev => ({ 
                        ...prev, 
                        config: { ...prev.config, message: e.target.value }
                      }))}
                      className="w-full px-3 py-2 bg-gray-600 border border-gray-500 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                      rows={2}
                    />
                  </div>
                )}

                {currentStep.type === 'backup' && (
                  <div className="mt-4 space-y-3">
                    <h5 className="text-md font-medium text-white">Backup Configuration</h5>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <select
                        value={currentStep.config.backupType || 'full'}
                        onChange={(e) => setCurrentStep(prev => ({ 
                          ...prev, 
                          config: { ...prev.config, backupType: e.target.value }
                        }))}
                        className="px-3 py-2 bg-gray-600 border border-gray-500 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                      >
                        <option value="full">Full Backup</option>
                        <option value="incremental">Incremental Backup</option>
                        <option value="differential">Differential Backup</option>
                      </select>
                      <label className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          checked={currentStep.config.includeData !== false}
                          onChange={(e) => setCurrentStep(prev => ({ 
                            ...prev, 
                            config: { ...prev.config, includeData: e.target.checked }
                          }))}
                          className="rounded"
                        />
                        <span className="text-white">Include Data</span>
                      </label>
                    </div>
                  </div>
                )}

                <button
                  onClick={addStep}
                  className="mt-4 px-4 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700 transition-colors"
                >
                  Add Step
                </button>
              </div>

              {/* Workflow Steps Preview */}
              {newWorkflow.steps.length > 0 && (
                <div className="bg-gray-700 rounded-lg p-4">
                  <h4 className="text-lg font-semibold text-white mb-4">Workflow Steps ({newWorkflow.steps.length})</h4>
                  <div className="space-y-2">
                    {newWorkflow.steps.map((step, index) => (
                      <div key={step.id} className="bg-gray-600 rounded-lg p-3 flex items-center justify-between">
                        <div>
                          <span className="text-white font-medium">{index + 1}. {step.name}</span>
                          <span className="text-gray-400 ml-2">({step.type})</span>
                          <p className="text-gray-300 text-sm mt-1">{step.description}</p>
                        </div>
                        <button
                          onClick={() => removeStep(index)}
                          className="p-1 text-red-400 hover:text-red-300 transition-colors"
                          title="Remove step"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => {
                    setShowCreateForm(false);
                    setNewWorkflow({ name: '', description: '', trigger: 'manual', steps: [] });
                    setCurrentStep({ name: '', description: '', type: 'schema_validation', config: {} });
                  }}
                  className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={createWorkflow}
                  disabled={isLoading}
                  className="px-4 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700 disabled:bg-gray-600 disabled:cursor-not-allowed transition-colors"
                >
                  {isLoading ? 'Creating...' : 'Create Workflow'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Visual Workflow Designer Modal */}
      {showVisualDesigner && (
        <div className={`fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 ${isDesignerFullscreen ? 'p-0' : 'p-4'}`}>
          <div className={`bg-gray-900 rounded-lg shadow-xl ${isDesignerFullscreen ? 'w-full h-full rounded-none' : 'w-11/12 h-5/6'} flex flex-col`}>
            {/* Designer Header */}
            <div className="flex items-center justify-between p-4 bg-gray-800 border-b border-gray-700">
              <div className="flex items-center space-x-4">
                <h3 className="text-lg font-semibold text-white">Visual Workflow Designer</h3>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => setShowTemplates(!showTemplates)}
                    className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 transition-colors"
                  >
                    Templates
                  </button>
                  <button
                    onClick={() => setShowNodePalette(!showNodePalette)}
                    className="px-3 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700 transition-colors"
                  >
                    {showNodePalette ? 'Hide' : 'Show'} Palette
                  </button>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={exportWorkflow}
                  className="p-2 text-gray-400 hover:text-white transition-colors"
                  title="Export Workflow"
                >
                  <Download className="w-4 h-4" />
                </button>
                <input
                  type="file"
                  accept=".json"
                  onChange={importWorkflow}
                  className="hidden"
                  id="import-workflow"
                />
                <label
                  htmlFor="import-workflow"
                  className="p-2 text-gray-400 hover:text-white transition-colors cursor-pointer"
                  title="Import Workflow"
                >
                  <Upload className="w-4 h-4" />
                </label>
                <button
                  onClick={() => setIsDesignerFullscreen(!isDesignerFullscreen)}
                  className="p-2 text-gray-400 hover:text-white transition-colors"
                  title={isDesignerFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
                >
                  {isDesignerFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                </button>
                <button
                  onClick={closeVisualDesigner}
                  className="p-2 text-gray-400 hover:text-white transition-colors"
                >
                  <XCircle className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Designer Content */}
            <div className="flex-1 flex overflow-hidden">
              {/* Node Palette */}
              {showNodePalette && (
                <div className="w-64 bg-gray-800 border-r border-gray-700 overflow-y-auto">
                  <div className="p-4">
                    <h4 className="text-white font-medium mb-3">Node Types</h4>
                    <div className="space-y-2">
                      {Array.from(visualWorkflowEngine.getNodeTypes().entries()).map(([type, nodeType]) => (
                        <div
                          key={type}
                          className="p-3 bg-gray-700 rounded cursor-pointer hover:bg-gray-600 transition-colors"
                          onClick={() => addNode(type, { x: 200, y: 200 })}
                          title={nodeType.description}
                        >
                          <div className="flex items-center space-x-2">
                            <span className="text-lg">{nodeType.icon}</span>
                            <div>
                              <div className="text-white text-sm font-medium">{nodeType.label}</div>
                              <div className="text-gray-400 text-xs">{nodeType.description}</div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Canvas Area */}
              <div className="flex-1 relative bg-gray-900 overflow-hidden">
                {/* Canvas */}
                <div className="w-full h-full relative">
                  {visualNodes.length === 0 ? (
                    <div className="flex items-center justify-center h-full">
                      <div className="text-center">
                        <Palette className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                        <h4 className="text-lg font-medium text-white mb-2">Start Building Your Workflow</h4>
                        <p className="text-gray-400 mb-4">Drag nodes from the palette or use templates to get started</p>
                        <button
                          onClick={() => setShowTemplates(true)}
                          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                        >
                          Browse Templates
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="w-full h-full relative">
                      {/* Render Nodes */}
                      {visualNodes.map((node) => (
                        <div
                          key={node.id}
                          className={`absolute cursor-move p-3 rounded-lg border-2 min-w-32 ${
                            selectedNode?.id === node.id ? 'border-orange-500' : 'border-gray-600'
                          }`}
                          style={{
                            left: node.position.x,
                            top: node.position.y,
                            backgroundColor: node.style?.backgroundColor || '#374151',
                            color: node.style?.color || '#FFFFFF'
                          }}
                          onClick={() => setSelectedNode(node)}
                          onMouseDown={(e) => {
                            e.preventDefault();
                            const startX = e.clientX - node.position.x;
                            const startY = e.clientY - node.position.y;
                            
                            const handleMouseMove = (e: MouseEvent) => {
                              updateNodePosition(node.id, {
                                x: e.clientX - startX,
                                y: e.clientY - startY
                              });
                            };
                            
                            const handleMouseUp = () => {
                              document.removeEventListener('mousemove', handleMouseMove);
                              document.removeEventListener('mouseup', handleMouseUp);
                            };
                            
                            document.addEventListener('mousemove', handleMouseMove);
                            document.addEventListener('mouseup', handleMouseUp);
                          }}
                        >
                          <div className="text-center">
                            <div className="text-sm font-medium">{node.data.label}</div>
                            {node.data.description && (
                              <div className="text-xs opacity-75 mt-1">{node.data.description}</div>
                            )}
                          </div>
                        </div>
                      ))}

                      {/* Render Edges */}
                      <svg className="absolute inset-0 w-full h-full pointer-events-none">
                        {visualEdges.map((edge) => {
                          const sourceNode = visualNodes.find(n => n.id === edge.source);
                          const targetNode = visualNodes.find(n => n.id === edge.target);
                          
                          if (!sourceNode || !targetNode) return null;
                          
                          const x1 = sourceNode.position.x + 64; // Center of node
                          const y1 = sourceNode.position.y + 32;
                          const x2 = targetNode.position.x + 64;
                          const y2 = targetNode.position.y + 32;
                          
                          return (
                            <line
                              key={edge.id}
                              x1={x1}
                              y1={y1}
                              x2={x2}
                              y2={y2}
                              stroke={edge.style?.stroke || '#94A3B8'}
                              strokeWidth={edge.style?.strokeWidth || 2}
                              strokeDasharray={edge.style?.strokeDasharray}
                              className={edge.animated ? 'animate-pulse' : ''}
                            />
                          );
                        })}
                      </svg>
                    </div>
                  )}
                </div>

                {/* Validation Panel */}
                {workflowValidation && (
                  <div className="absolute top-4 right-4 bg-gray-800 rounded-lg p-4 max-w-sm">
                    <h5 className="text-white font-medium mb-2">Workflow Validation</h5>
                    {workflowValidation.errors.length > 0 && (
                      <div className="mb-2">
                        <div className="text-red-400 text-sm font-medium">Errors:</div>
                        {workflowValidation.errors.map((error, index) => (
                          <div key={index} className="text-red-300 text-xs ml-2">• {error}</div>
                        ))}
                      </div>
                    )}
                    {workflowValidation.warnings.length > 0 && (
                      <div>
                        <div className="text-yellow-400 text-sm font-medium">Warnings:</div>
                        {workflowValidation.warnings.map((warning, index) => (
                          <div key={index} className="text-yellow-300 text-xs ml-2">• {warning}</div>
                        ))}
                      </div>
                    )}
                    {workflowValidation.isValid && workflowValidation.errors.length === 0 && (
                      <div className="text-green-400 text-sm">✓ Workflow is valid</div>
                    )}
                  </div>
                )}
              </div>

              {/* Properties Panel */}
              {selectedNode && (
                <div className="w-80 bg-gray-800 border-l border-gray-700 overflow-y-auto">
                  <div className="p-4">
                    <h4 className="text-white font-medium mb-4">Node Properties</h4>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-1">Label</label>
                        <input
                          type="text"
                          value={selectedNode.data.label}
                          onChange={(e) => updateNodeData(selectedNode.id, { label: e.target.value })}
                          className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-1">Description</label>
                        <textarea
                          value={selectedNode.data.description || ''}
                          onChange={(e) => updateNodeData(selectedNode.id, { description: e.target.value })}
                          className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                          rows={3}
                        />
                      </div>
                      <div className="flex space-x-2">
                        <button
                          onClick={() => deleteNode(selectedNode.id)}
                          className="flex-1 px-3 py-2 bg-red-600 text-white rounded text-sm hover:bg-red-700 transition-colors"
                        >
                          Delete Node
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Designer Footer */}
            <div className="flex items-center justify-between p-4 bg-gray-800 border-t border-gray-700">
              <div className="flex items-center space-x-4">
                <div className="text-sm text-gray-300">
                  Nodes: {visualNodes.length} | Connections: {visualEdges.length}
                </div>
                {workflowValidation && (
                  <div className={`text-sm ${workflowValidation.isValid ? 'text-green-400' : 'text-red-400'}`}>
                    {workflowValidation.isValid ? '✓ Valid' : '✗ Invalid'}
                  </div>
                )}
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={executeVisualWorkflow}
                  disabled={!workflowValidation?.isValid || isLoading}
                  className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed transition-colors flex items-center space-x-2"
                >
                  <Play className="w-4 h-4" />
                  <span>{isLoading ? 'Executing...' : 'Execute'}</span>
                </button>
                <button
                  onClick={saveWorkflow}
                  disabled={!workflowValidation?.isValid}
                  className="px-4 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700 disabled:bg-gray-600 disabled:cursor-not-allowed transition-colors flex items-center space-x-2"
                >
                  <Save className="w-4 h-4" />
                  <span>Save Workflow</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Templates Modal */}
      {showTemplates && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-60">
          <div className="bg-gray-900 rounded-lg shadow-xl w-4/5 h-4/5 flex flex-col">
            <div className="flex items-center justify-between p-4 bg-gray-800 border-b border-gray-700">
              <h3 className="text-lg font-semibold text-white">Workflow Templates</h3>
              <button
                onClick={() => setShowTemplates(false)}
                className="p-2 text-gray-400 hover:text-white transition-colors"
              >
                <XCircle className="w-4 h-4" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {visualWorkflowEngine.getTemplates().map((template) => (
                  <div key={template.id} className="bg-gray-800 rounded-lg p-4 border border-gray-700">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="text-white font-medium">{template.name}</h4>
                      <span className={`px-2 py-1 rounded text-xs ${
                        template.complexity === 'simple' ? 'bg-green-600' :
                        template.complexity === 'medium' ? 'bg-yellow-600' :
                        'bg-red-600'
                      } text-white`}>
                        {template.complexity}
                      </span>
                    </div>
                    <p className="text-gray-300 text-sm mb-3">{template.description}</p>
                    <div className="flex items-center justify-between text-xs text-gray-400 mb-4">
                      <span>{template.nodes.length} nodes</span>
                      <span>~{template.estimatedTime} min</span>
                    </div>
                    <div className="flex flex-wrap gap-1 mb-4">
                      {template.tags.map((tag) => (
                        <span key={tag} className="px-2 py-1 bg-gray-700 text-gray-300 rounded text-xs">
                          {tag}
                        </span>
                      ))}
                    </div>
                    <button
                      onClick={() => loadTemplate(template.id)}
                      className="w-full px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                    >
                      Use Template
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Notification */}
      {notification && (
        <div className={`fixed top-4 right-4 z-50 px-6 py-3 rounded-md shadow-lg ${
          notification.type === 'success' ? 'bg-green-600 text-white' : 'bg-red-600 text-white'
        }`}>
          {notification.message}
        </div>
      )}
    </div>
  );
}
