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
    } catch (error: any) {
      console.error('Workflow execution failed:', error);
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
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
