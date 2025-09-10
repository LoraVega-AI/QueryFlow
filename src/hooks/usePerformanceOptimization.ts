// React Performance Optimization Hooks
// Provides hooks for optimizing React rendering and component performance

import { useCallback, useMemo, useRef, useEffect, useState } from 'react';
import { memoryManager } from '../utils/memoryManager';
import { enhancedCacheManager } from '../utils/enhancedCacheManager';

// Hook for debouncing values to prevent excessive re-renders
export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

// Hook for throttling function calls
export function useThrottle<T extends (...args: any[]) => any>(
  callback: T,
  delay: number
): T {
  const lastRun = useRef(Date.now());

  return useCallback(
    ((...args: any[]) => {
      if (Date.now() - lastRun.current >= delay) {
        callback(...args);
        lastRun.current = Date.now();
      }
    }) as T,
    [callback, delay]
  );
}

// Hook for memoizing expensive calculations
export function useMemoizedCallback<T extends (...args: any[]) => any>(
  callback: T,
  deps: React.DependencyList
): T {
  const ref = useRef<T>(callback);
  const depsRef = useRef(deps);

  // Check if dependencies have changed
  const hasChanged = deps.some((dep, index) => dep !== depsRef.current[index]);

  if (hasChanged) {
    ref.current = callback;
    depsRef.current = deps;
  }

  return useCallback(ref.current, []);
}

// Hook for virtual scrolling optimization
export function useVirtualization(
  itemCount: number,
  containerHeight: number,
  itemHeight: number,
  overscan: number = 5
) {
  const [scrollTop, setScrollTop] = useState(0);

  const virtualParams = useMemo(() => {
    const visibleCount = Math.ceil(containerHeight / itemHeight);
    const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
    const endIndex = Math.min(itemCount - 1, startIndex + visibleCount + overscan * 2);
    const totalHeight = itemCount * itemHeight;
    const offsetY = startIndex * itemHeight;

    return {
      startIndex,
      endIndex,
      visibleCount,
      totalHeight,
      offsetY,
      visibleItems: endIndex - startIndex + 1
    };
  }, [itemCount, containerHeight, itemHeight, overscan, scrollTop]);

  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(e.currentTarget.scrollTop);
  }, []);

  return {
    ...virtualParams,
    handleScroll,
    scrollTop
  };
}

// Hook for memory-aware data processing
export function useMemoryAwareProcessing<T>(
  data: T[],
  processor: (item: T, index: number) => any,
  batchSize: number = 1000
) {
  const [processedData, setProcessedData] = useState<any[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);

  const processData = useCallback(async () => {
    if (data.length === 0) {
      setProcessedData([]);
      return;
    }

    setIsProcessing(true);
    setProgress(0);

    const result: any[] = [];
    const totalBatches = Math.ceil(data.length / batchSize);

    for (let i = 0; i < totalBatches; i++) {
      const batch = data.slice(i * batchSize, (i + 1) * batchSize);
      
      // Process batch
      const batchResult = batch.map((item, index) => 
        processor(item, i * batchSize + index)
      );
      
      result.push(...batchResult);
      setProgress(((i + 1) / totalBatches) * 100);

      // Check memory usage
      const memoryStats = memoryManager.getMemoryStats();
      if (memoryStats.percentage > 80) {
        // Trigger cleanup if memory usage is high
        await memoryManager.performCleanup();
      }

      // Yield control to prevent blocking
      await new Promise(resolve => setTimeout(resolve, 0));
    }

    setProcessedData(result);
    setIsProcessing(false);
  }, [data, processor, batchSize]);

  useEffect(() => {
    processData();
  }, [processData]);

  return {
    processedData,
    isProcessing,
    progress
  };
}

