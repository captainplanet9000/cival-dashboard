/**
 * Responsive Utilities
 * Provides utilities for handling responsive design and device detection
 */

import { useState, useEffect } from 'react';

// Screen breakpoints matching Tailwind's default breakpoints
export const breakpoints = {
  xs: 0,
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  '2xl': 1536,
};

export type Breakpoint = keyof typeof breakpoints;

// Device types
export type DeviceType = 'mobile' | 'tablet' | 'desktop';

/**
 * Hook to detect the current breakpoint
 * @returns The current breakpoint
 */
export function useBreakpoint(): Breakpoint {
  // Start with a reasonable default for SSR
  const [breakpoint, setBreakpoint] = useState<Breakpoint>('lg');
  
  useEffect(() => {
    // Function to calculate the current breakpoint
    const calculateBreakpoint = () => {
      const width = window.innerWidth;
      if (width < breakpoints.sm) return 'xs';
      if (width < breakpoints.md) return 'sm';
      if (width < breakpoints.lg) return 'md';
      if (width < breakpoints.xl) return 'lg';
      if (width < breakpoints['2xl']) return 'xl';
      return '2xl';
    };
    
    // Set the initial breakpoint
    setBreakpoint(calculateBreakpoint());
    
    // Add a listener for window resize
    const handleResize = () => {
      setBreakpoint(calculateBreakpoint());
    };
    
    window.addEventListener('resize', handleResize);
    
    // Clean up the event listener
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);
  
  return breakpoint;
}

/**
 * Hook to detect if the current device is mobile
 * @returns True if the device is mobile (xs or sm breakpoint)
 */
export function useMobileDetection(): boolean {
  const breakpoint = useBreakpoint();
  return breakpoint === 'xs' || breakpoint === 'sm';
}

/**
 * Hook to detect if the current device is a tablet
 * @returns True if the device is a tablet (md breakpoint)
 */
export function useTabletDetection(): boolean {
  const breakpoint = useBreakpoint();
  return breakpoint === 'md';
}

/**
 * Hook to detect the device type
 * @returns The current device type (mobile, tablet, or desktop)
 */
export function useDeviceType(): DeviceType {
  const breakpoint = useBreakpoint();
  if (breakpoint === 'xs' || breakpoint === 'sm') return 'mobile';
  if (breakpoint === 'md') return 'tablet';
  return 'desktop';
}

/**
 * Hook to detect touch capability
 * @returns True if touch is supported
 */
export function useTouchDetection(): boolean {
  const [isTouch, setIsTouch] = useState(false);
  
  useEffect(() => {
    const hasTouch = 'ontouchstart' in window || 
      navigator.maxTouchPoints > 0 ||
      (navigator as any).msMaxTouchPoints > 0;
    
    setIsTouch(hasTouch);
  }, []);
  
  return isTouch;
}

/**
 * Hook to detect if the device is in portrait or landscape orientation
 * @returns 'portrait' or 'landscape'
 */
export function useOrientation(): 'portrait' | 'landscape' {
  const [orientation, setOrientation] = useState<'portrait' | 'landscape'>('landscape');
  
  useEffect(() => {
    // Function to calculate the current orientation
    const calculateOrientation = () => {
      return window.innerWidth > window.innerHeight ? 'landscape' : 'portrait';
    };
    
    // Set the initial orientation
    setOrientation(calculateOrientation());
    
    // Add listeners for orientation change and resize
    const handleOrientationChange = () => {
      setOrientation(calculateOrientation());
    };
    
    window.addEventListener('resize', handleOrientationChange);
    window.addEventListener('orientationchange', handleOrientationChange);
    
    // Clean up event listeners
    return () => {
      window.removeEventListener('resize', handleOrientationChange);
      window.removeEventListener('orientationchange', handleOrientationChange);
    };
  }, []);
  
  return orientation;
}

/**
 * Conditionally render content based on the current breakpoint
 * @param content The content to render for each breakpoint
 * @returns The content for the current breakpoint
 */
export function Responsive<T>({ 
  xs, sm, md, lg, xl, xxl, fallback 
}: {
  xs?: T;
  sm?: T;
  md?: T;
  lg?: T;
  xl?: T;
  xxl?: T;
  fallback: T;
}): T {
  const breakpoint = useBreakpoint();
  
  switch (breakpoint) {
    case 'xs':
      return xs ?? sm ?? md ?? lg ?? xl ?? xxl ?? fallback;
    case 'sm':
      return sm ?? md ?? lg ?? xl ?? xxl ?? xs ?? fallback;
    case 'md':
      return md ?? lg ?? xl ?? xxl ?? sm ?? xs ?? fallback;
    case 'lg':
      return lg ?? xl ?? xxl ?? md ?? sm ?? xs ?? fallback;
    case 'xl':
      return xl ?? xxl ?? lg ?? md ?? sm ?? xs ?? fallback;
    case '2xl':
      return xxl ?? xl ?? lg ?? md ?? sm ?? xs ?? fallback;
    default:
      return fallback;
  }
}

/**
 * Utility to generate responsive class names
 * @param baseClasses Base classes for all breakpoints
 * @param breakpointClasses Classes for specific breakpoints
 * @returns Combined class string
 */
export function responsiveClasses(
  baseClasses: string,
  breakpointClasses?: Partial<Record<Breakpoint, string>>
): string {
  if (!breakpointClasses) return baseClasses;
  
  const classes = [baseClasses];
  
  Object.entries(breakpointClasses).forEach(([breakpoint, className]) => {
    if (className) {
      // Convert breakpoint to Tailwind format (e.g., 'sm' -> 'sm:')
      const prefix = breakpoint === 'xs' ? '' : `${breakpoint}:`;
      classes.push(`${prefix}${className}`);
    }
  });
  
  return classes.filter(Boolean).join(' ');
}
