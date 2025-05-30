/**
 * Order Execution Service
 * 
 * Centralizes order execution logic across different exchanges.
 * Handles order placement, cancellation, and tracking with proper error handling.
 */

import { createServerClient } from '@/utils/supabase/server';
import { createBrowserClient } from '@/utils/supabase/client';
import { createExchangeConnector } from '@/lib/exchange/connector-factory';
import { 
  IExchangeConnector, 
  OrderParams, 
  OrderResult, 
  ExchangeCredentials 
} from '@/lib/exchange/types';
import { 
  RiskAwareOrderParams, 
  RiskAwareOrderResult 
} from './types';
import { RiskAwareOrderService } from './risk-aware-order-service';

/**
 * Interface for the Order Execution Service
 */
export interface IOrderExecutionService {
  /**
   * Place an order on an exchange
   * 
   * @param exchange - The exchange to place the order on
   * @param params - Order parameters
   * @param credentialId - Optional ID of the exchange credential to use
   * @returns The result of the order placement
   */
  placeOrder(
    exchange: string,
    params: OrderParams,
    credentialId?: string
  ): Promise<OrderResult>;
  
  /**
   * Place an order with risk management
   * 
   * @param exchange - The exchange to place the order on
   * @param params - Risk-aware order parameters
   * @param credentialId - Optional ID of the exchange credential to use
   * @returns The result of the order placement with risk assessment
   */
  placeRiskAwareOrder(
    exchange: string,
    params: RiskAwareOrderParams,
    credentialId?: string
  ): Promise<RiskAwareOrderResult>;
  
  /**
   * Cancel an order on an exchange
   * 
   * @param exchange - The exchange the order is on
   * @param orderId - The ID of the order to cancel
   * @param symbol - The symbol of the order
   * @param credentialId - Optional ID of the exchange credential to use
   * @returns True if the cancellation was successful
   */
  cancelOrder(
    exchange: string,
    orderId: string,
    symbol: string,
    credentialId?: string
  ): Promise<boolean>;
  
  /**
   * Get the status of an order
   * 
   * @param exchange - The exchange the order is on
   * @param orderId - The ID of the order to check
   * @param symbol - The symbol of the order
   * @param credentialId - Optional ID of the exchange credential to use
   * @returns The current status of the order
   */
  getOrderStatus(
    exchange: string,
    orderId: string,
    symbol: string,
    credentialId?: string
  ): Promise<OrderResult>;
  
  /**
   * Get all open orders
   * 
   * @param exchange - The exchange to get orders from
   * @param symbol - Optional symbol to filter by
   * @param credentialId - Optional ID of the exchange credential to use
   * @returns Array of open orders
   */
  getOpenOrders(
    exchange: string,
    symbol?: string,
    credentialId?: string
  ): Promise<OrderResult[]>;
}

/**
 * Implementation of the Order Execution Service
 */
export class OrderExecutionService implements IOrderExecutionService {
  private userId: string;
  private supabase = createBrowserClient();
  private connectorCache: Map<string, IExchangeConnector> = new Map();
  
  /**
   * Create a new Order Execution Service
   * 
   * @param userId - The ID of the user
   */
  constructor(userId: string) {
    this.userId = userId;
  }
  
  /**
   * Place an order on an exchange
   * 
   * @param exchange - The exchange to place the order on
   * @param params - Order parameters
   * @param credentialId - Optional ID of the exchange credential to use
   * @returns The result of the order placement
   */
  public async placeOrder(
    exchange: string,
    params: OrderParams,
    credentialId?: string
  ): Promise<OrderResult> {
    try {
      // Get the exchange connector
      const connector = await this.getConnector(exchange, credentialId);
      
      // Place the order
      const result = await connector.placeOrder(params);
      
      // Record the order in the database
      await this.recordOrder(exchange, result);
      
      return result;
    } catch (error) {
      console.error(`Failed to place order on ${exchange}:`, error);
      throw error;
    }
  }
  
  /**
   * Place an order with risk management
   * 
   * @param exchange - The exchange to place the order on
   * @param params - Risk-aware order parameters
   * @param credentialId - Optional ID of the exchange credential to use
   * @returns The result of the order placement with risk assessment
   */
  public async placeRiskAwareOrder(
    exchange: string,
    params: RiskAwareOrderParams,
    credentialId?: string
  ): Promise<RiskAwareOrderResult> {
    try {
      // Create a risk-aware order service
      const riskService = new RiskAwareOrderService(this.userId);
      
      // Validate the order against risk parameters
      const result = await riskService.placeOrder(params);
      
      // If the order passed risk checks and was executed, record it
      if (result.riskCheckPassed && result.order) {
        await this.recordOrder(exchange, result.order, result);
      }
      
      return result;
    } catch (error) {
      console.error(`Failed to place risk-aware order on ${exchange}:`, error);
      throw error;
    }
  }
  
