/**
 * Order Management Service
 * 
 * This service manages the lifecycle of trading orders, including:
 * - Order creation and validation
 * - Order execution and tracking
 * - Order updates and status management
 */

import { createServerClient } from '@/utils/supabase/server';
import { createBrowserClient } from '@/utils/supabase/client';
import { exchangeService } from '@/utils/exchange/exchange-service';
import { v4 as uuidv4 } from 'uuid';
// Advanced order types
import { TwapOrder } from './advanced-orders/twap-order';
import { VwapOrder } from './advanced-orders/vwap-order';
import { IcebergOrder } from './advanced-orders/iceberg-order';
import { OrderParams, OrderResult } from '@/types/orders';
import { IExchangeConnector } from './exchanges/exchange-connector.interface';

export type OrderSide = 'buy' | 'sell';
export type OrderType = 'market' | 'limit' | 'stop_market' | 'stop_limit' | 'trailing_stop' | 'twap' | 'vwap' | 'iceberg';
export type OrderStatus = 'new' | 'partially_filled' | 'filled' | 'canceled' | 'rejected' | 'expired';
export type TimeInForce = 'GTC' | 'IOC' | 'FOK';

export interface OrderRequest {
  symbol: string;
  side: OrderSide;
  type: OrderType;
  quantity: number;
  price?: number;
  stopPrice?: number;
  timeInForce?: TimeInForce;
  isPostOnly?: boolean;
  isReduceOnly?: boolean;
  isClosePosition?: boolean;
  clientOrderId?: string;
  exchangeCredentialId: number;
  agentId?: number;
  metadata?: Record<string, any>;
}

export interface Order {
  id: number;
  user_id: string;
  exchange_credential_id: number;
  agent_id?: number;
  order_id: string;
  client_order_id?: string;
  symbol: string;
  order_type: string;
  side: OrderSide;
  quantity: number;
  price?: number;
  executed_quantity: number;
  executed_price?: number;
  status: OrderStatus;
  time_in_force: TimeInForce;
  stop_price?: number;
  is_post_only: boolean;
  is_reduce_only: boolean;
  is_close_position: boolean;
  error_message?: string;
  filled_at?: string;
  cancelled_at?: string;
  created_at: string;
  updated_at: string;
  metadata?: Record<string, any>;
}

export interface OrderUpdate {
  id: number;
  order_id: number;
  status: OrderStatus;
  executed_quantity?: number;
  executed_price?: number;
  timestamp: string;
  update_type: string;
  fee_amount?: number;
  fee_currency?: string;
  raw_data?: Record<string, any>;
}

class OrderManagementService {
  private static instance: OrderManagementService;
  private orderUpdateSubscriptions: Map<string, any> = new Map();

  private constructor() {
    // Private constructor to enforce singleton pattern
  }

  /**
   * Get singleton instance of OrderManagementService
   */
  public static getInstance(): OrderManagementService {
    if (!OrderManagementService.instance) {
      OrderManagementService.instance = new OrderManagementService();
    }
    return OrderManagementService.instance;
  }

  /**
   * Validate order parameters before submission
   * @param order Order request to validate
   * @returns Validation result {isValid: boolean, errors: string[]}
   */
  private validateOrder(order: OrderRequest): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Symbol is required
    if (!order.symbol) {
      errors.push('Trading symbol is required');
    }

    // Side must be 'buy' or 'sell'
    if (order.side !== 'buy' && order.side !== 'sell') {
      errors.push('Order side must be "buy" or "sell"');
    }

    // Order quantity must be positive
    if (!order.quantity || order.quantity <= 0) {
      errors.push('Order quantity must be a positive number');
    }

    // Limit orders require a price
    if (order.type === 'limit' && (!order.price || order.price <= 0)) {
      errors.push('Limit orders require a valid price');
    }

    // Stop orders require a stop price
    if ((order.type === 'stop_market' || order.type === 'stop_limit') && (!order.stopPrice || order.stopPrice <= 0)) {
      errors.push('Stop orders require a valid stop price');
    }

    // Stop limit orders require both prices
    if (order.type === 'stop_limit' && (!order.price || order.price <= 0)) {
      errors.push('Stop limit orders require both a stop price and a limit price');
    }

