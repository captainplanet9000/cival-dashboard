import React, { useRef, memo, useEffect, useMemo, useState } from 'react';
import { MonitoringService } from '../services/monitoring-service';

/**
 * Options for the useMemoizedComponent hook
 */
export interface MemoizationOptions {
  // Memo dependencies to explicitly track
  deps?: React.DependencyList;
  
  // Whether to log rendering performance
  logPerformance?: boolean;
  
  // Custom props comparator function for memoization
  areEqual?: (prevProps: any, nextProps: any) => boolean;
  
  // Component display name (for monitoring and debugging)
  displayName?: string;
  
  // Minimum render time (ms) to trigger performance warnings
  minRenderTimeWarning?: number;
}

/**
 * Type for component with displayName
 */
type ComponentWithDisplayName<P = any> = React.ComponentType<P> & {
  displayName?: string;
};

/**
 * Creates a memoized version of the provided component with performance tracking
 * 
 * @param Component The component to memoize
 * @param options Memoization options
 * @returns The memoized component
 */
export function createMemoizedComponent<P extends object>(
  Component: React.ComponentType<P>,
  options: MemoizationOptions = {}
): React.NamedExoticComponent<P> {
  const {
    areEqual,
    displayName,
    logPerformance = process.env.NODE_ENV === 'development',
    minRenderTimeWarning = 16 // 16ms = 60fps threshold
  } = options;

  // Create wrapped component that logs render performance
  const PerformanceTrackedComponent: React.FC<P> = (props) => {
    const startTimeRef = useRef<number>(0);
    const renderCountRef = useRef<number>(0);
    
    // Track render start time
    useEffect(() => {
      // Calculate render duration and log if significant
      const renderTime = performance.now() - startTimeRef.current;
      renderCountRef.current += 1;
      
      if (logPerformance && renderTime > minRenderTimeWarning) {
        console.warn(
          `%c${displayName || Component.displayName || 'Component'} render took ${renderTime.toFixed(2)}ms (render #${renderCountRef.current})`,
          'color: orange; font-weight: bold;'
        );
        
        MonitoringService.trackMetric({
          name: 'component_render_time',
          value: renderTime,
          unit: 'ms',
          tags: ['performance', 'react_component', displayName || Component.displayName || 'unknown']
        });
      }
    });
    
    // Update render start time
    startTimeRef.current = performance.now();
    
    return <Component {...props} />;
  };
  
  // Set display name for debugging
  const componentName = displayName || Component.displayName || Component.name || 'Component';
  PerformanceTrackedComponent.displayName = `PerformanceTracked(${componentName})`;
  
  // Create memoized version
  const MemoizedComponent = areEqual 
    ? memo(PerformanceTrackedComponent, areEqual)
    : memo(PerformanceTrackedComponent);
  
  // Set display name for the memoized component
  MemoizedComponent.displayName = `Memo(${componentName})`;
  
  return MemoizedComponent;
}

/**
 * Hook to memoize a component with automatic dependency detection
 * 
 * @param Component The component to memoize
 * @param options Memoization options
 * @returns The memoized component
 */
export function useMemoizedComponent<P extends object>(
  Component: ComponentWithDisplayName<P>,
  options: MemoizationOptions = {}
): React.NamedExoticComponent<P> {
  const { deps = [], ...restOptions } = options;
  
  // Create memoized component that only changes when deps change
  return useMemo(
    () => createMemoizedComponent(Component, restOptions),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    deps
  );
}

/**
 * HOC to wrap a component with memoization
 * 
 * @param Component The component to memoize
 * @param options Memoization options
 * @returns The memoized component
 */
export function withMemoization<P extends object>(
  Component: ComponentWithDisplayName<P>,
  options: MemoizationOptions = {}
): React.NamedExoticComponent<P> {
  return createMemoizedComponent(Component, options);
}

/**
 * A component that renders children only if they have changed
 * Useful to prevent unnecessary re-renders in a component tree
 */
export const MemoChildren: React.FC<{
  children: React.ReactNode;
  displayName?: string;
  logPerformance?: boolean;
}> = memo(({ children, displayName = 'MemoChildren', logPerformance = false }) => {
  const startTime = useRef(performance.now());
  const [renderCount, setRenderCount] = useState(0);
  
  useEffect(() => {
    setRenderCount(prev => prev + 1);
    
    const renderTime = performance.now() - startTime.current;
    if (logPerformance && renderTime > 5) {
      console.log(
        `%c${displayName} render took ${renderTime.toFixed(2)}ms (render #${renderCount + 1})`,
        'color: green; font-weight: bold;'
      );
    }
  });
  
  // Update render start time
  startTime.current = performance.now();
  
  return <>{children}</>;
}); 