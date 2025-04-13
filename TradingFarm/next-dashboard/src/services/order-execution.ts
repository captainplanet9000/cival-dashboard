import { createServerClient } from '@/utils/supabase/server';

export interface OrderParams {
  symbol: string;
  side: 'buy' | 'sell';
  type: 'market' | 'limit' | 'stop' | 'take_profit';
  quantity: number;
  price?: number;
  stopPrice?: number;
  timeInForce?: 'GTC' | 'IOC' | 'FOK';
  clientOrderId?: string;
  strategyId?: number;
  farmId?: number;
  brainAssetIds?: number[]; // Link to brain assets that informed this order
}

export interface Order {
  id: string;
  symbol: string;
  side: 'buy' | 'sell';
  type: 'market' | 'limit' | 'stop' | 'take_profit';
  status: 'new' | 'partially_filled' | 'filled' | 'canceled' | 'rejected' | 'expired';
  quantity: number;
  price?: number;
  stopPrice?: number;
  executedQty: number;
  executedPrice?: number;
  timeInForce: 'GTC' | 'IOC' | 'FOK';
  clientOrderId?: string;
  exchangeOrderId?: string;
  exchange: string;
  strategyId?: number;
  farmId?: number;
  createdAt: string;
  updatedAt: string;
  brainAssetIds?: number[];
}

/**
 * Execute an order on the specified exchange
 */
export async function executeOrder(params: OrderParams): Promise<Order> {
  try {
    const supabase = createServerClient();
    
    // Generate a client order ID if not provided
    if (!params.clientOrderId) {
      params.clientOrderId = `order_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    }
    
    // In a real implementation, this would:
    // 1. Authenticate with the exchange
    // 2. Submit the order
    // 3. Handle the response and update the database
    
    // For now, we'll create a mock order in our database
    const newOrder = {
      client_order_id: params.clientOrderId,
      symbol: params.symbol,
      side: params.side,
      type: params.type,
      status: 'new',
      quantity: params.quantity,
      price: params.price,
      stop_price: params.stopPrice,
      executed_qty: 0,
      time_in_force: params.timeInForce || 'GTC',
      exchange: 'mock',
      strategy_id: params.strategyId,
      farm_id: params.farmId,
      brain_asset_ids: params.brainAssetIds || [],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    // Insert the order into the database
    const { data, error } = await supabase
      .from('orders')
      .insert(newOrder)
      .select()
      .single();
    
    if (error) {
      throw new Error(`Failed to create order: ${error.message}`);
    }
    
    // Format the response to match our interface
    return {
      id: data.id,
      symbol: data.symbol,
      side: data.side,
      type: data.type,
      status: data.status,
      quantity: data.quantity,
      price: data.price,
      stopPrice: data.stop_price,
      executedQty: data.executed_qty,
      executedPrice: data.executed_price,
      timeInForce: data.time_in_force,
      clientOrderId: data.client_order_id,
      exchangeOrderId: data.exchange_order_id,
      exchange: data.exchange,
      strategyId: data.strategy_id,
      farmId: data.farm_id,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
      brainAssetIds: data.brain_asset_ids
    };
    
  } catch (error) {
    console.error('Error executing order:', error);
    throw error;
  }
}

/**
 * Get an order by its ID or client order ID
 */
export async function getOrder(orderId: string, isClientOrderId: boolean = false): Promise<Order | null> {
  try {
    const supabase = createServerClient();
    
    // Query based on ID type
    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .eq(isClientOrderId ? 'client_order_id' : 'id', orderId)
      .single();
    
    if (error || !data) {
      return null;
    }
    
    // Format the response to match our interface
    return {
      id: data.id,
      symbol: data.symbol,
      side: data.side,
      type: data.type,
      status: data.status,
      quantity: data.quantity,
      price: data.price,
      stopPrice: data.stop_price,
      executedQty: data.executed_qty,
      executedPrice: data.executed_price,
      timeInForce: data.time_in_force,
      clientOrderId: data.client_order_id,
      exchangeOrderId: data.exchange_order_id,
      exchange: data.exchange,
      strategyId: data.strategy_id,
      farmId: data.farm_id,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
      brainAssetIds: data.brain_asset_ids
    };
    
  } catch (error) {
    console.error('Error getting order:', error);
    throw error;
  }
}

/**
 * Update an order's status
 */
export async function updateOrderStatus(
  orderId: string, 
  status: 'filled' | 'partially_filled' | 'canceled' | 'rejected', 
  executedQty?: number,
  executedPrice?: number
): Promise<Order | null> {
  try {
    const supabase = createServerClient();
    
    // Prepare update data
    const updateData: any = {
      status,
      updated_at: new Date().toISOString()
    };
    
    if (executedQty !== undefined) {
      updateData.executed_qty = executedQty;
    }
    
    if (executedPrice !== undefined) {
      updateData.executed_price = executedPrice;
    }
    
    // Update the order
    const { data, error } = await supabase
      .from('orders')
      .update(updateData)
      .eq('id', orderId)
      .select()
      .single();
    
    if (error || !data) {
      return null;
    }
    
    // Format the response to match our interface
    return {
      id: data.id,
      symbol: data.symbol,
      side: data.side,
      type: data.type,
      status: data.status,
      quantity: data.quantity,
      price: data.price,
      stopPrice: data.stop_price,
      executedQty: data.executed_qty,
      executedPrice: data.executed_price,
      timeInForce: data.time_in_force,
      clientOrderId: data.client_order_id,
      exchangeOrderId: data.exchange_order_id,
      exchange: data.exchange,
      strategyId: data.strategy_id,
      farmId: data.farm_id,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
      brainAssetIds: data.brain_asset_ids
    };
    
  } catch (error) {
    console.error('Error updating order status:', error);
    throw error;
  }
}

/**
 * Cancel an order
 */
export async function cancelOrder(orderId: string): Promise<boolean> {
  try {
    const supabase = createServerClient();
    
    // Get the order
    const { data: order, error: getError } = await supabase
      .from('orders')
      .select('*')
      .eq('id', orderId)
      .single();
    
    if (getError || !order) {
      return false;
    }
    
    // In a real implementation, this would:
    // 1. Authenticate with the exchange
    // 2. Submit the cancel request
    // 3. Handle the response and update the database
    
    // Update the order status
    const { error: updateError } = await supabase
      .from('orders')
      .update({
        status: 'canceled',
        updated_at: new Date().toISOString()
      })
      .eq('id', orderId);
    
    if (updateError) {
      return false;
    }
    
    return true;
    
  } catch (error) {
    console.error('Error canceling order:', error);
    return false;
  }
}
