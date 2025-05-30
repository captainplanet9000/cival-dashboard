import { type NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/utils/supabase/server'; // Assuming this path is correct
import { type Database } from '@/types/database.types'; // Assuming this path is correct

type Wallet = Database['public']['Tables']['wallets']['Row'];
type WalletInsert = Database['public']['Tables']['wallets']['Insert'];

export async function GET(request: NextRequest) {
  const supabase = createServerClient();

  // 1. Authentication
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    console.error('GET /api/vault/wallets: Authentication error', authError);
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // 2. Fetch Wallets
    const { data: userWallets, error: fetchError } = await supabase
      .from('wallets')
      .select('*')
      .eq('owner_id', user.id)
      .eq('owner_type', 'user');

    if (fetchError) {
      console.error('GET /api/vault/wallets: Error fetching wallets', fetchError);
      return NextResponse.json({ error: 'Failed to fetch wallets', details: fetchError.message }, { status: 500 });
    }

    // 3. Response
    return NextResponse.json(userWallets as Wallet[], { status: 200 });

  } catch (error: any) {
    console.error('GET /api/vault/wallets: Unhandled error', error);
    return NextResponse.json({ error: 'Internal Server Error', details: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const supabase = createServerClient();

  // 1. Authentication
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    console.error('POST /api/vault/wallets: Authentication error', authError);
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // 2. Request Body Parsing and Validation
  let requestData: { currency: string };
  try {
    requestData = await request.json();
  } catch (error) {
    console.error('POST /api/vault/wallets: Error parsing request body', error);
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const { currency } = requestData;

  if (!currency || typeof currency !== 'string') {
    return NextResponse.json({ error: 'Currency is required and must be a string' }, { status: 400 });
  }

  try {
    // 3. Validate currency exists in supported_currencies
    const { data: supportedCurrency, error: currencyError } = await supabase
      .from('supported_currencies')
      .select('currency_code')
      .eq('currency_code', currency)
      .single();

    if (currencyError || !supportedCurrency) {
      console.error('POST /api/vault/wallets: Currency validation error', currencyError);
      return NextResponse.json({ error: `Currency ${currency} is not supported or query failed` }, { status: 400 });
    }

    // 4. Wallet Creation
    const newWalletData: WalletInsert = {
      owner_id: user.id,
      owner_type: 'user',
      currency: currency, // This is the validated currency_code
      balance: 0,
      status: 'active',
    };

    const { data: createdWallet, error: insertError } = await supabase
      .from('wallets')
      .insert(newWalletData)
      .select()
      .single(); // Assuming you want to return the created wallet

    if (insertError) {
      console.error('POST /api/vault/wallets: Error inserting wallet', insertError);
      return NextResponse.json({ error: 'Failed to create wallet', details: insertError.message }, { status: 500 });
    }

    // 5. Response
    return NextResponse.json(createdWallet as Wallet, { status: 201 });

  } catch (error: any) {
    console.error('POST /api/vault/wallets: Unhandled error', error);
    return NextResponse.json({ error: 'Internal Server Error', details: error.message }, { status: 500 });
  }
}
