/**
 * API Adapter
 * 
 * Server-side API adapter for the Trading Farm platform
 * Provides a unified interface for all server component API interactions
 * Handles authentication, request routing, error handling, and fallback mechanisms
 */

import { cookies } from 'next/headers';
import { createServerClient } from '@/utils/supabase/server';
import { MonitoringService } from './monitoring-service';
import { FallbackService } from './fallback-service';

// Service types
export enum ServiceType {
  EXCHANGE = 'exchange',
  ELIZAOS = 'elizaos',
  VAULT = 'vault',
  SIMULATION = 'simulation',
  MARKET_DATA = 'market_data',
  USER = 'user',
}

// Response structure
export interface ApiResponse<T> {
  data: T | null;
  error: string | null;
  status: number;
  fromMock?: boolean;
}

// Service endpoints
const SERVICE_ENDPOINTS: Record<ServiceType, string> = {
  [ServiceType.EXCHANGE]: process.env.EXCHANGE_API_URL || 'http://localhost:8001',
  [ServiceType.ELIZAOS]: process.env.ELIZAOS_API_URL || 'http://localhost:8002',
  [ServiceType.VAULT]: process.env.VAULT_API_URL || 'http://localhost:8003',
  [ServiceType.SIMULATION]: process.env.SIMULATION_API_URL || 'http://localhost:8004',
  [ServiceType.MARKET_DATA]: process.env.MARKET_DATA_API_URL || 'http://localhost:8005',
  [ServiceType.USER]: process.env.USER_API_URL || 'http://localhost:8006',
};

export class ApiAdapter {
  private fallbackService: FallbackService;
  
  constructor() {
    this.fallbackService = FallbackService.getInstance();
  }
  
  /**
   * Make an API request to a service
   */
  public async request<T>(
    service: ServiceType,
    path: string,
    options: {
      method?: string;
      body?: any;
      headers?: Record<string, string>;
      requireAuth?: boolean;
      serviceKey?: string; // For fallback service key
      fallbackEnabled?: boolean; // Whether to use fallback
    } = {}
  ): Promise<ApiResponse<T>> {
    try {
      const {
        method = 'GET',
        body,
        headers = {},
        requireAuth = true,
        serviceKey,
        fallbackEnabled = true
      } = options;
      
      // Determine fallback service key if not provided
      const fallbackKey = serviceKey || `${service.toLowerCase()}.${path.split('/')[1] || 'default'}`;
      
      // Check if we should use fallback
      if (fallbackEnabled && this.fallbackService.shouldUseFallback(fallbackKey)) {
        MonitoringService.logEvent({
          type: 'info',
          message: `Using fallback for ${service}${path}`,
          data: { serviceKey: fallbackKey }
        });
        
        const mockData = this.fallbackService.getMockData(fallbackKey);
        
        return {
          data: mockData,
          error: null,
          status: 200,
          fromMock: true
        };
      }
      
      // Get base URL for service
      const baseUrl = SERVICE_ENDPOINTS[service];
      if (!baseUrl) {
        throw new Error(`Unknown service type: ${service}`);
      }
      
      // Build request URL
      const url = `${baseUrl}${path}`;
      
      // Add authentication if required
      let authHeaders = { ...headers };
      if (requireAuth) {
        try {
          const supabase = await createServerClient();
          
          const cookieStore = cookies();
          const serviceCookie = cookieStore.get(`${service.toLowerCase()}_token`);
          
          if (serviceCookie) {
            // Use service-specific token if available
            authHeaders.Authorization = `Bearer ${serviceCookie.value}`;
          } else {
            // Fall back to Supabase auth
            const { data } = await supabase.auth.getSession();
            if (data.session) {
              authHeaders.Authorization = `Bearer ${data.session.access_token}`;
            } else if (requireAuth) {
              return {
                data: null,
                error: 'Authentication required',
                status: 401
              };
            }
          }
        } catch (error) {
          console.error('Auth error in API Adapter:', error);
          if (requireAuth) {
            return {
              data: null,
              error: 'Authentication failed',
              status: 401
            };
          }
        }
      }
      
      // Build fetch options
      const fetchOptions: RequestInit = {
        method,
        headers: {
          'Content-Type': 'application/json',
          ...authHeaders
        },
        next: { revalidate: 0 } // Disable cache
      };
      
      if (body && method !== 'GET') {
        fetchOptions.body = JSON.stringify(body);
      }
      
      // Execute request
      const response = await fetch(url, fetchOptions);
      
      if (!response.ok) {
        // Record failure for circuit breaker
        this.fallbackService.recordFailure(fallbackKey);
        
        // Log error
        MonitoringService.logEvent({
          type: 'error',
          message: `API request failed: ${service}${path}`,
          data: {
            status: response.status,
            statusText: response.statusText,
            service,
            path
          }
        });
        
        let errorData: any = null;
        try {
          errorData = await response.json();
        } catch (e) {
          errorData = { message: response.statusText };
        }
        
        return {
          data: null,
          error: errorData?.message || response.statusText,
          status: response.status
        };
      }
      
      // Handle empty responses
      if (response.status === 204) {
        // Record success for circuit breaker
        this.fallbackService.recordSuccess(fallbackKey);
        
        return {
          data: null,
          error: null,
          status: 204
        };
      }
      
      // Parse response body
      let data: any = null;
      try {
        data = await response.json();
      } catch (error) {
        // Handle non-JSON responses
        const text = await response.text();
        
        if (text) {
          data = { message: text };
        }
      }
      
      // Record success for circuit breaker
      this.fallbackService.recordSuccess(fallbackKey);
      
      return {
        data,
        error: null,
        status: response.status
      };
    } catch (error: any) {
      // Record failure for circuit breaker if serviceKey provided
      if (serviceKey) {
        this.fallbackService.recordFailure(serviceKey);
      }
      
      // Log error
      MonitoringService.logEvent({
        type: 'error',
        message: `API adapter error for ${service}${path}`,
        data: { error: error.message, service, path }
      });
      
      // Try to use fallback data even if fallback wasn't initially enabled
      if (serviceKey) {
        const mockData = this.fallbackService.getMockData(serviceKey);
        
        return {
          data: mockData,
          error: `Original error: ${error.message}`,
          status: 503,
          fromMock: true
        };
      }
      
      return {
        data: null,
        error: error.message,
        status: 500
      };
    }
  }
  
