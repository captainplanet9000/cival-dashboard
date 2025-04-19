import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/utils/supabase/server';

// POST /api/wallets - Create wallet
export async function POST(req: NextRequest) {
  const supabase = createServerClient();
  const body = await req.json();
  const {
    address, chain, type, user_id, farm_id, agent_id, vault_id, metadata
  } = body;
  const { data, error } = await supabase.rpc('wallet_create', {
    p_address: address,
    p_chain: chain,
    p_type: type,
    p_user_id: user_id,
    p_farm_id: farm_id,
    p_agent_id: agent_id,
    p_vault_id: vault_id,
    p_metadata: metadata || {}
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ wallet: data }, { status: 201 });
}

// GET /api/wallets - List wallets for authenticated user
export async function GET(req: NextRequest) {
  const supabase = createServerClient();
  const { data, error } = await supabase.from('wallets').select('*');
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ wallets: data }, { status: 200 });
}
