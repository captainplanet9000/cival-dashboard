/**
 * Exchange Connection Monitor
 * 
 * This module provides functionality to monitor the health and performance
 * of exchange connections, record heartbeats, and track errors.
 */

import { IExchangeConnector } from './types';
import { createServerClient } from '@/utils/supabase/server';
import { createBrowserClient } from '@/utils/supabase/client';
import { 
  recordConnectionHeartbeat,
  recordConnectionError,
  ConnectionStatus
} from '@/utils/supabase/connection-health';

/**
 * Options for the connection health check
 */
export interface HealthCheckOptions {
  /**
   * Maximum acceptable latency in milliseconds before considering connection degraded
   */
  maxLatency?: number;

  /**
   * Whether to record the result in the database
   */
  recordResult?: boolean;

  /**
   * Whether to throw an error if the health check fails
   */
  throwOnFailure?: boolean;
}

/**
 * Result of a connection health check
 */
export interface HealthCheckResult {
  /**
   * Connection status
   */
  status: ConnectionStatus;

  /**
   * Round-trip latency in milliseconds
   */
  latency: number;

  /**
   * Whether the health check was successful
   */
  success: boolean;

  /**
   * Any error that occurred during the health check
   */
  error?: Error;

  /**
   * Timestamp of the health check
   */
  timestamp: string;

  /**
   * Exchange name
   */
  exchange: string;

  /**
   * Credential ID
   */
  credentialId: number;
}

/**
 * Check the health of an exchange connection
 * 
 * @param connector - Exchange connector to check
 * @param userId - User ID for recording heartbeat
 * @param credentialId - Exchange credential ID
 * @param options - Health check options
 * @returns Health check result
 */
export async function checkConnectionHealth(
  connector: IExchangeConnector,
  userId: string,
  credentialId: number,
  options: HealthCheckOptions = {}
): Promise<HealthCheckResult> {
  const { 
    maxLatency = 1000, 
    recordResult = true, 
    throwOnFailure = false 
  } = options;
  
  const startTime = Date.now();
  let status: ConnectionStatus = 'online';
  let success = true;
  let error: Error | undefined;
  
  try {
    // Use account info as a health check - this validates API connectivity
    await connector.getAccountInfo();
    
    // Calculate latency
    const endTime = Date.now();
    const latency = endTime - startTime;
    
    // Check if latency is too high (degraded connection)
    if (latency > maxLatency) {
      status = 'degraded';
    }
    
    // Record the heartbeat if requested
    if (recordResult) {
      try {
        const supabase = typeof window !== 'undefined' 
          ? createBrowserClient() 
          : await createServerClient();
        
        await recordConnectionHeartbeat(
          supabase,
          userId,
          credentialId,
          connector.name,
          latency,
          status
        );
      } catch (recordError) {
        console.error('Failed to record connection heartbeat:', recordError);
      }
    }
    
    return {
      status,
      latency,
      success,
      timestamp: new Date().toISOString(),
      exchange: connector.name,
      credentialId
    };
  } catch (checkError: any) {
    // Handle connection failure
    error = checkError;
    status = 'offline';
    success = false;
    
    // Record the error if requested
    if (recordResult) {
      try {
        const supabase = typeof window !== 'undefined' 
          ? createBrowserClient() 
          : await createServerClient();
        
        await recordConnectionError(
          supabase,
          userId,
          credentialId,
          connector.name,
          checkError,
          status
        );
      } catch (recordError) {
        console.error('Failed to record connection error:', recordError);
      }
    }
    
    // Throw the error if requested
    if (throwOnFailure) {
      throw checkError;
    }
    
    return {
      status,
      latency: Date.now() - startTime,
      success,
      error: checkError,
      timestamp: new Date().toISOString(),
      exchange: connector.name,
      credentialId
    };
  }
}

/**
 * Start periodic health checks for a connection
 * 
 * @param connector - Exchange connector to check
 * @param userId - User ID for recording heartbeat
 * @param credentialId - Exchange credential ID
 * @param intervalMs - Interval between checks in milliseconds
 * @param options - Health check options
 * @returns Function to stop the health checks
 */
export function startPeriodicHealthChecks(
  connector: IExchangeConnector,
  userId: string,
  credentialId: number,
  intervalMs: number = 60000, // Default: 1 minute
  options: HealthCheckOptions = {}
): () => void {
  // Run an initial health check
  checkConnectionHealth(connector, userId, credentialId, options)
    .catch(error => console.error('Initial health check failed:', error));
  
  // Set up periodic checks
  const intervalId = setInterval(() => {
    checkConnectionHealth(connector, userId, credentialId, options)
      .catch(error => console.error('Periodic health check failed:', error));
  }, intervalMs);
  
  // Return a function to stop the checks
  return () => {
    clearInterval(intervalId);
  };
}

/**
 * Enhance an exchange connector with automatic health monitoring
 * 
 * @param connector - Exchange connector to enhance
 * @param userId - User ID for recording heartbeat
 * @param credentialId - Exchange credential ID
 * @param options - Health check options and interval
 * @returns The same connector with monitoring attached
 */
export function monitorConnection<T extends IExchangeConnector>(
  connector: T,
  userId: string,
  credentialId: number,
  options: HealthCheckOptions & { intervalMs?: number } = {}
): T {
  // Start health checks when the connector is connected
  const originalConnect = connector.connect.bind(connector);
  let stopHealthChecks: (() => void) | null = null;
  
  connector.connect = async (credentials) => {
    const result = await originalConnect(credentials);
    
    if (result) {
      // Start health checks
      stopHealthChecks = startPeriodicHealthChecks(
        connector,
        userId,
        credentialId,
        options.intervalMs,
        options
      );
    }
    
    return result;
  };
  
  // Stop health checks when the connector is disconnected
  const originalDisconnect = connector.disconnect.bind(connector);
  
  connector.disconnect = async () => {
    if (stopHealthChecks) {
      stopHealthChecks();
      stopHealthChecks = null;
    }
    
    return originalDisconnect();
  };
  
  return connector;
}
