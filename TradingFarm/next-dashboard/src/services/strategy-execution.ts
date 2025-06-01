import { createBrowserClient } from '@/utils/supabase/client';
import { createServerClient } from '@/utils/supabase/server';
import { BrainAsset } from './brain-assets';
import { getHistoricalData, Candle } from './historical-data';

// Types for strategy execution
export interface StrategyExecution {
  id: number;
  strategy_id: number;
  agent_id: number | null;
  symbol: string;
  timeframe: string;
  status: 'pending' | 'running' | 'paused' | 'stopped' | 'completed' | 'failed';
  start_time: string | null;
  end_time: string | null;
  config: Record<string, any>;
  live_mode: boolean;
  paper_trading: boolean;
  initial_capital: number | null;
  current_capital: number | null;
  brain_assets: BrainAssetReference[];
  messages: string[];
  last_error: string | null;
  metadata: Record<string, any>;
  owner_id: string;
  created_at: string;
  updated_at: string;
}

export interface BrainAssetReference {
  id: number;
  title: string;
  asset_type: string;
  role: string;
}

export interface ExecutionTrade {
  id: number;
  execution_id: number;
  symbol: string;
  direction: 'long' | 'short';
  status: 'pending' | 'open' | 'closed' | 'canceled' | 'failed';
  entry_time: string | null;
  exit_time: string | null;
  entry_price: number | null;
  exit_price: number | null;
  quantity: number | null;
  pnl: number | null;
  pnl_percentage: number | null;
  fees: number | null;
  order_ids: string[];
  entry_reason: string | null;
  exit_reason: string | null;
  metadata: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface StrategySignal {
  id: number;
  execution_id: number;
  timestamp: string;
  symbol: string;
  timeframe: string;
  type: 'entry' | 'exit' | 'alert' | 'info';
  direction: 'long' | 'short' | 'both' | null;
  price: number | null;
  message: string | null;
  source: string | null;
  score: number | null;
  metadata: Record<string, any>;
  created_at: string;
}

export interface ExecutionLog {
  id: number;
  execution_id: number;
  timestamp: string;
  level: 'debug' | 'info' | 'warning' | 'error' | 'critical';
  message: string;
  source: string | null;
  metadata: Record<string, any> | null;
  created_at: string;
}

export interface ExecutionOptions {
  strategyId: number;
  agentId?: number;
  symbol: string;
  timeframe: string;
  liveMode: boolean;
  paperTrading: boolean;
  initialCapital: number;
  brainAssetIds: number[];
  config?: Record<string, any>;
}

/**
 * Start a new strategy execution
 */
export async function startStrategyExecution(options: ExecutionOptions): Promise<StrategyExecution> {
  const supabase = createBrowserClient();
  
  try {
    // Format brain assets
    const brainAssets = await Promise.all(
      options.brainAssetIds.map(async (id) => {
        // Get basic info about brain asset
        const { data, error } = await supabase
          .from('brain_assets')
          .select('id, title, asset_type')
          .eq('id', id)
          .single();
        
        if (error) throw error;
        
        return {
          id: data.id,
          title: data.title,
          asset_type: data.asset_type,
          role: 'indicator', // Default role - in a real system this would be more specific
        };
      })
    );
    
    // Create the execution record
    const { data, error } = await supabase
      .from('strategy_executions')
      .insert({
        strategy_id: options.strategyId,
        agent_id: options.agentId || null,
        symbol: options.symbol,
        timeframe: options.timeframe,
        status: 'pending',
        start_time: null,
        end_time: null,
        config: options.config || {},
        live_mode: options.liveMode,
        paper_trading: options.paperTrading,
        initial_capital: options.initialCapital,
        current_capital: options.initialCapital,
        brain_assets: brainAssets,
        messages: [],
        last_error: null,
        metadata: {},
        owner_id: (await supabase.auth.getUser()).data.user?.id,
      })
      .select()
      .single();
    
    if (error) throw error;
    
    // Log the creation of the execution
    await logExecutionEvent(data.id, 'info', 'Strategy execution created', 'system');
    
    return data as StrategyExecution;
  } catch (error) {
    console.error('Error starting strategy execution:', error);
    throw error;
  }
}

/**
 * Start the actual execution of a strategy (change status to running)
 */
export async function runStrategyExecution(executionId: number): Promise<StrategyExecution> {
  const supabase = createBrowserClient();
  
  try {
    // Update the execution status
    const { data, error } = await supabase
      .from('strategy_executions')
      .update({
        status: 'running',
        start_time: new Date().toISOString(),
      })
      .eq('id', executionId)
      .select()
      .single();
    
    if (error) throw error;
    
    // Log the start of the execution
    await logExecutionEvent(executionId, 'info', 'Strategy execution started', 'system');
    
    return data as StrategyExecution;
  } catch (error) {
    console.error('Error running strategy execution:', error);
    throw error;
  }
}

/**
 * Pause a running strategy execution
 */
export async function pauseStrategyExecution(executionId: number): Promise<StrategyExecution> {
  const supabase = createBrowserClient();
  
  try {
    // Update the execution status
    const { data, error } = await supabase
      .from('strategy_executions')
      .update({
        status: 'paused',
      })
      .eq('id', executionId)
      .select()
      .single();
    
    if (error) throw error;
    
    // Log the pause of the execution
    await logExecutionEvent(executionId, 'info', 'Strategy execution paused', 'system');
    
    return data as StrategyExecution;
  } catch (error) {
    console.error('Error pausing strategy execution:', error);
    throw error;
  }
}

/**
 * Stop a strategy execution
 */
export async function stopStrategyExecution(executionId: number): Promise<StrategyExecution> {
  const supabase = createBrowserClient();
  
  try {
    // Update the execution status
    const { data, error } = await supabase
      .from('strategy_executions')
      .update({
        status: 'stopped',
        end_time: new Date().toISOString(),
      })
      .eq('id', executionId)
      .select()
      .single();
    
    if (error) throw error;
    
    // Log the stop of the execution
    await logExecutionEvent(executionId, 'info', 'Strategy execution stopped', 'system');
    
    return data as StrategyExecution;
  } catch (error) {
    console.error('Error stopping strategy execution:', error);
    throw error;
  }
}

/**
 * Get a strategy execution by ID
 */
export async function getStrategyExecution(executionId: number): Promise<StrategyExecution> {
  const supabase = createBrowserClient();
  
  try {
    const { data, error } = await supabase
      .from('strategy_executions')
      .select('*')
      .eq('id', executionId)
      .single();
    
    if (error) throw error;
    
    return data as StrategyExecution;
  } catch (error) {
    console.error('Error getting strategy execution:', error);
    throw error;
  }
}

/**
 * Get executions for a strategy
 */
export async function getStrategyExecutions(strategyId: number): Promise<StrategyExecution[]> {
  const supabase = createBrowserClient();
  
  try {
    const { data, error } = await supabase
      .from('strategy_executions')
      .select('*')
      .eq('strategy_id', strategyId)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    
    return data as StrategyExecution[];
  } catch (error) {
    console.error('Error getting strategy executions:', error);
    return [];
  }
}

/**
 * Add a message to the strategy execution
 */
export async function addExecutionMessage(executionId: number, message: string): Promise<void> {
  const supabase = createBrowserClient();
  
  try {
    // Get current messages
    const { data: execution, error: getError } = await supabase
      .from('strategy_executions')
      .select('messages')
      .eq('id', executionId)
      .single();
    
    if (getError) throw getError;
    
    // Add new message
    const messages = [...(execution.messages || []), message];
    
    // Update messages
    const { error: updateError } = await supabase
      .from('strategy_executions')
      .update({ messages })
      .eq('id', executionId);
    
    if (updateError) throw updateError;
  } catch (error) {
    console.error('Error adding execution message:', error);
  }
}

/**
 * Log an event for a strategy execution
 */
export async function logExecutionEvent(
  executionId: number,
  level: 'debug' | 'info' | 'warning' | 'error' | 'critical',
  message: string,
  source?: string,
  metadata?: Record<string, any>
): Promise<void> {
  const supabase = createBrowserClient();
  
  try {
    await supabase
      .from('execution_logs')
      .insert({
        execution_id: executionId,
        level,
        message,
        source,
        metadata,
      });
  } catch (error) {
    console.error('Error logging execution event:', error);
  }
}

/**
 * Record a strategy signal
 */
export async function recordStrategySignal(
  executionId: number,
  signal: Omit<StrategySignal, 'id' | 'execution_id' | 'created_at'>
): Promise<StrategySignal> {
  const supabase = createBrowserClient();
  
  try {
    const { data, error } = await supabase
      .from('strategy_signals')
      .insert({
        execution_id: executionId,
        ...signal,
      })
      .select()
      .single();
    
    if (error) throw error;
    
    return data as StrategySignal;
  } catch (error) {
    console.error('Error recording strategy signal:', error);
    throw error;
  }
}

/**
 * Get signals for a strategy execution
 */
export async function getExecutionSignals(executionId: number): Promise<StrategySignal[]> {
  const supabase = createBrowserClient();
  
  try {
    const { data, error } = await supabase
      .from('strategy_signals')
      .select('*')
      .eq('execution_id', executionId)
      .order('timestamp', { ascending: false });
    
    if (error) throw error;
    
    return data as StrategySignal[];
  } catch (error) {
    console.error('Error getting execution signals:', error);
    return [];
  }
}

/**
 * Open a new trade for a strategy execution
 */
export async function openTrade(
  executionId: number,
  direction: 'long' | 'short',
  entryPrice: number,
  quantity: number,
  entryReason?: string,
  metadata?: Record<string, any>
): Promise<ExecutionTrade> {
  const supabase = createBrowserClient();
  
  try {
    // Get the execution to check symbol
    const { data: execution, error: execError } = await supabase
      .from('strategy_executions')
      .select('symbol')
      .eq('id', executionId)
      .single();
    
    if (execError) throw execError;
    
    // Create the trade
    const { data, error } = await supabase
      .from('execution_trades')
      .insert({
        execution_id: executionId,
        symbol: execution.symbol,
        direction,
        status: 'open',
        entry_time: new Date().toISOString(),
        entry_price: entryPrice,
        quantity,
        entry_reason: entryReason,
        metadata: metadata || {},
      })
      .select()
      .single();
    
    if (error) throw error;
    
    // Log the trade opening
    await logExecutionEvent(
      executionId,
      'info',
      `Opened ${direction} trade at ${entryPrice}`,
      'trade',
      { trade_id: data.id }
    );
    
    return data as ExecutionTrade;
  } catch (error) {
    console.error('Error opening trade:', error);
    throw error;
  }
}

/**
 * Close an open trade
 */
export async function closeTrade(
  tradeId: number,
  exitPrice: number,
  exitReason?: string,
  metadata?: Record<string, any>
): Promise<ExecutionTrade> {
  const supabase = createBrowserClient();
  
  try {
    // Get the trade to calculate P&L
    const { data: trade, error: tradeError } = await supabase
      .from('execution_trades')
      .select('*')
      .eq('id', tradeId)
      .single();
    
    if (tradeError) throw tradeError;
    
    // Calculate P&L
    const entryPrice = trade.entry_price;
    const quantity = trade.quantity;
    let pnl = 0;
    
    if (trade.direction === 'long') {
      pnl = (exitPrice - entryPrice) * quantity;
    } else { // short
      pnl = (entryPrice - exitPrice) * quantity;
    }
    
    // Calculate percentage
    const pnlPercentage = (pnl / (entryPrice * quantity)) * 100;
    
    // Update the trade
    const { data, error } = await supabase
      .from('execution_trades')
      .update({
        status: 'closed',
        exit_time: new Date().toISOString(),
        exit_price: exitPrice,
        pnl,
        pnl_percentage: pnlPercentage,
        exit_reason: exitReason,
        metadata: { ...trade.metadata, ...(metadata || {}) },
      })
      .eq('id', tradeId)
      .select()
      .single();
    
    if (error) throw error;
    
    // Log the trade closing
    await logExecutionEvent(
      trade.execution_id,
      'info',
      `Closed ${trade.direction} trade at ${exitPrice}, P&L: ${pnl.toFixed(2)} (${pnlPercentage.toFixed(2)}%)`,
      'trade',
      { trade_id: tradeId }
    );
    
    // Update execution capital
    await updateExecutionCapital(trade.execution_id);
    
    return data as ExecutionTrade;
  } catch (error) {
    console.error('Error closing trade:', error);
    throw error;
  }
}

/**
 * Update the execution's current capital based on closed trades
 */
async function updateExecutionCapital(executionId: number): Promise<void> {
  const supabase = createBrowserClient();
  
  try {
    // Get the execution
    const { data: execution, error: execError } = await supabase
      .from('strategy_executions')
      .select('initial_capital')
      .eq('id', executionId)
      .single();
    
    if (execError) throw execError;
    
    // Get all closed trades
    const { data: trades, error: tradesError } = await supabase
      .from('execution_trades')
      .select('pnl')
      .eq('execution_id', executionId)
      .eq('status', 'closed');
    
    if (tradesError) throw tradesError;
    
    // Calculate total P&L
    const totalPnl = trades.reduce((sum, trade) => sum + (trade.pnl || 0), 0);
    
    // Update current capital
    const currentCapital = execution.initial_capital + totalPnl;
    
    await supabase
      .from('strategy_executions')
      .update({ current_capital: currentCapital })
      .eq('id', executionId);
    
  } catch (error) {
    console.error('Error updating execution capital:', error);
  }
}

/**
 * Get trades for a strategy execution
 */
export async function getExecutionTrades(executionId: number): Promise<ExecutionTrade[]> {
  const supabase = createBrowserClient();
  
  try {
    const { data, error } = await supabase
      .from('execution_trades')
      .select('*')
      .eq('execution_id', executionId)
      .order('entry_time', { ascending: false });
    
    if (error) throw error;
    
    return data as ExecutionTrade[];
  } catch (error) {
    console.error('Error getting execution trades:', error);
    return [];
  }
}

/**
 * Get logs for a strategy execution
 */
export async function getExecutionLogs(
  executionId: number,
  level?: 'debug' | 'info' | 'warning' | 'error' | 'critical',
  limit = 100
): Promise<ExecutionLog[]> {
  const supabase = createBrowserClient();
  
  try {
    let query = supabase
      .from('execution_logs')
      .select('*')
      .eq('execution_id', executionId)
      .order('timestamp', { ascending: false })
      .limit(limit);
    
    if (level) {
      query = query.eq('level', level);
    }
    
    const { data, error } = await query;
    
    if (error) throw error;
    
    return data as ExecutionLog[];
  } catch (error) {
    console.error('Error getting execution logs:', error);
    return [];
  }
}
