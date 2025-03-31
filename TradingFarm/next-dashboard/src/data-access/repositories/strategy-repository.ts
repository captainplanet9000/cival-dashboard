import { BaseEntity, BaseRepository } from '../lib/base-repository';

/**
 * Strategy entity interface
 */
export interface Strategy extends BaseEntity {
  name: string;
  description?: string;
  strategy_type: string;
  parameters: object;
  is_active: boolean;
  performance_metrics: {
    win_rate?: number;
    profit_factor?: number;
    sharpe_ratio?: number;
    max_drawdown?: number;
    [key: string]: any;
  };
  source_code?: string;
  backtest_results: object;
  content?: string; // Legacy field from existing structure
}

/**
 * Repository implementation for Trading Strategies
 */
export class StrategyRepository extends BaseRepository<Strategy> {
  constructor() {
    super('trading_strategies');
  }

  /**
   * Find strategies by type
   */
  async findByType(strategyType: string): Promise<Strategy[]> {
    const { data, error } = await this.client
      .from(this.tableName)
      .select('*')
      .eq('strategy_type', strategyType);

    if (error) {
      this.handleError(error);
      return [];
    }

    return data as Strategy[];
  }

  /**
   * Find active strategies
   */
  async findActive(): Promise<Strategy[]> {
    const { data, error } = await this.client
      .from(this.tableName)
      .select('*')
      .eq('is_active', true);

    if (error) {
      this.handleError(error);
      return [];
    }

    return data as Strategy[];
  }

  /**
   * Find strategies used by a farm
   */
  async findByFarmId(farmId: number): Promise<any[]> {
    const { data, error } = await this.client
      .from('farm_strategies')
      .select(`
        *,
        strategy:trading_strategies(*)
      `)
      .eq('farm_id', farmId);

    if (error) {
      this.handleError(error);
      return [];
    }

    return data || [];
  }

  /**
   * Update strategy backtest results
   */
  async updateBacktestResults(id: number, results: object): Promise<boolean> {
    const { error } = await this.client
      .from(this.tableName)
      .update({ 
        backtest_results: results,
        updated_at: new Date().toISOString()
      })
      .eq('id', id);

    if (error) {
      this.handleError(error);
      return false;
    }

    return true;
  }

  /**
   * Update strategy performance metrics
   */
  async updatePerformanceMetrics(id: number, metrics: Strategy['performance_metrics']): Promise<boolean> {
    const { error } = await this.client
      .from(this.tableName)
      .update({ 
        performance_metrics: metrics,
        updated_at: new Date().toISOString()
      })
      .eq('id', id);

    if (error) {
      this.handleError(error);
      return false;
    }

    return true;
  }

  /**
   * Add a strategy to a farm
   */
  async addToFarm(strategyId: number, farmId: number, weight: number = 1.0, parameters: object = {}): Promise<boolean> {
    const { error } = await this.client
      .from('farm_strategies')
      .insert({
        farm_id: farmId,
        strategy_id: strategyId,
        weight,
        parameters,
        is_active: true
      });

    if (error) {
      this.handleError(error);
      return false;
    }

    return true;
  }

  /**
   * Remove a strategy from a farm
   */
  async removeFromFarm(strategyId: number, farmId: number): Promise<boolean> {
    const { error } = await this.client
      .from('farm_strategies')
      .delete()
      .eq('farm_id', farmId)
      .eq('strategy_id', strategyId);

    if (error) {
      this.handleError(error);
      return false;
    }

    return true;
  }
}
