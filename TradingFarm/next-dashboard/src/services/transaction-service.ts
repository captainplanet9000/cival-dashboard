/**
 * Transaction Service
 * Handles recording, reconciliation and management of transaction logs
 */
import { createServerClient } from '@/utils/supabase/server';
import { ExchangeService } from './exchange-service';

export type TransactionType = 'deposit' | 'withdrawal' | 'trade' | 'fee' | 'transfer';

export type TransactionStatus = 'pending' | 'completed' | 'failed' | 'disputed';

export interface TransactionRecord {
  id?: string;
  farmId: string;
  walletId?: string;
  userId: string;
  agentId?: string;
  transactionType: TransactionType;
  transactionId?: string;
  symbol?: string;
  amount: number;
  price?: number;
  fee?: number;
  feeCurrency?: string;
  timestamp?: string;
  status: TransactionStatus;
  exchangeReported?: boolean;
  locallyRecorded?: boolean;
  metadata?: Record<string, any>;
}

export interface TransactionReconciliation {
  localTransactions: TransactionRecord[];
  exchangeTransactions: TransactionRecord[];
  matched: TransactionRecord[];
  unmatched: {
    localOnly: TransactionRecord[];
    exchangeOnly: TransactionRecord[];
  };
}

export class TransactionService {
  /**
   * Record a new transaction
   */
  static async recordTransaction(transaction: TransactionRecord): Promise<string> {
    const supabase = await createServerClient();
    
    const { data, error } = await supabase
      .from('transaction_logs')
      .insert({
        farm_id: transaction.farmId,
        wallet_id: transaction.walletId,
        user_id: transaction.userId,
        agent_id: transaction.agentId,
        transaction_type: transaction.transactionType,
        transaction_id: transaction.transactionId,
        symbol: transaction.symbol,
        amount: transaction.amount,
        price: transaction.price,
        fee: transaction.fee,
        fee_currency: transaction.feeCurrency,
        timestamp: transaction.timestamp || new Date().toISOString(),
        status: transaction.status,
        exchange_reported: transaction.exchangeReported || false,
        locally_recorded: transaction.locallyRecorded !== undefined ? transaction.locallyRecorded : true,
        metadata: transaction.metadata || {}
      })
      .select('id')
      .single();
      
    if (error) {
      console.error('Error recording transaction:', error);
      throw new Error(`Failed to record transaction: ${error.message}`);
    }
    
    return data.id;
  }
  
  /**
   * Update a transaction record
   */
  static async updateTransaction(
    transactionId: string, 
    updates: Partial<TransactionRecord>
  ): Promise<void> {
    const supabase = await createServerClient();
    
    const updateData: Record<string, any> = {};
    
    // Map transaction fields to database fields
    if (updates.transactionType) updateData.transaction_type = updates.transactionType;
    if (updates.transactionId) updateData.transaction_id = updates.transactionId;
    if (updates.symbol) updateData.symbol = updates.symbol;
    if (updates.amount !== undefined) updateData.amount = updates.amount;
    if (updates.price !== undefined) updateData.price = updates.price;
    if (updates.fee !== undefined) updateData.fee = updates.fee;
    if (updates.feeCurrency) updateData.fee_currency = updates.feeCurrency;
    if (updates.timestamp) updateData.timestamp = updates.timestamp;
    if (updates.status) updateData.status = updates.status;
    if (updates.exchangeReported !== undefined) updateData.exchange_reported = updates.exchangeReported;
    if (updates.locallyRecorded !== undefined) updateData.locally_recorded = updates.locallyRecorded;
    if (updates.metadata) updateData.metadata = updates.metadata;
    
    const { error } = await supabase
      .from('transaction_logs')
      .update(updateData)
      .eq('id', transactionId);
      
    if (error) {
      console.error('Error updating transaction:', error);
      throw new Error(`Failed to update transaction: ${error.message}`);
    }
  }
  
