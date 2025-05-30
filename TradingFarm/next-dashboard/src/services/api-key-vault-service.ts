/**
 * API Key Vault Service
 * 
 * Securely manages API keys using Supabase Vault
 * This enables secure storage and retrieval of sensitive API keys
 * for exchanges, market data providers, and other third-party services.
 */
import { createServerClient } from '@/utils/supabase/server';
import { ExchangeType } from './exchange-service';
import { MonitoringService } from './monitoring-service';

export type ApiKeyType = 'exchange' | 'market_data' | 'news' | 'llm' | 'other';
export type ApiKeyScope = 'user' | 'system' | 'farm';

export interface ApiKeyRecord {
  id: string;
  name: string;
  type: ApiKeyType;
  service: string;  // E.g., 'bybit', 'coinapi', 'openai'
  scope: ApiKeyScope;
  owner_id: string; // User ID or Farm ID depending on scope
  created_at: string;
  expires_at?: string;
  last_used_at?: string;
  is_active: boolean;
  // Note: The actual keys are stored in Vault and not returned in this record
}

export interface ApiKeyPair {
  api_key: string;
  api_secret: string;
  passphrase?: string; // Optional for exchanges like Coinbase that require a passphrase
  additional_fields?: Record<string, string>; // For any service-specific fields
}

export interface KeyAccessInfo {
  exchangeId: string;
  userId: string;
  agentId?: string;
  functionId?: string;
  farmId?: string;
  accessType: 'read' | 'write' | 'delete';
  accessContext?: string;
}

export interface RequestContext {
  userId: string;
  agentId?: string;
  functionId?: string;
  farmId?: string;
}

/**
 * Service to securely manage API keys using Supabase Vault
 */
export class ApiKeyVaultService {
  /**
   * Log API key access for auditing purposes
   */
  static async logKeyAccess(accessInfo: KeyAccessInfo): Promise<void> {
    try {
      const supabase = await createServerClient();
      
      // Insert access log to the database
      await supabase
        .from('api_key_access_logs')
        .insert({
          exchange_id: accessInfo.exchangeId,
          user_id: accessInfo.userId,
          agent_id: accessInfo.agentId,
          function_id: accessInfo.functionId,
          farm_id: accessInfo.farmId,
          access_type: accessInfo.accessType,
          timestamp: new Date().toISOString()
        });
      
      // Also log to monitoring service for security tracking
      await MonitoringService.logEvent({
        type: 'security.api_key_access' as any, // Type casting until monitoring event types are updated
        severity: 'info',
        subject: 'API Key Access',
        source: 'api-key-vault',
        user_id: accessInfo.userId,
        agent_id: accessInfo.agentId,
        message: `API key access: ${accessInfo.exchangeId} (${accessInfo.accessType})`,
        details: {
          ...accessInfo,
          timestamp: new Date().toISOString()
        }
      });
    } catch (error) {
      console.error('Error logging API key access:', error);
      // Don't throw here to prevent cascading failures
    }
  }
  /**
   * Store a new API key in the vault
   */
  static async storeApiKey(
    keyType: ApiKeyType,
    service: string,
    scope: ApiKeyScope,
    ownerId: string,
    name: string,
    keyPair: ApiKeyPair,
    expiresAt?: Date
  ): Promise<string | null> {
    try {
      const supabase = await createServerClient();
      
      // First, store the sensitive key data in Vault
      const { data: vaultData, error: vaultError } = await supabase.rpc(
        'store_secret_in_vault',
        { 
          secret_name: `${keyType}_${service}_${ownerId}_${Date.now()}`,
          secret_value: JSON.stringify(keyPair)
        }
      );
      
      if (vaultError || !vaultData) {
        console.error('Error storing secret in vault:', vaultError);
        throw vaultError;
      }
      
      // Then store the API key metadata in the database
      const { data, error } = await supabase
        .from('api_keys')
        .insert({
          name,
          type: keyType,
          service,
          scope,
          owner_id: ownerId,
          vault_id: vaultData, // Reference to the vault secret
          is_active: true,
          expires_at: expiresAt?.toISOString(),
        })
        .select('id')
        .single();
      
      if (error) {
        console.error('Error storing API key metadata:', error);
        // Clean up the vault entry if metadata storage fails
        await supabase.rpc('delete_secret_from_vault', { secret_id: vaultData });
        throw error;
      }
      
      return data.id;
    } catch (error) {
      console.error('Error in storeApiKey:', error);
      return null;
    }
  }
  
