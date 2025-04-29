'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

/**
 * Hook for implementing web vitals monitoring and performance optimizations
 * Tracks Core Web Vitals and provides optimizations for React rendering
 */
export function usePerformanceMonitoring() {
  const [metrics, setMetrics] = useState({
    fcp: 0,    // First Contentful Paint
    lcp: 0,    // Largest Contentful Paint
    cls: 0,    // Cumulative Layout Shift
    fid: 0,    // First Input Delay
    ttfb: 0,   // Time to First Byte
  });
  
  // Reference to store if we already collected metrics
  const metricsCollected = useRef(false);
  
  // Function to report metrics to our analytics service
  const reportMetrics = useCallback((metricData: any) => {
    // In production, this would send to an analytics service
    if (process.env.NODE_ENV === 'production') {
      console.log('Would send metrics to analytics:', metricData);
      // Example: sendToAnalytics(metricData);
    }
  }, []);
  
  // Collect web vitals metrics
  useEffect(() => {
    if (typeof window !== 'undefined' && !metricsCollected.current) {
      // Only load the web-vitals library in the browser
      import('web-vitals').then(({ getCLS, getFID, getFCP, getLCP, getTTFB }) => {
        getCLS((metric) => {
          setMetrics(prev => ({ ...prev, cls: metric.value }));
        });
        getFID((metric) => {
          setMetrics(prev => ({ ...prev, fid: metric.value }));
        });
        getFCP((metric) => {
          setMetrics(prev => ({ ...prev, fcp: metric.value }));
        });
        getLCP((metric) => {
          setMetrics(prev => ({ ...prev, lcp: metric.value }));
        });
        getTTFB((metric) => {
          setMetrics(prev => ({ ...prev, ttfb: metric.value }));
        });
        
        metricsCollected.current = true;
      });
    }
  }, []);
  
  // Report metrics when they change
  useEffect(() => {
    if (metrics.lcp > 0) {
      reportMetrics(metrics);
    }
  }, [metrics, reportMetrics]);
  
  return {
    metrics,
    isPerformant: 
      metrics.lcp < 2500 &&  // Good LCP is under 2.5s
      metrics.fid < 100 &&   // Good FID is under 100ms
      metrics.cls < 0.1,     // Good CLS is under 0.1
    optimizeComponent: (Component: any) => {
      // Returns a memoized version of the component
      return React.memo(Component);
    },
    optimizeCallback: useCallback,
    optimizeMemo: React.useMemo,
  };
}

/**
 * Custom hook for implementing efficient infinite scrolling
 * with virtualization for large data sets
 */
export function useVirtualizedList<T>(
  items: T[],
  itemHeight: number,
  listHeight: number
) {
  const [scrollTop, setScrollTop] = useState(0);
  
  // Calculate range of visible items
  const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight));
  const endIndex = Math.min(
    items.length - 1,
    Math.floor((scrollTop + listHeight) / itemHeight)
  );
  
  // Add buffer for smoother scrolling
  const visibleItems = items.slice(
    Math.max(0, startIndex - 5),
    Math.min(items.length, endIndex + 5)
  );
  
  // Generate styles for the list container
  const containerStyle = {
    height: `${listHeight}px`,
    overflow: 'auto',
    position: 'relative',
  } as const;
  
  // Generate styles for the inner scroll content
  const innerStyle = {
    height: `${items.length * itemHeight}px`,
    position: 'relative',
  } as const;
  
  // Handle scroll events
  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(e.currentTarget.scrollTop);
  }, []);
  
  return {
    visibleItems,
    startIndex,
    containerStyle,
    innerStyle,
    handleScroll,
    itemStyle: (index: number) => ({
      position: 'absolute',
      top: `${index * itemHeight}px`,
      left: 0,
      right: 0,
      height: `${itemHeight}px`,
    }),
  };
}

/**
 * Hook for implementing code splitting and lazy loading
 * resources based on viewport visibility
 */
export function useLazyLoading(threshold = 0.1) {
  const [isVisible, setIsVisible] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    const element = ref.current;
    if (!element || typeof IntersectionObserver === 'undefined') {
      setIsVisible(true);
      return;
    }
    
    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsVisible(entry.isIntersecting);
      },
      { threshold }
    );
    
    observer.observe(element);
    
    return () => {
      observer.disconnect();
    };
  }, [threshold]);
  
  return { isVisible, ref };
}

/**
 * Hook for debouncing expensive operations (e.g. search, resize)
 */
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
