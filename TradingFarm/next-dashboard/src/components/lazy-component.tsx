'use client';

import React, { Suspense, lazy, ComponentType, LazyExoticComponent } from 'react';
import { Loader2 } from 'lucide-react';

interface LazyComponentProps<T> {
  /** Factory function that returns a promise resolving to the component module */
  factory: () => Promise<{ default: ComponentType<T> }>;
  /** Props to pass to the lazy-loaded component */
  props?: T;
  /** Optional fallback component instead of default loader */
  fallback?: React.ReactNode;
  /** Debug identifier for tracking which components are being loaded */
  id?: string;
}

/**
 * A wrapper for lazy-loaded components with proper suspense boundary
 * and standardized loading state
 */
export function LazyComponent<T>({
  factory,
  props,
  fallback,
  id
}: LazyComponentProps<T>): JSX.Element {
  // Create the lazy component
  const LazyLoadedComponent: LazyExoticComponent<ComponentType<T>> = lazy(factory);

  // For debugging which components are being loaded
  React.useEffect(() => {
    if (process.env.NODE_ENV === 'development' && id) {
      console.log(`[LazyComponent] Loading component: ${id}`);
      
      // Measure time to load
      const startTime = performance.now();
      
      return () => {
        const loadTime = performance.now() - startTime;
        console.log(`[LazyComponent] Component loaded: ${id} (${loadTime.toFixed(2)}ms)`);
      };
    }
  }, [id]);

  // Default loading indicator if no custom fallback is provided
  const defaultFallback = (
    <div className="flex justify-center items-center w-full h-full min-h-[200px]">
      <Loader2 className="w-8 h-8 animate-spin text-primary" />
    </div>
  );

  return (
    <Suspense fallback={fallback ?? defaultFallback}>
      <LazyLoadedComponent {...(props as T)} />
    </Suspense>
  );
}
