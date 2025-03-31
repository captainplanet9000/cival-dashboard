'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from '@/components/ui/fixed-dialog';
import { 
  Maximize2, 
  Minimize2, 
  X, 
  Settings, 
  GripVertical,
  Move,
  RefreshCw,
  LayoutGrid,
  Trash
} from 'lucide-react';
import { cn } from '@/utils/cn';
import { useToast } from '@/components/ui/use-toast';

interface WidgetContainerProps {
  id: string;
  title: string;
  description?: string;
  className?: string;
  children: React.ReactNode;
  onRemove?: (id: string) => void;
  onSettings?: (id: string) => void;
  onRefresh?: (id: string) => void;
  isLoading?: boolean;
  minWidth?: number;
  minHeight?: number;
  defaultSize?: { width: number; height: number };
  resizable?: boolean;
  draggable?: boolean;
  collapsible?: boolean;
  defaultCollapsed?: boolean;
  removable?: boolean;
  showSettings?: boolean;
  showRefresh?: boolean;
}

export function WidgetContainer({
  id,
  title,
  description,
  className,
  children,
  onRemove,
  onSettings,
  onRefresh,
  isLoading = false,
  minWidth = 250,
  minHeight = 150,
  defaultSize,
  resizable = true,
  draggable = true,
  collapsible = true,
  defaultCollapsed = false,
  removable = true,
  showSettings = true,
  showRefresh = true,
}: WidgetContainerProps) {
  const [isCollapsed, setIsCollapsed] = useState(defaultCollapsed);
  const [isMaximized, setIsMaximized] = useState(false);
  const [confirmRemove, setConfirmRemove] = useState(false);
  const { toast } = useToast();
  
  const handleRemove = () => {
    if (onRemove) {
      onRemove(id);
      toast({
        title: "Widget removed",
        description: `${title} has been removed from your dashboard.`,
      });
    }
    setConfirmRemove(false);
  };
  
  const handleRefresh = () => {
    if (onRefresh) {
      onRefresh(id);
      toast({
        description: `${title} is refreshing...`,
      });
    }
  };
  
  return (
    <Card 
      className={cn(
        "shadow-md transition-all duration-200",
        isMaximized ? "fixed inset-4 z-50" : "",
        className
      )}
      style={{
        minWidth: minWidth,
        minHeight: !isCollapsed ? minHeight : undefined,
        ...(defaultSize && !isMaximized && !isCollapsed ? {
          width: defaultSize.width,
          height: defaultSize.height,
        } : {})
      }}
    >
      <CardHeader className="px-4 py-2 flex flex-row items-center justify-between space-y-0">
        <div className="flex-1 overflow-hidden">
          {draggable && (
            <div className="float-left mr-2 cursor-move text-muted-foreground hover:text-foreground">
              <GripVertical size={16} />
            </div>
          )}
          <CardTitle className="text-md truncate">{title}</CardTitle>
          {description && !isCollapsed && (
            <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
          )}
        </div>
        
        <div className="flex items-center space-x-1">
          {showRefresh && onRefresh && (
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-7 w-7" 
              onClick={handleRefresh}
              disabled={isLoading}
            >
              <RefreshCw 
                size={14} 
                className={cn(isLoading && "animate-spin")} 
              />
            </Button>
          )}
          
          {showSettings && onSettings && (
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-7 w-7" 
              onClick={() => onSettings(id)}
            >
              <Settings size={14} />
            </Button>
          )}
          
          {collapsible && (
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-7 w-7" 
              onClick={() => setIsCollapsed(!isCollapsed)}
            >
              {isCollapsed ? (
                <Maximize2 size={14} />
              ) : (
                <Minimize2 size={14} />
              )}
            </Button>
          )}
          
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-7 w-7" 
            onClick={() => setIsMaximized(!isMaximized)}
          >
            {isMaximized ? (
              <Minimize2 size={14} />
            ) : (
              <Maximize2 size={14} />
            )}
          </Button>
          
          {removable && (
            <Dialog open={confirmRemove} onOpenChange={setConfirmRemove}>
              <DialogTrigger asChild>
                <Button variant="ghost" size="icon" className="h-7 w-7 hover:text-destructive">
                  <X size={14} />
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Remove Widget</DialogTitle>
                  <DialogDescription>
                    Are you sure you want to remove the {title} widget from your dashboard?
                  </DialogDescription>
                </DialogHeader>
                <DialogFooter className="mt-4">
                  <Button 
                    variant="outline" 
                    onClick={() => setConfirmRemove(false)}
                  >
                    Cancel
                  </Button>
                  <Button 
                    variant="destructive" 
                    onClick={handleRemove}
                  >
                    Remove Widget
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </CardHeader>
      
      {!isCollapsed && (
        <>
          <Separator />
          <CardContent className={cn(
            "p-4 transition-all duration-200",
            isMaximized ? "overflow-auto max-h-[calc(100vh-8rem)]" : ""
          )}>
            {children}
          </CardContent>
        </>
      )}
    </Card>
  );
}
