'use server';

// --- TEMPORARY: Mock cancelOrderById for build unblock ---
export async function cancelOrderById() { return Promise.resolve({ status: 'mocked' }); }
// --- END TEMPORARY ---


import { createServerClient } from '@/utils/supabase/server';
import { revalidatePath } from 'next/cache';

/**
 * Create a new order
 */
export async function createOrder(orderData: {
  farm_id: string;
  agent_id?: string;
  exchange: string;
  symbol: string;
  order_type: 'market' | 'limit' | 'stop' | 'stop_limit' | 'trailing_stop';
  side: 'buy' | 'sell';
  quantity: number;
  price?: number;
  stop_price?: number;
  time_in_force?: 'gtc' | 'ioc' | 'fok';
  metadata: {
    strategy_id?: string;
    reason?: string;
    [key: string]: any;
  };
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
        symbol: orderData.symbol,
        order_type: orderData.order_type,
        side: orderData.side,
        quantity: orderData.quantity,
        price: orderData.price,
        stop_price: orderData.stop_price,
        time_in_force: orderData.time_in_force || 'gtc',
        status: 'new',
        filled_quantity: 0,
        metadata: orderData.metadata
      })
      .select('id')
      .single();
    
    if (error) {
      console.error('Error creating order:', error);
      return { success: false, error: error.message };
    }
    
    revalidatePath('/orders');
    
    return { success: true, data: order };
  } catch (error) {
    console.error('Error creating order:', error);
    return { success: false, error: 'An unexpected error occurred' };
  }
}

/**
 * Update order status
 */
export async function updateOrderStatus(
  id: string,
  status: 'new' | 'open' | 'filled' | 'partial_fill' | 'canceled' | 'rejected' | 'expired',
  filledData?: {
    filled_quantity?: number;
    filled_price?: number;
    external_status?: string;
  }
) {
  try {
    const supabase = await createServerClient();
    
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
    
    // Update order in database
    const { error } = await supabase
      .from('orders')
      .update(updateData)
      .eq('id', id);
    
    if (error) {
      console.error('Error updating order status:', error);
      return { success: false, error: error.message };
    }
    
    revalidatePath('/orders');
    
    return { success: true };
  } catch (error) {
    console.error('Error updating order status:', error);
    return { success: false, error: 'An unexpected error occurred' };
  }
}

/**
 * Cancel an order
 */
export async function cancelOrder(id: string) {
  try {
    const supabase = await createServerClient();
    
    // Get order details
    const { data: order, error: fetchError } = await supabase
      .from('orders')
      .select('status, exchange, external_id')
      .eq('id', id)
      .single();
    
    if (fetchError) {
      console.error('Error fetching order:', fetchError);
      return { success: false, error: fetchError.message };
    }
    
    // Check if order can be canceled
    if (!['new', 'open', 'partial_fill'].includes(order.status)) {
      return { 
        success: false, 
        error: `Cannot cancel order with status ${order.status}` 
      };
    }
    
    // In a real implementation, this would send a cancel request to the exchange
    // For now, we'll just update the database
    
    // Update order in database
    const { error: updateError } = await supabase
      .from('orders')
      .update({
        status: 'canceled',
        updated_at: new Date().toISOString(),
        closed_at: new Date().toISOString()
      })
      .eq('id', id);
    
    if (updateError) {
      console.error('Error canceling order:', updateError);
      return { success: false, error: updateError.message };
    }
    
    revalidatePath('/orders');
    
    return { success: true };
  } catch (error) {
    console.error('Error canceling order:', error);
    return { success: false, error: 'An unexpected error occurred' };
  }
}

/**
 * Get orders by farm
 */
export async function getOrdersByFarm(farmId: string, limit: number = 50) {
  try {
    const supabase = await createServerClient();
    
    // Fetch orders from database
    const { data: orders, error } = await supabase
      .from('orders')
      .select('*')
      .eq('farm_id', farmId)
      .order('created_at', { ascending: false })
      .limit(limit);
    
    if (error) {
      console.error('Error fetching orders:', error);
      return { success: false, error: error.message };
    }
    
    return { success: true, data: orders };
  } catch (error) {
    console.error('Error fetching orders:', error);
    return { success: false, error: 'An unexpected error occurred' };
  }
}

/**
 * Get orders by agent
 */
export async function getOrdersByAgent(agentId: string, limit: number = 50) {
  try {
    const supabase = await createServerClient();
    
    // Fetch orders from database
    const { data: orders, error } = await supabase
      .from('orders')
      .select('*')
      .eq('agent_id', agentId)
      .order('created_at', { ascending: false })
      .limit(limit);
    
    if (error) {
      console.error('Error fetching orders:', error);
      return { success: false, error: error.message };
    }
    
    return { success: true, data: orders };
  } catch (error) {
    console.error('Error fetching orders:', error);
    return { success: false, error: 'An unexpected error occurred' };
  }
}

