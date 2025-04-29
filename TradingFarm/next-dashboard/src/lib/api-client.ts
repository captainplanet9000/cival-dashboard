/**
 * API client for Trading Farm Dashboard
 * Provides typed methods for interacting with the API
 */

// Generic API response type
export interface ApiResponse<T = any> {
  data?: T;
  error?: string;
  pagination?: {
    limit: number;
    offset: number;
    total?: number;
  };
}

// Dashboard data interface
export interface DashboardData {
  totalFarms: number;
  activeFarms: number;
  totalAgents: number;
  activeAgents: number;
  totalValueLocked: number;
  recentTrades: any[];
  overallPerformance: {
    win_rate: number;
    profit_factor: number;
    total_trades: number;
    total_profit_loss: number;
  };
  topPerformingAgents: any[];
  marketSummary: {
    trending: any[];
    volume: any[];
  };
}

// Farm interface
export interface Farm {
  id: number;
  name: string;
  description?: string;
  is_active: boolean;
  risk_profile?: {
    max_drawdown: number;
    max_trade_size?: number;
    risk_per_trade?: number;
    volatility_tolerance?: 'low' | 'medium' | 'high';
  };
  performance_metrics?: {
    win_rate: number;
    profit_factor?: number;
    trades_count: number;
    total_profit_loss?: number;
  };
  config?: {
    test_mode?: boolean;
    allowed_exchanges?: string[];
    allowed_markets?: string[];
  };
  agents_count?: number;
  strategies_count?: number;
  wallets_count?: number;
  created_at?: string;
  updated_at?: string;
}

// Agent interface
export interface Agent {
  id: number;
  farm_id: number;
  name: string;
  is_active: boolean;
  agent_type?: string;
  performance_metrics?: {
    win_rate: number;
    profit_factor: number;
    trades_count: number;
    total_profit_loss: number;
  };
  created_at?: string;
  updated_at?: string;
}

// Order interface
export interface Order {
  id: number;
  farm_id: number;
  agent_id?: number;
  symbol: string;
  side: 'buy' | 'sell';
  quantity: number;
  price?: number;
  status: 'new' | 'open' | 'filled' | 'partially_filled' | 'canceled' | 'rejected' | 'expired';
  created_at?: string;
  updated_at?: string;
}

// Trade interface
export interface Trade {
  id: number;
  order_id: number;
  farm_id: number;
  symbol: string;
  side: 'buy' | 'sell';
  price?: number;
  quantity: number;
  profit_loss?: number;
  executed_at?: string;
  created_at?: string;
  updated_at?: string;
}

// Base API client class with common methods
class ApiClient {
  private baseUrl: string;
  
  constructor(baseUrl = '/api') {
    this.baseUrl = baseUrl;
  }
  
