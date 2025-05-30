import { createServerClient } from './server';
import { createBrowserClient } from './client';
import { Database } from '@/types/database.types';

export type SecretType = 'exchange_api_key' | 'exchange_api_secret' | 'wallet_private_key';
export type ExchangeName = 'hyperliquid' | 'binance' | 'bybit' | 'coinbase';

export interface Secret {
  id: string;
  name: string;
  type: SecretType;
  value: string;
  exchange?: ExchangeName;
  created_at: string;
  updated_at: string;
  owner_id: string;
}

// Server-side vault operations (secure context)
export const ServerVaultService = {
  async getSecret(name: string, type: SecretType, exchange?: ExchangeName) {
    const supabase = createServerClient();
    
    let query = supabase
      .from('secrets')
      .select('*')
      .eq('name', name)
      .eq('type', type);
      
    if (exchange) {
      query = query.eq('exchange', exchange);
    }
    
    const { data, error } = await query.single();
    
    if (error) {
      console.error('Error fetching secret:', error);
      return null;
    }
    
    return data as Secret;
  },
  
  async getExchangeCredentials(exchange: ExchangeName) {
    const supabase = createServerClient();
    
    const { data, error } = await supabase
      .from('secrets')
      .select('*')
      .eq('exchange', exchange)
      .eq('type', 'exchange_api_key');
      
    if (error || !data || data.length === 0) {
      console.error(`No API key found for ${exchange}`);
      return null;
    }
    
    const secretId = data[0].id;
    const { data: secretData, error: secretError } = await supabase
      .rpc('decrypt_secret', { secret_id: secretId });
      
    if (secretError || !secretData) {
      console.error('Error decrypting secret:', secretError);
      return null;
    }
    
    // Get secret for the same exchange
    const { data: secretKeyData, error: secretKeyError } = await supabase
      .from('secrets')
      .select('*')
      .eq('exchange', exchange)
      .eq('type', 'exchange_api_secret')
      .single();
      
    if (secretKeyError || !secretKeyData) {
      console.error(`No API secret found for ${exchange}`);
      return { apiKey: secretData.value, apiSecret: null };
    }
    
    const { data: decryptedSecret, error: decryptError } = await supabase
      .rpc('decrypt_secret', { secret_id: secretKeyData.id });
      
    if (decryptError || !decryptedSecret) {
      console.error('Error decrypting API secret:', decryptError);
      return { apiKey: secretData.value, apiSecret: null };
    }
    
    return {
      apiKey: secretData.value,
      apiSecret: decryptedSecret.value
    };
  },
  
  async storeExchangeCredentials(exchange: ExchangeName, apiKey: string, apiSecret: string) {
    const supabase = createServerClient();
    
    // Store API Key
    const { error: keyError } = await supabase
      .rpc('encrypt_and_store_secret', {
        secret_name: `${exchange}_api_key`,
        secret_type: 'exchange_api_key',
        secret_value: apiKey,
        exchange_name: exchange
      });
      
    if (keyError) {
      console.error('Error storing API key:', keyError);
      return false;
    }
    
    // Store API Secret
    const { error: secretError } = await supabase
      .rpc('encrypt_and_store_secret', {
        secret_name: `${exchange}_api_secret`,
        secret_type: 'exchange_api_secret',
        secret_value: apiSecret,
        exchange_name: exchange
      });
      
    if (secretError) {
      console.error('Error storing API secret:', secretError);
      return false;
    }
    
    return true;
  }
};

// Client-side operations (limited to non-sensitive operations)
export const ClientVaultService = {
  async listExchangeConnections() {
    const supabase = createBrowserClient();
    
    const { data, error } = await supabase
      .from('secrets')
      .select('name, exchange, created_at, updated_at')
      .eq('type', 'exchange_api_key');
      
    if (error) {
      console.error('Error fetching exchange connections:', error);
      return [];
    }
    
    return data;
  },
  
  async hasExchangeCredentials(exchange: ExchangeName) {
    const supabase = createBrowserClient();
    
    const { count, error } = await supabase
      .from('secrets')
      .select('*', { count: 'exact', head: true })
      .eq('exchange', exchange)
      .eq('type', 'exchange_api_key');
      
    if (error) {
      console.error('Error checking exchange credentials:', error);
      return false;
    }
    
    return count !== null && count > 0;
  }
}