  /**
   * Retrieve an API key from the vault with enhanced security auditing
   */
  static async getApiKey(
    keyId: string,
    userId: string,
    context: Partial<RequestContext> = {}
  ): Promise<ApiKeyPair | null> {
    try {
      const supabase = await createServerClient();
      
      // First, get the API key metadata to check permissions and get the vault_id
      const { data: keyData, error: keyError } = await supabase
        .from('api_keys')
        .select('*')
        .eq('id', keyId)
        .single();
      
      if (keyError || !keyData) {
        console.error('Error retrieving API key metadata:', keyError);
        return null;
      }
      
      // Check permissions: must be owner or have system access
      if (keyData.scope === 'user' && keyData.owner_id !== userId) {
        console.error('Permission denied: User does not own this API key');
        
        // Log unauthorized access attempt
        await MonitoringService.logEvent({
          type: 'security.api_key_unauthorized' as any, // Type casting until monitoring event types are updated
          severity: 'warning',
          subject: 'Unauthorized API Key Access',
          source: 'api-key-vault',
          user_id: userId,
          message: `Unauthorized API key access attempt for key ${keyId}`,
          details: {
            key_id: keyId,
            key_scope: keyData.scope,
            key_owner: keyData.owner_id,
            attempted_by: userId,
            timestamp: new Date().toISOString(),
            context
          }
        });
        
        return null;
      }
      
      // Mark the key as recently used
      await supabase
        .from('api_keys')
        .update({ last_used_at: new Date().toISOString() })
        .eq('id', keyId);
      
      // Log the access for auditing
      await ApiKeyVaultService.logKeyAccess({
        exchangeId: keyData.service,
        userId: userId,
        agentId: context.agentId,
        functionId: context.functionId,
        farmId: keyData.scope === 'farm' ? keyData.owner_id : undefined,
        accessType: 'read',
        accessContext: 'api_key_retrieval'
      });
      
      // Retrieve the actual key data from Vault
      const { data: secretData, error: secretError } = await supabase.rpc(
        'get_secret_from_vault',
        { secret_id: keyData.vault_id }
      );
      
      if (secretError || !secretData) {
        console.error('Error retrieving secret from vault:', secretError);
        return null;
      }
      
      return JSON.parse(secretData) as ApiKeyPair;
    } catch (error) {
      console.error('Error in getApiKey:', error);
      return null;
    }
  }
  
  /**
   * Get API keys metadata for a user
   */
  static async getUserApiKeys(userId: string): Promise<ApiKeyRecord[]> {
    try {
      const supabase = await createServerClient();
      
      const { data, error } = await supabase
        .from('api_keys')
        .select('*')
        .eq('owner_id', userId)
        .eq('scope', 'user')
        .order('created_at', { ascending: false });
      
      if (error) {
        console.error('Error retrieving user API keys:', error);
        return [];
      }
      
      return data as ApiKeyRecord[];
    } catch (error) {
      console.error('Error in getUserApiKeys:', error);
      return [];
    }
  }
  
  /**
   * Get API keys metadata for a farm
   */
  static async getFarmApiKeys(farmId: string, userId: string): Promise<ApiKeyRecord[]> {
    try {
      const supabase = await createServerClient();
      
      // First check if the user has access to this farm
      const { data: farmAccess, error: farmError } = await supabase
        .from('farm_members')
        .select('role')
        .eq('farm_id', farmId)
        .eq('user_id', userId)
        .single();
      
      if (farmError || !farmAccess) {
        console.error('User does not have access to this farm:', farmError);
        return [];
      }
      
      const { data, error } = await supabase
        .from('api_keys')
        .select('*')
        .eq('owner_id', farmId)
        .eq('scope', 'farm')
        .order('created_at', { ascending: false });
      
      if (error) {
        console.error('Error retrieving farm API keys:', error);
        return [];
      }
      
      return data as ApiKeyRecord[];
    } catch (error) {
      console.error('Error in getFarmApiKeys:', error);
      return [];
    }
  }
  