  /**
   * Generic fetch method with error handling
   */
  protected async fetch<T>(
    endpoint: string, 
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    try {
      const response = await fetch(`${this.baseUrl}/${endpoint}`, {
        headers: {
          'Content-Type': 'application/json',
          ...options.headers
        },
        ...options
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || `API error: ${response.status}`);
      }
      
      return data;
    } catch (error) {
      console.error(`API error (${endpoint}):`, error);
      return { error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }
  
  /**
   * GET request
   */
  protected async get<T>(endpoint: string, params?: Record<string, any>): Promise<ApiResponse<T>> {
    const url = new URL(`${this.baseUrl}/${endpoint}`, window.location.origin);
    
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          url.searchParams.append(key, String(value));
        }
      });
    }
    
    return this.fetch<T>(url.pathname + url.search);
  }
  
  /**
   * POST request
   */
  protected async post<T>(endpoint: string, data: any): Promise<ApiResponse<T>> {
    return this.fetch<T>(endpoint, {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }
  
  /**
   * PUT request
   */
  protected async put<T>(endpoint: string, data: any): Promise<ApiResponse<T>> {
    return this.fetch<T>(endpoint, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  }
  
  /**
   * DELETE request
   */
  protected async delete<T>(endpoint: string): Promise<ApiResponse<T>> {
    return this.fetch<T>(endpoint, { method: 'DELETE' });
  }
}

/**
 * Dashboard API client
 */
export class DashboardApiClient extends ApiClient {
  /**
   * Get dashboard summary
   */
  async getDashboardSummary(userId: number): Promise<ApiResponse<DashboardData>> {
    return this.get<DashboardData>('dashboard', { userId });
  }
}

/**
 * Farm API client
 */
export class FarmApiClient extends ApiClient {
  /**
   * Get all farms
   */
  async getFarms(ownerId?: number): Promise<ApiResponse<Farm[]>> {
    return this.get<Farm[]>('farms', { ownerId });
  }
  
  /**
   * Get a specific farm
   */
  async getFarm(id: number): Promise<ApiResponse<Farm>> {
    return this.get<Farm>(`farms/${id}`);
  }
  
  /**
   * Create a new farm
   */
  async createFarm(farm: Partial<Farm>): Promise<ApiResponse<Farm>> {
    return this.post<Farm>('farms', farm);
  }
  
  /**
   * Update a farm
   */
  async updateFarm(id: number, farm: Partial<Farm>): Promise<ApiResponse<Farm>> {
    return this.put<Farm>(`farms/${id}`, farm);
  }
  
  /**
   * Delete a farm
   */
  async deleteFarm(id: number): Promise<ApiResponse<{ success: boolean }>> {
    return this.delete<{ success: boolean }>(`farms/${id}`);
  }
}

/**
 * Agent API client
 */
export class AgentApiClient extends ApiClient {
  /**
   * Get all agents
   */
  async getAgents(farmId?: number): Promise<ApiResponse<Agent[]>> {
    return this.get<Agent[]>('agents', { farmId });
  }
  
  /**
   * Get a specific agent
   */
  async getAgent(id: number): Promise<ApiResponse<Agent>> {
    return this.get<Agent>(`agents/${id}`);
  }
  
  /**
   * Create a new agent
   */
  async createAgent(agent: Partial<Agent>): Promise<ApiResponse<Agent>> {
    return this.post<Agent>('agents', agent);
  }
  
  /**
   * Update an agent
   */
  async updateAgent(id: number, agent: Partial<Agent>): Promise<ApiResponse<Agent>> {
    return this.put<Agent>(`agents/${id}`, agent);
  }
  
  /**
   * Delete an agent
   */
  async deleteAgent(id: number): Promise<ApiResponse<{ success: boolean }>> {
    return this.delete<{ success: boolean }>(`agents/${id}`);
  }
  
  /**
   * Start an agent
   */
  async startAgent(id: number): Promise<ApiResponse<Agent>> {
    return this.post<Agent>(`agents/${id}/actions`, { action: 'start' });
  }
  
  /**
   * Stop an agent
   */
  async stopAgent(id: number): Promise<ApiResponse<Agent>> {
    return this.post<Agent>(`agents/${id}/actions`, { action: 'stop' });
  }
}

/**
 * Order API client
 */
export class OrderApiClient extends ApiClient {
  /**
   * Get orders with optional filters
   */
  async getOrders(params?: {
    farmId?: number;
    agentId?: number;
    status?: string | string[];
    limit?: number;
    offset?: number;
  }): Promise<ApiResponse<Order[]>> {
    return this.get<Order[]>('orders', params);
  }
  
  /**
   * Get a specific order
   */
  async getOrder(id: number): Promise<ApiResponse<Order>> {
    return this.get<Order>(`orders/${id}`);
  }
  
  /**
   * Create a new order
   */
  async createOrder(order: Partial<Order>): Promise<ApiResponse<Order>> {
    return this.post<Order>('orders', order);
  }
  
  /**
   * Cancel an order
   */
  async cancelOrder(id: number): Promise<ApiResponse<Order>> {
    return this.delete<Order>(`orders/${id}`);
  }
}

/**
 * Trade API client
 */
export class TradeApiClient extends ApiClient {
  /**
   * Get trades
   */
  async getTrades(params?: {
    farmId?: number;
    agentId?: number;
    orderId?: number;
    symbol?: string;
    limit?: number;
    offset?: number;
  }): Promise<ApiResponse<Trade[]>> {
    return this.get<Trade[]>('trades', params);
  }
  
  /**
   * Get trade metrics
   */
  async getTradeMetrics(params: {
    farmId?: number;
    agentId?: number;
    symbol?: string;
  }): Promise<ApiResponse<any>> {
    return this.get<any>('analytics/trade-metrics', params);
  }
}

// Create and export client instances
export const dashboardApi = new DashboardApiClient();
export const farmApi = new FarmApiClient();
export const agentApi = new AgentApiClient();
// Generic API client instance
export const api = new ApiClient();
export const orderApi = new OrderApiClient();
export const tradeApi = new TradeApiClient();