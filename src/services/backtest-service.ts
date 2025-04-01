import { supabase } from '../integrations/supabase/client';

// Define Timeframe enum to match database schema
export type Timeframe = '1m' | '5m' | '15m' | '30m' | '1h' | '4h' | '1d' | '1w';

// Define JSON type to match Supabase expectations
export type Json = string | number | boolean | null | { [key: string]: Json } | Json[];

export interface Strategy {
  id: string;
  name: string;
  description?: string;
  strategy_type: string;
  created_at: string;
  is_active: boolean;
}

export interface BacktestConfig {
  startDate: string;
  endDate: string;
  initialCapital: number;
  symbol: string;
  timeframe: string;
  fees: number;
  slippage: number;
  riskPerTrade: number;
}

export interface TradeData {
  id: number;
  timestamp: string;
  type: 'buy' | 'sell';
  entry_price: number;
  exit_price: number;
  size: number;
  profit_loss: number;
  duration_hours: number;
}

export interface BacktestResult {
  id: string;
  strategy_id: string;
  total_trades: number;
  win_rate: number;
  profit_loss: number;
  max_drawdown: number;
  sharpe_ratio: number;
  trade_data: TradeData[];
  equity_curve: number[];
  created_at: string;
  config: BacktestConfig;
}

// Adapted Supabase schema types
export interface BacktestResultRecord {
  id: string;
  strategy_id: string;
  strategy_version: string;
  created_at: string;
  timeframe: Timeframe;
  start_date: string;
  end_date: string;
  market: string;
  initial_capital: number;
  results: Json; 
  metrics: Json;
}

// Type for Supabase trading_strategies table data
interface RawStrategyData {
  id: number | string;
  name?: string;
  description?: string;
  strategy_type?: string;
  created_at?: string;
  is_active?: boolean;
  [key: string]: any; // Allow other properties
}

export class BacktestService {
  /**
   * Get active strategies
   */
  async getActiveStrategies(): Promise<Strategy[]> {
    try {
      const { data, error } = await supabase
        .from('trading_strategies')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false });
        
      if (error) throw error;
      
      // Transform the data to match our Strategy interface
      const strategies: Strategy[] = (data || []).map((item: RawStrategyData) => ({
        id: String(item.id || ''),
        name: item.name || `Strategy ${item.id}`,
        description: item.description || '',
        strategy_type: item.strategy_type || 'unknown',
        created_at: item.created_at || new Date().toISOString(),
        is_active: item.is_active !== false
      }));
      
