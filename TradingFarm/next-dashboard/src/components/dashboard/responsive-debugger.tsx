'use client';

import React, { useEffect, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Smartphone, Tablet, Monitor, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { 
  Tooltip, 
  TooltipContent, 
  TooltipProvider, 
  TooltipTrigger 
} from '@/components/ui/tooltip';

/**
 * ResponsiveDebugger component for testing responsive layouts
 * Only enabled in development mode and when query param ?responsive=true is present
 */
export function ResponsiveDebugger() {
  const [isEnabled, setIsEnabled] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [viewportSize, setViewportSize] = useState({
    width: 0,
    height: 0,
    breakpoint: ''
  });

  useEffect(() => {
    // Only enable in development
    if (process.env.NODE_ENV !== 'development') {
      return;
    }

    // Check for query param
    const searchParams = new URLSearchParams(window.location.search);
    const showResponsive = searchParams.get('responsive') === 'true';
    setIsEnabled(showResponsive);
    setIsVisible(showResponsive);

    const updateViewportSize = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      
      // Determine Tailwind breakpoint
      let breakpoint = 'xs';
      if (width >= 640) breakpoint = 'sm';
      if (width >= 768) breakpoint = 'md';
      if (width >= 1024) breakpoint = 'lg';
      if (width >= 1280) breakpoint = 'xl';
      if (width >= 1536) breakpoint = '2xl';
      
      setViewportSize({ width, height, breakpoint });
    };

    // Initial update
    updateViewportSize();
    
    // Update on resize
    window.addEventListener('resize', updateViewportSize);
    
    return () => {
      window.removeEventListener('resize', updateViewportSize);
    };
  }, []);

  // Don't render if not enabled
  if (!isEnabled) return null;

  // Breakpoint colors for visual identification
  const getBreakpointColor = (breakpoint: string) => {
    switch (breakpoint) {
      case 'xs': return 'bg-zinc-600';
      case 'sm': return 'bg-blue-600';
      case 'md': return 'bg-green-600';
      case 'lg': return 'bg-yellow-600';
      case 'xl': return 'bg-purple-600';
      case '2xl': return 'bg-red-600';
      default: return 'bg-zinc-600';
    }
  };

  // Breakpoint icon for visual identification
  const BreakpointIcon = () => {
    switch (viewportSize.breakpoint) {
      case 'xs':
      case 'sm': 
        return <Smartphone className="h-4 w-4" />;
      case 'md': 
        return <Tablet className="h-4 w-4" />;
      case 'lg':
      case 'xl':
      case '2xl':
        return <Monitor className="h-4 w-4" />;
      default:
        return <Smartphone className="h-4 w-4" />;
    }
  };

  return (
    <div className="fixed bottom-4 right-4 z-50">
      {isVisible ? (
        <div className="bg-background border rounded-lg shadow-lg p-3 w-auto">
          <div className="flex justify-between items-center mb-2">
            <h3 className="text-sm font-semibold">Responsive Debug</h3>
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-6 w-6 p-0" 
              onClick={() => setIsVisible(false)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <BreakpointIcon />
              <Badge className={`${getBreakpointColor(viewportSize.breakpoint)}`}>
                {viewportSize.breakpoint}
              </Badge>
              <span className="text-xs">
                {viewportSize.width} × {viewportSize.height}
              </span>
            </div>
            
            <div className="flex flex-wrap gap-1">
              {['xs', 'sm', 'md', 'lg', 'xl', '2xl'].map((bp) => (
                <Badge 
                  key={bp}
                  variant={viewportSize.breakpoint === bp ? "default" : "outline"}
                  className={viewportSize.breakpoint === bp ? getBreakpointColor(bp) : ''}
                >
                  {bp}
                </Badge>
              ))}
            </div>
            
            <div className="text-xs text-muted-foreground pt-1">
              <ul className="list-disc list-inside">
                <li>sm: 640px</li>
                <li>md: 768px</li>
                <li>lg: 1024px</li>
                <li>xl: 1280px</li>
                <li>2xl: 1536px</li>
              </ul>
            </div>
          </div>
        </div>
      ) : (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button 
                size="sm" 
                className="rounded-full h-8 w-8 p-0 flex items-center justify-center" 
                onClick={() => setIsVisible(true)}
              >
                <BreakpointIcon />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="left">
              <p>Show responsive debug ({viewportSize.breakpoint})</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}
    </div>
  );
}
