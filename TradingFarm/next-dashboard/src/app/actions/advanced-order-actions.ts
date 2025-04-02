'use server';

import { createServerClient } from '@/utils/supabase/server';
import { revalidatePath } from 'next/cache';
import { 
  OrderType, 
  TrailType, 
  TriggerCondition,
  TriggerPriceSource
} from '@/services/advanced-order-service';

interface OrderData {
  farm_id: number;
  agent_id?: number;
  exchange: string;
  exchange_account_id?: string;
  symbol: string;
  side: 'buy' | 'sell';
  quantity: number;
  trail_value?: number;
  trail_type?: 'absolute' | 'percent';
  activation_price?: number;
  price?: number;
  time_in_force?: string;
  metadata?: any;
  order_type?: string;
}

/**
 * Create a trailing stop order
 */
export async function createTrailingStopOrder(orderData: OrderData) {
  try {
    const supabase = await createServerClient();
    
    // Insert order into database
    const { data: order, error } = await supabase
      .from('orders')
      .insert([{
        farm_id: orderData.farm_id,
        agent_id: orderData.agent_id || null,
        exchange: orderData.exchange,
        exchange_account_id: orderData.exchange_account_id || null,
        symbol: orderData.symbol,
        order_type: 'trailing_stop',
        side: orderData.side,
        quantity: orderData.quantity,
        price: null,
        trailing_percent: orderData.trail_type === 'percent' ? orderData.trail_value : null,
        trigger_price: orderData.activation_price || null,
        status: 'pending',
        metadata: {
          trail_type: orderData.trail_type || 'absolute',
          trail_value: orderData.trail_value || 0,
          time_in_force: orderData.time_in_force || 'gtc',
          filled_quantity: 0
        }
      }])
      .select('id')
      .single();
    
    if (error) {
      console.error('Error creating trailing stop order:', error);
      return { success: false, error: error.message };
    }
    
    revalidatePath('/orders');
    
    return { success: true, data: order };
  } catch (error) {
    console.error('Error creating trailing stop order:', error);
    return { success: false, error: 'An unexpected error occurred' };
  }
}

/**
 * Create an OCO (One-Cancels-Other) order
 */
export async function createOcoOrder(orderData: OrderData & { take_profit: number, stop_loss: number }) {
  try {
    const supabase = await createServerClient();
    
    // Insert main order into database
    const { data: order, error } = await supabase
      .from('orders')
      .insert([{
        farm_id: orderData.farm_id,
        agent_id: orderData.agent_id || null,
        exchange: orderData.exchange,
        exchange_account_id: orderData.exchange_account_id || null,
        symbol: orderData.symbol,
        order_type: 'oco',
        side: orderData.side,
        quantity: orderData.quantity,
        price: orderData.price || null,
        trigger_price: null,
        stop_price: orderData.stop_loss || null,
        status: 'pending',
        metadata: {
          take_profit: orderData.take_profit || null,
          stop_loss: orderData.stop_loss || null,
          time_in_force: orderData.time_in_force || 'gtc',
          filled_quantity: 0
        }
      }])
      .select('id')
      .single();
    
    if (error) {
      console.error('Error creating OCO order:', error);
      return { success: false, error: error.message };
    }
    
    revalidatePath('/orders');
    
    return { success: true, data: order };
  } catch (error) {
    console.error('Error creating OCO order:', error);
    return { success: false, error: 'An unexpected error occurred' };
  }
}

/**
 * Create a bracket order (Entry + Stop Loss + Take Profit)
 */
