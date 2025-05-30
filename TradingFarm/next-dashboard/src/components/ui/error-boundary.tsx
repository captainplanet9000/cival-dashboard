'use client';

import React from 'react';

import { logEvent } from '@/utils/logging';

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback: React.ReactNode;
  onError?: (error: Error) => void;
}

/**
 * Simple error boundary component using React state
 * This avoids TypeScript class component issues
 */
export function ErrorBoundary({ children, fallback, onError }: ErrorBoundaryProps) {
  const [hasError, setHasError] = React.useState(false);
  
  // Handle errors in render phase
  React.useEffect(() => {
    const errorHandler = (event: ErrorEvent) => {
      console.error('ErrorBoundary caught error:', event.error);
      
      // Log to analytics
      logEvent({
        category: 'error',
        action: 'react_error',
        label: event.error?.message || 'Unknown error',
        value: 1
      });
      
      if (onError) {
        onError(event.error);
      }
      
      setHasError(true);
      
      // Prevent the browser from showing the default error dialog
      event.preventDefault();
    };
    
    window.addEventListener('error', errorHandler);
    
    return () => {
      window.removeEventListener('error', errorHandler);
    };
  }, [onError]);

  if (hasError) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}
