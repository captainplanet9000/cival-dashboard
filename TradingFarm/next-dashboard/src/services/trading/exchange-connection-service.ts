import { createServerClient } from '@/utils/supabase/server';
import type { SupabaseClient } from '@supabase/supabase-js';
import { Database } from '@/types/database.types';
import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';

interface ExchangeCredentials {
  apiKey: string;
  apiSecret: string;
  passphrase?: string;
  additionalParams?: Record<string, any>;
}

interface ExchangeConnection {
  id: string;
  user_id: string;
  exchange_id: string;
  exchange_name: string;
  label: string;
  is_active: boolean;
  is_testnet: boolean;
  credentials_id: string;
  markets: string[];
  permissions: string[];
  created_at: string;
  updated_at: string;
}

interface ExchangeConfig {
  id: string;
  name: string;
  baseUrl: string;
  testnetUrl?: string;
  supportsMargin: boolean;
  supportsFutures: boolean;
  supportsSpot: boolean;
  requiredCredentials: string[];
  marketsUpdateInterval: number;
  rateLimits: {
    maxRequestsPerSecond: number;
    maxRequestsPerMinute: number;
  };
}

export class ExchangeConnectionService {
  private supabase: SupabaseClient<Database>;
  private ENCRYPTION_KEY: string;
  private ENCRYPTION_IV: string;
  
  // Map of exchange adapters indexed by exchange ID
  private exchangeAdapters: Map<string, any> = new Map();
  
  // Exchange configurations
  private exchangeConfigs: Record<string, ExchangeConfig> = {
    'coinbase': {
      id: 'coinbase',
      name: 'Coinbase',
      baseUrl: 'https://api.coinbase.com',
      supportsMargin: false,
      supportsFutures: false,
      supportsSpot: true,
      requiredCredentials: ['apiKey', 'apiSecret', 'passphrase'],
      marketsUpdateInterval: 3600 * 1000, // 1 hour
      rateLimits: {
        maxRequestsPerSecond: 10,
        maxRequestsPerMinute: 300
      }
    },
    'bybit': {
      id: 'bybit',
      name: 'Bybit',
      baseUrl: 'https://api.bybit.com',
      testnetUrl: 'https://api-testnet.bybit.com',
      supportsMargin: true,
      supportsFutures: true,
      supportsSpot: true,
      requiredCredentials: ['apiKey', 'apiSecret'],
      marketsUpdateInterval: 3600 * 1000, // 1 hour
      rateLimits: {
        maxRequestsPerSecond: 5,
        maxRequestsPerMinute: 120
      }
    },
    'hyperliquid': {
      id: 'hyperliquid',
      name: 'Hyperliquid',
      baseUrl: 'https://api.hyperliquid.xyz',
      testnetUrl: 'https://api.testnet.hyperliquid.xyz',
      supportsMargin: false,
      supportsFutures: true,
      supportsSpot: false,
      requiredCredentials: ['apiKey', 'apiSecret'],
      marketsUpdateInterval: 3600 * 1000, // 1 hour
      rateLimits: {
        maxRequestsPerSecond: 10,
        maxRequestsPerMinute: 200
      }
    }
  };
  
  constructor(supabaseClient: SupabaseClient<Database>) {
    this.supabase = supabaseClient;
    // In a real application, these would come from environment variables
    // For demo purposes, we're using fixed values (these would be stored securely in a production environment)
    this.ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6';
    this.ENCRYPTION_IV = process.env.ENCRYPTION_IV || 'fedcba9876543210';
  }
  
  /**
   * Static factory method to create a service instance
   */
  public static async create(): Promise<ExchangeConnectionService> {
    const supabase = await createServerClient();
    return new ExchangeConnectionService(supabase);
  }
  
  /**
   * Get all supported exchanges
   */
  public getSupportedExchanges(): ExchangeConfig[] {
    return Object.values(this.exchangeConfigs);
  }
  
  /**
   * Get an exchange configuration
   */
  public getExchangeConfig(exchangeId: string): ExchangeConfig | undefined {
    return this.exchangeConfigs[exchangeId];
  }
  
  /**
   * Get all exchange connections for a user
   */
  public async getUserExchangeConnections(userId: string): Promise<ExchangeConnection[]> {
    try {
      const { data, error } = await this.supabase
        .from('exchange_connections')
        .select('*')
        .eq('user_id', userId);
      
      if (error) {
        throw new Error(`Error fetching exchange connections: ${error.message}`);
      }
      
      return data as ExchangeConnection[];
    } catch (error: any) {
      console.error('Error in getUserExchangeConnections:', error);
      return [];
    }
  }
  
