/**
 * Wallet Service
 * Manages wallet interactions for the Trading Farm system
 */
import { createServerClient } from '@/utils/supabase/server';
import { createBrowserClient } from '@/utils/supabase/client';
import { ExchangeService } from './exchange-service';
import { QueueService, QueueNames } from './queue/queue-service';

export interface WalletBalance {
  currency: string;
  free: number;
  used: number;
  total: number;
  usdValue?: number;
}

export interface WalletConfig {
  id?: string;
  farmId: string;
  ownerId: string;
  name: string;
  address: string;
  network: string;
  exchange?: string;
  balance?: number;
  currency: string;
  status?: 'active' | 'inactive' | 'pending';
}

export interface WalletTransaction {
  id?: string;
  walletId: string;
  type: 'deposit' | 'withdrawal' | 'transfer' | 'trade' | 'fee';
  amount: number;
  currency: string;
  timestamp?: string;
  status?: 'completed' | 'pending' | 'failed';
  txHash?: string;
  destination?: string;
  source?: string;
  fee?: number;
  feeCurrency?: string;
  note?: string;
}

export interface WalletAlert {
  id?: string;
  walletId: string;
  type: 'low_balance' | 'large_deposit' | 'suspicious_activity' | 'other';
  message: string;
  timestamp?: string;
  resolved?: boolean;
  resolvedAt?: string;
  resolvedBy?: string;
}

export interface WalletSettings {
  walletId: string;
  lowBalanceThreshold?: number;
  alertsEnabled?: boolean;
  autoRefresh?: boolean;
  refreshInterval?: number;
}

export class WalletService {
  /**
   * Create a new wallet
   */
  static async createWallet(walletConfig: WalletConfig): Promise<string> {
    const supabase = await createServerClient();
    
    const { data, error } = await supabase
      .from('wallets')
      .insert({
        farm_id: walletConfig.farmId,
        owner_id: walletConfig.ownerId,
        name: walletConfig.name,
        address: walletConfig.address,
        network: walletConfig.network,
        exchange: walletConfig.exchange,
        balance: walletConfig.balance || 0,
        currency: walletConfig.currency,
        status: walletConfig.status || 'active',
      })
      .select('id')
      .single();
      
    if (error) {
      console.error('Error creating wallet:', error);
      throw new Error(`Failed to create wallet: ${error.message}`);
    }
    
    // Create default wallet settings
    await this.createWalletSettings({
      walletId: data.id,
      alertsEnabled: true,
      autoRefresh: true,
      refreshInterval: 15
    });
    
    return data.id;
  }
  
  /**
   * Create wallet settings
   */
  static async createWalletSettings(settings: WalletSettings): Promise<void> {
    const supabase = await createServerClient();
    
    const { error } = await supabase
      .from('wallet_settings')
      .insert({
        wallet_id: settings.walletId,
        low_balance_threshold: settings.lowBalanceThreshold,
        alerts_enabled: settings.alertsEnabled,
        auto_refresh: settings.autoRefresh,
        refresh_interval: settings.refreshInterval
      });
      
    if (error) {
      console.error('Error creating wallet settings:', error);
      throw new Error(`Failed to create wallet settings: ${error.message}`);
    }
  }
  
  /**
   * Update an existing wallet
   */
  static async updateWallet(walletId: string, updates: Partial<WalletConfig>): Promise<void> {
    const supabase = await createServerClient();
    
    const { error } = await supabase
      .from('wallets')
      .update({
        name: updates.name,
        address: updates.address,
        network: updates.network,
        exchange: updates.exchange,
        balance: updates.balance,
        currency: updates.currency,
        status: updates.status,
      })
      .eq('id', walletId);
      
    if (error) {
      console.error('Error updating wallet:', error);
      throw new Error(`Failed to update wallet: ${error.message}`);
    }
  }
  
  /**
   * Update wallet settings
   */
  static async updateWalletSettings(walletId: string, updates: Partial<WalletSettings>): Promise<void> {
    const supabase = await createServerClient();
    
    const { error } = await supabase
      .from('wallet_settings')
      .update({
        low_balance_threshold: updates.lowBalanceThreshold,
        alerts_enabled: updates.alertsEnabled,
        auto_refresh: updates.autoRefresh,
        refresh_interval: updates.refreshInterval
      })
      .eq('wallet_id', walletId);
      
    if (error) {
      console.error('Error updating wallet settings:', error);
      throw new Error(`Failed to update wallet settings: ${error.message}`);
    }
  }
  
