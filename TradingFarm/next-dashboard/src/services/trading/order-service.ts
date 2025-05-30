import { Order, OrderSide, OrderStatus, OrderType, Position } from '@/types/trading.types';
import { createServerClient } from '@/utils/supabase/server';
import { pusherServer } from '@/lib/pusher';
import { v4 as uuidv4 } from 'uuid';

/**
 * Configuration for the order service
 */
export interface OrderServiceConfig {
  defaultExchange: string;
  paperTrading: boolean;
  positionSizingDefaults: {
    defaultRiskPercent: number;
    maxPositionSizePercent: number;
    defaultLeverage: number;
  };
  defaultFees: {
    makerFee: number;
    takerFee: number;
  };
}

/**
 * Order creation parameters
 */
export interface CreateOrderParams {
  symbol: string;
  side: OrderSide;
  type: OrderType;
  quantity: number;
  price?: number;
  stopPrice?: number;
  exchange?: string;
  strategyId?: string;
  userId: string;
  clientOrderId?: string;
  metadata?: Record<string, any>;
}

/**
 * Service responsible for managing and executing orders
 */
export class OrderService {
  private config: OrderServiceConfig;
  private accountBalance: number = 10000; // Default paper trading balance
  
  constructor(config: OrderServiceConfig) {
    this.config = config;
  }
  
  /**
   * Create and submit a new order
   */
  async createOrder(params: CreateOrderParams): Promise<Order> {
    // Generate unique IDs
    const id = uuidv4();
    const clientOrderId = params.clientOrderId || `order_${Date.now()}_${id.substring(0, 8)}`;
    
    // Default to configured exchange if not specified
    const exchange = params.exchange || this.config.defaultExchange;
    
    // Create the order object
    const order: Order = {
      id,
      exchangeId: params.metadata?.exchangeOrderId,
      symbol: params.symbol,
      exchange,
      side: params.side,
      type: params.type,
      status: 'new',
      price: params.price,
      stopPrice: params.stopPrice,
      quantity: params.quantity,
      filledQuantity: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      clientOrderId,
      strategyId: params.strategyId,
      userId: params.userId,
      metadata: params.metadata,
    };
    
    try {
      // For paper trading, simulate order execution
      if (this.config.paperTrading) {
        // Calculate position size if quantity is 0 (automatic sizing)
        if (order.quantity === 0) {
          order.quantity = await this.calculatePositionSize(
            params.userId,
            params.symbol,
            params.side,
            params.price || 0,
            params.metadata?.stopLoss
          );
        }
        
        // Simulate immediate execution for market orders
        if (order.type === 'market') {
          order.status = 'filled';
          order.filledQuantity = order.quantity;
          order.avgFillPrice = order.price; // In real trading, would be the actual fill price
          
          // Create a position from the filled order
          await this.updatePositionFromOrder(order);
        } else {
          // For limit/stop orders, just save them as open orders
          order.status = 'open';
        }
      } else {
        // For real trading, would submit to the exchange API here
        // This is just a placeholder
        console.log(`[REAL TRADING] Submitting order to exchange: ${JSON.stringify(order)}`);
        
        // Set status to open until we get confirmation from the exchange
        order.status = 'new';
      }
      
      // Save the order to the database
      await this.saveOrderToDatabase(order);
      
      // Notify order creation via WebSocket
      await this.notifyOrderUpdate(order, 'created');
      
      return order;
    } catch (error) {
      console.error('Error creating order:', error);
      
      // Update order status to rejected
      order.status = 'rejected';
      order.metadata = {
        ...order.metadata,
        rejectionReason: error.message || 'Unknown error'
      };
      
      // Save the rejected order to the database
      await this.saveOrderToDatabase(order);
      
      // Notify order rejection via WebSocket
      await this.notifyOrderUpdate(order, 'rejected');
      
      throw error;
    }
  }
  
