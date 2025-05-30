'use client';

import React from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { AlertCircle, RefreshCw } from 'lucide-react';

interface SupabaseErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

interface ErrorState {
  hasError: boolean;
  error?: Error;
}

export class SupabaseErrorBoundary extends React.Component<
  SupabaseErrorBoundaryProps,
  ErrorState
> {
  constructor(props: SupabaseErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    console.error('Supabase connection error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      // Custom error UI
      const errorMessage = this.state.error?.message || 'Unknown error';
      const isConnectionError = 
        errorMessage.includes('Failed to fetch') || 
        errorMessage.includes('Network') ||
        errorMessage.includes('ENOTFOUND') ||
        errorMessage.includes('connect');

      return (
        this.props.fallback || (
          <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-center">
            <div className="flex justify-center mb-4">
              <AlertCircle className="h-12 w-12 text-red-500" />
            </div>
            <h3 className="text-lg font-medium text-red-800 mb-2">
              {isConnectionError ? 'Database Connection Error' : 'Error Loading Data'}
            </h3>
            <p className="text-red-600 mb-4">
              {isConnectionError 
                ? 'Could not connect to the Supabase database. Please check your network connection and database status.'
                : errorMessage}
            </p>
            <div className="text-sm text-red-600 mb-4">
              {isConnectionError && (
                <ul className="list-disc text-left max-w-md mx-auto">
                  <li>Verify that your Supabase project is active (not paused)</li>
                  <li>Check if your network connection is working</li>
                  <li>Ensure your firewall isn't blocking database connections</li>
                  <li>Confirm that your API keys in .env.local are correct</li>
                </ul>
              )}
            </div>
            <Button 
              onClick={() => {
                this.setState({ hasError: false });
                window.location.reload();
              }}
              className="inline-flex items-center"
            >
              <RefreshCw className="mr-2 h-4 w-4" /> Try Again
            </Button>
          </div>
        )
      );
    }

    return this.props.children;
  }
}

// Hook for functional components
export function useSupabaseErrorHandler() {
  return {
    handleError: (error: unknown) => {
      console.error('Supabase error:', error);
      const message = error instanceof Error ? error.message : 'Database connection error';
      toast.error(message);
    }
  };
}
