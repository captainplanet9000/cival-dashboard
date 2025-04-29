/**
 * Exchange Credentials Utility
 * This utility provides type-safe access to the exchange_credentials table
 * which may not yet be fully reflected in the generated database types.
 */
import { SupabaseClient, PostgrestError } from '@supabase/supabase-js';
import { Database } from '@/types/database.types';

// Define the credential types
export interface ExchangeCredential {
  id: number;
  user_id: string;
  name: string;
  exchange: string;
  api_key: string;
  api_secret: string;
  api_passphrase?: string | null;
  is_active: boolean;
  is_default: boolean;
  is_testnet: boolean;
  permissions: string[];
  created_at: string;
  updated_at: string;
  
  // Additional fields for the UI
  exchangeLabel?: string;
  maskedSecret?: string;
  maskedPassphrase?: string;
}

export interface ExchangeCredentialInsert {
  user_id: string;
  name: string;
  exchange: string;
  api_key: string;
  api_secret: string;
  api_passphrase?: string | null;
  is_active?: boolean;
  is_default?: boolean;
  is_testnet?: boolean;
  permissions?: string[];
}

export interface ExchangeCredentialUpdate {
  name?: string;
  exchange?: string;
  api_key?: string;
  api_secret?: string;
  api_passphrase?: string | null;
  is_active?: boolean;
  is_default?: boolean;
  is_testnet?: boolean;
  permissions?: string[];
}

// Helper function to map database credential to UI credential
function mapCredentialForUI(credential: any): ExchangeCredential {
  // Create a masked version of the secret and passphrase
  const maskedSecret = credential.api_secret 
    ? '•'.repeat(Math.min(credential.api_secret.length, 20))
    : '';
    
  const maskedPassphrase = credential.api_passphrase 
    ? '•'.repeat(Math.min(credential.api_passphrase.length, 12))
    : '';
  
  // Get a readable label for the exchange
  let exchangeLabel = credential.exchange.charAt(0).toUpperCase() + credential.exchange.slice(1);
  
  return {
    ...credential,
    exchangeLabel,
    maskedSecret,
    maskedPassphrase
  };
}

// Individual functions for use with import * as syntax
export async function listCredentials(supabase: SupabaseClient, userId: string): Promise<{ data: ExchangeCredential[] | null, error: any }> {
  const { data, error } = await (supabase
    .from('exchange_credentials')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false }) as any);
  
  // Map credentials to include UI fields
  const mappedData = data ? data.map(mapCredentialForUI) : null;
  return { data: mappedData as ExchangeCredential[] | null, error };
}

export async function getCredential(supabase: SupabaseClient, id: number): Promise<{ data: ExchangeCredential | null, error: any }> {
  const { data, error } = await (supabase
    .from('exchange_credentials')
    .select('*')
    .eq('id', id)
    .single() as any);
  
  // Map credential to include UI fields
  const mappedData = data ? mapCredentialForUI(data) : null;
  return { data: mappedData as ExchangeCredential | null, error };
}

export async function createCredential(supabase: SupabaseClient, credential: ExchangeCredentialInsert): Promise<{ data: ExchangeCredential | null, error: any }> {
  const { data, error } = await (supabase
    .from('exchange_credentials')
    .insert(credential)
    .select()
    .single() as any);
  
  // Map credential to include UI fields
  const mappedData = data ? mapCredentialForUI(data) : null;
  return { data: mappedData as ExchangeCredential | null, error };
}

export async function updateCredential(supabase: SupabaseClient, id: number, credential: ExchangeCredentialUpdate): Promise<{ data: ExchangeCredential | null, error: any }> {
  const { data, error } = await (supabase
    .from('exchange_credentials')
    .update(credential)
    .eq('id', id)
    .select()
    .single() as any);
  
  // Map credential to include UI fields
  const mappedData = data ? mapCredentialForUI(data) : null;
  return { data: mappedData as ExchangeCredential | null, error };
}

export async function deleteCredential(supabase: SupabaseClient, id: number): Promise<{ error: any }> {
  const { error } = await (supabase
    .from('exchange_credentials')
    .delete()
    .eq('id', id) as any);
  
  return { error };
}

export async function setDefaultCredential(supabase: SupabaseClient, userId: string, id: number, exchange: string): Promise<{ data: ExchangeCredential | null, error: any }> {
  // First clear any current default for this exchange
  await (supabase
    .from('exchange_credentials')
    .update({ is_default: false })
    .eq('user_id', userId)
    .eq('exchange', exchange)
    .eq('is_default', true) as any);
  
  // Then set the new default
  const { data, error } = await (supabase
    .from('exchange_credentials')
    .update({ is_default: true })
    .eq('id', id)
    .eq('user_id', userId)
    .select()
    .single() as any);
  
  // Map credential to include UI fields
  const mappedData = data ? mapCredentialForUI(data) : null;
  return { data: mappedData as ExchangeCredential | null, error };
}

// Service object for backwards compatibility
export const exchangeCredentialsService = {
  /**
   * Get all credentials for a user
   */
  getAll: async (supabase: SupabaseClient, userId: string): Promise<{ data: ExchangeCredential[] | null, error: any }> => {
    return listCredentials(supabase, userId);
  },

  /**
   * Get a single credential by ID
   */
  getCredential: async (supabase: SupabaseClient, id: number): Promise<{ data: ExchangeCredential | null, error: any }> => {
    return getCredential(supabase, id);
  },

  /**
   * List all user credentials
   */
  listCredentials: async (supabase: SupabaseClient, userId: string): Promise<{ data: ExchangeCredential[] | null, error: any }> => {
    return listCredentials(supabase, userId);
  },

  /**
   * Create a new credential
   */
  create: async (supabase: SupabaseClient, credential: ExchangeCredentialInsert): Promise<{ data: ExchangeCredential | null, error: any }> => {
    return createCredential(supabase, credential);
  },

  /**
   * Update an existing credential
   */
  update: async (supabase: SupabaseClient, id: number, credential: ExchangeCredentialUpdate): Promise<{ data: ExchangeCredential | null, error: any }> => {
    return updateCredential(supabase, id, credential);
  },

  /**
   * Delete a credential
   */
  delete: async (supabase: SupabaseClient, id: number): Promise<{ error: any }> => {
    return deleteCredential(supabase, id);
  },

  /**
   * Set a credential as default for an exchange
   */
  setDefault: async (supabase: SupabaseClient, userId: string, id: number, exchange: string): Promise<{ data: ExchangeCredential | null, error: any }> => {
    return setDefaultCredential(supabase, userId, id, exchange);
  }
};
