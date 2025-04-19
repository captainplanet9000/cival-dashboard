import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/utils/supabase/server';

// POST /api/wallets/permissions - Grant permission to user for wallet
export async function POST(req: NextRequest) {
  const supabase = createServerClient();
  const body = await req.json();
  const { wallet_id, user_id, role, granted_by } = body;
  const { data, error } = await supabase.rpc('wallet_grant_permission', {
    p_wallet_id: wallet_id,
    p_user_id: user_id,
    p_role: role,
    p_granted_by: granted_by
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ permission: data }, { status: 201 });
}