  /**
   * Delete a wallet
   */
  static async deleteWallet(walletId: string): Promise<void> {
    const supabase = await createServerClient();
    
    const { error } = await supabase
      .from('wallets')
      .delete()
      .eq('id', walletId);
      
    if (error) {
      console.error('Error deleting wallet:', error);
      throw new Error(`Failed to delete wallet: ${error.message}`);
    }
  }
  
  /**
   * Get a wallet by ID
   */
  static async getWallet(walletId: string) {
    const supabase = await createServerClient();
    
    const { data, error } = await supabase
      .rpc('get_wallet_with_details', { p_wallet_id: walletId });
      
    if (error) {
      console.error('Error fetching wallet:', error);
      throw new Error(`Failed to fetch wallet: ${error.message}`);
    }
    
    return data;
  }
  
  /**
   * Get all wallets for a farm
   */
  static async getWalletsByFarm(farmId: string) {
    const supabase = await createServerClient();
    
    const { data, error } = await supabase
      .from('wallets')
      .select('*')
      .eq('farm_id', farmId);
      
    if (error) {
      console.error('Error fetching farm wallets:', error);
      throw new Error(`Failed to fetch farm wallets: ${error.message}`);
    }
    
    return data || [];
  }
  
  /**
   * Get wallet settings
   */
  static async getWalletSettings(walletId: string) {
    const supabase = await createServerClient();
    
    const { data, error } = await supabase
      .from('wallet_settings')
      .select('*')
      .eq('wallet_id', walletId)
      .single();
      
    if (error) {
      console.error('Error fetching wallet settings:', error);
      throw new Error(`Failed to fetch wallet settings: ${error.message}`);
    }
    
    return data;
  }
  
  /**
   * Record a wallet transaction
   */
  static async recordTransaction(transaction: WalletTransaction): Promise<string> {
    const supabase = await createServerClient();
    
    const { data, error } = await supabase
      .from('wallet_transactions')
      .insert({
        wallet_id: transaction.walletId,
        type: transaction.type,
        amount: transaction.amount,
        currency: transaction.currency,
        timestamp: transaction.timestamp || new Date().toISOString(),
        status: transaction.status || 'completed',
        tx_hash: transaction.txHash,
        destination: transaction.destination,
        source: transaction.source,
        fee: transaction.fee,
        fee_currency: transaction.feeCurrency,
        note: transaction.note
      })
      .select('id')
      .single();
      
    if (error) {
      console.error('Error recording transaction:', error);
      throw new Error(`Failed to record transaction: ${error.message}`);
    }
    
    // Update wallet balance
    await this.updateWalletBalance(transaction.walletId, transaction.amount, transaction.type);
    
    // Record balance history
    await this.recordBalanceHistory(transaction.walletId);
    
    return data.id;
  }
  
  /**
   * Update wallet balance based on a transaction
   */
  private static async updateWalletBalance(walletId: string, amount: number, type: string): Promise<void> {
    const supabase = await createServerClient();
    
    // Get current wallet
    const { data: wallet, error: fetchError } = await supabase
      .from('wallets')
      .select('balance, currency')
      .eq('id', walletId)
      .single();
      
    if (fetchError || !wallet) {
      console.error('Error fetching wallet for balance update:', fetchError);
      throw new Error(`Failed to fetch wallet: ${fetchError?.message}`);
    }
    
    let newBalance = wallet.balance;
    
    // Calculate new balance based on transaction type
    switch(type) {
      case 'deposit':
        newBalance += amount;
        break;
      case 'withdrawal':
      case 'fee':
        newBalance -= amount;
        break;
      case 'transfer':
        // For transfers, amount can be positive (incoming) or negative (outgoing)
        newBalance += amount;
        break;
      // For 'trade' type, we'd need more complex logic handled elsewhere
    }
    
    // Update wallet balance
    const { error: updateError } = await supabase
      .from('wallets')
      .update({ 
        balance: newBalance,
        last_updated: new Date().toISOString()
      })
      .eq('id', walletId);
      
    if (updateError) {
      console.error('Error updating wallet balance:', updateError);
      throw new Error(`Failed to update wallet balance: ${updateError.message}`);
    }
    
    // Check for balance alerts
    await this.checkLowBalanceAlert(walletId, newBalance, wallet.currency);
  }
  
  /**
   * Record wallet balance history
   */
  static async recordBalanceHistory(walletId: string): Promise<void> {
    const supabase = await createServerClient();
    
    // Get current wallet
    const { data: wallet, error: fetchError } = await supabase
      .from('wallets')
      .select('balance, currency')
      .eq('id', walletId)
      .single();
      
    if (fetchError || !wallet) {
      console.error('Error fetching wallet for history recording:', fetchError);
      return;
    }
    
    // Record balance history
    const { error } = await supabase
      .from('wallet_balance_history')
      .insert({
        wallet_id: walletId,
        balance: wallet.balance,
        currency: wallet.currency,
        timestamp: new Date().toISOString()
      });
      
    if (error) {
      console.error('Error recording balance history:', error);
    }
  }
  
