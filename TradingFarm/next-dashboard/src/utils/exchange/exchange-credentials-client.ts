import { ExchangeCredentials } from './types';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

// Import client Vault Service
import { ClientVaultService as VaultService } from '@/utils/supabase/vault-service';
import { createBrowserClient } from '@/utils/supabase/client';

// Environment configuration
const ENV = {
  USE_VAULT: process.env.NEXT_PUBLIC_USE_SUPABASE_VAULT === 'true',
  ENCRYPTION_KEY: process.env.NEXT_PUBLIC_ENCRYPTION_KEY || 'trading-farm-secure-key-placeholder-123',
  VAULT_MIGRATION_ENABLED: process.env.NEXT_PUBLIC_VAULT_MIGRATION_ENABLED === 'true'
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

// Client-side functions for exchange credentials
export async function storeExchangeCredentials(credentials: ExchangeCredentials): Promise<string> {
  const supabase = createBrowserClient();

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
          using_vault: true,
          is_active: credentials.is_active
        })
        .select('id')
        .single();

      if (error) throw error;
      
      // Store the API keys in vault
      if (data && data.id) {
        const vaultService = new VaultService(supabase);
        await vaultService.setValue(`exchange_cred_${data.id}_api_key`, credentials.api_key);
        await vaultService.setValue(`exchange_cred_${data.id}_api_secret`, credentials.api_secret);
        
        if (credentials.passphrase) {
          await vaultService.setValue(`exchange_cred_${data.id}_passphrase`, credentials.passphrase);
        }
        
        return data.id;
      }
      throw new Error('Failed to store exchange credentials');
    } catch (error) {
      console.error('Error storing credentials in vault:', error);
      throw error;
    }
  } else {
    // Traditional encryption approach
    try {
      // Encrypt sensitive data
      const encryptedApiKey = encryptData(credentials.api_key, ENV.ENCRYPTION_KEY);
      const encryptedApiSecret = encryptData(credentials.api_secret, ENV.ENCRYPTION_KEY);
      const encryptedPassphrase = credentials.passphrase 
        ? encryptData(credentials.passphrase, ENV.ENCRYPTION_KEY) 
        : null;

      // Store encrypted data
      const { data, error } = await supabase
        .from('exchange_credentials')
        .insert({
          user_id: credentials.user_id,
          exchange: credentials.exchange,
          name: credentials.name,
          testnet: credentials.testnet,
          api_key_encrypted: encryptedApiKey,
          api_secret_encrypted: encryptedApiSecret,
          passphrase: encryptedPassphrase,
          using_vault: false,
          is_active: credentials.is_active
        })
        .select('id')
        .single();

      if (error) throw error;
      return data.id;
    } catch (error) {
      console.error('Error storing encrypted credentials:', error);
      throw error;
    }
  }
}

// Get exchange credentials by ID
export async function getExchangeCredentials(id: string): Promise<ExchangeCredentials> {
  const supabase = createBrowserClient();
  
  try {
    // Get the credential record
    const { data, error } = await supabase
      .from('exchange_credentials')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) throw error;
    if (!data) throw new Error('Credentials not found');
    
    // Check if using vault
    if (data.using_vault) {
      // Get secrets from vault
      const vaultService = new VaultService(supabase);
      const apiKey = await vaultService.getValue(`exchange_cred_${id}_api_key`);
      const apiSecret = await vaultService.getValue(`exchange_cred_${id}_api_secret`);
      const passphrase = data.passphrase 
        ? await vaultService.getValue(`exchange_cred_${id}_passphrase`) 
        : null;
      
      return {
        id: data.id,
        user_id: data.user_id,
        exchange: data.exchange,
        name: data.name || data.exchange,
        testnet: data.testnet || false,
        api_key: apiKey || '',
        api_secret: apiSecret || '',
        passphrase: passphrase || undefined,
        is_active: data.is_active
      };
    } else {
      // Decrypt the credentials
      const apiKey = data.api_key_encrypted ? decryptData(data.api_key_encrypted, ENV.ENCRYPTION_KEY) : '';
      const apiSecret = data.api_secret_encrypted ? decryptData(data.api_secret_encrypted, ENV.ENCRYPTION_KEY) : '';
      const passphrase = data.passphrase ? decryptData(data.passphrase, ENV.ENCRYPTION_KEY) : undefined;
      
      return {
        id: data.id,
        user_id: data.user_id,
        exchange: data.exchange,
        name: data.name || data.exchange,
        testnet: data.testnet || false,
        api_key: apiKey,
        api_secret: apiSecret,
        passphrase,
        is_active: data.is_active
      };
    }
  } catch (error) {
    console.error('Error retrieving exchange credentials:', error);
    throw error;
  }
}

