/**
 * Exchange Connection Service
 * 
 * Manages the connections between the Trading Farm platform and external exchanges.
 * Handles API key management, connection status monitoring, and data synchronization.
 */

import { createBrowserClient } from '@/utils/supabase/client';
import { createServerClient } from '@/utils/supabase/server';
import databaseService from './database-service';
import { QueueService, QueueNames } from './queue/queue-service';
import { encryptApiKey, decryptApiKey } from '@/utils/encryption';

// Exchange connection interface matching database schema
export interface ExchangeConnection {
  id?: string;
  farm_id: string;
  exchange_name: string;
  api_key: string;
  api_secret: string;
  api_passphrase?: string;
  testnet: boolean;
  status: 'active' | 'inactive' | 'error' | 'pending';
  created_at?: string;
  updated_at?: string;
  last_synced_at?: string;
  error_message?: string;
  permissions?: string[];
  meta_data?: Record<string, any>;
}

// Response type for error handling
export interface ServiceResponse<T> {
  data: T | null;
  error: string | null;
}

class ExchangeConnectionService {
  /**
   * Create a new exchange connection
   */
  async createConnection(connection: Omit<ExchangeConnection, 'id' | 'created_at' | 'updated_at'>): Promise<ServiceResponse<string>> {
    try {
      // Encrypt sensitive API keys before storing
      const encryptedApiKey = await encryptApiKey(connection.api_key);
      const encryptedApiSecret = await encryptApiKey(connection.api_secret);
      const encryptedPassphrase = connection.api_passphrase 
        ? await encryptApiKey(connection.api_passphrase) 
        : undefined;
      
      // Create the connection in the database
      const { data, error } = await databaseService.insert('exchange_connections', {
        farm_id: connection.farm_id,
        exchange_name: connection.exchange_name,
        api_key: encryptedApiKey,
        api_secret: encryptedApiSecret,
        api_passphrase: encryptedPassphrase,
        testnet: connection.testnet,
        status: 'pending', // Start as pending until validation
        permissions: connection.permissions || ['read', 'trade'],
        meta_data: connection.meta_data || {}
      });
      
      if (error) {
        console.error('Error creating exchange connection:', error);
        return { data: null, error: error.message };
      }
      
      // Queue up a validation job to check the API keys
      await QueueService.addJob(QueueNames.EXCHANGE_VALIDATION, {
        connectionId: data.id,
        farmId: connection.farm_id,
        exchangeName: connection.exchange_name
      });
      
      return { data: data.id, error: null };
    } catch (error) {
      console.error('Exception in createConnection:', error);
      return { 
        data: null, 
        error: error instanceof Error ? error.message : 'An unknown error occurred'
      };
    }
  }
  
  /**
   * Get all exchange connections for a farm
   */
  async getConnectionsByFarm(farmId: string): Promise<ServiceResponse<ExchangeConnection[]>> {
    try {
      const { data, error } = await databaseService.select(
        'exchange_connections',
        '*',
        { farm_id: farmId }
      );
      
      if (error) {
        console.error('Error fetching exchange connections:', error);
        return { data: null, error: error.message };
      }
      
      // Don't return decrypted API keys in the list view for security
      const safeConnections = data.map(conn => ({
        ...conn,
        api_key: '••••••••••••••••',
        api_secret: '••••••••••••••••',
        api_passphrase: conn.api_passphrase ? '••••••••••••••••' : undefined
      }));
      
      return { data: safeConnections, error: null };
    } catch (error) {
      console.error('Exception in getConnectionsByFarm:', error);
      return { 
        data: null, 
        error: error instanceof Error ? error.message : 'An unknown error occurred'
      };
    }
  }
  
