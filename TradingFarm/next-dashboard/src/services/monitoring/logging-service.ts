import { createServerClient } from '@/utils/supabase/server';
import { SupabaseClient } from '@supabase/supabase-js';
import { Database } from '@/types/database.types';

export enum LogLevel {
  DEBUG = 'debug',
  INFO = 'info',
  WARNING = 'warning',
  ERROR = 'error',
  CRITICAL = 'critical'
}

export enum LogCategory {
  SYSTEM = 'system',
  TRADING = 'trading',
  EXCHANGE = 'exchange',
  AGENT = 'agent',
  USER = 'user',
  API = 'api',
  SECURITY = 'security',
  DATABASE = 'database',
  PERFORMANCE = 'performance'
}

interface LogEntry {
  id?: string;
  timestamp: string;
  level: LogLevel;
  category: LogCategory;
  message: string;
  context: any;
  correlation_id?: string;
  user_id?: string;
  agent_id?: string;
}

interface LoggingOptions {
  minLevel?: LogLevel;
  includeCategories?: LogCategory[];
  excludeCategories?: LogCategory[];
  consoleOutput?: boolean;
  databasePersistence?: boolean;
}

export class LoggingService {
  private supabase: SupabaseClient<Database>;
  private options: LoggingOptions;
  private static instance: LoggingService;
  
  private constructor(supabaseClient: SupabaseClient<Database>, options: LoggingOptions = {}) {
    this.supabase = supabaseClient;
    this.options = {
      minLevel: options.minLevel || LogLevel.INFO,
      includeCategories: options.includeCategories || Object.values(LogCategory),
      excludeCategories: options.excludeCategories || [],
      consoleOutput: options.consoleOutput !== undefined ? options.consoleOutput : true,
      databasePersistence: options.databasePersistence !== undefined ? options.databasePersistence : true
    };
  }
  
  /**
   * Get singleton instance of the logging service
   */
  public static async getInstance(options?: LoggingOptions): Promise<LoggingService> {
    if (!LoggingService.instance) {
      const supabase = await createServerClient();
      LoggingService.instance = new LoggingService(supabase, options);
    } else if (options) {
      // Update options if provided
      LoggingService.instance.options = {
        ...LoggingService.instance.options,
        ...options
      };
    }
    
    return LoggingService.instance;
  }
  
  /**
   * Log a debug message
   */
  public debug(
    message: string,
    category: LogCategory = LogCategory.SYSTEM,
    context: any = {},
    correlationId?: string,
    userId?: string,
    agentId?: string
  ): Promise<void> {
    return this.log(
      LogLevel.DEBUG,
      message,
      category,
      context,
      correlationId,
      userId,
      agentId
    );
  }
  
  /**
   * Log an info message
   */
  public info(
    message: string,
    category: LogCategory = LogCategory.SYSTEM,
    context: any = {},
    correlationId?: string,
    userId?: string,
    agentId?: string
  ): Promise<void> {
    return this.log(
      LogLevel.INFO,
      message,
      category,
      context,
      correlationId,
      userId,
      agentId
    );
  }
  
  /**
   * Log a warning message
   */
  public warning(
    message: string,
    category: LogCategory = LogCategory.SYSTEM,
    context: any = {},
    correlationId?: string,
    userId?: string,
    agentId?: string
  ): Promise<void> {
    return this.log(
      LogLevel.WARNING,
      message,
      category,
      context,
      correlationId,
      userId,
      agentId
    );
  }
  
  /**
   * Log an error message
   */
  public error(
    message: string,
    category: LogCategory = LogCategory.SYSTEM,
    context: any = {},
    correlationId?: string,
    userId?: string,
    agentId?: string
  ): Promise<void> {
    return this.log(
      LogLevel.ERROR,
      message,
      category,
      context,
      correlationId,
      userId,
      agentId
    );
  }
  
  /**
   * Log a critical message
   */
  public critical(
    message: string,
    category: LogCategory = LogCategory.SYSTEM,
    context: any = {},
    correlationId?: string,
    userId?: string,
    agentId?: string
  ): Promise<void> {
    return this.log(
      LogLevel.CRITICAL,
      message,
      category,
      context,
      correlationId,
      userId,
      agentId
    );
  }
  
