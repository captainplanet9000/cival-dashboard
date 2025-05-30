/**
 * API Gateway Service
 * 
 * Provides a unified interface for all backend API interactions with:
 * - Standardized request/response formats
 * - Centralized error handling
 * - Authentication management
 * - Service discovery
 */

import { createBrowserClient } from '@/utils/supabase/client';
import { createServerClient } from '@/utils/supabase/server';
import { MonitoringService } from './monitoring-service';

export type ApiMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

export interface ApiRequestOptions {
  method?: ApiMethod;
  body?: any;
  headers?: Record<string, string>;
  requireAuth?: boolean;
  timeout?: number;
  retries?: number;
  useCache?: boolean;
  cacheTime?: number;
  abortSignal?: AbortSignal;
}

export interface ApiResponse<T> {
  data: T | null;
  error: Error | null;
  status: number;
  headers?: Headers;
  cached?: boolean;
}

export enum ApiServiceType {
  EXCHANGE = 'exchange',
  ELIZAOS = 'elizaos',
  VAULT = 'vault',
  SIMULATION = 'simulation',
  MARKET_DATA = 'market_data',
  USER_MANAGEMENT = 'user_management',
  MONITORING = 'monitoring'
}

// Cache implementation for API responses
class ApiCache {
  private cache: Map<string, { data: any; timestamp: number }> = new Map();
  
  set(key: string, data: any, ttlMs: number): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now() + ttlMs
    });
  }
  
  get(key: string): any | null {
    const cached = this.cache.get(key);
    if (!cached) return null;
    
    if (Date.now() > cached.timestamp) {
      this.cache.delete(key);
      return null;
    }
    
    return cached.data;
  }
  
  invalidate(keyPattern: RegExp): void {
    for (const key of this.cache.keys()) {
      if (keyPattern.test(key)) {
        this.cache.delete(key);
      }
    }
  }
  
  clear(): void {
    this.cache.clear();
  }
}

// Circuit breaker implementation for fault tolerance
class CircuitBreaker {
  private failures: number = 0;
  private lastFailureTime: number = 0;
  private state: 'CLOSED' | 'OPEN' | 'HALF_OPEN' = 'CLOSED';
  
  constructor(
    private readonly failureThreshold: number = 5,
    private readonly resetTimeoutMs: number = 30000
  ) {}
  
  public recordSuccess(): void {
    this.failures = 0;
    this.state = 'CLOSED';
  }
  
  public recordFailure(): void {
    this.failures++;
    this.lastFailureTime = Date.now();
    
    if (this.failures >= this.failureThreshold) {
      this.state = 'OPEN';
      
      // Log circuit breaker trip
      MonitoringService.logEvent({
        type: 'circuit_breaker',
        message: `Circuit breaker tripped after ${this.failures} failures`,
        data: { failures: this.failures, timestamp: this.lastFailureTime }
      });
    }
  }
  
  public canRequest(): boolean {
    if (this.state === 'CLOSED') return true;
    
    const timeElapsed = Date.now() - this.lastFailureTime;
    if (this.state === 'OPEN' && timeElapsed >= this.resetTimeoutMs) {
      this.state = 'HALF_OPEN';
      return true;
    }
    
    return this.state === 'HALF_OPEN';
  }
  
  public getState(): string {
    return this.state;
  }
}

// Service registry for dynamic service discovery
class ServiceRegistry {
  private services: Map<ApiServiceType, string> = new Map();
  
  constructor() {
    // Default service endpoints
    this.services.set(ApiServiceType.EXCHANGE, '/api/exchanges');
    this.services.set(ApiServiceType.ELIZAOS, '/api/agents/eliza');
    this.services.set(ApiServiceType.VAULT, '/api/vault');
    this.services.set(ApiServiceType.SIMULATION, '/api/simulation');
    this.services.set(ApiServiceType.MARKET_DATA, '/api/market-data');
    this.services.set(ApiServiceType.USER_MANAGEMENT, '/api/auth');
    this.services.set(ApiServiceType.MONITORING, '/api/monitoring');
  }
  
  public getServiceUrl(type: ApiServiceType): string {
    return this.services.get(type) || '';
  }
  
  public setServiceUrl(type: ApiServiceType, url: string): void {
    this.services.set(type, url);
  }
}

export class ApiGateway {
  private static instance: ApiGateway;
  private cache: ApiCache = new ApiCache();
  private circuitBreakers: Map<string, CircuitBreaker> = new Map();
  private serviceRegistry: ServiceRegistry = new ServiceRegistry();
  
  private constructor() {}
  
  // Singleton pattern
  public static getInstance(): ApiGateway {
    if (!ApiGateway.instance) {
      ApiGateway.instance = new ApiGateway();
    }
    return ApiGateway.instance;
  }
  
