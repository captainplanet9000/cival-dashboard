/**
 * Strategy Factory
 * 
 * Responsible for creating, registering, and managing strategy instances.
 * Implements a pluggable architecture allowing for easy extension.
 */

import { IStrategy, StrategyMeta, StrategyInstance } from './types';
import { MovingAverageCrossoverStrategy } from './strategies/moving-average-crossover';
import { createBrowserClient } from '@/utils/supabase/client';

/**
 * Registry of all available strategy implementations
 */
export const strategyRegistry: Record<string, new () => IStrategy> = {
  'moving-average-crossover': MovingAverageCrossoverStrategy,
  // Add more strategies here as they are implemented
};

export class StrategyFactory {
  private strategies: Map<string, IStrategy> = new Map();
  private supabase = createBrowserClient();
  
  /**
   * Get all available strategy metadata
   */
  public async getAvailableStrategies(): Promise<StrategyMeta[]> {
    const metaList: StrategyMeta[] = [];
    
    for (const id in strategyRegistry) {
      try {
        const strategyClass = strategyRegistry[id];
        const strategy = new strategyClass();
        metaList.push(strategy.getMeta());
      } catch (error) {
        console.error(`Error loading strategy ${id}:`, error);
      }
    }
    
    return metaList;
  }
  
  /**
   * Create a new strategy instance
   */
  public async createStrategy(strategyId: string): Promise<IStrategy | null> {
    try {
      const strategyClass = strategyRegistry[strategyId];
      
      if (!strategyClass) {
        throw new Error(`Strategy ${strategyId} not found in registry`);
      }
      
      const strategy = new strategyClass();
      return strategy;
    } catch (error) {
      console.error(`Error creating strategy ${strategyId}:`, error);
      return null;
    }
  }
  
  /**
   * Get or create a strategy instance
   */
  public async getStrategy(strategyId: string): Promise<IStrategy | null> {
    // Check if the strategy is already in the cache
    if (this.strategies.has(strategyId)) {
      return this.strategies.get(strategyId)!;
    }
    
    // Create new strategy
    const strategy = await this.createStrategy(strategyId);
    
    if (strategy) {
      this.strategies.set(strategyId, strategy);
    }
    
    return strategy;
  }
  
  /**
   * Fetch user's strategy instances from the database
   */
  public async getUserStrategies(userId: string): Promise<StrategyInstance[]> {
    try {
      const { data, error } = await this.supabase
        .from('strategy_instances')
        .select('*')
        .eq('user_id', userId);
      
      if (error) {
        throw error;
      }
      
      return data.map((instance: any) => ({
        id: instance.id,
        strategyId: instance.strategy_id,
        name: instance.name,
        description: instance.description,
        parameters: instance.parameters,
        symbols: instance.symbols,
        timeframes: instance.timeframes,
        isActive: instance.is_active,
        userId: instance.user_id,
        createdAt: instance.created_at,
        updatedAt: instance.updated_at,
        lastExecutedAt: instance.last_executed_at,
        lastSignal: instance.last_signal,
        executionFrequency: instance.execution_frequency,
        tags: instance.tags
      }));
    } catch (error) {
      console.error('Error fetching user strategies:', error);
      return [];
    }
  }
  
  /**
   * Create a new strategy instance in the database
   */
  public async createStrategyInstance(
    userId: string,
    strategyId: string,
    name: string,
    parameters: Record<string, any>,
    symbols: string[],
    timeframes: string[]
  ): Promise<StrategyInstance | null> {
    try {
      // Validate the strategy first
      const strategy = await this.getStrategy(strategyId);
      
      if (!strategy) {
        throw new Error(`Strategy ${strategyId} not found`);
      }
      
      // Validate parameters
      if (!strategy.validateParameters(parameters)) {
        throw new Error('Invalid strategy parameters');
      }
      
      // Create the strategy instance
      const { data, error } = await this.supabase
        .from('strategy_instances')
        .insert({
          strategy_id: strategyId,
          name,
          parameters,
          symbols,
          timeframes,
          is_active: false, // Start inactive by default
          user_id: userId,
          execution_frequency: 60, // Default to 60 minutes
          tags: []
        })
        .select()
        .single();
      
      if (error) {
        throw error;
      }
      
      return {
        id: data.id,
        strategyId: data.strategy_id,
        name: data.name,
        description: data.description,
        parameters: data.parameters,
        symbols: data.symbols,
        timeframes: data.timeframes,
        isActive: data.is_active,
        userId: data.user_id,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
        lastExecutedAt: data.last_executed_at,
        lastSignal: data.last_signal,
        executionFrequency: data.execution_frequency,
        tags: data.tags
      };
    } catch (error) {
      console.error('Error creating strategy instance:', error);
      return null;
    }
  }
  