  /**
   * Log an exchange-related message
   */
  public exchangeLog(
    level: LogLevel,
    message: string,
    context: any = {},
    correlationId?: string,
    userId?: string,
    agentId?: string
  ): Promise<void> {
    return this.log(
      level,
      message,
      LogCategory.EXCHANGE,
      context,
      correlationId,
      userId,
      agentId
    );
  }
  
  /**
   * Log a trading-related message
   */
  public tradingLog(
    level: LogLevel,
    message: string,
    context: any = {},
    correlationId?: string,
    userId?: string,
    agentId?: string
  ): Promise<void> {
    return this.log(
      level,
      message,
      LogCategory.TRADING,
      context,
      correlationId,
      userId,
      agentId
    );
  }
  
  /**
   * Log an agent-related message
   */
  public agentLog(
    level: LogLevel,
    message: string,
    context: any = {},
    correlationId?: string,
    userId?: string,
    agentId?: string
  ): Promise<void> {
    return this.log(
      level,
      message,
      LogCategory.AGENT,
      context,
      correlationId,
      userId,
      agentId
    );
  }
  
  /**
   * Log a security-related message
   */
  public securityLog(
    level: LogLevel,
    message: string,
    context: any = {},
    correlationId?: string,
    userId?: string
  ): Promise<void> {
    return this.log(
      level,
      message,
      LogCategory.SECURITY,
      context,
      correlationId,
      userId
    );
  }
  
  /**
   * Generic log method
   */
  public async log(
    level: LogLevel,
    message: string,
    category: LogCategory = LogCategory.SYSTEM,
    context: any = {},
    correlationId?: string,
    userId?: string,
    agentId?: string
  ): Promise<void> {
    // Check if this log should be processed
    if (!this.shouldLog(level, category)) {
      return;
    }
    
    // Create log entry
    const timestamp = new Date().toISOString();
    const logEntry: LogEntry = {
      timestamp,
      level,
      category,
      message,
      context,
      correlation_id: correlationId,
      user_id: userId,
      agent_id: agentId
    };
    
    // Output to console if enabled
    if (this.options.consoleOutput) {
      this.logToConsole(logEntry);
    }
    
    // Persist to database if enabled
    if (this.options.databasePersistence) {
      await this.persistLog(logEntry);
    }
  }
  
  /**
   * Get logs with filtering options
   */
  public async getLogs(options: {
    startTime?: Date;
    endTime?: Date;
    levels?: LogLevel[];
    categories?: LogCategory[];
    userId?: string;
    agentId?: string;
    correlationId?: string;
    limit?: number;
    offset?: number;
    searchTerm?: string;
  } = {}): Promise<{ logs: LogEntry[]; total: number }> {
    try {
      let query = this.supabase
        .from('system_logs')
        .select('*', { count: 'exact' })
        .order('timestamp', { ascending: false });
      
      // Apply filters
      if (options.startTime) {
        query = query.gte('timestamp', options.startTime.toISOString());
      }
      
      if (options.endTime) {
        query = query.lte('timestamp', options.endTime.toISOString());
      }
      
      if (options.levels && options.levels.length > 0) {
        query = query.in('level', options.levels);
      }
      
      if (options.categories && options.categories.length > 0) {
        query = query.in('category', options.categories);
      }
      
      if (options.userId) {
        query = query.eq('user_id', options.userId);
      }
      
      if (options.agentId) {
        query = query.eq('agent_id', options.agentId);
      }
      
      if (options.correlationId) {
        query = query.eq('correlation_id', options.correlationId);
      }
      
      if (options.searchTerm) {
        query = query.or(`message.ilike.%${options.searchTerm}%,context.ilike.%${options.searchTerm}%`);
      }
      
      // Apply pagination
      if (options.limit !== undefined) {
        query = query.limit(options.limit);
      }
      
      if (options.offset !== undefined) {
        query = query.range(options.offset, (options.offset + (options.limit || 20)) - 1);
      }
      
      // Execute query
      const { data, error, count } = await query;
      
      if (error) {
        console.error('Error fetching logs:', error);
        return { logs: [], total: 0 };
      }
      
      return {
        logs: data as LogEntry[],
        total: count || 0
      };
    } catch (error) {
      console.error('Error getting logs:', error);
      return { logs: [], total: 0 };
    }
  }
  
