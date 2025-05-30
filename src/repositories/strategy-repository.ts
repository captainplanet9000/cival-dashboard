import { BaseRepository, QueryOptions } from '../lib/base-repository';
import { Strategy, CreateStrategyParams, UpdateStrategyParams, StrategyQueryOptions } from '../models/strategy';
import { supabase } from '../integrations/supabase/client';

/**
 * Repository for managing trading strategies
 */
export class StrategyRepository extends BaseRepository<Strategy> {
  constructor() {
    super('trading_strategies', supabase);
  }
  
  /**
   * Create a new strategy
   */
  async create(params: CreateStrategyParams): Promise<Strategy> {
    const result = await this.client
      .from(this.tableName)
      .insert({
        name: params.name,
        description: params.description,
        strategy_type: params.strategy_type,
        parameters: params.parameters,
        is_active: params.is_active,
        performance_metrics: params.performance_metrics || {},
        backtest_results: params.backtest_results || null
      })
      .select()
      .single();
      
    if (result.error) {
      this.handleError(result.error);
      throw new Error(`Failed to create strategy: ${result.error.message}`);
    }
    
    return result.data as Strategy;
  }
  
  /**
   * Get strategies matching the query options
   */
  async getStrategies(options: StrategyQueryOptions = {}): Promise<Strategy[]> {
    let query = this.client
      .from(this.tableName)
      .select('*');
    
    // Apply filters
    if (options.strategy_type) {
      query = query.eq('strategy_type', options.strategy_type);
    }
    
    if (options.is_active !== undefined) {
      query = query.eq('is_active', options.is_active);
    }
    
    // Apply ordering
    if (options.orderBy) {
      const direction = options.orderDirection || 'desc';
      query = query.order(options.orderBy, { ascending: direction === 'asc' });
    } else {
      query = query.order('created_at', { ascending: false });
    }
    
    // Apply pagination
    if (options.limit) {
      query = query.limit(options.limit);
    }
    
    if (options.offset) {
      query = query.range(options.offset, options.offset + (options.limit || 10) - 1);
    }
    
    const { data, error } = await query;
    
    if (error) {
      this.handleError(error);
      return [];
    }
    
    return data as Strategy[];
  }
  
  /**
   * Get strategies of a specific type
   */
  async getByType(type: Strategy['strategy_type'], isActive: boolean = true): Promise<Strategy[]> {
    return this.getStrategies({
      strategy_type: type,
      is_active: isActive
    });
  }
  
  /**
   * Get active strategies
   */
  async getActiveStrategies(): Promise<Strategy[]> {
    return this.getStrategies({
      is_active: true
    });
  }
  
  /**
   * Update a strategy
   */
  async update(id: string, params: UpdateStrategyParams): Promise<Strategy | null> {
    const { data, error } = await this.client
      .from(this.tableName)
      .update(params)
      .eq('id', id)
      .select()
      .single();
    
    if (error) {
      this.handleError(error);
      return null;
    }
    
    return data as Strategy;
  }
  
  /**
   * Get strategies for a farm
   */
  async getStrategiesForFarm(farmId: string): Promise<any[]> {
    const { data, error } = await this.client
      .from('farm_strategies')
      .select(`
        *,
        strategy:strategy_id(*)
      `)
      .eq('farm_id', farmId);
    
    if (error) {
      this.handleError(error);
      return [];
    }
    
    return data;
  }
  
  /**
   * Clone a strategy
   */
  async cloneStrategy(id: string, newName: string): Promise<Strategy | null> {
    // Get the original strategy
    const original = await this.getById(id);
    if (!original) {
      return null;
    }
    
    // Create a new strategy with the same parameters
    const cloned = await this.create({
      name: newName || `Copy of ${original.name}`,
      description: original.description,
      strategy_type: original.strategy_type,
      parameters: original.parameters,
      is_active: false, // Default to inactive for safety
      performance_metrics: {
        backtest_count: 0,
        avg_profit_loss: 0,
        win_rate: 0,
        sharpe_ratio: 0,
        last_updated: new Date().toISOString()
      }
    });
    
    return cloned;
  }
} 