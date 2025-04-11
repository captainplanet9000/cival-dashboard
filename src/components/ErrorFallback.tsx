import React from 'react';
import { errorTracking } from '../services/error-tracking/error-tracking';

interface ErrorFallbackProps {
  error: Error;
  resetErrorBoundary?: () => void;
  componentStack?: string;
  errorInfo?: React.ErrorInfo;
  errorId?: string | null;
  retry?: boolean;
  allowDismiss?: boolean;
  message?: string;
}

/**
 * Error Fallback Component
 * 
 * A customizable error fallback UI component for use with Error Boundaries.
 * Displays error details and provides options to retry/reset or dismiss.
 */
export const ErrorFallback: React.FC<ErrorFallbackProps> = ({
  error,
  resetErrorBoundary,
  componentStack,
  errorInfo,
  errorId,
  retry = true,
  allowDismiss = true,
  message
}) => {
  // Log the error to our error tracking service
  React.useEffect(() => {
    if (error) {
      const context = {
        componentStack: componentStack || errorInfo?.componentStack || 'Not available',
        errorId: errorId || 'Not available'
      };
      
      errorTracking.captureException(error, context);
    }
  }, [error, componentStack, errorInfo, errorId]);

  // Get the error details
  const errorMessage = message || error?.message || 'An unexpected error occurred';
  const errorName = error?.name || 'Error';
  const stack = error?.stack;
  
  // Only show stack trace in development
  const showStack = process.env.NODE_ENV === 'development';
  
  return (
    <div className="error-fallback rounded-lg border border-red-200 bg-red-50 p-4 shadow-sm">
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-lg font-semibold text-red-800">{errorName}</h3>
          <p className="mt-1 text-red-700">{errorMessage}</p>
          
          {showStack && stack && (
            <details className="mt-3">
              <summary className="cursor-pointer text-sm text-red-600 hover:text-red-800">
                Show stack trace
              </summary>
              <pre className="mt-2 max-h-[300px] overflow-auto rounded bg-red-100 p-2 text-xs text-red-800">
                {stack}
              </pre>
            </details>
          )}
          
          {showStack && componentStack && (
            <details className="mt-2">
              <summary className="cursor-pointer text-sm text-red-600 hover:text-red-800">
                Show component stack
              </summary>
              <pre className="mt-2 max-h-[300px] overflow-auto rounded bg-red-100 p-2 text-xs text-red-800">
                {componentStack}
              </pre>
            </details>
          )}
          
          {errorId && (
            <p className="mt-3 text-xs text-red-500">
              Error ID: {errorId}
            </p>
          )}
        </div>
        
        {allowDismiss && (
          <button
            className="rounded-full p-1 text-red-400 hover:bg-red-100 hover:text-red-600"
            onClick={() => resetErrorBoundary?.()}
            title="Dismiss"
          >
            <svg 
              xmlns="http://www.w3.org/2000/svg" 
              className="h-5 w-5" 
              viewBox="0 0 20 20" 
              fill="currentColor"
            >
              <path 
                fillRule="evenodd" 
                d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" 
                clipRule="evenodd" 
              />
            </svg>
          </button>
        )}
      </div>
      
      {retry && resetErrorBoundary && (
        <div className="mt-4">
          <button
            onClick={resetErrorBoundary}
            className="rounded bg-red-100 px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-200 focus:outline-none focus:ring-2 focus:ring-red-400 focus:ring-offset-2"
          >
            Try again
          </button>
        </div>
      )}
    </div>
  );
};

/**
 * Default error fallback for use with React Error Boundary
 * 
 * @param props Error props from React Error Boundary
 * @returns Error fallback component
 */
export const DefaultErrorFallback = ({ 
  error, 
  resetErrorBoundary 
}: { 
  error: Error; 
  resetErrorBoundary: () => void 
}): React.ReactElement => {
  return (
    <ErrorFallback
      error={error}
      resetErrorBoundary={resetErrorBoundary}
      retry={true}
      allowDismiss={true}
    />
  );
}; 