  /**
   * Get a single exchange connection by ID
   * Optionally decrypt the sensitive fields if needed
   */
  async getConnectionById(id: string, decryptSensitiveData = false): Promise<ServiceResponse<ExchangeConnection>> {
    try {
      const { data, error } = await databaseService.select(
        'exchange_connections',
        '*',
        { id }
      );
      
      if (error || !data || data.length === 0) {
        console.error('Error fetching exchange connection:', error);
        return { data: null, error: error?.message || 'Connection not found' };
      }
      
      const connection = data[0];
      
      // Decrypt sensitive data if requested (for admin operations only)
      if (decryptSensitiveData) {
        try {
          connection.api_key = await decryptApiKey(connection.api_key);
          connection.api_secret = await decryptApiKey(connection.api_secret);
          if (connection.api_passphrase) {
            connection.api_passphrase = await decryptApiKey(connection.api_passphrase);
          }
        } catch (decryptError) {
          console.error('Error decrypting API keys:', decryptError);
          return { 
            data: null, 
            error: 'Failed to decrypt sensitive connection data' 
          };
        }
      } else {
        // Mask sensitive data for regular viewing
        connection.api_key = '••••••••••••••••';
        connection.api_secret = '••••••••••••••••';
        if (connection.api_passphrase) {
          connection.api_passphrase = '••••••••••••••••';
        }
      }
      
      return { data: connection, error: null };
    } catch (error) {
      console.error('Exception in getConnectionById:', error);
      return { 
        data: null, 
        error: error instanceof Error ? error.message : 'An unknown error occurred'
      };
    }
  }
  
  /**
   * Update an exchange connection
   */
  async updateConnection(id: string, updates: Partial<ExchangeConnection>): Promise<ServiceResponse<null>> {
    try {
      // Check if we're updating sensitive data
      const updateData: any = { ...updates };
      delete updateData.id; // Can't update the ID
      delete updateData.created_at; // Can't update creation timestamp
      
      // Encrypt any updated API keys
      if (updates.api_key) {
        updateData.api_key = await encryptApiKey(updates.api_key);
      }
      
      if (updates.api_secret) {
        updateData.api_secret = await encryptApiKey(updates.api_secret);
      }
      
      if (updates.api_passphrase) {
        updateData.api_passphrase = await encryptApiKey(updates.api_passphrase);
      }
      
      // Reset status to pending if credentials were changed
      if (updates.api_key || updates.api_secret || updates.api_passphrase) {
        updateData.status = 'pending';
      }
      
      // Update the connection
      const { error } = await databaseService.update(
        'exchange_connections',
        updateData,
        { id }
      );
      
      if (error) {
        console.error('Error updating exchange connection:', error);
        return { data: null, error: error.message };
      }
      
      // Queue validation job if credentials were changed
      if (updates.api_key || updates.api_secret || updates.api_passphrase) {
        // Get the farm ID and exchange name
        const { data: connection } = await this.getConnectionById(id);
        
        if (connection) {
          await QueueService.addJob(QueueNames.EXCHANGE_VALIDATION, {
            connectionId: id,
            farmId: connection.farm_id,
            exchangeName: connection.exchange_name
          });
        }
      }
      
      return { data: null, error: null };
    } catch (error) {
      console.error('Exception in updateConnection:', error);
      return { 
        data: null, 
        error: error instanceof Error ? error.message : 'An unknown error occurred'
      };
    }
  }
  
  /**
   * Delete an exchange connection
   */
  async deleteConnection(id: string): Promise<ServiceResponse<null>> {
    try {
      const { error } = await databaseService.delete(
        'exchange_connections',
        { id }
      );
      
      if (error) {
        console.error('Error deleting exchange connection:', error);
        return { data: null, error: error.message };
      }
      
      return { data: null, error: null };
    } catch (error) {
      console.error('Exception in deleteConnection:', error);
      return { 
        data: null, 
        error: error instanceof Error ? error.message : 'An unknown error occurred'
      };
    }
  }
  
