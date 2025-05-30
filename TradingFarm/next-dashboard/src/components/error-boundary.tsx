'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertTriangle } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

/**
 * ErrorBoundary component for catching and displaying React errors
 * Helps with debugging client-side rendering issues
 */
class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    this.setState({ errorInfo });
  }

  public render(): ReactNode {
    if (this.state.hasError) {
      const { error, errorInfo } = this.state;
      
      // Custom fallback UI if provided
      if (this.props.fallback) {
        return this.props.fallback;
      }
      
      // Default error UI
      return (
        <Card className="mx-auto max-w-2xl my-8 border-destructive">
          <CardHeader className="bg-destructive/10">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              <CardTitle className="text-destructive">Something went wrong</CardTitle>
            </div>
            <CardDescription>
              The application encountered an unexpected error
            </CardDescription>
          </CardHeader>
          <CardContent className="mt-4">
            <div className="rounded bg-muted p-4 font-mono text-sm overflow-auto max-h-[300px]">
              <p className="font-semibold">{error?.toString()}</p>
              {errorInfo && (
                <pre className="mt-2 text-xs whitespace-pre-wrap">
                  {errorInfo.componentStack}
                </pre>
              )}
            </div>
          </CardContent>
          <CardFooter className="flex justify-between">
            <Button 
              variant="outline" 
              onClick={() => window.location.reload()}
            >
              Reload page
            </Button>
            <Button 
              onClick={() => this.setState({ hasError: false, error: null, errorInfo: null })}
            >
              Try again
            </Button>
          </CardFooter>
        </Card>
      );
    }

    return this.props.children;
  }
}

export { ErrorBoundary };
