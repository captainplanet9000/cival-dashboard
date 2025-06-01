import { useState, useEffect } from 'react';

type Breakpoint = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';

const breakpoints = {
  xs: 0,
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  '2xl': 1536,
};

/**
 * Hook for responsive design
 * Returns an object with boolean values for each breakpoint
 * @returns Object with boolean values indicating if the viewport is at least the size of each breakpoint
 * @example const { isMd, isLg } = useResponsive();
 */
export function useResponsive() {
  const [windowSize, setWindowSize] = useState({
    width: typeof window !== 'undefined' ? window.innerWidth : 0,
    height: typeof window !== 'undefined' ? window.innerHeight : 0,
  });

  useEffect(() => {
    // Only execute this code client-side
    if (typeof window === 'undefined') return;

    const handleResize = () => {
      setWindowSize({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Create a breakpoint object that tells if the current viewport is at least the size of the breakpoint
  const breakpointMatches = Object.entries(breakpoints).reduce(
    (acc, [key, value]) => ({
      ...acc,
      [`is${key.charAt(0).toUpperCase()}${key.slice(1)}`]: windowSize.width >= value,
    }),
    {} as Record<`is${Capitalize<Breakpoint>}`, boolean>
  );

  return {
    ...breakpointMatches,
    width: windowSize.width,
    height: windowSize.height,
    isMobile: windowSize.width < breakpoints.md,
    isTablet: windowSize.width >= breakpoints.md && windowSize.width < breakpoints.lg,
    isDesktop: windowSize.width >= breakpoints.lg,
  };
}
