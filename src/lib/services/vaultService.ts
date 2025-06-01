import { type SupabaseClient } from '@/utils/supabase/server'; // Adjusted for SupabaseClient type
import { type Database } from '@/types/database.types';

// Custom Error Classes
export class WalletNotFoundError extends Error {
  constructor(message: string = "Wallet not found") {
    super(message);
    this.name = "WalletNotFoundError";
  }
}

export class CurrencyMismatchError extends Error {
  constructor(message: string = "Currency mismatch between wallets") {
    super(message);
    this.name = "CurrencyMismatchError";
  }
}

export class ForbiddenError extends Error {
  constructor(message: string = "Forbidden") {
    super(message);
    this.name = "ForbiddenError";
  }
}

export class InactiveWalletError extends Error {
  constructor(message: string = "Wallet is not active") {
    super(message);
    this.name = "InactiveWalletError";
  }
}

// Note: InsufficientFundsError is not explicitly for deposit, but good to have for consistency if needed elsewhere.
// For deposit, this is not applicable. For withdrawal/transfer, it would be.
export class InsufficientFundsError extends Error {
  constructor(message: string = "Insufficient funds") {
    super(message);
    this.name = "InsufficientFundsError";
  }
}

export class OperationFailedError extends Error {
  transactionId?: string;
  constructor(message: string, transactionId?: string) {
    super(message);
    this.name = "OperationFailedError";
    this.transactionId = transactionId;
  }
}

type Wallet = Database['public']['Tables']['wallets']['Row'];
type WalletTransaction = Database['public']['Tables']['wallet_transactions']['Row'];
type WalletTransactionInsert = Database['public']['Tables']['wallet_transactions']['Insert'];

export async function performDeposit(
  supabase: SupabaseClient<Database>,
  userId: string,
  walletId: string,
  amount: number,
  description?: string
): Promise<WalletTransaction> {
  // 1. Fetch the target wallet
  const { data: targetWallet, error: walletFetchError } = await supabase
    .from('wallets')
    .select('owner_id, owner_type, currency, status, balance')
    .eq('wallet_id', walletId)
    .single();

  if (walletFetchError) {
    if (walletFetchError.code === 'PGRST116') { // No rows found
      throw new WalletNotFoundError(`Wallet with ID ${walletId} not found.`);
    }
    console.error(`performDeposit: Error fetching wallet ${walletId}`, walletFetchError);
    throw new OperationFailedError(`Failed to fetch wallet: ${walletFetchError.message}`);
  }

  // 2. Verify ownership and type
  if (targetWallet.owner_id !== userId || targetWallet.owner_type !== 'user') {
    throw new ForbiddenError(`User ${userId} is not authorized to deposit to wallet ${walletId}.`);
  }

  // 3. Verify wallet status
  if (targetWallet.status !== 'active') {
    throw new InactiveWalletError(`Wallet ${walletId} is not active. Current status: ${targetWallet.status}.`);
  }

  // 4. Create Transaction Record
  const transactionRecord: WalletTransactionInsert = {
    destination_wallet_id: walletId,
    source_wallet_id: null, // Deposit from external
    amount: amount,
    currency: targetWallet.currency,
    type: 'deposit',
    status: 'completed', // Assume completion for deposit simulation
    description: description || `Deposit to wallet ${walletId.substring(0, 8)}...`,
  };

  const { data: createdTransaction, error: transactionInsertError } = await supabase
    .from('wallet_transactions')
    .insert(transactionRecord)
    .select()
    .single();

  if (transactionInsertError || !createdTransaction) {
    console.error(`performDeposit: Error creating transaction record for wallet ${walletId}`, transactionInsertError);
    throw new OperationFailedError(`Failed to create deposit transaction record: ${transactionInsertError?.message || 'Unknown error'}`);
  }

  // 5. Update Wallet Balance
  const currentBalance = typeof targetWallet.balance === 'string' ? parseFloat(targetWallet.balance) : targetWallet.balance;
  const newBalance = currentBalance + amount;

  const { error: balanceUpdateError } = await supabase
    .from('wallets')
    .update({ balance: newBalance })
    .eq('wallet_id', walletId);

  if (balanceUpdateError) {
    console.error(`performDeposit: Error updating balance for wallet ${walletId} after transaction ${createdTransaction.transaction_id}. CRITICAL INCONSISTENCY.`, balanceUpdateError);
    // As per requirements, if balance update fails, the transaction record (already marked 'completed') is an inconsistency.
    // The service should throw, and the API maps to 500.
    // For now, we don't try to mark the transaction as 'failed' here to keep it simpler, 
    // but acknowledge this is a critical state.
    throw new OperationFailedError(
      `Deposit transaction recorded (ID: ${createdTransaction.transaction_id}), but failed to update wallet balance. Please contact support.`,
      createdTransaction.transaction_id
    );
  }

  return createdTransaction as WalletTransaction;
}

