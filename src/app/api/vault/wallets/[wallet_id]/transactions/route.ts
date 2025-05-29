import { type NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/utils/supabase/server';
import { type Database } from '@/types/database.types';

type WalletTransaction = Database['public']['Tables']['wallet_transactions']['Row'];

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
    console.error(`GET /api/vault/wallets/${wallet_id}/transactions: Authentication error`, authError);
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // 3. Verify Wallet Ownership
    const { data: wallet, error: walletFetchError } = await supabase
      .from('wallets')
      .select('owner_id, owner_type')
      .eq('wallet_id', wallet_id)
      .single();

    if (walletFetchError) {
      if (walletFetchError.code === 'PGRST116') { // No rows found
        console.warn(`GET /api/vault/wallets/${wallet_id}/transactions: Wallet not found`);
        return NextResponse.json({ error: 'Wallet not found' }, { status: 404 });
      }
      console.error(`GET /api/vault/wallets/${wallet_id}/transactions: Error fetching wallet`, walletFetchError);
      return NextResponse.json({ error: 'Failed to verify wallet', details: walletFetchError.message }, { status: 500 });
    }

    if (wallet.owner_id !== user.id || wallet.owner_type !== 'user') {
      console.warn(`GET /api/vault/wallets/${wallet_id}/transactions: User ${user.id} forbidden to access transactions for wallet owned by ${wallet.owner_id} of type ${wallet.owner_type}`);
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // 4. Fetch Transactions
    // The .or() condition should be: source_wallet_id.eq.WALLET_ID,destination_wallet_id.eq.WALLET_ID
    const { data: transactions, error: transactionsFetchError } = await supabase
      .from('wallet_transactions')
      .select('*')
      .or(`source_wallet_id.eq.${wallet_id},destination_wallet_id.eq.${wallet_id}`)
      .order('transaction_timestamp', { ascending: false });

    if (transactionsFetchError) {
      console.error(`GET /api/vault/wallets/${wallet_id}/transactions: Error fetching transactions`, transactionsFetchError);
      return NextResponse.json({ error: 'Failed to fetch transactions', details: transactionsFetchError.message }, { status: 500 });
    }

    // 5. Response
    return NextResponse.json(transactions as WalletTransaction[], { status: 200 });

  } catch (error: any) {
    console.error(`GET /api/vault/wallets/${wallet_id}/transactions: Unhandled error`, error);
    return NextResponse.json({ error: 'Internal Server Error', details: error.message }, { status: 500 });
  }
}
