// Farm-related types (to avoid dependency on farm-types.ts)
interface Farm {
  id: string | number;
  name: string;
  description?: string;
  created_at: string;
  updated_at: string;
  user_id?: string;
  risk_profile?: {
    max_drawdown: number;
    max_trade_size: number;
    risk_per_trade: number;
    volatility_tolerance: 'low' | 'medium' | 'high';
  };
}

interface Agent {
  id: string | number;
  name: string;
  farm_id: string | number;
  status: 'active' | 'paused' | 'stopped';
  exchange: string;
  strategy: string;
  created_at: string;
  updated_at: string;
}

interface Wallet {
  id: string | number;
  name: string;
  farm_id: string | number;
  balance: number;
  currency: string;
  address?: string;
  created_at: string;
  updated_at: string;
}

// API response interface matching our backend
interface ApiResponse<T = any> {
  data?: T;
  error?: string;
  status: number;
  success: boolean;
}

// Base API client with error handling
class ApiClient {
  private baseUrl: string;
  private token: string | null = null;

  constructor() {
    // Get base URL from environment or use default
    this.baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';
    
    // Check for stored auth token if on client side
    if (typeof window !== 'undefined') {
      this.token = localStorage.getItem('auth_token');
    }
  }

  // Set authentication token
  setToken(token: string): void {
    this.token = token;
    if (typeof window !== 'undefined') {
      localStorage.setItem('auth_token', token);
    }
  }

  // Clear authentication token
  clearToken(): void {
    this.token = null;
    if (typeof window !== 'undefined') {
      localStorage.removeItem('auth_token');
    }
  }

  // Helper for making API requests
  private async request<T>(
    endpoint: string,
    method: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'GET',
    body?: any
  ): Promise<ApiResponse<T>> {
    try {
      const url = `${this.baseUrl}${endpoint}`;
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
      };

      // Add auth token if available
      if (this.token) {
        headers['Authorization'] = `Bearer ${this.token}`;
      }

      // Make fetch request
      const response = await fetch(url, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined,
      });

      // Parse response
      let data: any;
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        data = await response.json();
      } else {
        data = await response.text();
      }

      // Return formatted response
      if (response.ok) {
        return {
          data,
          status: response.status,
          success: true,
        };
      } else {
        return {
          error: data.message || 'An error occurred',
          status: response.status,
          success: false,
        };
      }
    } catch (error) {
      // Handle network errors
      return {
        error: error instanceof Error ? error.message : 'Network error',
        status: 0,
        success: false,
      };
    }
  }

  // Helper for adding query parameters
  private addQueryParams(url: string, params?: Record<string, any>): string {
    if (!params) return url;
    
    const queryParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        queryParams.append(key, value.toString());
      }
    });
    
    const queryString = queryParams.toString();
    if (queryString) {
      return `${url}?${queryString}`;
    }
    return url;
  }

  // GET request
  async get<T>(endpoint: string, params?: Record<string, any>): Promise<ApiResponse<T>> {
    const url = this.addQueryParams(endpoint, params);
    return this.request<T>(url, 'GET');
  }

  // POST request
  async post<T>(endpoint: string, data: any): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, 'POST', data);
  }

  // PUT request
  async put<T>(endpoint: string, data: any): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, 'PUT', data);
  }

  // DELETE request
  async delete<T>(endpoint: string): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, 'DELETE');
  }
}

// Farm API client
class FarmApiClient {
  private api: ApiClient;
  private baseEndpoint = '/farms';

  constructor(api: ApiClient) {
    this.api = api;
  }

  // Get all farms
  async getFarms(userId?: string): Promise<ApiResponse<Farm[]>> {
    const params = userId ? { user_id: userId } : undefined;
    return this.api.get<Farm[]>(this.baseEndpoint, params);
  }

  // Get a farm by ID
  async getFarm(id: string | number): Promise<ApiResponse<Farm>> {
    return this.api.get<Farm>(`${this.baseEndpoint}/${id}`);
  }

  // Create a new farm
  async createFarm(data: { name: string; description?: string }): Promise<ApiResponse<Farm>> {
    return this.api.post<Farm>(this.baseEndpoint, data);
  }

  // Update a farm
  async updateFarm(id: string | number, data: Partial<Farm>): Promise<ApiResponse<Farm>> {
    return this.api.put<Farm>(`${this.baseEndpoint}/${id}`, data);
  }