/**
 * Get order details with trades
 */
export async function getOrderWithTrades(id: string) {
  try {
    const supabase = await createServerClient();
    
    // Fetch order from database
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('*')
      .eq('id', id)
      .single();
    
    if (orderError) {
      console.error('Error fetching order:', orderError);
      return { success: false, error: orderError.message };
    }
    
    // Fetch trades for this order
    const { data: trades, error: tradesError } = await supabase
      .from('trades')
      .select('*')
      .eq('order_id', id)
      .order('executed_at', { ascending: true });
    
    if (tradesError) {
      console.error('Error fetching trades:', tradesError);
      // Non-critical error, continue with empty trades array
    }
    
    return { 
      success: true, 
      data: {
        ...order,
        trades: trades || []
      }
    };
  } catch (error) {
    console.error('Error fetching order details:', error);
    return { success: false, error: 'An unexpected error occurred' };
  }
}

/**
 * Create a new trade for an order
 */
export async function createTrade(tradeData: {
  order_id: string;
  external_id?: string;
  symbol: string;
  exchange: string;
  side: 'buy' | 'sell';
  quantity: number;
  price: number;
  fee?: number;
  fee_currency?: string;
  executed_at?: string;
  metadata?: {
    taker?: boolean;
    [key: string]: any;
  };
}) {
  try {
    const supabase = await createServerClient();
    
    // Insert trade into database
    const { data: trade, error } = await supabase
      .from('trades')
      .insert({
        order_id: tradeData.order_id,
        external_id: tradeData.external_id,
        symbol: tradeData.symbol,
        exchange: tradeData.exchange,
        side: tradeData.side,
        quantity: tradeData.quantity,
        price: tradeData.price,
        fee: tradeData.fee,
        fee_currency: tradeData.fee_currency,
        executed_at: tradeData.executed_at || new Date().toISOString(),
        metadata: tradeData.metadata || {}
      })
      .select('id')
      .single();
    
    if (error) {
      console.error('Error creating trade:', error);
      return { success: false, error: error.message };
    }
    
    // Update order status based on new trade
    await updateOrderAfterTrade(tradeData.order_id);
    
    revalidatePath('/orders');
    
    return { success: true, data: trade };
  } catch (error) {
    console.error('Error creating trade:', error);
    return { success: false, error: 'An unexpected error occurred' };
  }
}

/**
 * Update order status after a trade
 */
async function updateOrderAfterTrade(orderId: string) {
  try {
    const supabase = await createServerClient();
    
    // Get order details
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('*')
      .eq('id', orderId)
      .single();
    
    if (orderError) {
      console.error('Error fetching order for update after trade:', orderError);
      return;
    }
    
    // Get all trades for this order
    const { data: trades, error: tradesError } = await supabase
      .from('trades')
      .select('quantity')
      .eq('order_id', orderId);
    
    if (tradesError) {
      console.error('Error fetching trades for order update:', tradesError);
      return;
    }
    
    // Calculate total filled quantity
    const filledQuantity = trades.reduce((sum: number, trade: any) => sum + trade.quantity, 0);
    
    // Determine new status
    let newStatus = 'open';
    if (filledQuantity >= order.quantity) {
      newStatus = 'filled';
    } else if (filledQuantity > 0) {
      newStatus = 'partial_fill';
    }
    
    // Calculate average filled price
    const totalValue = trades.reduce((sum: number, trade: any) => sum + (trade.quantity * trade.price), 0);
    const avgFilledPrice = filledQuantity > 0 ? totalValue / filledQuantity : undefined;
    
    // Update order
    const { error: updateError } = await supabase
      .from('orders')
      .update({
        status: newStatus,
        filled_quantity: filledQuantity,
        filled_price: avgFilledPrice,
        updated_at: new Date().toISOString(),
        closed_at: newStatus === 'filled' ? new Date().toISOString() : order.closed_at
      })
      .eq('id', orderId);
    
    if (updateError) {
      console.error('Error updating order after trade:', updateError);
    }
  } catch (error) {
    console.error('Error updating order after trade:', error);
  }
}

/**
 * Get open orders
 */
export async function getOpenOrders(farmId?: string, agentId?: string) {
  try {
    const supabase = await createServerClient();
    
    // Build query
    let query = supabase
      .from('orders')
      .select('*')
      .in('status', ['new', 'open', 'partial_fill']);
    
    if (farmId) {
      query = query.eq('farm_id', farmId);
    }
    
    if (agentId) {
      query = query.eq('agent_id', agentId);
    }
    
    // Execute query
    const { data: orders, error } = await query.order('created_at', { ascending: false });
    
    if (error) {
      console.error('Error fetching open orders:', error);
      return { success: false, error: error.message };
    }
    
    return { success: true, data: orders };
  } catch (error) {
    console.error('Error fetching open orders:', error);
    return { success: false, error: 'An unexpected error occurred' };
  }
}
