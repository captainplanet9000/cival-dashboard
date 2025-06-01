/**
 * Exchange Credentials Service
 * 
 * Provides a secure way to store, encrypt, and retrieve exchange API credentials
 * from the Supabase database. Uses server-side encryption to protect sensitive data.
 */
import { createServerClient } from '@/utils/supabase/server';
import { createBrowserClient } from '@/utils/supabase/client';
import { ExchangeType } from './exchange-service';
import crypto from 'crypto';

export interface ExchangeCredential {
  id?: number;
  user_id: string;
  farm_id?: number;
  exchange: string;
  api_key: string;
  api_secret: string;
  additional_params?: Record<string, any>;
  is_testnet?: boolean;
  is_default?: boolean;
  is_active?: boolean;
}

/**
 * Service for managing exchange API credentials
 */
export class ExchangeCredentialsService {
  /**
   * Store exchange credentials in the database with encryption
   * @param credential The exchange credential to store
   * @param isServerSide Whether the function is being called from the server side
   */
  static async storeCredentials(
    credential: ExchangeCredential,
    isServerSide = true
  ): Promise<{ data: any; error: any }> {
    try {
      // Encrypt the API secret before storing it
      const encryptedSecret = this.encryptSecret(credential.api_secret);
      
      // Get the appropriate Supabase client
      const supabase = isServerSide
        ? await createServerClient()
        : createBrowserClient();
      
      // Insert into the exchange_credentials table
      const { data, error } = await supabase
        .from('exchange_credentials')
        .insert({
          user_id: credential.user_id,
          farm_id: credential.farm_id,
          exchange: credential.exchange,
          api_key: credential.api_key,
          api_secret: encryptedSecret, // Store the encrypted secret
          additional_params: credential.additional_params || {},
          is_testnet: credential.is_testnet || false,
          is_default: credential.is_default || false,
          is_active: credential.is_active || true
        })
        .select()
        .single();
      
      if (error) {
        console.error('Error storing exchange credentials:', error);
        return { data: null, error };
      }
      
      return { data, error: null };
    } catch (error) {
      console.error('Exception storing exchange credentials:', error);
      return { data: null, error };
    }
  }

  /**
   * Retrieve exchange credentials from the database
   * @param userId The user ID
   * @param exchange The exchange type
   * @param farmId Optional farm ID
   * @param isServerSide Whether the function is being called from the server side
   */
  static async getCredentials(
    userId: string,
    exchange: ExchangeType,
    farmId?: number,
    isServerSide = true
  ): Promise<{ data: ExchangeCredential | null; error: any }> {
    try {
      // Get the appropriate Supabase client
      const supabase = isServerSide
        ? await createServerClient()
        : createBrowserClient();
      
      // Build the query
      let query = supabase
        .from('exchange_credentials')
        .select('*')
        .eq('user_id', userId)
        .eq('exchange', exchange)
        .eq('is_active', true);
      
      // If farmId is provided, filter by farm ID
      if (farmId) {
        query = query.eq('farm_id', farmId);
      }
      
      // Order by is_default to get default credentials first
      query = query.order('is_default', { ascending: false });
      
      // Execute the query
      const { data, error } = await query.limit(1).single();
      
      if (error) {
        // If no credentials found, return null without error
        if (error.code === 'PGRST116') {
          return { data: null, error: null };
        }
        
        console.error('Error retrieving exchange credentials:', error);
        return { data: null, error };
      }
      
      // Decrypt the API secret
      if (data) {
        const decryptedSecret = this.decryptSecret(data.api_secret);
        return { 
          data: {
            ...data,
            api_secret: decryptedSecret
          }, 
          error: null 
        };
      }
      
      return { data: null, error: null };
    } catch (error) {
      console.error('Exception retrieving exchange credentials:', error);
      return { data: null, error };
    }
  }

  /**
   * Update existing exchange credentials
   * @param id The credential ID
   * @param updates The updates to apply
   * @param isServerSide Whether the function is being called from the server side
   */
  static async updateCredentials(
    id: number,
    updates: Partial<ExchangeCredential>,
    isServerSide = true
  ): Promise<{ data: any; error: any }> {
    try {
      // Get the appropriate Supabase client
      const supabase = isServerSide
        ? await createServerClient()
        : createBrowserClient();
      
      // Prepare the update object
      const updateData: any = { ...updates };
      
      // If API secret is being updated, encrypt it
      if (updates.api_secret) {
        updateData.api_secret = this.encryptSecret(updates.api_secret);
      }
      
      // Update the credentials
      const { data, error } = await supabase
        .from('exchange_credentials')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();
      
      if (error) {
        console.error('Error updating exchange credentials:', error);
        return { data: null, error };
      }
      
      return { data, error: null };
    } catch (error) {
      console.error('Exception updating exchange credentials:', error);
      return { data: null, error };
    }
  }

