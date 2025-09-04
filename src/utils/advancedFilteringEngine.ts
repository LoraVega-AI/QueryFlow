// Advanced Filtering Engine for Dynamic Filters, Faceted Search, and Geographic Search
// Provides sophisticated filtering capabilities with real-time updates and complex logic

export interface FilterOption {
  id: string;
  label: string;
  value: any;
  count: number;
  selected: boolean;
  category: string;
  type: 'text' | 'number' | 'date' | 'boolean' | 'select' | 'multiselect' | 'range' | 'location';
  metadata?: Record<string, any>;
}

export interface Facet {
  id: string;
  name: string;
  type: 'category' | 'tag' | 'date' | 'number' | 'location' | 'custom';
  options: FilterOption[];
  collapsed: boolean;
  multiSelect: boolean;
  sortBy: 'count' | 'label' | 'value';
  sortOrder: 'asc' | 'desc';
}

export interface DateRange {
  start: Date;
  end: Date;
  type: 'absolute' | 'relative';
  relativeValue?: number;
  relativeUnit?: 'days' | 'weeks' | 'months' | 'years';
}

export interface NumberRange {
  min: number;
  max: number;
  step?: number;
  unit?: string;
}

export interface LocationFilter {
  type: 'point' | 'radius' | 'bounding_box' | 'polygon';
  coordinates: number[];
  radius?: number; // in meters
  bounds?: {
    north: number;
    south: number;
    east: number;
    west: number;
  };
}

export interface FilterState {
  facets: Map<string, Facet>;
  activeFilters: Map<string, any>;
  filterLogic: 'AND' | 'OR';
  customFilters: Array<{
    id: string;
    field: string;
    operator: 'equals' | 'contains' | 'starts_with' | 'ends_with' | 'greater_than' | 'less_than' | 'between' | 'in' | 'not_in';
    value: any;
    label: string;
  }>;
}

export interface FilterResult {
  filteredItems: any[];
  facets: Facet[];
  totalCount: number;
  appliedFilters: number;
  suggestions: string[];
}

export class AdvancedFilteringEngine {
  private static instance: AdvancedFilteringEngine;
  private filterState!: FilterState;
  private items: any[] = [];
  private facetCache: Map<string, Facet> = new Map();
  private filterHistory: Array<{ timestamp: Date; filters: FilterState; resultCount: number }> = [];

  private constructor() {
    this.initializeFilterState();
  }

  static getInstance(): AdvancedFilteringEngine {
    if (!AdvancedFilteringEngine.instance) {
      AdvancedFilteringEngine.instance = new AdvancedFilteringEngine();
    }
    return AdvancedFilteringEngine.instance;
  }

  private initializeFilterState(): void {
    this.filterState = {
      facets: new Map(),
      activeFilters: new Map(),
      filterLogic: 'AND',
      customFilters: []
    };
  }

  // Set items to filter
  setItems(items: any[]): void {
    this.items = items;
    this.generateFacets();
  }

  // Generate facets from items
  private generateFacets(): void {
    this.facetCache.clear();
    
    if (this.items.length === 0) return;

    // Category facet
    const categoryFacet = this.generateCategoryFacet();
    if (categoryFacet) {
      this.facetCache.set('category', categoryFacet);
    }

    // Tag facet
    const tagFacet = this.generateTagFacet();
    if (tagFacet) {
      this.facetCache.set('tags', tagFacet);
    }

    // Date facet
    const dateFacet = this.generateDateFacet();
    if (dateFacet) {
      this.facetCache.set('date', dateFacet);
    }

    // Source facet
    const sourceFacet = this.generateSourceFacet();
    if (sourceFacet) {
      this.facetCache.set('source', sourceFacet);
    }

    // Type facet
    const typeFacet = this.generateTypeFacet();
    if (typeFacet) {
      this.facetCache.set('type', typeFacet);
    }

    // Relevance facet
    const relevanceFacet = this.generateRelevanceFacet();
    if (relevanceFacet) {
      this.facetCache.set('relevance', relevanceFacet);
    }
  }

  private generateCategoryFacet(): Facet | null {
    const categories = new Map<string, number>();
    
    this.items.forEach(item => {
      if (item.category) {
        const count = categories.get(item.category) || 0;
        categories.set(item.category, count + 1);
      }
    });

    if (categories.size === 0) return null;

    const options: FilterOption[] = Array.from(categories.entries()).map(([category, count]) => ({
      id: `category_${category}`,
      label: category,
      value: category,
      count,
      selected: false,
      category: 'category',
      type: 'select'
    }));

    return {
      id: 'category',
      name: 'Category',
      type: 'category',
      options: options.sort((a, b) => b.count - a.count),
      collapsed: false,
      multiSelect: true,
      sortBy: 'count',
      sortOrder: 'desc'
    };
  }

