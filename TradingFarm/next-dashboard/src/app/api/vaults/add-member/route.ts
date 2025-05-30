import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/utils/supabase/server';

// POST /api/vaults/add-member - Add user as member to vault
export async function POST(req: NextRequest) {
  const supabase = createServerClient();
  const body = await req.json();
  const { vault_id, user_id, role, added_by } = body;
  const { data, error } = await supabase.rpc('vault_add_member', {
    p_vault_id: vault_id,
    p_user_id: user_id,
    p_role: role,
    p_added_by: added_by
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ permission: data }, { status: 201 });
}