  /**
   * Get transaction by ID
   */
  static async getTransaction(transactionId: string): Promise<TransactionRecord> {
    const supabase = await createServerClient();
    
    const { data, error } = await supabase
      .from('transaction_logs')
      .select('*')
      .eq('id', transactionId)
      .single();
      
    if (error) {
      console.error('Error fetching transaction:', error);
      throw new Error(`Failed to fetch transaction: ${error.message}`);
    }
    
    return this.mapDatabaseToTransaction(data);
  }
  
  /**
   * Get transactions by farm ID
   */
  static async getTransactionsByFarm(
    farmId: string,
    options?: {
      limit?: number;
      offset?: number;
      status?: TransactionStatus;
      type?: TransactionType;
      startDate?: string;
      endDate?: string;
      walletId?: string;
      agentId?: string;
    }
  ): Promise<TransactionRecord[]> {
    const supabase = await createServerClient();
    
    let query = supabase
      .from('transaction_logs')
      .select('*')
      .eq('farm_id', farmId)
      .order('timestamp', { ascending: false });
      
    // Apply filters
    if (options?.status) {
      query = query.eq('status', options.status);
    }
    
    if (options?.type) {
      query = query.eq('transaction_type', options.type);
    }
    
    if (options?.startDate) {
      query = query.gte('timestamp', options.startDate);
    }
    
    if (options?.endDate) {
      query = query.lte('timestamp', options.endDate);
    }
    
    if (options?.walletId) {
      query = query.eq('wallet_id', options.walletId);
    }
    
    if (options?.agentId) {
      query = query.eq('agent_id', options.agentId);
    }
    
    // Apply pagination
    if (options?.limit) {
      query = query.limit(options.limit);
    }
    
    if (options?.offset) {
      query = query.range(options.offset, options.offset + (options.limit || 10) - 1);
    }
    
    const { data, error } = await query;
      
    if (error) {
      console.error('Error fetching transactions:', error);
      throw new Error(`Failed to fetch transactions: ${error.message}`);
    }
    
    return (data || []).map(this.mapDatabaseToTransaction);
  }
  
  /**
   * Get transactions by wallet ID
   */
  static async getTransactionsByWallet(
    walletId: string,
    options?: {
      limit?: number;
      offset?: number;
      status?: TransactionStatus;
      type?: TransactionType;
      startDate?: string;
      endDate?: string;
    }
  ): Promise<TransactionRecord[]> {
    const supabase = await createServerClient();
    
    let query = supabase
      .from('transaction_logs')
      .select('*')
      .eq('wallet_id', walletId)
      .order('timestamp', { ascending: false });
      
    // Apply filters
    if (options?.status) {
      query = query.eq('status', options.status);
    }
    
    if (options?.type) {
      query = query.eq('transaction_type', options.type);
    }
    
    if (options?.startDate) {
      query = query.gte('timestamp', options.startDate);
    }
    
    if (options?.endDate) {
      query = query.lte('timestamp', options.endDate);
    }
    
    // Apply pagination
    if (options?.limit) {
      query = query.limit(options.limit);
    }
    
    if (options?.offset) {
      query = query.range(options.offset, options.offset + (options.limit || 10) - 1);
    }
    
    const { data, error } = await query;
      
    if (error) {
      console.error('Error fetching wallet transactions:', error);
      throw new Error(`Failed to fetch wallet transactions: ${error.message}`);
    }
    
    return (data || []).map(this.mapDatabaseToTransaction);
  }
  
