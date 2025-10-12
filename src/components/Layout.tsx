'use client';

// Main application layout component
// This component provides the overall structure and navigation for QueryFlow

import React, { useState, useEffect } from 'react';
import { Database, Code, Table, BarChart3, Settings, Menu, X, Workflow, Search, Download, Shield, Zap, Cloud, Users, Monitor, FolderOpen, Server, RefreshCw } from 'lucide-react';
import { PerformanceDashboard } from './PerformanceDashboard';
import { projectsManager } from '../utils/projectsManager';
import { Project } from '../types/project';

interface LayoutProps {
  children: React.ReactNode;
  activeTab: string;
  onTabChange: (tab: string) => void;
}

const TABS = [
  { id: 'projects', label: 'Projects', icon: FolderOpen },
  { id: 'designer', label: 'Schema Designer', icon: Database },
  { id: 'query', label: 'Query Runner', icon: Code },
  { id: 'data', label: 'Data Editor', icon: Table },
  { id: 'export', label: 'Export/Import', icon: Download },
  { id: 'validation', label: 'Data Validation', icon: Shield },
  { id: 'optimization', label: 'Query Optimization', icon: Zap },
  { id: 'cloud', label: 'Cloud Storage', icon: Cloud },
  { id: 'collaboration', label: 'Collaboration', icon: Users },
  { id: 'analytics', label: 'Analytics', icon: BarChart3 },
  { id: 'workflow', label: 'Workflow Manager', icon: Workflow },
  { id: 'search', label: 'Advanced Search', icon: Search },
] as const;

