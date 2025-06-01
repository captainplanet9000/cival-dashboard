/**
 * Simulation Service
 * 
 * Provides comprehensive simulation configuration, management, and analytics
 * for the Trading Farm's dry-run trading system.
 */
import { createBrowserClient } from '@/utils/supabase/client';
import { createServerClient } from '@/utils/supabase/server';
import { MonitoringService } from './monitoring-service';
import { v4 as uuidv4 } from 'uuid';

// Model types
export type SlippageModelType = 'fixed' | 'volatility' | 'spread';
export type FeeModelType = 'fixed' | 'tiered';
export type LatencyModelType = 'none' | 'random' | 'realistic';
export type FillModelType = 'full' | 'volume' | 'probabilistic';
export type ErrorModelType = 'none' | 'random' | 'targeted';

export interface SimulationModel {
  id: string;
  userId: string;
  name: string;
  description?: string;
  modelType: 'slippage' | 'fee' | 'latency' | 'fill' | 'error';
  isSystemModel: boolean;
  parameters: any;
  createdAt: string;
  updatedAt?: string;
}

export interface SlippageModel extends SimulationModel {
  modelType: 'slippage';
  parameters: {
    type: SlippageModelType;
    slippageBps?: number;
    baseSlippageBps?: number;
    volatilityMultiplier?: number;
    spreadMultiplier?: number;
    description: string;
  };
}

export interface FeeModel extends SimulationModel {
  modelType: 'fee';
  parameters: {
    makerFeeBps: number;
    takerFeeBps: number;
    description: string;
  };
}

export interface LatencyModel extends SimulationModel {
  modelType: 'latency';
  parameters: {
    type: LatencyModelType;
    minMs?: number;
    maxMs?: number;
    description: string;
  };
}

export interface FillModel extends SimulationModel {
  modelType: 'fill';
  parameters: {
    type: FillModelType;
    volumeThreshold?: number;
    description: string;
  };
}

export interface ErrorModel extends SimulationModel {
  modelType: 'error';
  parameters: {
    type: ErrorModelType;
    networkErrorRate?: number;
    rateLimitErrorRate?: number;
    insufficientFundsRate?: number;
    description: string;
  };
}

export interface AgentSimulationConfig {
  id: string;
  agentId: string;
  exchange: string;
  symbols: string[];
  slippageModelId?: string;
  feeModelId?: string;
  latencyModelId?: string;
  fillModelId?: string;
  errorModelId?: string;
  initialBalances: Record<string, number>;
  createdAt: string;
  updatedAt?: string;
}

export interface SimulationRun {
  id: string;
  userId: string;
  agentId?: string;
  name: string;
  description?: string;
  startTime: string;
  endTime?: string;
  initialBalances: Record<string, number>;
  finalBalances?: Record<string, number>;
  parameters?: any;
  metrics?: Record<string, number>;
  status: 'active' | 'completed' | 'aborted';
  createdAt: string;
  updatedAt?: string;
}

export interface SimulationMetric {
  metricName: string;
  metricValue: number;
  metricLabel: string;
}

export class SimulationService {
  /**
   * Get available simulation models
   */
  static async getSimulationModels(
    modelType?: 'slippage' | 'fee' | 'latency' | 'fill' | 'error',
    isServerSide = false
  ): Promise<SimulationModel[]> {
    try {
      const supabase = isServerSide
        ? await createServerClient()
        : createBrowserClient();
      
      let query = supabase
        .from('simulation_models')
        .select('*');
      
      if (modelType) {
        query = query.eq('model_type', modelType);
      }
      
      const { data, error } = await query;
      
      if (error) {
        throw error;
      }
      
      return data.map(model => ({
        id: model.id,
        userId: model.user_id,
        name: model.name,
        description: model.description,
        modelType: model.model_type,
        isSystemModel: model.is_system_model,
        parameters: model.parameters,
        createdAt: model.created_at,
        updatedAt: model.updated_at
      }));
    } catch (error) {
      console.error('Error fetching simulation models:', error);
      return [];
    }
  }
  
