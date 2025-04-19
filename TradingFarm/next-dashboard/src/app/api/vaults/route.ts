import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/utils/supabase/server';

// POST /api/vaults - Create vault
export async function POST(req: NextRequest) {
  const supabase = createServerClient();
  const body = await req.json();
  const { name, description, owner_id, metadata } = body;
  const { data, error } = await supabase.rpc('vault_create', {
    p_name: name,
    p_description: description,
    p_owner_id: owner_id,
    p_metadata: metadata || {}
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ vault: data }, { status: 201 });
}