  /**
   * Create a correlation ID for tracking related log entries
   */
  public generateCorrelationId(): string {
    return `${Date.now()}-${Math.floor(Math.random() * 1000000).toString().padStart(6, '0')}`;
  }
  
  /**
   * Set the minimum log level
   */
  public setMinLevel(level: LogLevel): void {
    this.options.minLevel = level;
  }
  
  /**
   * Set included categories
   */
  public setIncludeCategories(categories: LogCategory[]): void {
    this.options.includeCategories = categories;
  }
  
  /**
   * Set excluded categories
   */
  public setExcludeCategories(categories: LogCategory[]): void {
    this.options.excludeCategories = categories;
  }
  
  /**
   * Enable or disable console output
   */
  public setConsoleOutput(enabled: boolean): void {
    this.options.consoleOutput = enabled;
  }
  
  /**
   * Enable or disable database persistence
   */
  public setDatabasePersistence(enabled: boolean): void {
    this.options.databasePersistence = enabled;
  }
  
  /**
   * Check if this log entry should be processed
   */
  private shouldLog(level: LogLevel, category: LogCategory): boolean {
    // Check log level
    const logLevels = Object.values(LogLevel);
    const currentLevelIndex = logLevels.indexOf(level);
    const minLevelIndex = logLevels.indexOf(this.options.minLevel!);
    
    if (currentLevelIndex < minLevelIndex) {
      return false;
    }
    
    // Check category
    if (this.options.excludeCategories!.includes(category)) {
      return false;
    }
    
    if (!this.options.includeCategories!.includes(category)) {
      return false;
    }
    
    return true;
  }
  
  /**
   * Log to console
   */
  private logToConsole(logEntry: LogEntry): void {
    const timestamp = new Date(logEntry.timestamp).toLocaleTimeString();
    const prefix = `[${timestamp}] [${logEntry.level.toUpperCase()}] [${logEntry.category}]`;
    
    // Add color based on log level
    let coloredPrefix = prefix;
    switch (logEntry.level) {
      case LogLevel.DEBUG:
        coloredPrefix = `\x1b[37m${prefix}\x1b[0m`; // White
        break;
      case LogLevel.INFO:
        coloredPrefix = `\x1b[32m${prefix}\x1b[0m`; // Green
        break;
      case LogLevel.WARNING:
        coloredPrefix = `\x1b[33m${prefix}\x1b[0m`; // Yellow
        break;
      case LogLevel.ERROR:
        coloredPrefix = `\x1b[31m${prefix}\x1b[0m`; // Red
        break;
      case LogLevel.CRITICAL:
        coloredPrefix = `\x1b[41m${prefix}\x1b[0m`; // Red background
        break;
    }
    
    // Log message
    console.log(`${coloredPrefix} ${logEntry.message}`);
    
    // Log context if not empty
    if (Object.keys(logEntry.context).length > 0) {
      console.log('Context:', logEntry.context);
    }
    
    // Log correlation ID if present
    if (logEntry.correlation_id) {
      console.log(`Correlation ID: ${logEntry.correlation_id}`);
    }
    
    // Add separator for better readability
    console.log('-'.repeat(80));
  }
  
  /**
   * Persist log to database
   */
  private async persistLog(logEntry: LogEntry): Promise<void> {
    try {
      // Add log entry to database
      await this.supabase
        .from('system_logs')
        .insert({
          timestamp: logEntry.timestamp,
          level: logEntry.level,
          category: logEntry.category,
          message: logEntry.message,
          context: logEntry.context,
          correlation_id: logEntry.correlation_id,
          user_id: logEntry.user_id,
          agent_id: logEntry.agent_id
        });
    } catch (error) {
      // Don't log persistence errors to avoid infinite loops
      console.error('Error persisting log entry:', error);
    }
  }
}
