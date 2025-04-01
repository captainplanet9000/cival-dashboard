import { ApiResponse } from '@/services/farm-service';

export interface Strategy {
  id: string;
  name: string;
  description: string;
  risk_level: 'low' | 'medium' | 'high';
  category: 'arbitrage' | 'trend_following' | 'mean_reversion' | 'market_making' | 'custom';
  parameters: Record<string, any>;
  performance_metrics: {
    win_rate?: number;
    profit_factor?: number;
    sharpe_ratio?: number;
    max_drawdown?: number;
    profit_loss?: number;
    trades_count?: number;
    [key: string]: any;
  };
  is_public: boolean;
  creator_id?: string;
  created_at: string;
  updated_at: string;
}

export interface BacktestResult {
  id: string;
  strategy_id: string;
  start_date: string;
  end_date: string;
  initial_capital: number;
  final_capital: number;
  profit_loss: number;
  roi: number;
  win_rate: number;
  trades: Array<{
    timestamp: string;
    type: 'buy' | 'sell';
    price: number;
    size: number;
    profit_loss?: number;
  }>;
  created_at: string;
}

const SUPABASE_MCP_URL = 'https://mcp.composio.dev/supabase/ancient-brash-planet-yjteSe';

export const strategyService = {
  /**
   * Get all available strategies
   */
  async getStrategies(options?: { isPublic?: boolean, creatorId?: string }): Promise<ApiResponse<Strategy[]>> {
    try {
      const where: Record<string, any> = {};
      
      if (options?.isPublic !== undefined) {
        where.is_public = options.isPublic;
      }
      
      if (options?.creatorId) {
        where.creator_id = options.creatorId;
      }
      
      const response = await fetch(SUPABASE_MCP_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tool: 'run_query',
          params: {
            table: 'strategies',
            select: '*',
            where: Object.keys(where).length > 0 ? where : undefined,
            order: 'created_at.desc'
          }
        })
      });
      
      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch strategies');
      }
      
      return { data: result.data };
    } catch (error) {
      console.error('Error fetching strategies:', error);
      return { error: error instanceof Error ? error.message : 'Unknown error occurred' };
    }
  },

  /**
   * Get a specific strategy by ID
   */
  async getStrategyById(strategyId: string): Promise<ApiResponse<Strategy>> {
    try {
      const response = await fetch(SUPABASE_MCP_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tool: 'run_query',
          params: {
            table: 'strategies',
            select: '*',
            where: { id: strategyId }
          }
        })
      });
      
      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch strategy');
      }
      
      if (!result.data || result.data.length === 0) {
        return { error: 'Strategy not found' };
      }
      
      return { data: result.data[0] };
    } catch (error) {
      console.error('Error fetching strategy:', error);
      return { error: error instanceof Error ? error.message : 'Unknown error occurred' };
    }
  },

  /**
   * Create a new strategy
   */
  async createStrategy(strategyData: Omit<Strategy, 'id' | 'created_at' | 'updated_at'>): Promise<ApiResponse<Strategy>> {
    try {
      const response = await fetch(SUPABASE_MCP_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tool: 'insert_record',
          params: {
            table: 'strategies',
            data: strategyData,
            returning: '*'
          }
        })
      });
      
      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to create strategy');
      }
      
      return { data: result.data };
    } catch (error) {
      console.error('Error creating strategy:', error);
      return { error: error instanceof Error ? error.message : 'Unknown error occurred' };
    }
  },

  /**
   * Update an existing strategy
   */
  async updateStrategy(strategyId: string, strategyData: Partial<Omit<Strategy, 'id' | 'created_at' | 'updated_at'>>): Promise<ApiResponse<Strategy>> {
    try {
      const response = await fetch(SUPABASE_MCP_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tool: 'update_record',
          params: {
            table: 'strategies',
            data: strategyData,
            where: { id: strategyId },
            returning: '*'
          }
        })
      });
      
      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to update strategy');
      }
      
      return { data: result.data };
    } catch (error) {
      console.error('Error updating strategy:', error);
      return { error: error instanceof Error ? error.message : 'Unknown error occurred' };
    }
  },

  /**
   * Delete a strategy
   */
  async deleteStrategy(strategyId: string): Promise<ApiResponse<void>> {
    try {
      const response = await fetch(SUPABASE_MCP_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tool: 'delete_record',
          params: {
            table: 'strategies',
            where: { id: strategyId }
          }
        })
      });
      
      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to delete strategy');
      }
      
      return { data: undefined };
    } catch (error) {
      console.error('Error deleting strategy:', error);
      return { error: error instanceof Error ? error.message : 'Unknown error occurred' };
    }
  },

  /**
   * Run a backtest for a strategy
   */
  async runBacktest(params: {
    strategyId: string,
    startDate: string,
    endDate: string,
    initialCapital: number,
    parameters?: Record<string, any>
  }): Promise<ApiResponse<BacktestResult>> {
    try {
      // First get the strategy to get its parameters
      const strategyResponse = await this.getStrategyById(params.strategyId);
      
      if (strategyResponse.error || !strategyResponse.data) {
        return { error: strategyResponse.error || 'Strategy not found' };
      }
      
      const strategy = strategyResponse.data;
      
      // Combine default parameters with custom parameters
      const backtestParameters = {
        ...strategy.parameters,
        ...params.parameters
      };
      
      // Run SQL query to execute the backtest function
      const response = await fetch(SUPABASE_MCP_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tool: 'run_sql',
          params: {
            sql: `
              SELECT run_backtest(
                '${params.strategyId}', 
                '${params.startDate}', 
                '${params.endDate}', 
                ${params.initialCapital}, 
                '${JSON.stringify(backtestParameters)}'::jsonb
              ) as result;
            `
          }
        })
      });
      
      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to run backtest');
      }
      
      // Parse the result from the SQL function
      const backtestResult = result.data[0]?.result;
      
      if (!backtestResult) {
        return { error: 'Backtest returned no results' };
      }
      
      // Insert the backtest result to the database
      const saveResponse = await fetch(SUPABASE_MCP_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tool: 'insert_record',
          params: {
            table: 'backtest_results',
            data: {
              strategy_id: params.strategyId,
              start_date: params.startDate,
              end_date: params.endDate,
              initial_capital: params.initialCapital,
              final_capital: backtestResult.final_capital,
              profit_loss: backtestResult.profit_loss,
              roi: backtestResult.roi,
              win_rate: backtestResult.win_rate,
              trades: backtestResult.trades,
              parameters: backtestParameters
            },
            returning: '*'
          }
        })
      });
      
      const saveResult = await saveResponse.json();
      
      if (!saveResult.success) {
        throw new Error(saveResult.error || 'Failed to save backtest result');
      }
      
      return { data: saveResult.data };
    } catch (error) {
      console.error('Error running backtest:', error);
      return { error: error instanceof Error ? error.message : 'Unknown error occurred' };
    }
  },

  /**
   * Get backtest results for a strategy
   */
  async getBacktestResults(strategyId: string): Promise<ApiResponse<BacktestResult[]>> {
    try {
      const response = await fetch(SUPABASE_MCP_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tool: 'run_query',
          params: {
            table: 'backtest_results',
            select: '*',
            where: { strategy_id: strategyId },
            order: 'created_at.desc'
          }
        })
      });
      
      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch backtest results');
      }
      
      return { data: result.data };
    } catch (error) {
      console.error('Error fetching backtest results:', error);
      return { error: error instanceof Error ? error.message : 'Unknown error occurred' };
    }
  },

  /**
   * Apply a strategy to a farm
   */
  async applyStrategyToFarm(params: { strategyId: string, farmId: string, allocation: number }): Promise<ApiResponse<void>> {
    try {
      // Link the strategy to the farm
      const response = await fetch(SUPABASE_MCP_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tool: 'insert_record',
          params: {
            table: 'farm_strategies',
            data: {
              farm_id: params.farmId,
              strategy_id: params.strategyId,
              allocation: params.allocation,
              status: 'active'
            },
            returning: '*'
          }
        })
      });
      
      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to apply strategy to farm');
      }
      
      // Update the farm to use this strategy
      const updateFarmResponse = await fetch(SUPABASE_MCP_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tool: 'update_record',
          params: {
            table: 'farms',
            data: {
              active_strategy_id: params.strategyId
            },
            where: { id: params.farmId }
          }
        })
      });
      
      const updateResult = await updateFarmResponse.json();
      
      if (!updateResult.success) {
        throw new Error(updateResult.error || 'Failed to update farm with strategy');
      }
      
      return { data: undefined };
    } catch (error) {
      console.error('Error applying strategy to farm:', error);
      return { error: error instanceof Error ? error.message : 'Unknown error occurred' };
    }
  },

  /**
   * Get strategies applied to a farm
   */
  async getFarmStrategies(farmId: string): Promise<ApiResponse<Array<Strategy & { allocation: number, status: string }>>> {
    try {
      // Run a SQL query to join farm_strategies with strategies
      const response = await fetch(SUPABASE_MCP_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tool: 'run_sql',
          params: {
            sql: `
              SELECT s.*, fs.allocation, fs.status
              FROM farm_strategies fs
              JOIN strategies s ON fs.strategy_id = s.id
              WHERE fs.farm_id = '${farmId}'
              ORDER BY fs.created_at DESC;
            `
          }
        })
      });
      
      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch farm strategies');
      }
      
      return { data: result.data };
    } catch (error) {
      console.error('Error fetching farm strategies:', error);
      return { error: error instanceof Error ? error.message : 'Unknown error occurred' };
    }
  }
}; 