  /**
   * Validate an exchange connection by testing the API keys
   * This is typically called by the queue worker, not directly
   */
  async validateConnection(id: string): Promise<ServiceResponse<null>> {
    try {
      // Get the connection details with decrypted keys
      const { data: connection, error: getError } = await this.getConnectionById(id, true);
      
      if (getError || !connection) {
        return { data: null, error: getError || 'Connection not found' };
      }
      
      // Here we would use the appropriate exchange adapter to test the connection
      // For now, we'll simulate a validation
      const success = Math.random() > 0.2; // 80% chance of success for testing
      
      if (success) {
        await databaseService.update(
          'exchange_connections',
          {
            status: 'active',
            error_message: null,
            last_synced_at: new Date().toISOString()
          },
          { id }
        );
      } else {
        await databaseService.update(
          'exchange_connections',
          {
            status: 'error',
            error_message: 'Invalid API credentials or insufficient permissions',
          },
          { id }
        );
        return { data: null, error: 'Connection validation failed' };
      }
      
      return { data: null, error: null };
    } catch (error) {
      console.error('Exception in validateConnection:', error);
      
      // Update the connection status to error
      await databaseService.update(
        'exchange_connections',
        {
          status: 'error',
          error_message: error instanceof Error ? error.message : 'Unknown validation error',
        },
        { id }
      );
      
      return { 
        data: null, 
        error: error instanceof Error ? error.message : 'An unknown error occurred'
      };
    }
  }
  
  /**
   * Fetch balances from an exchange
   */
  async fetchBalances(connectionId: string): Promise<ServiceResponse<Record<string, number>>> {
    try {
      // Get the connection details with decrypted keys
      const { data: connection, error: getError } = await this.getConnectionById(connectionId, true);
      
      if (getError || !connection) {
        return { data: null, error: getError || 'Connection not found' };
      }
      
      // Here we would use the appropriate exchange adapter to fetch balances
      // For now, we'll return mock data
      const mockBalances = {
        'BTC': 0.25,
        'ETH': 5.5,
        'USDT': 10000,
        'SOL': 100
      };
      
      // Update the last synced timestamp
      await databaseService.update(
        'exchange_connections',
        {
          last_synced_at: new Date().toISOString(),
          status: 'active', // Connection is working if we could fetch balances
          error_message: null
        },
        { id: connectionId }
      );
      
      return { data: mockBalances, error: null };
    } catch (error) {
      console.error('Exception in fetchBalances:', error);
      
      // Update the connection status to reflect the error
      await databaseService.update(
        'exchange_connections',
        {
          status: 'error',
          error_message: error instanceof Error ? error.message : 'Failed to fetch balances',
        },
        { id: connectionId }
      );
      
      return { 
        data: null, 
        error: error instanceof Error ? error.message : 'An unknown error occurred'
      };
    }
  }
  
  /**
   * Check health status for all connections
   * Used to ensure all connections are still valid
   */
  async checkConnectionsHealth(farmId: string): Promise<ServiceResponse<Record<string, string>>> {
    try {
      const { data: connections, error } = await this.getConnectionsByFarm(farmId);
      
      if (error || !connections) {
        return { data: null, error: error || 'Failed to fetch connections' };
      }
      
      const statuses: Record<string, string> = {};
      
      // Queue health check jobs for each connection
      for (const connection of connections) {
        if (connection.id) {
          await QueueService.addJob(QueueNames.EXCHANGE_HEALTH_CHECK, {
            connectionId: connection.id,
            farmId: connection.farm_id,
            exchangeName: connection.exchange_name
          });
          
          statuses[connection.id] = 'check_queued';
        }
      }
      
      return { data: statuses, error: null };
    } catch (error) {
      console.error('Exception in checkConnectionsHealth:', error);
      return { 
        data: null, 
        error: error instanceof Error ? error.message : 'An unknown error occurred'
      };
    }
  }
}

// Export a singleton instance
const exchangeConnectionService = new ExchangeConnectionService();
export default exchangeConnectionService;