  /**
   * Update an existing strategy instance
   */
  public async updateStrategyInstance(
    instanceId: string,
    updates: Partial<StrategyInstance>
  ): Promise<boolean> {
    try {
      // Format the updates for Supabase
      const supabaseUpdates: Record<string, any> = {};
      
      if (updates.name !== undefined) supabaseUpdates.name = updates.name;
      if (updates.description !== undefined) supabaseUpdates.description = updates.description;
      if (updates.parameters !== undefined) supabaseUpdates.parameters = updates.parameters;
      if (updates.symbols !== undefined) supabaseUpdates.symbols = updates.symbols;
      if (updates.timeframes !== undefined) supabaseUpdates.timeframes = updates.timeframes;
      if (updates.isActive !== undefined) supabaseUpdates.is_active = updates.isActive;
      if (updates.executionFrequency !== undefined) supabaseUpdates.execution_frequency = updates.executionFrequency;
      if (updates.tags !== undefined) supabaseUpdates.tags = updates.tags;
      
      const { error } = await this.supabase
        .from('strategy_instances')
        .update(supabaseUpdates)
        .eq('id', instanceId);
      
      if (error) {
        throw error;
      }
      
      return true;
    } catch (error) {
      console.error('Error updating strategy instance:', error);
      return false;
    }
  }
  
  /**
   * Delete a strategy instance
   */
  public async deleteStrategyInstance(instanceId: string): Promise<boolean> {
    try {
      const { error } = await this.supabase
        .from('strategy_instances')
        .delete()
        .eq('id', instanceId);
      
      if (error) {
        throw error;
      }
      
      return true;
    } catch (error) {
      console.error('Error deleting strategy instance:', error);
      return false;
    }
  }
  
  /**
   * Run a backtest for a strategy
   */
  public async runBacktest(
    strategyId: string,
    parameters: Record<string, any>,
    symbols: string[],
    startDate: string,
    endDate: string,
    initialCapital: number,
    timeframe: string,
    riskProfileId?: string
  ) {
    try {
      // Get the risk profile
      let riskProfile;
      
      if (riskProfileId) {
        const { data, error } = await this.supabase
          .from('risk_profiles')
          .select('*')
          .eq('id', riskProfileId)
          .single();
        
        if (error) {
          throw error;
        }
        
        riskProfile = {
          id: data.id,
          name: data.name,
          description: data.description,
          level: data.level,
          parameters: data.parameters,
          userId: data.user_id,
          isDefault: data.is_default,
          createdAt: data.created_at,
          updatedAt: data.updated_at
        };
      } else {
        // Use default moderate risk profile
        riskProfile = {
          id: 'default',
          name: 'Default Moderate Risk',
          description: 'System default risk profile',
          level: 'moderate',
          parameters: {
            maxDrawdown: 20,
            maxPositionSize: 5,
            maxLeverage: 2,
            stopLossPercentage: 5,
            riskPerTrade: 2,
            trailingStopEnabled: true,
            trailingStopActivationPercent: 2,
            trailingStopDistance: 1,
            takeProfitEnabled: true,
            takeProfitMultiple: 2,
            customRiskRules: {}
          },
          userId: 'system',
          isDefault: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
      }
      
      // Get the strategy
      const strategy = await this.getStrategy(strategyId);
      
      if (!strategy) {
        throw new Error(`Strategy ${strategyId} not found`);
      }
      
      // Initialize the strategy with parameters
      await strategy.initialize(parameters);
      
      // Run the backtest
      const backtestConfig = {
        strategyId,
        parameters,
        symbols,
        startDate,
        endDate,
        initialCapital,
        timeframe: timeframe as any,
        commission: 0.1, // Default commission 0.1%
        slippage: 0.05, // Default slippage 0.05%
        includeFees: true,
        riskProfile
      };
      
      const result = await strategy.backtest(backtestConfig);
      
      // Store the backtest result in the database
      const { data, error } = await this.supabase
        .from('backtest_results')
        .insert({
          id: result.id,
          user_id: riskProfile.userId,
          strategy_id: strategyId,
          parameters,
          symbols,
          start_date: startDate,
          end_date: endDate,
          initial_capital: initialCapital,
          timeframe,
          result: {
            performance: result.performance,
            trades: result.trades.slice(0, 100), // Store first 100 trades to save space
            signals: result.signals.slice(0, 100) // Store first 100 signals
          },
          status: result.status,
          error_message: result.errorMessage
        });
      
      if (error) {
        throw error;
      }
      
      return result;
    } catch (error) {
      console.error('Error running backtest:', error);
      throw error;
    }
  }
  
  /**
   * Register a custom strategy
   */
  public registerStrategy(id: string, strategyClass: new () => IStrategy): void {
    if (strategyRegistry[id]) {
      console.warn(`Strategy ${id} already exists in registry. Overwriting.`);
    }
    
    strategyRegistry[id] = strategyClass;
  }
}
