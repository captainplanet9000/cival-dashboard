/**
 * Service Worker for GWDS
 * 
 * This service worker provides offline capabilities and performance
 * enhancements through network request handling and caching.
 * 
 * Features:
 * - Precaching of static assets
 * - Runtime caching of dynamic content
 * - API response caching with fallback
 * - Background sync for offline operations
 * - Cache cleanup and management
 */

/// <reference lib="webworker" />

declare const self: ServiceWorkerGlobalScope;

// App version and cache name
const APP_VERSION = '1.0.0';
const CACHE_PREFIX = 'gwds-cache';
const STATIC_CACHE_NAME = `${CACHE_PREFIX}-static-v${APP_VERSION}`;
const DYNAMIC_CACHE_NAME = `${CACHE_PREFIX}-dynamic-v${APP_VERSION}`;
const API_CACHE_NAME = `${CACHE_PREFIX}-api-v${APP_VERSION}`;

// Assets to precache
const PRECACHE_ASSETS = [
  '/',
  '/index.html',
  '/offline.html',
  '/manifest.json',
  '/favicon.ico'
];

// API routes to cache
const API_ROUTES = [
  { pattern: /\/api\/market-data\//, strategy: 'stale-while-revalidate', expiration: 60 * 5 }, // 5 mins
  { pattern: /\/api\/farms\/([^/]+)\/analytics/, strategy: 'network-first', expiration: 60 * 60 }, // 1 hour
  { pattern: /\/api\/farms\/([^/]+)\/status/, strategy: 'network-first', expiration: 60 * 2 } // 2 mins
];

// Install event handler - precache static assets
self.addEventListener('install', (event: ExtendableEvent) => {
  // Skip waiting to activate immediately
  self.skipWaiting();
  
  event.waitUntil(
    caches.open(STATIC_CACHE_NAME)
      .then(cache => {
        console.log('[Service Worker] Precaching static assets');
        return cache.addAll(PRECACHE_ASSETS);
      })
      .catch(error => {
        console.error('[Service Worker] Precaching failed:', error);
      })
  );
});

// Activate event handler - clean up old caches
self.addEventListener('activate', (event: ExtendableEvent) => {
  // Claim clients to take control immediately
  event.waitUntil(self.clients.claim());
  
  // Clean up old caches
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames
          .filter(cacheName => {
            return cacheName.startsWith(CACHE_PREFIX) && 
                  !cacheName.endsWith(`v${APP_VERSION}`);
          })
          .map(cacheName => {
            console.log(`[Service Worker] Deleting old cache: ${cacheName}`);
            return caches.delete(cacheName);
          })
      );
    })
  );
});

// Fetch event handler - intercept network requests
self.addEventListener('fetch', (event: FetchEvent) => {
  const url = new URL(event.request.url);
  
  // Skip non-GET requests and browser extension requests
  if (
    event.request.method !== 'GET' ||
    url.protocol === 'chrome-extension:' || 
    url.hostname === 'localhost'
  ) {
    return;
  }
  
  // Handle API requests
  if (isApiRequest(event.request)) {
    event.respondWith(handleApiRequest(event.request));
    return;
  }
  
  // Handle static assets (HTML, CSS, JS, images)
  if (isStaticAsset(event.request)) {
    event.respondWith(handleStaticAsset(event.request));
    return;
  }
  
  // Handle other requests with network-first strategy
  event.respondWith(
    fetch(event.request)
      .then(response => {
        // Cache successful responses
        if (response.ok) {
          const clonedResponse = response.clone();
          caches.open(DYNAMIC_CACHE_NAME).then(cache => {
            cache.put(event.request, clonedResponse);
          });
        }
        return response;
      })
      .catch(() => {
        // Fall back to cache
        return caches.match(event.request).then(cachedResponse => {
          if (cachedResponse) {
            return cachedResponse;
          }
          
          // If it's a page navigation, return offline page
          if (event.request.mode === 'navigate') {
            return caches.match('/offline.html');
          }
          
          return new Response('Network error', { status: 408, statusText: 'Network error' });
        });
      })
  );
});

// Background sync event handler
self.addEventListener('sync', (event: SyncEvent) => {
  if (event.tag === 'sync-pending-operations') {
    event.waitUntil(syncPendingOperations());
  }
});

