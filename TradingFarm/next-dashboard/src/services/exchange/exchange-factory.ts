/**
 * Exchange Factory
 * 
 * Centralized registry for creating and managing exchange connections
 */

import { ExchangeBase, ExchangeCredentials } from './exchange-base';
import { BybitExchange, BybitCredentials } from './bybit-exchange';
import { CoinbaseExchange, CoinbaseCredentials } from './coinbase-exchange';
import { HyperliquidExchange, HyperliquidCredentials } from './hyperliquid-exchange';
import { createServerClient } from '@/utils/supabase/server';
import { createBrowserClient } from '@/utils/supabase/client';

// Exchange types supported by the factory
export type ExchangeType = 'bybit' | 'coinbase' | 'hyperliquid';

// Exchange connection configuration
export interface ExchangeConnection {
  id: number;
  userId: string;
  name: string;
  exchange: ExchangeType;
  isTestnet: boolean;
  credentials: ExchangeCredentials;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

// Exchange instance cache
type ExchangeCache = Map<string, { instance: ExchangeBase; lastUsed: number }>;

/**
 * Exchange Factory - Manages connections to various exchanges
 */
export class ExchangeFactory {
  private static instance: ExchangeFactory;
  private exchangeCache: ExchangeCache = new Map();
  private cacheTTL = 1000 * 60 * 30; // 30 minutes
  private cacheCleanupInterval: NodeJS.Timeout | null = null;

  private constructor() {
    // Initialize cache cleanup interval
    this.cacheCleanupInterval = setInterval(() => {
      this.cleanupCache();
    }, 1000 * 60 * 5); // Clean up every 5 minutes
  }

  /**
   * Get the singleton instance of the factory
   */
  public static getInstance(): ExchangeFactory {
    if (!ExchangeFactory.instance) {
      ExchangeFactory.instance = new ExchangeFactory();
    }
    return ExchangeFactory.instance;
  }

  /**
   * Clean up expired cache entries
   */
  private cleanupCache(): void {
    const now = Date.now();
    
    for (const [key, value] of this.exchangeCache.entries()) {
      if (now - value.lastUsed > this.cacheTTL) {
        this.exchangeCache.delete(key);
      }
    }
  }

  /**
   * Create a new exchange instance
   */
  private createExchangeInstance(
    exchangeType: ExchangeType,
    isTestnet: boolean,
    credentials?: ExchangeCredentials
  ): ExchangeBase {
    switch (exchangeType) {
      case 'bybit':
        const bybitExchange = new BybitExchange(isTestnet);
        if (credentials) {
          bybitExchange.setCredentials(credentials as BybitCredentials);
        }
        return bybitExchange;

      case 'coinbase':
        const coinbaseExchange = new CoinbaseExchange(isTestnet);
        if (credentials) {
          coinbaseExchange.setCredentials(credentials as CoinbaseCredentials);
        }
        return coinbaseExchange;

      case 'hyperliquid':
        const hyperliquidExchange = new HyperliquidExchange(isTestnet);
        if (credentials) {
          hyperliquidExchange.setCredentials(credentials as HyperliquidCredentials);
        }
        return hyperliquidExchange;

      default:
        throw new Error(`Unsupported exchange type: ${exchangeType}`);
    }
  }

  /**
   * Get an exchange instance with optional credentials
   * If no credentials are provided, returns a read-only instance
   */
  public getExchange(
    exchangeType: ExchangeType,
    isTestnet: boolean = false,
    credentials?: ExchangeCredentials
  ): ExchangeBase {
    // Create a cache key
    const hasCredentials = !!credentials;
    const cacheKey = `${exchangeType}_${isTestnet}_${hasCredentials ? 'auth' : 'public'}`;
    
    // Check cache for existing instance
    if (this.exchangeCache.has(cacheKey)) {
      const cachedExchange = this.exchangeCache.get(cacheKey)!;
      cachedExchange.lastUsed = Date.now();
      return cachedExchange.instance;
    }
    
    // Create a new instance
    const exchange = this.createExchangeInstance(exchangeType, isTestnet, credentials);
    
    // Cache the instance
    this.exchangeCache.set(cacheKey, {
      instance: exchange,
      lastUsed: Date.now()
    });
    
    return exchange;
  }

  /**
   * Get an exchange instance from a stored connection ID
   */
  public async getExchangeByConnectionId(connectionId: number): Promise<ExchangeBase | null> {
    try {
      const supabase = createBrowserClient();
      
      // Get connection details from the database
      const { data: connection, error } = await supabase
        .from('exchange_connections')
        .select('*')
        .eq('id', connectionId)
        .single();
      
      if (error || !connection) {
        console.error('Error fetching exchange connection:', error);
        return null;
      }
      
      // Create and return exchange instance
      return this.getExchange(
        connection.exchange as ExchangeType,
        connection.is_testnet,
        connection.credentials as ExchangeCredentials
      );
    } catch (error) {
      console.error('Error getting exchange by connection ID:', error);
      return null;
    }
  }

