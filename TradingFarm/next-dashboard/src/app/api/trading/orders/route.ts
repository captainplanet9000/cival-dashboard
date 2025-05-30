import { NextResponse } from 'next/server';
import { createServerClient } from '@/utils/supabase/server';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const farmId = searchParams.get('farmId');
    const supabase = await createServerClient();

    let query = supabase.from('orders').select('*').in('status', ['new', 'partially_filled']);
    if (farmId) query = query.eq('farm_id', farmId);

    const { data, error } = await query;
    if (error) throw error;

    const orders = data.map((order: any) => ({
      id: order.id,
      farmId: order.farm_id,
      strategyId: order.strategy_id,
      agentId: order.agent_id,
      exchangeId: order.exchange_id,
      clientOrderId: order.client_order_id,
      symbol: order.symbol,
      side: order.side,
      type: order.type,
      status: order.status,
      quantity: order.quantity,
      price: order.price,
      filledQuantity: order.filled_quantity,
      avgPrice: order.avg_price,
      createdAt: order.created_at,
      updatedAt: order.updated_at
    }));

    return NextResponse.json({ orders });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
