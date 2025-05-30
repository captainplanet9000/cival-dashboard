'use client';

import React from 'react';

// Define ReactNode type for components
type ReactNode = React.ReactNode;
import { CommandConsole } from '@/components/elizaos/command-console';
import { useTheme } from 'next-themes';
import { cn } from '@/lib/utils';

interface WidgetProps {
  title: string;
  className?: string;
  height?: 'small' | 'medium' | 'large';
  width?: 'small' | 'medium' | 'large' | 'full';
  children: ReactNode;
  collapsible?: boolean;
}

const Widget = ({
  title,
  className,
  height = 'medium',
  width = 'medium',
  children,
  collapsible = true,
}: WidgetProps) => {
  const [isCollapsed, setIsCollapsed] = React.useState(false);

  const heightClass = {
    small: 'h-[200px]',
    medium: 'h-[300px]',
    large: 'h-[500px]',
  }[height];

  const widthClass = {
    small: 'w-full lg:w-1/3',
    medium: 'w-full lg:w-1/2',
    large: 'w-full lg:w-2/3',
    full: 'w-full',
  }[width];

  return (
    <div className={cn(
      'border rounded-md overflow-hidden bg-card shadow-sm flex flex-col', 
      widthClass,
      !isCollapsed && heightClass,
      className
    )}>
      <div className="flex justify-between items-center px-4 py-3 border-b bg-muted/30">
        <h3 className="font-medium">{title}</h3>
        {collapsible && (
          <button 
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="text-muted-foreground hover:text-foreground ml-2"
          >
            {isCollapsed ? (
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="18 15 12 9 6 15"></polyline>
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="6 9 12 15 18 9"></polyline>
              </svg>
            )}
          </button>
        )}
      </div>
      <div className={cn(
        "transition-all duration-300 ease-in-out flex-1",
        isCollapsed ? 'h-0 p-0 overflow-hidden' : 'p-4 overflow-auto'
      )}>
        {children}
      </div>
    </div>
  );
};

interface ElizaOSCentricLayoutProps {
  farmId: string;
  title?: string;
  description?: string;
  actions?: ReactNode;
  topWidgets?: ReactNode;
  leftWidgets?: ReactNode;
  rightWidgets?: ReactNode;
  bottomWidgets?: ReactNode;
  centerWidgets?: ReactNode;
}

export function ElizaOSCentricLayout({
  farmId,
  title,
  description,
  actions,
  topWidgets,
  leftWidgets,
  rightWidgets,
  bottomWidgets,
  centerWidgets,
}: ElizaOSCentricLayoutProps) {
  const { theme } = useTheme();
  const scrollContainerRef = React.useRef<HTMLDivElement>(null);
  
  return (
    <div className="min-h-screen flex flex-col py-6 px-4 overflow-hidden">
      {/* Header with title and actions if provided */}
      {(title || actions) && (
        <div className="container mx-auto max-w-7xl mb-6">
          <div className="flex justify-between items-center border-b pb-4 mb-4">
            <div>
              {title && <h1 className="text-2xl font-bold">{title}</h1>}
              {description && <p className="text-sm text-muted-foreground">{description}</p>}
            </div>
            {actions && (
              <div className="flex items-center">
                {actions}
              </div>
            )}
          </div>
        </div>
      )}
      
      <div className="container mx-auto max-w-7xl flex-1 flex flex-col space-y-8">
        {/* ElizaOS Command Console - Main Focal Point */}
        <div className="w-full border rounded-md shadow-md overflow-hidden bg-card h-[40vh] min-h-[350px] flex flex-col">
          <div className="bg-muted/50 p-3 border-b flex justify-between items-center">
            <h3 className="font-medium">ElizaOS Command Console</h3>
            <div className="flex items-center space-x-2 text-xs text-muted-foreground">
              <span>{farmId ? `Farm ID: ${farmId}` : 'No Farm Selected'}</span>
              <span className="px-2 py-0.5 rounded-full bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300">Active</span>
            </div>
          </div>
          <div className="flex-1 overflow-hidden">
            <CommandConsole 
              farmId={farmId}
              height="full"
              className="border-0 shadow-none h-full w-full flex-1 flex flex-col"
              autoScroll={true}
            />
          </div>
        </div>
        
        {/* Scrollable Dashboard Content Below Console */}
        <div 
          ref={scrollContainerRef}
          className="flex-1 overflow-y-auto pr-2 pb-6 space-y-8 dashboard-content-area"
          style={{ 
            maxHeight: 'calc(60vh - 2rem)',
            scrollbarWidth: 'thin',
            scrollbarColor: theme === 'dark' ? '#4b5563 #1f2937' : '#d1d5db #f3f4f6' 
          }}
        >
          {/* Top row widgets */}
          {topWidgets && (
            <div className="flex flex-wrap gap-6">
              {topWidgets}
            </div>
          )}
          
          {/* Main content area with side widgets */}
          <div className="flex flex-col lg:flex-row gap-8">
            {/* Left column widgets */}
            {leftWidgets && (
              <div className="w-full lg:w-1/4 space-y-8 mb-8 lg:mb-0">
                {leftWidgets}
              </div>
            )}
            
            {/* Center column - Custom content */}
            {centerWidgets && (
              <div className="w-full lg:flex-1 flex flex-col">
                {centerWidgets}
              </div>
            )}
            
            {/* Right column widgets */}
            {rightWidgets && (
              <div className="w-full lg:w-1/4 space-y-8 mb-8 lg:mb-0">
                {rightWidgets}
              </div>
            )}
          </div>
          
          {/* Bottom row widgets */}
          {bottomWidgets && (
            <div className="flex flex-wrap gap-6 mt-8">
              {bottomWidgets}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Export the Widget component as well for use with the layout
export { Widget };
