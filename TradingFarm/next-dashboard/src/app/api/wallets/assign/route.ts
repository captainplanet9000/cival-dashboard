import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/utils/supabase/server';

// POST /api/wallets/assign - Assign wallet to farm/agent/goal
export async function POST(req: NextRequest) {
  const supabase = createServerClient();
  const body = await req.json();
  const { wallet_id, assigned_to_type, assigned_to_id, assigned_by, metadata } = body;
  const { data, error } = await supabase.rpc('wallet_assign', {
    p_wallet_id: wallet_id,
    p_assigned_to_type: assigned_to_type,
    p_assigned_to_id: assigned_to_id,
    p_assigned_by: assigned_by,
    p_metadata: metadata || {}
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ assignment: data }, { status: 201 });
}