  /**
   * Create a new simulation model
   */
  static async createSimulationModel(
    model: Omit<SimulationModel, 'id' | 'userId' | 'createdAt' | 'updatedAt' | 'isSystemModel'>,
    isServerSide = false
  ): Promise<SimulationModel | null> {
    try {
      const supabase = isServerSide
        ? await createServerClient()
        : createBrowserClient();
      
      const user = isServerSide 
        ? (await supabase.auth.getUser()).data.user
        : (await supabase.auth.getSession()).data.session?.user;
      
      if (!user) {
        throw new Error('User not authenticated');
      }
      
      const { data, error } = await supabase
        .from('simulation_models')
        .insert({
          user_id: user.id,
          name: model.name,
          description: model.description,
          model_type: model.modelType,
          is_system_model: false,
          parameters: model.parameters
        })
        .select()
        .single();
      
      if (error) {
        throw error;
      }
      
      return {
        id: data.id,
        userId: data.user_id,
        name: data.name,
        description: data.description,
        modelType: data.model_type,
        isSystemModel: data.is_system_model,
        parameters: data.parameters,
        createdAt: data.created_at,
        updatedAt: data.updated_at
      };
    } catch (error) {
      console.error('Error creating simulation model:', error);
      return null;
    }
  }
  
  /**
   * Get agent simulation configuration
   */
  static async getAgentSimulationConfig(
    agentId: string,
    isServerSide = false
  ): Promise<AgentSimulationConfig | null> {
    try {
      const supabase = isServerSide
        ? await createServerClient()
        : createBrowserClient();
      
      const { data, error } = await supabase
        .from('agent_simulation_config')
        .select('*')
        .eq('agent_id', agentId)
        .single();
      
      if (error) {
        if (error.code === 'PGRST116') {
          // No rows found
          return null;
        }
        throw error;
      }
      
      return {
        id: data.id,
        agentId: data.agent_id,
        exchange: data.exchange,
        symbols: data.symbols,
        slippageModelId: data.slippage_model_id,
        feeModelId: data.fee_model_id,
        latencyModelId: data.latency_model_id,
        fillModelId: data.fill_model_id,
        errorModelId: data.error_model_id,
        initialBalances: data.initial_balances,
        createdAt: data.created_at,
        updatedAt: data.updated_at
      };
    } catch (error) {
      console.error('Error fetching agent simulation config:', error);
      return null;
    }
  }
  
  /**
   * Create or update agent simulation configuration
   */
  static async saveAgentSimulationConfig(
    config: Omit<AgentSimulationConfig, 'id' | 'createdAt' | 'updatedAt'>,
    isServerSide = false
  ): Promise<AgentSimulationConfig | null> {
    try {
      const supabase = isServerSide
        ? await createServerClient()
        : createBrowserClient();
      
      const { data, error } = await supabase
        .from('agent_simulation_config')
        .upsert({
          agent_id: config.agentId,
          exchange: config.exchange,
          symbols: config.symbols,
          slippage_model_id: config.slippageModelId,
          fee_model_id: config.feeModelId,
          latency_model_id: config.latencyModelId,
          fill_model_id: config.fillModelId,
          error_model_id: config.errorModelId,
          initial_balances: config.initialBalances
        })
        .select()
        .single();
      
      if (error) {
        throw error;
      }
      
      return {
        id: data.id,
        agentId: data.agent_id,
        exchange: data.exchange,
        symbols: data.symbols,
        slippageModelId: data.slippage_model_id,
        feeModelId: data.fee_model_id,
        latencyModelId: data.latency_model_id,
        fillModelId: data.fill_model_id,
        errorModelId: data.error_model_id,
        initialBalances: data.initial_balances,
        createdAt: data.created_at,
        updatedAt: data.updated_at
      };
    } catch (error) {
      console.error('Error saving agent simulation config:', error);
      return null;
    }
  }
  
  /**
   * Start a new simulation run
   */
  static async startSimulationRun(
    params: {
      agentId: string;
      name: string;
      description?: string;
      initialBalances: Record<string, number>;
      parameters?: any;
    },
    isServerSide = false
  ): Promise<SimulationRun | null> {
    try {
      const supabase = isServerSide
        ? await createServerClient()
        : createBrowserClient();
      
      const user = isServerSide 
        ? (await supabase.auth.getUser()).data.user
        : (await supabase.auth.getSession()).data.session?.user;
      
      if (!user) {
        throw new Error('User not authenticated');
      }
      
      const runId = uuidv4();
      
      const { data, error } = await supabase
        .from('simulation_runs')
        .insert({
          id: runId,
          user_id: user.id,
          agent_id: params.agentId,
          name: params.name,
          description: params.description,
          initial_balances: params.initialBalances,
          parameters: params.parameters,
          status: 'active'
        })
        .select()
        .single();
      
      if (error) {
        throw error;
      }
      
      // Log the simulation start
      MonitoringService.logEvent({
        type: 'system.startup',
        severity: 'info',
        subject: 'Simulation Run Started',
        message: `Started simulation run "${params.name}" for agent ${params.agentId}`,
        source: 'simulation-service',
        details: {
          simulationRunId: runId,
          agentId: params.agentId,
          initialBalances: params.initialBalances
        }
      });
      
      return {
        id: data.id,
        userId: data.user_id,
        agentId: data.agent_id,
        name: data.name,
        description: data.description,
        startTime: data.start_time,
        endTime: data.end_time,
        initialBalances: data.initial_balances,
        finalBalances: data.final_balances,
        parameters: data.parameters,
        metrics: data.metrics,
        status: data.status,
        createdAt: data.created_at,
        updatedAt: data.updated_at
      };
    } catch (error) {
      console.error('Error starting simulation run:', error);
      return null;
    }
  }
  
