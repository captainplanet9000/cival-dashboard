/**
 * Performance Monitoring Service
 * 
 * This service provides real-time performance monitoring and analytics:
 * - Calculating performance metrics across different time periods
 * - Generating performance reports
 * - Real-time monitoring of key performance indicators
 * - Alerts for performance deterioration
 */

import { createBrowserClient } from '@/utils/supabase/client';
import websocketService, { WebSocketTopic } from './websocket-service';

// Performance Metric Periods
export type MetricPeriod = 'daily' | 'weekly' | 'monthly' | 'yearly' | 'all_time';

// Performance Metrics Interface
export interface PerformanceMetrics {
  id?: string;
  user_id?: string;
  farm_id?: string;
  agent_id?: string;
  strategy_id?: string;
  period: MetricPeriod;
  period_start: string;
  period_end: string;
  total_trades: number;
  winning_trades: number;
  losing_trades: number;
  win_rate: number;
  profit_loss: number;
  profit_loss_percent: number;
  max_drawdown: number;
  sharpe_ratio: number;
  volatility: number;
  largest_win: number;
  largest_loss: number;
  avg_win: number;
  avg_loss: number;
  avg_trade_duration: number;
  roi: number;
  data?: {
    equity_curve?: number[];
    drawdown_curve?: number[];
    trade_pnl?: number[];
    cumulative_pnl?: number[];
    [key: string]: any;
  };
}

// Performance Alert Interface
export interface PerformanceAlert {
  id?: string;
  user_id?: string;
  farm_id?: string;
  agent_id?: string;
  strategy_id?: string;
  alert_type: 'drawdown' | 'win_rate' | 'volatility' | 'profit_loss' | 'custom';
  severity: 'info' | 'warning' | 'critical';
  threshold_value: number;
  current_value: number;
  message: string;
  timestamp: string;
  acknowledged: boolean;
  resolved: boolean;
  resolution_time?: string;
  resolution_notes?: string;
}

/**
 * Get performance metrics for a farm
 */
export async function getFarmPerformanceMetrics(
  farmId: string, 
  period: MetricPeriod = 'monthly'
): Promise<PerformanceMetrics | null> {
  const supabase = createBrowserClient();
  
  try {
    const { data, error } = await supabase
      .from('performance_metrics')
      .select('*')
      .eq('farm_id', farmId)
      .eq('period', period)
      .order('period_end', { ascending: false })
      .limit(1)
      .single();
    
    if (error) {
      if (error.code === 'PGRST116') {
        // No data found
        return null;
      }
      throw error;
    }
    
    return data;
  } catch (error) {
    console.error('Error fetching farm performance metrics:', error);
    throw error;
  }
}

/**
 * Get performance metrics for an agent
 */
export async function getAgentPerformanceMetrics(
  agentId: string, 
  period: MetricPeriod = 'monthly'
): Promise<PerformanceMetrics | null> {
  const supabase = createBrowserClient();
  
  try {
    const { data, error } = await supabase
      .from('performance_metrics')
      .select('*')
      .eq('agent_id', agentId)
      .eq('period', period)
      .order('period_end', { ascending: false })
      .limit(1)
      .single();
    
    if (error) {
      if (error.code === 'PGRST116') {
        // No data found
        return null;
      }
      throw error;
    }
    
    return data;
  } catch (error) {
    console.error('Error fetching agent performance metrics:', error);
    throw error;
  }
}

/**
 * Get performance metrics for a strategy
 */
export async function getStrategyPerformanceMetrics(
  strategyId: string, 
  period: MetricPeriod = 'monthly'
): Promise<PerformanceMetrics | null> {
  const supabase = createBrowserClient();
  
  try {
    const { data, error } = await supabase
      .from('performance_metrics')
      .select('*')
      .eq('strategy_id', strategyId)
      .eq('period', period)
      .order('period_end', { ascending: false })
      .limit(1)
      .single();
    
    if (error) {
      if (error.code === 'PGRST116') {
        // No data found
        return null;
      }
      throw error;
    }
    
    return data;
  } catch (error) {
    console.error('Error fetching strategy performance metrics:', error);
    throw error;
  }
}

/**
 * Get performance metrics history for an entity
 */
