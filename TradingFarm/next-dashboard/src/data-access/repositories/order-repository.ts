import { BaseRepository, QueryOptions } from '../../lib/base-repository';
import { Order } from '../models/order';

/**
 * Extended query options specifically for orders
 */
export interface OrderQueryOptions extends QueryOptions {
  farmId?: number;
  agentId?: number;
  symbol?: string;
  exchange?: string;
  status?: Order['status'] | Order['status'][];
  side?: 'buy' | 'sell';
  orderType?: Order['order_type'];
  fromDate?: string;
  toDate?: string;
  includeAgent?: boolean;
  includeTrades?: boolean;
}

/**
 * Repository implementation for Order entities
 */
export class OrderRepository extends BaseRepository<Order> {
  constructor() {
    super('orders');
  }

  /**
   * Find orders by farm ID
   */
  async findByFarmId(farmId: number, options: OrderQueryOptions = {}): Promise<Order[]> {
    let query = this.client
      .from(this.tableName)
      .select('*')
      .eq('farm_id', farmId);
    
    // Apply additional filters
    this.applyOrderFilters(query, options);
    
    const { data, error } = await query;
    
    if (error) {
      this.handleError(error);
      return [];
    }
    
    return data as Order[];
  }

  /**
   * Find orders by agent ID
   */
  async findByAgentId(agentId: number, options: OrderQueryOptions = {}): Promise<Order[]> {
    let query = this.client
      .from(this.tableName)
      .select('*')
      .eq('agent_id', agentId);
    
    // Apply additional filters
    this.applyOrderFilters(query, options);
    
    const { data, error } = await query;
    
    if (error) {
      this.handleError(error);
      return [];
    }
    
    return data as Order[];
  }

  /**
   * Find an order by external ID (exchange order ID)
   */
  async findByExternalId(externalId: string, exchange: string): Promise<Order | null> {
    const { data, error } = await this.client
      .from(this.tableName)
      .select('*')
      .eq('external_id', externalId)
      .eq('exchange', exchange)
      .single();
    
    if (error) {
      this.handleError(error);
      return null;
    }
    
    return data as Order;
  }

  /**
   * Find an order by ID with optional related data
   */
  async findByIdWithRelations(id: number, options: OrderQueryOptions = {}): Promise<Order | null> {
    const order = await this.findById(id);
    
    if (!order) {
      return null;
    }

    const enrichedOrder: any = { ...order };

    // Load agent if requested
    if (options.includeAgent && order.agent_id) {
      const { data: agent } = await this.client
        .from('agents')
        .select('*')
        .eq('id', order.agent_id)
        .single();
      
      enrichedOrder.agent = agent;
    }

    // Load trades if requested
    if (options.includeTrades) {
      const { data: trades } = await this.client
        .from('trades')
        .select('*')
        .eq('order_id', id)
        .order('executed_at', { ascending: false });
      
      enrichedOrder.trades = trades || [];
    }

    return enrichedOrder as Order;
  }

  /**
   * Update order status
   */
  async updateStatus(id: number, status: Order['status'], filledData?: {
    filled_quantity?: number;
    average_filled_price?: number;
  }): Promise<boolean> {
    const updateData: Partial<Order> = {
      status,
      updated_at: new Date().toISOString()
    };

    // Add additional filled data if provided
    if (filledData) {
      Object.assign(updateData, filledData);
    }

    const { error } = await this.client
      .from(this.tableName)
      .update(updateData)
      .eq('id', id);

    if (error) {
      this.handleError(error);
      return false;
    }

    return true;
  }

  /**
   * Find active orders (open or partially filled)
   */
  async findActiveOrders(options: OrderQueryOptions = {}): Promise<Order[]> {
    let query = this.client
      .from(this.tableName)
      .select('*')
      .in('status', ['new', 'open', 'partially_filled']);
    
    // Apply additional filters
    this.applyOrderFilters(query, options);
    
    const { data, error } = await query;
    
    if (error) {
      this.handleError(error);
      return [];
    }
    
    return data as Order[];
  }

  /**
   * Find filled orders within a date range
   */
  async findFilledOrders(options: OrderQueryOptions = {}): Promise<Order[]> {
    let query = this.client
      .from(this.tableName)
      .select('*')
      .eq('status', 'filled');
    
    // Apply additional filters
    this.applyOrderFilters(query, options);
    
    const { data, error } = await query;
    
    if (error) {
      this.handleError(error);
      return [];
    }
    
    return data as Order[];
  }

  /**
   * Apply common order filters to a query
   */
  private applyOrderFilters(query: any, options: OrderQueryOptions): any {
    if (options.farmId) {
      query = query.eq('farm_id', options.farmId);
    }
    
    if (options.agentId) {
      query = query.eq('agent_id', options.agentId);
    }
    
    if (options.symbol) {
      query = query.eq('symbol', options.symbol);
    }
    
    if (options.exchange) {
      query = query.eq('exchange', options.exchange);
    }
    
    if (options.status) {
      if (Array.isArray(options.status)) {
        query = query.in('status', options.status);
      } else {
        query = query.eq('status', options.status);
      }
    }
    
    if (options.side) {
      query = query.eq('side', options.side);
    }
    
    if (options.orderType) {
      query = query.eq('order_type', options.orderType);
    }
    
    if (options.fromDate) {
      query = query.gte('created_at', options.fromDate);
    }
    
    if (options.toDate) {
      query = query.lte('created_at', options.toDate);
    }
    
    // Apply standard query options
    if (options.orderBy) {
      query = query.order(options.orderBy, { ascending: options.orderDirection !== 'desc' });
    } else {
      query = query.order('created_at', { ascending: false });
    }
    
    if (options.limit) {
      query = query.limit(options.limit);
    }
    
    if (options.offset) {
      query = query.range(options.offset, options.offset + (options.limit || 10) - 1);
    }
    
    return query;
  }

  /**
   * Get order statistics by symbol
   */
  async getOrderStatsBySymbol(farmId: number): Promise<any[]> {
    const { data, error } = await this.client.rpc(
      'get_order_stats_by_symbol',
      { p_farm_id: farmId }
    );
    
    if (error) {
      this.handleError(error);
      return [];
    }
    
    return data || [];
  }
} 