  private generateTagFacet(): Facet | null {
    const tags = new Map<string, number>();
    
    this.items.forEach(item => {
      if (item.tags && Array.isArray(item.tags)) {
        item.tags.forEach((tag: string) => {
          const count = tags.get(tag) || 0;
          tags.set(tag, count + 1);
        });
      }
    });

    if (tags.size === 0) return null;

    const options: FilterOption[] = Array.from(tags.entries()).map(([tag, count]) => ({
      id: `tag_${tag}`,
      label: tag,
      value: tag,
      count,
      selected: false,
      category: 'tags',
      type: 'multiselect'
    }));

    return {
      id: 'tags',
      name: 'Tags',
      type: 'tag',
      options: options.sort((a, b) => b.count - a.count),
      collapsed: false,
      multiSelect: true,
      sortBy: 'count',
      sortOrder: 'desc'
    };
  }

  private generateDateFacet(): Facet | null {
    const dates = new Map<string, number>();
    const now = new Date();
    
    this.items.forEach(item => {
      if (item.timestamp) {
        const date = new Date(item.timestamp);
        const daysDiff = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
        
        let period: string;
        if (daysDiff === 0) period = 'Today';
        else if (daysDiff === 1) period = 'Yesterday';
        else if (daysDiff <= 7) period = 'Last 7 days';
        else if (daysDiff <= 30) period = 'Last 30 days';
        else if (daysDiff <= 90) period = 'Last 3 months';
        else if (daysDiff <= 365) period = 'Last year';
        else period = 'Older than 1 year';
        
        const count = dates.get(period) || 0;
        dates.set(period, count + 1);
      }
    });

    if (dates.size === 0) return null;

    const options: FilterOption[] = Array.from(dates.entries()).map(([period, count]) => ({
      id: `date_${period}`,
      label: period,
      value: period,
      count,
      selected: false,
      category: 'date',
      type: 'select'
    }));

    return {
      id: 'date',
      name: 'Date',
      type: 'date',
      options: options,
      collapsed: false,
      multiSelect: true,
      sortBy: 'label',
      sortOrder: 'asc'
    };
  }

  private generateSourceFacet(): Facet | null {
    const sources = new Map<string, number>();
    
    this.items.forEach(item => {
      if (item.source) {
        const count = sources.get(item.source) || 0;
        sources.set(item.source, count + 1);
      }
    });

    if (sources.size === 0) return null;

    const options: FilterOption[] = Array.from(sources.entries()).map(([source, count]) => ({
      id: `source_${source}`,
      label: source,
      value: source,
      count,
      selected: false,
      category: 'source',
      type: 'multiselect'
    }));

    return {
      id: 'source',
      name: 'Source',
      type: 'custom',
      options: options.sort((a, b) => b.count - a.count),
      collapsed: false,
      multiSelect: true,
      sortBy: 'count',
      sortOrder: 'desc'
    };
  }

  private generateTypeFacet(): Facet | null {
    const types = new Map<string, number>();
    
    this.items.forEach(item => {
      if (item.type) {
        const count = types.get(item.type) || 0;
        types.set(item.type, count + 1);
      }
    });

    if (types.size === 0) return null;

    const options: FilterOption[] = Array.from(types.entries()).map(([type, count]) => ({
      id: `type_${type}`,
      label: type,
      value: type,
      count,
      selected: false,
      category: 'type',
      type: 'multiselect'
    }));

    return {
      id: 'type',
      name: 'Type',
      type: 'custom',
      options: options.sort((a, b) => b.count - a.count),
      collapsed: false,
      multiSelect: true,
      sortBy: 'count',
      sortOrder: 'desc'
    };
  }

  private generateRelevanceFacet(): Facet | null {
    const relevanceRanges = [
      { label: 'High (0.8+)', min: 0.8, max: 1.0 },
      { label: 'Medium (0.6-0.8)', min: 0.6, max: 0.8 },
      { label: 'Low (0.4-0.6)', min: 0.4, max: 0.6 },
      { label: 'Very Low (<0.4)', min: 0, max: 0.4 }
    ];

    const options: FilterOption[] = relevanceRanges.map(range => {
      const count = this.items.filter(item => 
        item.relevance >= range.min && item.relevance < range.max
      ).length;

      return {
        id: `relevance_${range.label}`,
        label: range.label,
        value: range,
        count,
        selected: false,
        category: 'relevance',
        type: 'select'
      };
    });

    return {
      id: 'relevance',
      name: 'Relevance',
      type: 'number',
      options: options,
      collapsed: false,
      multiSelect: false,
      sortBy: 'value',
      sortOrder: 'desc'
    };
  }