async function updateWalletBalance(
  supabase: SupabaseClient<Database>,
  wallet_id: string,
  newBalance: number,
  operation: 'increment' | 'decrement', // For clearer logging/error handling if needed
  originalBalance?: number // For revert scenarios
): Promise<{ error: any | null }> {
  // In a real scenario, you might use a pg_transaction here if Supabase supported it directly in this client.
  // For now, this is a direct update.
  return supabase.from('wallets').update({ balance: newBalance }).eq('wallet_id', wallet_id);
}


export async function performTransfer(
  supabase: SupabaseClient<Database>,
  userId: string,
  sourceWalletId: string,
  destinationWalletId: string,
  amount: number,
  description?: string
): Promise<WalletTransaction> {
  // 1. Fetch source wallet
  const { data: sourceWallet, error: sourceWalletFetchError } = await supabase
    .from('wallets')
    .select('*') // Select all to get full wallet details including balance and currency
    .eq('wallet_id', sourceWalletId)
    .single();

  if (sourceWalletFetchError) {
    if (sourceWalletFetchError.code === 'PGRST116') {
      throw new WalletNotFoundError(`Source wallet with ID ${sourceWalletId} not found.`);
    }
    console.error(`performTransfer: Error fetching source wallet ${sourceWalletId}`, sourceWalletFetchError);
    throw new OperationFailedError(`Failed to fetch source wallet: ${sourceWalletFetchError.message}`);
  }

  // 2. Fetch destination wallet
  const { data: destinationWallet, error: destWalletFetchError } = await supabase
    .from('wallets')
    .select('*') // Select all for currency and status checks
    .eq('wallet_id', destinationWalletId)
    .single();

  if (destWalletFetchError) {
    if (destWalletFetchError.code === 'PGRST116') {
      throw new WalletNotFoundError(`Destination wallet with ID ${destinationWalletId} not found.`);
    }
    console.error(`performTransfer: Error fetching destination wallet ${destinationWalletId}`, destWalletFetchError);
    throw new OperationFailedError(`Failed to fetch destination wallet: ${destWalletFetchError.message}`);
  }

  // 3. Verify source wallet ownership and type
  if (sourceWallet.owner_id !== userId || sourceWallet.owner_type !== 'user') {
    throw new ForbiddenError(`User ${userId} is not authorized to transfer from source wallet ${sourceWalletId}.`);
  }

  // 4. Verify destination wallet ownership and type
  // Allow transfer if destination is an agent wallet OR if it's a user wallet owned by the current user.
  if (destinationWallet.owner_type !== 'agent' && 
      (destinationWallet.owner_id !== userId || destinationWallet.owner_type !== 'user')) {
    throw new ForbiddenError(`User ${userId} is not authorized to transfer to destination wallet ${destinationWalletId}.`);
  }
  
  // 5. Verify wallet statuses
  if (sourceWallet.status !== 'active') {
    throw new InactiveWalletError(`Source wallet ${sourceWalletId} is not active. Current status: ${sourceWallet.status}.`);
  }
  if (destinationWallet.status !== 'active') {
    throw new InactiveWalletError(`Destination wallet ${destinationWalletId} is not active. Current status: ${destinationWallet.status}.`);
  }

  // 6. Verify currency match
  if (sourceWallet.currency !== destinationWallet.currency) {
    throw new CurrencyMismatchError(`Currency mismatch: Source wallet (${sourceWallet.currency}) and destination wallet (${destinationWallet.currency}).`);
  }

  // 7. Verify sufficient funds in source wallet
  const sourceCurrentBalance = typeof sourceWallet.balance === 'string' ? parseFloat(sourceWallet.balance) : sourceWallet.balance;
  if (sourceCurrentBalance < amount) {
    throw new InsufficientFundsError(`Insufficient funds in source wallet ${sourceWalletId}. Current balance: ${sourceCurrentBalance}, requested amount: ${amount}.`);
  }
  const destinationCurrentBalance = typeof destinationWallet.balance === 'string' ? parseFloat(destinationWallet.balance) : destinationWallet.balance;


  // 8. Transaction Steps
  // Step A: Decrement Source Wallet
  const newSourceBalance = sourceCurrentBalance - amount;
  const { error: sourceUpdateError } = await updateWalletBalance(supabase, sourceWalletId, newSourceBalance, 'decrement');

  if (sourceUpdateError) {
    console.error(`performTransfer: Failed to debit source wallet ${sourceWalletId}`, sourceUpdateError);
    throw new OperationFailedError(`Failed to debit source wallet: ${sourceUpdateError.message}`);
  }

  // Step B: Increment Destination Wallet
  const newDestinationBalance = destinationCurrentBalance + amount;
  const { error: destUpdateError } = await updateWalletBalance(supabase, destinationWalletId, newDestinationBalance, 'increment');

  if (destUpdateError) {
    console.error(`performTransfer: Failed to credit destination wallet ${destinationWalletId}. Attempting to revert source debit for wallet ${sourceWalletId}. Error: ${destUpdateError.message}`);
    // Attempt to revert source debit
    const { error: revertError } = await updateWalletBalance(supabase, sourceWalletId, sourceCurrentBalance, 'increment'); // Revert to original
    if (revertError) {
      console.error(`performTransfer: CRITICAL INCONSISTENCY! Failed to credit destination wallet ${destinationWalletId} AND FAILED TO REVERT source debit for wallet ${sourceWalletId}. Details: ${revertError.message}`);
      throw new OperationFailedError(`CRITICAL: Failed to credit destination wallet AND FAILED TO REVERT source debit. Manual intervention required for source wallet ID: ${sourceWalletId}.`);
    }
    throw new OperationFailedError(`Failed to credit destination wallet; source debit successfully reverted. Original error: ${destUpdateError.message}`);
  }

  // Step C: Create Transaction Record
  const transactionRecord: WalletTransactionInsert = {
    source_wallet_id: sourceWalletId,
    destination_wallet_id: destinationWalletId,
    amount: amount,
    currency: sourceWallet.currency,
    type: 'transfer',
    status: 'completed',
    description: description || `Transfer from ${sourceWalletId.substring(0,4)}... to ${destinationWalletId.substring(0,4)}...`,
  };

  const { data: createdTransaction, error: transactionInsertError } = await supabase
    .from('wallet_transactions')
    .insert(transactionRecord)
    .select()
    .single();

  if (transactionInsertError || !createdTransaction) {
    console.error(`performTransfer: CRITICAL INCONSISTENCY! Balances updated for source ${sourceWalletId} and destination ${destinationWalletId}, but failed to create transaction record. Amount: ${amount}. Error: ${transactionInsertError?.message || 'Unknown error'}`);
    throw new OperationFailedError(`CRITICAL: Balances updated but failed to create transaction record. Please contact support. Source: ${sourceWalletId}, Dest: ${destinationWalletId}, Amount: ${amount}.`);
  }

  return createdTransaction as WalletTransaction;
}

