import { createServerClient } from '@/utils/supabase/server';
import { ExchangeCredentials } from './types';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import crypto from 'crypto';

// Import Vault Service
import { ServerVaultService as VaultService } from '@/utils/supabase/vault-service';

// Environment configuration
const ENV = {
  USE_VAULT: process.env.USE_SUPABASE_VAULT === 'true',
  ENCRYPTION_KEY: process.env.ENCRYPTION_KEY || 'trading-farm-secure-key-placeholder-123',
  VAULT_MIGRATION_ENABLED: process.env.VAULT_MIGRATION_ENABLED === 'true'
};

// Function to encrypt sensitive data
function encryptData(data: string, secretKey: string): string {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(secretKey.padEnd(32).slice(0, 32)), iv);
  let encrypted = cipher.update(data, 'utf8', 'base64');
  encrypted += cipher.final('base64');
  return iv.toString('hex') + ':' + encrypted;
}

// Function to decrypt sensitive data
function decryptData(encryptedData: string, secretKey: string): string {
  const parts = encryptedData.split(':');
  const iv = Buffer.from(parts[0], 'hex');
  const encrypted = parts[1];
  const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(secretKey.padEnd(32).slice(0, 32)), iv);
  let decrypted = decipher.update(encrypted, 'base64', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

// Server-side functions for exchange credentials
export async function storeExchangeCredentials(credentials: ExchangeCredentials): Promise<string> {
  const supabase = createServerClient();

  // Check if we should use vault
  if (ENV.USE_VAULT) {
    try {
      // Store the record with vault flag
      const { data, error } = await supabase
        .from('exchange_credentials')
        .insert({
          user_id: credentials.user_id,
          exchange: credentials.exchange,
          name: credentials.name,
          testnet: credentials.testnet,
          uses_vault: true,
        })
        .select('id')
        .single();

      if (error) {
        console.error('Error storing exchange credentials:', error);
        throw new Error(`Failed to store exchange credentials: ${error.message}`);
      }

      // Store secrets in vault
      await VaultService.storeExchangeCredentials(
        credentials.exchange,
        credentials.api_key,
        credentials.api_secret,
        credentials.user_id,
        credentials.passphrase
      );

      return data.id;
    } catch (vaultError) {
      console.error('Error using vault, falling back to legacy storage:', vaultError);
      // Fall back to legacy method if vault fails
    }
  }

  // Legacy method (if vault is disabled or fails)
  const encryptionKey = ENV.ENCRYPTION_KEY;
  
  // Encrypt sensitive data
  const encryptedSecret = encryptData(credentials.api_secret, encryptionKey);
  const encryptedKey = encryptData(credentials.api_key, encryptionKey);
  
  // Store encrypted credentials in the database
  const { data, error } = await supabase
    .from('exchange_credentials')
    .insert({
      user_id: credentials.user_id,
      exchange: credentials.exchange,
      name: credentials.name,
      api_key: encryptedKey,
      api_secret: encryptedSecret,
      passphrase: credentials.passphrase ? encryptData(credentials.passphrase, encryptionKey) : null,
      testnet: credentials.testnet,
      uses_vault: false,
    })
    .select('id')
    .single();

  if (error) {
    console.error('Error storing exchange credentials:', error);
    throw new Error(`Failed to store exchange credentials: ${error.message}`);
  }

  return data.id;
}

export async function getExchangeCredentials(id: string): Promise<ExchangeCredentials> {
  const supabase = createServerClient();

  // Retrieve credentials record from the database
  const { data, error } = await supabase
    .from('exchange_credentials')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    console.error('Error retrieving exchange credentials:', error);
    throw new Error(`Failed to retrieve exchange credentials: ${error.message}`);
  }

  if (!data) {
    throw new Error('Exchange credentials not found');
  }

  // Check if using vault
  if (data.uses_vault === true && ENV.USE_VAULT) {
    try {
      // Get credentials from vault
      const vaultCredentials = await VaultService.getExchangeCredentials(data.exchange);
      
      if (!vaultCredentials) {
        throw new Error('Vault credentials not found');
      }
      
      return {
        id: data.id,
        user_id: data.user_id,
        exchange: data.exchange,
        name: data.name,
        api_key: vaultCredentials.apiKey,
        api_secret: vaultCredentials.apiSecret,
        passphrase: vaultCredentials.passphrase,
        testnet: data.testnet,
        created_at: data.created_at,
        updated_at: data.updated_at
      };
    } catch (vaultError) {
      console.error('Error retrieving from vault, attempting legacy method:', vaultError);
      // Fall back to legacy method if vault retrieval fails
      // Only if the record has encrypted fields (hybrid period during migration)
      if (!data.api_key || !data.api_secret) {
        throw new Error('Credential data not found in vault and not available in database');
      }
    }
  }

  // Legacy method (if vault is disabled or fails)
  const encryptionKey = ENV.ENCRYPTION_KEY;

  // Decrypt sensitive data
  return {
    id: data.id,
    user_id: data.user_id,
    exchange: data.exchange,
    name: data.name,
    api_key: decryptData(data.api_key, encryptionKey),
    api_secret: decryptData(data.api_secret, encryptionKey),
    passphrase: data.passphrase ? decryptData(data.passphrase, encryptionKey) : undefined,
    testnet: data.testnet,
    created_at: data.created_at,
    updated_at: data.updated_at
  };
}

