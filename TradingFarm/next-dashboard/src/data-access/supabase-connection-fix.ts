/**
 * Supabase Connection Fix
 * 
 * This module provides utilities to diagnose and fix Supabase connection issues.
 * It validates API keys, tests connections, and provides fallback mechanisms.
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Constants for Supabase connection
const SUPABASE_URL = 'https://bgvlzvswzpfoywfxehis.supabase.co';
const SUPABASE_FALLBACK_URL = 'https://bgvlzvswzpfoywfxehis.pooler.supabase.co';
const DEFAULT_TIMEOUT = 10000; // 10 seconds

interface ConnectionOptions {
  timeout?: number;
  retries?: number;
  usePooler?: boolean;
}

/**
 * Tests a Supabase connection with the given API key
 * @param apiKey The Supabase API key to test
 * @param options Connection test options
 * @returns Connection status and client if successful
 */
export async function testSupabaseConnection(
  apiKey: string,
  options: ConnectionOptions = {}
): Promise<{ success: boolean; message: string; client?: SupabaseClient }> {
  const { timeout = DEFAULT_TIMEOUT, retries = 2, usePooler = false } = options;
  
  // Create client with the appropriate URL based on pooler option
  const url = usePooler ? SUPABASE_FALLBACK_URL : SUPABASE_URL;
  const client = createClient(url, apiKey, {
    auth: { 
      persistSession: false,
      autoRefreshToken: false
    },
    global: {
      fetch: (url, options) => {
        return fetch(url, {
          ...options,
          signal: AbortSignal.timeout(timeout)
        });
      }
    }
  });
  
  // Test the connection with simple health check
  try {
    // Simple query to test connection
    const { data, error } = await client.from('farms').select('count(*)');
    
    if (error) {
      if (retries > 0 && !usePooler) {
        console.log('Connection failed, retrying with pooler URL...');
        return testSupabaseConnection(apiKey, {
          ...options,
          retries: retries - 1,
          usePooler: true
        });
      }
      
      return {
        success: false,
        message: `Connection error: ${error.message}`,
      };
    }
    
    return {
      success: true,
      message: 'Connection successful',
      client
    };
  } catch (e) {
    console.error('Supabase connection test error:', e);
    
    if (retries > 0) {
      // Try again, potentially with pooler URL
      return testSupabaseConnection(apiKey, {
        ...options, 
        retries: retries - 1,
        usePooler: !usePooler
      });
    }
    
    return {
      success: false,
      message: `Exception during connection test: ${e instanceof Error ? e.message : String(e)}`
    };
  }
}

/**
 * Creates a verified Supabase client that has been tested
 * @param apiKey The Supabase API key
 * @returns A tested Supabase client or throws an error
 */
export async function createVerifiedClient(apiKey: string): Promise<SupabaseClient> {
  const result = await testSupabaseConnection(apiKey);
  
  if (!result.success || !result.client) {
    throw new Error(`Failed to create Supabase client: ${result.message}`);
  }
  
  return result.client;
}

/**
 * Validates a Supabase API key format
 * @param apiKey The API key to validate
 * @returns Whether the key appears to be valid
 */
export function validateApiKeyFormat(apiKey: string): boolean {
  // Basic JWT structure validation
  const parts = apiKey.split('.');
  if (parts.length !== 3) {
    return false;
  }
  
  try {
    // Verify header and payload are valid base64
    atob(parts[0]);
    const payload = JSON.parse(atob(parts[1]));
    
    // Check for expected fields in a Supabase JWT
    return !!(payload.iss === 'supabase' && 
      payload.ref === 'bgvlzvswzpfoywfxehis' && 
      payload.exp && 
      payload.iat);
  } catch (e) {
    return false;
  }
}

/**
 * Fix utility to help diagnose and repair Supabase connection issues
 * @param apiKey The Supabase API key to use
 */
export async function fixSupabaseConnection(apiKey: string): Promise<{
  success: boolean;
  message: string;
  client?: SupabaseClient;
}> {
  console.log('Diagnosing Supabase connection issues...');
  
  // Step 1: Validate the API key format
  if (!validateApiKeyFormat(apiKey)) {
    return {
      success: false,
      message: 'Invalid API key format. Please check your Supabase API key.',
    };
  }
  
  // Step 2: Test connection
  const connectionResult = await testSupabaseConnection(apiKey, {
    timeout: 15000, // longer timeout for diagnostics
    retries: 3
  });
  
  if (!connectionResult.success) {
    console.error('Connection diagnostics failed:', connectionResult.message);
    
    // Check if it's likely an authentication issue
    if (connectionResult.message.includes('auth') || 
        connectionResult.message.includes('JWT') ||
        connectionResult.message.includes('key')) {
      return {
        success: false,
        message: 'Authentication failed. Your API key may be expired or invalid. Please generate a new one in the Supabase dashboard.',
      };
    }
    
    // Check if it's likely a network issue
    if (connectionResult.message.includes('network') ||
        connectionResult.message.includes('timeout') ||
        connectionResult.message.includes('fetch')) {
      return {
        success: false,
        message: 'Network connection to Supabase failed. Please check your internet connection and firewall settings.',
      };
    }
    
    return {
      success: false,
      message: `Connection failed: ${connectionResult.message}. Try refreshing your API key.`,
    };
  }
  
  return {
    success: true,
    message: 'Supabase connection verified successfully.',
    client: connectionResult.client
  };
}