  // Delete a farm
  async deleteFarm(id: string | number): Promise<ApiResponse<{ success: boolean }>> {
    return this.api.delete<{ success: boolean }>(`${this.baseEndpoint}/${id}`);
  }

  // Get farm risk profile
  async getFarmRiskProfile(id: string | number): Promise<ApiResponse<{
    riskScore: number;
    factors: Array<{ name: string; impact: number; description: string }>;
  }>> {
    return this.api.get<{
      riskScore: number;
      factors: Array<{ name: string; impact: number; description: string }>;
    }>(`${this.baseEndpoint}/${id}/risk-profile`);
  }

  // Get agents for a farm
  async getAgents(farmId: string | number): Promise<ApiResponse<Agent[]>> {
    return this.api.get<Agent[]>(`${this.baseEndpoint}/${farmId}/agents`);
  }

  // Get wallets for a farm
  async getWallets(farmId: string | number): Promise<ApiResponse<Wallet[]>> {
    return this.api.get<Wallet[]>(`${this.baseEndpoint}/${farmId}/wallets`);
  }

  // Create a new agent for a farm
  async createAgent(farmId: string | number, data: Partial<Agent>): Promise<ApiResponse<Agent>> {
    return this.api.post<Agent>(`${this.baseEndpoint}/${farmId}/agents`, data);
  }

  // Create a new wallet for a farm
  async createWallet(farmId: string | number, data: Partial<Wallet>): Promise<ApiResponse<Wallet>> {
    return this.api.post<Wallet>(`${this.baseEndpoint}/${farmId}/wallets`, data);
  }
}

// ElizaOS API client for AI capabilities
class ElizaOSApiClient {
  private api: ApiClient;
  private baseEndpoint = '/elizaos';

  constructor(api: ApiClient) {
    this.api = api;
  }

  // Get knowledge from ElizaOS
  async queryKnowledge(query: string, farmId?: string): Promise<ApiResponse<{
    content: string;
    sources: Array<{ title: string; url: string }>;
  }>> {
    const params = farmId ? { farm_id: farmId } : undefined;
    return this.api.post<{
      content: string;
      sources: Array<{ title: string; url: string }>;
    }>(`${this.baseEndpoint}/knowledge`, { query, ...params });
  }

  // Execute command on ElizaOS
  async executeCommand(command: string, farmId: string): Promise<ApiResponse<{
    response: string;
    success: boolean;
    category: string;
    source: string;
  }>> {
    return this.api.post<{
      response: string;
      success: boolean;
      category: string;
      source: string;
    }>(`${this.baseEndpoint}/command`, { command, farm_id: farmId });
  }

  // Get command history for a farm
  async getCommandHistory(farmId: string): Promise<ApiResponse<Array<{
    id: string;
    command: string;
    response: string;
    timestamp: string;
    category: string;
    source: string;
  }>>> {
    return this.api.get<Array<{
      id: string;
      command: string;
      response: string;
      timestamp: string;
      category: string;
      source: string;
    }>>(`${this.baseEndpoint}/history/${farmId}`);
  }

  // Get AI-generated strategy recommendations
  async getStrategyRecommendations(farmId: string): Promise<ApiResponse<{
    strategies: Array<{
      name: string;
      description: string;
      riskLevel: string;
      expectedReturn: number;
      confidence: number;
    }>;
  }>> {
    return this.api.get<{
      strategies: Array<{
        name: string;
        description: string;
        riskLevel: string;
        expectedReturn: number;
        confidence: number;
      }>;
    }>(`${this.baseEndpoint}/strategies/${farmId}`);
  }

  // Get AI-powered risk analysis
  async getRiskAnalysis(farmId: string): Promise<ApiResponse<{
    analysis: string;
    riskScore: number;
    recommendations: string[];
  }>> {
    return this.api.get<{
      analysis: string;
      riskScore: number;
      recommendations: string[];
    }>(`${this.baseEndpoint}/risk-analysis/${farmId}`);
  }
}

// Create singleton instances
const apiClient = new ApiClient();
const farmApiClient = new FarmApiClient(apiClient);
const elizaOSApiClient = new ElizaOSApiClient(apiClient);

// Export API clients
export { apiClient, farmApiClient, elizaOSApiClient };
export type { ApiResponse };
