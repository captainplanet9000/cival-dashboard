import { BaseEntity, BaseRepository } from '../lib/base-repository';

/**
 * Backtest result entity interface
 */
export interface BacktestResult extends BaseEntity {
  strategy_id: string;
  symbol: string;
  timeframe: string;
  start_date: string;
  end_date: string;
  initial_capital: number;
  final_capital: number;
  max_drawdown: number;
  win_rate: number;
  profit_factor: number;
  total_trades: number;
  sharpe_ratio: number;
  results: {
    equity_curve?: number[];
    trades?: any[];
    drawdowns?: any[];
    monthly_returns?: any;
    [key: string]: any;
  };
}

/**
 * Repository implementation for Backtest Results
 */
export class BacktestRepository extends BaseRepository<BacktestResult> {
  constructor() {
    super('backtest_results');
  }

  /**
   * Find backtest results by strategy ID
   */
  async findByStrategyId(strategyId: string): Promise<BacktestResult[]> {
    const { data, error } = await this.client
      .from(this.tableName)
      .select('*')
      .eq('strategy_id', strategyId)
      .order('created_at', { ascending: false });

    if (error) {
      this.handleError(error);
      return [];
    }

    return data as BacktestResult[];
  }

  /**
   * Find latest backtest result for a strategy
   */
  async findLatestForStrategy(strategyId: string): Promise<BacktestResult | null> {
    const { data, error } = await this.client
      .from(this.tableName)
      .select('*')
      .eq('strategy_id', strategyId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (error) {
      // If no results found, this isn't an error
      if (error.code === 'PGRST116') {
        return null;
      }
      this.handleError(error);
      return null;
    }

    return data as BacktestResult;
  }

  /**
   * Find backtest results by symbol
   */
  async findBySymbol(symbol: string, limit: number = 20): Promise<BacktestResult[]> {
    const { data, error } = await this.client
      .from(this.tableName)
      .select('*')
      .eq('symbol', symbol)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      this.handleError(error);
      return [];
    }

    return data as BacktestResult[];
  }

  /**
   * Find backtest results within a date range
   */
  async findByDateRange(startDate: string, endDate: string): Promise<BacktestResult[]> {
    const { data, error } = await this.client
      .from(this.tableName)
      .select('*')
      .gte('created_at', startDate)
      .lte('created_at', endDate)
      .order('created_at', { ascending: false });

    if (error) {
      this.handleError(error);
      return [];
    }

    return data as BacktestResult[];
  }

  /**
   * Update strategy performance based on backtest results
   */
  async updateStrategyPerformance(strategyId: string, backtestResult: BacktestResult): Promise<boolean> {
    // Calculate performance metrics
    const performanceMetrics = {
      win_rate: backtestResult.win_rate,
      profit_factor: backtestResult.profit_factor,
      sharpe_ratio: backtestResult.sharpe_ratio,
      max_drawdown: backtestResult.max_drawdown,
      total_trades: backtestResult.total_trades,
      return_pct: ((backtestResult.final_capital - backtestResult.initial_capital) / backtestResult.initial_capital) * 100,
      updated_at: new Date().toISOString()
    };

    // Update the strategy
    const { error } = await this.client
      .from('strategies')
      .update({ 
        performance_metrics: performanceMetrics,
        updated_at: new Date().toISOString()
      })
      .eq('id', strategyId);

    if (error) {
      this.handleError(error);
      return false;
    }

    return true;
  }
}