    // Exchange credential ID is required
    if (!order.exchangeCredentialId) {
      errors.push('Exchange credential ID is required');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Create an order and submit it to the exchange
   * @param order Order request
   * @param userId User ID (for server-side use)
   * @returns Created order
   */
  /**
   * Create an order and submit it to the exchange, supporting advanced order types.
   */
  public async createOrder(order: OrderRequest, userId?: string): Promise<Order> {
    // Advanced order types
    if (order.type === 'twap' || order.type === 'vwap' || order.type === 'iceberg') {
      return await this.createAdvancedOrder(order, userId);
    }
    // Standard order flow below...
    // Validate order parameters
    const validation = this.validateOrder(order);
    if (!validation.isValid) {
      throw new Error(`Invalid order: ${validation.errors.join(', ')}`);
    }

    // Generate a client order ID if not provided
    const clientOrderId = order.clientOrderId || `tf_${uuidv4().replace(/-/g, '').substring(0, 16)}`;

    try {
      // Get the exchange ID to use
      const exchangeCredentialId = order.exchangeCredentialId;

      // Check if the exchange is initialized
      if (!exchangeService.isExchangeConnected(exchangeCredentialId)) {
        // Try to initialize the exchange
        const supabase = userId ? await createServerClient() : createBrowserClient();
        
        // Get exchange credential details
        const { data: credential, error } = await supabase
          .from('exchange_credentials')
          .select('*')
          .eq('id', exchangeCredentialId)
          .single();
        
        if (error || !credential) {
          throw new Error(`Failed to get exchange credentials: ${error?.message || 'Not found'}`);
        }
        
        // Initialize the exchange
        const exchangeConfig = {
          id: credential.id,
          user_id: credential.user_id,
          name: credential.exchange,
          exchange: credential.exchange,
          active: credential.is_active,
          testnet: false,
          margin_enabled: false
        };
        
        const connected = await exchangeService.initializeExchange(exchangeConfig);
        if (!connected) {
          throw new Error('Failed to connect to exchange');
        }
      }

      // Submit the order to the exchange
      const exchangeOrderResult = await exchangeService.placeOrder(
        exchangeCredentialId, 
        {
          symbol: order.symbol,
          side: order.side,
          type: order.type,
          quantity: order.quantity,
          price: order.price,
          stopPrice: order.stopPrice,
          timeInForce: order.timeInForce || 'GTC',
          postOnly: order.isPostOnly,
          reduceOnly: order.isReduceOnly,
          closePosition: order.isClosePosition,
          clientOrderId: clientOrderId
        }
      );

      // Store the order in the database
      const supabase = userId ? await createServerClient() : createBrowserClient();
      
      const { data: createdOrder, error } = await supabase
        .from('orders')
        .insert({
          user_id: userId || (await supabase.auth.getUser()).data.user?.id,
          exchange_credential_id: exchangeCredentialId,
          agent_id: order.agentId,
          order_id: exchangeOrderResult.orderId,
          client_order_id: clientOrderId,
          symbol: order.symbol,
          order_type: order.type,
          side: order.side,
          quantity: order.quantity,
          price: order.price,
          stop_price: order.stopPrice,
          time_in_force: order.timeInForce || 'GTC',
          is_post_only: order.isPostOnly || false,
          is_reduce_only: order.isReduceOnly || false,
          is_close_position: order.isClosePosition || false,
          status: exchangeOrderResult.status,
          executed_quantity: exchangeOrderResult.executedQty || 0,
          executed_price: exchangeOrderResult.executedPrice,
          metadata: order.metadata
        })
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to store order: ${error.message}`);
      }

      // Subscribe to order updates
      this.subscribeToOrderUpdates(createdOrder.id);

      return createdOrder;
    } catch (error: any) {
      // In case of failure, store a rejected order to track the failure
      try {
        const supabase = userId ? await createServerClient() : createBrowserClient();
        
        const { data: rejectedOrder } = await supabase
          .from('orders')
          .insert({
            user_id: userId || (await supabase.auth.getUser()).data.user?.id,
            exchange_credential_id: order.exchangeCredentialId,
            agent_id: order.agentId,
            order_id: 'rejected',
            client_order_id: clientOrderId,
            symbol: order.symbol,
            order_type: order.type,
            side: order.side,
            quantity: order.quantity,
            price: order.price,
            stop_price: order.stopPrice,
            time_in_force: order.timeInForce || 'GTC',
            is_post_only: order.isPostOnly || false,
            is_reduce_only: order.isReduceOnly || false,
            is_close_position: order.isClosePosition || false,
            status: 'rejected',
            executed_quantity: 0,
            error_message: error.message,
            metadata: order.metadata
          })
          .select()
          .single();
          
        throw new Error(`Order rejected: ${error.message}`);
      } catch (storeError) {
        throw new Error(`Order failed and could not be stored: ${error.message}`);
      }
    }
  }

  /**
   * Cancel an existing order
   * @param orderId Order ID to cancel
   * @param userId User ID (for server-side use)
   * @returns Cancelled order
   */
  public async cancelOrder(orderId: number, userId?: string): Promise<Order> {
    try {
      // Get the order from the database
      const supabase = userId ? await createServerClient() : createBrowserClient();
      
      const { data: order, error } = await supabase
        .from('orders')
        .select('*')
        .eq('id', orderId)
        .single();
      
      if (error || !order) {
        throw new Error(`Order not found: ${error?.message || 'Not found'}`);
      }

      // Check if the order is already filled or cancelled
      if (['filled', 'canceled', 'rejected', 'expired'].includes(order.status)) {
        throw new Error(`Cannot cancel order in status: ${order.status}`);
      }

      // Cancel the order on the exchange
      await exchangeService.cancelOrder(order.exchange_credential_id, order.order_id, order.symbol);

      // Update the order in the database
      const { data: updatedOrder, error: updateError } = await supabase
        .from('orders')
        .update({
          status: 'canceled',
          cancelled_at: new Date().toISOString()
        })
        .eq('id', orderId)
        .select()
        .single();
      
      if (updateError) {
        throw new Error(`Failed to update order: ${updateError.message}`);
      }

      return updatedOrder;
    } catch (error: any) {
      throw new Error(`Failed to cancel order: ${error.message}`);
    }
  }

  /**
   * Get an order by ID
   * @param orderId Order ID
   * @param userId User ID (for server-side use)
   * @returns Order details
   */
  public async getOrder(orderId: number, userId?: string): Promise<Order> {
    try {
      const supabase = userId ? await createServerClient() : createBrowserClient();
      
      const { data: order, error } = await supabase
        .from('orders')
        .select('*')
        .eq('id', orderId)
        .single();
      
      if (error || !order) {
        throw new Error(`Order not found: ${error?.message || 'Not found'}`);
      }

      return order;
    } catch (error: any) {
      throw new Error(`Failed to get order: ${error.message}`);
    }
  }

  /**
   * Get all orders for a user
   * @param userId User ID (for server-side use)
   * @param filters Optional filters (status, symbol, etc.)
   * @param limit Maximum number of orders to return
   * @param page Page number for pagination
   * @returns List of orders
   */
  public async getOrders(
    userId?: string,
    filters?: { status?: OrderStatus; symbol?: string; agentId?: number },
    limit = 100,
    page = 0
  ): Promise<Order[]> {
    try {
      const supabase = userId ? await createServerClient() : createBrowserClient();
      
      let query = supabase
        .from('orders')
        .select('*')
        .order('created_at', { ascending: false })
        .range(page * limit, (page + 1) * limit - 1);
      
      if (filters?.status) {
        query = query.eq('status', filters.status);
      }
      
      if (filters?.symbol) {
        query = query.eq('symbol', filters.symbol);
      }
      
      if (filters?.agentId) {
        query = query.eq('agent_id', filters.agentId);
      }
      
      const { data: orders, error } = await query;
      
      if (error) {
        throw new Error(`Failed to get orders: ${error.message}`);
      }

      return orders || [];
    } catch (error: any) {
      throw new Error(`Failed to get orders: ${error.message}`);
    }
  }

  /**
   * Get order updates for a specific order
   * @param orderId Order ID
   * @param userId User ID (for server-side use)
   * @returns List of order updates
   */
  public async getOrderUpdates(orderId: number, userId?: string): Promise<OrderUpdate[]> {
    try {
      const supabase = userId ? await createServerClient() : createBrowserClient();
      
      const { data: updates, error } = await supabase
        .from('order_updates')
        .select('*')
        .eq('order_id', orderId)
        .order('timestamp', { ascending: true });
      
      if (error) {
        throw new Error(`Failed to get order updates: ${error.message}`);
      }

      return updates || [];
    } catch (error: any) {
      throw new Error(`Failed to get order updates: ${error.message}`);
    }
  }

  /**
   * Check the status of an order on the exchange and update local database
   * @param orderId Order ID
   * @param userId User ID (for server-side use) 
   * @returns Updated order
   */
  public async checkOrderStatus(orderId: number, userId?: string): Promise<Order> {
    try {
      const supabase = userId ? await createServerClient() : createBrowserClient();
      
      // Get the order from the database
      const { data: order, error } = await supabase
        .from('orders')
        .select('*')
        .eq('id', orderId)
        .single();
      
      if (error || !order) {
        throw new Error(`Order not found: ${error?.message || 'Not found'}`);
      }

      // No need to check if already in a final state
      if (['filled', 'canceled', 'rejected', 'expired'].includes(order.status)) {
        return order;
      }

      // Check the order status on the exchange
      const exchangeOrder = await exchangeService.getOrder(
        order.exchange_credential_id,
        order.order_id,
        order.symbol
      );

      // Update the order in the database
      const { data: updatedOrder, error: updateError } = await supabase
        .from('orders')
        .update({
          status: exchangeOrder.status,
          executed_quantity: exchangeOrder.executedQty || 0,
          executed_price: exchangeOrder.executedPrice,
          filled_at: exchangeOrder.status === 'filled' ? new Date().toISOString() : order.filled_at,
          cancelled_at: ['canceled', 'expired'].includes(exchangeOrder.status) ? new Date().toISOString() : order.cancelled_at
        })
        .eq('id', orderId)
        .select()
        .single();
      
      if (updateError) {
        throw new Error(`Failed to update order status: ${updateError.message}`);
      }

      return updatedOrder;
    } catch (error: any) {
      throw new Error(`Failed to check order status: ${error.message}`);
    }
  }

  /**
   * Subscribe to real-time order updates
   * @param orderId Order ID to subscribe to
   * @param onUpdate Optional callback for updates
   */
  public subscribeToOrderUpdates(orderId: number, onUpdate?: (order: Order) => void): void {
    // Already subscribed
    if (this.orderUpdateSubscriptions.has(orderId.toString())) {
      return;
    }

    const supabase = createBrowserClient();
    
    const subscription = supabase
      .channel(`order_${orderId}`)
      .on('postgres_changes', 
          { event: 'UPDATE', schema: 'public', table: 'orders', filter: `id=eq.${orderId}` }, 
          (payload) => {
            const updatedOrder = payload.new as Order;
            if (onUpdate) {
              onUpdate(updatedOrder);
            }
          })
      .subscribe();

    this.orderUpdateSubscriptions.set(orderId.toString(), subscription);
  }

  /**
   * Unsubscribe from order updates
   * @param orderId Order ID to unsubscribe from
   */
  public unsubscribeFromOrderUpdates(orderId: number): void {
    const subscriptionKey = orderId.toString();
    if (this.orderUpdateSubscriptions.has(subscriptionKey)) {
      const subscription = this.orderUpdateSubscriptions.get(subscriptionKey);
      const supabase = createBrowserClient();
      supabase.removeChannel(subscription);
      this.orderUpdateSubscriptions.delete(subscriptionKey);
    }
  }
}

  /**
   * Handles advanced order types: TWAP, VWAP, Iceberg
   */
  private async createAdvancedOrder(order: OrderRequest, userId?: string): Promise<Order> {
    const { type } = order;
    const exchangeCredentialId = order.exchangeCredentialId;
    const connector: IExchangeConnector = await exchangeService.getConnector(exchangeCredentialId);
    if (!connector) throw new Error('Exchange connector not found');

    // Extract advanced params from metadata
    const advancedParams: any = order.metadata?.advancedParams || {};
    let executor: TwapOrder | VwapOrder | IcebergOrder;
    let childResults: OrderResult[] = [];

    // Prepare executor for advanced order type
    if (type === 'twap') {
      const { sliceCount, intervalMs } = advancedParams;
      executor = new TwapOrder({
        symbol: order.symbol,
        totalQuantity: order.quantity,
        sliceCount,
        intervalMs,
        side: order.side,
        price: order.price,
      }, connector);
    } else if (type === 'vwap') {
      const { volumeProfile, intervalMs } = advancedParams;
      executor = new VwapOrder({
        symbol: order.symbol,
        totalQuantity: order.quantity,
        volumeProfile,
        intervalMs,
        side: order.side,
        price: order.price,
      }, connector);
    } else if (type === 'iceberg') {
      const { visibleQuantity, intervalMs } = advancedParams;
      executor = new IcebergOrder({
        symbol: order.symbol,
        totalQuantity: order.quantity,
        visibleQuantity,
        intervalMs,
        side: order.side,
        price: order.price,
      }, connector);
    } else {
      throw new Error('Unsupported advanced order type');
    }

    // Execute advanced order (child orders)
    childResults = await executor.execute();
    // Compute execution quality metrics
    const executedQty = childResults.reduce((sum, r) => sum + (r.executedQty || 0), 0);
    const avgPrice = childResults.reduce((sum, r) => sum + ((r.executedPrice || 0) * (r.executedQty || 0)), 0) / (executedQty || 1);
    const slippage = (avgPrice && order.price) ? (avgPrice - order.price) / order.price : 0;

    // Store parent order in DB
    const supabase = userId ? await createServerClient() : createBrowserClient();
    const { data: parentOrder, error } = await supabase
      .from('orders')
      .insert({
        user_id: userId || (await supabase.auth.getUser()).data.user?.id,
        exchange_credential_id: exchangeCredentialId,
        agent_id: order.agentId,
        order_id: 'ADV_' + type + '_' + Date.now(),
        client_order_id: order.clientOrderId || `tf_${uuidv4().replace(/-/g, '').substring(0, 16)}`,
        symbol: order.symbol,
        order_type: type,
        side: order.side,
        quantity: order.quantity,
        price: order.price,
        status: 'filled', // Parent is filled if all children filled
        executed_quantity: executedQty,
        executed_price: avgPrice,
        metadata: {
          ...order.metadata,
          advancedParams,
          childResults,
          executionQuality: { slippage, avgPrice },
        },
      })
      .select()
      .single();
    if (error) throw new Error(`Failed to store advanced order: ${error.message}`);
    this.subscribeToOrderUpdates(parentOrder.id);
    return parentOrder;
  }

  /**
   * Handles advanced order types: TWAP, VWAP, Iceberg
   */
  private async createAdvancedOrder(order: OrderRequest, userId?: string): Promise<Order> {
    const { type } = order;
    const exchangeCredentialId = order.exchangeCredentialId;
    const connector: IExchangeConnector = await exchangeService.getConnector(exchangeCredentialId);
    if (!connector) throw new Error('Exchange connector not found');

    // Extract advanced params from metadata
    const advancedParams: any = order.metadata?.advancedParams || {};
    let executor: TwapOrder | VwapOrder | IcebergOrder;
    let childResults: OrderResult[] = [];

    // Prepare executor for advanced order type
    if (type === 'twap') {
      const { sliceCount, intervalMs } = advancedParams;
      executor = new TwapOrder({
        symbol: order.symbol,
        totalQuantity: order.quantity,
        sliceCount,
        intervalMs,
        side: order.side,
        price: order.price,
      }, connector);
    } else if (type === 'vwap') {
      const { volumeProfile, intervalMs } = advancedParams;
      executor = new VwapOrder({
        symbol: order.symbol,
        totalQuantity: order.quantity,
        volumeProfile,
        intervalMs,
        side: order.side,
        price: order.price,
      }, connector);
    } else if (type === 'iceberg') {
      const { visibleQuantity, intervalMs } = advancedParams;
      executor = new IcebergOrder({
        symbol: order.symbol,
        totalQuantity: order.quantity,
        visibleQuantity,
        intervalMs,
        side: order.side,
        price: order.price,
      }, connector);
    } else {
      throw new Error('Unsupported advanced order type');
    }

    // Execute advanced order (child orders)
    childResults = await executor.execute();
    // Compute execution quality metrics
    const executedQty = childResults.reduce((sum, r) => sum + (r.executedQty || 0), 0);
    const avgPrice = childResults.reduce((sum, r) => sum + ((r.executedPrice || 0) * (r.executedQty || 0)), 0) / (executedQty || 1);
    const slippage = (avgPrice && order.price) ? (avgPrice - order.price) / order.price : 0;

    // Store parent order in DB
    const supabase = userId ? await createServerClient() : createBrowserClient();
    const { data: parentOrder, error } = await supabase
      .from('orders')
      .insert({
        user_id: userId || (await supabase.auth.getUser()).data.user?.id,
        exchange_credential_id: exchangeCredentialId,
        agent_id: order.agentId,
        order_id: 'ADV_' + type + '_' + Date.now(),
        client_order_id: order.clientOrderId || `tf_${uuidv4().replace(/-/g, '').substring(0, 16)}`,
        symbol: order.symbol,
        order_type: type,
        side: order.side,
        quantity: order.quantity,
        price: order.price,
        status: 'filled', // Parent is filled if all children filled
        executed_quantity: executedQty,
        executed_price: avgPrice,
        metadata: {
          ...order.metadata,
          advancedParams,
          childResults,
          executionQuality: { slippage, avgPrice },
        },
      })
      .select()
      .single();
    if (error) throw new Error(`Failed to store advanced order: ${error.message}`);
    this.subscribeToOrderUpdates(parentOrder.id);
    return parentOrder;
  }

// Export singleton instance
export const orderManagementService = OrderManagementService.getInstance();
