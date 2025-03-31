import { BaseRepository, QueryOptions } from '../../lib/base-repository';
import { Trade } from '../models/trade';

/**
 * Extended query options specifically for trades
 */
export interface TradeQueryOptions extends QueryOptions {
  farmId?: number;
  agentId?: number;
  orderId?: number;
  symbol?: string;
  exchange?: string;
  side?: 'buy' | 'sell';
  fromDate?: string;
  toDate?: string;
  profitable?: boolean;
  includeOrder?: boolean;
  includeAgent?: boolean;
}

/**
 * Repository implementation for Trade entities
 */
export class TradeRepository extends BaseRepository<Trade> {
  constructor() {
    super('trades');
  }

  /**
   * Find trades by farm ID
   */
  async findByFarmId(farmId: number, options: TradeQueryOptions = {}): Promise<Trade[]> {
    let query = this.client
      .from(this.tableName)
      .select('*')
      .eq('farm_id', farmId);
    
    // Apply additional filters
    this.applyTradeFilters(query, options);
    
    const { data, error } = await query;
    
    if (error) {
      this.handleError(error);
      return [];
    }
    
    return data as Trade[];
  }

  /**
   * Find trades by agent ID
   */
  async findByAgentId(agentId: number, options: TradeQueryOptions = {}): Promise<Trade[]> {
    let query = this.client
      .from(this.tableName)
      .select('*')
      .eq('agent_id', agentId);
    
    // Apply additional filters
    this.applyTradeFilters(query, options);
    
    const { data, error } = await query;
    
    if (error) {
      this.handleError(error);
      return [];
    }
    
    return data as Trade[];
  }

  /**
   * Find trades by order ID
   */
  async findByOrderId(orderId: number): Promise<Trade[]> {
    const { data, error } = await this.client
      .from(this.tableName)
      .select('*')
      .eq('order_id', orderId)
      .order('executed_at', { ascending: false });
    
    if (error) {
      this.handleError(error);
      return [];
    }
    
    return data as Trade[];
  }

  /**
   * Find a trade by ID with optional related data
   */
  async findByIdWithRelations(id: number, options: TradeQueryOptions = {}): Promise<Trade | null> {
    const trade = await this.findById(id);
    
    if (!trade) {
      return null;
    }

    const enrichedTrade: any = { ...trade };

    // Load order if requested
    if (options.includeOrder) {
      const { data: order } = await this.client
        .from('orders')
        .select('*')
        .eq('id', trade.order_id)
        .single();
      
      enrichedTrade.order = order;
    }

    // Load agent if requested
    if (options.includeAgent && trade.agent_id) {
      const { data: agent } = await this.client
        .from('agents')
        .select('*')
        .eq('id', trade.agent_id)
        .single();
      
      enrichedTrade.agent = agent;
    }

    return enrichedTrade as Trade;
  }

  /**
   * Get trade statistics for a farm
   */
  async getFarmTradeStats(farmId: number, period?: 'day' | 'week' | 'month' | 'year'): Promise<any> {
    const { data, error } = await this.client.rpc('get_farm_trade_stats', {
      p_farm_id: farmId,
      p_period: period || 'month'
    });
    
    if (error) {
      this.handleError(error);
      return {
        total_trades: 0,
        win_count: 0,
        loss_count: 0,
        win_rate: 0,
        total_profit_loss: 0,
        average_profit: 0,
        average_loss: 0,
        profit_factor: 0
      };
    }
    
    return data;
  }

  /**
   * Get trade statistics for an agent
   */
  async getAgentTradeStats(agentId: number, period?: 'day' | 'week' | 'month' | 'year'): Promise<any> {
    const { data, error } = await this.client.rpc('get_agent_trade_stats', {
      p_agent_id: agentId,
      p_period: period || 'month'
    });
    
    if (error) {
      this.handleError(error);
      return {
        total_trades: 0,
        win_count: 0,
        loss_count: 0,
        win_rate: 0,
        total_profit_loss: 0,
        average_profit: 0,
        average_loss: 0,
        profit_factor: 0
      };
    }
    
    return data;
  }

  /**
   * Get trade performance by symbol
   */
  async getTradePerformanceBySymbol(farmId: number, period?: 'day' | 'week' | 'month' | 'year'): Promise<any[]> {
    const { data, error } = await this.client.rpc('get_trade_performance_by_symbol', {
      p_farm_id: farmId,
      p_period: period || 'month'
    });
    
    if (error) {
      this.handleError(error);
      return [];
    }
    
    return data || [];
  }

  /**
   * Get daily profit/loss for a specific time range
   */
  async getDailyProfitLoss(
    farmId: number, 
    fromDate: string, 
    toDate: string, 
    agentId?: number
  ): Promise<any[]> {
    let params: any = {
      p_farm_id: farmId,
      p_from_date: fromDate,
      p_to_date: toDate
    };
    
    if (agentId) {
      params.p_agent_id = agentId;
    }
    
    const { data, error } = await this.client.rpc('get_daily_profit_loss', params);
    
    if (error) {
      this.handleError(error);
      return [];
    }
    
    return data || [];
  }

  /**
   * Apply common trade filters to a query
   */
  private applyTradeFilters(query: any, options: TradeQueryOptions): any {
    if (options.farmId) {
      query = query.eq('farm_id', options.farmId);
    }
    
    if (options.agentId) {
      query = query.eq('agent_id', options.agentId);
    }
    
    if (options.orderId) {
      query = query.eq('order_id', options.orderId);
    }
    
    if (options.symbol) {
      query = query.eq('symbol', options.symbol);
    }
    
    if (options.exchange) {
      query = query.eq('exchange', options.exchange);
    }
    
    if (options.side) {
      query = query.eq('side', options.side);
    }
    
    if (options.fromDate) {
      query = query.gte('executed_at', options.fromDate);
    }
    
    if (options.toDate) {
      query = query.lte('executed_at', options.toDate);
    }
    
    if (options.profitable !== undefined) {
      if (options.profitable) {
        query = query.gt('profit_loss', 0);
      } else {
        query = query.lte('profit_loss', 0);
      }
    }
    
    // Apply standard query options
    if (options.orderBy) {
      query = query.order(options.orderBy, { ascending: options.orderDirection !== 'desc' });
    } else {
      query = query.order('executed_at', { ascending: false });
    }
    
    if (options.limit) {
      query = query.limit(options.limit);
    }
    
    if (options.offset) {
      query = query.range(options.offset, options.offset + (options.limit || 10) - 1);
    }
    
    return query;
  }
} 