  /**
   * Cancel an existing order
   */
  async cancelOrder(orderId: string, userId: string): Promise<Order | null> {
    try {
      // Get the order from the database
      const supabase = createServerClient();
      const { data: order, error } = await supabase
        .from('elizaos_orders')
        .select('*')
        .eq('id', orderId)
        .eq('user_id', userId)
        .single();
      
      if (error || !order) {
        console.error('Error fetching order:', error);
        return null;
      }
      
      // Convert from database format to Order type
      const orderObj: Order = {
        id: order.id,
        exchangeId: order.exchange_id,
        symbol: order.symbol,
        exchange: order.exchange,
        side: order.side,
        type: order.type,
        status: order.status,
        price: order.price,
        stopPrice: order.stop_price,
        quantity: order.quantity,
        filledQuantity: order.filled_quantity,
        avgFillPrice: order.avg_fill_price,
        createdAt: order.created_at,
        updatedAt: order.updated_at,
        clientOrderId: order.client_order_id,
        strategyId: order.strategy_id,
        userId: order.user_id,
        metadata: order.metadata,
      };
      
      // Check if the order can be canceled
      if (orderObj.status !== 'open' && orderObj.status !== 'partially_filled') {
        throw new Error(`Cannot cancel order with status ${orderObj.status}`);
      }
      
      // For paper trading, just update the status
      if (this.config.paperTrading) {
        orderObj.status = 'canceled';
        orderObj.updatedAt = new Date().toISOString();
      } else {
        // For real trading, would submit to the exchange API here
        console.log(`[REAL TRADING] Canceling order on exchange: ${orderId}`);
        
        // Update status
        orderObj.status = 'canceled';
        orderObj.updatedAt = new Date().toISOString();
      }
      
      // Update the order in the database
      await this.updateOrderInDatabase(orderObj);
      
      // Notify order cancellation via WebSocket
      await this.notifyOrderUpdate(orderObj, 'canceled');
      
      return orderObj;
    } catch (error) {
      console.error('Error canceling order:', error);
      throw error;
    }
  }
  
  /**
   * Get orders by user ID and optional filters
   */
  async getOrders(
    userId: string, 
    filters?: { 
      symbol?: string; 
      status?: OrderStatus;
      strategyId?: string;
      limit?: number;
      offset?: number;
    }
  ): Promise<Order[]> {
    try {
      const supabase = createServerClient();
      
      // Start building the query
      let query = supabase
        .from('elizaos_orders')
        .select('*')
        .eq('user_id', userId);
      
      // Apply filters
      if (filters?.symbol) {
        query = query.eq('symbol', filters.symbol);
      }
      
      if (filters?.status) {
        query = query.eq('status', filters.status);
      }
      
      if (filters?.strategyId) {
        query = query.eq('strategy_id', filters.strategyId);
      }
      
      // Apply pagination
      if (filters?.limit) {
        query = query.limit(filters.limit);
      }
      
      if (filters?.offset) {
        query = query.offset(filters.offset);
      }
      
      // Order by created_at descending (most recent first)
      query = query.order('created_at', { ascending: false });
      
      // Execute the query
      const { data, error } = await query;
      
      if (error) {
        console.error('Error fetching orders:', error);
        return [];
      }
      
      // Convert from database format to Order type
      return data.map(order => ({
        id: order.id,
        exchangeId: order.exchange_id,
        symbol: order.symbol,
        exchange: order.exchange,
        side: order.side,
        type: order.type,
        status: order.status,
        price: order.price,
        stopPrice: order.stop_price,
        quantity: order.quantity,
        filledQuantity: order.filled_quantity,
        avgFillPrice: order.avg_fill_price,
        createdAt: order.created_at,
        updatedAt: order.updated_at,
        clientOrderId: order.client_order_id,
        strategyId: order.strategy_id,
        userId: order.user_id,
        metadata: order.metadata,
      }));
    } catch (error) {
      console.error('Error fetching orders:', error);
      return [];
    }
  }
  
