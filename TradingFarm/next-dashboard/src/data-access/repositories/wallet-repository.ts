import { BaseRepository, QueryOptions } from '../../lib/base-repository';
import { Wallet } from '../models/wallet';

/**
 * Extended query options specifically for wallets
 */
export interface WalletQueryOptions extends QueryOptions {
  includeTransactions?: boolean;
  includeOwner?: boolean;
}

/**
 * Repository implementation for Wallet entities
 */
export class WalletRepository extends BaseRepository<Wallet> {
  constructor() {
    super('wallets');
  }

  /**
   * Find wallets by owner ID and type
   */
  async findByOwner(ownerId: number, ownerType: 'farm' | 'agent' | 'user'): Promise<Wallet[]> {
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
   * Find a wallet by ID with optional related data
   */
  async findByIdWithRelations(id: number, options: WalletQueryOptions = {}): Promise<Wallet | null> {
    const wallet = await this.findById(id);
    
    if (!wallet) {
      return null;
    }

    const enrichedWallet: any = { ...wallet };

    // Load transactions if requested
    if (options.includeTransactions) {
      const { data: transactions } = await this.client
        .from('transactions')
        .select('*')
        .eq('wallet_id', id)
        .order('created_at', { ascending: false });
      
      enrichedWallet.transactions = transactions || [];
    }

    // Load owner details if requested
    if (options.includeOwner) {
      const { owner_id, owner_type } = wallet;
      
      if (owner_type === 'farm') {
        const { data: farm } = await this.client
          .from('farms')
          .select('*')
          .eq('id', owner_id)
          .single();
        
        enrichedWallet.owner = farm;
      } else if (owner_type === 'agent') {
        const { data: agent } = await this.client
          .from('agents')
          .select('*')
          .eq('id', owner_id)
          .single();
        
        enrichedWallet.owner = agent;
      } else if (owner_type === 'user') {
        const { data: user } = await this.client
          .from('users')
          .select('*')
          .eq('id', owner_id)
          .single();
        
        enrichedWallet.owner = user;
      }
    }

    return enrichedWallet as Wallet;
  }

  /**
   * Find active wallets with balance totals by currency
   */
  async getBalanceByCurrency(): Promise<Record<string, number>> {
    const { data, error } = await this.client
      .from(this.tableName)
      .select('currency, balance')
      .eq('is_active', true);

    if (error) {
      this.handleError(error);
      return {};
    }

    // Aggregate balances by currency
    const balances: Record<string, number> = {};
    
    (data || []).forEach((wallet: { currency: string; balance: number }) => {
      const { currency, balance } = wallet;
      balances[currency] = (balances[currency] || 0) + balance;
    });

    return balances;
  }

  /**
   * Transfer funds between wallets
   */
  async transferFunds(
    fromWalletId: number, 
    toWalletId: number, 
    amount: number,
    metadata: Record<string, any> = {}
  ): Promise<boolean> {
    // Start a transaction
    const { error } = await this.client.rpc('transfer_funds', {
      p_from_wallet_id: fromWalletId,
      p_to_wallet_id: toWalletId,
      p_amount: amount,
      p_metadata: metadata
    });

    if (error) {
      this.handleError(error);
      return false;
    }

    return true;
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
   * Add funds to a wallet
   */
  async addFunds(
    walletId: number, 
    amount: number, 
    transactionType: string = 'deposit',
    metadata: Record<string, any> = {}
  ): Promise<boolean> {
    // Get current wallet
    const wallet = await this.findById(walletId);
    if (!wallet) {
      return false;
    }

    // Calculate new balance
    const newBalance = wallet.balance + amount;
    
    // Start a transaction
    const { error } = await this.client.rpc('add_wallet_funds', {
      p_wallet_id: walletId,
      p_amount: amount,
      p_transaction_type: transactionType,
      p_metadata: metadata,
      p_new_balance: newBalance
    });

    if (error) {
      this.handleError(error);
      return false;
    }

    return true;
  }
} 