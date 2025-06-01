import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';

// API Configuration Interface
export interface ApiConfig {
  baseURL: string;
  timeout?: number;
  headers?: Record<string, string>;
}

// API Response Type
export interface ApiResponse<T = any> {
  data?: T;
  error?: string;
  status: number;
  success: boolean;
}

/**
 * API Service for connecting to the Trading Farm backend API
 * Handles all HTTP requests to the backend API
 */
export class ApiService {
  private static instance: ApiService;
  private client: AxiosInstance;
  private token: string | null = null;

  private constructor(config: ApiConfig) {
    this.client = axios.create({
      baseURL: config.baseURL,
      timeout: config.timeout || 30000,
      headers: {
        'Content-Type': 'application/json',
        ...config.headers,
      }
    });

    // Add request interceptor for auth
    this.client.interceptors.request.use(
      (config) => {
        if (this.token) {
          config.headers.Authorization = `Bearer ${this.token}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Add response interceptor for error handling
    this.client.interceptors.response.use(
      (response) => response,
      (error) => this.handleApiError(error)
    );
  }

  /**
   * Get instance of ApiService (Singleton)
   */
  public static getInstance(config?: ApiConfig): ApiService {
    if (!ApiService.instance) {
      if (!config) {
        // Default config using environment variables
        config = {
          baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api',
        };
      }
      ApiService.instance = new ApiService(config);
    }
    return ApiService.instance;
  }

  /**
   * Set authentication token
   */
  public setToken(token: string): void {
    this.token = token;
  }

  /**
   * Clear authentication token
   */
  public clearToken(): void {
    this.token = null;
  }

  /**
   * Handle API errors
   */
  private handleApiError(error: any): Promise<any> {
    let errorMessage = 'An unexpected error occurred';
    let status = 500;

    if (error.response) {
      // The request was made and the server responded with a status code
      // that falls out of the range of 2xx
      status = error.response.status;
      errorMessage = error.response.data?.message || error.response.data?.error || `Error: ${status}`;
      
      // Handle auth errors
      if (status === 401) {
        // Clear token on unauthorized
        this.clearToken();
      }
    } else if (error.request) {
      // The request was made but no response was received
      errorMessage = 'No response received from server';
      status = 0;
    } else {
      // Something happened in setting up the request that triggered an Error
      errorMessage = error.message || errorMessage;
    }

    return Promise.reject({
      error: errorMessage,
      status,
      success: false
    });
  }

  /**
   * Perform a GET request
   */
  public async get<T>(url: string, params?: any, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    try {
      const response: AxiosResponse<T> = await this.client.get(url, { 
        params, 
        ...config 
      });
      
      return {
        data: response.data,
        status: response.status,
        success: true
      };
    } catch (error: any) {
      return error as ApiResponse;
    }
  }

  /**
   * Perform a POST request
   */
  public async post<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    try {
      const response: AxiosResponse<T> = await this.client.post(url, data, config);
      
      return {
        data: response.data,
        status: response.status,
        success: true
      };
    } catch (error: any) {
      return error as ApiResponse;
    }
  }

  /**
   * Perform a PUT request
   */
  public async put<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    try {
      const response: AxiosResponse<T> = await this.client.put(url, data, config);
      
      return {
        data: response.data,
        status: response.status,
        success: true
      };
    } catch (error: any) {
      return error as ApiResponse;
    }
  }

  /**
   * Perform a PATCH request
   */
  public async patch<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    try {
      const response: AxiosResponse<T> = await this.client.patch(url, data, config);
      
      return {
        data: response.data,
        status: response.status,
        success: true
      };
    } catch (error: any) {
      return error as ApiResponse;
    }
  }

  /**
   * Perform a DELETE request
   */
  public async delete<T>(url: string, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    try {
      const response: AxiosResponse<T> = await this.client.delete(url, config);
      
      return {
        data: response.data,
        status: response.status,
        success: true
      };
    } catch (error: any) {
      return error as ApiResponse;
    }
  }
}

// Export singleton instance
export const apiService = ApiService.getInstance(); 