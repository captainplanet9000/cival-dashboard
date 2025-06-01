/**
 * Logging System
 * 
 * Comprehensive logging system that supports different environments
 * and integrates with external monitoring services.
 */

// Log levels ordered by severity
export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  FATAL = 4
}

// Log entry format
export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  category: string;
  message: string;
  data?: any;
  userId?: string;
  sessionId?: string;
  requestId?: string;
}

// Log destination interface
interface LogDestination {
  log(entry: LogEntry): void;
}

// Console logger implementation
class ConsoleLogDestination implements LogDestination {
  log(entry: LogEntry): void {
    const { timestamp, level, category, message, data } = entry;
    
    // Format data if present
    const formattedData = data ? ` ${JSON.stringify(data, null, 2)}` : '';
    
    // Different console methods based on level
    switch (level) {
      case LogLevel.DEBUG:
        console.debug(`[${timestamp}] [${LogLevel[level]}] [${category}] ${message}${formattedData}`);
        break;
      case LogLevel.INFO:
        console.info(`[${timestamp}] [${LogLevel[level]}] [${category}] ${message}${formattedData}`);
        break;
      case LogLevel.WARN:
        console.warn(`[${timestamp}] [${LogLevel[level]}] [${category}] ${message}${formattedData}`);
        break;
      case LogLevel.ERROR:
      case LogLevel.FATAL:
        console.error(`[${timestamp}] [${LogLevel[level]}] [${category}] ${message}${formattedData}`);
        break;
    }
  }
}

// Database logger implementation
class DatabaseLogDestination implements LogDestination {
  private readonly batchSize: number = 10;
  private logQueue: LogEntry[] = [];
  private flushTimeout: NodeJS.Timeout | null = null;
  
  constructor() {
    // Set up flush interval
    this.setupFlushInterval();
  }
  
  log(entry: LogEntry): void {
    // Add to queue
    this.logQueue.push(entry);
    
    // Flush if batch size reached
    if (this.logQueue.length >= this.batchSize) {
      this.flush();
    }
  }
  
  private setupFlushInterval(): void {
    // Flush logs every 30 seconds if not already flushed
    this.flushTimeout = setInterval(() => {
      if (this.logQueue.length > 0) {
        this.flush();
      }
    }, 30000);
  }
  
  private async flush(): Promise<void> {
    // Skip if empty queue
    if (this.logQueue.length === 0) return;
    
    // Get logs to flush and clear queue
    const logsToFlush = [...this.logQueue];
    this.logQueue = [];
    
    try {
      // In a real implementation, we'd insert into the database
      // For now, we'll just simulate it
      if (typeof window === 'undefined') {
        // Server-side
        const { createServerClient } = require('@/utils/supabase/server');
        const supabase = createServerClient();
        
        await supabase.from('system_logs').insert(
          logsToFlush.map(log => ({
            level: LogLevel[log.level],
            category: log.category,
            message: log.message,
            data: log.data,
            user_id: log.userId,
            session_id: log.sessionId,
            request_id: log.requestId,
          }))
        );
      } else {
        // Client-side
        const { createBrowserClient } = require('@/utils/supabase/client');
        const supabase = createBrowserClient();
        
        await supabase.from('system_logs').insert(
          logsToFlush.map(log => ({
            level: LogLevel[log.level],
            category: log.category,
            message: log.message,
            data: log.data,
            user_id: log.userId,
            session_id: log.sessionId,
            request_id: log.requestId,
          }))
        );
      }
    } catch (error) {
      // If database logging fails, output to console as fallback
      console.error('Failed to write logs to database:', error);
      
      // Add back to queue to retry later, with a max queue size
      if (this.logQueue.length < 100) {
        this.logQueue = [...logsToFlush, ...this.logQueue];
      }
    }
  }
}

// In-memory logger for testing
class MemoryLogDestination implements LogDestination {
  logs: LogEntry[] = [];
  
