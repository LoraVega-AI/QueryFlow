// Theme Manager for Advanced Search Platform
// Handles dark/light theme switching and customizable UI elements

export interface ThemeConfig {
  name: string;
  type: 'light' | 'dark' | 'auto';
  colors: {
    primary: string;
    secondary: string;
    background: string;
    surface: string;
    text: string;
    textSecondary: string;
    border: string;
    accent: string;
    success: string;
    warning: string;
    error: string;
    info: string;
  };
  typography: {
    fontFamily: string;
    fontSize: {
      xs: string;
      sm: string;
      base: string;
      lg: string;
      xl: string;
      '2xl': string;
      '3xl': string;
    };
    fontWeight: {
      normal: number;
      medium: number;
      semibold: number;
      bold: number;
    };
  };
  spacing: {
    xs: string;
    sm: string;
    md: string;
    lg: string;
    xl: string;
    '2xl': string;
  };
  borderRadius: {
    sm: string;
    md: string;
    lg: string;
    xl: string;
  };
  shadows: {
    sm: string;
    md: string;
    lg: string;
    xl: string;
  };
}

export interface UserPreferences {
  theme: ThemeConfig;
  layout: {
    sidebarCollapsed: boolean;
    dashboardLayout: 'grid' | 'list' | 'compact';
    resultViewMode: 'list' | 'grid' | 'timeline' | 'map';
    itemsPerPage: number;
  };
  search: {
    autoComplete: boolean;
    searchSuggestions: boolean;
    resultPreview: boolean;
    keyboardShortcuts: boolean;
  };
  notifications: {
    enabled: boolean;
    sound: boolean;
    desktop: boolean;
    email: boolean;
  };
  accessibility: {
    highContrast: boolean;
    reducedMotion: boolean;
    fontSize: 'small' | 'medium' | 'large';
    screenReader: boolean;
  };
}

export class ThemeManager {
  private static instance: ThemeManager;
  private currentTheme: ThemeConfig = {
    name: 'default',
    type: 'light',
    colors: {
      primary: '#3b82f6',
      secondary: '#64748b',
      background: '#ffffff',
      surface: '#f8fafc',
      text: '#1e293b',
      textSecondary: '#64748b',
      border: '#e2e8f0',
      accent: '#8b5cf6',
      success: '#10b981',
      warning: '#f59e0b',
      error: '#ef4444',
      info: '#06b6d4'
    },
    typography: {
      fontFamily: 'Inter, system-ui, sans-serif',
      fontSize: {
        xs: '0.75rem',
        sm: '0.875rem',
        base: '1rem',
        lg: '1.125rem',
        xl: '1.25rem',
        '2xl': '1.5rem',
        '3xl': '1.875rem'
      },
      fontWeight: {
        normal: 400,
        medium: 500,
        semibold: 600,
        bold: 700
      }
    },
    spacing: {
      xs: '0.25rem',
      sm: '0.5rem',
      md: '1rem',
      lg: '1.5rem',
      xl: '2rem',
      '2xl': '3rem'
    },
    borderRadius: {
      sm: '0.25rem',
      md: '0.5rem',
      lg: '0.75rem',
      xl: '1rem'
    },
    shadows: {
      sm: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
      md: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
      lg: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
      xl: '0 20px 25px -5px rgb(0 0 0 / 0.1)'
    }
  };
  private userPreferences: UserPreferences = {
    theme: this.currentTheme,
    layout: {
      sidebarCollapsed: false,
      dashboardLayout: 'grid',
      resultViewMode: 'list',
      itemsPerPage: 20
    },
    search: {
      autoComplete: true,
      searchSuggestions: true,
      resultPreview: true,
      keyboardShortcuts: true
    },
    notifications: {
      enabled: true,
      sound: false,
      desktop: true,
      email: false
    },
    accessibility: {
      highContrast: false,
      reducedMotion: false,
      fontSize: 'medium',
      screenReader: false
    }
  };
  private themeChangeListeners: Array<(theme: ThemeConfig) => void> = [];
  private preferencesChangeListeners: Array<(preferences: UserPreferences) => void> = [];

  private constructor() {
    this.initializeThemes();
    this.loadUserPreferences();
    this.applyTheme();
  }

