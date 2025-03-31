import { BaseEntity, BaseRepository } from '../lib/base-repository';

/**
 * Execution quality entity interface
 */
export interface ExecutionQuality extends BaseEntity {
  exchange: string;
  symbol: string;
  slippage_percent?: number;
  execution_speed?: number;
  fill_quality: number;
  period_start: string;
  period_end: string;
  strategy_id?: string;
  metrics: {
    price_slippage?: number;
    slippage_cost?: number;
    fill_rate?: number;
    market_impact?: number;
    execution_cost?: number;
    trades_analyzed: number;
    [key: string]: any;
  };
}

/**
 * Repository implementation for Execution Quality
 */
export class ExecutionQualityRepository extends BaseRepository<ExecutionQuality> {
  constructor() {
    super('execution_quality');
  }

  /**
   * Find execution quality reports by strategy ID
   */
  async findByStrategyId(strategyId: string, limit: number = 10): Promise<ExecutionQuality[]> {
    const { data, error } = await this.client
      .from(this.tableName)
      .select('*')
      .eq('strategy_id', strategyId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      this.handleError(error);
      return [];
    }

    return data as ExecutionQuality[];
  }

  /**
   * Find execution quality reports by exchange
   */
  async findByExchange(exchange: string, limit: number = 20): Promise<ExecutionQuality[]> {
    const { data, error } = await this.client
      .from(this.tableName)
      .select('*')
      .eq('exchange', exchange)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      this.handleError(error);
      return [];
    }

    return data as ExecutionQuality[];
  }

  /**
   * Find execution quality reports by symbol and exchange
   */
  async findBySymbolAndExchange(symbol: string, exchange: string, limit: number = 10): Promise<ExecutionQuality[]> {
    const { data, error } = await this.client
      .from(this.tableName)
      .select('*')
      .eq('symbol', symbol)
      .eq('exchange', exchange)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      this.handleError(error);
      return [];
    }

    return data as ExecutionQuality[];
  }

  /**
   * Get average execution quality by exchange
   */
  async getAverageByExchange(days: number = 30): Promise<any[]> {
    // Calculate date threshold
    const thresholdDate = new Date();
    thresholdDate.setDate(thresholdDate.getDate() - days);
    const threshold = thresholdDate.toISOString();

    // Use raw SQL for this complex aggregation
    const { data, error } = await this.client.rpc('get_avg_execution_quality_by_exchange', {
      days_threshold: threshold
    });

    if (error) {
      this.handleError(error);
      return [];
    }

    return data || [];
  }

  /**
   * Get slippage trend for a symbol and exchange
   */
  async getSlippageTrend(symbol: string, exchange: string, days: number = 30): Promise<any[]> {
    // Calculate date threshold
    const thresholdDate = new Date();
    thresholdDate.setDate(thresholdDate.getDate() - days);
    const threshold = thresholdDate.toISOString();

    const { data, error } = await this.client
      .from(this.tableName)
      .select('created_at, slippage_percent, metrics')
      .eq('symbol', symbol)
      .eq('exchange', exchange)
      .gte('created_at', threshold)
      .order('created_at', { ascending: true });

    if (error) {
      this.handleError(error);
      return [];
    }

    // Format the trend data
    return (data || []).map(item => ({
      date: item.created_at,
      slippage: item.slippage_percent,
      trades_analyzed: item.metrics.trades_analyzed
    }));
  }

  /**
   * Get execution quality summary for dashboard
   */
  async getQualitySummary(days: number = 7): Promise<any> {
    // Calculate date threshold
    const thresholdDate = new Date();
    thresholdDate.setDate(thresholdDate.getDate() - days);
    const threshold = thresholdDate.toISOString();

    // Get recent execution quality reports
    const { data, error } = await this.client
      .from(this.tableName)
      .select('*')
      .gte('created_at', threshold)
      .order('created_at', { ascending: false });

    if (error) {
      this.handleError(error);
      return {
        overall_quality: 0,
        by_exchange: {},
        by_symbol: {},
        report_count: 0
      };
    }

    const reports = data || [];
    
    // If no reports, return empty summary
    if (reports.length === 0) {
      return {
        overall_quality: 0,
        by_exchange: {},
        by_symbol: {},
        report_count: 0
      };
    }

    // Calculate overall quality
    const totalQuality = reports.reduce((sum, report) => sum + report.fill_quality, 0);
    const overallQuality = totalQuality / reports.length;

    // Group by exchange
    const byExchange: Record<string, { count: number, quality: number }> = {};
    reports.forEach(report => {
      if (!byExchange[report.exchange]) {
        byExchange[report.exchange] = { count: 0, quality: 0 };
      }
      byExchange[report.exchange].count++;
      byExchange[report.exchange].quality += report.fill_quality;
    });

    // Calculate average by exchange
    Object.keys(byExchange).forEach(exchange => {
      byExchange[exchange].quality = byExchange[exchange].quality / byExchange[exchange].count;
    });

    // Group by symbol
    const bySymbol: Record<string, { count: number, quality: number }> = {};
    reports.forEach(report => {
      if (!bySymbol[report.symbol]) {
        bySymbol[report.symbol] = { count: 0, quality: 0 };
      }
      bySymbol[report.symbol].count++;
      bySymbol[report.symbol].quality += report.fill_quality;
    });

    // Calculate average by symbol
    Object.keys(bySymbol).forEach(symbol => {
      bySymbol[symbol].quality = bySymbol[symbol].quality / bySymbol[symbol].count;
    });

    return {
      overall_quality: overallQuality,
      by_exchange: byExchange,
      by_symbol: bySymbol,
      report_count: reports.length
    };
  }
}
