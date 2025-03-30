import { BaseRepository, QueryOptions } from '../../lib/base-repository';
import { Transaction } from '../models/transaction';

/**
 * Extended query options for transactions
 */
export interface TransactionQueryOptions extends QueryOptions {
  walletId?: number;
  farmId?: number;
  agentId?: number;
  status?: Transaction['status'];
  transactionType?: Transaction['transaction_type'];
  currency?: string;
  fromDate?: string;
  toDate?: string;
  minAmount?: number;
  maxAmount?: number;
}

/**
 * Repository for managing financial transactions
 */
export class TransactionRepository extends BaseRepository<Transaction> {
  constructor() {
    super('transactions');
  }

  /**
   * Get transactions for a specific wallet
   */
  async getByWalletId(walletId: number, options: TransactionQueryOptions = {}) {
    let query = this.client
      .from(this.tableName)
      .select('*')
      .eq('wallet_id', walletId);
    
    query = this.applyTransactionFilters(query, options);
    
    const { data, error } = await query;
    
    if (error) {
      this.handleError(error);
      return [];
    }
    
    return data as Transaction[];
  }

  /**
   * Get transactions for a specific farm
   */
  async getByFarmId(farmId: number, options: TransactionQueryOptions = {}) {
    let query = this.client
      .from(this.tableName)
      .select('*')
      .eq('farm_id', farmId);
    
    query = this.applyTransactionFilters(query, options);
    
    const { data, error } = await query;
    
    if (error) {
      this.handleError(error);
      return [];
    }
    
    return data as Transaction[];
  }

  /**
   * Get transactions by status
   */
  async getByStatus(status: Transaction['status'], options: TransactionQueryOptions = {}) {
    let query = this.client
      .from(this.tableName)
      .select('*')
      .eq('status', status);
    
    query = this.applyTransactionFilters(query, options);
    
    const { data, error } = await query;
    
    if (error) {
      this.handleError(error);
      return [];
    }
    
    return data as Transaction[];
  }

  /**
   * Get transaction summary by farm
   */
  async getFarmSummary(farmId: number, period: 'day' | 'week' | 'month' | 'year' = 'month') {
    // Calculate the date range based on the period
    const endDate = new Date().toISOString();
    const startDate = new Date();
    
    switch (period) {
      case 'day':
        startDate.setDate(startDate.getDate() - 1);
        break;
      case 'week':
        startDate.setDate(startDate.getDate() - 7);
        break;
      case 'month':
        startDate.setMonth(startDate.getMonth() - 1);
        break;
      case 'year':
        startDate.setFullYear(startDate.getFullYear() - 1);
        break;
    }
    
    // Get all transactions in the period
    const { data, error } = await this.client
      .from(this.tableName)
      .select('*')
      .eq('farm_id', farmId)
      .eq('status', 'completed')
      .gte('created_at', startDate.toISOString())
      .lte('created_at', endDate);
    
    if (error) {
      this.handleError(error);
      return {
        totalDeposits: 0,
        totalWithdrawals: 0,
        totalFees: 0,
        netChange: 0,
        transactionsCount: 0
      };
    }
    
    const transactions = data as Transaction[];
    
    // Calculate summary statistics
    const deposits = transactions.filter(t => t.transaction_type === 'deposit');
    const withdrawals = transactions.filter(t => t.transaction_type === 'withdrawal');
    const fees = transactions.filter(t => t.transaction_type === 'fee');
    
    const totalDeposits = deposits.reduce((sum, t) => sum + t.amount, 0);
    const totalWithdrawals = withdrawals.reduce((sum, t) => sum + t.amount, 0);
    const totalFees = fees.reduce((sum, t) => sum + t.amount, 0);
    
    return {
      totalDeposits,
      totalWithdrawals,
      totalFees,
      netChange: totalDeposits - totalWithdrawals - totalFees,
      transactionsCount: transactions.length
    };
  }

  /**
   * Apply common transaction filters to a query
   */
  private applyTransactionFilters(query: any, options: TransactionQueryOptions): any {
    if (options.agentId) {
      query = query.eq('agent_id', options.agentId);
    }
    
    if (options.status) {
      query = query.eq('status', options.status);
    }
    
    if (options.transactionType) {
      query = query.eq('transaction_type', options.transactionType);
    }
    
    if (options.currency) {
      query = query.eq('currency', options.currency);
    }
    
    if (options.fromDate) {
      query = query.gte('created_at', options.fromDate);
    }
    
    if (options.toDate) {
      query = query.lte('created_at', options.toDate);
    }
    
    if (options.minAmount !== undefined) {
      query = query.gte('amount', options.minAmount);
    }
    
    if (options.maxAmount !== undefined) {
      query = query.lte('amount', options.maxAmount);
    }
    
    // Apply standard query options
    if (options.orderBy) {
      query = query.order(options.orderBy, { ascending: options.orderDirection !== 'desc' });
    } else {
      query = query.order('created_at', { ascending: false });
    }
    
    if (options.limit) {
      query = query.limit(options.limit);
    }
    
    if (options.offset) {
      query = query.range(options.offset, options.offset + (options.limit || 10) - 1);
    }
    
    return query;
  }
} 