      return strategies;
    } catch (error: any) {
      console.error('Error fetching strategies:', error);
      throw error;
    }
  }
  
  /**
   * Get a strategy by ID
   */
  async getStrategyById(strategyId: string): Promise<Strategy | null> {
    try {
      // Use string comparison for id if needed
      const { data, error } = await supabase
        .from('trading_strategies')
        .select('*')
        .eq('id', strategyId);
        
      if (error) throw error;
      
      // Handle case when no data is returned
      if (!data || data.length === 0) return null;
      
      // Get first matching strategy
      const rawData = data[0] as RawStrategyData;
      
      return {
        id: String(rawData.id || ''),
        name: rawData.name || `Strategy ${rawData.id}`,
        description: rawData.description || '',
        strategy_type: rawData.strategy_type || 'unknown',
        created_at: rawData.created_at || new Date().toISOString(),
        is_active: rawData.is_active !== false
      };
    } catch (error: any) {
      console.error('Error fetching strategy:', error);
      return null;
    }
  }
  
  /**
   * Run a backtest with the provided strategy and configuration
   */
  async runBacktest(strategy: Strategy, config: BacktestConfig): Promise<BacktestResult> {
    try {
      // In a real implementation, this would call your actual backtesting engine
      // or potentially a third-party service like a cloud function
      
      // For now, generate mock backtest results
      const tradeCount = Math.floor(Math.random() * 100) + 50;
      const winRate = 35 + Math.random() * 35;
      
      // Generate mock trade data
      const tradeData: TradeData[] = Array(20).fill(0).map((_, i) => ({
        id: i,
        timestamp: new Date(new Date(config.startDate).getTime() + i * 86400000 * 3).toISOString(),
        type: Math.random() > 0.5 ? 'buy' : 'sell',
        entry_price: 10000 + Math.random() * 40000,
        exit_price: 10000 + Math.random() * 40000,
        size: Math.random() * 2,
        profit_loss: -10 + Math.random() * 20,
        duration_hours: Math.random() * 48
      }));
      
      // Calculate initial equity curve
      let currentEquity = config.initialCapital;
      const equityCurve = [currentEquity];
      
      // Iterate through trades to build equity curve
      tradeData.forEach(trade => {
        currentEquity = currentEquity * (1 + trade.profit_loss / 100);
        equityCurve.push(currentEquity);
      });
      
      const result: BacktestResult = {
        id: `bt-${Date.now()}`,
        strategy_id: strategy.id,
        total_trades: tradeCount,
        win_rate: winRate,
        profit_loss: -15 + Math.random() * 45,
        max_drawdown: -(5 + Math.random() * 20),
        sharpe_ratio: Math.random() * 3,
        trade_data: tradeData,
        equity_curve: equityCurve,
        created_at: new Date().toISOString(),
        config
      };
      
      // In a production implementation, you'd save the results to the database
      try {
        await this.saveBacktestResult(result);
      } catch (error) {
        // Log but don't fail the backtest if saving fails
        console.error('Failed to save backtest result:', error);
      }
      
      return result;
    } catch (error: any) {
      console.error('Error running backtest:', error);
      throw new Error(error.message || 'Failed to run backtest');
    }
  }
  
  /**
   * Save backtest result to database
   */
  private async saveBacktestResult(result: BacktestResult): Promise<void> {
    try {
      // Convert timeframe string to valid Timeframe type
      let timeframe: Timeframe = '1h';
      switch (result.config.timeframe) {
        case '1m':
        case '5m':
        case '15m':
        case '30m':
        case '1h':
        case '4h':
        case '1d':
        case '1w':
          timeframe = result.config.timeframe as Timeframe;
          break;
        default:
          // Default to 1h if invalid timeframe is provided
          timeframe = '1h';
      }
      
      // Serialize trade data for storage as Json
      const tradeDataJson = result.trade_data.map(trade => ({
        id: trade.id,
        timestamp: trade.timestamp,
        type: trade.type,
        entry_price: trade.entry_price,
        exit_price: trade.exit_price,
        size: trade.size,
        profit_loss: trade.profit_loss,
        duration_hours: trade.duration_hours
      }));
      
      // Transform our result to match the database schema
      const dbRecord = {
        id: result.id,
        strategy_id: result.strategy_id,
        strategy_version: '1.0.0', // Default version
        created_at: result.created_at,
        timeframe,
        start_date: result.config.startDate,
        end_date: result.config.endDate,
        market: result.config.symbol,
        initial_capital: result.config.initialCapital,
        results: JSON.stringify({
          trade_data: tradeDataJson,
          equity_curve: result.equity_curve
        }),
        metrics: JSON.stringify({
          total_trades: result.total_trades,
          win_rate: result.win_rate,
          profit_loss: result.profit_loss,
          max_drawdown: result.max_drawdown,
          sharpe_ratio: result.sharpe_ratio,
          fees: result.config.fees,
          slippage: result.config.slippage,
          risk_per_trade: result.config.riskPerTrade
        })
      };
      
      // Insert the record
      const { error } = await supabase
        .from('strategy_backtests')
        .insert([dbRecord]);
      
      if (error) {
        console.error('Database error saving backtest result:', error);
      }
    } catch (error) {
      console.error('Error saving backtest result:', error);
      // Don't throw here to allow operation to continue
    }
  }
} 