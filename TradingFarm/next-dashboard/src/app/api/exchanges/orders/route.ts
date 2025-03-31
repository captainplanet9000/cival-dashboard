import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/utils/supabase/server';
import { createExchangeService, ExchangeType, OrderParams } from '@/services/exchange-service';
import { z } from 'zod';

// Schema for validating order placement
const orderSchema = z.object({
  exchange: z.enum(['bybit', 'coinbase', 'hyperliquid', 'mock']),
  symbol: z.string(),
  side: z.enum(['Buy', 'Sell']),
  orderType: z.enum(['Market', 'Limit']),
  quantity: z.number().positive(),
  price: z.number().positive().optional(),
  timeInForce: z.enum(['GTC', 'IOC', 'FOK']).optional(),
  reduceOnly: z.boolean().optional(),
  farm_id: z.number().optional()
});

/**
 * GET endpoint to fetch active orders or order history
 */
export async function GET(request: NextRequest) {
  try {
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
    const symbol = searchParams.get('symbol') || undefined;
    const history = searchParams.get('history') === 'true';
    const farmIdParam = searchParams.get('farm_id');
    const farmId = farmIdParam ? parseInt(farmIdParam) : undefined;
    
    // Create the exchange service
    const exchangeService = await createExchangeService(exchange, user.id);
    
    // Fetch either active orders or order history
    const orders = history
      ? await exchangeService.getOrderHistory(symbol)
      : await exchangeService.getActiveOrders(symbol);
    
    // If a farmId was provided, log the order fetch in the order_history table
    if (farmId) {
      try {
        await supabase.from('order_history').insert({
          user_id: user.id,
          farm_id: farmId,
          exchange,
          action_type: history ? 'fetch_history' : 'fetch_active',
          metadata: {
            symbol,
            timestamp: new Date().toISOString()
          }
        });
      } catch (logError) {
        console.warn('Failed to log order fetch:', logError);
      }
    }
    
    return NextResponse.json({
      exchange,
      history,
      symbol,
      orders
    });
  } catch (error) {
    console.error('Error in GET /api/exchanges/orders:', error);
    return NextResponse.json(
      { error: 'Failed to fetch orders' },
      { status: 500 }
    );
  }
}

/**
 * POST endpoint to place a new order
 */
export async function POST(request: NextRequest) {
  try {
    // Authentication is required to place orders
    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    // Parse and validate the request body
    const body = await request.json();
    const validation = orderSchema.safeParse(body);
    
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid order parameters', details: validation.error.format() },
        { status: 400 }
      );
    }
    
    const validatedOrder = validation.data;
    const { exchange, farm_id, ...orderParams } = validatedOrder;
    
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
    
    // Place the order
    const orderResult = await exchangeService.placeOrder(orderParams as OrderParams);
    
    // Log the order placement
    if (farm_id) {
      try {
        await supabase.from('orders').insert({
          user_id: user.id,
          farm_id,
          exchange,
          symbol: orderParams.symbol,
          side: orderParams.side,
          order_type: orderParams.orderType,
          quantity: orderParams.quantity,
          price: orderParams.price || null,
          status: 'PLACED',
          exchange_order_id: orderResult.orderId || null,
          metadata: {
            timeInForce: orderParams.timeInForce,
            reduceOnly: orderParams.reduceOnly,
            response: orderResult
          }
        });
      } catch (logError) {
        console.warn('Failed to log order placement:', logError);
      }
    }
    
    return NextResponse.json({
      message: 'Order placed successfully',
      order: orderResult
    });
  } catch (error) {
    console.error('Error in POST /api/exchanges/orders:', error);
    return NextResponse.json(
      { error: 'Failed to place order' },
      { status: 500 }
    );
  }
}
