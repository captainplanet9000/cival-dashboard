/**
 * Connection Health Monitoring Utility
 * 
 * This utility provides type-safe access to the connection_health table
 * for monitoring exchange connection status and performance.
 */
import { SupabaseClient } from '@supabase/supabase-js';
import { Database } from '@/types/database.types';

/**
 * Connection health status types
 */
export type ConnectionStatus = 'online' | 'offline' | 'degraded' | 'throttled';

/**
 * Connection health record
 */
export interface ConnectionHealth {
  id: number;
  user_id: string;
  exchange: string;
  credential_id: number;
  status: ConnectionStatus;
  latency?: number | null;
  last_heartbeat?: string | null;
  error_count: number;
  error_details?: Record<string, any> | null;
  metadata?: Record<string, any> | null;
  last_checked: string;
  created_at: string;
  updated_at: string;
}

/**
 * Interface for creating a new connection health record
 */
export interface ConnectionHealthInsert {
  user_id: string;
  exchange: string;
  credential_id: number;
  status: ConnectionStatus;
  latency?: number | null;
  last_heartbeat?: string | null;
  error_count?: number;
  error_details?: Record<string, any> | null;
  metadata?: Record<string, any> | null;
}

/**
 * Interface for updating a connection health record
 */
export interface ConnectionHealthUpdate {
  status?: ConnectionStatus;
  latency?: number | null;
  last_heartbeat?: string | null;
  error_count?: number;
  error_details?: Record<string, any> | null;
  metadata?: Record<string, any> | null;
  last_checked?: string;
}

/**
 * Get connection health records for a user
 * 
 * @param supabase - Supabase client
 * @param userId - User ID to get records for
 * @returns Connection health records
 */
export async function getConnectionHealthForUser(
  supabase: SupabaseClient,
  userId: string
): Promise<{ data: ConnectionHealth[] | null, error: any }> {
  const { data, error } = await supabase
    .from('connection_health')
    .select('*')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false });
  
  return { data: data as ConnectionHealth[] | null, error };
}

/**
 * Get connection health record for a specific credential
 * 
 * @param supabase - Supabase client
 * @param userId - User ID
 * @param credentialId - Exchange credential ID
 * @returns Connection health record for the credential
 */
export async function getConnectionHealthForCredential(
  supabase: SupabaseClient,
  userId: string, 
  credentialId: number
): Promise<{ data: ConnectionHealth | null, error: any }> {
  const { data, error } = await supabase
    .from('connection_health')
    .select('*')
    .eq('user_id', userId)
    .eq('credential_id', credentialId)
    .single();
  
  return { data: data as ConnectionHealth | null, error };
}

/**
 * Create or update a connection health record
 * 
 * @param supabase - Supabase client
 * @param healthData - Connection health data
 * @returns Created or updated connection health record
 */
export async function upsertConnectionHealth(
  supabase: SupabaseClient,
  healthData: ConnectionHealthInsert
): Promise<{ data: ConnectionHealth | null, error: any }> {
  // Check if a record already exists for this user/exchange/credential
  const { data: existingData } = await supabase
    .from('connection_health')
    .select('id')
    .eq('user_id', healthData.user_id)
    .eq('exchange', healthData.exchange)
    .eq('credential_id', healthData.credential_id)
    .single();
  
  if (existingData) {
    // Update existing record
    const { data, error } = await supabase
      .from('connection_health')
      .update({
        status: healthData.status,
        latency: healthData.latency,
        last_heartbeat: healthData.last_heartbeat,
        error_count: healthData.error_count,
        error_details: healthData.error_details,
        metadata: healthData.metadata,
        last_checked: new Date().toISOString()
      })
      .eq('id', existingData.id)
      .select()
      .single();
    
    return { data: data as ConnectionHealth | null, error };
  } else {
    // Insert new record
    const { data, error } = await supabase
      .from('connection_health')
      .insert(healthData)
      .select()
      .single();
    
    return { data: data as ConnectionHealth | null, error };
  }
}

/**
 * Update an existing connection health record
 * 
 * @param supabase - Supabase client
 * @param id - Connection health record ID
 * @param updates - Updates to apply
 * @returns Updated connection health record
 */
export async function updateConnectionHealth(
  supabase: SupabaseClient,
  id: number,
  updates: ConnectionHealthUpdate
): Promise<{ data: ConnectionHealth | null, error: any }> {
  // Always update last_checked to current time if not specified
  if (!updates.last_checked) {
    updates.last_checked = new Date().toISOString();
  }
  
  const { data, error } = await supabase
    .from('connection_health')
    .update(updates)
    .eq('id', id)
    .select()
    .single();
  
  return { data: data as ConnectionHealth | null, error };
}

/**
 * Record a heartbeat for a connection
 * 
 * @param supabase - Supabase client
 * @param userId - User ID
 * @param credentialId - Exchange credential ID
 * @param exchange - Exchange name
 * @param latency - Connection latency in ms
 * @param status - Connection status
 * @returns Updated connection health record
 */
export async function recordConnectionHeartbeat(
  supabase: SupabaseClient,
  userId: string,
  credentialId: number,
  exchange: string,
  latency: number,
  status: ConnectionStatus = 'online'
): Promise<{ data: ConnectionHealth | null, error: any }> {
  return upsertConnectionHealth(supabase, {
    user_id: userId,
    exchange,
    credential_id: credentialId,
    status,
    latency,
    last_heartbeat: new Date().toISOString(),
    error_count: 0 // Reset error count on successful heartbeat
  });
}

/**
 * Record a connection error
 * 
 * @param supabase - Supabase client
 * @param userId - User ID
 * @param credentialId - Exchange credential ID
 * @param exchange - Exchange name
 * @param error - Error details
 * @param status - Connection status
 * @returns Updated connection health record
 */
export async function recordConnectionError(
  supabase: SupabaseClient,
  userId: string,
  credentialId: number,
  exchange: string,
  error: any,
  status: ConnectionStatus = 'degraded'
): Promise<{ data: ConnectionHealth | null, error: any }> {
  // Get existing record if any
  const { data: existingData } = await supabase
    .from('connection_health')
    .select('*')
    .eq('user_id', userId)
    .eq('exchange', exchange)
    .eq('credential_id', credentialId)
    .single();
  
  const errorCount = existingData ? (existingData.error_count || 0) + 1 : 1;
  const errorDetails = {
    lastError: error?.message || 'Unknown error',
    lastErrorTime: new Date().toISOString(),
    errorCode: error?.code,
    errorStack: error?.stack,
  };
  
  // If too many errors, mark as offline
  const newStatus = errorCount > 3 ? 'offline' : status;
  
  return upsertConnectionHealth(supabase, {
    user_id: userId,
    exchange,
    credential_id: credentialId,
    status: newStatus,
    error_count: errorCount,
    error_details: errorDetails
  });
}

/**
 * Delete connection health records for a user
 * 
 * @param supabase - Supabase client
 * @param userId - User ID
 * @returns Error if any
 */
export async function deleteUserConnectionHealth(
  supabase: SupabaseClient,
  userId: string
): Promise<{ error: any }> {
  const { error } = await supabase
    .from('connection_health')
    .delete()
    .eq('user_id', userId);
  
  return { error };
}