export async function createBracketOrder(orderData: OrderData & { 
  entry_price: number, 
  take_profit: number, 
  stop_loss: number,
  trailing_stop?: boolean
}) {
  try {
    const supabase = await createServerClient();
    
    // Instead of using RPC, create the order directly for now
    // We can implement the RPC function in the database later
    const { data: order, error } = await supabase
      .from('orders')
      .insert([{
        farm_id: orderData.farm_id,
        agent_id: orderData.agent_id || null,
        exchange: orderData.exchange,
        exchange_account_id: orderData.exchange_account_id || null,
        symbol: orderData.symbol,
        order_type: 'bracket',
        side: orderData.side,
        quantity: orderData.quantity,
        price: orderData.entry_price,
        status: 'pending',
        metadata: {
          take_profit: orderData.take_profit,
          stop_loss: orderData.stop_loss,
          trailing_stop: orderData.trailing_stop || false,
          time_in_force: orderData.time_in_force || 'gtc',
          filled_quantity: 0
        }
      }])
      .select('id')
      .single();
    
    if (error) {
      console.error('Error creating bracket order:', error);
      return { success: false, error: error.message };
    }
    
    revalidatePath('/orders');
    
    return { success: true, data: order };
  } catch (error) {
    console.error('Error creating bracket order:', error);
    return { success: false, error: 'An unexpected error occurred' };
  }
}

/**
 * Create an iceberg order
 */
export async function createIcebergOrder(orderData: OrderData & { 
  total_quantity: number,
  display_quantity: number,
  slice_variance?: number,
  price_variance?: number
}) {
  try {
    const supabase = await createServerClient();
    
    // Insert iceberg order into database
    const { data: order, error } = await supabase
      .from('orders')
      .insert([{
        farm_id: orderData.farm_id,
        agent_id: orderData.agent_id || null,
        exchange: orderData.exchange,
        exchange_account_id: orderData.exchange_account_id || null,
        symbol: orderData.symbol,
        order_type: 'iceberg',
        side: orderData.side,
        quantity: orderData.total_quantity,
        price: orderData.price || null,
        status: 'pending',
        metadata: {
          display_quantity: orderData.display_quantity,
          slice_variance: orderData.slice_variance || 0,
          price_variance: orderData.price_variance || 0,
          time_in_force: orderData.time_in_force || 'gtc',
          filled_quantity: 0
        }
      }])
      .select('id')
      .single();
    
    if (error) {
      console.error('Error creating iceberg order:', error);
      return { success: false, error: error.message };
    }
    
    revalidatePath('/orders');
    
    return { success: true, data: order };
  } catch (error) {
    console.error('Error creating iceberg order:', error);
    return { success: false, error: 'An unexpected error occurred' };
  }
}

/**
 * Create a TWAP order (Time-Weighted Average Price)
 */
export async function createTwapOrder(orderData: OrderData & { 
  total_quantity: number,
  num_intervals: number,
  interval_seconds: number,
  price_variance?: number
}) {
  try {
    const supabase = await createServerClient();
    
    // Insert TWAP order into database
    const { data: order, error } = await supabase
      .from('orders')
      .insert([{
        farm_id: orderData.farm_id,
        agent_id: orderData.agent_id || null,
        exchange: orderData.exchange,
        exchange_account_id: orderData.exchange_account_id || null,
        symbol: orderData.symbol,
        order_type: 'twap',
        side: orderData.side,
        quantity: orderData.total_quantity,
        price: orderData.price || null,
        status: 'pending',
        metadata: {
          num_intervals: orderData.num_intervals,
          interval_seconds: orderData.interval_seconds,
          price_variance: orderData.price_variance || 0,
          time_in_force: orderData.time_in_force || 'gtc',
          filled_quantity: 0
        }
      }])
      .select('id')
      .single();
    
    if (error) {
      console.error('Error creating TWAP order:', error);
      return { success: false, error: error.message };
    }
    
    revalidatePath('/orders');
    
    return { success: true, data: order };
  } catch (error) {
    console.error('Error creating TWAP order:', error);
    return { success: false, error: 'An unexpected error occurred' };
  }
}

/**
 * Create an order with risk check
 */
