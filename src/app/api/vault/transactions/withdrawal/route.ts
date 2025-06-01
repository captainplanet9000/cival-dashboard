import { type NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/utils/supabase/server';
// Removed unused Database type from here
// import { type Database } from '@/types/database.types';
import {
  performWithdrawal,
  WalletNotFoundError,
  ForbiddenError,
  InactiveWalletError,
  InsufficientFundsError,
  OperationFailedError
} from '../../../../lib/services/vaultService'; // Adjusted path
// Import type WalletTransaction if needed for response, or rely on inference
// For now, assume the type from service function return is sufficient for NextResponse.json

// Basic UUID validation regex - keep for API level validation
const UUID_REGEX = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;

function isValidUUID(uuid: string): boolean {
  return UUID_REGEX.test(uuid);
}

interface WithdrawalRequestBody {
  wallet_id: string;
  amount: number;
  description?: string;
}

export async function POST(request: NextRequest) {
  const supabase = createServerClient();

  // 1. Authentication
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    console.error('POST /api/vault/transactions/withdrawal: Authentication error', authError);
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // 2. Request Body Parsing and Basic Validation
  let requestData: WithdrawalRequestBody;
  try {
    requestData = await request.json();
  } catch (error) {
    console.error('POST /api/vault/transactions/withdrawal: Error parsing request body', error);
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const { wallet_id, amount, description } = requestData;

  if (!wallet_id || !isValidUUID(wallet_id)) {
    return NextResponse.json({ error: 'Valid wallet_id is required' }, { status: 400 });
  }
  if (typeof amount !== 'number' || amount <= 0) {
    return NextResponse.json({ error: 'Amount must be a positive number' }, { status: 400 });
  }
  if (description && typeof description !== 'string') {
    return NextResponse.json({ error: 'Description must be a string' }, { status: 400 });
  }

  try {
    // 3. Call the service function
    const createdTransaction = await performWithdrawal(
      supabase,
      user.id,
      wallet_id,
      amount,
      description
    );

    // 4. Success Response
    return NextResponse.json(createdTransaction, { status: 201 });

  } catch (error: any) {
    // 5. Error Handling based on custom error types
    if (error instanceof WalletNotFoundError) {
      console.warn(`POST /api/vault/transactions/withdrawal: WalletNotFound - ${error.message}`);
      return NextResponse.json({ error: error.message }, { status: 404 });
    } else if (error instanceof ForbiddenError) {
      console.warn(`POST /api/vault/transactions/withdrawal: Forbidden - ${error.message}`);
      return NextResponse.json({ error: error.message }, { status: 403 });
    } else if (error instanceof InactiveWalletError) {
      console.warn(`POST /api/vault/transactions/withdrawal: InactiveWallet - ${error.message}`);
      return NextResponse.json({ error: error.message }, { status: 400 });
    } else if (error instanceof InsufficientFundsError) {
      console.warn(`POST /api/vault/transactions/withdrawal: InsufficientFunds - ${error.message}`);
      return NextResponse.json({ error: error.message }, { status: 400 });
    } else if (error instanceof OperationFailedError) {
      console.error(`POST /api/vault/transactions/withdrawal: OperationFailed - ${error.message}`, error.transactionId ? `Transaction ID: ${error.transactionId}` : '');
      const responseBody: { error: string; details: string; transaction_id?: string } = {
        error: 'Withdrawal operation failed',
        details: error.message,
      };
      if (error.transactionId) {
        responseBody.transaction_id = error.transactionId;
      }
      return NextResponse.json(responseBody, { status: 500 });
    } else {
      console.error('POST /api/vault/transactions/withdrawal: Unhandled error', error);
      return NextResponse.json({ error: 'Internal Server Error', details: error.message }, { status: 500 });
    }
  }
}
