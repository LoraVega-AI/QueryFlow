// Hook for Session Management
// Provides easy access to session management functionality

import { useEffect, useCallback, useState } from 'react';
import { sessionManager, SessionData } from '../services/sessionManager';

export interface UseSessionManagerOptions {
  autoSave?: boolean;
  autoLoad?: boolean;
  onSessionLoaded?: (session: SessionData) => void;
  onSessionExpired?: () => void;
}

export function useSessionManager(options: UseSessionManagerOptions = {}) {
  const {
    autoSave = true,
    autoLoad = true,
    onSessionLoaded,
    onSessionExpired
  } = options;

  const [session, setSession] = useState<SessionData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Load session on mount
  useEffect(() => {
    if (autoLoad) {
      const loadedSession = sessionManager.loadSession();
      setSession(loadedSession);
      setIsLoading(false);
      
      if (loadedSession) {
        onSessionLoaded?.(loadedSession);
      } else {
        onSessionExpired?.();
      }
    } else {
      setIsLoading(false);
    }
  }, [autoLoad, onSessionLoaded, onSessionExpired]);

  // Save session when it changes
  useEffect(() => {
    if (autoSave && session) {
      sessionManager.saveSession(session);
    }
  }, [session, autoSave]);

  // Update last activity periodically
  useEffect(() => {
    const interval = setInterval(() => {
      sessionManager.updateLastActivity();
    }, 60000); // Update every minute

    return () => clearInterval(interval);
  }, []);

  const saveSession = useCallback((data: SessionData) => {
    setSession(data);
    sessionManager.saveSession(data);
  }, []);

  const loadSession = useCallback(() => {
    const loadedSession = sessionManager.loadSession();
    setSession(loadedSession);
    return loadedSession;
  }, []);

  const clearSession = useCallback(() => {
    setSession(null);
    sessionManager.clearSession();
  }, []);

  const addRecentProject = useCallback((projectId: string) => {
    sessionManager.addRecentProject(projectId);
    // Reload session to get updated recent projects
    loadSession();
  }, [loadSession]);

  const getRecentProjects = useCallback(() => {
    return sessionManager.getRecentProjects();
  }, []);

  const updateUserPreferences = useCallback((preferences: Partial<SessionData['userPreferences']>) => {
    sessionManager.updateUserPreferences(preferences);
    // Reload session to get updated preferences
    loadSession();
  }, [loadSession]);

  const getUserPreferences = useCallback(() => {
    return sessionManager.getUserPreferences();
  }, []);

  const isSessionValid = useCallback(() => {
    return sessionManager.isSessionValid();
  }, []);

  const getLastActivity = useCallback(() => {
    return sessionManager.getLastActivity();
  }, []);

  return {
    session,
    isLoading,
    saveSession,
    loadSession,
    clearSession,
    addRecentProject,
    getRecentProjects,
    updateUserPreferences,
    getUserPreferences,
    isSessionValid,
    getLastActivity
  };
}
