/**
 * Standardized UI components for dashboard states (loading, error, empty)
 * Provides consistent UI patterns across all dashboard widgets
 */
import React from 'react';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button-standardized';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { AlertCircle, FileX, RefreshCw, XCircle } from 'lucide-react';

interface DashboardStateProps extends React.HTMLAttributes<HTMLDivElement> {
  title?: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
  children?: React.ReactNode;
}

/**
 * Loading state component for dashboard widgets
 */
export function DashboardLoading({
  title = 'Loading data...',
  description = 'Please wait while we fetch the latest information',
  className,
  ...props
}: DashboardStateProps) {
  return (
    <div
      className={cn(
        'w-full h-full min-h-[120px] flex flex-col items-center justify-center p-6',
        className
      )}
      {...props}
    >
      <LoadingSpinner size="lg" className="text-primary mb-4" />
      <h3 className="text-lg font-medium text-center mb-1">{title}</h3>
      <p className="text-sm text-muted-foreground text-center">{description}</p>
    </div>
  );
}

/**
 * Error state component for dashboard widgets
 */
export function DashboardError({
  title = 'Something went wrong',
  description = 'There was an error loading the data. Please try again.',
  actionLabel = 'Retry',
  onAction,
  className,
  children,
  ...props
}: DashboardStateProps) {
  return (
    <div
      className={cn(
        'w-full h-full min-h-[120px] flex flex-col items-center justify-center p-6',
        className
      )}
      {...props}
    >
      <div className="rounded-full bg-destructive/10 p-3 mb-4">
        <XCircle className="h-6 w-6 text-destructive" />
      </div>
      <h3 className="text-lg font-medium text-center mb-1">{title}</h3>
      <p className="text-sm text-muted-foreground text-center mb-4">{description}</p>
      {children}
      {onAction && (
        <Button
          onClick={onAction}
          variant="secondary"
          size="sm"
          className="mt-2"
        >
          <RefreshCw className="mr-2 h-4 w-4" />
          {actionLabel}
        </Button>
      )}
    </div>
  );
}

/**
 * Empty state component for dashboard widgets when no data is available
 */
export function DashboardEmpty({
  title = 'No data available',
  description = 'There is no data to display at this time.',
  actionLabel,
  onAction,
  className,
  children,
  ...props
}: DashboardStateProps) {
  return (
    <div
      className={cn(
        'w-full h-full min-h-[120px] flex flex-col items-center justify-center p-6',
        className
      )}
      {...props}
    >
      <div className="rounded-full bg-muted p-3 mb-4">
        <FileX className="h-6 w-6 text-muted-foreground" />
      </div>
      <h3 className="text-lg font-medium text-center mb-1">{title}</h3>
      <p className="text-sm text-muted-foreground text-center mb-4">{description}</p>
      {children}
      {onAction && actionLabel && (
        <Button
          onClick={onAction}
          variant="outline"
          size="sm"
          className="mt-2"
        >
          {actionLabel}
        </Button>
      )}
    </div>
  );
}

/**
 * Alert state component for dashboard widgets (warnings, notifications)
 */
export function DashboardAlert({
  title = 'Attention required',
  description,
  actionLabel,
  onAction,
  className,
  children,
  ...props
}: DashboardStateProps) {
  return (
    <div
      className={cn(
        'w-full rounded-md border border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/30 p-4',
        className
      )}
      {...props}
    >
      <div className="flex items-start gap-4">
        <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-500 mt-0.5" />
        <div className="flex-1">
          <h4 className="text-sm font-medium text-amber-800 dark:text-amber-400">{title}</h4>
          {description && <p className="text-sm mt-1 text-amber-700 dark:text-amber-400/90">{description}</p>}
          {children}
          {onAction && actionLabel && (
            <Button
              onClick={onAction}
              variant="ghost"
              size="sm"
              className="mt-2 text-amber-700 dark:text-amber-400 hover:text-amber-800 hover:bg-amber-100 dark:hover:bg-amber-900/40"
            >
              {actionLabel}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Widget wrapper that handles loading, error and empty states
 */
interface DashboardWidgetStateProps<T> {
  data: T[] | undefined;
  isLoading: boolean;
  isError: boolean;
  isEmpty?: boolean;
  error?: Error | null;
  loadingComponent?: React.ReactNode;
  errorComponent?: React.ReactNode;
  emptyComponent?: React.ReactNode;
  onRetry?: () => void;
  children: React.ReactNode;
}

export function DashboardWidgetState<T>({
  data,
  isLoading,
  isError,
  isEmpty,
  error,
  loadingComponent,
  errorComponent,
  emptyComponent,
  onRetry,
  children,
}: DashboardWidgetStateProps<T>) {
  if (isLoading) {
    return loadingComponent || <DashboardLoading />;
  }

  if (isError) {
    return errorComponent || (
      <DashboardError
        description={error?.message || 'Failed to load data'}
        onAction={onRetry}
      />
    );
  }

  if (!data || data.length === 0 || isEmpty) {
    return emptyComponent || <DashboardEmpty />;
  }

  return <>{children}</>;
}