export async function getPerformanceHistory(
  entityType: 'farm' | 'agent' | 'strategy',
  entityId: string,
  period: MetricPeriod = 'monthly',
  limit: number = 12
) {
  const supabase = createBrowserClient();
  
  try {
    const entityField = `${entityType}_id`;
    
    const { data, error } = await supabase
      .from('performance_metrics')
      .select('*')
      .eq(entityField, entityId)
      .eq('period', period)
      .order('period_end', { ascending: false })
      .limit(limit);
    
    if (error) throw error;
    
    return data;
  } catch (error) {
    console.error(`Error fetching ${entityType} performance history:`, error);
    throw error;
  }
}

/**
 * Generate equity curve data
 */
export function generateEquityCurve(trades: any[], initialCapital: number = 10000): number[] {
  // Sort trades by execution time
  const sortedTrades = [...trades].sort((a, b) => {
    const dateA = new Date(a.executed_at || a.created_at).getTime();
    const dateB = new Date(b.executed_at || b.created_at).getTime();
    return dateA - dateB;
  });
  
  // Generate equity curve
  const equityCurve = [initialCapital];
  let currentEquity = initialCapital;
  
  for (const trade of sortedTrades) {
    const pnl = trade.realized_pnl || 0;
    currentEquity += pnl;
    equityCurve.push(currentEquity);
  }
  
  return equityCurve;
}

/**
 * Calculate drawdown curve from equity curve
 */
export function calculateDrawdownCurve(equityCurve: number[]): number[] {
  const drawdownCurve: number[] = [];
  let peak = equityCurve[0];
  
  for (const equity of equityCurve) {
    if (equity > peak) {
      peak = equity;
      drawdownCurve.push(0); // No drawdown at new peak
    } else {
      const drawdown = (peak - equity) / peak * 100;
      drawdownCurve.push(drawdown);
    }
  }
  
  return drawdownCurve;
}

/**
 * Calculate Sharpe ratio
 */
export function calculateSharpeRatio(
  returns: number[],
  riskFreeRate: number = 0.02
): number {
  // Calculate mean return
  const meanReturn = returns.reduce((sum, r) => sum + r, 0) / returns.length;
  
  // Calculate standard deviation
  const variance = returns.reduce((sum, r) => sum + Math.pow(r - meanReturn, 2), 0) / returns.length;
  const stdDev = Math.sqrt(variance);
  
  // Calculate Sharpe ratio
  const excessReturn = meanReturn - riskFreeRate;
  
  return stdDev === 0 ? 0 : excessReturn / stdDev;
}

/**
 * Subscribe to performance updates
 */
export function subscribeToPerformanceUpdates(callback: (data: any) => void) {
  return websocketService.subscribe(WebSocketTopic.PERFORMANCE, (message) => {
    callback(message);
  });
}

/**
 * Get all active performance alerts
 */
export async function getActiveAlerts(farmId?: string, agentId?: string) {
  const supabase = createBrowserClient();
  
  try {
    let query = supabase
      .from('alerts')
      .select('*')
      .eq('resolved', false)
      .order('timestamp', { ascending: false });
    
    if (farmId) {
      query = query.eq('farm_id', farmId);
    }
    
    if (agentId) {
      query = query.eq('agent_id', agentId);
    }
    
    const { data, error } = await query;
    
    if (error) throw error;
    
    return data;
  } catch (error) {
    console.error('Error fetching active alerts:', error);
    throw error;
  }
}

/**
 * Create a new performance alert
 */
export async function createPerformanceAlert(
  alert: Omit<PerformanceAlert, 'id' | 'user_id' | 'timestamp' | 'acknowledged' | 'resolved'>
) {
  const supabase = createBrowserClient();
  
  try {
    const { data, error } = await supabase
      .from('alerts')
      .insert({
        ...alert,
        timestamp: new Date().toISOString(),
        acknowledged: false,
        resolved: false
      })
      .select()
      .single();
    
    if (error) throw error;
    
    return data;
  } catch (error) {
    console.error('Error creating performance alert:', error);
    throw error;
  }
}

/**
 * Acknowledge an alert
 */
