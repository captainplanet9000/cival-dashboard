import { createServerClient } from '@/utils/supabase/server';
import { ExchangeCredentials } from './types';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import crypto from 'crypto';

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
  const cookieStore = cookies();
  const supabase = createServerClient();

  // Get encryption key from environment (in production, use a secure secret manager)
  const encryptionKey = process.env.ENCRYPTION_KEY || 'trading-farm-secure-key-placeholder-123';
  
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
  const cookieStore = cookies();
  const supabase = createServerClient();

  // Get encryption key from environment
  const encryptionKey = process.env.ENCRYPTION_KEY || 'trading-farm-secure-key-placeholder-123';

  // Retrieve encrypted credentials from the database
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
  const cookieStore = cookies();
  const supabase = createServerClient();

  // Delete credentials from the database
  const { error } = await supabase
    .from('exchange_credentials')
    .delete()
    .eq('id', id)
    .eq('user_id', userId); // Ensure user can only delete their own credentials

  if (error) {
    console.error('Error deleting exchange credentials:', error);
    throw new Error(`Failed to delete exchange credentials: ${error.message}`);
  }
}