  /**
   * Make a GET request to a service
   */
  public async get<T>(
    service: ServiceType,
    path: string,
    options: Omit<Parameters<ApiAdapter['request']>[2], 'method'> = {}
  ): Promise<ApiResponse<T>> {
    return this.request<T>(service, path, { ...options, method: 'GET' });
  }
  
  /**
   * Make a POST request to a service
   */
  public async post<T>(
    service: ServiceType,
    path: string,
    body: any,
    options: Omit<Parameters<ApiAdapter['request']>[2], 'method' | 'body'> = {}
  ): Promise<ApiResponse<T>> {
    return this.request<T>(service, path, { ...options, method: 'POST', body });
  }
  
  /**
   * Make a PUT request to a service
   */
  public async put<T>(
    service: ServiceType,
    path: string,
    body: any,
    options: Omit<Parameters<ApiAdapter['request']>[2], 'method' | 'body'> = {}
  ): Promise<ApiResponse<T>> {
    return this.request<T>(service, path, { ...options, method: 'PUT', body });
  }
  
  /**
   * Make a PATCH request to a service
   */
  public async patch<T>(
    service: ServiceType,
    path: string,
    body: any,
    options: Omit<Parameters<ApiAdapter['request']>[2], 'method' | 'body'> = {}
  ): Promise<ApiResponse<T>> {
    return this.request<T>(service, path, { ...options, method: 'PATCH', body });
  }
  
  /**
   * Make a DELETE request to a service
   */
  public async delete<T>(
    service: ServiceType,
    path: string,
    options: Omit<Parameters<ApiAdapter['request']>[2], 'method'> = {}
  ): Promise<ApiResponse<T>> {
    return this.request<T>(service, path, { ...options, method: 'DELETE' });
  }
  
  /**
   * Get health status of all services
   */
  public async getServiceHealth(): Promise<Record<ServiceType, boolean>> {
    const health: Partial<Record<ServiceType, boolean>> = {};
    
    // Check health for each service in parallel
    const healthChecks = Object.values(ServiceType).map(async (service) => {
      try {
        const response = await this.get(service as ServiceType, '/health', {
          requireAuth: false,
          fallbackEnabled: false
        });
        
        health[service as ServiceType] = response.status >= 200 && response.status < 300;
      } catch (error) {
        health[service as ServiceType] = false;
      }
    });
    
    await Promise.all(healthChecks);
    
    return health as Record<ServiceType, boolean>;
  }
}

// Export singleton instance
export const apiAdapter = new ApiAdapter();