  /**
   * Complete a simulation run
   */
  static async completeSimulationRun(
    runId: string,
    finalBalances: Record<string, number>,
    isServerSide = false
  ): Promise<boolean> {
    try {
      const supabase = isServerSide
        ? await createServerClient()
        : createBrowserClient();
      
      // Update the simulation run
      const { error: updateError } = await supabase
        .from('simulation_runs')
        .update({
          end_time: new Date().toISOString(),
          final_balances: finalBalances,
          status: 'completed'
        })
        .eq('id', runId);
      
      if (updateError) {
        throw updateError;
      }
      
      // Calculate metrics
      const { data: metricsData, error: metricsError } = await supabase
        .rpc('calculate_simulation_metrics', { simulation_run_id: runId });
      
      if (metricsError) {
        throw metricsError;
      }
      
      // Update run with calculated metrics
      const metrics: Record<string, number> = {};
      metricsData.forEach((metric: SimulationMetric) => {
        metrics[metric.metricName] = metric.metricValue;
      });
      
      const { error: metricsUpdateError } = await supabase
        .from('simulation_runs')
        .update({ metrics })
        .eq('id', runId);
      
      if (metricsUpdateError) {
        throw metricsUpdateError;
      }
      
      // Log the simulation completion
      const { data: runData } = await supabase
        .from('simulation_runs')
        .select('*')
        .eq('id', runId)
        .single();
      
      if (runData) {
        MonitoringService.logEvent({
          type: 'system.shutdown',
          severity: 'info',
          subject: 'Simulation Run Completed',
          message: `Completed simulation run "${runData.name}" with ${Object.keys(metrics).length} metrics calculated`,
          source: 'simulation-service',
          details: {
            simulationRunId: runId,
            agentId: runData.agent_id,
            finalBalances,
            metrics,
            duration: new Date(runData.end_time).getTime() - new Date(runData.start_time).getTime()
          }
        });
      }
      
      return true;
    } catch (error) {
      console.error('Error completing simulation run:', error);
      return false;
    }
  }
  
  /**
   * Abort a simulation run
   */
  static async abortSimulationRun(
    runId: string,
    reason: string,
    finalBalances: Record<string, number>,
    isServerSide = false
  ): Promise<boolean> {
    try {
      const supabase = isServerSide
        ? await createServerClient()
        : createBrowserClient();
      
      const { error } = await supabase
        .from('simulation_runs')
        .update({
          end_time: new Date().toISOString(),
          final_balances: finalBalances,
          status: 'aborted',
          parameters: supabase.rpc('jsonb_set', {
            target: supabase.rpc('coalesce', { val1: 'parameters', val2: '{}' }),
            path: '{abortReason}',
            value: reason
          })
        })
        .eq('id', runId);
      
      if (error) {
        throw error;
      }
      
      // Log the simulation abort
      MonitoringService.logEvent({
        type: 'system.warning',
        severity: 'warning',
        subject: 'Simulation Run Aborted',
        message: `Aborted simulation run: ${reason}`,
        source: 'simulation-service',
        details: {
          simulationRunId: runId,
          reason,
          finalBalances
        }
      });
      
      return true;
    } catch (error) {
      console.error('Error aborting simulation run:', error);
      return false;
    }
  }
  