  /**
   * Create a new exchange connection
   */
  public async createExchangeConnection(
    userId: string,
    exchangeId: string,
    label: string,
    credentials: ExchangeCredentials,
    isTestnet: boolean = false
  ): Promise<{ success: boolean; connectionId?: string; error?: string }> {
    try {
      // Validate exchange
      const exchangeConfig = this.exchangeConfigs[exchangeId];
      if (!exchangeConfig) {
        return { success: false, error: `Unsupported exchange: ${exchangeId}` };
      }
      
      // Validate required credentials
      for (const required of exchangeConfig.requiredCredentials) {
        if (!(required in credentials)) {
          return { success: false, error: `Missing required credential: ${required}` };
        }
      }
      
      // Encrypt the credentials
      const encryptedCredentials = this.encryptCredentials(credentials);
      
      // Store the encrypted credentials
      const credentialsId = uuidv4();
      
      const { error: credentialsError } = await this.supabase
        .from('exchange_credentials')
        .insert({
          id: credentialsId,
          user_id: userId,
          encrypted_data: encryptedCredentials,
          created_at: new Date().toISOString()
        });
      
      if (credentialsError) {
        throw new Error(`Error storing credentials: ${credentialsError.message}`);
      }
      
      // Create the exchange connection
      const connectionId = uuidv4();
      
      const { error: connectionError } = await this.supabase
        .from('exchange_connections')
        .insert({
          id: connectionId,
          user_id: userId,
          exchange_id: exchangeId,
          exchange_name: exchangeConfig.name,
          label,
          is_active: true,
          is_testnet: isTestnet,
          credentials_id: credentialsId,
          markets: [],
          permissions: ['read', 'trade'], // Default permissions
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });
      
      if (connectionError) {
        throw new Error(`Error creating connection: ${connectionError.message}`);
      }
      
      // Test the connection
      try {
        await this.testConnection(connectionId, credentials);
      } catch (testError: any) {
        console.warn(`Connection test failed: ${testError.message}`);
        // Continue anyway, since the connection was created
      }
      
      return { success: true, connectionId };
    } catch (error: any) {
      console.error('Error in createExchangeConnection:', error);
      return { success: false, error: `Failed to create exchange connection: ${error.message}` };
    }
  }
  
