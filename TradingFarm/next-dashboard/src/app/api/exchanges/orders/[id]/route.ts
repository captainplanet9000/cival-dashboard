import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/utils/supabase/server';
import { createExchangeService, ExchangeType } from '@/services/exchange-service';
import { z } from 'zod';

// Schema for order cancellation
const cancelSchema = z.object({
  exchange: z.enum(['bybit', 'coinbase', 'hyperliquid', 'mock']),
  symbol: z.string(),
  farm_id: z.number().optional()
});

/**
 * GET endpoint to fetch details for a specific order
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const orderId = params.id;
    
    if (!orderId) {
      return NextResponse.json(
        { error: 'Invalid order ID' },
        { status: 400 }
      );
    }
    
    // Authentication is required to access order information
    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    // Get query parameters
    const { searchParams } = new URL(request.url);
    const exchange = searchParams.get('exchange') as ExchangeType || 'mock';
    const symbol = searchParams.get('symbol');
    
    if (!symbol) {
      return NextResponse.json(
        { error: 'Symbol is required' },
        { status: 400 }
      );
    }
    
    // First, check if we have the order in our database
    const { data: orderData, error: orderError } = await supabase
      .from('orders')
      .select('*')
      .eq('exchange_order_id', orderId)
      .eq('user_id', user.id)
      .single();
    
    if (orderData) {
      return NextResponse.json({ order: orderData });
    }
    
    // If not in our database, fetch from the exchange
    const exchangeService = await createExchangeService(exchange, user.id);
    
    // Note: This is a simplified approach since most exchanges don't have a dedicated
    // endpoint to fetch a single order by ID. In a real implementation, you might
    // need to fetch all orders and filter by ID.
    const orders = await exchangeService.getActiveOrders(symbol);
    const order = orders.orders?.find((o: any) => o.orderId === orderId);
    
    if (!order) {
      // Try to find in order history
      const historyOrders = await exchangeService.getOrderHistory(symbol);
      const historyOrder = historyOrders.orders?.find((o: any) => o.orderId === orderId);
      
      if (!historyOrder) {
        return NextResponse.json(
          { error: 'Order not found' },
          { status: 404 }
        );
      }
      
      return NextResponse.json({ order: historyOrder });
    }
    
    return NextResponse.json({ order });
  } catch (error) {
    console.error(`Error in GET /api/exchanges/orders/${params.id}:`, error);
    return NextResponse.json(
      { error: 'Failed to fetch order details' },
      { status: 500 }
    );
  }
}

/**
 * DELETE endpoint to cancel an order
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const orderId = params.id;
    
    if (!orderId) {
      return NextResponse.json(
        { error: 'Invalid order ID' },
        { status: 400 }
      );
    }
    
    // Authentication is required to cancel orders
    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    // Get body parameters
    const body = await request.json();
    const validation = cancelSchema.safeParse(body);
    
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid cancel parameters', details: validation.error.format() },
        { status: 400 }
      );
    }
    
    const { exchange, symbol, farm_id } = validation.data;
    
    // If this order is associated with a farm, verify the user owns the farm
    if (farm_id) {
      const { data: farm, error: farmError } = await supabase
        .from('farms')
        .select('id')
        .eq('id', farm_id)
        .eq('user_id', user.id)
        .single();
      
      if (farmError || !farm) {
        return NextResponse.json(
          { error: 'Farm not found or access denied' },
          { status: 403 }
        );
      }
    }
    
    // Create the exchange service
    const exchangeService = await createExchangeService(exchange, user.id);
    
    // Cancel the order
    const result = await exchangeService.cancelOrder(orderId, symbol);
    
    // Update the order status in our database if it exists
    const { data: orderData, error: orderError } = await supabase
      .from('orders')
      .select('id')
      .eq('exchange_order_id', orderId)
      .eq('user_id', user.id)
      .single();
    
    if (orderData) {
      await supabase
        .from('orders')
        .update({
          status: 'CANCELLED',
          updated_at: new Date().toISOString()
        })
        .eq('id', orderData.id);
    }
    
    // Log the order cancellation
    if (farm_id) {
      try {
        await supabase.from('order_history').insert({
          user_id: user.id,
          farm_id,
          exchange,
          order_id: orderData?.id,
          exchange_order_id: orderId,
          action_type: 'cancel',
          status: 'success',
          metadata: {
            symbol,
            timestamp: new Date().toISOString(),
            response: result
          }
        });
      } catch (logError) {
        console.warn('Failed to log order cancellation:', logError);
      }
    }
    
    return NextResponse.json({
      message: 'Order cancelled successfully',
      result
    });
  } catch (error) {
    console.error(`Error in DELETE /api/exchanges/orders/${params.id}:`, error);
    return NextResponse.json(
      { error: 'Failed to cancel order' },
      { status: 500 }
    );
  }
}
