/**
 * Security Access Log Utility
 * 
 * This utility provides type-safe access to the security_access_log table
 * for tracking API usage and potential security issues.
 */
import { SupabaseClient } from '@supabase/supabase-js';
import { Database } from '@/types/database.types';

/**
 * Access types for security logging
 */
export type AccessType = 
  | 'api_access'        // API endpoint access
  | 'login'             // User login
  | 'logout'            // User logout
  | 'credential_view'   // Viewing exchange credentials
  | 'credential_use'    // Using exchange credentials
  | 'account_access'    // Accessing account data
  | 'trading_operation' // Trading operation (order, position)
  | 'settings_change'   // Changing settings
  | 'password_change'   // Password change
  | 'unusual_activity'; // Any unusual or suspicious activity

/**
 * Status types for security logging
 */
export type SecurityStatus = 'allowed' | 'blocked' | 'suspicious';

/**
 * Interface representing a security access log record
 */
export interface SecurityAccessLog {
  id: number;
  user_id?: string | null;
  credential_id?: number | null;
  access_type: AccessType;
  ip_address: string;
  location?: Record<string, any> | null;
  user_agent?: string | null;
  device_fingerprint?: string | null;
  status: SecurityStatus;
  risk_score?: number | null;
  details?: Record<string, any> | null;
  created_at: string;
}

/**
 * Interface for creating a new security access log
 */
export interface SecurityAccessInsert {
  user_id?: string | null;
  credential_id?: number | null;
  access_type: AccessType;
  ip_address: string;
  location?: Record<string, any> | null;
  user_agent?: string | null;
  device_fingerprint?: string | null;
  status: SecurityStatus;
  risk_score?: number | null;
  details?: Record<string, any> | null;
}

/**
 * Create a new security access log entry
 * 
 * @param supabase - Supabase client
 * @param logData - Security access log data
 * @returns Success/error status
 */
export async function createSecurityLog(
  supabase: SupabaseClient,
  logData: SecurityAccessInsert
): Promise<{ success: boolean, error: any }> {
  const { error } = await supabase
    .from('security_access_log')
    .insert(logData);
  
  return { success: !error, error };
}

/**
 * Get security logs for a user with optional filters
 * 
 * @param supabase - Supabase client
 * @param userId - User ID
 * @param options - Filter options
 * @returns Filtered security logs
 */
