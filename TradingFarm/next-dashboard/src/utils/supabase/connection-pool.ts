import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Database } from '@/types/database.types';
import { isProduction } from '@/lib/environment';

/**
 * Optimized connection pooling for Supabase in production environment
 * This utility provides connection reuse and helps manage database connections efficiently
 */

// Connection pool configuration
const POOL_SIZE = 10; // Maximum number of connections in the pool
const CONNECTION_TIMEOUT = 30000; // 30 seconds timeout for idle connections
const MAX_CLIENTS = isProduction() ? POOL_SIZE : 3;

// Connection pool
let connectionPool: SupabaseClient<Database>[] = [];
let activeConnections = 0;

// Track connection usage
interface ConnectionStats {
  created: number;
  released: number;
  errors: number;
  maxActive: number;
  activeConnections?: number;
  poolSize?: number;
}

const stats: ConnectionStats = {
  created: 0,
  released: 0,
  errors: 0,
  maxActive: 0,
};

/**
 * Get a connection from the pool or create a new one if needed
 * @returns A Supabase client instance
 */
export async function getPooledConnection(): Promise<SupabaseClient<Database>> {
  // Check if we have an available connection in the pool
  if (connectionPool.length > 0) {
    const client = connectionPool.shift()!;
    activeConnections++;
    stats.maxActive = Math.max(stats.maxActive, activeConnections);
    return client;
  }

  // Check if we can create a new connection
  if (activeConnections < MAX_CLIENTS) {
    const client = createClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        auth: {
          persistSession: false,
          autoRefreshToken: true,
        },
        db: {
          schema: 'public',
        },
        global: {
          fetch: fetch.bind(globalThis),
          headers: {
            'x-connection-id': `pool-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
          },
        },
      }
    );

    activeConnections++;
    stats.created++;
    stats.maxActive = Math.max(stats.maxActive, activeConnections);
    return client;
  }

  // If we reach here, we need to wait for a connection to be released
  return new Promise((resolve) => {
    const checkInterval = setInterval(() => {
      if (connectionPool.length > 0) {
        clearInterval(checkInterval);
        const client = connectionPool.shift()!;
        activeConnections++;
        stats.maxActive = Math.max(stats.maxActive, activeConnections);
        resolve(client);
      }
    }, 100);
  });
}

/**
 * Release a connection back to the pool
 * @param client The Supabase client to release
 */
export function releaseConnection(client: SupabaseClient<Database>): void {
  // Release the connection back to the pool
  connectionPool.push(client);
  activeConnections--;
  stats.released++;
}

/**
 * Get statistics about the connection pool
 * @returns Connection pool statistics
 */
export function getConnectionStats(): ConnectionStats {
  return {
    ...stats,
    activeConnections,
    poolSize: connectionPool.length,
  };
}

/**
 * Reset the connection pool (useful for testing)
 */
export function resetConnectionPool(): void {
  connectionPool = [];
  activeConnections = 0;
  stats.created = 0;
  stats.released = 0;
  stats.errors = 0;
  stats.maxActive = 0;
}

// Clean up idle connections periodically
if (typeof window !== 'undefined') {
  setInterval(() => {
    // Remove excess connections from the pool
    while (connectionPool.length > POOL_SIZE) {
      connectionPool.pop();
    }
  }, CONNECTION_TIMEOUT);
}
