/**
 * Database Connection Pooling
 * 
 * Optimizes Supabase connections for high-traffic scenarios.
 * Provides connection pooling and management for scaling database access.
 */

import { createClient } from '@supabase/supabase-js';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database.types';

// Connection pool configuration
interface PoolConfig {
  minConnections: number;
  maxConnections: number;
  connectionTimeout: number; // ms
  idleTimeout: number; // ms
  acquireTimeout: number; // ms
}

// Default pool configuration
const DEFAULT_POOL_CONFIG: PoolConfig = {
  minConnections: 2,
  maxConnections: 10,
  connectionTimeout: 30000, // 30 seconds
  idleTimeout: 60000, // 1 minute
  acquireTimeout: 5000, // 5 seconds
};

// Connection with metadata
interface PoolConnection {
  client: SupabaseClient<Database>;
  busy: boolean;
  lastUsed: number;
  created: number;
}

/**
 * Supabase connection pool manager
 * Maintains a pool of Supabase connections for optimal performance
 */
export class ConnectionPool {
  private static instance: ConnectionPool;
  private config: PoolConfig;
  private pool: PoolConnection[] = [];
  private supabaseUrl: string;
  private supabaseKey: string;
  private maintainInterval: NodeJS.Timeout | null = null;
  private waitingClients: Array<{
    resolve: (client: SupabaseClient<Database>) => void;
    reject: (error: Error) => void;
    timestamp: number;
  }> = [];
  
  /**
   * Private constructor for singleton pattern
   */
  private constructor(
    supabaseUrl: string,
    supabaseKey: string,
    config: Partial<PoolConfig> = {}
  ) {
    this.supabaseUrl = supabaseUrl;
    this.supabaseKey = supabaseKey;
    this.config = { ...DEFAULT_POOL_CONFIG, ...config };
    
    // Initialize connection pool
    this.initializePool();
    
    // Start maintenance interval
    this.startMaintenance();
  }
  
  /**
   * Get the ConnectionPool instance (singleton)
   */
  static getInstance(
    supabaseUrl?: string,
    supabaseKey?: string,
    config: Partial<PoolConfig> = {}
  ): ConnectionPool {
    if (!ConnectionPool.instance) {
      if (!supabaseUrl || !supabaseKey) {
        throw new Error('Supabase URL and key are required for initialization');
      }
      
      ConnectionPool.instance = new ConnectionPool(supabaseUrl, supabaseKey, config);
    }
    
    return ConnectionPool.instance;
  }
  
  /**
   * Initialize the connection pool with minimum connections
   */
  private initializePool(): void {
    // Create minimum number of connections
    for (let i = 0; i < this.config.minConnections; i++) {
      const client = createClient<Database>(
        this.supabaseUrl,
        this.supabaseKey
      );
      
      this.pool.push({
        client,
        busy: false,
        lastUsed: Date.now(),
        created: Date.now(),
      });
    }
  }
  
  /**
   * Start the maintenance interval for pool management
   */
  private startMaintenance(): void {
    // Run maintenance every 30 seconds
    this.maintainInterval = setInterval(() => {
      this.maintainPool();
    }, 30000);
  }
  
  /**
   * Stop the maintenance interval
   */
  stopMaintenance(): void {
    if (this.maintainInterval) {
      clearInterval(this.maintainInterval);
      this.maintainInterval = null;
    }
  }
  
  /**
   * Maintain the connection pool
   * - Remove idle connections above minimum
   * - Check for connection timeouts
   * - Process waiting clients
   */
  private maintainPool(): void {
    const now = Date.now();
    
    // Check for waiting clients that have timed out
    this.waitingClients = this.waitingClients.filter(waiting => {
      if (now - waiting.timestamp > this.config.acquireTimeout) {
        waiting.reject(new Error('Timeout acquiring connection from pool'));
        return false;
      }
      return true;
    });
    
    // Process idle connections
    const idleConnections = this.pool.filter(
      conn => !conn.busy && (now - conn.lastUsed > this.config.idleTimeout)
    );
    
    // Remove excess idle connections above minimum
    if (this.pool.length > this.config.minConnections) {
      const excessCount = this.pool.length - this.config.minConnections;
      const connectionsToRemove = idleConnections.slice(0, excessCount);
      
      // Remove them from the pool
      connectionsToRemove.forEach(conn => {
        const index = this.pool.indexOf(conn);
        if (index !== -1) {
          this.pool.splice(index, 1);
        }
      });
    }
    
    // Process waiting clients if capacity allows
    if (this.waitingClients.length > 0 && this.pool.length < this.config.maxConnections) {
      const clientsToProcess = Math.min(
        this.waitingClients.length,
        this.config.maxConnections - this.pool.length
      );
      
      for (let i = 0; i < clientsToProcess; i++) {
        const waiting = this.waitingClients.shift();
        if (waiting) {
          const client = createClient<Database>(
            this.supabaseUrl,
            this.supabaseKey
          );
          
          const connection: PoolConnection = {
            client,
            busy: true,
            lastUsed: now,
            created: now,
          };
          
          this.pool.push(connection);
          waiting.resolve(client);
        }
      }
    }
  }
  
  /**
   * Get a connection from the pool
   */
  async getConnection(): Promise<SupabaseClient<Database>> {
    // Find an available connection
    const availableConnection = this.pool.find(conn => !conn.busy);
    
    if (availableConnection) {
      // Mark as busy and update lastUsed
      availableConnection.busy = true;
      availableConnection.lastUsed = Date.now();
      return availableConnection.client;
    }
    
    // If no available connection but below max, create a new one
    if (this.pool.length < this.config.maxConnections) {
      const client = createClient<Database>(
        this.supabaseUrl,
        this.supabaseKey
      );
      
      const connection: PoolConnection = {
        client,
        busy: true,
        lastUsed: Date.now(),
        created: Date.now(),
      };
      
      this.pool.push(connection);
      return client;
    }
    
    // Otherwise, wait for a connection
    return new Promise((resolve, reject) => {
      this.waitingClients.push({
        resolve,
        reject,
        timestamp: Date.now(),
      });
    });
  }
  
  /**
   * Release a connection back to the pool
   */
  releaseConnection(client: SupabaseClient<Database>): void {
    // Find the connection in the pool
    const connection = this.pool.find(conn => conn.client === client);
    
    if (connection) {
      // Mark as not busy and update lastUsed
      connection.busy = false;
      connection.lastUsed = Date.now();
      
      // Check if waiting clients
      if (this.waitingClients.length > 0) {
        const waitingClient = this.waitingClients.shift();
        if (waitingClient) {
          connection.busy = true;
          waitingClient.resolve(connection.client);
        }
      }
    }
  }
  
  /**
   * Get pool statistics
   */
  getPoolStats(): {
    total: number;
    busy: number;
    idle: number;
    waiting: number;
  } {
    const busy = this.pool.filter(conn => conn.busy).length;
    
    return {
      total: this.pool.length,
      busy,
      idle: this.pool.length - busy,
      waiting: this.waitingClients.length,
    };
  }
  
  /**
   * Close all connections and clear the pool
   */
  async closeAll(): Promise<void> {
    // Stop maintenance
    this.stopMaintenance();
    
    // Reject any waiting clients
    this.waitingClients.forEach(waiting => {
      waiting.reject(new Error('Connection pool is shutting down'));
    });
    this.waitingClients = [];
    
    // Clear the pool
    this.pool = [];
  }
}
