import { NextResponse } from 'next/server';
import { createServerClient } from '@/utils/supabase/server';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const farmId = searchParams.get('farmId');
    const supabase = createServerClient();

    let query = supabase
      .from('positions')
      .select('quantity,current_price,unrealized_pnl,realized_pnl');
    if (farmId) query = query.eq('farm_id', farmId);

    const { data, error } = await query;
    if (error) throw error;

    let totalUnrealized = 0;
    let totalRealized = 0;
    let totalValue = 0;

    data.forEach(p => {
      totalUnrealized += p.unrealized_pnl || 0;
      totalRealized += p.realized_pnl || 0;
      totalValue += Math.abs(p.quantity * p.current_price);
    });

    const metrics = {
      unrealizedPnl: totalUnrealized,
      realizedPnl: totalRealized,
      totalValue
    };

    return NextResponse.json({ metrics });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
