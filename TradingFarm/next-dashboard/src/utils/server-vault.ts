// Server-side vault service for secure credential storage and retrieval
import { createServerClient } from '@/utils/supabase/server';
import { ExchangeCredentials } from '@/types/orders';

export class ServerVaultService {
  /**
   * Retrieves API credentials for a specific user and exchange
   * 
   * @param userId The user ID 
   * @param exchangeId Optional exchange ID
   * @returns Promise with the credentials
   */
  async getApiCredentials(userId: string, exchangeId?: string): Promise<ExchangeCredentials> {
    if (!userId) {
      throw new Error('User ID is required to retrieve API credentials');
    }

    // In production, this would be an actual database call with RLS
    if (process.env.NODE_ENV === 'test' || userId === 'test-user') {
      // Return mock credentials for testing
      return {
        apiKey: process.env.EXCHANGE_API_KEY || 'test-api-key',
        apiSecret: process.env.EXCHANGE_API_SECRET || 'test-api-secret',
        passphrase: process.env.EXCHANGE_PASSPHRASE || '',
        subaccount: process.env.EXCHANGE_SUBACCOUNT || '',
      };
    }

    try {
      const supabase = await createServerClient();
      
      const { data, error } = await supabase
        .from('exchange_connections')
        .select('*')
        .eq('user_id', userId)
        .eq(exchangeId ? 'exchange_id' : 'is_default', exchangeId || true)
        .single();
        
      if (error) {
        throw new Error(`Failed to retrieve API credentials: ${error.message}`);
      }
      
      if (!data) {
        throw new Error('No API credentials found for this user and exchange');
      }
      
      return {
        apiKey: data.api_key,
        apiSecret: data.api_secret,
        passphrase: data.passphrase || '',
        subaccount: data.subaccount || '',
      };
    } catch (error) {
      console.error('Vault service error:', error);
      throw new Error(`Failed to retrieve API credentials: ${(error as Error).message}`);
    }
  }
}