// Push notification event handler
self.addEventListener('push', (event: PushEvent) => {
  if (!event.data) return;
  
  try {
    const data = event.data.json();
    
    const options: NotificationOptions = {
      body: data.body || 'New notification',
      icon: '/icons/icon-192x192.png',
      badge: '/icons/badge-96x96.png',
      tag: data.tag || 'default',
      data: data.data || {}
    };
    
    event.waitUntil(
      self.registration.showNotification(data.title || 'Trading Farm Dashboard', options)
    );
  } catch (error) {
    console.error('[Service Worker] Push notification error:', error);
  }
});

// Notification click event handler
self.addEventListener('notificationclick', (event: NotificationEvent) => {
  event.notification.close();
  
  event.waitUntil(
    clients.matchAll({ type: 'window' }).then(clientList => {
      // If a window client already exists, focus it
      for (const client of clientList) {
        if ('focus' in client) {
          return client.focus();
        }
      }
      
      // Otherwise open a new window/tab
      if (clients.openWindow) {
        return clients.openWindow('/');
      }
    })
  );
});

// Message event handler
self.addEventListener('message', (event: ExtendableMessageEvent) => {
  const message = event.data;
  
  if (!message || !message.type) return;
  
  switch (message.type) {
    case 'CACHE_URLS':
      if (message.payload && Array.isArray(message.payload.urls)) {
        event.waitUntil(cacheUrls(message.payload.urls, message.payload.cacheName || STATIC_CACHE_NAME));
      }
      break;
      
    case 'CLEAR_CACHES':
      event.waitUntil(clearAllCaches());
      break;
      
    case 'SKIP_WAITING':
      self.skipWaiting();
      break;
  }
});

/**
 * Check if a request is for an API endpoint
 */
function isApiRequest(request: Request): boolean {
  const url = new URL(request.url);
  
  // Check if the URL matches any API route patterns
  return API_ROUTES.some(route => route.pattern.test(url.pathname));
}

/**
 * Check if a request is for a static asset
 */
function isStaticAsset(request: Request): boolean {
  const url = new URL(request.url);
  const path = url.pathname;
  
  // Check file extensions for common static assets
  return /\.(html|css|js|svg|png|jpg|jpeg|gif|woff|woff2|ttf|eot)$/.test(path) ||
         path === '/' || 
         path === '/index.html';
}

/**
 * Handle API requests with appropriate caching strategy
 */
async function handleApiRequest(request: Request): Promise<Response> {
  const url = new URL(request.url);
  
  // Find matching API route configuration
  const apiRoute = API_ROUTES.find(route => route.pattern.test(url.pathname));
  
  if (!apiRoute) {
    // No matching configuration, use network-only strategy
    return fetch(request);
  }
  
  // Handle based on caching strategy
  switch (apiRoute.strategy) {
    case 'cache-first':
      return handleCacheFirst(request, API_CACHE_NAME, apiRoute.expiration);
      
    case 'network-first':
      return handleNetworkFirst(request, API_CACHE_NAME, apiRoute.expiration);
      
    case 'stale-while-revalidate':
      return handleStaleWhileRevalidate(request, API_CACHE_NAME, apiRoute.expiration);
      
    default:
      return fetch(request);
  }
}

/**
 * Handle static asset requests with cache-first strategy
 */
async function handleStaticAsset(request: Request): Promise<Response> {
  return handleCacheFirst(request, STATIC_CACHE_NAME);
}

/**
 * Cache-first strategy:
 * Try cache first, fallback to network, update cache
 */