  /**
   * Check for low balance alerts
   */
  static async checkLowBalanceAlert(walletId: string, balance: number, currency: string): Promise<void> {
    const supabase = await createServerClient();
    
    // Get wallet settings
    const { data: settings, error: settingsError } = await supabase
      .from('wallet_settings')
      .select('low_balance_threshold, alerts_enabled')
      .eq('wallet_id', walletId)
      .single();
      
    if (settingsError || !settings) {
      console.error('Error fetching wallet settings for alert check:', settingsError);
      return;
    }
    
    // Check if alerts are enabled and balance is below threshold
    if (settings.alerts_enabled && 
        settings.low_balance_threshold && 
        balance < settings.low_balance_threshold) {
      
      // Create an alert
      const { error } = await supabase
        .from('wallet_alerts')
        .insert({
          wallet_id: walletId,
          type: 'low_balance',
          message: `Wallet balance (${balance} ${currency}) is below the threshold (${settings.low_balance_threshold} ${currency})`,
          timestamp: new Date().toISOString(),
          resolved: false
        });
        
      if (error) {
        console.error('Error creating low balance alert:', error);
      }
    }
  }
  
  /**
   * Get wallet transactions
   */
  static async getWalletTransactions(walletId: string, limit = 50, offset = 0) {
    const supabase = await createServerClient();
    
    const { data, error } = await supabase
      .from('wallet_transactions')
      .select('*')
      .eq('wallet_id', walletId)
      .order('timestamp', { ascending: false })
      .range(offset, offset + limit - 1);
      
    if (error) {
      console.error('Error fetching wallet transactions:', error);
      throw new Error(`Failed to fetch wallet transactions: ${error.message}`);
    }
    
    return data || [];
  }
  
  /**
   * Get wallet alerts
   */
  static async getWalletAlerts(walletId: string, includeResolved = false, limit = 50, offset = 0) {
    const supabase = await createServerClient();
    
    let query = supabase
      .from('wallet_alerts')
      .select('*')
      .eq('wallet_id', walletId);
      
    if (!includeResolved) {
      query = query.eq('resolved', false);
    }
    
    const { data, error } = await query
      .order('timestamp', { ascending: false })
      .range(offset, offset + limit - 1);
      
    if (error) {
      console.error('Error fetching wallet alerts:', error);
      throw new Error(`Failed to fetch wallet alerts: ${error.message}`);
    }
    
    return data || [];
  }
  
  /**
   * Resolve a wallet alert
   */
  static async resolveAlert(alertId: string, userId: string): Promise<void> {
    const supabase = await createServerClient();
    
    const { error } = await supabase
      .from('wallet_alerts')
      .update({
        resolved: true,
        resolved_at: new Date().toISOString(),
        resolved_by: userId
      })
      .eq('id', alertId);
      
    if (error) {
      console.error('Error resolving wallet alert:', error);
      throw new Error(`Failed to resolve wallet alert: ${error.message}`);
    }
  }
  
  /**
   * Get wallet balance history
   */
  static async getWalletBalanceHistory(walletId: string, days = 30) {
    const supabase = await createServerClient();
    
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    
    const { data, error } = await supabase
      .from('wallet_balance_history')
      .select('*')
      .eq('wallet_id', walletId)
      .gte('timestamp', startDate.toISOString())
      .order('timestamp', { ascending: true });
      
    if (error) {
      console.error('Error fetching wallet balance history:', error);
      throw new Error(`Failed to fetch wallet balance history: ${error.message}`);
    }
    
    return data || [];
  }
  
  /**
   * Convert crypto balances to USD values
   */
  static async convertBalancesToUSD(
    balances: Record<string, number>
  ): Promise<Record<string, number>> {
    try {
      const currencyList = Object.keys(balances);
      
      if (currencyList.length === 0) {
        return {};
      }
      
      // Get current prices against USD
      const prices = await ExchangeService.getPricesInUSD(currencyList);
      
      // Calculate USD values
      const usdBalances: Record<string, number> = {};
      
      Object.entries(balances).forEach(([currency, amount]) => {
        const price = prices[currency] || 0;
        usdBalances[currency] = amount * price;
      });
      
      return usdBalances;
    } catch (error) {
      console.error('Error converting balances to USD:', error);
      return {};
    }
  }
}