  /**
   * Make an API request with standardized error handling and response formatting
   */
  public async request<T>(
    endpoint: string,
    options: ApiRequestOptions = {}
  ): Promise<ApiResponse<T>> {
    const {
      method = 'GET',
      body,
      headers = {},
      requireAuth = true,
      timeout = 30000,
      retries = 3,
      useCache = false,
      cacheTime = 60000, // 1 minute default cache
      abortSignal
    } = options;
    
    // Check circuit breaker state
    const circuitBreakerKey = this.getCircuitBreakerKey(endpoint);
    if (!this.circuitBreakers.has(circuitBreakerKey)) {
      this.circuitBreakers.set(circuitBreakerKey, new CircuitBreaker());
    }
    
    const circuitBreaker = this.circuitBreakers.get(circuitBreakerKey)!;
    
    if (!circuitBreaker.canRequest()) {
      return {
        data: null,
        error: new Error(`Service unavailable - circuit breaker open for ${endpoint}`),
        status: 503
      };
    }
    
    // Check cache if it's a GET request and caching is enabled
    const cacheKey = method === 'GET' && useCache ? `${method}:${endpoint}:${JSON.stringify(body)}` : '';
    if (cacheKey && useCache) {
      const cachedResponse = this.cache.get(cacheKey);
      if (cachedResponse) {
        return {
          ...cachedResponse,
          cached: true
        };
      }
    }
    
    // Create abort controller for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);
    
    // Combine abort signals if provided
    const signal = abortSignal
      ? this.combineAbortSignals(controller.signal, abortSignal)
      : controller.signal;
    
    // Add authentication if required
    let authHeaders = { ...headers };
    if (requireAuth) {
      try {
        // Use the appropriate Supabase client depending on context
        const isServer = typeof window === 'undefined';
        const supabase = isServer
          ? await createServerClient()
          : createBrowserClient();
        
        const { data } = await supabase.auth.getSession();
        if (data.session) {
          authHeaders.Authorization = `Bearer ${data.session.access_token}`;
        } else if (requireAuth) {
          return {
            data: null,
            error: new Error('Authentication required'),
            status: 401
          };
        }
      } catch (error) {
        // Handle auth error but don't fail request if not strictly required
        console.error('Auth error in API Gateway:', error);
        if (requireAuth) {
          return {
            data: null,
            error: new Error('Authentication failed'),
            status: 401
          };
        }
      }
    }
    
    // Execute request with retries
    let lastError: Error | null = null;
    let attempts = 0;
    
    while (attempts <= retries) {
      try {
        attempts++;
        
        const fetchOptions: RequestInit = {
          method,
          headers: {
            'Content-Type': 'application/json',
            ...authHeaders
          },
          signal
        };
        
        if (body && method !== 'GET') {
          fetchOptions.body = JSON.stringify(body);
        }
        
        const response = await fetch(endpoint, fetchOptions);
        clearTimeout(timeoutId);
        
        let data = null;
        const contentType = response.headers.get('content-type');
        
        if (contentType && contentType.includes('application/json')) {
          data = await response.json();
        } else if (contentType && contentType.includes('text/')) {
          data = await response.text();
        } else {
          // Binary data or other formats
          data = await response.blob();
        }
        
        const result: ApiResponse<T> = {
          data: response.ok ? data : null,
          error: response.ok ? null : new Error(data?.message || response.statusText),
          status: response.status,
          headers: response.headers
        };
        
        // Cache successful GET responses if caching is enabled
        if (response.ok && method === 'GET' && useCache && cacheKey) {
          this.cache.set(cacheKey, result, cacheTime);
        }
        
        // Record success for circuit breaker
        circuitBreaker.recordSuccess();
        
        // Return result
        return result;
      } catch (error) {
        clearTimeout(timeoutId);
        lastError = error as Error;
        
        // Check if we should retry (don't retry user aborts or validation errors)
        const isAborted = error instanceof DOMException && error.name === 'AbortError';
        const isTimeoutAbort = error instanceof DOMException && error.name === 'TimeoutError';
        const shouldRetry = !isAborted || isTimeoutAbort;
        
        if (shouldRetry && attempts <= retries) {
          // Exponential backoff before retry
          const backoffMs = Math.min(1000 * 2 ** attempts, 10000);
          await new Promise(resolve => setTimeout(resolve, backoffMs));
          continue;
        }
        
        // Record failure for circuit breaker
        circuitBreaker.recordFailure();
        
        // Log error
        MonitoringService.logEvent({
          type: 'error',
          message: `API request failed: ${endpoint}`,
          data: {
            error: lastError.message,
            attempts,
            endpoint,
            method
          }
        });
        
        break;
      }
    }
    
    // If we get here, all retries failed
    return {
      data: null,
      error: lastError,
      status: 0 // Unknown status
    };
  }
  
  /**
   * Make a service-specific API request
   */
  public async serviceRequest<T>(
    serviceType: ApiServiceType,
    path: string,
    options: ApiRequestOptions = {}
  ): Promise<ApiResponse<T>> {
    const baseUrl = this.serviceRegistry.getServiceUrl(serviceType);
    const endpoint = `${baseUrl}${path}`;
    return this.request<T>(endpoint, options);
  }
  
  /**
   * Invalidate cache entries for a specific pattern
   */
  public invalidateCache(pattern: RegExp): void {
    this.cache.invalidate(pattern);
  }
  
  /**
   * Clear entire cache
   */
  public clearCache(): void {
    this.cache.clear();
  }
  
  /**
   * Reset circuit breaker for an endpoint
   */
  public resetCircuitBreaker(endpoint: string): void {
    const key = this.getCircuitBreakerKey(endpoint);
    if (this.circuitBreakers.has(key)) {
      this.circuitBreakers.get(key)!.recordSuccess();
    }
  }
  
  /**
   * Get circuit breaker key from endpoint
   */
  private getCircuitBreakerKey(endpoint: string): string {
    // Extract base endpoint for the circuit breaker
    const url = new URL(endpoint, window.location.origin);
    const pathParts = url.pathname.split('/');
    return pathParts.slice(0, 3).join('/'); // Group by service
  }
  
  /**
   * Combine multiple AbortSignals
   */
  private combineAbortSignals(...signals: AbortSignal[]): AbortSignal {
    const controller = new AbortController();
    
    const onAbort = () => {
      controller.abort();
      // Clean up event listeners
      signals.forEach(signal => {
        signal.removeEventListener('abort', onAbort);
      });
    };
    
    signals.forEach(signal => {
      if (signal.aborted) {
        controller.abort();
        return;
      }
      signal.addEventListener('abort', onAbort);
    });
    
    return controller.signal;
  }
}