  static getInstance(): ThemeManager {
    if (!ThemeManager.instance) {
      ThemeManager.instance = new ThemeManager();
    }
    return ThemeManager.instance;
  }

  private initializeThemes(): void {
    // Default dark theme
    this.currentTheme = {
      name: 'Dark',
      type: 'dark',
      colors: {
        primary: '#3b82f6',
        secondary: '#64748b',
        background: '#0f172a',
        surface: '#1e293b',
        text: '#f8fafc',
        textSecondary: '#cbd5e1',
        border: '#334155',
        accent: '#f59e0b',
        success: '#10b981',
        warning: '#f59e0b',
        error: '#ef4444',
        info: '#3b82f6'
      },
      typography: {
        fontFamily: 'Inter, system-ui, sans-serif',
        fontSize: {
          xs: '0.75rem',
          sm: '0.875rem',
          base: '1rem',
          lg: '1.125rem',
          xl: '1.25rem',
          '2xl': '1.5rem',
          '3xl': '1.875rem'
        },
        fontWeight: {
          normal: 400,
          medium: 500,
          semibold: 600,
          bold: 700
        }
      },
      spacing: {
        xs: '0.25rem',
        sm: '0.5rem',
        md: '1rem',
        lg: '1.5rem',
        xl: '2rem',
        '2xl': '3rem'
      },
      borderRadius: {
        sm: '0.25rem',
        md: '0.5rem',
        lg: '0.75rem',
        xl: '1rem'
      },
      shadows: {
        sm: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
        md: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
        lg: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
        xl: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)'
      }
    };
  }

  private loadUserPreferences(): void {
    try {
      const saved = localStorage.getItem('searchUserPreferences');
      if (saved) {
        this.userPreferences = JSON.parse(saved);
      } else {
        this.userPreferences = this.getDefaultPreferences();
      }
    } catch (error) {
      console.error('Failed to load user preferences:', error);
      this.userPreferences = this.getDefaultPreferences();
    }
  }

  private getDefaultPreferences(): UserPreferences {
    return {
      theme: this.currentTheme,
      layout: {
        sidebarCollapsed: false,
        dashboardLayout: 'grid',
        resultViewMode: 'list',
        itemsPerPage: 20
      },
      search: {
        autoComplete: true,
        searchSuggestions: true,
        resultPreview: true,
        keyboardShortcuts: true
      },
      notifications: {
        enabled: true,
        sound: false,
        desktop: false,
        email: false
      },
      accessibility: {
        highContrast: false,
        reducedMotion: false,
        fontSize: 'medium',
        screenReader: false
      }
    };
  }

  private applyTheme(): void {
    const root = document.documentElement;
    const theme = this.userPreferences.theme;

    // Apply CSS custom properties
    root.style.setProperty('--color-primary', theme.colors.primary);
    root.style.setProperty('--color-secondary', theme.colors.secondary);
    root.style.setProperty('--color-background', theme.colors.background);
    root.style.setProperty('--color-surface', theme.colors.surface);
    root.style.setProperty('--color-text', theme.colors.text);
    root.style.setProperty('--color-text-secondary', theme.colors.textSecondary);
    root.style.setProperty('--color-border', theme.colors.border);
    root.style.setProperty('--color-accent', theme.colors.accent);
    root.style.setProperty('--color-success', theme.colors.success);
    root.style.setProperty('--color-warning', theme.colors.warning);
    root.style.setProperty('--color-error', theme.colors.error);
    root.style.setProperty('--color-info', theme.colors.info);

    // Apply typography
    root.style.setProperty('--font-family', theme.typography.fontFamily);
    root.style.setProperty('--font-size-xs', theme.typography.fontSize.xs);
    root.style.setProperty('--font-size-sm', theme.typography.fontSize.sm);
    root.style.setProperty('--font-size-base', theme.typography.fontSize.base);
    root.style.setProperty('--font-size-lg', theme.typography.fontSize.lg);
    root.style.setProperty('--font-size-xl', theme.typography.fontSize.xl);
    root.style.setProperty('--font-size-2xl', theme.typography.fontSize['2xl']);
    root.style.setProperty('--font-size-3xl', theme.typography.fontSize['3xl']);

    // Apply spacing
    root.style.setProperty('--spacing-xs', theme.spacing.xs);
    root.style.setProperty('--spacing-sm', theme.spacing.sm);
    root.style.setProperty('--spacing-md', theme.spacing.md);
    root.style.setProperty('--spacing-lg', theme.spacing.lg);
    root.style.setProperty('--spacing-xl', theme.spacing.xl);
    root.style.setProperty('--spacing-2xl', theme.spacing['2xl']);

    // Apply border radius
    root.style.setProperty('--border-radius-sm', theme.borderRadius.sm);
    root.style.setProperty('--border-radius-md', theme.borderRadius.md);
    root.style.setProperty('--border-radius-lg', theme.borderRadius.lg);
    root.style.setProperty('--border-radius-xl', theme.borderRadius.xl);

    // Apply shadows
    root.style.setProperty('--shadow-sm', theme.shadows.sm);
    root.style.setProperty('--shadow-md', theme.shadows.md);
    root.style.setProperty('--shadow-lg', theme.shadows.lg);
    root.style.setProperty('--shadow-xl', theme.shadows.xl);

    // Apply accessibility settings
    if (this.userPreferences.accessibility.highContrast) {
      root.classList.add('high-contrast');
    } else {
      root.classList.remove('high-contrast');
    }

    if (this.userPreferences.accessibility.reducedMotion) {
      root.classList.add('reduced-motion');
    } else {
      root.classList.remove('reduced-motion');
    }

    // Apply font size
    root.classList.remove('font-small', 'font-medium', 'font-large');
    root.classList.add(`font-${this.userPreferences.accessibility.fontSize}`);
  }

  // Theme management
  setTheme(theme: ThemeConfig): void {
    this.currentTheme = theme;
    this.userPreferences.theme = theme;
    this.applyTheme();
    this.saveUserPreferences();
    this.notifyThemeChange();
  }

  getAvailableThemes(): ThemeConfig[] {
    return [
      {
        name: 'Dark',
        type: 'dark',
        colors: {
          primary: '#3b82f6',
          secondary: '#64748b',
          background: '#0f172a',
          surface: '#1e293b',
          text: '#f8fafc',
          textSecondary: '#cbd5e1',
          border: '#334155',
          accent: '#f59e0b',
          success: '#10b981',
          warning: '#f59e0b',
          error: '#ef4444',
          info: '#3b82f6'
        },
        typography: {
          fontFamily: 'Inter, system-ui, sans-serif',
          fontSize: {
            xs: '0.75rem',
            sm: '0.875rem',
            base: '1rem',
            lg: '1.125rem',
            xl: '1.25rem',
            '2xl': '1.5rem',
            '3xl': '1.875rem'
          },
          fontWeight: {
            normal: 400,
            medium: 500,
            semibold: 600,
            bold: 700
          }
        },
        spacing: {
          xs: '0.25rem',
          sm: '0.5rem',
          md: '1rem',
          lg: '1.5rem',
          xl: '2rem',
          '2xl': '3rem'
        },
        borderRadius: {
          sm: '0.25rem',
          md: '0.5rem',
          lg: '0.75rem',
          xl: '1rem'
        },
        shadows: {
          sm: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
          md: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
          lg: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
          xl: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)'
        }
      },
      {
        name: 'Light',
        type: 'light',
        colors: {
          primary: '#2563eb',
          secondary: '#64748b',
          background: '#ffffff',
          surface: '#f8fafc',
          text: '#1e293b',
          textSecondary: '#64748b',
          border: '#e2e8f0',
          accent: '#d97706',
          success: '#059669',
          warning: '#d97706',
          error: '#dc2626',
          info: '#2563eb'
        },
        typography: {
          fontFamily: 'Inter, system-ui, sans-serif',
          fontSize: {
            xs: '0.75rem',
            sm: '0.875rem',
            base: '1rem',
            lg: '1.125rem',
            xl: '1.25rem',
            '2xl': '1.5rem',
            '3xl': '1.875rem'
          },
          fontWeight: {
            normal: 400,
            medium: 500,
            semibold: 600,
            bold: 700
          }
        },
        spacing: {
          xs: '0.25rem',
          sm: '0.5rem',
          md: '1rem',
          lg: '1.5rem',
          xl: '2rem',
          '2xl': '3rem'
        },
        borderRadius: {
          sm: '0.25rem',
          md: '0.5rem',
          lg: '0.75rem',
          xl: '1rem'
        },
        shadows: {
          sm: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
          md: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
          lg: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
          xl: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)'
        }
      },
      {
        name: 'High Contrast',
        type: 'dark',
        colors: {
          primary: '#ffffff',
          secondary: '#ffffff',
          background: '#000000',
          surface: '#1a1a1a',
          text: '#ffffff',
          textSecondary: '#ffffff',
          border: '#ffffff',
          accent: '#ffff00',
          success: '#00ff00',
          warning: '#ffff00',
          error: '#ff0000',
          info: '#00ffff'
        },
        typography: {
          fontFamily: 'Inter, system-ui, sans-serif',
          fontSize: {
            xs: '0.75rem',
            sm: '0.875rem',
            base: '1rem',
            lg: '1.125rem',
            xl: '1.25rem',
            '2xl': '1.5rem',
            '3xl': '1.875rem'
          },
          fontWeight: {
            normal: 400,
            medium: 500,
            semibold: 600,
            bold: 700
          }
        },
        spacing: {
          xs: '0.25rem',
          sm: '0.5rem',
          md: '1rem',
          lg: '1.5rem',
          xl: '2rem',
          '2xl': '3rem'
        },
        borderRadius: {
          sm: '0.25rem',
          md: '0.5rem',
          lg: '0.75rem',
          xl: '1rem'
        },
        shadows: {
          sm: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
          md: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
          lg: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
          xl: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)'
        }
      }
    ];
  }

  getCurrentTheme(): ThemeConfig {
    return { ...this.currentTheme };
  }

  // User preferences management
  updateUserPreferences(preferences: Partial<UserPreferences>): void {
    this.userPreferences = { ...this.userPreferences, ...preferences };
    this.applyTheme();
    this.saveUserPreferences();
    this.notifyPreferencesChange();
  }

  getUserPreferences(): UserPreferences {
    return { ...this.userPreferences };
  }

  private saveUserPreferences(): void {
    try {
      localStorage.setItem('searchUserPreferences', JSON.stringify(this.userPreferences));
    } catch (error) {
      console.error('Failed to save user preferences:', error);
    }
  }

  // Event listeners
  onThemeChange(callback: (theme: ThemeConfig) => void): void {
    this.themeChangeListeners.push(callback);
  }

  onPreferencesChange(callback: (preferences: UserPreferences) => void): void {
    this.preferencesChangeListeners.push(callback);
  }

  private notifyThemeChange(): void {
    this.themeChangeListeners.forEach(callback => callback(this.currentTheme));
  }

  private notifyPreferencesChange(): void {
    this.preferencesChangeListeners.forEach(callback => callback(this.userPreferences));
  }

  // Utility methods
  toggleTheme(): void {
    const availableThemes = this.getAvailableThemes();
    const currentIndex = availableThemes.findIndex(theme => theme.name === this.currentTheme.name);
    const nextIndex = (currentIndex + 1) % availableThemes.length;
    this.setTheme(availableThemes[nextIndex]);
  }

  resetToDefaults(): void {
    this.userPreferences = this.getDefaultPreferences();
    this.currentTheme = this.userPreferences.theme;
    this.applyTheme();
    this.saveUserPreferences();
    this.notifyThemeChange();
    this.notifyPreferencesChange();
  }

  // Export/Import preferences
  exportPreferences(): string {
    return JSON.stringify(this.userPreferences, null, 2);
  }

  importPreferences(preferencesJson: string): boolean {
    try {
      const preferences = JSON.parse(preferencesJson);
      this.userPreferences = preferences;
      this.currentTheme = preferences.theme;
      this.applyTheme();
      this.saveUserPreferences();
      this.notifyThemeChange();
      this.notifyPreferencesChange();
      return true;
    } catch (error) {
      console.error('Failed to import preferences:', error);
      return false;
    }
  }
}

// Export singleton instance
export const themeManager = ThemeManager.getInstance();
