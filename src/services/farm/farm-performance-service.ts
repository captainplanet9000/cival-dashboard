import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database.types';

export interface PerformanceMetrics {
  win_rate: number;
  profit_factor: number;
  avg_profit: number;
  avg_loss: number;
  max_drawdown: number;
  sharpe_ratio: number;
  total_trades: number;
  profitable_trades: number;
  total_profit: number;
  total_loss: number;
  long_trades: number;
  short_trades: number;
  long_pnl: number;
  short_pnl: number;
  max_consecutive_wins: number;
  max_consecutive_losses: number;
  average_hold_time_days: number;
}

export interface Trade {
  id: string;
  farmId: string;
  agentId: string;
  symbol: string;
  side: 'long' | 'short';
  entry_price: number;
  exit_price: number;
  size: number;
  realized_pnl: number;
  entry_time: string;
  exit_time: string;
  hold_time_days: number;
  strategy_id?: string;
}

export class FarmPerformanceService {
  private supabase;

  constructor(supabaseUrl: string, supabaseKey: string) {
    this.supabase = createClient<Database>(supabaseUrl, supabaseKey);
  }

  async recordTrade(trade: Trade) {
    try {
      const { error } = await this.supabase
        .from('farm_trades')
        .insert([trade]);

      if (error) throw error;

      // Broadcast trade event
      await this.supabase
        .from('mcp_messages')
        .insert([{
          topic: `farm:${trade.farmId}:trade`,
          payload: trade,
          metadata: {
            farm_id: trade.farmId,
            agent_id: trade.agentId,
            event_type: 'trade'
          }
        }]);

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to record trade'
      };
    }
  }

  async getPerformanceMetrics(
    farmId: string,
    startTime?: string,
    endTime?: string,
    strategyId?: string,
    symbol?: string
  ) {
    try {
      let query = this.supabase
        .from('farm_trades')
        .select('*')
        .eq('farmId', farmId);

      if (startTime) {
        query = query.gte('entry_time', startTime);
      }
      if (endTime) {
        query = query.lte('exit_time', endTime);
      }
      if (strategyId) {
        query = query.eq('strategy_id', strategyId);
      }
      if (symbol) {
        query = query.eq('symbol', symbol);
      }

      const { data: trades, error } = await query;

      if (error) throw error;

      if (!trades || trades.length === 0) {
        return {
          success: true,
          data: this.getEmptyMetrics()
        };
      }

      const metrics = this.calculateMetrics(trades);

      // Store metrics in Supabase for historical tracking
      await this.supabase
        .from('farm_performance_history')
        .insert([{
          farm_id: farmId,
          metrics,
          timestamp: new Date().toISOString(),
          strategy_id: strategyId,
          symbol
        }]);

      return {
        success: true,
        data: metrics
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get performance metrics'
      };
    }
  }

  private calculateMetrics(trades: Trade[]): PerformanceMetrics {
    const winningTrades = trades.filter(t => t.realized_pnl > 0);
    const losingTrades = trades.filter(t => t.realized_pnl < 0);
    const longTrades = trades.filter(t => t.side === 'long');
    const shortTrades = trades.filter(t => t.side === 'short');

    const totalPnl = trades.reduce((sum, t) => sum + t.realized_pnl, 0);
    const totalGains = winningTrades.reduce((sum, t) => sum + t.realized_pnl, 0);
    const totalLosses = Math.abs(losingTrades.reduce((sum, t) => sum + t.realized_pnl, 0));
    const longPnl = longTrades.reduce((sum, t) => sum + t.realized_pnl, 0);
    const shortPnl = shortTrades.reduce((sum, t) => sum + t.realized_pnl, 0);

    const avgHoldTime = trades.reduce((sum, t) => sum + t.hold_time_days, 0) / trades.length;

    // Calculate consecutive wins/losses
    const sortedTrades = [...trades].sort((a, b) => 
      new Date(a.exit_time).getTime() - new Date(b.exit_time).getTime()
    );
    
    let maxConsecutiveWins = 0;
    let maxConsecutiveLosses = 0;
    let currentWins = 0;
    let currentLosses = 0;

    sortedTrades.forEach(trade => {
      if (trade.realized_pnl > 0) {
        currentWins++;
        currentLosses = 0;
        maxConsecutiveWins = Math.max(maxConsecutiveWins, currentWins);
      } else if (trade.realized_pnl < 0) {
        currentLosses++;
        currentWins = 0;
        maxConsecutiveLosses = Math.max(maxConsecutiveLosses, currentLosses);
      }
    });

    return {
      win_rate: (winningTrades.length / trades.length) * 100,
      profit_factor: totalLosses === 0 ? Infinity : totalGains / totalLosses,
      avg_profit: winningTrades.length > 0 ? totalGains / winningTrades.length : 0,
      avg_loss: losingTrades.length > 0 ? totalLosses / losingTrades.length : 0,
      max_drawdown: this.calculateMaxDrawdown(sortedTrades),
      sharpe_ratio: this.calculateSharpeRatio(trades),
      total_trades: trades.length,
      profitable_trades: winningTrades.length,
      total_profit: totalGains,
      total_loss: totalLosses,
      long_trades: longTrades.length,
      short_trades: shortTrades.length,
      long_pnl: longPnl,
      short_pnl: shortPnl,
      max_consecutive_wins: maxConsecutiveWins,
      max_consecutive_losses: maxConsecutiveLosses,
      average_hold_time_days: avgHoldTime
    };
  }

  private calculateMaxDrawdown(trades: Trade[]): number {
    let peak = 0;
    let maxDrawdown = 0;
    let runningPnl = 0;

    trades.forEach(trade => {
      runningPnl += trade.realized_pnl;
      if (runningPnl > peak) {
        peak = runningPnl;
      }
      const drawdown = peak - runningPnl;
      if (drawdown > maxDrawdown) {
        maxDrawdown = drawdown;
      }
    });

    return maxDrawdown;
  }

  private calculateSharpeRatio(trades: Trade[]): number {
    if (trades.length < 2) return 0;

    const returns = trades.map(t => t.realized_pnl);
    const meanReturn = returns.reduce((sum, r) => sum + r, 0) / returns.length;
    const variance = returns.reduce((sum, r) => sum + Math.pow(r - meanReturn, 2), 0) / (returns.length - 1);
    const stdDev = Math.sqrt(variance);

    return stdDev === 0 ? 0 : meanReturn / stdDev;
  }

  private getEmptyMetrics(): PerformanceMetrics {
    return {
      win_rate: 0,
      profit_factor: 0,
      avg_profit: 0,
      avg_loss: 0,
      max_drawdown: 0,
      sharpe_ratio: 0,
      total_trades: 0,
      profitable_trades: 0,
      total_profit: 0,
      total_loss: 0,
      long_trades: 0,
      short_trades: 0,
      long_pnl: 0,
      short_pnl: 0,
      max_consecutive_wins: 0,
      max_consecutive_losses: 0,
      average_hold_time_days: 0
    };
  }
} 