/**
 * Credential Manager for Trading Farm
 * 
 * Securely manages exchange API credentials with encryption and secure storage
 */

import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from 'crypto';
import { ExchangeCredentials } from '@/types/exchange';
import { createServerClient } from '@/utils/supabase/server';

/**
 * Interface for stored credential data
 */
interface StoredCredential {
  /**
   * ID of the credential
   */
  id: string;
  
  /**
   * User ID that owns this credential
   */
  user_id: string;
  
  /**
   * Farm ID associated with this credential
   */
  farm_id: string;
  
  /**
   * Exchange identifier
   */
  exchange_id: string;
  
  /**
   * Name of this credential set (for user reference)
   */
  name: string;
  
  /**
   * Whether this is for testnet/sandbox
   */
  is_testnet: boolean;
  
  /**
   * Encrypted credential data
   */
  encrypted_data: string;
  
  /**
   * Initialization vector for decryption
   */
  iv: string;
  
  /**
   * Created timestamp
   */
  created_at: string;
  
  /**
   * Last updated timestamp
   */
  updated_at: string;
}

/**
 * Parameters for adding new credentials
 */
export interface CredentialParams {
  /**
   * User ID that owns this credential
   */
  userId: string;
  
  /**
   * Farm ID associated with this credential
   */
  farmId: string;
  
  /**
   * Exchange identifier
   */
  exchangeId: string;
  
  /**
   * Name of this credential set (for user reference)
   */
  name: string;
  
  /**
   * Whether this is for testnet/sandbox
   */
  isTestnet: boolean;
  
  /**
   * Credentials to encrypt and store
   */
  credentials: ExchangeCredentials;
}

/**
 * Class for managing API credentials securely
 */
export class CredentialManager {
  /**
   * Encryption key (derived from environment variables)
   */
  private static encryptionKey: Buffer;
  
  /**
   * Initialize the credential manager
   * Should be called during app startup
   */
  static initialize(): void {
    // In a production environment, this key should come from a secure environment variable
    // and not be hardcoded. For development purposes, we're using a derived key.
    const secretKey = process.env.CREDENTIAL_ENCRYPTION_KEY || 'trading-farm-default-key-do-not-use-in-production';
    
    // Derive a secure key using scrypt
    this.encryptionKey = scryptSync(secretKey, 'salt', 32);
  }
  
  /**
   * Add a new set of credentials
   * @param params Credential parameters
   * @returns ID of the stored credentials
   */
  static async addCredentials(params: CredentialParams): Promise<string> {
    // Encrypt the credentials
    const { encrypted, iv } = this.encryptCredentials(params.credentials);
    
    // Create Supabase client
    const supabase = await createServerClient();
    
    // Store in database
    const { data, error } = await supabase
      .from('exchange_credentials')
      .insert({
        user_id: params.userId,
        farm_id: params.farmId,
        exchange_id: params.exchangeId,
        name: params.name,
        is_testnet: params.isTestnet,
        encrypted_data: encrypted,
        iv: iv
      })
      .select('id')
      .single();
    
    if (error) {
      console.error('Failed to store credentials:', error);
      throw error;
    }
    
    return data.id;
  }
  
  /**
   * Get credentials by ID
   * @param credentialId ID of the credentials to retrieve
   * @returns Decrypted exchange credentials
   */
  static async getCredentialsById(credentialId: string): Promise<ExchangeCredentials> {
    // Create Supabase client
    const supabase = await createServerClient();
    
    // Retrieve from database
    const { data, error } = await supabase
      .from('exchange_credentials')
      .select('*')
      .eq('id', credentialId)
      .single();
    
    if (error) {
      console.error('Failed to retrieve credentials:', error);
      throw error;
    }
    
    // Decrypt the credentials
    return this.decryptCredentials(data.encrypted_data, data.iv);
  }
  