  /**
   * Get simulation runs
   */
  static async getSimulationRuns(
    filters: {
      agentId?: string;
      status?: 'active' | 'completed' | 'aborted';
      limit?: number;
      offset?: number;
    } = {},
    isServerSide = false
  ): Promise<{ runs: SimulationRun[]; total: number }> {
    try {
      const supabase = isServerSide
        ? await createServerClient()
        : createBrowserClient();
      
      // Count total runs
      let countQuery = supabase
        .from('simulation_runs')
        .select('id', { count: 'exact', head: true });
      
      if (filters.agentId) {
        countQuery = countQuery.eq('agent_id', filters.agentId);
      }
      
      if (filters.status) {
        countQuery = countQuery.eq('status', filters.status);
      }
      
      const { count, error: countError } = await countQuery;
      
      if (countError) {
        throw countError;
      }
      
      // Get the runs
      let runsQuery = supabase
        .from('simulation_runs')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (filters.agentId) {
        runsQuery = runsQuery.eq('agent_id', filters.agentId);
      }
      
      if (filters.status) {
        runsQuery = runsQuery.eq('status', filters.status);
      }
      
      if (filters.limit) {
        runsQuery = runsQuery.limit(filters.limit);
      }
      
      if (filters.offset) {
        runsQuery = runsQuery.range(filters.offset, filters.offset + (filters.limit || 10) - 1);
      }
      
      const { data, error } = await runsQuery;
      
      if (error) {
        throw error;
      }
      
      const runs = data.map(run => ({
        id: run.id,
        userId: run.user_id,
        agentId: run.agent_id,
        name: run.name,
        description: run.description,
        startTime: run.start_time,
        endTime: run.end_time,
        initialBalances: run.initial_balances,
        finalBalances: run.final_balances,
        parameters: run.parameters,
        metrics: run.metrics,
        status: run.status,
        createdAt: run.created_at,
        updatedAt: run.updated_at
      }));
      
      return { runs, total: count || 0 };
    } catch (error) {
      console.error('Error fetching simulation runs:', error);
      return { runs: [], total: 0 };
    }
  }
  
  /**
   * Get performance metrics for a simulation run
   */
  static async getSimulationMetrics(
    runId: string,
    isServerSide = false
  ): Promise<SimulationMetric[]> {
    try {
      const supabase = isServerSide
        ? await createServerClient()
        : createBrowserClient();
      
      const { data, error } = await supabase
        .rpc('calculate_simulation_metrics', { simulation_run_id: runId });
      
      if (error) {
        throw error;
      }
      
      return data.map((metric: any) => ({
        metricName: metric.metric_name,
        metricValue: metric.metric_value,
        metricLabel: metric.metric_label
      }));
    } catch (error) {
      console.error('Error fetching simulation metrics:', error);
      return [];
    }
  }
  
  /**
   * Get detailed trade history for a simulation run
   */
  static async getSimulationTradeHistory(
    runId: string,
    limit = 50,
    offset = 0,
    isServerSide = false
  ): Promise<{ trades: any[]; total: number }> {
    try {
      const supabase = isServerSide
        ? await createServerClient()
        : createBrowserClient();
      
      // Count total trades
      const { count, error: countError } = await supabase
        .from('simulated_trades')
        .select('id', { count: 'exact', head: true })
        .eq('simulation_run_id', runId);
      
      if (countError) {
        throw countError;
      }
      
      // Get the trades
      const { data, error } = await supabase
        .from('simulated_trades')
        .select('*')
        .eq('simulation_run_id', runId)
        .order('timestamp', { ascending: false })
        .range(offset, offset + limit - 1);
      
      if (error) {
        throw error;
      }
      
      return { trades: data, total: count || 0 };
    } catch (error) {
      console.error('Error fetching simulation trade history:', error);
      return { trades: [], total: 0 };
    }
  }
  
  /**
   * Calculate cumulative P&L for a simulation run
   */
  static async getSimulationCumulativePnL(
    runId: string,
    symbol: string,
    isServerSide = false
  ): Promise<{ date: string; symbol: string; dailyPnl: number; cumulativePnl: number }[]> {
    try {
      const supabase = isServerSide
        ? await createServerClient()
        : createBrowserClient();
      
      // Get the simulation run data for date range
      const { data: runData, error: runError } = await supabase
        .from('simulation_runs')
        .select('start_time, end_time')
        .eq('id', runId)
        .single();
      
      if (runError) {
        throw runError;
      }
      
      // Call the PnL function
      const { data, error } = await supabase
        .rpc('calculate_cumulative_pnl', {
          user_id: runId, // Using runId here as the function expects a user_id
          symbol,
          from_date: runData.start_time,
          to_date: runData.end_time || new Date().toISOString()
        });
      
      if (error) {
        throw error;
      }
      
      return data.map((item: any) => ({
        date: item.date,
        symbol: item.symbol,
        dailyPnl: item.daily_pnl,
        cumulativePnl: item.cumulative_pnl
      }));
    } catch (error) {
      console.error('Error fetching simulation PnL:', error);
      return [];
    }
  }
}
