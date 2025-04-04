/**
 * Wallet Service
 * Manages farm wallets, including balance updates and exchange connections
 */
import { createServerClient } from '@/utils/supabase/server';
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
  userId: string;
  walletName: string;
  exchangeId: string;
  apiKey: string;
  apiSecret: string;
  apiPassphrase?: string;
  isTestnet?: boolean;
  alertThreshold?: number;
  alertEnabled?: boolean;
}

export interface WalletAlert {
  walletId: string;
  currency: string;
  currentBalance: number;
  threshold: number;
  message: string;
  timestamp: string;
}

export class WalletService {
  /**
   * Create a new wallet for a farm
   */
  static async createWallet(walletConfig: WalletConfig): Promise<string> {
    const supabase = await createServerClient();
    
    const { data, error } = await supabase
      .from('farm_wallets')
      .insert({
        farm_id: walletConfig.farmId,
        user_id: walletConfig.userId,
        wallet_name: walletConfig.walletName,
        exchange_id: walletConfig.exchangeId,
        api_key: walletConfig.apiKey,
        api_secret: walletConfig.apiSecret,
        api_passphrase: walletConfig.apiPassphrase,
        is_testnet: walletConfig.isTestnet || false,
        alert_threshold: walletConfig.alertThreshold,
        alert_enabled: walletConfig.alertEnabled || false,
        status: 'active',
      })
      .select('id')
      .single();
      
    if (error) {
      console.error('Error creating wallet:', error);
      throw new Error(`Failed to create wallet: ${error.message}`);
    }
    
    // Queue an initial balance update
    await this.queueBalanceUpdate(data.id);
    
    return data.id;
  }
  
  /**
   * Update an existing wallet
   */
  static async updateWallet(walletId: string, updates: Partial<WalletConfig>): Promise<void> {
    const supabase = await createServerClient();
    
    const { error } = await supabase
      .from('farm_wallets')
      .update({
        wallet_name: updates.walletName,
        exchange_id: updates.exchangeId,
        api_key: updates.apiKey,
        api_secret: updates.apiSecret,
        api_passphrase: updates.apiPassphrase,
        is_testnet: updates.isTestnet,
        alert_threshold: updates.alertThreshold,
        alert_enabled: updates.alertEnabled,
      })
      .eq('id', walletId);
      
    if (error) {
      console.error('Error updating wallet:', error);
      throw new Error(`Failed to update wallet: ${error.message}`);
    }
    
    // Queue a balance update after config changes
    await this.queueBalanceUpdate(walletId);
  }
  
  /**
   * Delete a wallet
   */
  static async deleteWallet(walletId: string): Promise<void> {
    const supabase = await createServerClient();
    
    const { error } = await supabase
      .from('farm_wallets')
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
      .from('farm_wallets')
      .select('*')
      .eq('id', walletId)
      .single();
      
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
      .from('farm_wallets')
      .select('*')
      .eq('farm_id', farmId);
      
    if (error) {
      console.error('Error fetching farm wallets:', error);
      throw new Error(`Failed to fetch farm wallets: ${error.message}`);
    }
    
    return data || [];
  }
  
  /**
   * Update wallet balances
   */
  static async updateWalletBalance(walletId: string): Promise<Record<string, number>> {
    const supabase = await createServerClient();
    
    // Get wallet details
    const { data: wallet, error: walletError } = await supabase
      .from('farm_wallets')
      .select('*')
      .eq('id', walletId)
      .single();
      
    if (walletError || !wallet) {
      console.error('Error fetching wallet for balance update:', walletError);
      throw new Error(`Failed to fetch wallet: ${walletError?.message}`);
    }
    
    try {
      // Connect to exchange and get balances
      const exchange = await ExchangeService.getExchangeClient(
        wallet.exchange_id,
        wallet.api_key,
        wallet.api_secret,
        wallet.api_passphrase,
        wallet.is_testnet
      );
      
      const balances = await exchange.fetchBalance();
      
      // Format balances
      const formattedBalances: Record<string, number> = {};
      Object.entries(balances.total).forEach(([currency, amount]) => {
        if (amount > 0) {
          formattedBalances[currency] = amount;
        }
      });
      
      // Update wallet record with new balances
      const { error: updateError } = await supabase
        .from('farm_wallets')
        .update({
          balance: formattedBalances,
          last_balance_update: new Date().toISOString()
        })
        .eq('id', walletId);
        
      if (updateError) {
        console.error('Error updating wallet balance:', updateError);
        throw new Error(`Failed to update wallet balance: ${updateError.message}`);
      }
      
      // Check for balance alerts
      if (wallet.alert_enabled && wallet.alert_threshold) {
        await this.checkBalanceAlerts(walletId, formattedBalances);
      }
      
      return formattedBalances;
    } catch (error) {
      console.error('Error fetching balances from exchange:', error);
      throw new Error(`Failed to fetch balances: ${error.message}`);
    }
  }
  
  /**
   * Queue a balance update job
   */
  static async queueBalanceUpdate(walletId: string): Promise<void> {
    const queue = QueueService.getQueue(QueueNames.FARM_MANAGEMENT);
    
    await queue.add('update-wallet-balance', {
      walletId
    }, {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 5000
      }
    });
  }
  
  /**
   * Check for balance alerts
   */
  static async checkBalanceAlerts(
    walletId: string, 
    balances: Record<string, number>
  ): Promise<WalletAlert[]> {
    const supabase = await createServerClient();
    
    // Get wallet details
    const { data: wallet, error: walletError } = await supabase
      .from('farm_wallets')
      .select('*')
      .eq('id', walletId)
      .single();
      
    if (walletError || !wallet) {
      console.error('Error fetching wallet for alerts:', walletError);
      return [];
    }
    
    if (!wallet.alert_enabled || !wallet.alert_threshold) {
      return [];
    }
    
    const alerts: WalletAlert[] = [];
    
    // Convert balances to USD value
    const usdBalances = await this.convertBalancesToUSD(balances);
    const totalUsdValue = Object.values(usdBalances).reduce((sum, val) => sum + val, 0);
    
    // Check if total value is below threshold
    if (totalUsdValue < wallet.alert_threshold) {
      const alert: WalletAlert = {
        walletId,
        currency: 'USD',
        currentBalance: totalUsdValue,
        threshold: wallet.alert_threshold,
        message: `Wallet balance ($${totalUsdValue.toFixed(2)}) is below alert threshold ($${wallet.alert_threshold.toFixed(2)})`,
        timestamp: new Date().toISOString()
      };
      
      alerts.push(alert);
      
      // Add alert to database
      await supabase
        .from('notifications')
        .insert({
          user_id: wallet.user_id,
          type: 'wallet_alert',
          title: 'Wallet Balance Alert',
          message: alert.message,
          data: {
            walletId,
            walletName: wallet.wallet_name,
            farmId: wallet.farm_id,
            alert
          },
          read: false
        });
    }
    
    return alerts;
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
  
  /**
   * Reconcile wallet balances with transaction logs
   */
  static async reconcileWalletBalance(walletId: string) {
    const supabase = await createServerClient();
    
    const { data, error } = await supabase
      .rpc('reconcile_wallet_balances', { p_wallet_id: walletId });
      
    if (error) {
      console.error('Error reconciling wallet balance:', error);
      throw new Error(`Failed to reconcile wallet balance: ${error.message}`);
    }
    
    return data || [];
  }
}
