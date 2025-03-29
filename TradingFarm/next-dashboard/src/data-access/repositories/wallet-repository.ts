import { BaseEntity, BaseRepository } from '../lib/base-repository';

/**
 * Wallet entity interface
 */
export interface Wallet extends BaseEntity {
  owner_id: number;
  owner_type: 'farm' | 'agent' | 'system';
  name: string;
  balance: number;
  currency: string;
  is_active: boolean;
  metadata: {
    address?: string;
    network?: string;
    last_sync?: string;
    external_id?: string;
    [key: string]: any;
  };
}

/**
 * Transaction entity interface
 */
export interface Transaction extends BaseEntity {
  source_wallet_id?: number;
  destination_wallet_id?: number;
  amount: number;
  currency: string;
  transaction_type: string;
  status: 'pending' | 'completed' | 'failed' | 'cancelled';
  completed_at?: string;
  metadata: {
    reason?: string;
    external_tx_id?: string;
    fee?: number;
    [key: string]: any;
  };
}

/**
 * Repository implementation for Wallet entities
 */
export class WalletRepository extends BaseRepository<Wallet> {
  constructor() {
    super('wallets');
  }

  /**
   * Find wallets by owner (farm, agent, system)
   */
  async findByOwner(ownerId: number, ownerType: Wallet['owner_type']): Promise<Wallet[]> {
    const { data, error } = await this.client
      .from(this.tableName)
      .select('*')
      .eq('owner_id', ownerId)
      .eq('owner_type', ownerType);

    if (error) {
      this.handleError(error);
      return [];
    }

    return data as Wallet[];
  }

  /**
   * Get system wallets
   */
  async findSystemWallets(): Promise<Wallet[]> {
    const { data, error } = await this.client
      .from(this.tableName)
      .select('*')
      .eq('owner_type', 'system');

    if (error) {
      this.handleError(error);
      return [];
    }

    return data as Wallet[];
  }

  /**
   * Get wallet with transaction history
   */
  async findWithTransactions(id: number, limit: number = 20): Promise<any> {
    const wallet = await this.findById(id);
    
    if (!wallet) {
      return null;
    }

    // Get inbound transactions (to this wallet)
    const { data: inboundTx, error: inboundError } = await this.client
      .from('transactions')
      .select('*')
      .eq('destination_wallet_id', id)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (inboundError) {
      this.handleError(inboundError);
    }

    // Get outbound transactions (from this wallet)
    const { data: outboundTx, error: outboundError } = await this.client
      .from('transactions')
      .select('*')
      .eq('source_wallet_id', id)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (outboundError) {
      this.handleError(outboundError);
    }

    return {
      ...wallet,
      inbound_transactions: inboundTx || [],
      outbound_transactions: outboundTx || []
    };
  }

  /**
   * Update wallet balance
   */
  async updateBalance(id: number, newBalance: number): Promise<boolean> {
    const { error } = await this.client
      .from(this.tableName)
      .update({ 
        balance: newBalance,
        updated_at: new Date().toISOString()
      })
      .eq('id', id);

    if (error) {
      this.handleError(error);
      return false;
    }

    return true;
  }

  /**
   * Perform a transaction between wallets
   * This should be done in a transaction to ensure atomicity
   */
  async transferFunds(
    sourceWalletId: number, 
    destinationWalletId: number, 
    amount: number, 
    currency: string,
    metadata: object = {}
  ): Promise<Transaction | null> {
    // Start a transaction to ensure atomicity
    const transaction = await this.client.from('transactions').insert({
      source_wallet_id: sourceWalletId,
      destination_wallet_id: destinationWalletId,
      amount,
      currency,
      transaction_type: 'transfer',
      status: 'pending',
      metadata
    }).select().single();

    if (transaction.error) {
      this.handleError(transaction.error);
      return null;
    }

    try {
      // Get source wallet
      const sourceWallet = await this.findById(sourceWalletId);
      if (!sourceWallet) {
        throw new Error('Source wallet not found');
      }

      // Get destination wallet
      const destWallet = await this.findById(destinationWalletId);
      if (!destWallet) {
        throw new Error('Destination wallet not found');
      }

      // Check sufficient funds
      if (sourceWallet.balance < amount) {
        throw new Error('Insufficient funds');
      }

      // Check currency match
      if (sourceWallet.currency !== currency || destWallet.currency !== currency) {
        throw new Error('Currency mismatch');
      }

      // Update source wallet balance
      const sourceUpdate = await this.updateBalance(sourceWalletId, sourceWallet.balance - amount);
      if (!sourceUpdate) {
        throw new Error('Failed to update source wallet');
      }

      // Update destination wallet balance
      const destUpdate = await this.updateBalance(destinationWalletId, destWallet.balance + amount);
      if (!destUpdate) {
        throw new Error('Failed to update destination wallet');
      }

      // Mark transaction as completed
      const completedTx = await this.client
        .from('transactions')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString()
        })
        .eq('id', transaction.data.id)
        .select()
        .single();

      return completedTx.data as Transaction;
    } catch (error) {
      // Mark transaction as failed
      await this.client
        .from('transactions')
        .update({
          status: 'failed',
          metadata: { 
            ...transaction.data.metadata,
            error: (error as Error).message 
          }
        })
        .eq('id', transaction.data.id);

      this.handleError(error);
      return null;
    }
  }
}
