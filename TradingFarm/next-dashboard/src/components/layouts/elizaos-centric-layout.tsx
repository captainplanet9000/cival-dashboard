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
    small: 'w-full md:w-1/3',
    medium: 'w-full md:w-1/2',
    large: 'w-full md:w-2/3',
    full: 'w-full',
  }[width];

  return (
    <div className={cn(
      'border rounded-md overflow-hidden bg-card shadow-sm', 
      widthClass,
      !isCollapsed && heightClass,
      className
    )}>
      <div className="flex justify-between items-center p-3 border-b bg-muted/30">
        <h3 className="font-medium text-sm">{title}</h3>
        {collapsible && (
          <button 
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="text-muted-foreground hover:text-foreground"
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
        "transition-all duration-300 ease-in-out",
        isCollapsed ? 'h-0 p-0 overflow-hidden' : 'p-3 overflow-auto'
      )}>
        {children}
      </div>
    </div>
  );
};

interface ElizaOSCentricLayoutProps {
  farmId: string;
  topWidgets?: ReactNode;
  leftWidgets?: ReactNode;
  rightWidgets?: ReactNode;
  bottomWidgets?: ReactNode;
}

export function ElizaOSCentricLayout({
  farmId,
  topWidgets,
  leftWidgets,
  rightWidgets,
  bottomWidgets,
}: ElizaOSCentricLayoutProps) {
  const { theme } = useTheme();
  
  return (
    <div className="container mx-auto p-3">
      {/* Top row widgets */}
      {topWidgets && (
        <div className="flex flex-wrap gap-4 mb-4">
          {topWidgets}
        </div>
      )}
      
      {/* Main content area with side widgets and center console */}
      <div className="flex flex-col md:flex-row gap-4 mb-4">
        {/* Left column widgets */}
        {leftWidgets && (
          <div className="w-full md:w-1/4 space-y-4">
            {leftWidgets}
          </div>
        )}
        
        {/* Center column - ElizaOS Command Console */}
        <div className="w-full md:flex-1 flex flex-col">
          <div className="border rounded-md shadow-md overflow-hidden bg-card flex-1 flex flex-col">
            <CommandConsole 
              farmId={farmId}
              height="full"
              className="border-0 shadow-none h-[calc(100vh-220px)] max-h-[800px] flex-1 flex flex-col"
              autoScroll={true}
            />
          </div>
        </div>
        
        {/* Right column widgets */}
        {rightWidgets && (
          <div className="w-full md:w-1/4 space-y-4">
            {rightWidgets}
          </div>
        )}
      </div>
      
      {/* Bottom row widgets */}
      {bottomWidgets && (
        <div className="flex flex-wrap gap-4">
          {bottomWidgets}
        </div>
      )}
    </div>
  );
}

// Export the Widget component as well for use with the layout
export { Widget };