  /**
   * Delete exchange credentials
   * @param id The credential ID
   * @param isServerSide Whether the function is being called from the server side
   */
  static async deleteCredentials(
    id: number,
    isServerSide = true
  ): Promise<{ success: boolean; error: any }> {
    try {
      // Get the appropriate Supabase client
      const supabase = isServerSide
        ? await createServerClient()
        : createBrowserClient();
      
      // Delete the credentials
      const { error } = await supabase
        .from('exchange_credentials')
        .delete()
        .eq('id', id);
      
      if (error) {
        console.error('Error deleting exchange credentials:', error);
        return { success: false, error };
      }
      
      return { success: true, error: null };
    } catch (error) {
      console.error('Exception deleting exchange credentials:', error);
      return { success: false, error };
    }
  }

  /**
   * List all exchange credentials for a user
   * @param userId The user ID
   * @param isServerSide Whether the function is being called from the server side
   */
  static async listCredentials(
    userId: string,
    isServerSide = true
  ): Promise<{ data: ExchangeCredential[]; error: any }> {
    try {
      // Get the appropriate Supabase client
      const supabase = isServerSide
        ? await createServerClient()
        : createBrowserClient();
      
      // Get all credentials for the user
      const { data, error } = await supabase
        .from('exchange_credentials')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
      
      if (error) {
        console.error('Error listing exchange credentials:', error);
        return { data: [], error };
      }
      
      // For security, don't return the decrypted secrets in the list
      return { data, error: null };
    } catch (error) {
      console.error('Exception listing exchange credentials:', error);
      return { data: [], error };
    }
  }

  /**
   * Encrypt an API secret for secure storage
   * @param secret The API secret to encrypt
   */
  private static encryptSecret(secret: string): string {
    try {
      // Use environment variables for encryption keys
      const encryptionKey = process.env.ENCRYPTION_KEY || 'default-encryption-key-please-change-in-production';
      
      // Create an initialization vector
      const iv = crypto.randomBytes(16);
      
      // Create a cipher using the encryption key and IV
      const cipher = crypto.createCipheriv(
        'aes-256-cbc',
        crypto.createHash('sha256').update(encryptionKey).digest('base64').substr(0, 32),
        iv
      );
      
      // Encrypt the secret
      let encrypted = cipher.update(secret, 'utf8', 'hex');
      encrypted += cipher.final('hex');
      
      // Return the encrypted secret with the IV
      return `${iv.toString('hex')}:${encrypted}`;
    } catch (error) {
      console.error('Error encrypting API secret:', error);
      // If encryption fails, still store the secret (not recommended for production)
      return `unencrypted:${secret}`;
    }
  }

  /**
   * Decrypt an API secret
   * @param encryptedSecret The encrypted API secret
   */
  private static decryptSecret(encryptedSecret: string): string {
    try {
      // Check if the secret is unencrypted
      if (encryptedSecret.startsWith('unencrypted:')) {
        return encryptedSecret.substring('unencrypted:'.length);
      }
      
      // Split the encrypted secret into IV and encrypted data
      const [ivHex, encrypted] = encryptedSecret.split(':');
      
      // Convert the IV from hex to bytes
      const iv = Buffer.from(ivHex, 'hex');
      
      // Use environment variables for encryption keys
      const encryptionKey = process.env.ENCRYPTION_KEY || 'default-encryption-key-please-change-in-production';
      
      // Create a decipher using the encryption key and IV
      const decipher = crypto.createDecipheriv(
        'aes-256-cbc',
        crypto.createHash('sha256').update(encryptionKey).digest('base64').substr(0, 32),
        iv
      );
      
      // Decrypt the secret
      let decrypted = decipher.update(encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      
      return decrypted;
    } catch (error) {
      console.error('Error decrypting API secret:', error);
      // If decryption fails, return an empty string
      return '';
    }
  }
}