  /**
   * Update an exchange connection
   */
  public async updateExchangeConnection(
    connectionId: string,
    updates: {
      label?: string;
      isActive?: boolean;
      isTestnet?: boolean;
      credentials?: ExchangeCredentials;
      markets?: string[];
      permissions?: string[];
    }
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // Get the current connection
      const { data: connection, error: connectionError } = await this.supabase
        .from('exchange_connections')
        .select('*')
        .eq('id', connectionId)
        .single();
      
      if (connectionError || !connection) {
        return { success: false, error: `Connection not found: ${connectionError?.message || 'Unknown error'}` };
      }
      
      // Update the connection fields
      const fieldsToUpdate: any = {
        updated_at: new Date().toISOString()
      };
      
      if (updates.label !== undefined) fieldsToUpdate.label = updates.label;
      if (updates.isActive !== undefined) fieldsToUpdate.is_active = updates.isActive;
      if (updates.isTestnet !== undefined) fieldsToUpdate.is_testnet = updates.isTestnet;
      if (updates.markets !== undefined) fieldsToUpdate.markets = updates.markets;
      if (updates.permissions !== undefined) fieldsToUpdate.permissions = updates.permissions;
      
      // If credentials are being updated, handle them separately
      if (updates.credentials) {
        // Encrypt the new credentials
        const encryptedCredentials = this.encryptCredentials(updates.credentials);
        
        // Update the credentials
        const { error: credentialsError } = await this.supabase
          .from('exchange_credentials')
          .update({
            encrypted_data: encryptedCredentials,
            updated_at: new Date().toISOString()
          })
          .eq('id', connection.credentials_id);
        
        if (credentialsError) {
          throw new Error(`Error updating credentials: ${credentialsError.message}`);
        }
        
        // Test the new credentials
        try {
          await this.testConnection(connectionId, updates.credentials);
        } catch (testError: any) {
          console.warn(`Connection test failed: ${testError.message}`);
          // Continue anyway, since the credentials were updated
        }
      }
      
      // Update the connection
      const { error: updateError } = await this.supabase
        .from('exchange_connections')
        .update(fieldsToUpdate)
        .eq('id', connectionId);
      
      if (updateError) {
        throw new Error(`Error updating connection: ${updateError.message}`);
      }
      
      return { success: true };
    } catch (error: any) {
      console.error('Error in updateExchangeConnection:', error);
      return { success: false, error: `Failed to update exchange connection: ${error.message}` };
    }
  }
  
  /**
   * Delete an exchange connection
   */
  public async deleteExchangeConnection(connectionId: string): Promise<{ success: boolean; error?: string }> {
    try {
      // Get the connection to retrieve the credentials ID
      const { data: connection, error: connectionError } = await this.supabase
        .from('exchange_connections')
        .select('credentials_id')
        .eq('id', connectionId)
        .single();
      
      if (connectionError || !connection) {
        return { success: false, error: `Connection not found: ${connectionError?.message || 'Unknown error'}` };
      }
      
      // Delete the connection
      const { error: deleteError } = await this.supabase
        .from('exchange_connections')
        .delete()
        .eq('id', connectionId);
      
      if (deleteError) {
        throw new Error(`Error deleting connection: ${deleteError.message}`);
      }
      
      // Delete the credentials
      const { error: credentialsError } = await this.supabase
        .from('exchange_credentials')
        .delete()
        .eq('id', connection.credentials_id);
      
      if (credentialsError) {
        console.warn(`Error deleting credentials: ${credentialsError.message}`);
        // Continue anyway, since the connection was deleted
      }
      
      return { success: true };
    } catch (error: any) {
      console.error('Error in deleteExchangeConnection:', error);
      return { success: false, error: `Failed to delete exchange connection: ${error.message}` };
    }
  }
  
  /**
   * Get connection details for an agent
   * This encapsulates the logic of finding the appropriate exchange connection
   * for a given agent based on agent configuration
   */
  public async getAgentExchangeConnection(agentId: string): Promise<{
    connection?: ExchangeConnection;
    credentials?: ExchangeCredentials;
    error?: string;
  }> {
    try {
      // Get the agent details
      const { data: agent, error: agentError } = await this.supabase
        .from('elizaos_agents')
        .select('user_id, configuration')
        .eq('id', agentId)
        .single();
      
      if (agentError || !agent) {
        return { error: `Agent not found: ${agentError?.message || 'Unknown error'}` };
      }
      
      const userId = agent.user_id;
      const exchange_id = agent.configuration?.exchange_id;
      
      if (!exchange_id) {
        return { error: 'Agent has no exchange_id configured' };
      }
      
      // Get the exchange connection for this user and exchange
      const { data: connections, error: connectionsError } = await this.supabase
        .from('exchange_connections')
        .select('*')
        .eq('user_id', userId)
        .eq('exchange_id', exchange_id)
        .eq('is_active', true);
      
      if (connectionsError) {
        return { error: `Error fetching connections: ${connectionsError.message}` };
      }
      
      if (!connections || connections.length === 0) {
        return { error: `No active connection found for exchange ${exchange_id}` };
      }
      
      // Use the first active connection
      const connection = connections[0] as ExchangeConnection;
      
      // Get the credentials
      const { data: credentialsData, error: credentialsError } = await this.supabase
        .from('exchange_credentials')
        .select('encrypted_data')
        .eq('id', connection.credentials_id)
        .single();
      
      if (credentialsError || !credentialsData) {
        return { error: `Credentials not found: ${credentialsError?.message || 'Unknown error'}` };
      }
      
      // Decrypt the credentials
      const credentials = this.decryptCredentials(credentialsData.encrypted_data);
      
      return { connection, credentials };
    } catch (error: any) {
      console.error('Error in getAgentExchangeConnection:', error);
      return { error: `Failed to get agent exchange connection: ${error.message}` };
    }
  }
  
  /**
   * Get an exchange adapter for a specific connection
   * This handles the creation and caching of exchange adapters
   */
  public async getExchangeAdapter(connectionId: string): Promise<any> {
    // Check if we already have an adapter for this connection
    if (this.exchangeAdapters.has(connectionId)) {
      return this.exchangeAdapters.get(connectionId);
    }
    
    try {
      // Get the connection details
      const { data: connection, error: connectionError } = await this.supabase
        .from('exchange_connections')
        .select('*')
        .eq('id', connectionId)
        .single();
      
      if (connectionError || !connection) {
        throw new Error(`Connection not found: ${connectionError?.message || 'Unknown error'}`);
      }
      
      // Get the credentials
      const { data: credentialsData, error: credentialsError } = await this.supabase
        .from('exchange_credentials')
        .select('encrypted_data')
        .eq('id', connection.credentials_id)
        .single();
      
      if (credentialsError || !credentialsData) {
        throw new Error(`Credentials not found: ${credentialsError?.message || 'Unknown error'}`);
      }
      
      // Decrypt the credentials
      const credentials = this.decryptCredentials(credentialsData.encrypted_data);
      
      // Create the appropriate adapter based on exchange_id
      const adapter = await this.createExchangeAdapter(
        connection.exchange_id,
        credentials,
        connection.is_testnet
      );
      
      // Cache the adapter
      this.exchangeAdapters.set(connectionId, adapter);
      
      return adapter;
    } catch (error: any) {
      console.error('Error creating exchange adapter:', error);
      throw new Error(`Failed to create exchange adapter: ${error.message}`);
    }
  }
  
  /**
   * Test a connection by making a simple API call
   */
  private async testConnection(
    connectionId: string,
    credentials: ExchangeCredentials
  ): Promise<boolean> {
    try {
      // Get the connection details
      const { data: connection, error: connectionError } = await this.supabase
        .from('exchange_connections')
        .select('exchange_id, is_testnet')
        .eq('id', connectionId)
        .single();
      
      if (connectionError || !connection) {
        throw new Error(`Connection not found: ${connectionError?.message || 'Unknown error'}`);
      }
      
      // Create a temporary adapter
      const adapter = await this.createExchangeAdapter(
        connection.exchange_id,
        credentials,
        connection.is_testnet
      );
      
      // Try to fetch the account balance
      await adapter.fetchBalance();
      
      return true;
    } catch (error: any) {
      console.error('Connection test failed:', error);
      throw new Error(`Connection test failed: ${error.message}`);
    }
  }
  
  /**
   * Create the appropriate exchange adapter
   */
  private async createExchangeAdapter(
    exchangeId: string,
    credentials: ExchangeCredentials,
    isTestnet: boolean
  ): Promise<any> {
    // In a real application, this would dynamically import the appropriate adapter
    // For this example, we'll just create a simple mock adapter
    const exchangeConfig = this.exchangeConfigs[exchangeId];
    
    if (!exchangeConfig) {
      throw new Error(`Unsupported exchange: ${exchangeId}`);
    }
    
    // This is where you would dynamically load the real exchange adapter
    // For now, we'll create a simple mock adapter with common methods
    const adapter = {
      exchangeId,
      exchangeName: exchangeConfig.name,
      credentials,
      isTestnet,
      baseUrl: isTestnet && exchangeConfig.testnetUrl ? exchangeConfig.testnetUrl : exchangeConfig.baseUrl,
      
      // Common methods that all adapters would implement
      fetchBalance: async () => {
        // Simulate API call
        await new Promise(resolve => setTimeout(resolve, 500));
        return {
          BTC: { free: 1.0, used: 0.5, total: 1.5 },
          ETH: { free: 10.0, used: 2.0, total: 12.0 },
          USDT: { free: 10000.0, used: 5000.0, total: 15000.0 }
        };
      },
      
      fetchMarkets: async () => {
        // Simulate API call
        await new Promise(resolve => setTimeout(resolve, 500));
        return [
          { symbol: 'BTC/USDT', base: 'BTC', quote: 'USDT', active: true },
          { symbol: 'ETH/USDT', base: 'ETH', quote: 'USDT', active: true },
          { symbol: 'SOL/USDT', base: 'SOL', quote: 'USDT', active: true }
        ];
      },
      
      createOrder: async (symbol: string, type: string, side: string, amount: number, price?: number) => {
        // Simulate API call
        await new Promise(resolve => setTimeout(resolve, 500));
        return {
          id: uuidv4(),
          symbol,
          type,
          side,
          amount,
          price: price || 0,
          status: 'open',
          timestamp: Date.now()
        };
      },
      
      cancelOrder: async (orderId: string, symbol?: string) => {
        // Simulate API call
        await new Promise(resolve => setTimeout(resolve, 500));
        return {
          id: orderId,
          status: 'canceled',
          timestamp: Date.now()
        };
      },
      
      fetchOHLCV: async (symbol: string, timeframe: string, since?: number, limit?: number) => {
        // Simulate API call
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Generate mock OHLCV data
        const now = Date.now();
        const interval = this.getTimeframeInMs(timeframe);
        const candles = [];
        
        for (let i = 0; i < (limit || 100); i++) {
          const timestamp = now - (i * interval);
          candles.push([
            timestamp,                    // timestamp
            50000 - Math.random() * 1000, // open
            50000 + Math.random() * 1000, // high
            50000 - Math.random() * 1000, // low
            50000 + Math.random() * 500,  // close
            Math.random() * 10            // volume
          ]);
        }
        
        return candles.reverse();
      }
    };
    
    return adapter;
  }
  
  /**
   * Convert timeframe to milliseconds
   */
  private getTimeframeInMs(timeframe: string): number {
    const amount = parseInt(timeframe.slice(0, -1));
    const unit = timeframe.slice(-1);
    
    switch (unit) {
      case 'm': return amount * 60 * 1000;
      case 'h': return amount * 60 * 60 * 1000;
      case 'd': return amount * 24 * 60 * 60 * 1000;
      case 'w': return amount * 7 * 24 * 60 * 60 * 1000;
      case 'M': return amount * 30 * 24 * 60 * 60 * 1000;
      default: throw new Error(`Invalid timeframe: ${timeframe}`);
    }
  }
  
  /**
   * Encrypt sensitive credentials
   */
  private encryptCredentials(credentials: ExchangeCredentials): string {
    try {
      const cipher = crypto.createCipheriv(
        'aes-256-cbc',
        Buffer.from(this.ENCRYPTION_KEY),
        Buffer.from(this.ENCRYPTION_IV)
      );
      
      let encrypted = cipher.update(JSON.stringify(credentials), 'utf8', 'hex');
      encrypted += cipher.final('hex');
      
      return encrypted;
    } catch (error) {
      console.error('Error encrypting credentials:', error);
      throw new Error('Failed to encrypt credentials');
    }
  }
  
  /**
   * Decrypt credentials
   */
  private decryptCredentials(encryptedData: string): ExchangeCredentials {
    try {
      const decipher = crypto.createDecipheriv(
        'aes-256-cbc',
        Buffer.from(this.ENCRYPTION_KEY),
        Buffer.from(this.ENCRYPTION_IV)
      );
      
      let decrypted = decipher.update(encryptedData, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      
      return JSON.parse(decrypted);
    } catch (error) {
      console.error('Error decrypting credentials:', error);
      throw new Error('Failed to decrypt credentials');
    }
  }
  
  /**
   * Get available markets for an exchange connection
   */
  public async getAvailableMarkets(connectionId: string): Promise<string[]> {
    try {
      const adapter = await this.getExchangeAdapter(connectionId);
      const markets = await adapter.fetchMarkets();
      
      // Update the connection with the latest markets
      await this.supabase
        .from('exchange_connections')
        .update({
          markets: markets.filter(m => m.active).map(m => m.symbol),
          updated_at: new Date().toISOString()
        })
        .eq('id', connectionId);
      
      return markets.filter(m => m.active).map(m => m.symbol);
    } catch (error: any) {
      console.error('Error fetching markets:', error);
      throw new Error(`Failed to fetch markets: ${error.message}`);
    }
  }
  
  /**
   * Associate an exchange connection with an agent
   */
  public async associateConnectionWithAgent(
    agentId: string,
    connectionId: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // Get the connection details
      const { data: connection, error: connectionError } = await this.supabase
        .from('exchange_connections')
        .select('exchange_id, is_testnet')
        .eq('id', connectionId)
        .single();
      
      if (connectionError || !connection) {
        return { success: false, error: `Connection not found: ${connectionError?.message || 'Unknown error'}` };
      }
      
      // Get the agent's current configuration
      const { data: agent, error: agentError } = await this.supabase
        .from('elizaos_agents')
        .select('configuration')
        .eq('id', agentId)
        .single();
      
      if (agentError || !agent) {
        return { success: false, error: `Agent not found: ${agentError?.message || 'Unknown error'}` };
      }
      
      // Update the agent configuration
      const configuration = agent.configuration || {};
      configuration.exchange_id = connection.exchange_id;
      configuration.exchange_connection_id = connectionId;
      configuration.is_testnet = connection.is_testnet;
      
      // Save the updated configuration
      const { error: updateError } = await this.supabase
        .from('elizaos_agents')
        .update({
          configuration,
          updated_at: new Date().toISOString()
        })
        .eq('id', agentId);
      
      if (updateError) {
        return { success: false, error: `Failed to update agent: ${updateError.message}` };
      }
      
      return { success: true };
    } catch (error: any) {
      console.error('Error associating connection with agent:', error);
      return { success: false, error: `Failed to associate connection with agent: ${error.message}` };
    }
  }
}