// Get all exchange credentials for a user
export async function getAllExchangeCredentials(userId: string): Promise<ExchangeCredentials[]> {
  const supabase = createBrowserClient();
  
  try {
    // Get all credential records for the user
    const { data, error } = await supabase
      .from('exchange_credentials')
      .select('*')
      .eq('user_id', userId);
    
    if (error) throw error;
    if (!data || data.length === 0) return [];
    
    // Process each credential
    const credentials: ExchangeCredentials[] = [];
    const vaultService = new VaultService(supabase);
    
    for (const cred of data) {
      if (cred.using_vault) {
        // Get from vault
        const apiKey = await vaultService.getValue(`exchange_cred_${cred.id}_api_key`);
        const apiSecret = await vaultService.getValue(`exchange_cred_${cred.id}_api_secret`);
        const passphrase = cred.passphrase 
          ? await vaultService.getValue(`exchange_cred_${cred.id}_passphrase`) 
          : undefined;
        
        credentials.push({
          id: cred.id,
          user_id: cred.user_id,
          exchange: cred.exchange,
          name: cred.name || cred.exchange,
          testnet: cred.testnet || false,
          api_key: apiKey || '',
          api_secret: apiSecret || '',
          passphrase,
          is_active: cred.is_active
        });
      } else {
        // Decrypt
        const apiKey = cred.api_key_encrypted ? decryptData(cred.api_key_encrypted, ENV.ENCRYPTION_KEY) : '';
        const apiSecret = cred.api_secret_encrypted ? decryptData(cred.api_secret_encrypted, ENV.ENCRYPTION_KEY) : '';
        const passphrase = cred.passphrase ? decryptData(cred.passphrase, ENV.ENCRYPTION_KEY) : undefined;
        
        credentials.push({
          id: cred.id,
          user_id: cred.user_id,
          exchange: cred.exchange,
          name: cred.name || cred.exchange,
          testnet: cred.testnet || false,
          api_key: apiKey,
          api_secret: apiSecret,
          passphrase,
          is_active: cred.is_active
        });
      }
    }
    
    return credentials;
  } catch (error) {
    console.error('Error retrieving all exchange credentials:', error);
    return [];
  }
}

// Update exchange credentials
export async function updateExchangeCredentials(credentials: ExchangeCredentials): Promise<void> {
  const supabase = createBrowserClient();
  
  try {
    // Check if using vault
    const { data: credData, error: credError } = await supabase
      .from('exchange_credentials')
      .select('using_vault')
      .eq('id', credentials.id)
      .single();
    
    if (credError) throw credError;
    
    if (credData && credData.using_vault) {
      // Update the base record
      const { error } = await supabase
        .from('exchange_credentials')
        .update({
          exchange: credentials.exchange,
          name: credentials.name,
          testnet: credentials.testnet,
          is_active: credentials.is_active
        })
        .eq('id', credentials.id);
      
      if (error) throw error;
      
      // Update secrets in vault
      const vaultService = new VaultService(supabase);
      await vaultService.setValue(`exchange_cred_${credentials.id}_api_key`, credentials.api_key);
      await vaultService.setValue(`exchange_cred_${credentials.id}_api_secret`, credentials.api_secret);
      
      if (credentials.passphrase) {
        await vaultService.setValue(`exchange_cred_${credentials.id}_passphrase`, credentials.passphrase);
      }
    } else {
      // Encrypt sensitive data
      const encryptedApiKey = encryptData(credentials.api_key, ENV.ENCRYPTION_KEY);
      const encryptedApiSecret = encryptData(credentials.api_secret, ENV.ENCRYPTION_KEY);
      const encryptedPassphrase = credentials.passphrase 
        ? encryptData(credentials.passphrase, ENV.ENCRYPTION_KEY) 
        : null;
      
      // Update with encrypted data
      const { error } = await supabase
        .from('exchange_credentials')
        .update({
          exchange: credentials.exchange,
          name: credentials.name,
          testnet: credentials.testnet,
          api_key_encrypted: encryptedApiKey,
          api_secret_encrypted: encryptedApiSecret,
          passphrase: encryptedPassphrase,
          is_active: credentials.is_active
        })
        .eq('id', credentials.id);
      
      if (error) throw error;
    }
  } catch (error) {
    console.error('Error updating exchange credentials:', error);
    throw error;
  }
}

