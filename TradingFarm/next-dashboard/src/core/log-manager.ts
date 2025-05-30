/**
 * Log Manager
 * 
 * Provides structured logging for the trading system with
 * different severity levels, context preservation, and 
 * database persistence for compliance and troubleshooting.
 */

import { createServerClient } from '@/utils/supabase/server';
import { SupabaseClient } from '@supabase/supabase-js';
import { Database } from '@/types/database.types';

export type LogLevel = 'debug' | 'info' | 'warning' | 'error' | 'critical';

export interface LogEntry {
  id: string;
  timestamp: Date;
  level: LogLevel;
  message: string;
  context?: Record<string, any>;
  farmId?: number;
  strategyId?: number;
  agentId?: number;
  source: string;
}

export class LogManager {
  private farmId?: number;
  private strategyId?: number;
  private agentId?: number;
  private logBuffer: LogEntry[] = [];
  private flushInterval: NodeJS.Timeout;
  private source: string = 'trading-engine';
  private maxBufferSize: number = 100;
  private supabase: SupabaseClient<Database> | null = null;
  
  constructor(
    farmId?: number, 
    strategyId?: number, 
    agentId?: number,
    source: string = 'trading-engine', 
    flushIntervalMs: number = 10000
  ) {
    this.farmId = farmId;
    this.strategyId = strategyId;
    this.agentId = agentId;
    this.source = source;
    
    // Flush logs periodically
    this.flushInterval = setInterval(() => this.flushLogs(), flushIntervalMs);
  }
  
  /**
   * Initialize the Supabase client for database logging
   */
  async initializeSupabase() {
    try {
      this.supabase = await createServerClient();
    } catch (error) {
      console.error('Failed to initialize Supabase client for logging', error);
    }
  }
  
  /**
   * Log a debug message
   */
  debug(message: string, context?: Record<string, any>) {
    this.log('debug', message, context);
  }
  
  /**
   * Log an info message
   */
  info(message: string, context?: Record<string, any>) {
    this.log('info', message, context);
  }
  
  /**
   * Log a warning message
   */
  warn(message: string, context?: Record<string, any>) {
    this.log('warning', message, context);
  }
  
  /**
   * Log an error message
   */
  error(message: string, context?: Record<string, any>) {
    this.log('error', message, context);
  }
  
  /**
   * Log a critical message
   */
  critical(message: string, context?: Record<string, any>) {
    this.log('critical', message, context);
  }
  
  /**
   * Generic logging method
   */
  private log(level: LogLevel, message: string, context?: Record<string, any>) {
    try {
      // Create a structured log entry
      const entry: LogEntry = {
        id: Date.now().toString(36) + Math.random().toString(36).substring(2, 9),
        timestamp: new Date(),
        level,
        message,
        context: this.sanitizeContext(context),
        farmId: this.farmId,
        strategyId: this.strategyId,
        agentId: this.agentId,
        source: this.source
      };
      
      // Add to buffer
      this.logBuffer.push(entry);
      
      // Also log to console
      this.logToConsole(entry);
      
      // Flush if buffer is full
      if (this.logBuffer.length >= this.maxBufferSize) {
        this.flushLogs();
      }
    } catch (error) {
      console.error('Error logging message', error);
    }
  }
  
  /**
   * Log to console with appropriate formatting
   */
  private logToConsole(entry: LogEntry) {
    const timestamp = entry.timestamp.toISOString();
    const prefix = `[${timestamp}] [${entry.level.toUpperCase()}] [${entry.source}]`;
    
    // Format context as JSON if present
    const contextStr = entry.context 
      ? `\n${JSON.stringify(entry.context, null, 2)}`
      : '';
    
    switch (entry.level) {
      case 'debug':
        console.debug(`${prefix} ${entry.message}${contextStr}`);
        break;
      case 'info':
        console.info(`${prefix} ${entry.message}${contextStr}`);
        break;
      case 'warning':
        console.warn(`${prefix} ${entry.message}${contextStr}`);
        break;
      case 'error':
      case 'critical':
        console.error(`${prefix} ${entry.message}${contextStr}`);
        break;
    }
  }
  
  /**
   * Sanitize context object to remove sensitive information
   */
  private sanitizeContext(context?: Record<string, any>): Record<string, any> | undefined {
    if (!context) return undefined;
    
    const sanitized: Record<string, any> = {};
    
    // Sanitize common sensitive fields
    const sensitiveKeys = [
      'apiKey', 'api_key', 'apiSecret', 'api_secret', 'secret',
      'password', 'passphrase', 'token', 'credentials', 'private'
    ];
    
    // Deep copy and sanitize
    for (const [key, value] of Object.entries(context)) {
      // If key contains sensitive information, redact it
      if (sensitiveKeys.some(sk => key.toLowerCase().includes(sk.toLowerCase()))) {
        sanitized[key] = '[REDACTED]';
        continue;
      }
      
      // Handle nested objects
      if (value && typeof value === 'object' && !Array.isArray(value)) {
        sanitized[key] = this.sanitizeContext(value as Record<string, any>);
      } else {
        sanitized[key] = value;
      }
    }
    
    return sanitized;
  }
  
  /**
   * Flush logs to database
   */
  async flushLogs() {
    try {
      if (this.logBuffer.length === 0) return;
      
      // Ensure we have a Supabase client
      if (!this.supabase) {
        await this.initializeSupabase();
      }
      
      if (this.supabase) {
        // Prepare logs for database insertion
        const logs = this.logBuffer.map(log => ({
          id: log.id,
          farm_id: log.farmId,
          strategy_id: log.strategyId,
          agent_id: log.agentId,
          level: log.level,
          message: log.message,
          context: log.context,
          source: log.source,
          created_at: log.timestamp.toISOString()
        }));
        
        try {
          // Try to insert directly into system_logs table if available
          try {
            const { error } = await this.supabase
              .from('system_logs')
              .insert(logs);
            
            if (error) {
              // Fall back to RPC if direct insert fails
              console.warn('Direct insert failed, trying RPC fallback', error);
              const { error: rpcError } = await this.supabase.rpc('insert_system_logs', { logs: logs });
              
              if (rpcError) {
                console.error('Failed to persist logs via RPC', rpcError);
                return;
              }
            }
          } catch (insertError) {
            // If direct insert completely fails, try RPC
            console.warn('Direct insert threw error, trying RPC fallback', insertError);
            const { error: rpcError } = await this.supabase.rpc('insert_system_logs', { logs: logs });
            
            if (rpcError) {
              console.error('Failed to persist logs via RPC', rpcError);
              return;
            }
          }
          
          // Clear buffer after successful insertion
          this.logBuffer = [];
        } catch (dbError) {
          console.error('Error executing database query', dbError);
        }
      } else {
        // If Supabase not available, just clear the buffer to avoid memory issues
        console.warn('Supabase client not available, logs will not be persisted');
        this.logBuffer = [];
      }
    } catch (error) {
      console.error('Error flushing logs', error);
    }
  }
  
  /**
   * Get all logs from the buffer
   */
  getLogs(): LogEntry[] {
    return [...this.logBuffer];
  }
  
  /**
   * Set the maximum log buffer size
   */
  setMaxBufferSize(size: number) {
    this.maxBufferSize = size;
  }
  
  /**
   * Clean up resources when done
   */
  destroy() {
    clearInterval(this.flushInterval);
    this.flushLogs().catch(console.error);
  }
}
