'use client';

import React from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { X, AlertCircle, CheckCircle2, AlertTriangle, InfoIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const alertBannerVariants = cva(
  "w-full relative flex items-center transition-all duration-200 ease-in-out",
  {
    variants: {
      variant: {
        default: "bg-secondary text-secondary-foreground",
        success: "bg-green-50 dark:bg-green-950/30 text-green-700 dark:text-green-400 border-green-200 dark:border-green-900",
        warning: "bg-yellow-50 dark:bg-yellow-950/30 text-yellow-700 dark:text-yellow-400 border-yellow-200 dark:border-yellow-900",
        error: "bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-400 border-red-200 dark:border-red-900",
        info: "bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-900",
      },
      sticky: {
        true: "sticky top-0 z-50",
        false: "",
      },
      dismissable: {
        true: "pr-12",
        false: "",
      }
    },
    defaultVariants: {
      variant: "default",
      sticky: false,
      dismissable: true,
    },
  }
);

export interface AlertBannerProps extends React.HTMLAttributes<HTMLDivElement>, 
  VariantProps<typeof alertBannerVariants> {
  title?: string;
  description?: React.ReactNode;
  icon?: React.ReactNode;
  action?: React.ReactNode;
  onDismiss?: () => void;
}

export function AlertBanner({
  className,
  variant,
  sticky,
  dismissable,
  title,
  description,
  icon,
  action,
  onDismiss,
  ...props
}: AlertBannerProps) {
  const [dismissed, setDismissed] = React.useState(false);

  const handleDismiss = () => {
    setDismissed(true);
    onDismiss?.();
  };

  if (dismissed) return null;

  // Default icons based on variant
  let defaultIcon = <InfoIcon className="h-5 w-5" />;
  if (variant === 'success') defaultIcon = <CheckCircle2 className="h-5 w-5" />;
  if (variant === 'warning') defaultIcon = <AlertTriangle className="h-5 w-5" />;
  if (variant === 'error') defaultIcon = <AlertCircle className="h-5 w-5" />;

  return (
    <Alert
      className={cn(
        alertBannerVariants({ variant, sticky, dismissable }),
        className
      )}
      {...props}
    >
      {icon || defaultIcon}
      <div className="ml-3 flex-1">
        {title && <AlertTitle>{title}</AlertTitle>}
        {description && <AlertDescription>{description}</AlertDescription>}
      </div>
      {action && <div className="ml-auto mr-2">{action}</div>}
      {dismissable && (
        <Button
          variant="ghost"
          size="icon"
          className="absolute right-1 top-1 rounded-full opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
          onClick={handleDismiss}
        >
          <X className="h-4 w-4" />
          <span className="sr-only">Close</span>
        </Button>
      )}
    </Alert>
  );
}
