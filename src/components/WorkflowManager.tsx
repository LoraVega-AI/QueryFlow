'use client';

// Workflow Manager component for automation and workflow management
// This component provides workflow creation, execution, and monitoring capabilities

import React, { useState, useEffect, useCallback } from 'react';
import { Workflow, WorkflowExecution, WorkflowStep } from '@/types/database';
import { WorkflowAutomation } from '@/utils/workflowAutomation';
import { Play, Pause, Settings, Plus, Trash2, Eye, Clock, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';

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
