import { NextResponse } from 'next/server';
import { createServerClient } from '@/utils/supabase/server';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const farmId = searchParams.get('farmId');
    const supabase = createServerClient();

    let query = supabase.from('trades').select('*').order('executed_at', { ascending: false }).limit(50);
    if (farmId) query = query.eq('farm_id', farmId);

    const { data, error } = await query;
    if (error) throw error;

    const trades = data.map(trade => ({
      id: trade.id,
      farmId: trade.farm_id,
      strategyId: trade.strategy_id,
      agentId: trade.agent_id,
      symbol: trade.symbol,
      side: trade.side,
      price: trade.price,
      quantity: trade.quantity,
      fee: trade.fee,
      timestamp: trade.executed_at
    }));

    return NextResponse.json({ trades });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
