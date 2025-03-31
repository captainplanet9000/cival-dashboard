import axios, { AxiosInstance, AxiosError, AxiosRequestConfig } from 'axios';

// API response interface
export interface ApiResponse<T = any> {
  data: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
}

// API error class
export class ApiError extends Error {
  constructor(
    public code: string,
    message: string,
    public details?: any
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

// API client configuration
export interface ApiClientConfig {
  baseUrl: string;
  headers?: Record<string, string>;
  timeout?: number;
}

// API client class
export class ApiClient {
  private baseUrl: string;
  private headers: Record<string, string>;
  private timeout: number;

  constructor(config: ApiClientConfig) {
    this.baseUrl = config.baseUrl;
    this.headers = {
      'Content-Type': 'application/json',
      ...config.headers,
    };
    this.timeout = config.timeout || 30000;
  }

  // Set authorization token
  public setAuthToken(token: string) {
    this.headers['Authorization'] = `Bearer ${token}`;
  }

  // Remove authorization token
  public removeAuthToken() {
    delete this.headers['Authorization'];
  }

  private getQueryString(params?: Record<string, any>): string {
    if (!params) return '';
    const query = Object.entries(params)
      .filter(([_, value]) => value !== undefined && value !== null)
      .map(([key, value]) => {
        if (Array.isArray(value)) {
          return value
            .map((v) => `${key}[]=${encodeURIComponent(v)}`)
            .join('&');
        }
        return `${key}=${encodeURIComponent(value)}`;
      })
      .join('&');
    return query ? `?${query}` : '';
  }

  // Generic request method
  private async request<T>(
    method: string,
    endpoint: string,
    data?: any,
    params?: Record<string, any>
  ): Promise<ApiResponse<T>> {
    const url = `${this.baseUrl}${endpoint}${this.getQueryString(params)}`;
    
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.timeout);

      const response = await fetch(url, {
        method,
        headers: this.headers,
        body: data ? JSON.stringify(data) : undefined,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      const responseData = await response.json();

      if (!response.ok) {
        throw new ApiError(
          responseData.error?.code || 'UNKNOWN_ERROR',
          responseData.error?.message || 'An unknown error occurred',
          responseData.error?.details
        );
      }

      return responseData;
    } catch (error: unknown) {
      if (error instanceof ApiError) {
        throw error;
      }

      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          throw new ApiError(
            'TIMEOUT',
            `Request timed out after ${this.timeout}ms`
          );
        }

        throw new ApiError(
          'NETWORK_ERROR',
          'A network error occurred',
          { originalError: error.message }
        );
      }

      throw new ApiError(
        'UNKNOWN_ERROR',
        'An unknown error occurred',
        { originalError: error }
      );
    }
  }

  // HTTP methods
  public async get<T>(
    endpoint: string,
    params?: Record<string, any>
  ): Promise<T> {
    const response = await this.request<T>('GET', endpoint, undefined, params);
    return response.data;
  }

  public async post<T>(
    endpoint: string,
    data?: any,
    params?: Record<string, any>
  ): Promise<T> {
    const response = await this.request<T>('POST', endpoint, data, params);
    return response.data;
  }

  public async put<T>(
    endpoint: string,
    data?: any,
    params?: Record<string, any>
  ): Promise<T> {
    const response = await this.request<T>('PUT', endpoint, data, params);
    return response.data;
  }

  public async patch<T>(
    endpoint: string,
    data?: any,
    params?: Record<string, any>
  ): Promise<T> {
    const response = await this.request<T>('PATCH', endpoint, data, params);
    return response.data;
  }

  public async delete<T>(
    endpoint: string,
    params?: Record<string, any>
  ): Promise<T> {
    const response = await this.request<T>('DELETE', endpoint, undefined, params);
    return response.data;
  }
}

// Create and export API client instance
export const apiClient = new ApiClient({
  baseUrl: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001',
  headers: {
    'X-Client-Version': process.env.NEXT_PUBLIC_VERSION || '1.0.0',
  },
}); 