  /**
   * Cancel an order on an exchange
   * 
   * @param exchange - The exchange the order is on
   * @param orderId - The ID of the order to cancel
   * @param symbol - The symbol of the order
   * @param credentialId - Optional ID of the exchange credential to use
   * @returns True if the cancellation was successful
   */
  public async cancelOrder(
    exchange: string,
    orderId: string,
    symbol: string,
    credentialId?: string
  ): Promise<boolean> {
    try {
      // Get the exchange connector
      const connector = await this.getConnector(exchange, credentialId);
      
      // Cancel the order
      const result = await connector.cancelOrder(orderId, symbol);
      
      // Update the order status in the database
      if (result) {
        await this.updateOrderStatus(exchange, orderId, 'canceled');
      }
      
      return result;
    } catch (error) {
      console.error(`Failed to cancel order ${orderId} on ${exchange}:`, error);
      throw error;
    }
  }
  
  /**
   * Get the status of an order
   * 
   * @param exchange - The exchange the order is on
   * @param orderId - The ID of the order to check
   * @param symbol - The symbol of the order
   * @param credentialId - Optional ID of the exchange credential to use
   * @returns The current status of the order
   */
  public async getOrderStatus(
    exchange: string,
    orderId: string,
    symbol: string,
    credentialId?: string
  ): Promise<OrderResult> {
    try {
      // Get the exchange connector
      const connector = await this.getConnector(exchange, credentialId);
      
      // Get the order status
      const result = await connector.getOrderStatus(orderId, symbol);
      
      // Update the order in the database
      await this.updateOrder(exchange, result);
      
      return result;
    } catch (error) {
      console.error(`Failed to get order status for ${orderId} on ${exchange}:`, error);
      throw error;
    }
  }
  
  /**
   * Get all open orders
   * 
   * @param exchange - The exchange to get orders from
   * @param symbol - Optional symbol to filter by
   * @param credentialId - Optional ID of the exchange credential to use
   * @returns Array of open orders
   */
  public async getOpenOrders(
    exchange: string,
    symbol?: string,
    credentialId?: string
  ): Promise<OrderResult[]> {
    try {
      // Get the exchange connector
      const connector = await this.getConnector(exchange, credentialId);
      
      // Get open orders
      const orders = await connector.getOpenOrders(symbol);
      
      // Update orders in the database
      for (const order of orders) {
        await this.updateOrder(exchange, order);
      }
      
      return orders;
    } catch (error) {
      console.error(`Failed to get open orders on ${exchange}:`, error);
      throw error;
    }
  }
  
  /**
   * Get an exchange connector instance
   * 
   * @param exchange - The exchange to get a connector for
   * @param credentialId - Optional ID of the exchange credential to use
   * @returns An initialized exchange connector
   */
  private async getConnector(
    exchange: string,
    credentialId?: string
  ): Promise<IExchangeConnector> {
    // Create a cache key
    const cacheKey = `${exchange}:${credentialId || 'default'}`;
    
    // Check if the connector is already cached
    if (this.connectorCache.has(cacheKey)) {
      return this.connectorCache.get(cacheKey)!;
    }
    
    // Get credentials for the exchange
    const credentials = await this.getExchangeCredentials(exchange, credentialId);
    
    // Create the connector
    const connector = createExchangeConnector(exchange, {
      useTestnet: credentials.is_testnet
    });
    
    // Connect to the exchange
    const connected = await connector.connect({
      apiKey: credentials.api_key,
      secretKey: credentials.api_secret,
      passphrase: credentials.api_passphrase
    });
    
    if (!connected) {
      throw new Error(`Failed to connect to ${exchange}`);
    }
    
    // Cache the connector
    this.connectorCache.set(cacheKey, connector);
    
    return connector;
  }
  
  /**
   * Get exchange credentials for a user
   * 
   * @param exchange - The exchange to get credentials for
   * @param credentialId - Optional ID of the credential to use
   * @returns The exchange credentials
   */
  private async getExchangeCredentials(
    exchange: string,
    credentialId?: string
  ): Promise<any> {
    try {
      let query = this.supabase
        .from('exchange_credentials')
        .select('*')
        .eq('user_id', this.userId)
        .eq('exchange', exchange)
        .eq('is_active', true);
      
      // If a specific credential ID is provided, use that
      if (credentialId) {
        query = query.eq('id', credentialId);
      } else {
        // Otherwise, get the most recently updated credential
        query = query.order('updated_at', { ascending: false }).limit(1);
      }
      
      const { data, error } = await query.single();
      
      if (error) {
        throw error;
      }
      
      if (!data) {
        throw new Error(`No active credentials found for ${exchange}`);
      }
      
      return data;
    } catch (error) {
      console.error(`Failed to get exchange credentials for ${exchange}:`, error);
      throw error;
    }
  }
  
