import { createServerClient } from '@/utils/supabase/server';
import { getExchangeCredentials } from './exchange-credentials-service';
import { exchangeService } from './exchange-service';
import { SupabaseClient } from '@supabase/supabase-js';

/**
 * Service to handle automatic polling of wallet balances from exchanges.
 * This runs on the server to periodically update the wallet_balances table.
 */
export class BalancePollingService {
  private intervalId: NodeJS.Timeout | null = null;
  private pollingIntervalMs: number;
  private isPolling: boolean = false;
  private lastPollTime: Date | null = null;
  private activeExchangeIds: Set<string> = new Set();

  constructor(pollingIntervalMs: number = 300000) { // Default: 5 minutes
    this.pollingIntervalMs = pollingIntervalMs;
  }

  /**
   * Start the polling service
   */
  public async start(): Promise<void> {
    if (this.isPolling) {
      console.log('Balance polling is already running');
      return;
    }

    console.log(`Starting balance polling service with interval: ${this.pollingIntervalMs}ms`);
    this.isPolling = true;
    
    // Run immediately on start
    await this.pollBalances();
    
    // Then set up interval
    this.intervalId = setInterval(async () => {
      await this.pollBalances();
    }, this.pollingIntervalMs);
  }

  /**
   * Stop the polling service
   */
  public stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      this.isPolling = false;
      console.log('Balance polling service stopped');
    }
  }

  /**
   * Poll balances for all active exchanges
   */
  private async pollBalances(): Promise<void> {
    try {
      console.log('Polling wallet balances...');
      this.lastPollTime = new Date();
      
      const supabase = await createServerClient();
      
      // Get all active exchange credentials
      const { data: credentials, error } = await supabase
        .from('exchange_credentials')
        .select('id, user_id, exchange, name, testnet')
        .eq('is_active', true);
      
      if (error) {
        throw new Error(`Failed to fetch exchange credentials: ${error.message}`);
      }
      
      if (!credentials || credentials.length === 0) {
        console.log('No active exchange credentials found.');
        return;
      }
      
      console.log(`Found ${credentials.length} active exchange connections to poll.`);
      
      // Track active exchange IDs
      this.activeExchangeIds = new Set(credentials.map(cred => cred.id));
      
      // Poll each exchange in parallel
      await Promise.allSettled(
        credentials.map(credential => this.pollExchangeBalance(credential, supabase))
      );
      
      console.log('Wallet balance polling completed');
    } catch (error) {
      console.error('Error in balance polling service:', error);
    }
  }

  /**
   * Poll balances for a specific exchange
   */
  private async pollExchangeBalance(
    credential: { id: string; user_id: string; exchange: string; testnet?: boolean },
    supabase: SupabaseClient
  ): Promise<void> {
    try {
      const { id, user_id, exchange } = credential;
      console.log(`Polling balances for exchange: ${exchange} (ID: ${id})`);
      
      // Try to connect to exchange if not already connected
      if (!exchangeService.isExchangeConnected(id)) {
        const exchangeConfig = {
          id,
          user_id,
          name: credential.exchange,
          exchange: credential.exchange,
          active: true,
          testnet: credential.testnet || false,
          margin_enabled: false
        };
        
        const connected = await exchangeService.initializeExchange(exchangeConfig);
        
        if (!connected) {
          console.error(`Failed to connect to exchange: ${exchange}`);
          
          // Update last_failed in credentials table
          await supabase
            .from('exchange_credentials')
            .update({ last_failed: new Date().toISOString() })
            .eq('id', id);
            
          return;
        }
      }
      
      // Fetch wallet balances
      const balances = await exchangeService.getWalletBalances(id);
      
      // Update last_used in credentials table
      await supabase
        .from('exchange_credentials')
        .update({ last_used: new Date().toISOString() })
        .eq('id', id);
      
      // Filter out zero balances
      const balanceEntries = balances
        .filter(b => parseFloat(b.walletBalance) > 0)
        .map(balance => ({
          user_id,
          exchange,
          currency: balance.coin,
          free: parseFloat(balance.free || '0'),
          locked: parseFloat(balance.locked || '0'),
          updated_at: new Date().toISOString()
        }));
      
      if (balanceEntries.length === 0) {
        console.log(`No non-zero balances found for exchange: ${exchange}`);
        return;
      }
      
      // Delete existing balances for this user/exchange
      await supabase
        .from('wallet_balances')
        .delete()
        .eq('user_id', user_id)
        .eq('exchange', exchange);
      
      // Insert new balances
      const { error: insertError } = await supabase
        .from('wallet_balances')
        .insert(balanceEntries);
      
      if (insertError) {
        throw new Error(`Failed to update wallet balances: ${insertError.message}`);
      }
      
      console.log(`Successfully updated ${balanceEntries.length} balances for ${exchange}`);
      
    } catch (error) {
      console.error(`Error polling balance for exchange ID ${credential.id}:`, error);
    }
  }

  /**
   * Force an immediate balance poll for a specific exchange
   */
  public async forcePoll(exchangeId: string): Promise<boolean> {
    try {
      const supabase = await createServerClient();
      
      // Get exchange credential
      const { data: credential, error } = await supabase
        .from('exchange_credentials')
        .select('id, user_id, exchange, name, testnet')
        .eq('id', exchangeId)
        .single();
      
      if (error || !credential) {
        console.error(`Failed to fetch exchange credential: ${error?.message}`);
        return false;
      }
      
      // Poll exchange balance
      await this.pollExchangeBalance(credential, supabase);
      return true;
    } catch (error) {
      console.error(`Error force polling exchange ${exchangeId}:`, error);
      return false;
    }
  }

  /**
   * Get the status of the polling service
   */
  public getStatus() {
    return {
      isPolling: this.isPolling,
      pollingIntervalMs: this.pollingIntervalMs,
      lastPollTime: this.lastPollTime,
      activeExchangeCount: this.activeExchangeIds.size,
      activeExchangeIds: Array.from(this.activeExchangeIds)
    };
  }
}

// Create singleton instance
export const balancePollingService = new BalancePollingService(
  process.env.NEXT_PUBLIC_BALANCE_POLL_INTERVAL ? 
    parseInt(process.env.NEXT_PUBLIC_BALANCE_POLL_INTERVAL) : 
    300000
);
