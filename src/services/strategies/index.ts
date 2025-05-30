import { supabase } from '../../integrations/supabase/client';
import type { 
  EntryCondition, 
  ExitCondition, 
  PerformanceMetrics, 
  RiskManagement, 
  StrategyParameters, 
  StrategyStatus, 
  StrategyType, 
  Timeframe
} from '../../integrations/supabase/types';

// Strategy interface based on our database schema
export interface Strategy {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
  updated_at: string;
  status: StrategyStatus;
  strategy_type: StrategyType;
  version: string;
  creator_id: string | null;
  is_public: boolean;
  code: string | null;
  entry_conditions: EntryCondition[];
  exit_conditions: ExitCondition[];
  risk_management: RiskManagement;
  parameters: StrategyParameters;
  performance_metrics: PerformanceMetrics | null;
  tags: string[] | null;
}

export interface StrategyVersion {
  id: string;
  strategy_id: string;
  version: string;
  created_at: string;
  code: string | null;
  entry_conditions: EntryCondition[];
  exit_conditions: ExitCondition[];
  risk_management: RiskManagement;
  parameters: StrategyParameters;
  change_notes: string | null;
  performance_metrics: PerformanceMetrics | null;
}

export interface StrategyBacktest {
  id: string;
  strategy_id: string;
  strategy_version: string;
  created_at: string;
  timeframe: Timeframe;
  start_date: string;
  end_date: string;
  market: string;
  initial_capital: number;
  results: any;
  metrics: any;
}

export interface AgentStrategy {
  id: string;
  agent_id: string;
  strategy_id: string;
  created_at: string;
  updated_at: string;
  is_active: boolean;
  config: any;
  performance_metrics: PerformanceMetrics | null;
}

export interface FarmStrategy {
  id: string;
  farm_id: string;
  strategy_id: string;
  agent_id: string | null;
  created_at: string;
  updated_at: string;
  allocation: number;
  is_active: boolean;
  config: any;
  performance_metrics: PerformanceMetrics | null;
}

export interface StrategyPerformance {
  id: string;
  name: string;
  strategy_type: StrategyType;
  status: StrategyStatus;
  version: string;
  performance_metrics: PerformanceMetrics | null;
  farm_count: number;
  agent_count: number;
  backtest_count: number;
}

export interface CreateStrategyParams {
  name: string;
  description?: string;
  strategy_type: StrategyType;
  is_public?: boolean;
  code?: string;
  entry_conditions?: EntryCondition[];
  exit_conditions?: ExitCondition[];
  risk_management?: RiskManagement;
  parameters?: StrategyParameters;
  tags?: string[];
}

export interface UpdateStrategyParams {
  name?: string;
  description?: string;
  status?: StrategyStatus;
  strategy_type?: StrategyType;
  version?: string;
  is_public?: boolean;
  code?: string;
  entry_conditions?: EntryCondition[];
  exit_conditions?: ExitCondition[];
  risk_management?: RiskManagement;
  parameters?: StrategyParameters;
  performance_metrics?: PerformanceMetrics;
  tags?: string[];
}

export interface CreateVersionParams {
  strategy_id: string;
  version: string;
  code?: string;
  entry_conditions?: EntryCondition[];
  exit_conditions?: ExitCondition[];
  risk_management?: RiskManagement;
  parameters?: StrategyParameters;
  change_notes?: string;
}

export interface DeployStrategyToAgentParams {
  strategy_id: string;
  agent_id: string;
  config?: any;
}

export interface AssignStrategyToFarmParams {
  strategy_id: string;
  farm_id: string;
  agent_id?: string;
  allocation?: number;
  config?: any;
}

export interface RunBacktestParams {
  strategy_id: string;
  strategy_version: string;
  timeframe: Timeframe;
  start_date: string;
  end_date: string;
  market: string;
  initial_capital: number;
}

/**
 * StrategyService provides methods for interacting with the strategy database
 */
