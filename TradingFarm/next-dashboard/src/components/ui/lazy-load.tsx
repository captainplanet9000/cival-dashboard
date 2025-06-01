"use client";

import React, { Suspense } from 'react';
import { Loader2 } from 'lucide-react';

interface LazyLoadProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

/**
 * LazyLoad component for implementing code splitting
 * Wraps dynamic imports to provide a consistent loading experience
 */
export function LazyLoad({ children, fallback }: LazyLoadProps) {
  const defaultFallback = (
    <div className="flex items-center justify-center w-full h-full min-h-[100px]">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  );

  return (
    <Suspense fallback={fallback || defaultFallback}>
      {children}
    </Suspense>
  );
}

/**
 * Factory function to create dynamically imported components
 * @example
 * // In a component file:
 * export const DynamicChart = createLazyComponent(() => import('@/components/charts/complex-chart'));
 * 
 * // In a page:
 * <DynamicChart {...props} />
 */
export function createLazyComponent<T extends React.ComponentType<any>>(
  importFunc: () => Promise<{ default: T }>,
  options?: {
    fallback?: React.ReactNode;
    ssr?: boolean;
  }
) {
  const LazyComponent = React.lazy(importFunc);

  // Forward ref if needed
  const Component = React.forwardRef((props: React.ComponentProps<T>, ref) => (
    <LazyLoad fallback={options?.fallback}>
      <LazyComponent {...props} ref={ref} />
    </LazyLoad>
  ));
  
  // Add display name for debugging
  const importFuncString = importFunc.toString();
  const matchResult = /import\(['"](.+?)['"]\)/.exec(importFuncString);
  Component.displayName = `Lazy(${matchResult ? matchResult[1].split('/').pop() : 'Component'})`;

  return Component;
}

/**
 * HOC to wrap heavy components for lazy loading
 * @example
 * // In component file:
 * export default withLazyLoading(HeavyComponent);
 * 
 * // Usage remains the same as original component
 */
export function withLazyLoading<T extends React.ComponentType<any>>(
  Component: T,
  options?: { fallback?: React.ReactNode }
) {
  const WrappedComponent = (props: React.ComponentProps<T>) => (
    <LazyLoad fallback={options?.fallback}>
      <Component {...props} />
    </LazyLoad>
  );

  WrappedComponent.displayName = `LazyLoaded(${Component.displayName || Component.name || 'Component'})`;
  return WrappedComponent;
}