export async function acknowledgeAlert(alertId: string) {
  const supabase = createBrowserClient();
  
  try {
    const { data, error } = await supabase
      .from('alerts')
      .update({
        acknowledged: true
      })
      .eq('id', alertId)
      .select()
      .single();
    
    if (error) throw error;
    
    return data;
  } catch (error) {
    console.error('Error acknowledging alert:', error);
    throw error;
  }
}

/**
 * Resolve an alert
 */
export async function resolveAlert(alertId: string, resolutionNotes?: string) {
  const supabase = createBrowserClient();
  
  try {
    const { data, error } = await supabase
      .from('alerts')
      .update({
        resolved: true,
        resolution_time: new Date().toISOString(),
        resolution_notes: resolutionNotes
      })
      .eq('id', alertId)
      .select()
      .single();
    
    if (error) throw error;
    
    return data;
  } catch (error) {
    console.error('Error resolving alert:', error);
    throw error;
  }
}

/**
 * Calculate key performance indicators
 */
export function calculateKPIs(trades: any[]) {
  if (!trades.length) {
    return {
      total_trades: 0,
      winning_trades: 0,
      losing_trades: 0,
      win_rate: 0,
      profit_loss: 0,
      largest_win: 0,
      largest_loss: 0,
      avg_win: 0,
      avg_loss: 0
    };
  }
  
  const winningTrades = trades.filter(trade => (trade.realized_pnl || 0) > 0);
  const losingTrades = trades.filter(trade => (trade.realized_pnl || 0) < 0);
  
  const totalPnL = trades.reduce((sum, trade) => sum + (trade.realized_pnl || 0), 0);
  
  // Calculate largest win/loss
  let largestWin = 0;
  let largestLoss = 0;
  
  for (const trade of trades) {
    const pnl = trade.realized_pnl || 0;
    if (pnl > largestWin) largestWin = pnl;
    if (pnl < largestLoss) largestLoss = pnl;
  }
  
  // Calculate average win/loss
  const avgWin = winningTrades.length 
    ? winningTrades.reduce((sum, trade) => sum + (trade.realized_pnl || 0), 0) / winningTrades.length 
    : 0;
  
  const avgLoss = losingTrades.length 
    ? losingTrades.reduce((sum, trade) => sum + (trade.realized_pnl || 0), 0) / losingTrades.length 
    : 0;
  
  return {
    total_trades: trades.length,
    winning_trades: winningTrades.length,
    losing_trades: losingTrades.length,
    win_rate: trades.length ? winningTrades.length / trades.length : 0,
    profit_loss: totalPnL,
    largest_win: largestWin,
    largest_loss: largestLoss,
    avg_win: avgWin,
    avg_loss: avgLoss
  };
}

/**
 * Generate performance report (PDF or data)
 */
export async function generatePerformanceReport(
  entityType: 'farm' | 'agent' | 'strategy',
  entityId: string,
  period: MetricPeriod = 'monthly',
  format: 'json' | 'pdf' = 'json'
) {
  try {
    // For PDF format, we would call an API endpoint
    if (format === 'pdf') {
      const response = await fetch(`/api/reports/performance/${entityType}/${entityId}?period=${period}&format=${format}`, {
        method: 'GET',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to generate performance report');
      }

      // Return the PDF blob
      return await response.blob();
    }
    
    // For JSON format, we can fetch the data directly
    let metrics;
    switch (entityType) {
      case 'farm':
        metrics = await getFarmPerformanceMetrics(entityId, period);
        break;
      case 'agent':
        metrics = await getAgentPerformanceMetrics(entityId, period);
        break;
      case 'strategy':
        metrics = await getStrategyPerformanceMetrics(entityId, period);
        break;
    }
    
    return metrics;
  } catch (error) {
    console.error('Error generating performance report:', error);
    throw error;
  }
}

export default {
  getFarmPerformanceMetrics,
  getAgentPerformanceMetrics,
  getStrategyPerformanceMetrics,
  getPerformanceHistory,
  generateEquityCurve,
  calculateDrawdownCurve,
  calculateSharpeRatio,
  subscribeToPerformanceUpdates,
  getActiveAlerts,
  createPerformanceAlert,
  acknowledgeAlert,
  resolveAlert,
  calculateKPIs,
  generatePerformanceReport
};
