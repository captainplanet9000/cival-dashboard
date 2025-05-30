import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/utils/supabase/server";

export async function GET(req: NextRequest) {
  const supabase = createServerClient();
  const { searchParams } = new URL(req.url);
  const wallet_id = searchParams.get("wallet_id");
  if (!wallet_id) {
    return NextResponse.json({ error: "Missing wallet_id" }, { status: 400 });
  }
  // Fetch transactions for this wallet (either as sender or receiver)
  const { data, error } = await supabase
    .from("wallet_transactions")
    .select("*")
    .or(`from_wallet_id.eq.${wallet_id},to_wallet_id.eq.${wallet_id}`)
    .order("created_at", { ascending: false });
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  return NextResponse.json({ transactions: data });
}