  /**
   * Get credentials for a specific farm and exchange
   * @param farmId Farm ID
   * @param exchangeId Exchange ID
   * @param isTestnet Whether to get testnet credentials
   * @returns Decrypted exchange credentials
   */
  static async getCredentials(
    farmId: string,
    exchangeId: string,
    isTestnet: boolean = false
  ): Promise<ExchangeCredentials> {
    // Create Supabase client
    const supabase = await createServerClient();
    
    // Retrieve from database
    const { data, error } = await supabase
      .from('exchange_credentials')
      .select('*')
      .eq('farm_id', farmId)
      .eq('exchange_id', exchangeId)
      .eq('is_testnet', isTestnet)
      .single();
    
    if (error) {
      console.error('Failed to retrieve credentials:', error);
      throw error;
    }
    
    // Decrypt the credentials
    return this.decryptCredentials(data.encrypted_data, data.iv);
  }
  
  /**
   * List all credentials for a user
   * @param userId User ID
   * @returns Array of credential metadata (without sensitive data)
   */
  static async listCredentials(userId: string): Promise<Omit<StoredCredential, 'encrypted_data' | 'iv'>[]> {
    // Create Supabase client
    const supabase = await createServerClient();
    
    // Retrieve from database
    const { data, error } = await supabase
      .from('exchange_credentials')
      .select('id, user_id, farm_id, exchange_id, name, is_testnet, created_at, updated_at')
      .eq('user_id', userId);
    
    if (error) {
      console.error('Failed to list credentials:', error);
      throw error;
    }
    
    return data;
  }
  
  /**
   * Update existing credentials
   * @param credentialId ID of the credentials to update
   * @param credentials New credentials to store
   * @returns Boolean indicating success
   */
  static async updateCredentials(
    credentialId: string,
    credentials: ExchangeCredentials
  ): Promise<boolean> {
    // Encrypt the credentials
    const { encrypted, iv } = this.encryptCredentials(credentials);
    
    // Create Supabase client
    const supabase = await createServerClient();
    
    // Update in database
    const { error } = await supabase
      .from('exchange_credentials')
      .update({
        encrypted_data: encrypted,
        iv: iv,
        updated_at: new Date().toISOString()
      })
      .eq('id', credentialId);
    
    if (error) {
      console.error('Failed to update credentials:', error);
      throw error;
    }
    
    return true;
  }
  
  /**
   * Delete credentials
   * @param credentialId ID of the credentials to delete
   * @returns Boolean indicating success
   */
  static async deleteCredentials(credentialId: string): Promise<boolean> {
    // Create Supabase client
    const supabase = await createServerClient();
    
    // Delete from database
    const { error } = await supabase
      .from('exchange_credentials')
      .delete()
      .eq('id', credentialId);
    
    if (error) {
      console.error('Failed to delete credentials:', error);
      throw error;
    }
    
    return true;
  }
  
  /**
   * Encrypt credentials
   * @param credentials Credentials to encrypt
   * @returns Encrypted data and initialization vector
   */
  private static encryptCredentials(credentials: ExchangeCredentials): { encrypted: string, iv: string } {
    // Generate a random initialization vector
    const iv = randomBytes(16);
    
    // Create cipher
    const cipher = createCipheriv('aes-256-cbc', this.encryptionKey, iv);
    
    // Encrypt the data
    const credentialString = JSON.stringify(credentials);
    let encrypted = cipher.update(credentialString, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    return {
      encrypted,
      iv: iv.toString('hex')
    };
  }
  
  /**
   * Decrypt credentials
   * @param encryptedData Encrypted credentials
   * @param ivString Initialization vector as a hex string
   * @returns Decrypted credentials
   */
  private static decryptCredentials(encryptedData: string, ivString: string): ExchangeCredentials {
    // Convert IV from hex string to Buffer
    const iv = Buffer.from(ivString, 'hex');
    
    // Create decipher
    const decipher = createDecipheriv('aes-256-cbc', this.encryptionKey, iv);
    
    // Decrypt the data
    let decrypted = decipher.update(encryptedData, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    // Parse the decrypted JSON
    return JSON.parse(decrypted) as ExchangeCredentials;
  }
}