  /**
   * Get the default exchange connection for a user
   */
  public async getDefaultExchange(userId?: string): Promise<ExchangeBase | null> {
    try {
      const supabase = createBrowserClient();
      
      // Get the default connection from the database
      const { data: connection, error } = await supabase
        .from('exchange_connections')
        .select('*')
        .eq('is_default', true)
        .eq('user_id', userId || (await supabase.auth.getUser()).data.user?.id)
        .single();
      
      if (error || !connection) {
        console.error('No default exchange connection found');
        return null;
      }
      
      // Create and return exchange instance
      return this.getExchange(
        connection.exchange as ExchangeType,
        connection.is_testnet,
        connection.credentials as ExchangeCredentials
      );
    } catch (error) {
      console.error('Error getting default exchange:', error);
      return null;
    }
  }

  /**
   * Store a new exchange connection in the database
   */
  public async storeExchangeConnection(
    name: string,
    exchange: ExchangeType,
    isTestnet: boolean,
    credentials: ExchangeCredentials,
    isDefault: boolean = false
  ): Promise<number | null> {
    try {
      const supabase = createBrowserClient();
      
      // Store connection in the database
      const { data, error } = await supabase
        .from('exchange_connections')
        .insert({
          name,
          exchange,
          is_testnet: isTestnet,
          credentials,
          is_default: isDefault
        })
        .select()
        .single();
      
      if (error) {
        console.error('Error storing exchange connection:', error);
        return null;
      }
      
      // If this is the default connection, update other connections
      if (isDefault) {
        await supabase
          .from('exchange_connections')
          .update({ is_default: false })
          .neq('id', data.id);
      }
      
      return data.id;
    } catch (error) {
      console.error('Error storing exchange connection:', error);
      return null;
    }
  }

  /**
   * Update an existing exchange connection
   */
  public async updateExchangeConnection(
    connectionId: number,
    updates: Partial<Omit<ExchangeConnection, 'id' | 'userId' | 'createdAt' | 'updatedAt'>>
  ): Promise<boolean> {
    try {
      const supabase = createBrowserClient();
      
      // Update connection in the database
      const { error } = await supabase
        .from('exchange_connections')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', connectionId);
      
      if (error) {
        console.error('Error updating exchange connection:', error);
        return false;
      }
      
      // If this is being set as default, update other connections
      if (updates.isDefault) {
        await supabase
          .from('exchange_connections')
          .update({ is_default: false })
          .neq('id', connectionId);
      }
      
      return true;
    } catch (error) {
      console.error('Error updating exchange connection:', error);
      return false;
    }
  }

  /**
   * Delete an exchange connection
   */
  public async deleteExchangeConnection(connectionId: number): Promise<boolean> {
    try {
      const supabase = createBrowserClient();
      
      // Check if this is the default connection
      const { data: connection, error: fetchError } = await supabase
        .from('exchange_connections')
        .select('is_default')
        .eq('id', connectionId)
        .single();
      
      if (fetchError) {
        console.error('Error fetching exchange connection:', fetchError);
        return false;
      }
      
      // Delete the connection
      const { error } = await supabase
        .from('exchange_connections')
        .delete()
        .eq('id', connectionId);
      
      if (error) {
        console.error('Error deleting exchange connection:', error);
        return false;
      }
      
      // If this was the default connection, set another as default if available
      if (connection.is_default) {
        const { data: connections, error: listError } = await supabase
          .from('exchange_connections')
          .select('id')
          .limit(1);
        
        if (!listError && connections && connections.length > 0) {
          await supabase
            .from('exchange_connections')
            .update({ is_default: true })
            .eq('id', connections[0].id);
        }
      }
      
      return true;
    } catch (error) {
      console.error('Error deleting exchange connection:', error);
      return false;
    }
  }

  /**
   * List all exchange connections for the current user
   */
  public async listExchangeConnections(): Promise<ExchangeConnection[]> {
    try {
      const supabase = createBrowserClient();
      
      // Get all connections from the database
      const { data, error } = await supabase
        .from('exchange_connections')
        .select('*')
        .order('is_default', { ascending: false })
        .order('name', { ascending: true });
      
      if (error) {
        console.error('Error listing exchange connections:', error);
        return [];
      }
      
      return data as ExchangeConnection[];
    } catch (error) {
      console.error('Error listing exchange connections:', error);
      return [];
    }
  }

  /**
   * Test a connection to an exchange
   */
  public async testConnection(
    exchange: ExchangeType,
    isTestnet: boolean,
    credentials: ExchangeCredentials
  ): Promise<boolean> {
    try {
      const exchangeInstance = this.getExchange(exchange, isTestnet, credentials);
      
      // Test authentication by fetching account info
      await exchangeInstance.getAccountInfo();
      
      return true;
    } catch (error) {
      console.error('Connection test failed:', error);
      return false;
    }
  }

  /**
   * Dispose of the factory instance
   */
  public dispose(): void {
    if (this.cacheCleanupInterval) {
      clearInterval(this.cacheCleanupInterval);
      this.cacheCleanupInterval = null;
    }
    
    this.exchangeCache.clear();
  }
}

// Database migrations for exchange connections
export async function createExchangeConnectionsTable() {
  const supabase = createServerClient();
  
  // Create the exchange_connections table if it doesn't exist
  const { error } = await supabase.rpc('create_exchange_connections_table');
  
  if (error) {
    console.error('Error creating exchange connections table:', error);
    throw error;
  }
}
