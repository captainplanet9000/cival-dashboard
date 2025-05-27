// src/lib/types/vault.ts

export interface CreateWalletPayload {
  currency: string; // Should be a valid currency_code from supported_currencies
}

export interface WalletTransactionPayload {
  wallet_id: string; // UUID of the target wallet for deposit/withdrawal
  amount: number;
  description?: string;
}

// Specific payload for deposits, if it ever diverges, though WalletTransactionPayload covers it for now.
// export type DepositPayload = WalletTransactionPayload; 

// Specific payload for withdrawals, if it ever diverges.
// export type WithdrawalPayload = WalletTransactionPayload;

export interface TransferPayload {
  source_wallet_id: string; // UUID
  destination_wallet_id: string; // UUID
  amount: number;
  description?: string;
}