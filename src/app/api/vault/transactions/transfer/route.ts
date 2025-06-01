import { type NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/utils/supabase/server';
// Removed unused Database, Wallet, WalletTransactionInsert types
import {
  performTransfer,
  WalletNotFoundError,
  ForbiddenError,
  InactiveWalletError,
  InsufficientFundsError,
  CurrencyMismatchError,
  OperationFailedError
} from '../../../../lib/services/vaultService'; // Adjusted path
// Import type WalletTransaction if needed for response, or rely on inference

// Basic UUID validation regex - keep for API level validation
const UUID_REGEX = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;

function isValidUUID(uuid: string): boolean {
  return UUID_REGEX.test(uuid);
}

interface TransferRequestBody {
  source_wallet_id: string;
  destination_wallet_id: string;
  amount: number;
  description?: string;
}

// Removed unused updateWalletBalance helper from API route

export async function POST(request: NextRequest) {
  const supabase = createServerClient();

  // 1. Authentication
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    console.error('POST /api/vault/transactions/transfer: Authentication error', authError);
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // 2. Request Body Parsing and Basic Validation
  let requestData: TransferRequestBody;
  try {
    requestData = await request.json();
  } catch (error) {
    console.error('POST /api/vault/transactions/transfer: Error parsing request body', error);
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const { source_wallet_id, destination_wallet_id, amount, description } = requestData;

  if (!source_wallet_id || !isValidUUID(source_wallet_id)) {
    return NextResponse.json({ error: 'Valid source_wallet_id is required' }, { status: 400 });
  }
  if (!destination_wallet_id || !isValidUUID(destination_wallet_id)) {
    return NextResponse.json({ error: 'Valid destination_wallet_id is required' }, { status: 400 });
  }
  if (source_wallet_id === destination_wallet_id) {
    return NextResponse.json({ error: 'Source and destination wallets cannot be the same' }, { status: 400 });
  }
  if (typeof amount !== 'number' || amount <= 0) {
    return NextResponse.json({ error: 'Amount must be a positive number' }, { status: 400 });
  }
  if (description && typeof description !== 'string') {
    return NextResponse.json({ error: 'Description must be a string' }, { status: 400 });
  }

  try {
    // 3. Call the service function
    const createdTransaction = await performTransfer(
      supabase,
      user.id,
      source_wallet_id,
      destination_wallet_id,
      amount,
      description
    );

    // 4. Success Response
    return NextResponse.json(createdTransaction, { status: 201 });

  } catch (error: any) {
    // 5. Error Handling based on custom error types
    if (error instanceof WalletNotFoundError) {
      console.warn(`POST /api/vault/transactions/transfer: WalletNotFound - ${error.message}`);
      return NextResponse.json({ error: error.message }, { status: 404 });
    } else if (error instanceof ForbiddenError) {
      console.warn(`POST /api/vault/transactions/transfer: Forbidden - ${error.message}`);
      return NextResponse.json({ error: error.message }, { status: 403 });
    } else if (error instanceof InactiveWalletError) {
      console.warn(`POST /api/vault/transactions/transfer: InactiveWallet - ${error.message}`);
      return NextResponse.json({ error: error.message }, { status: 400 });
    } else if (error instanceof InsufficientFundsError) {
      console.warn(`POST /api/vault/transactions/transfer: InsufficientFunds - ${error.message}`);
      return NextResponse.json({ error: error.message }, { status: 400 });
    } else if (error instanceof CurrencyMismatchError) {
      console.warn(`POST /api/vault/transactions/transfer: CurrencyMismatch - ${error.message}`);
      return NextResponse.json({ error: error.message }, { status: 400 });
    } else if (error instanceof OperationFailedError) {
      console.error(`POST /api/vault/transactions/transfer: OperationFailed - ${error.message}`);
      // The service function's OperationFailedError for transfers already includes detailed messages 
      // about revert success/failure or critical inconsistencies.
      return NextResponse.json({ error: 'Transfer operation failed', details: error.message }, { status: 500 });
    } else {
      console.error('POST /api/vault/transactions/transfer: Unhandled error', error);
      return NextResponse.json({ error: 'Internal Server Error', details: error.message }, { status: 500 });
    }
  }
}
