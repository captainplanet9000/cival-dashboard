/**
 * Exchange Service
 * 
 * Central service for managing exchange connections and credentials.
 * Provides a unified interface for interacting with different exchanges.
 */

import { createServerClient } from '../supabase/server';
import { createBrowserClient } from '../supabase/client';
import { ExchangeId } from '../websocket/websocket-types';
import { ApiCredentials, ExchangeConfig, AccountInfo, Balance, MarketData } from './exchange-types';
import { ExchangeConnector } from './exchange-connector';
import { decryptApiCredentials } from '../crypto';
import { BinanceConnector } from './connectors/binance-connector';
import { HyperliquidConnector } from './connectors/hyperliquid-connector';

// Singleton instance
let instance: ExchangeService | null = null;

export class ExchangeService {
  private exchanges: Map<string, ExchangeConnector> = new Map();
  private credentials: Map<string, ApiCredentials> = new Map();
  private isServer: boolean;
  
  private constructor(isServer: boolean = false) {
    this.isServer = isServer;
  }
  
  /**
   * Get singleton instance of the exchange service
   */
  static getInstance(isServer: boolean = false): ExchangeService {
    if (!instance) {
      instance = new ExchangeService(isServer);
    }
    return instance;
  }
  
  /**
   * Create a connector for the specified exchange
   */
  private createConnector(
    exchange: ExchangeId, 
    credentials: ApiCredentials
  ): ExchangeConnector {
    switch (exchange) {
      case 'binance':
        return new BinanceConnector({
          exchange,
          credentials
        });
      
      case 'hyperliquid':
        return new HyperliquidConnector({
          exchange,
          credentials
        });
      
      default:
        throw new Error(`Unsupported exchange: ${exchange}`);
    }
  }
  
  /**
   * Load user credentials for all exchanges
   */
  async loadUserCredentials(userId: string): Promise<ExchangeId[]> {
    try {
      const supabase = this.isServer 
        ? await createServerClient()
        : createBrowserClient();
      
      const { data, error } = await supabase
        .from('exchange_credentials')
        .select('*')
        .eq('user_id', userId)
        .eq('is_active', true);
      
      if (error) {
        throw error;
      }
      
      // Clear existing credentials
      this.credentials.clear();
      this.exchanges.clear();
      
      // Process each set of credentials
      const loadedExchanges: ExchangeId[] = [];
      
      for (const cred of data) {
        try {
          const exchangeId = cred.exchange as ExchangeId;
          const apiKeyData = JSON.parse(cred.api_key_encrypted);
          const apiSecretData = JSON.parse(cred.api_secret_encrypted);
          
          // Decrypt the credentials
          const { apiKey, apiSecret } = decryptApiCredentials(apiKeyData, apiSecretData);
          
          // Store the credentials
          this.credentials.set(exchangeId, {
            apiKey,
            apiSecret,
            passphrase: cred.passphrase || undefined
          });
          
          loadedExchanges.push(exchangeId);
        } catch (err) {
          console.error(`Failed to process credentials for ${cred.exchange}:`, err);
        }
      }
      
      return loadedExchanges;
    } catch (error) {
      console.error('Failed to load user credentials:', error);
      return [];
    }
  }
  
  /**
   * Get or create a connector for the specified exchange
   */
  async getConnector(exchange: ExchangeId): Promise<ExchangeConnector | null> {
    // Check if we already have an initialized connector
    if (this.exchanges.has(exchange)) {
      return this.exchanges.get(exchange) || null;
    }
    
    // Check if we have credentials for this exchange
    const credentials = this.credentials.get(exchange);
    if (!credentials) {
      return null;
    }
    
    try {
      // Create a new connector
      const connector = this.createConnector(exchange, credentials);
      
      // Initialize the connector
      await connector.connect();
      
      // Store the connector
      this.exchanges.set(exchange, connector);
      
      return connector;
    } catch (error) {
      console.error(`Failed to initialize ${exchange} connector:`, error);
      return null;
    }
  }
  
  /**
   * Check if we have credentials for the specified exchange
   */
  hasCredentials(exchange: ExchangeId): boolean {
    return this.credentials.has(exchange);
  }
  
  /**
   * Get all available exchanges with credentials
   */
  getAvailableExchanges(): ExchangeId[] {
    return Array.from(this.credentials.keys()) as ExchangeId[];
  }
  