  /**
   * Get positions by user ID and optional filters
   */
  async getPositions(
    userId: string,
    filters?: {
      symbol?: string;
      exchange?: string;
      strategyId?: string;
    }
  ): Promise<Position[]> {
    try {
      const supabase = createServerClient();
      
      // Start building the query
      let query = supabase
        .from('elizaos_positions')
        .select('*')
        .eq('user_id', userId);
      
      // Apply filters
      if (filters?.symbol) {
        query = query.eq('symbol', filters.symbol);
      }
      
      if (filters?.exchange) {
        query = query.eq('exchange', filters.exchange);
      }
      
      if (filters?.strategyId) {
        query = query.eq('strategy_id', filters.strategyId);
      }
      
      // Execute the query
      const { data, error } = await query;
      
      if (error) {
        console.error('Error fetching positions:', error);
        return [];
      }
      
      // Convert from database format to Position type
      return data.map(position => ({
        id: position.id,
        symbol: position.symbol,
        exchange: position.exchange,
        side: position.side,
        quantity: position.quantity,
        entryPrice: position.entry_price,
        markPrice: position.mark_price,
        liquidationPrice: position.liquidation_price,
        leverage: position.leverage,
        unrealizedPnl: position.unrealized_pnl,
        unrealizedPnlPercent: position.unrealized_pnl_percent,
        initialMargin: position.initial_margin,
        openTime: position.open_time,
        updateTime: position.update_time,
        stopLoss: position.stop_loss,
        takeProfit: position.take_profit,
        strategyId: position.strategy_id,
        userId: position.user_id,
        metadata: position.metadata,
      }));
    } catch (error) {
      console.error('Error fetching positions:', error);
      return [];
    }
  }
  
  /**
   * Calculate position size based on risk parameters
   */
  private async calculatePositionSize(
    userId: string,
    symbol: string,
    side: OrderSide,
    price: number,
    stopLoss?: number
  ): Promise<number> {
    // Get account balance
    const balance = await this.getAccountBalance(userId);
    
    // Default risk parameters
    const riskPercent = this.config.positionSizingDefaults.defaultRiskPercent / 100;
    const maxPositionSizePercent = this.config.positionSizingDefaults.maxPositionSizePercent / 100;
    
    // Calculate maximum position size
    const maxPositionSize = balance * maxPositionSizePercent;
    
    // If no stop loss is provided, use a default percentage-based risk
    if (!stopLoss || stopLoss === 0) {
      // Default to risk-based sizing
      return maxPositionSize;
    }
    
    // Calculate risk per trade
    const riskAmount = balance * riskPercent;
    
    // Calculate risk per unit
    const riskPerUnit = Math.abs(price - stopLoss);
    
    if (riskPerUnit === 0) {
      return maxPositionSize;
    }
    
    // Calculate position size based on risk
    const positionValue = riskAmount / riskPerUnit * price;
    
    // Convert position value to quantity
    const quantity = positionValue / price;
    
    // Return the smaller of the two position sizes
    return Math.min(quantity, maxPositionSize / price);
  }
  
  /**
   * Get account balance for a user
   */
  private async getAccountBalance(userId: string): Promise<number> {
    if (this.config.paperTrading) {
      // For paper trading, use the default balance
      // In a real implementation, would fetch from database
      return this.accountBalance;
    } else {
      // For real trading, would fetch from exchange API
      console.log(`[REAL TRADING] Fetching balance for user: ${userId}`);
      
      // Placeholder - in real implementation, would fetch actual balance
      return 10000;
    }
  }
  
