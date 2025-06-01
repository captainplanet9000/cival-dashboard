import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/utils/supabase/server";

export async function POST(req: NextRequest) {
  const supabase = createServerClient();
  const { vault_id, user_id, removed_by } = await req.json();
  if (!vault_id || !user_id || !removed_by) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }
  // Remove member by deleting from vault_members or wallet_permissions
  const { error } = await supabase
    .from("wallet_permissions")
    .delete()
    .eq("vault_id", vault_id)
    .eq("user_id", user_id);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  return NextResponse.json({ success: true });
}
