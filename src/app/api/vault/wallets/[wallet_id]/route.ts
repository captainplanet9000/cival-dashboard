import { type NextRequest, NextResponse } from 'next/server'; // NextRequest can be used instead of Request for more features if needed
import { createServerClient } from '@/utils/supabase/server';
import { type Database } from '@/types/database.types';

type Wallet = Database['public']['Tables']['wallets']['Row'];

// Basic UUID validation regex
const UUID_REGEX = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;

function isValidUUID(uuid: string): boolean {
  return UUID_REGEX.test(uuid);
}

export async function GET(request: NextRequest, { params }: { params: { wallet_id: string } }) {
  const supabase = createServerClient();
  const { wallet_id } = params;

  // 1. Validate wallet_id format
  if (!isValidUUID(wallet_id)) {
    return NextResponse.json({ error: 'Invalid wallet_id format' }, { status: 400 });
  }

  // 2. Authentication
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    console.error(`GET /api/vault/wallets/${wallet_id}: Authentication error`, authError);
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // 3. Fetch Wallet
    const { data: wallet, error: fetchError } = await supabase
      .from('wallets')
      .select('*')
      .eq('wallet_id', wallet_id)
      .single();

    if (fetchError) {
      // If error is due to 'PGRST116' (No rows found), it's a 404
      if (fetchError.code === 'PGRST116') {
        console.warn(`GET /api/vault/wallets/${wallet_id}: Wallet not found`);
        return NextResponse.json({ error: 'Wallet not found' }, { status: 404 });
      }
      // Otherwise, it's a server error
      console.error(`GET /api/vault/wallets/${wallet_id}: Error fetching wallet`, fetchError);
      return NextResponse.json({ error: 'Failed to fetch wallet', details: fetchError.message }, { status: 500 });
    }

    // Note: .single() above ensures that 'wallet' is non-null if no error was thrown.
    // If fetchError occurred and was not PGRST116, it's handled.
    // If PGRST116 occurred (not found), it's handled.
    // Thus, if we reach here, 'wallet' is guaranteed to be populated.

    // 4. Authorization
    if (wallet.owner_id !== user.id || wallet.owner_type !== 'user') {
      console.warn(`GET /api/vault/wallets/${wallet_id}: User ${user.id} forbidden to access wallet owned by ${wallet.owner_id} of type ${wallet.owner_type}`);
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // 5. Response
    return NextResponse.json(wallet as Wallet, { status: 200 });

  } catch (error: any) {
    console.error(`GET /api/vault/wallets/${wallet_id}: Unhandled error`, error);
    return NextResponse.json({ error: 'Internal Server Error', details: error.message }, { status: 500 });
  }
}