export async function performWithdrawal(
  supabase: SupabaseClient<Database>,
  userId: string,
  walletId: string,
  amount: number,
  description?: string
): Promise<WalletTransaction> {
  // 1. Fetch the target wallet
  const { data: sourceWallet, error: walletFetchError } = await supabase
    .from('wallets')
    .select('owner_id, owner_type, currency, status, balance')
    .eq('wallet_id', walletId)
    .single();

  if (walletFetchError) {
    if (walletFetchError.code === 'PGRST116') { // No rows found
      throw new WalletNotFoundError(`Wallet with ID ${walletId} not found.`);
    }
    console.error(`performWithdrawal: Error fetching wallet ${walletId}`, walletFetchError);
    throw new OperationFailedError(`Failed to fetch wallet: ${walletFetchError.message}`);
  }

  // 2. Verify ownership and type
  if (sourceWallet.owner_id !== userId || sourceWallet.owner_type !== 'user') {
    throw new ForbiddenError(`User ${userId} is not authorized to withdraw from wallet ${walletId}.`);
  }

  // 3. Verify wallet status
  if (sourceWallet.status !== 'active') {
    throw new InactiveWalletError(`Wallet ${walletId} is not active. Current status: ${sourceWallet.status}.`);
  }

  // 4. Verify sufficient funds
  const currentBalance = typeof sourceWallet.balance === 'string' ? parseFloat(sourceWallet.balance) : sourceWallet.balance;
  if (currentBalance < amount) {
    throw new InsufficientFundsError(`Insufficient funds in wallet ${walletId}. Current balance: ${currentBalance}, requested amount: ${amount}.`);
  }

  // 5. Create Transaction Record
  const transactionRecord: WalletTransactionInsert = {
    source_wallet_id: walletId,
    destination_wallet_id: null, // Withdrawal to external
    amount: amount,
    currency: sourceWallet.currency,
    type: 'withdrawal',
    status: 'completed', // Assume completion for withdrawal simulation
    description: description || `Withdrawal from wallet ${walletId.substring(0, 8)}...`,
  };

  const { data: createdTransaction, error: transactionInsertError } = await supabase
    .from('wallet_transactions')
    .insert(transactionRecord)
    .select()
    .single();

  if (transactionInsertError || !createdTransaction) {
    console.error(`performWithdrawal: Error creating transaction record for wallet ${walletId}`, transactionInsertError);
    throw new OperationFailedError(`Failed to create withdrawal transaction record: ${transactionInsertError?.message || 'Unknown error'}`);
  }

  // 6. Update Wallet Balance
  const newBalance = currentBalance - amount;

  const { error: balanceUpdateError } = await supabase
    .from('wallets')
    .update({ balance: newBalance })
    .eq('wallet_id', walletId);

  if (balanceUpdateError) {
    console.error(`performWithdrawal: Error updating balance for wallet ${walletId} after transaction ${createdTransaction.transaction_id}. CRITICAL INCONSISTENCY.`, balanceUpdateError);
    // Attempt to mark transaction as failed or log for manual intervention
    // For now, just throw, indicating the critical state.
    // A more robust solution might try to update the transaction's status to 'failed' or 'pending_reconciliation'.
    throw new OperationFailedError(
      `Withdrawal transaction recorded (ID: ${createdTransaction.transaction_id}), but failed to update wallet balance. Please contact support.`,
      createdTransaction.transaction_id
    );
  }

  return createdTransaction as WalletTransaction;
}
