import { NextRequest, NextResponse } from 'next/server';
import { 
  getCache, 
  setCache, 
  generateCacheKey, 
  CacheNamespace, 
  CachePolicy 
} from '@/services/redis-service';

/**
 * Middleware for caching API responses
 * @param namespace - The cache namespace for grouping related cache entries
 * @param getKeyFromRequest - Function to extract a unique identifier from the request
 * @param policy - Caching policy with TTL and other options
 * @param handler - The original request handler function
 */
export const withCache = <T>(
  namespace: CacheNamespace,
  getKeyFromRequest: (req: NextRequest) => string,
  policy: CachePolicy,
  handler: (req: NextRequest) => Promise<NextResponse<T>>
) => {
  return async (req: NextRequest): Promise<NextResponse<T>> => {
    // Skip cache for non-GET requests
    if (req.method !== 'GET') {
      return handler(req);
    }

    // Skip cache if specifically requested
    const skipCache = req.headers.get('x-skip-cache') === 'true';
    if (skipCache) {
      return handler(req);
    }

    // Extract filters from the URL search params
    const url = new URL(req.url);
    const filters: Record<string, string> = {};
    url.searchParams.forEach((value, key) => {
      filters[key] = value;
    });
    
    // Generate a unique cache key
    const resourceKey = getKeyFromRequest(req);
    const cacheKey = generateCacheKey(namespace, resourceKey, filters);
    
    try {
      // Try to get from cache first
      const cachedData = await getCache<T>(cacheKey);
      
      if (cachedData) {
        // If we have cached data, return it immediately
        const response = NextResponse.json<T>(cachedData);
        response.headers.set('x-cache', 'HIT');
        return response;
      }

      // If no cached data, execute the handler
      const response = await handler(req);
      
      // Only cache successful responses
      if (response.status >= 200 && response.status < 300) {
        // Clone the response to get the data
        const clonedResponse = response.clone();
        const data = await clonedResponse.json();
        
        // Cache the data
        await setCache(cacheKey, data, { ttl: policy.ttl });
        
        // Set cache header
        response.headers.set('x-cache', 'MISS');
      }
      
      return response;
    } catch (error) {
      console.error(`Cache middleware error for ${cacheKey}:`, error);
      
      // On error, fall back to the handler
      return handler(req);
    }
  };
};

/**
 * Utility to wrap Next.js API route with cache middleware
 */
export function withRouteCache<T>(
  namespace: CacheNamespace,
  handler: (req: NextRequest) => Promise<NextResponse<T>>,
  options: {
    keyFn?: (req: NextRequest) => string;
    policy?: CachePolicy;
  } = {}
) {
  // Default key function extracts from the path or uses a static key
  const defaultKeyFn = (req: NextRequest) => {
    const url = new URL(req.url);
    const pathParts = url.pathname.split('/');
    // Use the last path segment if available, otherwise use full path
    return pathParts[pathParts.length - 1] || url.pathname;
  };
  
  // Use provided options or defaults
  const keyFn = options.keyFn || defaultKeyFn;
  const policy = options.policy || { ttl: 3600 }; // Default 1 hour TTL
  
  return withCache(namespace, keyFn, policy, handler);
}
