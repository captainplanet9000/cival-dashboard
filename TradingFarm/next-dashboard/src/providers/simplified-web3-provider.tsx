'use client';

import React, { ReactNode, useState, useEffect } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Simplified Web3Provider that removes potentially problematic wagmi hooks
export const SimplifiedWeb3Provider = ({ children }: { children: ReactNode }) => {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        retry: 3,
        staleTime: 5 * 60 * 1000, // 5 minutes
      },
    },
  }));

  // Error tracking
  const [hasError, setHasError] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    const handleError = (event: ErrorEvent) => {
      console.error('Global error captured:', event);
      setHasError(true);
      setErrorMessage(event.message);
      // Return true to prevent default error handler
      return true;
    };

    window.addEventListener('error', handleError);
    return () => {
      window.removeEventListener('error', handleError);
    };
  }, []);

  if (hasError) {
    return (
      <div className="p-6 max-w-md mx-auto my-12 bg-red-50 rounded-lg border border-red-200 text-red-700">
        <h2 className="text-lg font-semibold mb-2">Error in Web3Provider</h2>
        <p className="mb-4">{errorMessage || 'An unknown error occurred in the Web3Provider'}</p>
        <button 
          onClick={() => window.location.reload()} 
          className="px-4 py-2 bg-red-100 hover:bg-red-200 rounded-md text-sm font-medium transition-colors"
        >
          Reload Page
        </button>
      </div>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
};

// A wrapper with additional error handling
export function SafeSimplifiedWeb3Provider({ children }: { children: ReactNode }) {
  return (
    <ErrorBoundary>
      <SimplifiedWeb3Provider>
        {children}
      </SimplifiedWeb3Provider>
    </ErrorBoundary>
  );
}

// Error boundary component
class ErrorBoundary extends React.Component<
  { children: ReactNode },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Error caught by ErrorBoundary:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-6 max-w-md mx-auto my-12 bg-red-50 rounded-lg border border-red-200 text-red-700">
          <h2 className="text-lg font-semibold mb-2">Something went wrong</h2>
          <p className="mb-4">{this.state.error?.message || 'An unknown error occurred'}</p>
          <button 
            onClick={() => window.location.reload()} 
            className="px-4 py-2 bg-red-100 hover:bg-red-200 rounded-md text-sm font-medium transition-colors"
          >
            Reload Page
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