// Hook for intelligent caching
export function useIntelligentCache<T>(
  key: string,
  fetcher: () => Promise<T>,
  options: {
    ttl?: number;
    priority?: 'low' | 'medium' | 'high' | 'critical';
    dependencies?: React.DependencyList;
  } = {}
) {
  const [data, setData] = useState<T | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const cacheKey = useMemo(() => `cache_${key}`, [key]);

  const fetchData = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Try to get from cache first
      const cachedData = await enhancedCacheManager.get<T>(cacheKey);
      if (cachedData) {
        setData(cachedData);
        setIsLoading(false);
        return;
      }

      // Fetch new data
      const newData = await fetcher();
      setData(newData);

      // Cache the result
      await enhancedCacheManager.set(cacheKey, newData, {
        ttl: options.ttl,
        priority: options.priority
      });
    } catch (err) {
      setError(err as Error);
    } finally {
      setIsLoading(false);
    }
  }, [cacheKey, fetcher, options.ttl, options.priority]);

  useEffect(() => {
    fetchData();
  }, [fetchData, ...(options.dependencies || [])]);

  const refetch = useCallback(() => {
    fetchData();
  }, [fetchData]);

  return {
    data,
    isLoading,
    error,
    refetch
  };
}

// Hook for performance monitoring
export function usePerformanceMonitor(componentName: string) {
  const renderCount = useRef(0);
  const lastRenderTime = useRef(Date.now());
  const renderTimes = useRef<number[]>([]);

  useEffect(() => {
    renderCount.current++;
    const now = Date.now();
    const renderTime = now - lastRenderTime.current;
    renderTimes.current.push(renderTime);
    lastRenderTime.current = now;

    // Keep only last 10 render times
    if (renderTimes.current.length > 10) {
      renderTimes.current = renderTimes.current.slice(-10);
    }

    // Log performance warnings
    if (renderTime > 16) { // More than one frame
      console.warn(`${componentName} render took ${renderTime}ms`);
    }

    // Log excessive re-renders
    if (renderCount.current > 50) {
      console.warn(`${componentName} has re-rendered ${renderCount.current} times`);
    }
  });

  const getPerformanceStats = useCallback(() => {
    const avgRenderTime = renderTimes.current.length > 0
      ? renderTimes.current.reduce((sum, time) => sum + time, 0) / renderTimes.current.length
      : 0;

    return {
      renderCount: renderCount.current,
      averageRenderTime: avgRenderTime,
      lastRenderTime: renderTimes.current[renderTimes.current.length - 1] || 0
    };
  }, []);

  return {
    getPerformanceStats,
    renderCount: renderCount.current
  };
}

// Hook for lazy loading with intersection observer
export function useLazyLoading(
  threshold: number = 0.1,
  rootMargin: string = '50px'
) {
  const [isVisible, setIsVisible] = useState(false);
  const [hasBeenVisible, setHasBeenVisible] = useState(false);
  const elementRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const element = elementRef.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          setHasBeenVisible(true);
          observer.unobserve(element);
        }
      },
      {
        threshold,
        rootMargin
      }
    );

    observer.observe(element);

    return () => {
      observer.unobserve(element);
    };
  }, [threshold, rootMargin]);

  return {
    elementRef,
    isVisible,
    hasBeenVisible
  };
}

// Hook for optimizing list rendering
export function useOptimizedList<T>(
  items: T[],
  options: {
    keyExtractor: (item: T, index: number) => string;
    itemHeight?: number;
    containerHeight?: number;
    overscan?: number;
  }
) {
  const {
    keyExtractor,
    itemHeight = 40,
    containerHeight = 400,
    overscan = 5
  } = options;

  const virtualization = useVirtualization(
    items.length,
    containerHeight,
    itemHeight,
    overscan
  );

  const visibleItems = useMemo(() => {
    return items.slice(
      virtualization.startIndex,
      virtualization.endIndex + 1
    );
  }, [items, virtualization.startIndex, virtualization.endIndex]);

  const itemKeys = useMemo(() => {
    return visibleItems.map((item, index) => 
      keyExtractor(item, virtualization.startIndex + index)
    );
  }, [visibleItems, keyExtractor, virtualization.startIndex]);

  return {
    ...virtualization,
    visibleItems,
    itemKeys
  };
}

// Hook for preventing unnecessary re-renders
export function useStableCallback<T extends (...args: any[]) => any>(
  callback: T
): T {
  const callbackRef = useRef(callback);
  callbackRef.current = callback;

  return useCallback(
    ((...args: any[]) => callbackRef.current(...args)) as T,
    []
  );
}

// Hook for managing component visibility
export function useVisibility() {
  const [isVisible, setIsVisible] = useState(!document.hidden);

  useEffect(() => {
    const handleVisibilityChange = () => {
      setIsVisible(!document.hidden);
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  return isVisible;
}
