// Keyboard Shortcuts and Command Palette System
// Provides keyboard navigation and quick commands for the search platform

export interface KeyboardShortcut {
  key: string;
  ctrl?: boolean;
  alt?: boolean;
  shift?: boolean;
  meta?: boolean;
  action: string;
  description: string;
  category: 'search' | 'navigation' | 'ui' | 'actions';
  enabled: boolean;
}

export interface Command {
  id: string;
  title: string;
  description: string;
  category: string;
  keywords: string[];
  action: () => void;
  icon?: string;
  shortcut?: string;
}

export interface CommandPaletteState {
  isOpen: boolean;
  query: string;
  selectedIndex: number;
  commands: Command[];
  filteredCommands: Command[];
}

export class KeyboardShortcutsManager {
  private static instance: KeyboardShortcutsManager;
  private shortcuts: Map<string, KeyboardShortcut> = new Map();
  private commands: Map<string, Command> = new Map();
  private commandPaletteState!: CommandPaletteState;
  private isEnabled: boolean = true;
  private eventListeners: Array<{ element: HTMLElement | Document; event: string; handler: (e: Event) => void }> = [];

  private constructor() {
    this.initializeShortcuts();
    this.initializeCommands();
    this.initializeCommandPalette();
    
    // Only setup event listeners in browser environment
    if (typeof window !== 'undefined') {
      this.setupEventListeners();
    }
  }

  static getInstance(): KeyboardShortcutsManager {
    if (!KeyboardShortcutsManager.instance) {
      KeyboardShortcutsManager.instance = new KeyboardShortcutsManager();
    }
    return KeyboardShortcutsManager.instance;
  }

  // Initialize event listeners when in browser environment
  initializeEventListeners(): void {
    if (typeof window !== 'undefined' && this.eventListeners.length === 0) {
      this.setupEventListeners();
    }
  }

  private initializeShortcuts(): void {
    const defaultShortcuts: KeyboardShortcut[] = [
      // Search shortcuts
      {
        key: 'k',
        ctrl: true,
        action: 'focus-search',
        description: 'Focus search input',
        category: 'search',
        enabled: true
      },
      {
        key: 'Enter',
        action: 'execute-search',
        description: 'Execute search',
        category: 'search',
        enabled: true
      },
      {
        key: 'Escape',
        action: 'clear-search',
        description: 'Clear search input',
        category: 'search',
        enabled: true
      },
      {
        key: 'ArrowDown',
        action: 'navigate-results-down',
        description: 'Navigate to next result',
        category: 'navigation',
        enabled: true
      },
      {
        key: 'ArrowUp',
        action: 'navigate-results-up',
        description: 'Navigate to previous result',
        category: 'navigation',
        enabled: true
      },
      {
        key: 'j',
        action: 'navigate-results-down',
        description: 'Navigate to next result',
        category: 'navigation',
        enabled: true
      },
      {
        key: 'k',
        action: 'navigate-results-up',
        description: 'Navigate to previous result',
        category: 'navigation',
        enabled: true
      },
      // UI shortcuts
      {
        key: 'p',
        ctrl: true,
        shift: true,
        action: 'open-command-palette',
        description: 'Open command palette',
        category: 'ui',
        enabled: true
      },
      {
        key: 'b',
        ctrl: true,
        action: 'toggle-sidebar',
        description: 'Toggle sidebar',
        category: 'ui',
        enabled: true
      },
      {
        key: 't',
        ctrl: true,
        action: 'toggle-theme',
        description: 'Toggle theme',
        category: 'ui',
        enabled: true
      },
      {
        key: 'f',
        ctrl: true,
        action: 'toggle-filters',
        description: 'Toggle filters panel',
        category: 'ui',
        enabled: true
      },
      // Action shortcuts
      {
        key: 's',
        ctrl: true,
        action: 'save-search',
        description: 'Save current search',
        category: 'actions',
        enabled: true
      },
      {
        key: 'e',
        ctrl: true,
        action: 'export-results',
        description: 'Export search results',
        category: 'actions',
        enabled: true
      },
      {
        key: 'r',
        ctrl: true,
        action: 'refresh-results',
        description: 'Refresh search results',
        category: 'actions',
        enabled: true
      },
      {
        key: 'h',
        ctrl: true,
        action: 'show-help',
        description: 'Show keyboard shortcuts help',
        category: 'actions',
        enabled: true
      }
    ];

    defaultShortcuts.forEach(shortcut => {
      this.shortcuts.set(shortcut.action, shortcut);
    });
  }