export async function getAllExchangeCredentials(userId: string): Promise<ExchangeCredentials[]> {
  const cookieStore = cookies();
  const supabase = createServerClient();

  // Get encryption key from environment
  const encryptionKey = process.env.ENCRYPTION_KEY || 'trading-farm-secure-key-placeholder-123';

  // Retrieve all credentials for the user
  const { data, error } = await supabase
    .from('exchange_credentials')
    .select('*')
    .eq('user_id', userId);

  if (error) {
    console.error('Error retrieving all exchange credentials:', error);
    throw new Error(`Failed to retrieve exchange credentials: ${error.message}`);
  }

  if (!data || data.length === 0) {
    return [];
  }

  // Decrypt sensitive data for all credentials
  return data.map(cred => ({
    id: cred.id,
    user_id: cred.user_id,
    exchange: cred.exchange,
    name: cred.name,
    api_key: decryptData(cred.api_key, encryptionKey),
    api_secret: decryptData(cred.api_secret, encryptionKey),
    passphrase: cred.passphrase ? decryptData(cred.passphrase, encryptionKey) : undefined,
    testnet: cred.testnet,
    created_at: cred.created_at,
    updated_at: cred.updated_at
  }));
}

export async function updateExchangeCredentials(credentials: ExchangeCredentials): Promise<void> {
  const cookieStore = cookies();
  const supabase = createServerClient();

  if (!credentials.id) {
    throw new Error('Credential ID is required for update');
  }

  // Get encryption key from environment
  const encryptionKey = process.env.ENCRYPTION_KEY || 'trading-farm-secure-key-placeholder-123';
  
  // Encrypt sensitive data
  const encryptedSecret = encryptData(credentials.api_secret, encryptionKey);
  const encryptedKey = encryptData(credentials.api_key, encryptionKey);
  
  // Update encrypted credentials in the database
  const { error } = await supabase
    .from('exchange_credentials')
    .update({
      exchange: credentials.exchange,
      name: credentials.name,
      api_key: encryptedKey,
      api_secret: encryptedSecret,
      passphrase: credentials.passphrase ? encryptData(credentials.passphrase, encryptionKey) : null,
      testnet: credentials.testnet,
      updated_at: new Date().toISOString()
    })
    .eq('id', credentials.id)
    .eq('user_id', credentials.user_id); // Ensure user can only update their own credentials

  if (error) {
    console.error('Error updating exchange credentials:', error);
    throw new Error(`Failed to update exchange credentials: ${error.message}`);
  }
}

export async function deleteExchangeCredentials(id: string, userId: string): Promise<void> {
  const supabase = createServerClient();
  
  // Check if this credential uses the vault
  const { data, error } = await supabase
    .from('exchange_credentials')
    .select('uses_vault, exchange')
    .eq('id', id)
    .eq('user_id', userId) // Ensure user can only delete their own credentials
    .single();
    
  if (error) {
    // If the credential doesn't exist, consider it already deleted
    if (error.code === 'PGRST116') {
      return;
    }
    console.error('Error checking credential vault status:', error);
    throw new Error(`Failed to check credential status: ${error.message}`);
  }
  
  if (data.uses_vault === true && ENV.USE_VAULT) {
    try {
      // Delete from vault
      await VaultService.deleteExchangeCredentials(data.exchange);
    } catch (vaultError) {
      console.error('Error deleting from vault:', vaultError);
      // Continue with database deletion even if vault deletion fails
    }
  }

  // Always delete the database record
  const { error: deleteError } = await supabase
    .from('exchange_credentials')
    .delete()
    .eq('id', id)
    .eq('user_id', userId);

  if (deleteError) {
    console.error('Error deleting exchange credentials:', deleteError);
    throw new Error(`Failed to delete exchange credentials: ${deleteError.message}`);
  }
}

// Check if credential uses vault
export async function doesCredentialUseVault(id: string): Promise<boolean> {
  const supabase = createServerClient();
  
  const { data, error } = await supabase
    .from('exchange_credentials')
    .select('uses_vault')
    .eq('id', id)
    .single();
    
  if (error) {
    console.error('Error checking if credential uses vault:', error);
    return false;
  }
  
  return data.uses_vault === true;
}

// Migrate credential to vault
export async function migrateCredentialToVault(id: string, userId: string): Promise<boolean> {
  if (!ENV.USE_VAULT || !ENV.VAULT_MIGRATION_ENABLED) {
    return false;
  }
  
  try {
    // Get current credential
    const credential = await getExchangeCredentials(id);
    
    // Store in vault
    await VaultService.storeExchangeCredentials(
      credential.exchange,
      credential.api_key,
      credential.api_secret,
      userId,
      credential.passphrase
    );
    
    // Update record to use vault
    const supabase = createServerClient();
    const { error } = await supabase
      .from('exchange_credentials')
      .update({
        uses_vault: true,
        // Clear the encrypted fields since they're now in the vault
        api_key: null,
        api_secret: null,
        passphrase: null
      })
      .eq('id', id)
      .eq('user_id', userId);
      
    if (error) {
      throw new Error(`Failed to update credential record: ${error.message}`);
    }
    
    return true;
  } catch (error) {
    console.error('Error migrating credential to vault:', error);
    return false;
  }
}