export class StrategyService {
  /**
   * Get all strategies
   * @param limit Number of strategies to return
   * @param offset Pagination offset
   * @param filter Optional filter object
   * @returns List of strategies
   */
  async getStrategies(limit = 10, offset = 0, filter?: Partial<Strategy>) {
    let query = supabase.from('strategies').select('*');
    
    // Apply filters if provided
    if (filter) {
      Object.entries(filter).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          query = query.eq(key, value);
        }
      });
    }
    
    const { data, error } = await query.range(offset, offset + limit - 1);
    
    if (error) throw new Error(`Error fetching strategies: ${error.message}`);
    return data as Strategy[];
  }

  /**
   * Get a strategy by ID
   * @param id Strategy ID
   * @returns Strategy or null if not found
   */
  async getStrategyById(id: string) {
    const { data, error } = await supabase.from('strategies').select('*').eq('id', id).single();
    
    if (error) {
      if (error.code === 'PGRST116') return null; // Row not found
      throw new Error(`Error fetching strategy: ${error.message}`);
    }
    
    return data as Strategy;
  }

  /**
   * Create a new strategy
   * @param params Strategy parameters
   * @returns Created strategy
   */
  async createStrategy(params: CreateStrategyParams) {
    const { data, error } = await supabase.from('strategies').insert({
      name: params.name,
      description: params.description || null,
      strategy_type: params.strategy_type,
      is_public: params.is_public || false,
      code: params.code || null,
      entry_conditions: params.entry_conditions || [],
      exit_conditions: params.exit_conditions || [],
      risk_management: params.risk_management || {},
      parameters: params.parameters || {},
      tags: params.tags || null
    }).select().single();
    
    if (error) throw new Error(`Error creating strategy: ${error.message}`);
    
    // Create initial version
    await this.createVersion({
      strategy_id: data.id,
      version: '1.0.0',
      code: params.code,
      entry_conditions: params.entry_conditions,
      exit_conditions: params.exit_conditions,
      risk_management: params.risk_management,
      parameters: params.parameters,
      change_notes: 'Initial version'
    });
    
    return data as Strategy;
  }

  /**
   * Update a strategy
   * @param id Strategy ID
   * @param params Update parameters
   * @returns Updated strategy
   */
  async updateStrategy(id: string, params: UpdateStrategyParams) {
    const { data, error } = await supabase.from('strategies').update(params).eq('id', id).select().single();
    
    if (error) throw new Error(`Error updating strategy: ${error.message}`);
    return data as Strategy;
  }

  /**
   * Delete a strategy
   * @param id Strategy ID
   * @returns Success status
   */
  async deleteStrategy(id: string) {
    const { error } = await supabase.from('strategies').delete().eq('id', id);
    
    if (error) throw new Error(`Error deleting strategy: ${error.message}`);
    return true;
  }

  /**
   * Activate a strategy
   * @param id Strategy ID
   * @returns Updated strategy
   */
  async activateStrategy(id: string) {
    return this.updateStrategy(id, { status: 'active' });
  }

  /**
   * Pause a strategy
   * @param id Strategy ID
   * @returns Updated strategy
   */
  async pauseStrategy(id: string) {
    return this.updateStrategy(id, { status: 'paused' });
  }

  /**
   * Archive a strategy
   * @param id Strategy ID
   * @returns Updated strategy
   */
  async archiveStrategy(id: string) {
    return this.updateStrategy(id, { status: 'archived' });
  }

  /**
   * Clone a strategy
   * @param id Strategy ID to clone
   * @param newName Name for the cloned strategy
   * @returns Cloned strategy
   */
  async cloneStrategy(id: string, newName: string) {
    const { data, error } = await supabase.rpc('clone_strategy', {
      strategy_id: id,
      new_name: newName
    });
    
    if (error) throw new Error(`Error cloning strategy: ${error.message}`);
    return this.getStrategyById(data as string);
  }

  /**
   * Get strategy versions
   * @param strategyId Strategy ID
   * @returns List of versions
   */
  async getVersions(strategyId: string) {
    const { data, error } = await supabase.from('strategy_versions')
      .select('*')
      .eq('strategy_id', strategyId)
      .order('created_at', { ascending: false });
    
    if (error) throw new Error(`Error fetching strategy versions: ${error.message}`);
    return data as StrategyVersion[];
  }

  /**
   * Get specific version
   * @param strategyId Strategy ID
   * @param version Version string
   * @returns Version or null if not found
   */
  async getVersion(strategyId: string, version: string) {
    const { data, error } = await supabase.from('strategy_versions')
      .select('*')
      .eq('strategy_id', strategyId)
      .eq('version', version)
      .single();
    
    if (error) {
      if (error.code === 'PGRST116') return null; // Row not found
      throw new Error(`Error fetching strategy version: ${error.message}`);
    }
    
    return data as StrategyVersion;
  }

  /**
   * Create a new version
   * @param params Version parameters
   * @returns Created version
   */
  async createVersion(params: CreateVersionParams) {
    // Get the current strategy to copy any missing fields
    const strategy = await this.getStrategyById(params.strategy_id);
    if (!strategy) throw new Error(`Strategy not found: ${params.strategy_id}`);
    
    const { data, error } = await supabase.from('strategy_versions').insert({
      strategy_id: params.strategy_id,
      version: params.version,
      code: params.code || strategy.code,
      entry_conditions: params.entry_conditions || strategy.entry_conditions,
      exit_conditions: params.exit_conditions || strategy.exit_conditions,
      risk_management: params.risk_management || strategy.risk_management,
      parameters: params.parameters || strategy.parameters,
      change_notes: params.change_notes
    }).select().single();
    
    if (error) throw new Error(`Error creating strategy version: ${error.message}`);
    
    // Update the main strategy with the new version
    await this.updateStrategy(params.strategy_id, { version: params.version });
    
    return data as StrategyVersion;
  }

  /**
   * Deploy a strategy to an agent
   * @param params Deployment parameters
   * @returns Deployment ID
   */
  async deployToAgent(params: DeployStrategyToAgentParams) {
    const { data, error } = await supabase.rpc('deploy_strategy_to_agent', {
      strategy_id: params.strategy_id,
      agent_id: params.agent_id,
      config: params.config || {}
    });
    
    if (error) throw new Error(`Error deploying strategy to agent: ${error.message}`);
    return data as string;
  }

  /**
   * Assign a strategy to a farm
   * @param params Assignment parameters
   * @returns Farm strategy record
   */
  async assignToFarm(params: AssignStrategyToFarmParams) {
    const { data, error } = await supabase.from('farm_strategies').upsert({
      farm_id: params.farm_id,
      strategy_id: params.strategy_id,
      agent_id: params.agent_id || null,
      allocation: params.allocation || 0,
      config: params.config || {},
      is_active: true
    }, {
      onConflict: 'farm_id,strategy_id',
      ignoreDuplicates: false
    }).select().single();
    
    if (error) throw new Error(`Error assigning strategy to farm: ${error.message}`);
    return data as FarmStrategy;
  }

  /**
   * Get strategies for a farm
   * @param farmId Farm ID
   * @returns List of farm strategies
   */
  async getFarmStrategies(farmId: string) {
    const { data, error } = await supabase.from('farm_strategies')
      .select(`
        *,
        strategy:strategies(*)
      `)
      .eq('farm_id', farmId);
    
    if (error) throw new Error(`Error fetching farm strategies: ${error.message}`);
    return data;
  }

  /**
   * Get strategies for an agent
   * @param agentId Agent ID
   * @returns List of agent strategies
   */
  async getAgentStrategies(agentId: string) {
    const { data, error } = await supabase.from('agent_strategies')
      .select(`
        *,
        strategy:strategies(*)
      `)
      .eq('agent_id', agentId);
    
    if (error) throw new Error(`Error fetching agent strategies: ${error.message}`);
    return data;
  }

  /**
   * Save backtest results
   * @param params Backtest parameters and results
   * @returns Saved backtest record
   */
  async saveBacktestResults(params: RunBacktestParams & { results: any; metrics: any }) {
    const { data, error } = await supabase.from('strategy_backtests').insert({
      strategy_id: params.strategy_id,
      strategy_version: params.strategy_version,
      timeframe: params.timeframe,
      start_date: params.start_date,
      end_date: params.end_date,
      market: params.market,
      initial_capital: params.initial_capital,
      results: params.results,
      metrics: params.metrics
    }).select().single();
    
    if (error) throw new Error(`Error saving backtest results: ${error.message}`);
    
    // Update strategy performance metrics
    await this.updateStrategy(params.strategy_id, {
      performance_metrics: params.metrics
    });
    
    return data as StrategyBacktest;
  }

  /**
   * Get backtest results for a strategy
   * @param strategyId Strategy ID
   * @param limit Number of results to return
   * @returns List of backtest results
   */
  async getBacktestResults(strategyId: string, limit = 10) {
    const { data, error } = await supabase.from('strategy_backtests')
      .select('*')
      .eq('strategy_id', strategyId)
      .order('created_at', { ascending: false })
      .limit(limit);
    
    if (error) throw new Error(`Error fetching backtest results: ${error.message}`);
    return data as StrategyBacktest[];
  }

  /**
   * Search strategies by name or tag
   * @param query Search query
   * @param limit Number of results to return
   * @returns List of strategies
   */
  async searchStrategies(query: string, limit = 10) {
    const { data, error } = await supabase.from('strategies')
      .select('*')
      .or(`name.ilike.%${query}%, description.ilike.%${query}%`)
      .limit(limit);
    
    if (error) throw new Error(`Error searching strategies: ${error.message}`);
    return data as Strategy[];
  }

  /**
   * Get strategy performance metrics
   * @param limit Number of strategies to return
   * @returns List of strategy performance metrics
   */
  async getStrategyPerformance(limit = 10) {
    const { data, error } = await supabase.from('strategy_performance')
      .select('*')
      .limit(limit);
    
    if (error) throw new Error(`Error fetching strategy performance: ${error.message}`);
    return data as StrategyPerformance[];
  }
}

// Export singleton instance
export const strategyService = new StrategyService(); 