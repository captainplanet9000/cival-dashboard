import React, { ComponentType, Suspense, lazy } from 'react';
import { ErrorBoundary } from './ErrorBoundary';
import { ErrorFallback } from './ErrorFallback';
import { MonitoringService } from '../services/monitoring-service';

/**
 * Options for lazy loading components
 */
export interface LazyComponentOptions {
  // Fallback component to show during loading
  fallback?: React.ReactNode;
  
  // Error fallback component to show on error
  errorFallback?: React.ReactNode | ((error: Error, reset: () => void) => React.ReactNode);
  
  // Minimum loading delay to avoid flash of loading state (ms)
  minDelay?: number;
  
  // Timeout for loading after which an error is thrown (ms)
  timeout?: number;
  
  // Retry configuration for failed imports
  retry?: {
    count: number;
    delay: number;
    backoff?: boolean;
  };
  
  // Prefetch the component in advance
  prefetch?: boolean;
  
  // Track loading performance
  trackPerformance?: boolean;
  
  // Debug mode
  debug?: boolean;
}

/**
 * Create a lazy-loaded component with error boundary and suspense
 * 
 * @param factory Function that imports the component
 * @param options Lazy loading options
 * @returns Lazy-loaded component with error boundary and suspense
 */
export function createLazyComponent<T extends ComponentType<any>>(
  factory: () => Promise<{ default: T }>,
  options: LazyComponentOptions = {}
): React.FC<React.ComponentProps<T>> {
  const {
    fallback = <div>Loading...</div>,
    errorFallback,
    minDelay = 0,
    timeout = 30000,
    retry = { count: 1, delay: 1000 },
    prefetch = false,
    trackPerformance = true,
    debug = false
  } = options;

  // Create enhanced factory with performance tracking, timeouts, and retries
  const enhancedFactory = async () => {
    let startTime: number | null = null;
    let retryCount = 0;
    let error: Error | null = null;
    
    if (trackPerformance) {
      startTime = performance.now();
    }

    // Add minimum delay if specified
    const delayPromise = minDelay > 0 
      ? new Promise(resolve => setTimeout(resolve, minDelay))
      : Promise.resolve();
      
    // Create timeout promise
    const timeoutPromise = timeout > 0
      ? new Promise<never>((_, reject) => {
          setTimeout(() => {
            reject(new Error(`Component loading timed out after ${timeout}ms`));
          }, timeout);
        })
      : null;

    // Try to load component with retries
    while (retryCount <= retry.count) {
      try {
        // First attempt (or subsequent retry)
        const resultPromise = factory();
        
        // Race with timeout if specified
        const result = timeoutPromise
          ? await Promise.race([resultPromise, timeoutPromise])
          : await resultPromise;
          
        // Wait for minimum delay if needed
        await delayPromise;
        
        // Track performance
        if (trackPerformance && startTime) {
          const loadTime = performance.now() - startTime;
          
          MonitoringService.trackMetric({
            name: 'component_load_time',
            value: loadTime,
            unit: 'ms',
            tags: ['performance', 'lazy_loading', 'success']
          });
          
          if (debug) {
            console.log(`%cLazy component loaded in ${loadTime.toFixed(2)}ms`, 'color: green');
          }
        }
        
        return result;
      } catch (err) {
        error = err instanceof Error ? err : new Error(String(err));
        
        // Log retry attempts
        if (debug) {
          console.warn(
            `Component loading failed (attempt ${retryCount + 1}/${retry.count + 1}): ${error.message}`
          );
        }
        
        // If we've exhausted retries, rethrow the error
        if (retryCount === retry.count) {
          if (trackPerformance && startTime) {
            MonitoringService.trackMetric({
              name: 'component_load_time',
              value: performance.now() - startTime,
              unit: 'ms',
              tags: ['performance', 'lazy_loading', 'failure']
            });
          }
          
          // Log error
          MonitoringService.logEvent({
            type: 'error',
            message: 'Failed to load lazy component',
            data: { error: error.message }
          });
          
          throw error;
        }
        
        // Otherwise, wait before retrying
        const retryDelay = retry.backoff
          ? retry.delay * Math.pow(2, retryCount)
          : retry.delay;
          
        await new Promise(resolve => setTimeout(resolve, retryDelay));
        retryCount++;
      }
    }
    
    // This should not happen due to the throw above
    throw new Error('Failed to load component: Unexpected error');
  };

  // Create lazy component
  const LazyComponent = lazy(enhancedFactory);

  // Prefetch component if requested
  if (prefetch) {
    // Use requestIdleCallback if available, otherwise setTimeout
    const schedule = typeof window !== 'undefined' && 'requestIdleCallback' in window
      ? (window as any).requestIdleCallback
      : (cb: () => void) => setTimeout(cb, 1000);

    schedule(() => {
      if (debug) {
        console.log('Prefetching lazy component...');
      }
      enhancedFactory().catch(() => {
        // Silence errors during prefetch
      });
    });
  }

  // Create wrapped component with error boundary and suspense
  const WrappedComponent: React.FC<React.ComponentProps<T>> = (props) => (
    <ErrorBoundary
      fallback={errorFallback || (
        (error, reset) => (
          <ErrorFallback 
            error={error} 
            resetErrorBoundary={reset} 
            message="Failed to load component"
          />
        )
      )}
    >
      <Suspense fallback={fallback}>
        <LazyComponent {...props} />
      </Suspense>
    </ErrorBoundary>
  );

  // Display name for debugging
  const componentName = (LazyComponent as any).displayName || 'LazyComponent';
  WrappedComponent.displayName = `Lazy(${componentName})`;

  return WrappedComponent;
}

/**
 * HOC for lazy loading a component
 * 
 * @param importFunc Function that imports the component
 * @param options Lazy loading options
 * @returns Higher-order component for lazy loading
 */
export function withLazy<T extends ComponentType<any>>(
  importFunc: () => Promise<{ default: T }>,
  options: LazyComponentOptions = {}
): React.FC<React.ComponentProps<T>> {
  return createLazyComponent(importFunc, options);
}

/**
 * Default loading fallback component
 */
export const DefaultLoadingFallback: React.FC<{
  message?: string;
  className?: string;
}> = ({ message = 'Loading...', className = '' }) => (
  <div className={`flex items-center justify-center p-4 text-gray-500 ${className}`}>
    <div className="w-5 h-5 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin mr-2"></div>
    <span>{message}</span>
  </div>
); 