/**
 * Trade Execution Processor
 * Handles background jobs for executing trades and managing orders
 */
import { Job } from 'bull';
import { QueueNames, QueueService } from '../queue-service';
import { TradeService } from '@/services/trade-service';
import { OrderService } from '@/services/order-service';
import { createServerClient } from '@/utils/supabase/server';

// Job types
export enum TradeExecutionJobTypes {
  PLACE_ORDER = 'place-order',
  CANCEL_ORDER = 'cancel-order',
  CHECK_ORDER_STATUS = 'check-order-status',
  ADJUST_STOP_LOSS = 'adjust-stop-loss',
  TRIGGER_TAKE_PROFIT = 'trigger-take-profit',
  BULK_ORDER_UPDATE = 'bulk-order-update',
}

// Job data types
export interface PlaceOrderJobData {
  userId: string;
  symbol: string;
  exchange: string;
  orderType: 'market' | 'limit' | 'stop' | 'trailing_stop';
  side: 'buy' | 'sell';
  quantity: number;
  price?: number;
  stopPrice?: number;
  timeInForce?: 'GTC' | 'IOC' | 'FOK';
  reduceOnly?: boolean;
  postOnly?: boolean;
  clientOrderId?: string;
  agentId?: string;
  strategyId?: string;
  riskScore?: number;
}

export interface CancelOrderJobData {
  userId: string;
  orderId: string;
  exchange: string;
  symbol: string;
}

export interface CheckOrderStatusJobData {
  userId: string;
  orderId: string;
  exchange: string;
  symbol: string;
  clientOrderId?: string;
}

export interface AdjustStopLossJobData {
  userId: string;
  positionId: string;
  orderId?: string;
  symbol: string;
  exchange: string;
  newStopPrice: number;
  type: 'fixed' | 'trailing' | 'atr' | 'volatility';
  trailingOffset?: number;
  atrMultiplier?: number;
  timeFrame?: string;
}

export interface TriggerTakeProfitJobData {
  userId: string;
  positionId: string;
  symbol: string;
  exchange: string;
  profitLevel: number;
  closePercentage: number;
}

export interface BulkOrderUpdateJobData {
  userId: string;
  orders: Array<{
    orderId: string;
    action: 'cancel' | 'update' | 'replace';
    updates?: Partial<PlaceOrderJobData>;
  }>;
  exchange: string;
}

/**
 * Initialize all trade execution processors
 */
