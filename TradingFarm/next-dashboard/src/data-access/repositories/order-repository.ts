import { BaseEntity, BaseRepository } from '../lib/base-repository';

/**
 * Order entity interface
 */
export interface Order extends BaseEntity {
  farm_id: number;
  agent_id?: number;
  exchange: string;
  symbol: string;
  order_type: 'market' | 'limit' | 'stop' | 'stop_limit' | 'trailing_stop';
  side: 'buy' | 'sell';
  quantity: number;
  price?: number;
  stop_price?: number;
  time_in_force?: 'gtc' | 'ioc' | 'fok';
  status: 'new' | 'open' | 'filled' | 'partial_fill' | 'canceled' | 'rejected' | 'expired';
  filled_quantity: number;
  filled_price?: number;
  external_id?: string;
  external_status?: string;
  metadata: {
    strategy_id?: number;
    reason?: string;
    [key: string]: any;
  };
  closed_at?: string;
}

/**
 * Trade entity interface
 */
export interface Trade extends BaseEntity {
  order_id: number;
  external_id?: string;
  symbol: string;
  exchange: string;
  side: 'buy' | 'sell';
  quantity: number;
  price: number;
  fee?: number;
  fee_currency?: string;
  executed_at: string;
  metadata: {
    taker?: boolean;
    [key: string]: any;
  };
}

/**
 * Repository implementation for Orders
 */
export class OrderRepository extends BaseRepository<Order> {
  constructor() {
    super('orders');
  }

  /**
   * Find orders by farm ID
   */
  async findByFarmId(farmId: number, limit: number = 50): Promise<Order[]> {
    const { data, error } = await this.client
      .from(this.tableName)
      .select('*')
      .eq('farm_id', farmId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      this.handleError(error);
      return [];
    }

    return data as Order[];
  }

  /**
   * Find orders by agent ID
   */
  async findByAgentId(agentId: number, limit: number = 50): Promise<Order[]> {
    const { data, error } = await this.client
      .from(this.tableName)
      .select('*')
      .eq('agent_id', agentId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      this.handleError(error);
      return [];
    }

    return data as Order[];
  }

  /**
   * Find order by ID with trades
   */
  async findByIdWithTrades(id: number): Promise<any> {
    const order = await this.findById(id);
    
    if (!order) {
      return null;
    }

    // Get trades for this order
    const { data: trades, error } = await this.client
      .from('trades')
      .select('*')
      .eq('order_id', id)
      .order('executed_at', { ascending: true });

    if (error) {
      this.handleError(error);
      return order;
    }

    return {
      ...order,
      trades: trades || []
    };
  }

  /**
   * Find open orders for a farm
   */
  async findOpenOrders(farmId?: number, agentId?: number): Promise<Order[]> {
    let query = this.client
      .from(this.tableName)
      .select('*')
      .in('status', ['new', 'open', 'partial_fill']);
      
    if (farmId) {
      query = query.eq('farm_id', farmId);
    }
    
    if (agentId) {
      query = query.eq('agent_id', agentId);
    }
    
    const { data, error } = await query.order('created_at', { ascending: false });

    if (error) {
      this.handleError(error);
      return [];
    }

    return data as Order[];
  }

  /**
   * Update order status
   */
  async updateOrderStatus(id: number, status: Order['status'], filledData?: { 
    filled_quantity?: number; 
    filled_price?: number; 
    external_status?: string;
  }): Promise<boolean> {
    const updateData: any = { 
      status,
      updated_at: new Date().toISOString()
    };
    
    // Add filled data if provided
    if (filledData) {
      Object.assign(updateData, filledData);
      
      // If order is now closed, add closing timestamp
      if (['filled', 'canceled', 'rejected', 'expired'].includes(status)) {
        updateData.closed_at = new Date().toISOString();
      }
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
   * Create a new trade for an order
   */
  async createTrade(
    orderId: number,
    quantity: number,
    price: number,
    side: Trade['side'],
    exchange: string,
    symbol: string,
    executedAt: string = new Date().toISOString(),
    metadata: object = {}
  ): Promise<Trade | null> {
    const tradeData: Omit<Trade, 'id' | 'created_at' | 'updated_at'> = {
      order_id: orderId,
      symbol,
      exchange,
      side,
      quantity,
      price,
      executed_at: executedAt,
      metadata
    };

    try {
      const { data, error } = await this.client
        .from('trades')
        .insert(tradeData)
        .select()
        .single();

      if (error) {
        this.handleError(error);
        return null;
      }

      // Update order's filled quantity and status
      await this.updateOrderFill(orderId);

      return data as Trade;
    } catch (error) {
      this.handleError(error);
      return null;
    }
  }

  /**
   * Update order fill based on trades
   * This calculates the total filled quantity and updates order status
   */
  private async updateOrderFill(orderId: number): Promise<void> {
    try {
      // Get all trades for the order
      const { data: trades, error } = await this.client
        .from('trades')
        .select('quantity, price')
        .eq('order_id', orderId);
        
      if (error) {
        throw error;
      }
      
      // Get the order
      const order = await this.findById(orderId);
      if (!order) {
        throw new Error(`Order ${orderId} not found`);
      }
      
      // Calculate total filled quantity and average price
      const filledQuantity = trades.reduce((sum, trade) => sum + trade.quantity, 0);
      
      let status: Order['status'] = order.status;
      let filledPrice: number | undefined;
      
      // Calculate weighted average price if we have trades
      if (trades.length > 0) {
        const totalValue = trades.reduce((sum, trade) => sum + (trade.quantity * trade.price), 0);
        filledPrice = totalValue / filledQuantity;
      }
      
      // Determine new status based on filled quantity
      if (filledQuantity >= order.quantity) {
        status = 'filled';
      } else if (filledQuantity > 0) {
        status = 'partial_fill';
      }
      
      // Update the order
      await this.updateOrderStatus(orderId, status, {
        filled_quantity: filledQuantity,
        filled_price: filledPrice
      });
    } catch (error) {
      this.handleError(error);
    }
  }

  /**
   * Get order fill rate for a farm
   */
  async getFarmOrderFillRate(farmId: number): Promise<{ rate: number; total: number; filled: number }> {
    try {
      // Get all closed orders for the farm
      const { data, error } = await this.client
        .from(this.tableName)
        .select('*')
        .eq('farm_id', farmId)
        .in('status', ['filled', 'canceled', 'rejected', 'expired']);
        
      if (error) {
        throw error;
      }
      
      // Calculate filled vs total
      const orders = data as Order[];
      const totalOrders = orders.length;
      const filledOrders = orders.filter(order => order.status === 'filled').length;
      
      return {
        rate: totalOrders > 0 ? filledOrders / totalOrders : 0,
        total: totalOrders,
        filled: filledOrders
      };
    } catch (error) {
      this.handleError(error);
      return { rate: 0, total: 0, filled: 0 };
    }
  }
}