  /**
   * Delete an API key
   */
  static async deleteApiKey(keyId: string, userId: string): Promise<boolean> {
    try {
      const supabase = await createServerClient();
      
      // First, get the API key metadata to check permissions and get the vault_id
      const { data: keyData, error: keyError } = await supabase
        .from('api_keys')
        .select('*')
        .eq('id', keyId)
        .single();
      
      if (keyError || !keyData) {
        console.error('Error retrieving API key metadata:', keyError);
        return false;
      }
      
      // Check permissions: must be owner or have system access
      if (keyData.scope === 'user' && keyData.owner_id !== userId) {
        console.error('Permission denied: User does not own this API key');
        return false;
      }
      
      // If the key belongs to a farm, check if the user has admin access
      if (keyData.scope === 'farm') {
        const { data: farmAccess, error: farmError } = await supabase
          .from('farm_members')
          .select('role')
          .eq('farm_id', keyData.owner_id)
          .eq('user_id', userId)
          .single();
        
        if (farmError || !farmAccess || farmAccess.role !== 'admin') {
          console.error('Permission denied: User is not a farm admin');
          return false;
        }
      }
      
      // Delete the secret from Vault
      const { error: vaultError } = await supabase.rpc(
        'delete_secret_from_vault',
        { secret_id: keyData.vault_id }
      );
      
      if (vaultError) {
        console.error('Error deleting secret from vault:', vaultError);
      }
      
      // Delete the API key metadata from the database
      const { error } = await supabase
        .from('api_keys')
        .delete()
        .eq('id', keyId);
      
      if (error) {
        console.error('Error deleting API key metadata:', error);
        return false;
      }
      
      return true;
    } catch (error) {
      console.error('Error in deleteApiKey:', error);
      return false;
    }
  }
  
  /**
   * Get a user's active API key for a specific exchange with context tracking
   */
  static async getUserExchangeApiKey(
    userId: string, 
    exchange: ExchangeType,
    context: Partial<RequestContext> = {}
  ): Promise<ApiKeyPair | null> {
    try {
      const supabase = await createServerClient();
      
      // Find the active API key for this exchange
      const { data, error } = await supabase
        .from('api_keys')
        .select('id')
        .eq('owner_id', userId)
        .eq('scope', 'user')
        .eq('type', 'exchange')
        .eq('service', exchange)
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();
      
      if (error || !data) {
        console.error(`No active API key found for ${exchange}:`, error);
        return null;
      }
      
      // Get the actual key from Vault
      return await ApiKeyVaultService.getApiKey(data.id, userId);
    } catch (error) {
      console.error(`Error getting ${exchange} API key:`, error);
      return null;
    }
  }
  
  /**
   * Get a farm's active API key for a specific exchange with enhanced security checks
   */
  static async getFarmExchangeApiKey(
    farmId: string,
    userId: string,
    exchange: ExchangeType,
    context: Partial<RequestContext> = {}
  ): Promise<ApiKeyPair | null> {
    try {
      const supabase = await createServerClient();
      
      // Check if the user has access to this farm
      const { data: farmAccess, error: farmError } = await supabase
        .from('farm_members')
        .select('role')
        .eq('farm_id', farmId)
        .eq('user_id', userId)
        .single();
      
      if (farmError || !farmAccess) {
        console.error('User does not have access to this farm:', farmError);
        return null;
      }
      
      // Find the active API key for this exchange
      const { data, error } = await supabase
        .from('api_keys')
        .select('id')
        .eq('owner_id', farmId)
        .eq('scope', 'farm')
        .eq('type', 'exchange')
        .eq('service', exchange)
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();
      
      if (error || !data) {
        console.error(`No active API key found for farm's ${exchange}:`, error);
        return null;
      }
      
      // Get the actual key from Vault
      return await ApiKeyVaultService.getApiKey(data.id, userId);
    } catch (error) {
      console.error(`Error getting farm's ${exchange} API key:`, error);
      return null;
    }
  }
}
