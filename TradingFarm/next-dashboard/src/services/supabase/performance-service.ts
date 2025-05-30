import { supabase } from './client';
import { StrategyPerformanceRow, PerformanceSnapshotRow } from './types';
import { 
  StrategyPerformance, 
  PerformanceSnapshot 
} from '../trading/goals/goal-performance-tracker';

/**
 * Convert a database row to a StrategyPerformance object
 */
export const mapRowToStrategyPerformance = (row: StrategyPerformanceRow): StrategyPerformance => {
  return {
    strategyId: row.strategy_id,
    goalId: row.goal_id,
    startDate: new Date(row.start_date),
    lastUpdated: new Date(row.last_updated),
    totalReturn: row.total_return,
    winRate: row.win_rate,
    averageWin: row.average_win,
    averageLoss: row.average_loss,
    maxDrawdown: row.max_drawdown,
    volatility: row.volatility,
    sharpeRatio: row.sharpe_ratio,
    successScore: row.success_score,
    trades: row.trades,
    metrics: row.metrics
  };
};

/**
 * Convert a StrategyPerformance object to a database row
 */
export const mapStrategyPerformanceToRow = (performance: StrategyPerformance): Omit<StrategyPerformanceRow, 'id'> => {
  return {
    strategy_id: performance.strategyId,
    goal_id: performance.goalId,
    start_date: performance.startDate.toISOString(),
    last_updated: performance.lastUpdated.toISOString(),
    total_return: performance.totalReturn,
    win_rate: performance.winRate,
    average_win: performance.averageWin,
    average_loss: performance.averageLoss,
    max_drawdown: performance.maxDrawdown,
    volatility: performance.volatility,
    sharpe_ratio: performance.sharpeRatio,
    success_score: performance.successScore,
    trades: performance.trades,
    metrics: performance.metrics
  };
};

/**
 * Convert a database row to a PerformanceSnapshot object
 */
export const mapRowToPerformanceSnapshot = (row: PerformanceSnapshotRow): PerformanceSnapshot => {
  return {
    goalId: row.goal_id,
    date: new Date(row.date),
    progress: row.progress,
    metrics: row.metrics,
    strategyMetrics: row.strategy_metrics
  };
};

/**
 * Convert a PerformanceSnapshot object to a database row
 */
export const mapPerformanceSnapshotToRow = (snapshot: PerformanceSnapshot): Omit<PerformanceSnapshotRow, 'id'> => {
  return {
    goal_id: snapshot.goalId,
    date: snapshot.date.toISOString(),
    progress: snapshot.progress,
    metrics: snapshot.metrics,
    strategy_metrics: snapshot.strategyMetrics
  };
};

/**
 * Save strategy performance data to the database
 */
export const saveStrategyPerformance = async (performance: StrategyPerformance): Promise<StrategyPerformance | null> => {
  // Check if performance record already exists for this strategy and goal
  const { data: existingData } = await supabase
    .from('strategy_performances')
    .select('id')
    .eq('strategy_id', performance.strategyId)
    .eq('goal_id', performance.goalId)
    .single();
    
  const row = mapStrategyPerformanceToRow(performance);
  
  let result;
  if (existingData) {
    // Update existing record
    result = await supabase
      .from('strategy_performances')
      .update(row)
      .eq('id', existingData.id)
      .select()
      .single();
  } else {
    // Insert new record
    result = await supabase
      .from('strategy_performances')
      .insert([row])
      .select()
      .single();
  }
  
  const { data, error } = result;
  
  if (error) {
    console.error('Error saving strategy performance:', error);
    return null;
  }
  
  return mapRowToStrategyPerformance(data as StrategyPerformanceRow);
};

/**
 * Get all strategy performances for a specific goal
 */
export const getStrategyPerformancesForGoal = async (goalId: string): Promise<StrategyPerformance[]> => {
  const { data, error } = await supabase
    .from('strategy_performances')
    .select('*')
    .eq('goal_id', goalId);
    
  if (error) {
    console.error(`Error fetching strategy performances for goal ${goalId}:`, error);
    return [];
  }
  
  return (data as StrategyPerformanceRow[]).map(mapRowToStrategyPerformance);
};

/**
 * Get a specific strategy performance
 */
export const getStrategyPerformance = async (goalId: string, strategyId: string): Promise<StrategyPerformance | null> => {
  const { data, error } = await supabase
    .from('strategy_performances')
    .select('*')
    .eq('goal_id', goalId)
    .eq('strategy_id', strategyId)
    .single();
    
  if (error) {
    console.error(`Error fetching strategy performance for goal ${goalId}, strategy ${strategyId}:`, error);
    return null;
  }
  
  return mapRowToStrategyPerformance(data as StrategyPerformanceRow);
};

/**
 * Save a performance snapshot
 */
export const savePerformanceSnapshot = async (snapshot: PerformanceSnapshot): Promise<PerformanceSnapshot | null> => {
  const row = mapPerformanceSnapshotToRow(snapshot);
  
  const { data, error } = await supabase
    .from('performance_snapshots')
    .insert([row])
    .select()
    .single();
    
  if (error) {
    console.error('Error saving performance snapshot:', error);
    return null;
  }
  
  return mapRowToPerformanceSnapshot(data as PerformanceSnapshotRow);
};

/**
 * Get performance history for a goal
 */
export const getPerformanceHistory = async (goalId: string): Promise<PerformanceSnapshot[]> => {
  const { data, error } = await supabase
    .from('performance_snapshots')
    .select('*')
    .eq('goal_id', goalId)
    .order('date', { ascending: true });
    
  if (error) {
    console.error(`Error fetching performance history for goal ${goalId}:`, error);
    return [];
  }
  
  return (data as PerformanceSnapshotRow[]).map(mapRowToPerformanceSnapshot);
};

