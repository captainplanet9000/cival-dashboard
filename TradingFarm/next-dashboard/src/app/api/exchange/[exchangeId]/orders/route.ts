import { NextRequest, NextResponse } from 'next/server';
import { exchangeService } from '@/utils/exchange/exchange-service';
import { createServerClient } from '@/utils/supabase/server';
import { cookies } from 'next/headers';
import { OrderParams } from '@/utils/exchange/types';

// GET active orders
export async function GET(
  req: NextRequest,
  { params }: { params: { exchangeId: string } }
) {
  try {
    const cookieStore = cookies();
    const supabase = createServerClient();
    const { exchangeId } = params;
    
    // Get query parameters
    const searchParams = req.nextUrl.searchParams;
    const symbol = searchParams.get('symbol') || undefined;
    
    // Check authentication
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Check if exchange exists and belongs to the user
    const { data: configData, error: configError } = await supabase
      .from('exchange_configs')
      .select('id')
      .eq('id', exchangeId)
      .eq('user_id', session.user.id)
      .single();
    
    if (configError || !configData) {
      return NextResponse.json(
        { error: 'Exchange not found or not owned by the current user' },
        { status: 404 }
      );
    }
    
    // Check if exchange is connected
    if (!exchangeService.isExchangeConnected(exchangeId)) {
      return NextResponse.json({ error: 'Exchange not connected' }, { status: 400 });
    }
    
    // Get active orders
    const orders = await exchangeService.getActiveOrders(exchangeId, symbol);
    
    return NextResponse.json({ success: true, data: orders });
  } catch (error) {
    console.error('Exchange orders error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST create new order
export async function POST(
  req: NextRequest,
  { params }: { params: { exchangeId: string } }
) {
  try {
    const cookieStore = cookies();
    const supabase = createServerClient();
    const { exchangeId } = params;
    
    // Check authentication
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Check if exchange exists and belongs to the user
    const { data: configData, error: configError } = await supabase
      .from('exchange_configs')
      .select('id')
      .eq('id', exchangeId)
      .eq('user_id', session.user.id)
      .single();
    
    if (configError || !configData) {
      return NextResponse.json(
        { error: 'Exchange not found or not owned by the current user' },
        { status: 404 }
      );
    }
    
    // Check if exchange is connected
    if (!exchangeService.isExchangeConnected(exchangeId)) {
      return NextResponse.json({ error: 'Exchange not connected' }, { status: 400 });
    }
    
    // Parse request body
    const orderParams: OrderParams = await req.json();
    
    // Validate order parameters
    if (!orderParams.symbol) {
      return NextResponse.json({ error: 'Symbol is required' }, { status: 400 });
    }
    if (!orderParams.side || !['Buy', 'Sell'].includes(orderParams.side)) {
      return NextResponse.json({ error: 'Valid side (Buy/Sell) is required' }, { status: 400 });
    }
    if (!orderParams.orderType || !['Limit', 'Market'].includes(orderParams.orderType)) {
      return NextResponse.json({ error: 'Valid orderType (Limit/Market) is required' }, { status: 400 });
    }
    if (!orderParams.qty) {
      return NextResponse.json({ error: 'Quantity is required' }, { status: 400 });
    }
    if (orderParams.orderType === 'Limit' && !orderParams.price) {
      return NextResponse.json({ error: 'Price is required for Limit orders' }, { status: 400 });
    }
    
    // Create order
    const order = await exchangeService.createOrder(exchangeId, orderParams);
    
    // Log order creation in the database for auditing
    await supabase
      .from('order_history')
      .insert({
        user_id: session.user.id,
        exchange_id: exchangeId,
        order_id: order.orderId,
        symbol: order.symbol,
        side: order.side,
        order_type: order.orderType,
        price: order.price,
        quantity: order.qty,
        status: order.orderStatus,
        created_at: new Date().toISOString()
      });
    
    return NextResponse.json({ success: true, data: order });
  } catch (error) {
    console.error('Exchange order creation error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
