'use server';

import { createServerClient } from '@/utils/supabase/server';
import { revalidatePath } from 'next/cache';
import { 
  OrderType, 
  TrailType, 
  TriggerCondition,
  TriggerPriceSource
} from '@/services/advanced-order-service';

/**
 * Create a trailing stop order
 */
export async function createTrailingStopOrder(orderData: {
  farm_id: string;
  agent_id?: string;
  exchange: string;
  exchange_account_id?: string;
  symbol: string;
  side: 'buy' | 'sell';
  quantity: number;
  trail_value: number;
  trail_type: TrailType;
  activation_price?: number;
  time_in_force?: 'gtc' | 'ioc' | 'fok';
  metadata?: Record<string, any>;
}) {
  try {
    const supabase = await createServerClient();
    
    // Insert order into database
    const { data: order, error } = await supabase
      .from('orders')
      .insert({
        farm_id: orderData.farm_id,
        agent_id: orderData.agent_id,
        exchange: orderData.exchange,
        exchange_account_id: orderData.exchange_account_id,
        symbol: orderData.symbol,
        order_type: 'trailing_stop',
        side: orderData.side,
        quantity: orderData.quantity,
        trail_value: orderData.trail_value,
        trail_type: orderData.trail_type,
        activation_price: orderData.activation_price,
        time_in_force: orderData.time_in_force || 'gtc',
        status: 'new',
        filled_quantity: 0,
        metadata: orderData.metadata
      })
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
export async function createOcoOrder(orderData: {
  farm_id: string;
  agent_id?: string;
  exchange: string;
  exchange_account_id?: string;
  symbol: string;
  side: 'buy' | 'sell';
  quantity: number;
  price: number; // Limit price
  stop_price: number; // Stop price
  trigger_condition?: TriggerCondition;
  time_in_force?: 'gtc' | 'ioc' | 'fok';
  metadata?: Record<string, any>;
}) {
  try {
    const supabase = await createServerClient();
    
    // Insert order into database
    const { data: order, error } = await supabase
      .from('orders')
      .insert({
        farm_id: orderData.farm_id,
        agent_id: orderData.agent_id,
        exchange: orderData.exchange,
        exchange_account_id: orderData.exchange_account_id,
        symbol: orderData.symbol,
        order_type: 'oco',
        side: orderData.side,
        quantity: orderData.quantity,
        price: orderData.price,
        stop_price: orderData.stop_price,
        trigger_condition: orderData.trigger_condition,
        time_in_force: orderData.time_in_force || 'gtc',
        status: 'new',
        filled_quantity: 0,
        metadata: orderData.metadata
      })
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
export async function createBracketOrder(orderData: {
  farm_id: string;
  agent_id?: string;
  exchange: string;
  exchange_account_id?: string;
  symbol: string;
  side: 'buy' | 'sell';
  quantity: number;
  entry_type: 'market' | 'limit';
  entry_price?: number;
  take_profit_price: number;
  stop_loss_price: number;
  time_in_force?: 'gtc' | 'ioc' | 'fok';
  metadata?: Record<string, any>;
}) {
  try {
    const supabase = await createServerClient();
    
    // Start a transaction
    const { data, error } = await supabase.rpc('create_bracket_order', {
      p_farm_id: orderData.farm_id,
      p_agent_id: orderData.agent_id,
      p_exchange: orderData.exchange,
      p_exchange_account_id: orderData.exchange_account_id,
      p_symbol: orderData.symbol,
      p_side: orderData.side,
      p_quantity: orderData.quantity,
      p_entry_type: orderData.entry_type,
      p_entry_price: orderData.entry_price,
      p_take_profit_price: orderData.take_profit_price,
      p_stop_loss_price: orderData.stop_loss_price,
      p_time_in_force: orderData.time_in_force || 'gtc',
      p_metadata: orderData.metadata
    });
    
    if (error) {
      console.error('Error creating bracket order:', error);
      return { success: false, error: error.message };
    }
    
    revalidatePath('/orders');
    
    return { success: true, data };
  } catch (error) {
    console.error('Error creating bracket order:', error);
    return { success: false, error: 'An unexpected error occurred' };
  }
}

/**
 * Create an iceberg order
 */
export async function createIcebergOrder(orderData: {
  farm_id: string;
  agent_id?: string;
  exchange: string;
  exchange_account_id?: string;
  symbol: string;
  side: 'buy' | 'sell';
  quantity: number;
  price: number;
  iceberg_qty: number; // Visible quantity
  time_in_force?: 'gtc' | 'ioc' | 'fok';
  metadata?: Record<string, any>;
}) {
  try {
    const supabase = await createServerClient();
    
    // Insert order into database
    const { data: order, error } = await supabase
      .from('orders')
      .insert({
        farm_id: orderData.farm_id,
        agent_id: orderData.agent_id,
        exchange: orderData.exchange,
        exchange_account_id: orderData.exchange_account_id,
        symbol: orderData.symbol,
        order_type: 'iceberg',
        side: orderData.side,
        quantity: orderData.quantity,
        price: orderData.price,
        iceberg_qty: orderData.iceberg_qty,
        time_in_force: orderData.time_in_force || 'gtc',
        status: 'new',
        filled_quantity: 0,
        metadata: orderData.metadata
      })
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
export async function createTwapOrder(orderData: {
  farm_id: string;
  agent_id?: string;
  exchange: string;
  exchange_account_id?: string;
  symbol: string;
  side: 'buy' | 'sell';
  quantity: number;
  price?: number;
  start_time: string;
  end_time: string;
  num_slices: number;
  metadata?: Record<string, any>;
}) {
  try {
    const supabase = await createServerClient();
    
    // Insert order into database
    const { data: order, error } = await supabase
      .from('orders')
      .insert({
        farm_id: orderData.farm_id,
        agent_id: orderData.agent_id,
        exchange: orderData.exchange,
        exchange_account_id: orderData.exchange_account_id,
        symbol: orderData.symbol,
        order_type: 'twap',
        side: orderData.side,
        quantity: orderData.quantity,
        price: orderData.price,
        status: 'new',
        filled_quantity: 0,
        metadata: {
          ...orderData.metadata,
          start_time: orderData.start_time,
          end_time: orderData.end_time,
          num_slices: orderData.num_slices
        }
      })
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
 * Create a VWAP order (Volume-Weighted Average Price)
 */
export async function createVwapOrder(orderData: {
  farm_id: string;
  agent_id?: string;
  exchange: string;
  exchange_account_id?: string;
  symbol: string;
  side: 'buy' | 'sell';
  quantity: number;
  price?: number;
  start_time: string;
  end_time: string;
  volume_profile: 'historical' | 'custom';
  custom_volume_profile?: number[];
  metadata?: Record<string, any>;
}) {
  try {
    const supabase = await createServerClient();
    
    // Insert order into database
    const { data: order, error } = await supabase
      .from('orders')
      .insert({
        farm_id: orderData.farm_id,
        agent_id: orderData.agent_id,
        exchange: orderData.exchange,
        exchange_account_id: orderData.exchange_account_id,
        symbol: orderData.symbol,
        order_type: 'vwap',
        side: orderData.side,
        quantity: orderData.quantity,
        price: orderData.price,
        status: 'new',
        filled_quantity: 0,
        metadata: {
          ...orderData.metadata,
          start_time: orderData.start_time,
          end_time: orderData.end_time,
          volume_profile: orderData.volume_profile,
          custom_volume_profile: orderData.custom_volume_profile
        }
      })
      .select('id')
      .single();
    
    if (error) {
      console.error('Error creating VWAP order:', error);
      return { success: false, error: error.message };
    }
    
    revalidatePath('/orders');
    
    return { success: true, data: order };
  } catch (error) {
    console.error('Error creating VWAP order:', error);
    return { success: false, error: 'An unexpected error occurred' };
  }
}

/**
 * Update a trailing stop order
 */
export async function updateTrailingStop(
  orderId: string,
  updates: {
    trail_value?: number;
    trail_type?: TrailType;
    activation_price?: number;
  }
) {
  try {
    const supabase = await createServerClient();
    
    // Update the order in the database
    const { data, error } = await supabase
      .from('orders')
      .update({
        trail_value: updates.trail_value,
        trail_type: updates.trail_type,
        activation_price: updates.activation_price,
        updated_at: new Date().toISOString()
      })
      .eq('id', orderId)
      .eq('order_type', 'trailing_stop')
      .select()
      .single();
    
    if (error) {
      console.error('Error updating trailing stop order:', error);
      return { success: false, error: error.message };
    }
    
    revalidatePath('/orders');
    
    return { success: true, data };
  } catch (error) {
    console.error('Error updating trailing stop order:', error);
    return { success: false, error: 'An unexpected error occurred' };
  }
}

/**
 * Create an order with risk check
 */
export async function createOrderWithRiskCheck(
  orderData: any,
  riskProfileId?: string
) {
  try {
    const supabase = await createServerClient();
    
    // Perform risk check via database function
    const { data: riskCheck, error: riskError } = await supabase.rpc('check_order_risk', {
      p_order_data: orderData,
      p_risk_profile_id: riskProfileId
    });
    
    if (riskError) {
      console.error('Error checking risk:', riskError);
      return { success: false, error: riskError.message };
    }
    
    // If risk check failed, return the error
    if (!riskCheck.passed) {
      return { 
        success: false, 
        error: riskCheck.message,
        data: {
          risk_check: riskCheck
        }
      };
    }
    
    // If risk check passed, create the order
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert({
        ...orderData,
        execution_risk_score: riskCheck.risk_score,
        status: 'new',
        filled_quantity: 0
      })
      .select('id')
      .single();
    
    if (orderError) {
      console.error('Error creating order:', orderError);
      return { success: false, error: orderError.message };
    }
    
    revalidatePath('/orders');
    
    return { 
      success: true, 
      data: {
        order,
        risk_check: riskCheck
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
  farmId: string,
  exchangeAccountIds?: string[]
) {
  try {
    const supabase = await createServerClient();
    
    // Call the reconciliation procedure
    const { data, error } = await supabase.rpc('reconcile_positions', {
      p_farm_id: farmId,
      p_exchange_account_ids: exchangeAccountIds
    });
    
    if (error) {
      console.error('Error reconciling positions:', error);
      return { success: false, error: error.message };
    }
    
    revalidatePath('/positions');
    
    return { success: true, data };
  } catch (error) {
    console.error('Error reconciling positions:', error);
    return { success: false, error: 'An unexpected error occurred' };
  }
}

/**
 * Calculate performance metrics for an entity
 */
export async function calculatePerformanceMetrics(params: {
  farm_id?: string;
  agent_id?: string;
  strategy_id?: string;
  period: 'daily' | 'weekly' | 'monthly' | 'yearly' | 'all_time';
  period_start?: string;
  period_end?: string;
}) {
  try {
    const supabase = await createServerClient();
    
    // Call the performance calculation procedure
    const { data, error } = await supabase.rpc('calculate_performance_metrics', {
      p_farm_id: params.farm_id,
      p_agent_id: params.agent_id,
      p_strategy_id: params.strategy_id,
      p_period: params.period,
      p_period_start: params.period_start,
      p_period_end: params.period_end
    });
    
    if (error) {
      console.error('Error calculating performance metrics:', error);
      return { success: false, error: error.message };
    }
    
    revalidatePath('/performance');
    
    return { success: true, data };
  } catch (error) {
    console.error('Error calculating performance metrics:', error);
    return { success: false, error: 'An unexpected error occurred' };
  }
}

/**
 * Create a performance alert
 */
export async function createPerformanceAlert(alertData: {
  farm_id?: string;
  agent_id?: string;
  strategy_id?: string;
  alert_type: 'drawdown' | 'win_rate' | 'volatility' | 'profit_loss' | 'custom';
  severity: 'info' | 'warning' | 'critical';
  threshold_value: number;
  current_value: number;
  message: string;
}) {
  try {
    const supabase = await createServerClient();
    
    // Insert alert into database
    const { data: alert, error } = await supabase
      .from('alerts')
      .insert({
        farm_id: alertData.farm_id,
        agent_id: alertData.agent_id,
        strategy_id: alertData.strategy_id,
        alert_type: alertData.alert_type,
        severity: alertData.severity,
        threshold_value: alertData.threshold_value,
        current_value: alertData.current_value,
        message: alertData.message,
        timestamp: new Date().toISOString(),
        acknowledged: false,
        resolved: false
      })
      .select('id')
      .single();
    
    if (error) {
      console.error('Error creating performance alert:', error);
      return { success: false, error: error.message };
    }
    
    revalidatePath('/alerts');
    
    return { success: true, data: alert };
  } catch (error) {
    console.error('Error creating performance alert:', error);
    return { success: false, error: 'An unexpected error occurred' };
  }
}

/**
 * Acknowledge a performance alert
 */
export async function acknowledgeAlert(alertId: string) {
  try {
    const supabase = await createServerClient();
    
    // Update alert in database
    const { data, error } = await supabase
      .from('alerts')
      .update({
        acknowledged: true,
        updated_at: new Date().toISOString()
      })
      .eq('id', alertId)
      .select()
      .single();
    
    if (error) {
      console.error('Error acknowledging alert:', error);
      return { success: false, error: error.message };
    }
    
    revalidatePath('/alerts');
    
    return { success: true, data };
  } catch (error) {
    console.error('Error acknowledging alert:', error);
    return { success: false, error: 'An unexpected error occurred' };
  }
}

/**
 * Resolve a performance alert
 */
export async function resolveAlert(alertId: string, resolutionNotes?: string) {
  try {
    const supabase = await createServerClient();
    
    // Update alert in database
    const { data, error } = await supabase
      .from('alerts')
      .update({
        resolved: true,
        resolution_time: new Date().toISOString(),
        resolution_notes: resolutionNotes,
        updated_at: new Date().toISOString()
      })
      .eq('id', alertId)
      .select()
      .single();
    
    if (error) {
      console.error('Error resolving alert:', error);
      return { success: false, error: error.message };
    }
    
    revalidatePath('/alerts');
    
    return { success: true, data };
  } catch (error) {
    console.error('Error resolving alert:', error);
    return { success: false, error: 'An unexpected error occurred' };
  }
}