  log(entry: LogEntry): void {
    this.logs.push(entry);
  }
  
  getLogs(): LogEntry[] {
    return this.logs;
  }
  
  clear(): void {
    this.logs = [];
  }
}

// Main logger class
export class Logger {
  private category: string;
  private destinations: LogDestination[] = [];
  private minLevel: LogLevel;
  private metadata: Record<string, any> = {};
  
  constructor(category: string, options: {
    minLevel?: LogLevel,
    destinations?: LogDestination[],
    metadata?: Record<string, any>
  } = {}) {
    this.category = category;
    this.minLevel = options.minLevel ?? LogLevel.INFO;
    this.destinations = options.destinations ?? [new ConsoleLogDestination()];
    this.metadata = options.metadata ?? {};
    
    // If in production, add database logging
    if (process.env.NODE_ENV === 'production') {
      this.destinations.push(new DatabaseLogDestination());
    }
  }
  
  // Set common metadata to include with all logs
  setMetadata(metadata: Record<string, any>): void {
    this.metadata = { ...this.metadata, ...metadata };
  }
  
  // Logging methods
  debug(message: string, data?: any): void {
    this.log(LogLevel.DEBUG, message, data);
  }
  
  info(message: string, data?: any): void {
    this.log(LogLevel.INFO, message, data);
  }
  
  warn(message: string, data?: any): void {
    this.log(LogLevel.WARN, message, data);
  }
  
  error(message: string, data?: any): void {
    this.log(LogLevel.ERROR, message, data);
  }
  
  fatal(message: string, data?: any): void {
    this.log(LogLevel.FATAL, message, data);
  }
  
  // Core log method
  private log(level: LogLevel, message: string, data?: any): void {
    // Skip if below minimum level
    if (level < this.minLevel) return;
    
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      category: this.category,
      message,
      data: { ...data, ...this.metadata },
      userId: this.metadata.userId,
      sessionId: this.metadata.sessionId,
      requestId: this.metadata.requestId
    };
    
    // Log to all destinations
    for (const destination of this.destinations) {
      destination.log(entry);
    }
  }
  
  // Create a child logger with additional metadata
  child(subCategory: string, metadata: Record<string, any> = {}): Logger {
    return new Logger(`${this.category}:${subCategory}`, {
      minLevel: this.minLevel,
      destinations: this.destinations,
      metadata: { ...this.metadata, ...metadata }
    });
  }
}

// Logger registry to avoid creating duplicate loggers
const loggerRegistry: Record<string, Logger> = {};

// Create/retrieve a logger instance
export function createLogger(category: string, options: {
  minLevel?: LogLevel,
  metadata?: Record<string, any>
} = {}): Logger {
  // Reuse existing logger if available
  if (loggerRegistry[category]) {
    return loggerRegistry[category];
  }
  
  // Create new logger
  const minLevel = getLogLevelFromEnv() ?? options.minLevel;
  const logger = new Logger(category, { ...options, minLevel });
  
  // Store in registry
  loggerRegistry[category] = logger;
  
  return logger;
}

// Get log level from environment
function getLogLevelFromEnv(): LogLevel | undefined {
  const envLevel = typeof process !== 'undefined' 
    ? process.env.LOG_LEVEL 
    : null;
    
  if (!envLevel) return undefined;
  
  switch (envLevel.toUpperCase()) {
    case 'DEBUG': return LogLevel.DEBUG;
    case 'INFO': return LogLevel.INFO;
    case 'WARN': return LogLevel.WARN;
    case 'ERROR': return LogLevel.ERROR;
    case 'FATAL': return LogLevel.FATAL;
    default: return undefined;
  }
}

// Create the root application logger
export const appLogger = createLogger('app');

// Example usage:
// const logger = createLogger('exchange');
// logger.info('Connected to exchange', { exchangeId: 'coinbase' });
// logger.error('Failed to place order', { orderId: '123', error: 'Insufficient funds' });
