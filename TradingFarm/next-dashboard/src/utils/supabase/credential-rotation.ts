import { createServerClient } from '@/utils/supabase/server';
import { createBrowserClient } from '@/utils/supabase/client';
import { encryptCredential, decryptCredential } from '@/utils/encryption';
import { getTradingClient } from '@/lib/exchange/connector-factory';
import { recordSecurityEvent } from './security-access';
import { Database } from '@/types/database.types';

/**
 * Credential rotation service
 * Provides functionality to securely rotate exchange API credentials
 * Implements best practices for credential management
 */

type CredentialRotationResult = {
  success: boolean;
  message: string;
  details?: any;
};

export type RotationConfig = {
  automaticRotation: boolean;
  rotationInterval: number; // days
  notifyBeforeExpiry: boolean;
  notificationDays: number;
};

/**
 * Rotate credentials for a specific exchange
 * This is the main function used to initiate a credential rotation
 */
export async function rotateExchangeCredentials(
  exchangeId: string,
  userId: string,
  newApiKey: string,
  newApiSecret: string
): Promise<CredentialRotationResult> {
  try {
    const supabase = createServerClient();
    
    // Get current credentials to test if new credentials work
    const { data: currentCreds, error: fetchError } = await supabase
      .from('exchange_credentials')
      .select('*')
      .eq('user_id', userId)
      .eq('exchange_id', exchangeId)
      .single();
    
    if (fetchError || !currentCreds) {
      return {
        success: false,
        message: 'Failed to retrieve current credentials',
        details: fetchError
      };
    }
    
    // Create a trading client with new credentials to test if they work
    try {
      const testClient = getTradingClient(exchangeId, {
        apiKey: newApiKey,
        apiSecret: newApiSecret,
        testMode: true
      });
      
      // Test connection with new credentials
      await testClient.fetchBalance();
    } catch (testError) {
      // Log failed rotation attempt
      await recordSecurityEvent({
        event_type: 'credential_rotation_failed',
        user_id: userId,
        endpoint: 'credential-rotation',
        method: 'POST',
        ip_address: 'internal',
        user_agent: 'system',
        risk_score: 60,
        details: { 
          exchange_id: exchangeId,
          error: (testError as Error).message 
        }
      });
      
      return {
        success: false,
        message: 'New credentials failed validation',
        details: (testError as Error).message
      };
    }
    
    // Encrypt the new credentials
    const encryptedApiKey = await encryptCredential(newApiKey);
    const encryptedApiSecret = await encryptCredential(newApiSecret);
    
    // Archive the current credentials
    const { error: archiveError } = await supabase
      .from('credential_rotation_history')
      .insert({
        user_id: userId,
        exchange_id: exchangeId,
        previous_key_hash: currentCreds.api_key_hash,
        rotation_reason: 'user_initiated',
        rotation_status: 'success'
      });
    
    if (archiveError) {
      console.error('Failed to archive credentials:', archiveError);
    }
    
    // Update credentials in the database
    const { error: updateError } = await supabase
      .from('exchange_credentials')
      .update({
        api_key: encryptedApiKey,
        api_secret: encryptedApiSecret,
        api_key_hash: await hashCredential(newApiKey),
        last_rotated_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('user_id', userId)
      .eq('exchange_id', exchangeId);
    
    if (updateError) {
      return {
        success: false,
        message: 'Failed to update credentials',
        details: updateError
      };
    }
    
    // Log successful rotation
    await recordSecurityEvent({
      event_type: 'credential_rotation_success',
      user_id: userId,
      endpoint: 'credential-rotation',
      method: 'POST',
      ip_address: 'internal',
      user_agent: 'system',
      risk_score: 10,
      details: { 
        exchange_id: exchangeId
      }
    });
    
    return {
      success: true,
      message: 'Credentials rotated successfully'
    };
  } catch (error) {
    console.error('Credential rotation error:', error);
    return {
      success: false,
      message: 'Credential rotation failed',
      details: (error as Error).message
    };
  }
}

/**
 * Get user's credential rotation settings
 */
export async function getRotationSettings(userId: string): Promise<RotationConfig> {
  try {
    const supabase = createBrowserClient();
    
    const { data, error } = await supabase
      .from('credential_rotation_settings')
      .select('*')
      .eq('user_id', userId)
      .single();
    
    if (error || !data) {
      // Return default settings if not found
      return {
        automaticRotation: false,
        rotationInterval: 90, // 90 days default
        notifyBeforeExpiry: true,
        notificationDays: 7  // 7 days before expiry
      };
    }
    
    return {
      automaticRotation: data.automatic_rotation,
      rotationInterval: data.rotation_interval_days,
      notifyBeforeExpiry: data.notify_before_expiry,
      notificationDays: data.notification_days
    };
  } catch (error) {
    console.error('Failed to get rotation settings:', error);
    // Return default settings if error
    return {
      automaticRotation: false,
      rotationInterval: 90,
      notifyBeforeExpiry: true,
      notificationDays: 7
    };
  }
}

/**
 * Update credential rotation settings
 */
export async function updateRotationSettings(
  userId: string,
  settings: RotationConfig
): Promise<boolean> {
  try {
    const supabase = createServerClient();
    
    const { error } = await supabase
      .from('credential_rotation_settings')
      .upsert({
        user_id: userId,
        automatic_rotation: settings.automaticRotation,
        rotation_interval_days: settings.rotationInterval,
        notify_before_expiry: settings.notifyBeforeExpiry,
        notification_days: settings.notificationDays,
        updated_at: new Date().toISOString()
      });
    
    if (error) {
      console.error('Failed to update rotation settings:', error);
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('Failed to update rotation settings:', error);
    return false;
  }
}

/**
 * Check if credentials are due for rotation
 */
export async function checkCredentialExpiry(): Promise<Database['public']['Tables']['exchange_credentials']['Row'][]> {
  try {
    const supabase = createServerClient();
    
    // Get all active credential rotation settings
    const { data: settings, error: settingsError } = await supabase
      .from('credential_rotation_settings')
      .select('user_id, rotation_interval_days, notification_days')
      .eq('automatic_rotation', true);
    
    if (settingsError || !settings || settings.length === 0) {
      return [];
    }
    
    // Build a map of user settings for quick lookup
    const userSettings = new Map();
    settings.forEach(setting => {
      userSettings.set(setting.user_id, {
        rotationInterval: setting.rotation_interval_days,
        notificationDays: setting.notification_days
      });
    });
    
    // Get all credentials that might need rotation soon
    const { data: credentials, error: credsError } = await supabase
      .from('exchange_credentials')
      .select('*')
      .in('user_id', settings.map(s => s.user_id));
    
    if (credsError || !credentials) {
      return [];
    }
    
    // Filter credentials that need rotation based on each user's settings
    const now = new Date();
    const expiringCredentials = credentials.filter(cred => {
      const userSetting = userSettings.get(cred.user_id);
      if (!userSetting) return false;
      
      const lastRotated = new Date(cred.last_rotated_at);
      const daysSinceRotation = Math.floor((now.getTime() - lastRotated.getTime()) / (1000 * 60 * 60 * 24));
      const daysUntilExpiry = userSetting.rotationInterval - daysSinceRotation;
      
      return daysUntilExpiry <= userSetting.notificationDays;
    });
    
    return expiringCredentials;
  } catch (error) {
    console.error('Failed to check credential expiry:', error);
    return [];
  }
}

/**
 * Hash credential for secure storage and comparison
 */
async function hashCredential(credential: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(credential);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return hashHex;
}