  /**
   * Update position from a filled order
   */
  private async updatePositionFromOrder(order: Order): Promise<Position | null> {
    try {
      // Check if we already have a position for this symbol
      const positions = await this.getPositions(order.userId, {
        symbol: order.symbol,
        exchange: order.exchange
      });
      
      // Convert order side to position side
      const positionSide = order.side === 'buy' ? 'long' : 'short';
      
      if (positions.length === 0) {
        // No existing position, create a new one
        const position: Position = {
          id: uuidv4(),
          symbol: order.symbol,
          exchange: order.exchange,
          side: positionSide,
          quantity: order.quantity,
          entryPrice: order.avgFillPrice || order.price || 0,
          markPrice: order.avgFillPrice || order.price || 0,
          unrealizedPnl: 0,
          unrealizedPnlPercent: 0,
          openTime: new Date().toISOString(),
          updateTime: new Date().toISOString(),
          stopLoss: order.metadata?.stopLoss,
          takeProfit: order.metadata?.takeProfit,
          strategyId: order.strategyId,
          userId: order.userId,
          metadata: {
            orderId: order.id,
            ...order.metadata
          }
        };
        
        // Save to database
        await this.savePositionToDatabase(position);
        
        // Notify position update via WebSocket
        await this.notifyPositionUpdate(position, 'created');
        
        return position;
      } else {
        // Existing position - update it
        const position = positions[0];
        
        // Check if the order is in the same direction as the position
        if (
          (position.side === 'long' && order.side === 'buy') ||
          (position.side === 'short' && order.side === 'sell')
        ) {
          // Adding to position
          const newQuantity = position.quantity + order.quantity;
          const newEntryPrice = (position.entryPrice * position.quantity + (order.avgFillPrice || order.price || 0) * order.quantity) / newQuantity;
          
          position.quantity = newQuantity;
          position.entryPrice = newEntryPrice;
          position.updateTime = new Date().toISOString();
          position.metadata = {
            ...position.metadata,
            lastOrderId: order.id
          };
        } else {
          // Reducing position
          const newQuantity = position.quantity - order.quantity;
          
          if (newQuantity <= 0) {
            // Position closed or flipped
            // In a real implementation, would handle position flipping
            
            // For now, just close the position
            await this.closePosition(position.id, order.userId);
            return null;
          } else {
            // Partial position reduction
            position.quantity = newQuantity;
            position.updateTime = new Date().toISOString();
            position.metadata = {
              ...position.metadata,
              lastOrderId: order.id
            };
          }
        }
        
        // Update in database
        await this.updatePositionInDatabase(position);
        
        // Notify position update via WebSocket
        await this.notifyPositionUpdate(position, 'updated');
        
        return position;
      }
    } catch (error) {
      console.error('Error updating position from order:', error);
      return null;
    }
  }
  
  /**
   * Close a position by ID
   */
  private async closePosition(positionId: string, userId: string): Promise<boolean> {
    try {
      const supabase = createServerClient();
      
      // Get the position first
      const { data: position, error } = await supabase
        .from('elizaos_positions')
        .select('*')
        .eq('id', positionId)
        .eq('user_id', userId)
        .single();
      
      if (error || !position) {
        console.error('Error fetching position to close:', error);
        return false;
      }
      
      // Create a closed position record (in a real implementation)
      // ...
      
      // Delete the active position
      const { error: deleteError } = await supabase
        .from('elizaos_positions')
        .delete()
        .eq('id', positionId);
      
      if (deleteError) {
        console.error('Error deleting position:', deleteError);
        return false;
      }
      
      // Notify position closure via WebSocket
      await this.notifyPositionUpdate({
        id: positionId,
        symbol: position.symbol,
        exchange: position.exchange,
        side: position.side,
        quantity: position.quantity,
        entryPrice: position.entry_price,
        markPrice: position.mark_price,
        unrealizedPnl: position.unrealized_pnl,
        unrealizedPnlPercent: position.unrealized_pnl_percent,
        openTime: position.open_time,
        updateTime: new Date().toISOString(),
        userId: position.user_id,
        strategyId: position.strategy_id
      }, 'closed');
      
      return true;
    } catch (error) {
      console.error('Error closing position:', error);
      return false;
    }
  }
  
  /**
   * Save an order to the database
   */
  private async saveOrderToDatabase(order: Order): Promise<void> {
    try {
      const supabase = createServerClient();
      
      // Insert the order
      const { error } = await supabase
        .from('elizaos_orders')
        .insert([{
          id: order.id,
          exchange_id: order.exchangeId,
          symbol: order.symbol,
          exchange: order.exchange,
          side: order.side,
          type: order.type,
          status: order.status,
          price: order.price,
          stop_price: order.stopPrice,
          quantity: order.quantity,
          filled_quantity: order.filledQuantity,
          avg_fill_price: order.avgFillPrice,
          created_at: order.createdAt,
          updated_at: order.updatedAt,
          client_order_id: order.clientOrderId,
          strategy_id: order.strategyId,
          user_id: order.userId,
          metadata: order.metadata
        }]);
      
      if (error) {
        console.error('Error saving order to database:', error);
      }
    } catch (error) {
      console.error('Error saving order to database:', error);
    }
  }
  