async function handleCacheFirst(
  request: Request, 
  cacheName: string,
  maxAgeSeconds?: number
): Promise<Response> {
  const cache = await caches.open(cacheName);
  
  // Check cache first
  const cachedResponse = await cache.match(request);
  
  if (cachedResponse) {
    // If we have a max age, check if the cached response is still valid
    if (maxAgeSeconds) {
      const cacheTime = getResponseTimestamp(cachedResponse);
      const now = Date.now();
      
      if (now - cacheTime > maxAgeSeconds * 1000) {
        // Cached response is too old, fetch a new one in the background
        updateCache(request, cache, maxAgeSeconds).catch(err => {
          console.error('[Service Worker] Background cache update failed:', err);
        });
      }
    }
    
    return cachedResponse;
  }
  
  // Nothing in cache, fetch from network
  try {
    const networkResponse = await fetch(request);
    
    // Cache the response (if it's valid)
    if (networkResponse.ok) {
      await cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    console.error('[Service Worker] Network request failed:', error);
    
    // If it's a page navigation, return offline page
    if (request.mode === 'navigate') {
      return cache.match('/offline.html') as Promise<Response>;
    }
    
    // Return error response
    return new Response('Network error', { status: 408, statusText: 'Network error' });
  }
}

/**
 * Network-first strategy:
 * Try network first, fallback to cache
 */
async function handleNetworkFirst(
  request: Request, 
  cacheName: string,
  maxAgeSeconds?: number
): Promise<Response> {
  const cache = await caches.open(cacheName);
  
  try {
    // Try network first
    const networkResponse = await fetch(request);
    
    // Cache successful responses
    if (networkResponse.ok) {
      await cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    console.log('[Service Worker] Network request failed, falling back to cache');
    
    // Fallback to cache
    const cachedResponse = await cache.match(request);
    
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // No cached response available
    return new Response('{"error":"Network error, no cached data available"}', {
      status: 503,
      statusText: 'Service Unavailable',
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }
}

/**
 * Stale-while-revalidate strategy:
 * Return cached version immediately if available (even if stale),
 * then update cache in the background
 */
async function handleStaleWhileRevalidate(
  request: Request, 
  cacheName: string,
  maxAgeSeconds?: number
): Promise<Response> {
  const cache = await caches.open(cacheName);
  
  // Get from cache
  const cachedResponse = await cache.match(request);
  
  // Update cache in the background regardless of whether we have a cached response
  const updatePromise = updateCache(request, cache, maxAgeSeconds);
  
  // If we have a cached response, return it immediately
  if (cachedResponse) {
    updatePromise.catch(err => {
      console.error('[Service Worker] Background cache update failed:', err);
    });
    
    return cachedResponse;
  }
  
  // No cached response, wait for the network response
  try {
    return await updatePromise;
  } catch (error) {
    console.error('[Service Worker] Network request failed:', error);
    
    // If it's an API request, return an error JSON
    return new Response('{"error":"Network error"}', {
      status: 503,
      statusText: 'Service Unavailable',
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }
}

/**
 * Update the cache with a fresh network response
 */
async function updateCache(
  request: Request, 
  cache: Cache,
  maxAgeSeconds?: number
): Promise<Response> {
  const networkResponse = await fetch(request);
  
  // Only cache successful responses
  if (networkResponse.ok) {
    // Add timestamp header if maxAgeSeconds is provided
    if (maxAgeSeconds) {
      const timestampedResponse = addTimestampHeader(networkResponse.clone());
      await cache.put(request, timestampedResponse);
    } else {
      await cache.put(request, networkResponse.clone());
    }
  }
  
  return networkResponse;
}

/**
 * Add a timestamp header to a response
 */
function addTimestampHeader(response: Response): Response {
  const headers = new Headers(response.headers);
  headers.set('sw-timestamp', Date.now().toString());
  
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers
  });
}

/**
 * Get a timestamp from a cached response
 */
function getResponseTimestamp(response: Response): number {
  const timestamp = response.headers.get('sw-timestamp');
  return timestamp ? parseInt(timestamp, 10) : 0;
}

/**
 * Sync pending operations from IndexedDB to the server
 */
async function syncPendingOperations(): Promise<void> {
  console.log('[Service Worker] Syncing pending operations');
  // Implementation would depend on the specific app requirements
}

/**
 * Cache URLs
 */
async function cacheUrls(urls: string[], cacheName: string): Promise<void> {
  const cache = await caches.open(cacheName);
  
  try {
    await Promise.all(
      urls.map(url => {
        return fetch(url).then(response => {
          if (response.ok) {
            return cache.put(url, response);
          }
          throw new Error(`Failed to fetch ${url}`);
        });
      })
    );
    
    console.log(`[Service Worker] Cached ${urls.length} URLs in ${cacheName}`);
  } catch (error) {
    console.error('[Service Worker] Failed to cache URLs:', error);
  }
}

/**
 * Clear all caches
 */
async function clearAllCaches(): Promise<void> {
  const cacheNames = await caches.keys();
  
  await Promise.all(
    cacheNames
      .filter(name => name.startsWith(CACHE_PREFIX))
      .map(name => caches.delete(name))
  );
  
  console.log('[Service Worker] All caches cleared');
} 