  // Apply filters
  applyFilters(): FilterResult {
    let filteredItems = [...this.items];
    const appliedFilters: string[] = [];

    // Apply facet filters
    this.filterState.facets.forEach((facet, facetId) => {
      const selectedOptions = facet.options.filter(option => option.selected);
      if (selectedOptions.length > 0) {
        appliedFilters.push(facetId);
        filteredItems = this.applyFacetFilter(filteredItems, facetId, selectedOptions);
      }
    });

    // Apply custom filters
    this.filterState.customFilters.forEach(customFilter => {
      filteredItems = this.applyCustomFilter(filteredItems, customFilter);
      appliedFilters.push(customFilter.id);
    });

    // Apply date range filters
    if (this.filterState.activeFilters.has('dateRange')) {
      const dateRange = this.filterState.activeFilters.get('dateRange') as DateRange;
      filteredItems = this.applyDateRangeFilter(filteredItems, dateRange);
      appliedFilters.push('dateRange');
    }

    // Apply number range filters
    if (this.filterState.activeFilters.has('numberRange')) {
      const numberRange = this.filterState.activeFilters.get('numberRange') as NumberRange;
      filteredItems = this.applyNumberRangeFilter(filteredItems, numberRange);
      appliedFilters.push('numberRange');
    }

    // Apply location filters
    if (this.filterState.activeFilters.has('location')) {
      const locationFilter = this.filterState.activeFilters.get('location') as LocationFilter;
      filteredItems = this.applyLocationFilter(filteredItems, locationFilter);
      appliedFilters.push('location');
    }

    // Update facet counts based on filtered results
    const updatedFacets = this.updateFacetCounts(filteredItems);

    // Generate suggestions
    const suggestions = this.generateFilterSuggestions(filteredItems);

    // Save to history
    this.filterHistory.push({
      timestamp: new Date(),
      filters: { ...this.filterState },
      resultCount: filteredItems.length
    });

    return {
      filteredItems,
      facets: updatedFacets,
      totalCount: filteredItems.length,
      appliedFilters: appliedFilters.length,
      suggestions
    };
  }

  private applyFacetFilter(items: any[], facetId: string, selectedOptions: FilterOption[]): any[] {
    return items.filter(item => {
      switch (facetId) {
        case 'category':
          return selectedOptions.some(option => item.category === option.value);
        case 'tags':
          return selectedOptions.some(option => 
            item.tags && item.tags.includes(option.value)
          );
        case 'date':
          return this.matchesDatePeriod(item.timestamp, selectedOptions[0].value);
        case 'source':
          return selectedOptions.some(option => item.source === option.value);
        case 'type':
          return selectedOptions.some(option => item.type === option.value);
        case 'relevance':
          const range = selectedOptions[0].value;
          return item.relevance >= range.min && item.relevance < range.max;
        default:
          return true;
      }
    });
  }

  private matchesDatePeriod(timestamp: Date, period: string): boolean {
    if (!timestamp) return false;
    
    const date = new Date(timestamp);
    const now = new Date();
    const daysDiff = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
    
    switch (period) {
      case 'Today':
        return daysDiff === 0;
      case 'Yesterday':
        return daysDiff === 1;
      case 'Last 7 days':
        return daysDiff <= 7;
      case 'Last 30 days':
        return daysDiff <= 30;
      case 'Last 3 months':
        return daysDiff <= 90;
      case 'Last year':
        return daysDiff <= 365;
      case 'Older than 1 year':
        return daysDiff > 365;
      default:
        return false;
    }
  }

  private applyCustomFilter(items: any[], customFilter: any): any[] {
    return items.filter(item => {
      const fieldValue = this.getNestedValue(item, customFilter.field);
      
      switch (customFilter.operator) {
        case 'equals':
          return fieldValue === customFilter.value;
        case 'contains':
          return String(fieldValue).toLowerCase().includes(String(customFilter.value).toLowerCase());
        case 'starts_with':
          return String(fieldValue).toLowerCase().startsWith(String(customFilter.value).toLowerCase());
        case 'ends_with':
          return String(fieldValue).toLowerCase().endsWith(String(customFilter.value).toLowerCase());
        case 'greater_than':
          return Number(fieldValue) > Number(customFilter.value);
        case 'less_than':
          return Number(fieldValue) < Number(customFilter.value);
        case 'between':
          return Number(fieldValue) >= Number(customFilter.value.min) && 
                 Number(fieldValue) <= Number(customFilter.value.max);
        case 'in':
          return Array.isArray(customFilter.value) && customFilter.value.includes(fieldValue);
        case 'not_in':
          return Array.isArray(customFilter.value) && !customFilter.value.includes(fieldValue);
        default:
          return true;
      }
    });
  }

