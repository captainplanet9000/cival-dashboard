import { SupabaseService, ApiResponse } from '../database/supabase-service';
import { Database } from '@/types/database.types';

// Strategy type from database
export type Strategy = Database['public']['Tables']['strategies']['Row'];

// Parameters for creating a strategy
export interface CreateStrategyParams {
  name: string;
  description?: string;
  type: string;
  riskLevel: 'Low' | 'Medium' | 'High';
  parameters: Record<string, any>;
  tradingPairs?: string[];
}

// Parameters for updating a strategy
export interface UpdateStrategyParams {
  name?: string;
  description?: string;
  type?: string;
  riskLevel?: 'Low' | 'Medium' | 'High';
  parameters?: Record<string, any>;
  tradingPairs?: string[];
}

/**
 * Service for managing trading strategies
 */
export class StrategyService {
  private dbService = SupabaseService.getInstance();
  private static instance: StrategyService;

  // Private constructor for singleton pattern
  private constructor() {}

  // Get singleton instance
  public static getInstance(): StrategyService {
    if (!StrategyService.instance) {
      StrategyService.instance = new StrategyService();
    }
    return StrategyService.instance;
  }

  /**
   * Get all strategies with optional filtering
   */
  async getStrategies(options?: {
    type?: string;
    riskLevel?: 'Low' | 'Medium' | 'High';
    limit?: number;
  }): Promise<ApiResponse<Strategy[]>> {
    const conditions: Record<string, any> = {};
    
    if (options?.type) {
      conditions.type = options.type;
    }
    
    if (options?.riskLevel) {
      conditions.riskLevel = options.riskLevel;
    }
    
    return this.dbService.fetch<Strategy[]>('strategies', '*', {
      eq: conditions,
      limit: options?.limit,
      order: { column: 'created_at', ascending: false }
    });
  }

  /**
   * Get a strategy by ID
   */
  async getStrategyById(id: number | string): Promise<ApiResponse<Strategy>> {
    return this.dbService.fetch<Strategy>('strategies', '*', {
      eq: { id },
      single: true
    });
  }

  /**
   * Create a new strategy
   */
  async createStrategy(params: CreateStrategyParams): Promise<ApiResponse<Strategy>> {
    const strategyData = {
      name: params.name,
      description: params.description || null,
      type: params.type,
      risk_level: params.riskLevel,
      parameters: params.parameters,
      trading_pairs: params.tradingPairs || [],
      performance: 0,
      success_rate: 0,
      status: 'inactive',
      last_tested: new Date().toISOString()
    };

    return this.dbService.create<Strategy>('strategies', strategyData, { single: true });
  }

  /**
   * Update an existing strategy
   */
  async updateStrategy(id: number | string, params: UpdateStrategyParams): Promise<ApiResponse<Strategy>> {
    const updateData: Record<string, any> = {};
    
    if (params.name !== undefined) updateData.name = params.name;
    if (params.description !== undefined) updateData.description = params.description;
    if (params.type !== undefined) updateData.type = params.type;
    if (params.riskLevel !== undefined) updateData.risk_level = params.riskLevel;
    if (params.parameters !== undefined) updateData.parameters = params.parameters;
    if (params.tradingPairs !== undefined) updateData.trading_pairs = params.tradingPairs;
    
    return this.dbService.update<Strategy>('strategies', updateData, { id }, { single: true });
  }

  /**
   * Delete a strategy
   */
  async deleteStrategy(id: number | string): Promise<ApiResponse<Strategy>> {
    return this.dbService.remove<Strategy>('strategies', { id });
  }

  /**
   * Activate a strategy
   */
  async activateStrategy(id: number | string): Promise<ApiResponse<Strategy>> {
    return this.dbService.update<Strategy>('strategies', { status: 'active' }, { id }, { single: true });
  }

  /**
   * Deactivate a strategy
   */
  async deactivateStrategy(id: number | string): Promise<ApiResponse<Strategy>> {
    return this.dbService.update<Strategy>('strategies', { status: 'inactive' }, { id }, { single: true });
  }

  /**
   * Update strategy performance metrics
   */
  async updatePerformanceMetrics(
    id: number | string, 
    performance: number, 
    successRate: number
  ): Promise<ApiResponse<Strategy>> {
    return this.dbService.update<Strategy>(
      'strategies', 
      { 
        performance, 
        success_rate: successRate,
        last_updated: new Date().toISOString()
      }, 
      { id }, 
      { single: true }
    );
  }
  
  /**
   * Subscribe to strategy changes
   */
  subscribeToStrategies(callback: (payload: any) => void): () => void {
    return this.dbService.subscribe('strategies', callback);
  }
}

// Export singleton instance
export const strategyService = StrategyService.getInstance();