  /**
   * Get account information from all connected exchanges
   */
  async getAllAccountInfo(): Promise<Map<ExchangeId, AccountInfo>> {
    const results = new Map<ExchangeId, AccountInfo>();
    
    // Convert entries to array to avoid TS iteration error
    const exchanges = Array.from(this.exchanges.entries());
    
    for (const [exchangeId, connector] of exchanges) {
      try {
        const accountInfo = await connector.getAccountInfo();
        results.set(exchangeId as ExchangeId, accountInfo);
      } catch (error) {
        console.error(`Failed to get account info for ${exchangeId}:`, error);
      }
    }
    
    return results;
  }
  
  /**
   * Update wallet balances in the database
   */
  async updateWalletBalances(userId: string): Promise<void> {
    try {
      const supabase = this.isServer 
        ? await createServerClient()
        : createBrowserClient();
      
      // Get account info from all exchanges
      const allAccountInfo = await this.getAllAccountInfo();
      
      // Prepare balance updates
      const balanceUpdates = [];
      
      // Convert entries to array to avoid TS iteration error
      const accountInfoEntries = Array.from(allAccountInfo.entries());
      
      for (const [exchange, accountInfo] of accountInfoEntries) {
        // Convert balance entries to array
        const balanceEntries = Array.from(accountInfo.balances.entries());
        
        for (const [currency, balance] of balanceEntries) {
          // Only include non-zero balances
          if (balance.total > 0) {
            balanceUpdates.push({
              user_id: userId,
              exchange,
              currency,
              free: balance.free,
              locked: balance.used,
              updated_at: new Date().toISOString()
            });
          }
        }
      }
      
      if (balanceUpdates.length > 0) {
        // Use upsert to add or update balances
        const { error } = await supabase
          .from('wallet_balances')
          .upsert(balanceUpdates, {
            onConflict: 'user_id,exchange,currency',
            ignoreDuplicates: false
          });
        
        if (error) {
          throw error;
        }
      }
    } catch (error) {
      console.error('Failed to update wallet balances:', error);
    }
  }
  
  /**
   * Get market data for a symbol across all exchanges
   */
  async getMarketDataAcrossExchanges(symbol: string): Promise<Map<ExchangeId, MarketData>> {
    const results = new Map<ExchangeId, MarketData>();
    
    // Normalize the symbol format (different exchanges may use different formats)
    const normalizedSymbol = this.normalizeSymbol(symbol);
    
    // Convert entries to array to avoid TS iteration error
    const exchanges = Array.from(this.exchanges.entries());
    
    for (const [exchangeId, connector] of exchanges) {
      try {
        const marketData = await connector.getMarketData(normalizedSymbol);
        results.set(exchangeId as ExchangeId, marketData);
      } catch (error) {
        console.error(`Failed to get market data for ${symbol} on ${exchangeId}:`, error);
      }
    }
    
    return results;
  }
  
  /**
   * Normalize symbol format based on exchange requirements
   */
  private normalizeSymbol(symbol: string): string {
    // Remove any whitespace
    let normalized = symbol.trim();
    
    // Standardize to uppercase
    normalized = normalized.toUpperCase();
    
    // Check if contains a separator - if not, assume BTC/USDT format
    if (!normalized.includes('/') && !normalized.includes('-')) {
      // If it's a single currency, return as is
      if (/^[A-Z0-9]+$/.test(normalized)) {
        return normalized;
      }
      
      // Try to identify base and quote currencies
      const matches = normalized.match(/^([A-Z0-9]+)([A-Z0-9]+)$/);
      if (matches && matches.length === 3) {
        const base = matches[1];
        const quote = matches[2];
        
        // Common quote currencies
        const quoteCurrencies = ['USDT', 'USD', 'BTC', 'ETH', 'BUSD', 'USDC'];
        
        for (const quoteCurrency of quoteCurrencies) {
          if (quote.endsWith(quoteCurrency)) {
            const actualBase = quote.substring(0, quote.length - quoteCurrency.length);
            return `${actualBase}/${quoteCurrency}`;
          }
        }
        
        // Default format
        return `${base}/${quote}`;
      }
    }
    
    return normalized;
  }
  
  /**
   * Test all exchange connections
   */
  async testAllConnections(): Promise<Map<ExchangeId, boolean>> {
    const results = new Map<ExchangeId, boolean>();
    
    for (const exchangeId of this.getAvailableExchanges()) {
      try {
        const connector = await this.getConnector(exchangeId);
        if (connector) {
          const testResult = await connector.testConnection();
          results.set(exchangeId, testResult.success);
        } else {
          results.set(exchangeId, false);
        }
      } catch (error) {
        console.error(`Failed to test connection for ${exchangeId}:`, error);
        results.set(exchangeId, false);
      }
    }
    
    return results;
  }
  
  /**
   * Clear all connections and credentials
   */
  clearAll(): void {
    this.exchanges.clear();
    this.credentials.clear();
  }
}