  private applyDateRangeFilter(items: any[], dateRange: DateRange): any[] {
    return items.filter(item => {
      if (!item.timestamp) return false;
      
      const itemDate = new Date(item.timestamp);
      return itemDate >= dateRange.start && itemDate <= dateRange.end;
    });
  }

  private applyNumberRangeFilter(items: any[], numberRange: NumberRange): any[] {
    return items.filter(item => {
      const value = Number(item.relevance || 0);
      return value >= numberRange.min && value <= numberRange.max;
    });
  }

  private applyLocationFilter(items: any[], locationFilter: LocationFilter): any[] {
    // Simplified location filtering - in a real implementation, you'd use proper geospatial queries
    return items.filter(item => {
      if (!item.location) return false;
      
      // This is a simplified implementation
      // In reality, you'd use proper geospatial calculations
      return true;
    });
  }

  private updateFacetCounts(filteredItems: any[]): Facet[] {
    const updatedFacets: Facet[] = [];
    
    this.facetCache.forEach((facet, facetId) => {
      const updatedFacet = { ...facet };
      
      updatedFacet.options = facet.options.map(option => {
        const count = this.countItemsForOption(filteredItems, facetId, option);
        return { ...option, count };
      });
      
      updatedFacets.push(updatedFacet);
    });
    
    return updatedFacets;
  }

  private countItemsForOption(items: any[], facetId: string, option: FilterOption): number {
    return items.filter(item => {
      switch (facetId) {
        case 'category':
          return item.category === option.value;
        case 'tags':
          return item.tags && item.tags.includes(option.value);
        case 'date':
          return this.matchesDatePeriod(item.timestamp, option.value);
        case 'source':
          return item.source === option.value;
        case 'type':
          return item.type === option.value;
        case 'relevance':
          const range = option.value;
          return item.relevance >= range.min && item.relevance < range.max;
        default:
          return false;
      }
    }).length;
  }

  private generateFilterSuggestions(filteredItems: any[]): string[] {
    const suggestions: string[] = [];
    
    if (filteredItems.length === 0) {
      suggestions.push('Try removing some filters to see more results');
      suggestions.push('Check your search terms for typos');
    } else if (filteredItems.length < 5) {
      suggestions.push('Consider expanding your search criteria');
      suggestions.push('Try different date ranges or categories');
    } else if (filteredItems.length > 100) {
      suggestions.push('Add more specific filters to narrow results');
      suggestions.push('Try filtering by tags or source');
    }
    
    return suggestions;
  }

  private getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  }

  // Public API methods
  getFacets(): Facet[] {
    return Array.from(this.facetCache.values());
  }

  getFilterState(): FilterState {
    return { ...this.filterState };
  }

  updateFacetOption(facetId: string, optionId: string, selected: boolean): void {
    const facet = this.facetCache.get(facetId);
    if (facet) {
      const option = facet.options.find(opt => opt.id === optionId);
      if (option) {
        option.selected = selected;
      }
    }
  }

  addCustomFilter(filter: any): void {
    this.filterState.customFilters.push({
      id: `custom_${Date.now()}`,
      ...filter
    });
  }

  removeCustomFilter(filterId: string): void {
    this.filterState.customFilters = this.filterState.customFilters.filter(
      filter => filter.id !== filterId
    );
  }

  setDateRange(dateRange: DateRange): void {
    this.filterState.activeFilters.set('dateRange', dateRange);
  }

  setNumberRange(numberRange: NumberRange): void {
    this.filterState.activeFilters.set('numberRange', numberRange);
  }

  setLocationFilter(locationFilter: LocationFilter): void {
    this.filterState.activeFilters.set('location', locationFilter);
  }

  clearAllFilters(): void {
    this.facetCache.forEach(facet => {
      facet.options.forEach(option => {
        option.selected = false;
      });
    });
    this.filterState.activeFilters.clear();
    this.filterState.customFilters = [];
  }

  getFilterHistory(): Array<{ timestamp: Date; filters: FilterState; resultCount: number }> {
    return [...this.filterHistory];
  }

  exportFilters(): string {
    return JSON.stringify({
      facets: Array.from(this.facetCache.entries()),
      activeFilters: Array.from(this.filterState.activeFilters.entries()),
      customFilters: this.filterState.customFilters,
      filterLogic: this.filterState.filterLogic
    }, null, 2);
  }

  importFilters(filtersJson: string): boolean {
    try {
      const data = JSON.parse(filtersJson);
      this.facetCache = new Map(data.facets);
      this.filterState.activeFilters = new Map(data.activeFilters);
      this.filterState.customFilters = data.customFilters;
      this.filterState.filterLogic = data.filterLogic;
      return true;
    } catch (error) {
      console.error('Failed to import filters:', error);
      return false;
    }
  }
}

// Export singleton instance
export const advancedFilteringEngine = AdvancedFilteringEngine.getInstance();
