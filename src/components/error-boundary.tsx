import * as React from 'react';
import { useStore } from '@/lib/store/store';
import { Button } from '@/components/ui/button';
import { AlertTriangle } from 'lucide-react';

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    console.error('Error caught by error boundary:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return <ErrorFallback error={this.state.error} />;
    }

    return this.props.children;
  }
}

interface ErrorFallbackProps {
  error: Error | null;
}

function ErrorFallback({ error }: ErrorFallbackProps) {
  const { addToast } = useStore();

  React.useEffect(() => {
    if (error) {
      addToast({
        type: 'error',
        message: 'An error occurred. Our team has been notified.',
        duration: 5000,
      });
    }
  }, [error, addToast]);

  return (
    <div className="flex h-[50vh] w-full flex-col items-center justify-center gap-4 p-4">
      <div className="flex items-center gap-2 text-red-600">
        <AlertTriangle className="h-6 w-6" />
        <h2 className="text-lg font-semibold">Something went wrong</h2>
      </div>
      <p className="max-w-md text-center text-muted-foreground">
        {error?.message || 'An unexpected error occurred. Please try again later.'}
      </p>
      <div className="flex gap-2">
        <Button
          variant="outline"
          onClick={() => window.location.reload()}
        >
          Refresh Page
        </Button>
        <Button
          variant="default"
          onClick={() => window.history.back()}
        >
          Go Back
        </Button>
      </div>
    </div>
  );
} 