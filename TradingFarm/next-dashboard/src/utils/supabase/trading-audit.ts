/**
 * Trading Audit Log Utility
 * 
 * This utility provides type-safe access to the trading_audit_log table
 * for recording and querying detailed audit information about trading activities.
 */
import { SupabaseClient } from '@supabase/supabase-js';
import { Database } from '@/types/database.types';

/**
 * Action types for audit logging
 */
export type AuditActionType = 
  | 'order_place'
  | 'order_cancel'
  | 'order_update'
  | 'position_open'
  | 'position_close'
  | 'position_update'
  | 'credential_use'
  | 'credential_create'
  | 'credential_update'
  | 'credential_delete'
  | 'market_data_fetch'
  | 'account_info_fetch'
  | 'agent_action'
  | 'system_action';

/**
 * Status types for audit logging
 */
export type AuditStatus = 'success' | 'failure' | 'pending';

/**
 * Trading audit log record
 */
export interface TradingAuditLog {
  id: number;
  user_id: string;
  farm_id?: number | null;
  agent_id?: number | null;
  action_type: AuditActionType;
  status: AuditStatus;
  exchange: string;
  credential_id?: number | null;
  symbol?: string | null;
  details: Record<string, any>;
  ip_address?: string | null;
  user_agent?: string | null;
  request_id?: string | null;
  error_message?: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Interface for creating a new audit log record
 */
export interface TradingAuditInsert {
  user_id: string;
  farm_id?: number | null;
  agent_id?: number | null;
  action_type: AuditActionType;
  status: AuditStatus;
  exchange: string;
  credential_id?: number | null;
  symbol?: string | null;
  details: Record<string, any>;
  ip_address?: string | null;
  user_agent?: string | null;
  request_id?: string | null;
  error_message?: string | null;
}

/**
 * Interface for updating an audit log record
 */
export interface TradingAuditUpdate {
  status?: AuditStatus;
  details?: Record<string, any>;
  error_message?: string | null;
}

/**
 * Create a new audit log entry
 * 
 * @param supabase - Supabase client
 * @param auditData - Audit log data
 * @returns Created audit log record
 */
export async function createAuditLog(
  supabase: SupabaseClient,
  auditData: TradingAuditInsert
): Promise<{ data: TradingAuditLog | null, error: any }> {
  const { data, error } = await supabase
    .from('trading_audit_log')
    .insert(auditData)
    .select()
    .single();
  
  return { data: data as TradingAuditLog | null, error };
}

/**
 * Update an existing audit log entry (e.g., to change status from pending to success)
 * 
 * @param supabase - Supabase client
 * @param id - Audit log ID
 * @param updates - Updates to apply
 * @returns Updated audit log record
 */
export async function updateAuditLog(
  supabase: SupabaseClient,
  id: number,
  updates: TradingAuditUpdate
): Promise<{ data: TradingAuditLog | null, error: any }> {
  const { data, error } = await supabase
    .from('trading_audit_log')
    .update(updates)
    .eq('id', id)
    .select()
    .single();
  
  return { data: data as TradingAuditLog | null, error };
}

/**
 * Get audit logs for a user with optional filters
 * 
 * @param supabase - Supabase client
 * @param userId - User ID
 * @param options - Filter options
 * @returns Filtered audit logs
 */
export async function getUserAuditLogs(
  supabase: SupabaseClient,
  userId: string,
  options: {
    farmId?: number;
    agentId?: number;
    actionType?: AuditActionType;
    status?: AuditStatus;
    exchange?: string;
    credentialId?: number;
    symbol?: string;
    startDate?: string;
    endDate?: string;
    limit?: number;
    offset?: number;
  } = {}
): Promise<{ data: TradingAuditLog[] | null, error: any, count: number | null }> {
  let query = supabase
    .from('trading_audit_log')
    .select('*', { count: 'exact' })
    .eq('user_id', userId);
  
  // Apply filters if provided
  if (options.farmId) {
    query = query.eq('farm_id', options.farmId);
  }
  
  if (options.agentId) {
    query = query.eq('agent_id', options.agentId);
  }
  
  if (options.actionType) {
    query = query.eq('action_type', options.actionType);
  }
  
  if (options.status) {
    query = query.eq('status', options.status);
  }
  
  if (options.exchange) {
    query = query.eq('exchange', options.exchange);
  }
  
  if (options.credentialId) {
    query = query.eq('credential_id', options.credentialId);
  }
  
  if (options.symbol) {
    query = query.eq('symbol', options.symbol);
  }
  
  if (options.startDate) {
    query = query.gte('created_at', options.startDate);
  }
  
  if (options.endDate) {
    query = query.lte('created_at', options.endDate);
  }
  
  // Apply pagination
  if (options.limit) {
    query = query.limit(options.limit);
  }
  
  if (options.offset) {
    query = query.range(options.offset, options.offset + (options.limit || 20) - 1);
  }
  
  // Sort by creation date descending (newest first)
  query = query.order('created_at', { ascending: false });
  
  const { data, error, count } = await query;
  
  return { data: data as TradingAuditLog[] | null, error, count };
}

/**
 * Get a single audit log entry by ID
 * 
 * @param supabase - Supabase client
 * @param id - Audit log ID
 * @returns Audit log record
 */
export async function getAuditLogById(
  supabase: SupabaseClient,
  id: number
): Promise<{ data: TradingAuditLog | null, error: any }> {
  const { data, error } = await supabase
    .from('trading_audit_log')
    .select('*')
    .eq('id', id)
    .single();
  
  return { data: data as TradingAuditLog | null, error };
}

/**
 * Create an audit log for an order operation
 * 
 * @param supabase - Supabase client
 * @param userId - User ID
 * @param action - Action type (place, cancel, update)
 * @param exchange - Exchange name
 * @param status - Operation status
 * @param details - Order details
 * @param options - Additional options
 * @returns Created audit log
 */
export async function logOrderOperation(
  supabase: SupabaseClient,
  userId: string,
  action: 'order_place' | 'order_cancel' | 'order_update',
  exchange: string,
  status: AuditStatus,
  details: Record<string, any>,
  options: {
    farmId?: number;
    agentId?: number;
    credentialId?: number;
    symbol?: string;
    ipAddress?: string;
    userAgent?: string;
    requestId?: string;
    errorMessage?: string;
  } = {}
): Promise<{ data: TradingAuditLog | null, error: any }> {
  return createAuditLog(supabase, {
    user_id: userId,
    farm_id: options.farmId,
    agent_id: options.agentId,
    action_type: action,
    status,
    exchange,
    credential_id: options.credentialId,
    symbol: options.symbol,
    details,
    ip_address: options.ipAddress,
    user_agent: options.userAgent,
    request_id: options.requestId,
    error_message: options.errorMessage
  });
}

/**
 * Create an audit log for a position operation
 * 
 * @param supabase - Supabase client
 * @param userId - User ID
 * @param action - Action type (open, close, update)
 * @param exchange - Exchange name
 * @param status - Operation status
 * @param details - Position details
 * @param options - Additional options
 * @returns Created audit log
 */
export async function logPositionOperation(
  supabase: SupabaseClient,
  userId: string,
  action: 'position_open' | 'position_close' | 'position_update',
  exchange: string,
  status: AuditStatus,
  details: Record<string, any>,
  options: {
    farmId?: number;
    agentId?: number;
    credentialId?: number;
    symbol?: string;
    ipAddress?: string;
    userAgent?: string;
    requestId?: string;
    errorMessage?: string;
  } = {}
): Promise<{ data: TradingAuditLog | null, error: any }> {
  return createAuditLog(supabase, {
    user_id: userId,
    farm_id: options.farmId,
    agent_id: options.agentId,
    action_type: action,
    status,
    exchange,
    credential_id: options.credentialId,
    symbol: options.symbol,
    details,
    ip_address: options.ipAddress,
    user_agent: options.userAgent,
    request_id: options.requestId,
    error_message: options.errorMessage
  });
}