export function initializeTradeExecutionProcessors(): void {
  // Place order processor
  QueueService.registerProcessor<PlaceOrderJobData, any>(
    QueueNames.TRADE_EXECUTION,
    TradeExecutionJobTypes.PLACE_ORDER,
    async (job) => {
      const {
        userId,
        symbol,
        exchange,
        orderType,
        side,
        quantity,
        price,
        stopPrice,
        timeInForce,
        reduceOnly,
        postOnly,
        clientOrderId,
        agentId,
        strategyId,
        riskScore
      } = job.data;
      
      try {
        console.log(`Executing ${side} order for ${quantity} ${symbol} on ${exchange}`);
        await job.progress(10);
        
        // Risk check before executing the trade
        if (riskScore && riskScore > 80) {
          throw new Error(`Risk score too high (${riskScore}) for ${symbol} ${side} order`);
        }
        
        // Place the order
        const orderResult = await OrderService.placeOrder({
          userId,
          symbol,
          exchange,
          orderType,
          side,
          quantity,
          price,
          stopPrice,
          timeInForce: timeInForce || 'GTC',
          reduceOnly: !!reduceOnly,
          postOnly: !!postOnly,
          clientOrderId: clientOrderId || `tfarm-${Date.now()}`,
        });
        
        await job.progress(50);
        
        // Record the order in database
        const supabase = await createServerClient();
        await supabase.from('orders').insert({
          user_id: userId,
          exchange,
          symbol,
          side,
          type: orderType,
          quantity,
          price: price || null,
          stop_price: stopPrice || null,
          time_in_force: timeInForce || 'GTC',
          reduce_only: !!reduceOnly,
          post_only: !!postOnly,
          client_order_id: clientOrderId || `tfarm-${Date.now()}`,
          exchange_order_id: orderResult.orderId,
          status: 'new',
          agent_id: agentId || null,
          strategy_id: strategyId || null,
        });
        
        await job.progress(100);
        
        return orderResult;
      } catch (error) {
        console.error(`Error placing order for ${symbol}:`, error);
        
        // Record the failed order
        try {
          const supabase = await createServerClient();
          await supabase.from('order_errors').insert({
            user_id: userId,
            exchange,
            symbol,
            side,
            type: orderType,
            quantity,
            price: price || null,
            error_message: error.message || 'Unknown error',
            agent_id: agentId || null,
            strategy_id: strategyId || null,
          });
        } catch (dbError) {
          console.error('Error recording failed order:', dbError);
        }
        
        throw error;
      }
    }
  );
  
  // Cancel order processor
  QueueService.registerProcessor<CancelOrderJobData, boolean>(
    QueueNames.TRADE_EXECUTION,
    TradeExecutionJobTypes.CANCEL_ORDER,
    async (job) => {
      const { userId, orderId, exchange, symbol } = job.data;
      
      try {
        console.log(`Cancelling order ${orderId} for ${symbol} on ${exchange}`);
        
        // Cancel the order
        await OrderService.cancelOrder(exchange, orderId, symbol);
        
        // Update the order status in database
        const supabase = await createServerClient();
        await supabase.from('orders')
          .update({ status: 'cancelled' })
          .eq('exchange_order_id', orderId)
          .eq('user_id', userId);
        
        return true;
      } catch (error) {
        console.error(`Error cancelling order ${orderId}:`, error);
        throw error;
      }
    }
  );
  
  // Check order status processor
  QueueService.registerProcessor<CheckOrderStatusJobData, any>(
    QueueNames.TRADE_EXECUTION,
    TradeExecutionJobTypes.CHECK_ORDER_STATUS,
    async (job) => {
      const { userId, orderId, exchange, symbol, clientOrderId } = job.data;
      
      try {
        console.log(`Checking status of order ${orderId} for ${symbol}`);
        
        // Query order status
        const orderStatus = await OrderService.getOrderStatus(
          exchange, 
          orderId, 
          symbol,
          clientOrderId
        );
        
        // Update the order in database
        const supabase = await createServerClient();
        await supabase.from('orders')
          .update({ 
            status: orderStatus.status,
            filled_quantity: orderStatus.filledQuantity,
            average_price: orderStatus.averagePrice,
            last_update: new Date().toISOString()
          })
          .eq('exchange_order_id', orderId)
          .eq('user_id', userId);
        
        return orderStatus;
      } catch (error) {
        console.error(`Error checking order status for ${orderId}:`, error);
        throw error;
      }
    }
  );
  
  // Adjust stop loss processor
  QueueService.registerProcessor<AdjustStopLossJobData, boolean>(
    QueueNames.TRADE_EXECUTION,
    TradeExecutionJobTypes.ADJUST_STOP_LOSS,
    async (job) => {
      const {
        userId,
        positionId,
        orderId,
        symbol,
        exchange,
        newStopPrice,
        type,
        trailingOffset,
        atrMultiplier,
        timeFrame
      } = job.data;
      
      try {
        console.log(`Adjusting stop loss for position ${positionId} on ${symbol} to ${newStopPrice}`);
        
        // If an existing stop loss order exists, cancel it first
        if (orderId) {
          await OrderService.cancelOrder(exchange, orderId, symbol);
        }
        
        // Get position details
        const supabase = await createServerClient();
        const { data: position } = await supabase
          .from('positions')
          .select('*')
          .eq('id', positionId)
          .eq('user_id', userId)
          .single();
        
        if (!position) {
          throw new Error(`Position ${positionId} not found`);
        }
        
        // Create new stop loss order based on type
        let stopLossOrder;
        
        if (type === 'fixed') {
          stopLossOrder = await OrderService.placeOrder({
            userId,
            symbol,
            exchange,
            orderType: 'stop',
            side: position.side === 'long' ? 'sell' : 'buy',
            quantity: position.quantity,
            stopPrice: newStopPrice,
            reduceOnly: true,
          });
        } else if (type === 'trailing') {
          stopLossOrder = await OrderService.placeTrailingStopOrder({
            userId,
            symbol,
            exchange,
            side: position.side === 'long' ? 'sell' : 'buy',
            quantity: position.quantity,
            trailingOffset: trailingOffset || 1,
            reduceOnly: true,
          });
        } else if (type === 'atr' || type === 'volatility') {
          // Calculate ATR-based stop loss
          const stopPrice = await TradeService.calculateDynamicStopLoss({
            symbol,
            side: position.side,
            entryPrice: position.entry_price,
            atrMultiplier: atrMultiplier || 2,
            timeFrame: timeFrame || '1h',
          });
          
          stopLossOrder = await OrderService.placeOrder({
            userId,
            symbol,
            exchange,
            orderType: 'stop',
            side: position.side === 'long' ? 'sell' : 'buy',
            quantity: position.quantity,
            stopPrice,
            reduceOnly: true,
          });
        }
        
        // Update position with new stop loss information
        await supabase
          .from('positions')
          .update({
            stop_loss_price: newStopPrice,
            stop_loss_type: type,
            stop_loss_order_id: stopLossOrder.orderId,
            last_update: new Date().toISOString()
          })
          .eq('id', positionId)
          .eq('user_id', userId);
        
        // Also record the stop loss adjustment in position_adjustments
        await supabase
          .from('position_adjustments')
          .insert({
            position_id: positionId,
            user_id: userId,
            adjustment_type: 'stop_loss',
            old_value: position.stop_loss_price || null,
            new_value: newStopPrice,
            adjustment_timestamp: new Date().toISOString(),
          });
        
        return true;
      } catch (error) {
        console.error(`Error adjusting stop loss for position ${positionId}:`, error);
        throw error;
      }
    }
  );
  
  // Trigger take profit processor
  QueueService.registerProcessor<TriggerTakeProfitJobData, boolean>(
    QueueNames.TRADE_EXECUTION,
    TradeExecutionJobTypes.TRIGGER_TAKE_PROFIT,
    async (job) => {
      const { userId, positionId, symbol, exchange, profitLevel, closePercentage } = job.data;
      
      try {
        console.log(`Triggering take profit for position ${positionId} at ${profitLevel}% profit (${closePercentage}% close)`);
        
        // Get position details
        const supabase = await createServerClient();
        const { data: position } = await supabase
          .from('positions')
          .select('*')
          .eq('id', positionId)
          .eq('user_id', userId)
          .single();
        
        if (!position) {
          throw new Error(`Position ${positionId} not found`);
        }
        
        // Calculate the quantity to close
        const closeQuantity = (position.quantity * closePercentage) / 100;
        
        // Place market order to take profit
        const takeProfitOrder = await OrderService.placeOrder({
          userId,
          symbol,
          exchange,
          orderType: 'market',
          side: position.side === 'long' ? 'sell' : 'buy',
          quantity: closeQuantity,
          reduceOnly: true,
        });
        
        // Record the take profit in database
        await supabase
          .from('position_adjustments')
          .insert({
            position_id: positionId,
            user_id: userId,
            adjustment_type: 'take_profit',
            old_value: position.quantity,
            new_value: position.quantity - closeQuantity,
            adjustment_timestamp: new Date().toISOString(),
            order_id: takeProfitOrder.orderId,
            profit_percentage: profitLevel,
          });
        
        // Update position quantity if not fully closed
        if (closePercentage < 100) {
          await supabase
            .from('positions')
            .update({
              quantity: position.quantity - closeQuantity,
              last_update: new Date().toISOString(),
              realized_pnl: position.realized_pnl + (profitLevel * closeQuantity * position.entry_price) / 100
            })
            .eq('id', positionId)
            .eq('user_id', userId);
        } else {
          // Mark position as closed if fully closed
          await supabase
            .from('positions')
            .update({
              quantity: 0,
              status: 'closed',
              close_timestamp: new Date().toISOString(),
              realized_pnl: position.realized_pnl + (profitLevel * position.quantity * position.entry_price) / 100
            })
            .eq('id', positionId)
            .eq('user_id', userId);
        }
        
        return true;
      } catch (error) {
        console.error(`Error triggering take profit for position ${positionId}:`, error);
        throw error;
      }
    }
  );
  
  // Bulk order update processor
  QueueService.registerProcessor<BulkOrderUpdateJobData, any>(
    QueueNames.TRADE_EXECUTION,
    TradeExecutionJobTypes.BULK_ORDER_UPDATE,
    async (job) => {
      const { userId, orders, exchange } = job.data;
      
      try {
        console.log(`Processing bulk order update for ${orders.length} orders on ${exchange}`);
        
        const results = [];
        let progress = 0;
        
        // Process each order request
        for (const orderRequest of orders) {
          try {
            const { orderId, action, updates } = orderRequest;
            
            if (action === 'cancel') {
              // Cancel the order
              await OrderService.cancelOrder(exchange, orderId, updates?.symbol || '');
              
              // Update the order status in database
              const supabase = await createServerClient();
              await supabase.from('orders')
                .update({ status: 'cancelled' })
                .eq('exchange_order_id', orderId)
                .eq('user_id', userId);
              
              results.push({ orderId, action, success: true });
            } else if (action === 'update' && updates) {
              // Update the order
              const updatedOrder = await OrderService.updateOrder(exchange, orderId, updates);
              results.push({ orderId, action, success: true, updatedOrder });
            } else if (action === 'replace' && updates) {
              // Cancel the old order and create a new one
              await OrderService.cancelOrder(exchange, orderId, updates.symbol || '');
              
              // Place the new order
              const newOrder = await OrderService.placeOrder({
                userId,
                ...updates as PlaceOrderJobData
              });
              
              results.push({ orderId, action, success: true, newOrderId: newOrder.orderId });
            }
          } catch (error) {
            console.error(`Error processing bulk order request for ${orderRequest.orderId}:`, error);
            results.push({ 
              orderId: orderRequest.orderId, 
              action: orderRequest.action, 
              success: false, 
              error: error.message 
            });
          }
          
          // Update progress
          progress += (100 / orders.length);
          await job.progress(Math.min(100, Math.round(progress)));
        }
        
        return { results, successCount: results.filter(r => r.success).length };
      } catch (error) {
        console.error(`Error processing bulk order update:`, error);
        throw error;
      }
    }
  );
}