export function Layout({ children, activeTab, onTabChange }: LayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [currentProject, setCurrentProject] = useState<Project | null>(null);
  const [projectNotification, setProjectNotification] = useState<{
    type: 'success' | 'error' | 'info';
    message: string;
  } | null>(null);

  useEffect(() => {
    // Listen for project sync events
    const handleProjectSyncComplete = (data: any) => {
      setCurrentProject(data.project);
      setProjectNotification({
        type: 'success',
        message: `Project "${data.project.name}" synced successfully! All database operations now use this project's embedded databases.`
      });

      // Auto-hide notification after 5 seconds
      setTimeout(() => setProjectNotification(null), 5000);
    };

    const handleProjectDisconnected = () => {
      setCurrentProject(null);
      setProjectNotification({
        type: 'info',
        message: 'Disconnected from project. Using default database.'
      });
      setTimeout(() => setProjectNotification(null), 3000);
    };

    projectsManager.addEventListener('project_sync_complete', handleProjectSyncComplete);
    projectsManager.addEventListener('project_disconnected', handleProjectDisconnected);

    // Check for existing current project
    const existingProject = projectsManager.getCurrentProject();
    if (existingProject) {
      setCurrentProject(existingProject);
    }

    return () => {
      projectsManager.removeEventListener('project_sync_complete', handleProjectSyncComplete);
      projectsManager.removeEventListener('project_disconnected', handleProjectDisconnected);
    };
  }, []);

  return (
    <div className="flex h-screen bg-gray-900">
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        >
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm"></div>
        </div>
      )}

      {/* Sidebar */}
      <div
        className={`fixed inset-y-0 left-0 z-50 w-72 bg-gradient-to-b from-gray-800 to-gray-900 shadow-xl border-r border-gray-700 transform transition-all duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Sidebar Header */}
        <div className="flex items-center justify-between h-20 px-8 border-b border-gray-700">
          <div className="flex items-center space-x-6">
            <div className="w-14 h-14 bg-gradient-to-br from-orange-500 to-orange-600 rounded-2xl flex items-center justify-center shadow-xl border border-orange-400/20">
              <Database className="w-7 h-7 text-white" />
            </div>
            <div className="flex flex-col">
              <h1 className="text-3xl font-bold text-white tracking-tight">
                QueryFlow
              </h1>
              {currentProject && (
                <p className="text-sm text-gray-300 flex items-center font-medium mt-1">
                  <span className="mr-2 text-lg">{currentProject.icon}</span>
                  {currentProject.name}
                </p>
              )}
            </div>
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden p-3 text-gray-400 hover:text-white hover:bg-gray-700/50 rounded-xl transition-all duration-300"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="mt-8 px-4">
          <div className="space-y-2">
            {TABS.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              
              return (
                <button
                  key={tab.id}
                  onClick={() => {
                    onTabChange(tab.id);
                    setSidebarOpen(false);
                  }}
                  className={`w-full flex items-center space-x-4 px-4 py-4 text-base font-semibold rounded-2xl transition-all duration-300 group ${
                    isActive
                      ? 'bg-orange-600/20 text-orange-300 border border-orange-500/30'
                      : 'text-gray-300 hover:bg-gray-700/50 hover:text-white'
                  }`}
                >
                  <div className={`p-2 rounded-xl transition-all duration-300 ${
                    isActive 
                      ? 'bg-orange-600' 
                      : 'bg-gray-600/50 group-hover:bg-gray-500'
                  }`}>
                    <Icon className={`w-5 h-5 ${
                      isActive ? 'text-white' : 'text-gray-400 group-hover:text-white'
                    }`} />
                  </div>
                  <span className="flex-1 text-left">{tab.label}</span>
                  {isActive && (
                    <div className="w-2 h-2 bg-orange-400 rounded-full"></div>
                  )}
                </button>
              );
            })}
          </div>
        </nav>

        {/* Sidebar Footer */}
        <div className="absolute bottom-0 left-0 right-0 p-6 border-t border-gray-700">
          <div className="flex items-center space-x-4 text-gray-300 hover:text-white cursor-pointer group">
            <div className="p-3 bg-gray-600/50 group-hover:bg-gray-500 rounded-2xl transition-all duration-300">
              <Settings className="w-5 h-5" />
            </div>
            <span className="text-base font-semibold">Settings</span>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden lg:ml-0">
        {/* Top Bar */}
        <header className="bg-gray-800 shadow-lg border-b border-gray-700 lg:hidden">
          <div className="flex items-center justify-between h-20 px-6">
            <button
              onClick={() => setSidebarOpen(true)}
              className="p-3 text-gray-400 hover:text-white hover:bg-gray-700/50 rounded-xl transition-all duration-300"
            >
              <Menu className="w-6 h-6" />
            </button>
            <div className="flex items-center space-x-6">
              <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-orange-600 rounded-2xl flex items-center justify-center shadow-xl border border-orange-400/20">
                <Database className="w-6 h-6 text-white" />
              </div>
              <h1 className="text-3xl font-bold text-white tracking-tight">
                QueryFlow
              </h1>
            </div>
            <div className="w-10"></div> {/* Spacer for centering */}
          </div>
        </header>

        {/* Project Notification */}
        {projectNotification && (
          <div className={`px-4 py-3 border-b ${
            projectNotification.type === 'success' ? 'bg-green-900 border-green-700' :
            projectNotification.type === 'error' ? 'bg-red-900 border-red-700' :
            'bg-blue-900 border-blue-700'
          }`}>
            <div className="flex items-center space-x-3">
              <div className={`w-5 h-5 ${
                projectNotification.type === 'success' ? 'text-green-400' :
                projectNotification.type === 'error' ? 'text-red-400' :
                'text-blue-400'
              }`}>
                {projectNotification.type === 'success' ? '✓' :
                 projectNotification.type === 'error' ? '✕' :
                 'ℹ'}
              </div>
              <p className={`text-sm ${
                projectNotification.type === 'success' ? 'text-green-200' :
                projectNotification.type === 'error' ? 'text-red-200' :
                'text-blue-200'
              }`}>
                {projectNotification.message}
              </p>
              <button
                onClick={() => setProjectNotification(null)}
                className="ml-auto text-gray-400 hover:text-white"
              >
                ×
              </button>
            </div>
          </div>
        )}

        {/* Page Content */}
        <main className="flex-1 overflow-hidden">
          {children}
        </main>
      </div>
    </div>
  );
}