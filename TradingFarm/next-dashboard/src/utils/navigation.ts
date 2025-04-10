import { useRouter, usePathname } from 'next/navigation';
import { useEffect, useCallback } from 'react';

// List of key routes that should be prefetched
const KEY_ROUTES = [
  '/dashboard',
  '/dashboard/strategies',
  '/dashboard/execution',
  '/dashboard/analytics',
  '/dashboard/funding',
  '/dashboard/ai-center',
  '/dashboard/settings',
];

// Map of sections to their respective sub-routes
const SECTION_ROUTES: Record<string, string[]> = {
  strategies: [
    '/dashboard/strategies',
  ],
  execution: [
    '/dashboard/execution/positions',
    '/dashboard/execution/orders',
    '/dashboard/execution/activity',
  ],
  analytics: [
    '/dashboard/analytics/performance',
    '/dashboard/analytics/risk',
    '/dashboard/analytics/market',
  ],
  funding: [
    '/dashboard/funding/accounts',
    '/dashboard/funding/vault',
    '/dashboard/funding/transactions',
  ],
  'ai-center': [
    '/dashboard/ai-center/command',
    '/dashboard/ai-center/knowledge',
    '/dashboard/ai-center/eliza',
    '/dashboard/ai-center/advisor',
  ],
  settings: [
    '/dashboard/settings',
    '/dashboard/settings/connections',
  ],
};

/**
 * Hook to prefetch key routes for faster navigation
 */
export function usePrefetchRoutes() {
  const router = useRouter();
  
  useEffect(() => {
    // Prefetch key routes on initial load
    KEY_ROUTES.forEach(route => {
      router.prefetch(route);
    });
  }, [router]);
}

/**
 * Hook to intelligently prefetch section routes based on current section
 */
export function useSmartPrefetch() {
  const router = useRouter();
  const pathname = usePathname();
  
  useEffect(() => {
    // Extract current section from pathname
    const section = pathname?.split('/')[2];
    
    if (!section) return;
    
    // Prefetch routes for current section
    const routesToPrefetch = SECTION_ROUTES[section] || [];
    routesToPrefetch.forEach(route => {
      router.prefetch(route);
    });
    
    // Also prefetch main dashboard routes for quick section switching
    KEY_ROUTES.forEach(route => {
      router.prefetch(route);
    });
  }, [pathname, router]);
}

/**
 * Track navigation performance metrics
 */
export function useNavigationMetrics() {
  const pathname = usePathname();
  
  useEffect(() => {
    if (process.env.NODE_ENV !== 'production') {
      return; // Only measure in production
    }
    
    const navigationStart = performance.now();
    
    // Mark the start of navigation
    performance.mark('navigation-start');
    
    // When the component renders, the navigation is complete
    window.requestIdleCallback(() => {
      // Mark navigation complete
      performance.mark('navigation-end');
      
      // Measure the time between marks
      performance.measure('navigation-duration', 'navigation-start', 'navigation-end');
      
      // Get the measurement
      const measurements = performance.getEntriesByName('navigation-duration');
      const navigationTime = measurements[0]?.duration || 0;
      
      console.log(`Navigation to ${pathname} took ${navigationTime.toFixed(2)}ms`);
      
      // In production, send this to your analytics
      if (navigationTime > 1000) {
        // Report slow navigation
        console.warn(`Slow navigation detected to ${pathname}: ${navigationTime.toFixed(2)}ms`);
      }
      
      // Clean up
      performance.clearMarks('navigation-start');
      performance.clearMarks('navigation-end');
      performance.clearMeasures('navigation-duration');
    });
    
    return () => {
      // Cleanup in case component unmounts before measurement completes
      performance.clearMarks('navigation-start');
      performance.clearMarks('navigation-end');
      performance.clearMeasures('navigation-duration');
    };
  }, [pathname]);
}

/**
 * Get section and subsection from pathname
 */
export function useNavigationSegments() {
  const pathname = usePathname() || '';
  
  const segments = pathname.split('/').filter(Boolean);
  
  const section = segments.length > 1 ? segments[1] : null;
  const subsection = segments.length > 2 ? segments[2] : null;
  
  return { section, subsection };
}

/**
 * Generate breadcrumb items from the current path
 */
export function useBreadcrumbs() {
  const pathname = usePathname() || '';
  
  const generateBreadcrumbs = useCallback(() => {
    const segments = pathname.split('/').filter(Boolean);
    
    if (segments.length === 0) return [];
    
    const breadcrumbs = [{ label: 'Dashboard', href: '/dashboard' }];
    
    let path = '';
    for (let i = 1; i < segments.length; i++) {
      path += `/${segments[i]}`;
      const href = `/dashboard${path}`;
      const label = formatBreadcrumbLabel(segments[i]);
      
      breadcrumbs.push({ label, href });
    }
    
    return breadcrumbs;
  }, [pathname]);
  
  return generateBreadcrumbs();
}

/**
 * Format breadcrumb label from URL segment
 */
function formatBreadcrumbLabel(segment: string): string {
  // Convert kebab-case to Title Case
  return segment
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}