  /**
   * Record an order in the database
   * 
   * @param exchange - The exchange the order is on
   * @param order - The order result
   * @param riskResult - Optional risk assessment result
   */
  private async recordOrder(
    exchange: string,
    order: OrderResult,
    riskResult?: RiskAwareOrderResult
  ): Promise<void> {
    try {
      const { data, error } = await this.supabase
        .from('exchange_orders')
        .insert({
          user_id: this.userId,
          exchange,
          exchange_order_id: order.id,
          client_order_id: order.clientOrderId,
          symbol: order.symbol,
          side: order.side,
          type: order.type,
          status: order.status,
          quantity: order.quantity,
          price: order.price,
          stop_price: order.stopPrice,
          executed_quantity: order.executedQuantity,
          executed_price: order.executedPrice,
          time_in_force: order.timeInForce,
          risk_check_passed: riskResult ? riskResult.riskCheckPassed : undefined,
          risk_check_details: riskResult ? riskResult.riskAssessment : undefined,
          metadata: {
            exchange_timestamp: order.createdAt
          }
        })
        .select()
        .single();
      
      if (error) {
        throw error;
      }
      
      // Update position if the order is filled or partially filled
      if (order.status === 'filled' || order.status === 'partially_filled') {
        await this.updatePosition(exchange, order);
      }
    } catch (error) {
      console.error(`Failed to record order in database:`, error);
      // Continue execution even if recording fails
    }
  }
  
  /**
   * Update an order in the database
   * 
   * @param exchange - The exchange the order is on
   * @param order - The order result
   */
  private async updateOrder(exchange: string, order: OrderResult): Promise<void> {
    try {
      const { data, error } = await this.supabase
        .from('exchange_orders')
        .update({
          status: order.status,
          executed_quantity: order.executedQuantity,
          executed_price: order.executedPrice,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', this.userId)
        .eq('exchange', exchange)
        .eq('exchange_order_id', order.id);
      
      if (error) {
        throw error;
      }
      
      // Update position if the order is filled or partially filled
      if (order.status === 'filled' || order.status === 'partially_filled') {
        await this.updatePosition(exchange, order);
      }
    } catch (error) {
      console.error(`Failed to update order in database:`, error);
      // Continue execution even if updating fails
    }
  }
  
  /**
   * Update an order's status in the database
   * 
   * @param exchange - The exchange the order is on
   * @param orderId - The ID of the order
   * @param status - The new status
   */
  private async updateOrderStatus(
    exchange: string,
    orderId: string,
    status: string
  ): Promise<void> {
    try {
      const { data, error } = await this.supabase
        .from('exchange_orders')
        .update({
          status,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', this.userId)
        .eq('exchange', exchange)
        .eq('exchange_order_id', orderId);
      
      if (error) {
        throw error;
      }
    } catch (error) {
      console.error(`Failed to update order status in database:`, error);
      // Continue execution even if updating fails
    }
  }
  
  /**
   * Update a position based on order execution
   * 
   * @param exchange - The exchange the position is on
   * @param order - The executed order
   */
  private async updatePosition(exchange: string, order: OrderResult): Promise<void> {
    try {
      // Calculate position changes
      const positionChange = order.executedQuantity * (order.side === 'buy' ? 1 : -1);
      
      // Check if the position exists
      const { data: existingPosition, error: queryError } = await this.supabase
        .from('exchange_positions')
        .select('*')
        .eq('user_id', this.userId)
        .eq('exchange', exchange)
        .eq('symbol', order.symbol)
        .single();
      
      if (queryError && queryError.code !== 'PGRST116') { // PGRST116 is "no rows returned"
        throw queryError;
      }
      
      if (existingPosition) {
        // Update existing position
        const newSize = existingPosition.position_size + positionChange;
        
        // Calculate new average entry price if adding to position
        let newEntryPrice = existingPosition.entry_price;
        if (Math.sign(existingPosition.position_size) === Math.sign(newSize) && Math.abs(newSize) > Math.abs(existingPosition.position_size)) {
          // Only update entry price if increasing position in same direction
          const oldValue = existingPosition.position_size * existingPosition.entry_price;
          const newValue = positionChange * (order.executedPrice || order.price || 0);
          newEntryPrice = (oldValue + newValue) / newSize;
        }
        
        const { error: updateError } = await this.supabase
          .from('exchange_positions')
          .update({
            position_size: newSize,
            entry_price: newEntryPrice,
            last_updated_price: order.executedPrice || order.price,
            updated_at: new Date().toISOString()
          })
          .eq('id', existingPosition.id);
        
        if (updateError) {
          throw updateError;
        }
      } else if (positionChange !== 0) {
        // Create new position if it doesn't exist and there's a position change
        const { error: insertError } = await this.supabase
          .from('exchange_positions')
          .insert({
            user_id: this.userId,
            exchange,
            symbol: order.symbol,
            position_size: positionChange,
            entry_price: order.executedPrice || order.price || 0,
            last_updated_price: order.executedPrice || order.price,
            metadata: {
              last_order_id: order.id
            }
          });
        
        if (insertError) {
          throw insertError;
        }
      }
    } catch (error) {
      console.error(`Failed to update position:`, error);
      // Continue execution even if position update fails
    }
  }
}