  private initializeCommands(): void {
    const defaultCommands: Command[] = [
      {
        id: 'search-focus',
        title: 'Focus Search',
        description: 'Focus the search input field',
        category: 'Search',
        keywords: ['search', 'focus', 'input'],
        action: () => this.executeAction('focus-search'),
        icon: '🔍',
        shortcut: 'Ctrl+K'
      },
      {
        id: 'toggle-theme',
        title: 'Toggle Theme',
        description: 'Switch between light and dark themes',
        category: 'UI',
        keywords: ['theme', 'dark', 'light', 'toggle'],
        action: () => this.executeAction('toggle-theme'),
        icon: '🌙',
        shortcut: 'Ctrl+T'
      },
      {
        id: 'toggle-sidebar',
        title: 'Toggle Sidebar',
        description: 'Show or hide the sidebar',
        category: 'UI',
        keywords: ['sidebar', 'toggle', 'hide', 'show'],
        action: () => this.executeAction('toggle-sidebar'),
        icon: '📋',
        shortcut: 'Ctrl+B'
      },
      {
        id: 'save-search',
        title: 'Save Search',
        description: 'Save the current search query',
        category: 'Actions',
        keywords: ['save', 'search', 'bookmark'],
        action: () => this.executeAction('save-search'),
        icon: '💾',
        shortcut: 'Ctrl+S'
      },
      {
        id: 'export-results',
        title: 'Export Results',
        description: 'Export search results to file',
        category: 'Actions',
        keywords: ['export', 'download', 'results'],
        action: () => this.executeAction('export-results'),
        icon: '📤',
        shortcut: 'Ctrl+E'
      },
      {
        id: 'show-help',
        title: 'Show Help',
        description: 'Display keyboard shortcuts help',
        category: 'Help',
        keywords: ['help', 'shortcuts', 'keyboard'],
        action: () => this.executeAction('show-help'),
        icon: '❓',
        shortcut: 'Ctrl+H'
      },
      {
        id: 'clear-search',
        title: 'Clear Search',
        description: 'Clear the search input and results',
        category: 'Search',
        keywords: ['clear', 'reset', 'search'],
        action: () => this.executeAction('clear-search'),
        icon: '🗑️',
        shortcut: 'Escape'
      },
      {
        id: 'refresh-results',
        title: 'Refresh Results',
        description: 'Refresh the current search results',
        category: 'Actions',
        keywords: ['refresh', 'reload', 'results'],
        action: () => this.executeAction('refresh-results'),
        icon: '🔄',
        shortcut: 'Ctrl+R'
      }
    ];

    defaultCommands.forEach(command => {
      this.commands.set(command.id, command);
    });
  }

  private initializeCommandPalette(): void {
    this.commandPaletteState = {
      isOpen: false,
      query: '',
      selectedIndex: 0,
      commands: Array.from(this.commands.values()),
      filteredCommands: Array.from(this.commands.values())
    };
  }

  private setupEventListeners(): void {
    // Global keyboard event listener
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!this.isEnabled) return;

      // Check for command palette shortcut
      if (e.ctrlKey && e.shiftKey && e.key === 'P') {
        e.preventDefault();
        this.toggleCommandPalette();
        return;
      }

      // Check for other shortcuts
      const shortcut = this.findMatchingShortcut(e);
      if (shortcut) {
        e.preventDefault();
        this.executeAction(shortcut.action);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    this.eventListeners.push({
      element: document,
      event: 'keydown',
      handler: handleKeyDown as (e: Event) => void
    });
  }

  private findMatchingShortcut(e: KeyboardEvent): KeyboardShortcut | null {
    for (const shortcut of this.shortcuts.values()) {
      if (shortcut.key.toLowerCase() === e.key.toLowerCase() &&
          !!shortcut.ctrl === e.ctrlKey &&
          !!shortcut.alt === e.altKey &&
          !!shortcut.shift === e.shiftKey &&
          !!shortcut.meta === e.metaKey &&
          shortcut.enabled) {
        return shortcut;
      }
    }
    return null;
  }

  private executeAction(action: string): void {
    // Emit custom event for action
    const event = new CustomEvent('keyboard-shortcut', {
      detail: { action }
    });
    document.dispatchEvent(event);
  }

  // Command Palette methods
  toggleCommandPalette(): void {
    this.commandPaletteState.isOpen = !this.commandPaletteState.isOpen;
    if (this.commandPaletteState.isOpen) {
      this.commandPaletteState.query = '';
      this.commandPaletteState.selectedIndex = 0;
      this.filterCommands('');
    }
  }

