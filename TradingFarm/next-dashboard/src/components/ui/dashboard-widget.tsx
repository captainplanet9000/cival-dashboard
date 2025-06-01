'use client';

import React from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Maximize2, RefreshCw, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { widgetStyles } from '@/components/ui/component-styles';
import {
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { DialogWrapper } from '@/components/ui/dialog-wrapper';

export interface DashboardWidgetProps {
  title: string;
  description?: string;
  className?: string;
  headerClassName?: string;
  contentClassName?: string;
  footerClassName?: string;
  isLoading?: boolean;
  isExpandable?: boolean;
  isRefreshable?: boolean;
  isRemovable?: boolean;
  footerContent?: React.ReactNode;
  onRefresh?: () => void;
  onRemove?: () => void;
  children: React.ReactNode;
}

export function DashboardWidget({
  title,
  description,
  className,
  headerClassName,
  contentClassName,
  footerClassName,
  isLoading = false,
  isExpandable = false,
  isRefreshable = false,
  isRemovable = false,
  footerContent,
  onRefresh,
  onRemove,
  children
}: DashboardWidgetProps) {
  const [isExpanded, setIsExpanded] = React.useState(false);
  const [isRefreshing, setIsRefreshing] = React.useState(false);

  const handleRefresh = async () => {
    if (!onRefresh || isRefreshing) return;
    
    setIsRefreshing(true);
    try {
      await onRefresh();
    } finally {
      setIsRefreshing(false);
    }
  };

  const renderContent = () => {
    if (isLoading) {
      return (
        <div className="space-y-3">
          <Skeleton className="h-5 w-3/4" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-5 w-1/2" />
        </div>
      );
    }
    
    return children;
  };

  const renderWidget = () => (
    <Card className={cn('trading-card overflow-hidden h-full', widgetStyles({ size: 'default' }), className)}>
      <CardHeader className={cn('space-y-1 border-b', headerClassName)}>
        <div className="flex justify-between items-center">
          <div>
            <CardTitle className="text-xl">{title}</CardTitle>
            {description && <CardDescription>{description}</CardDescription>}
          </div>
          <div className="flex items-center space-x-1">
            {isRefreshable && (
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-7 w-7" 
                onClick={handleRefresh}
                disabled={isRefreshing}
              >
                <RefreshCw 
                  className={cn("h-4 w-4", isRefreshing && "animate-spin")} 
                />
                <span className="sr-only">Refresh</span>
              </Button>
            )}
            {isExpandable && (
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-7 w-7" 
                onClick={() => setIsExpanded(true)}
              >
                <Maximize2 className="h-4 w-4" />
                <span className="sr-only">Expand</span>
              </Button>
            )}
            {isRemovable && onRemove && (
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-7 w-7" 
                onClick={onRemove}
              >
                <X className="h-4 w-4" />
                <span className="sr-only">Remove</span>
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className={cn("p-4 pt-0", contentClassName)}>
        {renderContent()}
      </CardContent>
      {(footerContent || (footerClassName && !isLoading)) && (
        <CardFooter className={cn("p-4 pt-0", footerClassName)}>
          {!isLoading && footerContent}
        </CardFooter>
      )}
    </Card>
  );

  if (!isExpandable) {
    return renderWidget();
  }

  return (
    <>
      {renderWidget()}
      
      <DialogWrapper open={isExpanded} onOpenChange={setIsExpanded}>
        <DialogContent className="sm:max-w-[90vw] max-h-[90vh] overflow-auto">
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            {description && <DialogDescription>{description}</DialogDescription>}
          </DialogHeader>
          <div className="py-4">
            {children}
          </div>
          {footerContent && (
            <div className="pt-0">
              {footerContent}
            </div>
          )}
        </DialogContent>
      </DialogWrapper>
    </>
  );
}