  /**
   * Fetch exchange transactions
   */
  static async fetchExchangeTransactions(
    walletId: string,
    startTime?: string,
    endTime?: string
  ): Promise<TransactionRecord[]> {
    const supabase = await createServerClient();
    
    // Get wallet details
    const { data: wallet, error: walletError } = await supabase
      .from('farm_wallets')
      .select('*')
      .eq('id', walletId)
      .single();
      
    if (walletError || !wallet) {
      console.error('Error fetching wallet:', walletError);
      throw new Error(`Failed to fetch wallet: ${walletError?.message}`);
    }
    
    try {
      // Connect to exchange
      const exchange = await ExchangeService.getExchangeClient(
        wallet.exchange_id,
        wallet.api_key,
        wallet.api_secret,
        wallet.api_passphrase,
        wallet.is_testnet
      );
      
      // Parse time parameters
      const since = startTime ? new Date(startTime).getTime() : undefined;
      const until = endTime ? new Date(endTime).getTime() : undefined;
      
      // Fetch transactions from exchange
      const deposits = await exchange.fetchDeposits(undefined, since, until);
      const withdrawals = await exchange.fetchWithdrawals(undefined, since, until);
      
      // Fetch trades (depends on exchange API)
      const trades = await exchange.fetchMyTrades(undefined, since, until);
      
      // Convert to transaction records
      const transactions: TransactionRecord[] = [];
      
      // Process deposits
      for (const deposit of deposits) {
        transactions.push({
          farmId: wallet.farm_id,
          walletId,
          userId: wallet.user_id,
          transactionType: 'deposit',
          transactionId: deposit.id,
          amount: deposit.amount,
          symbol: deposit.currency,
          timestamp: new Date(deposit.timestamp).toISOString(),
          status: this.mapExchangeStatus(deposit.status),
          exchangeReported: true,
          locallyRecorded: false,
          metadata: {
            txid: deposit.txid,
            address: deposit.address,
            network: deposit.network,
            raw: deposit,
          }
        });
      }
      
      // Process withdrawals
      for (const withdrawal of withdrawals) {
        transactions.push({
          farmId: wallet.farm_id,
          walletId,
          userId: wallet.user_id,
          transactionType: 'withdrawal',
          transactionId: withdrawal.id,
          amount: withdrawal.amount,
          symbol: withdrawal.currency,
          fee: withdrawal.fee,
          feeCurrency: withdrawal.currency,
          timestamp: new Date(withdrawal.timestamp).toISOString(),
          status: this.mapExchangeStatus(withdrawal.status),
          exchangeReported: true,
          locallyRecorded: false,
          metadata: {
            txid: withdrawal.txid,
            address: withdrawal.address,
            network: withdrawal.network || withdrawal.tag,
            raw: withdrawal,
          }
        });
      }
      
      // Process trades
      for (const trade of trades) {
        transactions.push({
          farmId: wallet.farm_id,
          walletId,
          userId: wallet.user_id,
          transactionType: 'trade',
          transactionId: trade.id,
          symbol: trade.symbol,
          amount: trade.amount,
          price: trade.price,
          fee: trade.fee.cost,
          feeCurrency: trade.fee.currency,
          timestamp: new Date(trade.timestamp).toISOString(),
          status: 'completed',
          exchangeReported: true,
          locallyRecorded: false,
          metadata: {
            side: trade.side,
            type: trade.type,
            takerOrMaker: trade.takerOrMaker,
            cost: trade.cost,
            raw: trade,
          }
        });
      }
      
      return transactions;
    } catch (error) {
      console.error('Error fetching exchange transactions:', error);
      throw new Error(`Failed to fetch exchange transactions: ${error.message}`);
    }
  }
  
