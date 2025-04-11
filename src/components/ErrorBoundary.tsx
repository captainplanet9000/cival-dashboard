import React, { Component, ErrorInfo, ReactNode } from 'react';
import { MonitoringService } from '../services/monitoring-service';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode | ((error: Error, reset: () => void) => ReactNode);
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  onReset?: () => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

/**
 * Error Boundary Component
 * 
 * Catches JavaScript errors anywhere in its child component tree,
 * logs those errors, and displays a fallback UI instead of the component
 * tree that crashed.
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null
    };
  }

  /**
   * Update state so the next render will show the fallback UI
   */
  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      error
    };
  }

  /**
   * Log the error to monitoring service
   */
  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    // Log error to monitoring service
    MonitoringService.logEvent({
      type: 'error',
      message: 'React error boundary caught an error',
      data: { 
        error: error.toString(),
        componentStack: errorInfo.componentStack
      }
    });

    // Call onError prop if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  /**
   * Reset the error boundary to its initial state
   */
  resetErrorBoundary = (): void => {
    // Call onReset prop if provided
    if (this.props.onReset) {
      this.props.onReset();
    }

    this.setState({
      hasError: false,
      error: null
    });
  };

  render() {
    if (this.state.hasError && this.state.error) {
      // Render fallback UI
      if (this.props.fallback) {
        if (typeof this.props.fallback === 'function') {
          return this.props.fallback(this.state.error, this.resetErrorBoundary);
        }
        return this.props.fallback;
      }

      // Default error UI
      return (
        <div className="error-boundary p-4 rounded border border-red-300 bg-red-50">
          <h2 className="text-lg font-semibold text-red-800 mb-2">Something went wrong</h2>
          <p className="text-red-600 mb-4">{this.state.error.message || 'An unexpected error occurred'}</p>
          <button
            onClick={this.resetErrorBoundary}
            className="px-4 py-2 bg-red-100 hover:bg-red-200 text-red-800 rounded transition-colors"
          >
            Try again
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

/**
 * withErrorBoundary HOC
 * 
 * Higher-order component that wraps a component with an ErrorBoundary
 */
export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  errorBoundaryProps: Omit<ErrorBoundaryProps, 'children'> = {}
): React.ComponentType<P> {
  const displayName = Component.displayName || Component.name || 'Component';

  const WrappedComponent = (props: P): JSX.Element => (
    <ErrorBoundary {...errorBoundaryProps}>
      <Component {...props} />
    </ErrorBoundary>
  );

  WrappedComponent.displayName = `withErrorBoundary(${displayName})`;

  return WrappedComponent;
}

/**
 * useErrorBoundary hook
 * 
 * Hook that allows functional components to explicitly throw errors to be caught by an ErrorBoundary
 * and optionally reset the nearest error boundary
 */
export function useErrorHandler(): [(error: Error) => void, () => void] {
  const [error, setError] = React.useState<Error | null>(null);
  
  // Throw the error if one exists to be caught by the nearest error boundary
  if (error) {
    throw error; 
  }
  
  // Function to trigger an error
  const handleError = React.useCallback((error: Error) => {
    setError(error);
  }, []);

  // Function to find and reset the nearest error boundary
  const resetErrorBoundary = React.useCallback(() => {
    // This is a custom event that error boundaries can listen for
    const event = new CustomEvent('reset-error-boundary');
    window.dispatchEvent(event);
  }, []);
  
  return [handleError, resetErrorBoundary];
}