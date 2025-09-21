// Session Manager for QueryFlow
// Handles session persistence and restoration across browser sessions

export interface SessionData {
  activeConnection?: {
    id: string;
    type: string;
    projectId?: string;
    projectName?: string;
    lastConnected: string;
  };
  recentProjects?: string[];
  userPreferences?: {
    theme?: string;
    defaultView?: string;
    autoConnect?: boolean;
  };
  lastActivity?: string;
}

export interface SessionManager {
  saveSession: (data: SessionData) => void;
  loadSession: () => SessionData | null;
  clearSession: () => void;
  updateLastActivity: () => void;
  getLastActivity: () => Date | null;
  isSessionValid: () => boolean;
}

class SessionManagerImpl implements SessionManager {
  private readonly SESSION_KEY = 'queryflow_session';
  private readonly MAX_SESSION_AGE = 7 * 24 * 60 * 60 * 1000; // 7 days in milliseconds

  saveSession(data: SessionData): void {
    try {
      const sessionData = {
        ...data,
        lastActivity: new Date().toISOString(),
        version: '1.0'
      };
      
      localStorage.setItem(this.SESSION_KEY, JSON.stringify(sessionData));
      console.log('Session saved successfully');
    } catch (error) {
      console.error('Failed to save session:', error);
    }
  }

  loadSession(): SessionData | null {
    try {
      const stored = localStorage.getItem(this.SESSION_KEY);
      if (!stored) {
        return null;
      }

      const sessionData = JSON.parse(stored);
      
      // Check if session is still valid
      if (!this.isSessionValid()) {
        console.log('Session expired, clearing...');
        this.clearSession();
        return null;
      }

      console.log('Session loaded successfully');
      return sessionData;
    } catch (error) {
      console.error('Failed to load session:', error);
      this.clearSession();
      return null;
    }
  }

  clearSession(): void {
    try {
      localStorage.removeItem(this.SESSION_KEY);
      console.log('Session cleared');
    } catch (error) {
      console.error('Failed to clear session:', error);
    }
  }

  updateLastActivity(): void {
    try {
      const session = this.loadSession();
      if (session) {
        session.lastActivity = new Date().toISOString();
        this.saveSession(session);
      }
    } catch (error) {
      console.error('Failed to update last activity:', error);
    }
  }

  getLastActivity(): Date | null {
    try {
      const session = this.loadSession();
      if (session?.lastActivity) {
        return new Date(session.lastActivity);
      }
    } catch (error) {
      console.error('Failed to get last activity:', error);
    }
    return null;
  }

  isSessionValid(): boolean {
    try {
      // Get session data directly from localStorage without calling loadSession
      // to avoid infinite recursion
      const stored = localStorage.getItem(this.SESSION_KEY);
      if (!stored) {
        return false;
      }

      const session = JSON.parse(stored);
      if (!session?.lastActivity) {
        return false;
      }

      const lastActivity = new Date(session.lastActivity);
      const now = new Date();
      const age = now.getTime() - lastActivity.getTime();

      return age < this.MAX_SESSION_AGE;
    } catch (error) {
      console.error('Failed to validate session:', error);
      return false;
    }
  }

  // Additional utility methods
  addRecentProject(projectId: string): void {
    try {
      const session = this.loadSession() || {};
      const recentProjects = session.recentProjects || [];
      
      // Remove if already exists
      const filtered = recentProjects.filter(id => id !== projectId);
      
      // Add to beginning
      filtered.unshift(projectId);
      
      // Keep only last 10 projects
      session.recentProjects = filtered.slice(0, 10);
      
      this.saveSession(session);
    } catch (error) {
      console.error('Failed to add recent project:', error);
    }
  }

  getRecentProjects(): string[] {
    try {
      const session = this.loadSession();
      return session?.recentProjects || [];
    } catch (error) {
      console.error('Failed to get recent projects:', error);
      return [];
    }
  }

  updateUserPreferences(preferences: Partial<SessionData['userPreferences']>): void {
    try {
      const session = this.loadSession() || {};
      session.userPreferences = {
        ...session.userPreferences,
        ...preferences
      };
      
      this.saveSession(session);
    } catch (error) {
      console.error('Failed to update user preferences:', error);
    }
  }

  getUserPreferences(): SessionData['userPreferences'] {
    try {
      const session = this.loadSession();
      return session?.userPreferences || {};
    } catch (error) {
      console.error('Failed to get user preferences:', error);
      return {};
    }
  }
}

// Create singleton instance
export const sessionManager = new SessionManagerImpl();

// Export factory function for testing
export const createSessionManager = (): SessionManager => {
  return new SessionManagerImpl();
};