export async function getUserSecurityLogs(
  supabase: SupabaseClient,
  userId: string,
  options: {
    accessType?: AccessType;
    status?: SecurityStatus;
    ipAddress?: string;
    credentialId?: number;
    startDate?: string;
    endDate?: string;
    minRiskScore?: number;
    limit?: number;
    offset?: number;
  } = {}
): Promise<{ data: SecurityAccessLog[] | null, error: any, count: number | null }> {
  let query = supabase
    .from('security_access_log')
    .select('*', { count: 'exact' })
    .eq('user_id', userId);
  
  // Apply filters if provided
  if (options.accessType) {
    query = query.eq('access_type', options.accessType);
  }
  
  if (options.status) {
    query = query.eq('status', options.status);
  }
  
  if (options.ipAddress) {
    query = query.eq('ip_address', options.ipAddress);
  }
  
  if (options.credentialId) {
    query = query.eq('credential_id', options.credentialId);
  }
  
  if (options.startDate) {
    query = query.gte('created_at', options.startDate);
  }
  
  if (options.endDate) {
    query = query.lte('created_at', options.endDate);
  }
  
  if (options.minRiskScore !== undefined) {
    query = query.gte('risk_score', options.minRiskScore);
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
  
  return { data: data as SecurityAccessLog[] | null, error, count };
}

/**
 * Log credential access
 * 
 * @param supabase - Supabase client
 * @param userId - User ID
 * @param accessType - Type of credential access
 * @param credentialId - ID of the accessed credential
 * @param ipAddress - IP address of the request
 * @param options - Additional options
 * @returns Success/error status
 */
export async function logCredentialAccess(
  supabase: SupabaseClient,
  userId: string,
  accessType: 'credential_view' | 'credential_use',
  credentialId: number,
  ipAddress: string,
  options: {
    userAgent?: string;
    deviceFingerprint?: string;
    details?: Record<string, any>;
    status?: SecurityStatus;
    riskScore?: number;
  } = {}
): Promise<{ success: boolean, error: any }> {
  return createSecurityLog(supabase, {
    user_id: userId,
    credential_id: credentialId,
    access_type: accessType,
    ip_address: ipAddress,
    user_agent: options.userAgent,
    device_fingerprint: options.deviceFingerprint,
    details: options.details,
    status: options.status || 'allowed',
    risk_score: options.riskScore
  });
}

/**
 * Log an API access
 * 
 * @param supabase - Supabase client
 * @param userId - User ID (if authenticated)
 * @param ipAddress - IP address of the request
 * @param endpoint - API endpoint accessed
 * @param options - Additional options
 * @returns Success/error status
 */
export async function logApiAccess(
  supabase: SupabaseClient,
  userId: string | null,
  ipAddress: string,
  endpoint: string,
  options: {
    userAgent?: string;
    deviceFingerprint?: string;
    method?: string;
    requestParams?: Record<string, any>;
    status?: SecurityStatus;
    riskScore?: number;
    credentialId?: number;
  } = {}
): Promise<{ success: boolean, error: any }> {
  return createSecurityLog(supabase, {
    user_id: userId,
    credential_id: options.credentialId,
    access_type: 'api_access',
    ip_address: ipAddress,
    user_agent: options.userAgent,
    device_fingerprint: options.deviceFingerprint,
    details: {
      endpoint,
      method: options.method || 'GET',
      requestParams: options.requestParams,
      timestamp: new Date().toISOString()
    },
    status: options.status || 'allowed',
    risk_score: options.riskScore
  });
}

/**
 * Analyze security logs to detect suspicious patterns
 * 
 * @param supabase - Supabase client
 * @param userId - User ID
 * @param timeframe - Timeframe to analyze in hours (default: 24)
 * @returns Analysis results
 */
export async function analyzeSecurityLogs(
  supabase: SupabaseClient,
  userId: string,
  timeframe: number = 24
): Promise<{
  uniqueIpCount: number;
  suspiciousActivityCount: number;
  riskScore: number;
  unusualLocations: boolean;
  multipleFailedAttempts: boolean;
  credentialAccessPatterns: boolean;
}> {
  // Calculate the start time for the analysis
  const startDate = new Date();
  startDate.setHours(startDate.getHours() - timeframe);
  
  // Get logs for the specified timeframe
  const { data } = await supabase
    .from('security_access_log')
    .select('*')
    .eq('user_id', userId)
    .gte('created_at', startDate.toISOString());
  
  if (!data || data.length === 0) {
    return {
      uniqueIpCount: 0,
      suspiciousActivityCount: 0,
      riskScore: 0,
      unusualLocations: false,
      multipleFailedAttempts: false,
      credentialAccessPatterns: false
    };
  }
  
  // Analyze unique IPs
  const uniqueIps = new Set(data.map(log => log.ip_address));
  const uniqueIpCount = uniqueIps.size;
  
  // Count suspicious activities
  const suspiciousLogs = data.filter(log => 
    log.status === 'suspicious' || log.status === 'blocked' || 
    (log.risk_score !== null && log.risk_score > 70)
  );
  const suspiciousActivityCount = suspiciousLogs.length;
  
  // Check for unusual locations
  const locations = data
    .filter(log => log.location)
    .map(log => `${log.location?.country || ''}-${log.location?.region || ''}`);
  const uniqueLocations = new Set(locations);
  const unusualLocations = uniqueLocations.size > 2; // More than 2 different locations in timeframe
  
  // Check for multiple failed attempts
  const failedAttempts = data.filter(log => 
    log.access_type === 'login' && 
    log.status === 'blocked' &&
    log.details?.reason === 'authentication_failed'
  );
  const multipleFailedAttempts = failedAttempts.length > 3; // More than 3 failed login attempts
  
  // Check for credential access patterns
  const credentialAccesses = data.filter(log => 
    log.access_type === 'credential_view' || 
    log.access_type === 'credential_use'
  );
  const credentialAccessPatterns = credentialAccesses.length > 10; // High number of credential accesses
  
  // Calculate overall risk score (0-100)
  let riskScore = 0;
  riskScore += Math.min(uniqueIpCount * 10, 40);
  riskScore += Math.min(suspiciousActivityCount * 15, 30);
  riskScore += unusualLocations ? 20 : 0;
  riskScore += multipleFailedAttempts ? 30 : 0;
  riskScore += credentialAccessPatterns ? 15 : 0;
  
  // Cap at 100
  riskScore = Math.min(riskScore, 100);
  
  return {
    uniqueIpCount,
    suspiciousActivityCount,
    riskScore,
    unusualLocations,
    multipleFailedAttempts,
    credentialAccessPatterns
  };
}