  openCommandPalette(): void {
    this.commandPaletteState.isOpen = true;
    this.commandPaletteState.query = '';
    this.commandPaletteState.selectedIndex = 0;
    this.filterCommands('');
  }

  closeCommandPalette(): void {
    this.commandPaletteState.isOpen = false;
    this.commandPaletteState.query = '';
    this.commandPaletteState.selectedIndex = 0;
  }

  updateCommandPaletteQuery(query: string): void {
    this.commandPaletteState.query = query;
    this.filterCommands(query);
    this.commandPaletteState.selectedIndex = 0;
  }

  private filterCommands(query: string): void {
    if (!query.trim()) {
      this.commandPaletteState.filteredCommands = this.commandPaletteState.commands;
      return;
    }

    const lowerQuery = query.toLowerCase();
    this.commandPaletteState.filteredCommands = this.commandPaletteState.commands.filter(command => {
      return command.title.toLowerCase().includes(lowerQuery) ||
             command.description.toLowerCase().includes(lowerQuery) ||
             command.keywords.some(keyword => keyword.toLowerCase().includes(lowerQuery));
    });
  }

  navigateCommandPalette(direction: 'up' | 'down'): void {
    if (!this.commandPaletteState.isOpen) return;

    const maxIndex = this.commandPaletteState.filteredCommands.length - 1;
    
    if (direction === 'up') {
      this.commandPaletteState.selectedIndex = 
        this.commandPaletteState.selectedIndex > 0 
          ? this.commandPaletteState.selectedIndex - 1 
          : maxIndex;
    } else {
      this.commandPaletteState.selectedIndex = 
        this.commandPaletteState.selectedIndex < maxIndex 
          ? this.commandPaletteState.selectedIndex + 1 
          : 0;
    }
  }

  executeSelectedCommand(): void {
    if (!this.commandPaletteState.isOpen) return;

    const selectedCommand = this.commandPaletteState.filteredCommands[this.commandPaletteState.selectedIndex];
    if (selectedCommand) {
      selectedCommand.action();
      this.closeCommandPalette();
    }
  }

  // Public API methods
  getShortcuts(): KeyboardShortcut[] {
    return Array.from(this.shortcuts.values());
  }

  getShortcutsByCategory(category: string): KeyboardShortcut[] {
    return Array.from(this.shortcuts.values()).filter(shortcut => shortcut.category === category);
  }

  addShortcut(shortcut: KeyboardShortcut): void {
    this.shortcuts.set(shortcut.action, shortcut);
  }

  removeShortcut(action: string): void {
    this.shortcuts.delete(action);
  }

  updateShortcut(action: string, updates: Partial<KeyboardShortcut>): void {
    const shortcut = this.shortcuts.get(action);
    if (shortcut) {
      this.shortcuts.set(action, { ...shortcut, ...updates });
    }
  }

  getCommands(): Command[] {
    return Array.from(this.commands.values());
  }

  getCommandsByCategory(category: string): Command[] {
    return Array.from(this.commands.values()).filter(command => command.category === category);
  }

  addCommand(command: Command): void {
    this.commands.set(command.id, command);
    this.commandPaletteState.commands = Array.from(this.commands.values());
  }

  removeCommand(id: string): void {
    this.commands.delete(id);
    this.commandPaletteState.commands = Array.from(this.commands.values());
  }

  getCommandPaletteState(): CommandPaletteState {
    return { ...this.commandPaletteState };
  }

  isCommandPaletteOpen(): boolean {
    return this.commandPaletteState.isOpen;
  }

  // Enable/disable shortcuts
  enable(): void {
    this.isEnabled = true;
  }

  disable(): void {
    this.isEnabled = false;
  }

  isEnabledState(): boolean {
    return this.isEnabled;
  }

  // Export/import shortcuts
  exportShortcuts(): string {
    const shortcuts = Array.from(this.shortcuts.values());
    return JSON.stringify(shortcuts, null, 2);
  }

  importShortcuts(shortcutsJson: string): boolean {
    try {
      const shortcuts = JSON.parse(shortcutsJson);
      this.shortcuts.clear();
      shortcuts.forEach((shortcut: KeyboardShortcut) => {
        this.shortcuts.set(shortcut.action, shortcut);
      });
      return true;
    } catch (error) {
      console.error('Failed to import shortcuts:', error);
      return false;
    }
  }

  // Cleanup
  destroy(): void {
    this.eventListeners.forEach(({ element, event, handler }) => {
      element.removeEventListener(event, handler);
    });
    this.eventListeners = [];
  }
}

// Export singleton instance
export const keyboardShortcutsManager = KeyboardShortcutsManager.getInstance();