  /**
   * Reconcile local transactions with exchange reported transactions
   */
  static async reconcileTransactions(
    walletId: string,
    startTime?: string,
    endTime?: string
  ): Promise<TransactionReconciliation> {
    // Get local transactions
    const localTransactions = await this.getTransactionsByWallet(walletId, {
      startDate: startTime,
      endDate: endTime
    });
    
    // Get exchange transactions
    const exchangeTransactions = await this.fetchExchangeTransactions(
      walletId,
      startTime,
      endTime
    );
    
    // Find matching transactions
    const matched: TransactionRecord[] = [];
    const localOnly: TransactionRecord[] = [];
    const exchangeOnly: TransactionRecord[] = [...exchangeTransactions];
    
    // Check each local transaction for a match in exchange transactions
    for (const localTx of localTransactions) {
      let foundMatch = false;
      
      for (let i = 0; i < exchangeOnly.length; i++) {
        const exchangeTx = exchangeOnly[i];
        
        // Check if they match by transaction ID
        if (localTx.transactionId && exchangeTx.transactionId === localTx.transactionId) {
          matched.push({
            ...localTx,
            exchangeReported: true
          });
          
          // Remove the matched transaction from exchangeOnly
          exchangeOnly.splice(i, 1);
          foundMatch = true;
          break;
        }
        
        // If no transaction ID match, try matching on other fields
        if (!localTx.transactionId && 
            localTx.transactionType === exchangeTx.transactionType &&
            localTx.amount === exchangeTx.amount &&
            localTx.symbol === exchangeTx.symbol) {
          
          // If timestamps are within 5 minutes, consider it a match
          const localTime = new Date(localTx.timestamp || '').getTime();
          const exchangeTime = new Date(exchangeTx.timestamp || '').getTime();
          
          if (Math.abs(localTime - exchangeTime) < 5 * 60 * 1000) {
            matched.push({
              ...localTx,
              transactionId: exchangeTx.transactionId,
              exchangeReported: true
            });
            
            // Remove the matched transaction from exchangeOnly
            exchangeOnly.splice(i, 1);
            foundMatch = true;
            break;
          }
        }
      }
      
      if (!foundMatch) {
        localOnly.push(localTx);
      }
    }
    
    // Update local database with reconciliation results
    await this.updateReconciliationResults(matched, localOnly, exchangeOnly);
    
    return {
      localTransactions,
      exchangeTransactions,
      matched,
      unmatched: {
        localOnly,
        exchangeOnly
      }
    };
  }
  
  /**
   * Update database with reconciliation results
   */
  private static async updateReconciliationResults(
    matched: TransactionRecord[],
    localOnly: TransactionRecord[],
    exchangeOnly: TransactionRecord[]
  ): Promise<void> {
    const supabase = await createServerClient();
    
    // Update matched transactions to mark as exchange reported
    for (const tx of matched) {
      if (tx.id) {
        await supabase
          .from('transaction_logs')
          .update({
            exchange_reported: true,
            transaction_id: tx.transactionId,
            status: tx.status
          })
          .eq('id', tx.id);
      }
    }
    
    // Insert exchange-only transactions
    for (const tx of exchangeOnly) {
      await this.recordTransaction(tx);
    }
  }
  
  /**
   * Map database fields to transaction record
   */
  private static mapDatabaseToTransaction(data: any): TransactionRecord {
    return {
      id: data.id,
      farmId: data.farm_id,
      walletId: data.wallet_id,
      userId: data.user_id,
      agentId: data.agent_id,
      transactionType: data.transaction_type,
      transactionId: data.transaction_id,
      symbol: data.symbol,
      amount: data.amount,
      price: data.price,
      fee: data.fee,
      feeCurrency: data.fee_currency,
      timestamp: data.timestamp,
      status: data.status,
      exchangeReported: data.exchange_reported,
      locallyRecorded: data.locally_recorded,
      metadata: data.metadata
    };
  }
  
  /**
   * Map exchange status to internal status
   */
  private static mapExchangeStatus(status: string): TransactionStatus {
    const statusMap: Record<string, TransactionStatus> = {
      'ok': 'completed',
      'complete': 'completed',
      'completed': 'completed',
      'success': 'completed',
      'pending': 'pending',
      'processing': 'pending',
      'failed': 'failed',
      'canceled': 'failed',
      'cancelled': 'failed',
      'rejected': 'failed',
      'error': 'failed'
    };
    
    return statusMap[status.toLowerCase()] || 'pending';
  }
}