/**
 * Portfolio Metrics Types and Functions
 */

export interface PortfolioMetric {
  id: string;
  walletId?: string;
  farmId?: string;
  agentId?: string;
  date: Date;
  totalValue: number;
  dailyPnl: number;
  dailyPnlPercentage: number;
  weeklyPnl: number;
  weeklyPnlPercentage: number;
  monthlyPnl: number;
  monthlyPnlPercentage: number;
  ytdPnl: number;
  ytdPnlPercentage: number;
  allTimePnl: number;
  allTimePnlPercentage: number;
  portfolioAllocation: Record<string, number>;
  riskMetrics: Record<string, number>;
  createdAt: Date;
  updatedAt: Date;
}

export interface PortfolioMetricRow {
  id: string;
  wallet_id?: string;
  farm_id?: string;
  agent_id?: string;
  date: string;
  total_value: number;
  daily_pnl: number;
  daily_pnl_percentage: number;
  weekly_pnl: number;
  weekly_pnl_percentage: number;
  monthly_pnl: number;
  monthly_pnl_percentage: number;
  ytd_pnl: number;
  ytd_pnl_percentage: number;
  all_time_pnl: number;
  all_time_pnl_percentage: number;
  portfolio_allocation: Record<string, number>;
  risk_metrics: Record<string, number>;
  created_at: string;
  updated_at: string;
}

/**
 * Convert a database row to a PortfolioMetric object
 */
export const mapRowToPortfolioMetric = (row: PortfolioMetricRow): PortfolioMetric => {
  return {
    id: row.id,
    walletId: row.wallet_id,
    farmId: row.farm_id,
    agentId: row.agent_id,
    date: new Date(row.date),
    totalValue: row.total_value,
    dailyPnl: row.daily_pnl,
    dailyPnlPercentage: row.daily_pnl_percentage,
    weeklyPnl: row.weekly_pnl,
    weeklyPnlPercentage: row.weekly_pnl_percentage,
    monthlyPnl: row.monthly_pnl,
    monthlyPnlPercentage: row.monthly_pnl_percentage,
    ytdPnl: row.ytd_pnl,
    ytdPnlPercentage: row.ytd_pnl_percentage,
    allTimePnl: row.all_time_pnl,
    allTimePnlPercentage: row.all_time_pnl_percentage,
    portfolioAllocation: row.portfolio_allocation,
    riskMetrics: row.risk_metrics,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at)
  };
};

/**
 * Get portfolio metrics with error handling for missing table
 */
export const getPortfolioMetrics = async (
  walletId?: string,
  farmId?: string,
  agentId?: string,
  limit: number = 10
): Promise<PortfolioMetric[]> => {
  try {
    let query = supabase
      .from('portfolio_metrics')
      .select('*')
      .order('date', { ascending: false })
      .limit(limit);
      
    if (walletId) {
      query = query.eq('wallet_id', walletId);
    }
    
    if (farmId) {
      query = query.eq('farm_id', farmId);
    }
    
    if (agentId) {
      query = query.eq('agent_id', agentId);
    }
    
    const { data, error } = await query;
    
    if (error) {
      // Check if this is a missing table error (code 42P01)
      if (error.code === '42P01') {
        console.error('Error fetching performance data: Table "portfolio_metrics" does not exist yet', error);
        // Return mock data in development mode to prevent UI errors
        if (process.env.NODE_ENV === 'development') {
          return generateMockPortfolioMetrics(5);
        }
      } else {
        console.error('Error fetching portfolio metrics:', error);
      }
      return [];
    }
    
    return (data as PortfolioMetricRow[]).map(mapRowToPortfolioMetric);
  } catch (err) {
    console.error('Unexpected error fetching portfolio metrics:', err);
    // Return mock data in development
    if (process.env.NODE_ENV === 'development') {
      return generateMockPortfolioMetrics(5);
    }
    return [];
  }
};

/**
 * Generate mock portfolio metrics data for development
 */
const generateMockPortfolioMetrics = (count: number): PortfolioMetric[] => {
  const metrics: PortfolioMetric[] = [];
  const now = new Date();
  
  for (let i = 0; i < count; i++) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);
    
    metrics.push({
      id: `mock-${i}`,
      date,
      totalValue: 10000 + (Math.random() * 1000 - 500),
      dailyPnl: Math.random() * 200 - 100,
      dailyPnlPercentage: Math.random() * 4 - 2,
      weeklyPnl: Math.random() * 500 - 250,
      weeklyPnlPercentage: Math.random() * 8 - 4,
      monthlyPnl: Math.random() * 1000 - 500,
      monthlyPnlPercentage: Math.random() * 15 - 7.5,
      ytdPnl: Math.random() * 3000 - 1000,
      ytdPnlPercentage: Math.random() * 30 - 10,
      allTimePnl: Math.random() * 5000 - 1000,
      allTimePnlPercentage: Math.random() * 50 - 10,
      portfolioAllocation: {
        BTC: Math.round(Math.random() * 40 + 20),
        ETH: Math.round(Math.random() * 30 + 10),
        SOL: Math.round(Math.random() * 20 + 5),
        DOT: Math.round(Math.random() * 10 + 2),
        USD: Math.round(Math.random() * 20 + 5)
      },
      riskMetrics: {
        sharpe: Math.random() * 2 + 0.5,
        sortino: Math.random() * 2.5 + 1,
        maxDrawdown: Math.random() * 20 + 5,
        volatility: Math.random() * 10 + 3
      },
      createdAt: date,
      updatedAt: date
    });
  }
  
  return metrics;
};