  /**
   * Update an order in the database
   */
  private async updateOrderInDatabase(order: Order): Promise<void> {
    try {
      const supabase = createServerClient();
      
      // Update the order
      const { error } = await supabase
        .from('elizaos_orders')
        .update({
          exchange_id: order.exchangeId,
          status: order.status,
          filled_quantity: order.filledQuantity,
          avg_fill_price: order.avgFillPrice,
          updated_at: order.updatedAt,
          metadata: order.metadata
        })
        .eq('id', order.id);
      
      if (error) {
        console.error('Error updating order in database:', error);
      }
    } catch (error) {
      console.error('Error updating order in database:', error);
    }
  }
  
  /**
   * Save a position to the database
   */
  private async savePositionToDatabase(position: Position): Promise<void> {
    try {
      const supabase = createServerClient();
      
      // Insert the position
      const { error } = await supabase
        .from('elizaos_positions')
        .insert([{
          id: position.id,
          symbol: position.symbol,
          exchange: position.exchange,
          side: position.side,
          quantity: position.quantity,
          entry_price: position.entryPrice,
          mark_price: position.markPrice,
          liquidation_price: position.liquidationPrice,
          leverage: position.leverage,
          unrealized_pnl: position.unrealizedPnl,
          unrealized_pnl_percent: position.unrealizedPnlPercent,
          initial_margin: position.initialMargin,
          open_time: position.openTime,
          update_time: position.updateTime,
          stop_loss: position.stopLoss,
          take_profit: position.takeProfit,
          strategy_id: position.strategyId,
          user_id: position.userId,
          metadata: position.metadata
        }]);
      
      if (error) {
        console.error('Error saving position to database:', error);
      }
    } catch (error) {
      console.error('Error saving position to database:', error);
    }
  }
  
  /**
   * Update a position in the database
   */
  private async updatePositionInDatabase(position: Position): Promise<void> {
    try {
      const supabase = createServerClient();
      
      // Update the position
      const { error } = await supabase
        .from('elizaos_positions')
        .update({
          quantity: position.quantity,
          entry_price: position.entryPrice,
          mark_price: position.markPrice,
          liquidation_price: position.liquidationPrice,
          leverage: position.leverage,
          unrealized_pnl: position.unrealizedPnl,
          unrealized_pnl_percent: position.unrealizedPnlPercent,
          update_time: position.updateTime,
          stop_loss: position.stopLoss,
          take_profit: position.takeProfit,
          metadata: position.metadata
        })
        .eq('id', position.id);
      
      if (error) {
        console.error('Error updating position in database:', error);
      }
    } catch (error) {
      console.error('Error updating position in database:', error);
    }
  }
  
  /**
   * Send a WebSocket notification for an order update
   */
  private async notifyOrderUpdate(
    order: Order,
    event: 'created' | 'updated' | 'filled' | 'canceled' | 'rejected'
  ): Promise<void> {
    try {
      const channel = `user-${order.userId}`;
      
      await pusherServer.trigger(channel, 'ORDER_UPDATE', {
        event,
        order,
        timestamp: new Date().toISOString()
      });
      
      // Also notify on strategy channel if applicable
      if (order.strategyId) {
        const strategyChannel = `strategy-${order.strategyId}`;
        
        await pusherServer.trigger(strategyChannel, 'ORDER_UPDATE', {
          event,
          order,
          timestamp: new Date().toISOString()
        });
      }
    } catch (error) {
      console.error('Error sending WebSocket notification for order update:', error);
    }
  }
  
  /**
   * Send a WebSocket notification for a position update
   */
  private async notifyPositionUpdate(
    position: Position,
    event: 'created' | 'updated' | 'closed'
  ): Promise<void> {
    try {
      const channel = `user-${position.userId}`;
      
      await pusherServer.trigger(channel, 'POSITION_UPDATE', {
        event,
        position,
        timestamp: new Date().toISOString()
      });
      
      // Also notify on strategy channel if applicable
      if (position.strategyId) {
        const strategyChannel = `strategy-${position.strategyId}`;
        
        await pusherServer.trigger(strategyChannel, 'POSITION_UPDATE', {
          event,
          position,
          timestamp: new Date().toISOString()
        });
      }
    } catch (error) {
      console.error('Error sending WebSocket notification for position update:', error);
    }
  }
}
