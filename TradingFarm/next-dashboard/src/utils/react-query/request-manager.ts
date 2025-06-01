import axios, { AxiosRequestConfig, CancelTokenSource } from 'axios';
import { QueryClient } from '@tanstack/react-query';
import { queryKeys } from './query-keys';

/**
 * Utility class to manage cancellable API requests
 * Helps cancel pending requests during navigation or when data becomes stale
 */
export class RequestManager {
  private static pendingRequests: Map<string, CancelTokenSource> = new Map();

  /**
   * Create a cancellable request config
   * @param requestId - Unique identifier for the request (usually the endpoint path)
   * @param config - Axios request config
   * @returns Modified config with cancel token
   */
  static getCancellableConfig(requestId: string, config: AxiosRequestConfig = {}): AxiosRequestConfig {
    // Cancel previous request with the same ID if it exists
    this.cancelRequest(requestId);

    // Create a new cancel token
    const source = axios.CancelToken.source();
    this.pendingRequests.set(requestId, source);

    return {
      ...config,
      cancelToken: source.token,
    };
  }

  /**
   * Cancel a specific request by ID
   * @param requestId - ID of the request to cancel
   */
  static cancelRequest(requestId: string): void {
    const source = this.pendingRequests.get(requestId);
    if (source) {
      source.cancel(`Request ${requestId} was cancelled`);
      this.pendingRequests.delete(requestId);
    }
  }

  /**
   * Cancel all pending requests
   */
  static cancelAllRequests(): void {
    this.pendingRequests.forEach((source, requestId) => {
      source.cancel(`Request ${requestId} was cancelled`);
    });
    this.pendingRequests.clear();
  }

  /**
   * Cancel requests by pattern (useful for related endpoints)
   * @param pattern - String pattern to match against request IDs
   */
  static cancelRequestsByPattern(pattern: string | RegExp): void {
    this.pendingRequests.forEach((source, requestId) => {
      if (typeof pattern === 'string' && requestId.includes(pattern)) {
        source.cancel(`Request ${requestId} was cancelled`);
        this.pendingRequests.delete(requestId);
      } else if (pattern instanceof RegExp && pattern.test(requestId)) {
        source.cancel(`Request ${requestId} was cancelled`);
        this.pendingRequests.delete(requestId);
      }
    });
  }
}

/**
 * Higher-order function to make API fetcher functions cancellable
 * @param fetchFn - Original fetch function
 * @returns Enhanced fetch function with cancellation support
 */
export function withCancellation<T>(
  fetchFn: (config?: AxiosRequestConfig) => Promise<T>,
  requestId: string
): (config?: AxiosRequestConfig) => Promise<T> {
  return (config?: AxiosRequestConfig) => {
    const cancellableConfig = RequestManager.getCancellableConfig(requestId, config);
    return fetchFn(cancellableConfig);
  };
}

/**
 * Cancel requests when navigating away from pages
 * @param queryClient - TanStack Query client instance
 * @param entityType - Type of entity being viewed
 */
export function cancelQueriesOnNavigation(
  queryClient: QueryClient,
  entityType: 'strategies' | 'positions' | 'agents' | 'orders' | 'farms'
): void {
  // Cancel any ongoing queries for this entity type
  queryClient.cancelQueries({ queryKey: [entityType] });
  
  // Also cancel any pending axios requests
  RequestManager.cancelRequestsByPattern(entityType);
}

/**
 * Optimize query cancellation during page navigation for the Trading Farm dashboard
 */
export function setupNavigationCancellation(queryClient: QueryClient): void {
  // This function should be called in your layout component

  // Use the browser's navigation API if available (Next.js app router compatible)
  if (typeof window !== 'undefined' && 'navigation' in window) {
    // @ts-ignore - Navigation API is still experimental
    window.navigation.addEventListener('navigate', () => {
      // Cancel all active queries
      queryClient.cancelQueries();
      // Cancel all pending HTTP requests
      RequestManager.cancelAllRequests();
    });
  }
  
  // Also set up for the older history API
  if (typeof window !== 'undefined') {
    const originalPushState = window.history.pushState;
    window.history.pushState = function(...args) {
      // Cancel less important queries on navigation
      queryClient.cancelQueries({
        predicate: (query) => {
          // Don't cancel essential queries that should persist across navigation
          const queryKeyStr = JSON.stringify(query.queryKey);
          // Keep user and core settings during navigation
          return !queryKeyStr.includes('userSettings') && !queryKeyStr.includes('coreSettings');
        },
      });
      
      // Cancel all HTTP requests except critical ones
      RequestManager.cancelRequestsByPattern(/(positions|orders|analytics)/);
      
      return originalPushState.apply(this, args);
    };
  }
}
