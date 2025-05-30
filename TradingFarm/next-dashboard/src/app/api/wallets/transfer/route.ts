import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/utils/supabase/server';

// POST /api/wallets/transfer - Transfer funds between wallets
export async function POST(req: NextRequest) {
  const supabase = createServerClient();
  const body = await req.json();
  const { from_wallet_id, to_wallet_id, asset, amount, initiated_by, metadata } = body;
  const { data, error } = await supabase.rpc('wallet_transfer', {
    p_from_wallet_id: from_wallet_id,
    p_to_wallet_id: to_wallet_id,
    p_asset: asset,
    p_amount: amount,
    p_initiated_by: initiated_by,
    p_metadata: metadata || {}
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ transaction: data }, { status: 201 });
}
