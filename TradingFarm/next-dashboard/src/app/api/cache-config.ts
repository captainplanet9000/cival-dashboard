/**
 * API Cache Configuration
 * 
 * Configures server-side caching for API routes to improve performance
 * and reduce database load.
 */

import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

// Cache durations in seconds
export const CACHE_DURATIONS = {
  STATIC: 60 * 60, // 1 hour
  DYNAMIC: 60, // 1 minute
  REAL_TIME: 5, // 5 seconds
  NO_CACHE: 0 // No caching
};

// Cache configuration by route pattern
export const ROUTE_CACHE_CONFIG: Record<string, number> = {
  // Static data (longer cache)
  '/api/strategies/list': CACHE_DURATIONS.STATIC,
  '/api/exchanges/list': CACHE_DURATIONS.STATIC,
  '/api/agent/templates': CACHE_DURATIONS.STATIC,
  
  // Semi-dynamic data (medium cache)
  '/api/agents': CACHE_DURATIONS.DYNAMIC,
  '/api/dashboard/stats': CACHE_DURATIONS.DYNAMIC,
  '/api/vault/summary': CACHE_DURATIONS.DYNAMIC,
  
  // Real-time data (short cache)
  '/api/trading/positions': CACHE_DURATIONS.REAL_TIME,
  '/api/trading/orders': CACHE_DURATIONS.REAL_TIME,
  '/api/trading/balances': CACHE_DURATIONS.REAL_TIME,
  
  // No cache for sensitive or rapidly changing data
  '/api/credentials': CACHE_DURATIONS.NO_CACHE,
  '/api/trading/place-order': CACHE_DURATIONS.NO_CACHE,
  '/api/trading/cancel-order': CACHE_DURATIONS.NO_CACHE
};

/**
 * Apply cache headers to API response based on route
 */
export function applyCacheHeaders(
  req: NextRequest,
  res: NextResponse,
  overrideDuration?: number
): NextResponse {
  const url = new URL(req.url);
  const path = url.pathname;
  
  // Get cache duration from config or use override
  let cacheDuration = overrideDuration;
  if (cacheDuration === undefined) {
    // Look for exact route match
    if (ROUTE_CACHE_CONFIG[path] !== undefined) {
      cacheDuration = ROUTE_CACHE_CONFIG[path];
    } else {
      // Look for pattern match
      const matchingPattern = Object.keys(ROUTE_CACHE_CONFIG).find(pattern => {
        // Convert route pattern to regex (simple conversion)
        const regexPattern = pattern
          .replace(/\//g, '\\/') // Escape slashes
          .replace(/\{[^}]+\}/g, '[^/]+'); // Replace {param} with regex
        
        const regex = new RegExp(`^${regexPattern}$`);
        return regex.test(path);
      });
      
      cacheDuration = matchingPattern 
        ? ROUTE_CACHE_CONFIG[matchingPattern]
        : CACHE_DURATIONS.NO_CACHE; // Default to no cache
    }
  }
  
  // Apply appropriate cache headers
  if (cacheDuration <= 0) {
    // No caching
    res.headers.set('Cache-Control', 'no-store, must-revalidate');
  } else {
    // Cache with specified duration
    res.headers.set(
      'Cache-Control',
      `public, s-maxage=${cacheDuration}, stale-while-revalidate=${cacheDuration * 2}`
    );
  }
  
  return res;
}

/**
 * Helper to create a cached response
 */
export function createCachedResponse(
  data: any,
  status = 200,
  cacheDuration?: number
) {
  const response = NextResponse.json(data, { status });
  
  if (cacheDuration !== undefined) {
    if (cacheDuration <= 0) {
      response.headers.set('Cache-Control', 'no-store, must-revalidate');
    } else {
      response.headers.set(
        'Cache-Control',
        `public, s-maxage=${cacheDuration}, stale-while-revalidate=${cacheDuration * 2}`
      );
    }
  }
  
  return response;
}