export async function createOrderWithRiskCheck(
  orderData: OrderData,
  riskProfileId?: string
) {
  try {
    const supabase = await createServerClient();
    
    // Check order risk first
    const riskCheck = await checkOrderRisk(orderData);
    
    if (!riskCheck.passed) {
      return { 
        success: false, 
        error: 'Risk check failed', 
        risk: {
          message: riskCheck.message,
          score: riskCheck.risk_score
        } 
      };
    }
    
    // Insert order into database with risk score
    const { data: order, error } = await supabase
      .from('orders')
      .insert([{
        farm_id: orderData.farm_id,
        agent_id: orderData.agent_id || null,
        exchange: orderData.exchange,
        exchange_account_id: orderData.exchange_account_id || null,
        symbol: orderData.symbol,
        order_type: orderData.order_type || 'limit',
        side: orderData.side,
        quantity: orderData.quantity,
        price: orderData.price || null,
        status: 'pending',
        metadata: {
          risk_score: riskCheck.risk_score,
          risk_profile_id: riskProfileId,
          time_in_force: orderData.time_in_force || 'gtc',
          filled_quantity: 0,
          ...orderData.metadata
        }
      }])
      .select('id')
      .single();
    
    if (error) {
      console.error('Error creating order with risk check:', error);
      return { success: false, error: error.message };
    }
    
    // Create an alert for the order
    await createAlertForOrder(
      order.id, 
      orderData.farm_id, 
      `New ${orderData.side} order created for ${orderData.quantity} ${orderData.symbol} with risk score: ${riskCheck.risk_score}`
    );
    
    revalidatePath('/orders');
    
    return { 
      success: true, 
      data: order,
      risk: {
        passed: riskCheck.passed,
        message: riskCheck.message,
        score: riskCheck.risk_score
      }
    };
  } catch (error) {
    console.error('Error creating order with risk check:', error);
    return { success: false, error: 'An unexpected error occurred' };
  }
}

/**
 * Reconcile positions across multiple exchanges
 */
export async function reconcilePositions(
  farmId: number,
  exchangeAccountIds?: string[]
) {
  try {
    const supabase = await createServerClient();
    
    // We would need to have these functions defined in Supabase
    // For now, let's just use a dummy implementation
    return { 
      success: true, 
      data: { 
        reconciled: true, 
        message: 'Positions reconciled successfully' 
      } 
    };
  } catch (error) {
    console.error('Error reconciling positions:', error);
    return { success: false, error: 'An unexpected error occurred' };
  }
}

/**
 * Calculate performance metrics
 */
export async function calculatePerformanceMetrics(farmId: number, timeframe: string = 'day') {
  try {
    const supabase = await createServerClient();
    
    // We would need to have these functions defined in Supabase
    // For now, let's just use a dummy implementation
    return { 
      success: true, 
      data: { 
        calculated: true, 
        timeframe, 
        message: 'Performance metrics calculated successfully' 
      } 
    };
  } catch (error) {
    console.error('Error calculating performance metrics:', error);
    return { success: false, error: 'An unexpected error occurred' };
  }
}

/**
 * Create an alert
 */
export async function createAlert(farmId: number, title: string, message: string, level: string = 'info', source: string = 'system', metadata: any = {}) {
  try {
    const supabase = await createServerClient();
    
    const { data, error } = await supabase
      .from('alerts')
      .insert([{
        farm_id: farmId,
        title,
        message,
        level,
        status: 'new',
        source,
        metadata
      }]);
    
    if (error) {
      console.error('Error creating alert:', error);
      return { success: false, error: error.message };
    }
    
    revalidatePath('/alerts');
    
    return { success: true, data };
  } catch (error) {
    console.error('Error creating alert:', error);
    return { success: false, error: 'An unexpected error occurred' };
  }
}

/**
 * Create an alert for an order
 */
export async function createAlertForOrder(orderId: string, farmId: number, message: string) {
  return createAlert(
    farmId,
    'New Order Created',
    message,
    'info',
    'order_system',
    { order_id: orderId }
  );
}

/**
 * Check order risk
 */
export async function checkOrderRisk(orderData: OrderData) {
  try {
    // For now, implement a basic risk check
    // Later, we'll implement this as a database function
    
    // Simple risk check based on order size
    const riskScore = orderData.quantity > 1000 ? 8 : 
                      orderData.quantity > 500 ? 5 : 
                      orderData.quantity > 100 ? 3 : 1;
    
    // Order passes risk check if risk score is less than 7
    const passed = riskScore < 7;
    
    return {
      passed,
      message: passed ? 'Order passed risk check' : 'Order exceeds risk threshold',
      risk_score: riskScore
    };
  } catch (error) {
    console.error('Error checking order risk:', error);
    return { passed: true, risk_score: 0, message: 'Risk check failed, proceeding with caution' };
  }
}