// Delete exchange credentials
export async function deleteExchangeCredentials(id: string, userId: string): Promise<void> {
  const supabase = createBrowserClient();
  
  try {
    // Check if using vault
    const { data: credData, error: credError } = await supabase
      .from('exchange_credentials')
      .select('using_vault')
      .eq('id', id)
      .eq('user_id', userId)
      .single();
    
    if (credError) throw credError;
    
    // Delete the record
    const { error } = await supabase
      .from('exchange_credentials')
      .delete()
      .eq('id', id)
      .eq('user_id', userId);
    
    if (error) throw error;
    
    // Clean up vault if needed
    if (credData && credData.using_vault) {
      const vaultService = new VaultService(supabase);
      await vaultService.deleteValue(`exchange_cred_${id}_api_key`);
      await vaultService.deleteValue(`exchange_cred_${id}_api_secret`);
      await vaultService.deleteValue(`exchange_cred_${id}_passphrase`);
    }
  } catch (error) {
    console.error('Error deleting exchange credentials:', error);
    throw error;
  }
}

// Check if credential uses vault
export async function doesCredentialUseVault(id: string): Promise<boolean> {
  const supabase = createBrowserClient();
  
  try {
    const { data, error } = await supabase
      .from('exchange_credentials')
      .select('using_vault')
      .eq('id', id)
      .single();
    
    if (error) throw error;
    return data ? !!data.using_vault : false;
  } catch (error) {
    console.error('Error checking if credential uses vault:', error);
    return false;
  }
}

// Migrate credential to vault
export async function migrateCredentialToVault(id: string, userId: string): Promise<boolean> {
  if (!ENV.VAULT_MIGRATION_ENABLED || !ENV.USE_VAULT) {
    return false;
  }
  
  const supabase = createBrowserClient();
  
  try {
    // Get the credential with encrypted data
    const { data, error } = await supabase
      .from('exchange_credentials')
      .select('*')
      .eq('id', id)
      .eq('user_id', userId)
      .eq('using_vault', false)
      .single();
    
    if (error || !data) return false;
    
    // Decrypt the sensitive data
    const apiKey = data.api_key_encrypted ? decryptData(data.api_key_encrypted, ENV.ENCRYPTION_KEY) : '';
    const apiSecret = data.api_secret_encrypted ? decryptData(data.api_secret_encrypted, ENV.ENCRYPTION_KEY) : '';
    const passphrase = data.passphrase ? decryptData(data.passphrase, ENV.ENCRYPTION_KEY) : null;
    
    // Store in vault
    const vaultService = new VaultService(supabase);
    await vaultService.setValue(`exchange_cred_${id}_api_key`, apiKey);
    await vaultService.setValue(`exchange_cred_${id}_api_secret`, apiSecret);
    
    if (passphrase) {
      await vaultService.setValue(`exchange_cred_${id}_passphrase`, passphrase);
    }
    
    // Update the record to use vault
    const { error: updateError } = await supabase
      .from('exchange_credentials')
      .update({
        api_key_encrypted: null,
        api_secret_encrypted: null,
        passphrase: passphrase ? true : null, // Just store a flag that passphrase exists
        using_vault: true
      })
      .eq('id', id);
    
    if (updateError) throw updateError;
    
    return true;
  } catch (error) {
    console.error('Error migrating credential to vault:', error);
    return false;
  }
}
