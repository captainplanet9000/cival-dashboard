"use client";

import * as React from 'react';
import { useState, useEffect } from 'react';
import { useDeviceType, useBreakpoint } from '@/utils/responsive';
import { cn } from '@/lib/utils';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Menu, X } from 'lucide-react';

interface ResponsiveLayoutProps {
  sidebar: React.ReactNode;
  header: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

/**
 * ResponsiveLayout component that adapts to different screen sizes
 * - On desktop: Sidebar is visible, fixed on the left side
 * - On tablet: Sidebar is collapsible, shows as overlay when triggered
 * - On mobile: Sidebar is hidden and available via a drawer, content is full-width
 */
export function ResponsiveLayout({
  sidebar,
  header,
  children,
  className
}: ResponsiveLayoutProps) {
  const deviceType = useDeviceType();
  const breakpoint = useBreakpoint();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const isMobile = deviceType === 'mobile';
  const isTablet = deviceType === 'tablet';
  const isDesktop = deviceType === 'desktop';

  // Close sidebar when screen size changes to desktop
  useEffect(() => {
    if (isDesktop) {
      setSidebarOpen(false);
    }
  }, [isDesktop]);

  return (
    <div className="h-screen flex flex-col">
      {/* Header - Always visible at top */}
      <div className="w-full z-20 border-b bg-background">
        <div className="flex items-center">
          {/* Mobile/Tablet Menu Button */}
          {(isMobile || isTablet) && (
            <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="mr-2">
                  <Menu className="h-5 w-5" />
                  <span className="sr-only">Toggle menu</span>
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="p-0 sm:max-w-xs">
                {sidebar}
              </SheetContent>
            </Sheet>
          )}
          
          {/* Header Content */}
          <div className="flex-1">{header}</div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Desktop Sidebar - Fixed on larger screens */}
        {isDesktop && (
          <div className="hidden lg:block w-64 border-r overflow-y-auto">
            {sidebar}
          </div>
        )}

        {/* Main Content - Adjusts based on sidebar visibility */}
        <main className={cn(
          "flex-1 overflow-y-auto bg-background",
          isDesktop ? "lg:ml-64" : "",
          className
        )}>
          {children}
        </main>
      </div>
    </div>
  );
}

interface ResponsiveContainerProps {
  children: React.ReactNode;
  className?: string;
  fullWidth?: boolean;
}

/**
 * ResponsiveContainer that provides appropriate padding and max-width
 * for different screen sizes
 */
export function ResponsiveContainer({
  children,
  className,
  fullWidth = false
}: ResponsiveContainerProps) {
  return (
    <div className={cn(
      "w-full px-4 py-4 sm:px-6 md:px-8",
      !fullWidth && "max-w-7xl mx-auto",
      className
    )}>
      {children}
    </div>
  );
}

interface ResponsiveGridProps {
  children: React.ReactNode;
  className?: string;
  columns?: {
    xs?: number;
    sm?: number;
    md?: number;
    lg?: number;
    xl?: number;
    '2xl'?: number;
  };
  gap?: string;
}

/**
 * ResponsiveGrid that adjusts columns based on screen size
 */
export function ResponsiveGrid({
  children,
  className,
  columns = {
    xs: 1,
    sm: 2,
    md: 3,
    lg: 4,
    xl: 4,
    '2xl': 5
  },
  gap = 'gap-4'
}: ResponsiveGridProps) {
  // Convert column counts to tailwind grid classes
  const gridCols = {
    xs: `grid-cols-${columns.xs || 1}`,
    sm: `sm:grid-cols-${columns.sm || 2}`,
    md: `md:grid-cols-${columns.md || 3}`,
    lg: `lg:grid-cols-${columns.lg || 4}`,
    xl: `xl:grid-cols-${columns.xl || 4}`,
    '2xl': `2xl:grid-cols-${columns['2xl'] || 5}`
  };

  return (
    <div className={cn(
      "grid",
      gridCols.xs,
      gridCols.sm,
      gridCols.md,
      gridCols.lg,
      gridCols.xl,
      gridCols['2xl'],
      gap,
      className
    )}>
      {children}
    </div>
  );
}

interface ResponsiveTwoColumnLayoutProps {
  sidebar: React.ReactNode;
  content: React.ReactNode;
  sidebarWidth?: string;
  sidebarPosition?: 'left' | 'right';
  stackOnMobile?: boolean;
  className?: string;
}

/**
 * ResponsiveTwoColumnLayout that provides a sidebar and content area
 * Stacks vertically on mobile if specified
 */
export function ResponsiveTwoColumnLayout({
  sidebar,
  content,
  sidebarWidth = 'w-64',
  sidebarPosition = 'left',
  stackOnMobile = true,
  className
}: ResponsiveTwoColumnLayoutProps) {
  const deviceType = useDeviceType();
  const isMobile = deviceType === 'mobile';

  if (stackOnMobile && isMobile) {
    return (
      <div className={cn("flex flex-col w-full gap-4", className)}>
        <div className="w-full">{sidebar}</div>
        <div className="flex-1">{content}</div>
      </div>
    );
  }

  return (
    <div className={cn(
      "flex w-full gap-4",
      sidebarPosition === 'right' ? 'flex-row-reverse' : 'flex-row',
      className
    )}>
      <div className={cn(sidebarWidth, "shrink-0")}>{sidebar}</div>
      <div className="flex-1">{content}</div>
    </div>
  );
}
