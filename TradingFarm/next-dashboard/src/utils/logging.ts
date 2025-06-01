/**
 * Trading Farm Dashboard Logging System
 * 
 * Provides standardized logging functionality for tracking errors, events,
 * and user actions throughout the application.
 */

import { createBrowserClient } from "@/utils/supabase/client";
import { ErrorSource, ErrorCategory, AppError } from './error-handling';

// Log levels
export enum LogLevel {
  DEBUG = 'debug',
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error',
  CRITICAL = 'critical'
}

// Log categories
export enum LogCategory {
  USER_ACTION = 'user_action',
  SYSTEM = 'system',
  API = 'api',
  DATABASE = 'database',
  AUTHENTICATION = 'authentication',
  PERFORMANCE = 'performance',
  SECURITY = 'security'
}

// Log entry interface
export interface LogEntry {
  level: LogLevel;
  category: LogCategory;
  message: string;
  timestamp: Date;
  context?: Record<string, any>;
  user_id?: string;
  farm_id?: string;
  error?: Error | any;
  session_id?: string;
  source_component?: string;
  tags?: string[];
}

// Configuration for the logger
interface LoggerConfig {
  minLevel: LogLevel;
  enabled: boolean;
  persistToDB: boolean;
  consoleOutput: boolean;
  contextEnricher?: () => Record<string, any>;
  filterFn?: (entry: LogEntry) => boolean;
}

// Default configuration
const defaultConfig: LoggerConfig = {
  minLevel: LogLevel.INFO,
  enabled: true,
  persistToDB: true,
  consoleOutput: true
};

// Global logger configuration
let loggerConfig: LoggerConfig = { ...defaultConfig };

/**
 * Configure the logger
 */
export function configureLogger(config: Partial<LoggerConfig>): void {
  loggerConfig = { ...loggerConfig, ...config };
}

/**
 * Log an entry to configured destinations
 */
export async function log(entry: Omit<LogEntry, 'timestamp'>): Promise<void> {
  // Return early if logging is disabled or level is below minimum
  if (!loggerConfig.enabled || !shouldLog(entry.level)) {
    return;
  }

  const fullEntry: LogEntry = {
    ...entry,
    timestamp: new Date()
  };

  // Enrich with global context if available
  if (loggerConfig.contextEnricher) {
    fullEntry.context = {
      ...loggerConfig.contextEnricher(),
      ...fullEntry.context
    };
  }

  // Filter if needed
  if (loggerConfig.filterFn && !loggerConfig.filterFn(fullEntry)) {
    return;
  }

  // Log to console if enabled
  if (loggerConfig.consoleOutput) {
    logToConsole(fullEntry);
  }

  // Persist to database if enabled
  if (loggerConfig.persistToDB) {
    await persistToDB(fullEntry);
  }
}

/**
 * Log an error with context
 */
export async function logError(
  error: Error | AppError | any,
  message: string,
  options: {
    category?: LogCategory;
    context?: Record<string, any>;
    user_id?: string;
    farm_id?: string;
    source_component?: string;
    level?: LogLevel;
    tags?: string[];
  } = {}
): Promise<void> {
  const {
    category = LogCategory.SYSTEM,
    context = {},
    level = LogLevel.ERROR,
    ...rest
  } = options;

  // Check if it's our AppError
  const isAppError = 
    error && 
    typeof error === 'object' && 
    'source' in error && 
    'category' in error && 
    'timestamp' in error;

  // Prepare error context
  let errorContext: Record<string, any> = {
    ...context
  };

  if (isAppError) {
    const appError = error as AppError;
    errorContext = {
      ...errorContext,
      errorSource: appError.source,
      errorCategory: appError.category,
      errorContext: appError.context,
      errorTimestamp: appError.timestamp,
      handled: appError.handled
    };
  } else if (error instanceof Error) {
    errorContext.errorName = error.name;
    errorContext.errorStack = error.stack;
  }

  await log({
    level,
    category,
    message,
    error,
    context: errorContext,
    ...rest
  });
}

/**
 * Specialized logger for user actions
 */
export async function logUserAction(
  action: string,
  details: Record<string, any> = {},
  options: {
    user_id?: string;
    farm_id?: string;
    level?: LogLevel;
    tags?: string[];
  } = {}
): Promise<void> {
  const {
    level = LogLevel.INFO,
    ...rest
  } = options;

  await log({
    level,
    category: LogCategory.USER_ACTION,
    message: `User action: ${action}`,
    context: details,
    ...rest
  });
}

/**
 * Specialized logger for performance metrics
 */
export async function logPerformance(
  operation: string,
  durationMs: number,
  options: {
    context?: Record<string, any>;
    source_component?: string;
    tags?: string[];
  } = {}
): Promise<void> {
  await log({
    level: LogLevel.INFO,
    category: LogCategory.PERFORMANCE,
    message: `Performance: ${operation} took ${durationMs}ms`,
    context: {
      operation,
      durationMs,
      ...options.context
    },
    source_component: options.source_component,
    tags: options.tags
  });
}

/**
 * Determine if the log level meets the threshold
 */
function shouldLog(level: LogLevel): boolean {
  const levels = [
    LogLevel.DEBUG, 
    LogLevel.INFO, 
    LogLevel.WARN, 
    LogLevel.ERROR, 
    LogLevel.CRITICAL
  ];
  
  const configIndex = levels.indexOf(loggerConfig.minLevel);
  const entryIndex = levels.indexOf(level);
  
  return entryIndex >= configIndex;
}

/**
 * Output a log entry to the console
 */
function logToConsole(entry: LogEntry): void {
  const timestamp = entry.timestamp.toISOString();
  const prefix = `[${timestamp}] [${entry.level.toUpperCase()}] [${entry.category}]`;
  
  const message = `${prefix} ${entry.message}`;
  const context = entry.context ? entry.context : {};
  
  switch (entry.level) {
    case LogLevel.DEBUG:
      console.debug(message, { ...entry, context });
      break;
    case LogLevel.INFO:
      console.info(message, { ...entry, context });
      break;
    case LogLevel.WARN:
      console.warn(message, { ...entry, context });
      break;
    case LogLevel.ERROR:
    case LogLevel.CRITICAL:
      console.error(message, { ...entry, context, error: entry.error });
      break;
  }
}

/**
 * Persist a log entry to the database
 */
async function persistToDB(entry: LogEntry): Promise<void> {
  try {
    const supabase = createBrowserClient();
    
    // Serialize any error objects
    let serializedError = null;
    if (entry.error) {
      if (entry.error instanceof Error) {
        serializedError = {
          name: entry.error.name,
          message: entry.error.message,
          stack: entry.error.stack
        };
      } else {
        serializedError = entry.error;
      }
    }
    
    // Insert into the application_logs table
    await supabase
      .from('application_logs')
      .insert({
        level: entry.level,
        category: entry.category,
        message: entry.message,
        timestamp: entry.timestamp,
        context: entry.context || {},
        user_id: entry.user_id,
        farm_id: entry.farm_id,
        error_data: serializedError,
        session_id: entry.session_id,
        source_component: entry.source_component,
        tags: entry.tags || []
      });
  } catch (error) {
    // Don't use our logging functions here to avoid infinite recursion
    console.error('Failed to persist log to database:', error);
  }
}

/**
 * Create a logger instance with predefined context
 */
/**
 * Log an analytics event
 */
export function logEvent(event: {
  category: string;
  action: string;
  label?: string;
  value?: number;
  metadata?: Record<string, any>;
}): void {
  // Log to console in development
  if (process.env.NODE_ENV === 'development') {
    console.log(`[EVENT] ${event.category}:${event.action}${event.label ? `:${event.label}` : ''}${event.value !== undefined ? ` (${event.value})` : ''}`);
  }
  
  // In production, send to analytics system or database
  if (process.env.NODE_ENV === 'production') {
    // For now, just log to database
    persistToDB({
      level: LogLevel.INFO,
      category: LogCategory.USER_ACTION,
      message: `Analytics event: ${event.category}:${event.action}`,
      timestamp: new Date(),
      context: {
        ...event.metadata,
        eventCategory: event.category,
        eventAction: event.action,
        eventLabel: event.label,
        eventValue: event.value
      },
      tags: ['analytics', event.category]
    }).catch(err => {
      console.error('Failed to persist analytics event:', err);
    });
  }
}

export function createLogger(defaults: {
  source_component: string;
  category?: LogCategory;
  user_id?: string;
  farm_id?: string;
  session_id?: string;
  tags?: string[];
}) {
  return {
    debug: (message: string, context: Record<string, any> = {}) => 
      log({
        level: LogLevel.DEBUG,
        category: defaults.category || LogCategory.SYSTEM,
        message,
        context,
        user_id: defaults.user_id,
        farm_id: defaults.farm_id,
        session_id: defaults.session_id,
        source_component: defaults.source_component,
        tags: defaults.tags
      }),
      
    info: (message: string, context: Record<string, any> = {}) => 
      log({
        level: LogLevel.INFO,
        category: defaults.category || LogCategory.SYSTEM,
        message,
        context,
        user_id: defaults.user_id,
        farm_id: defaults.farm_id,
        session_id: defaults.session_id,
        source_component: defaults.source_component,
        tags: defaults.tags
      }),
      
    warn: (message: string, context: Record<string, any> = {}) => 
      log({
        level: LogLevel.WARN,
        category: defaults.category || LogCategory.SYSTEM,
        message,
        context,
        user_id: defaults.user_id,
        farm_id: defaults.farm_id,
        session_id: defaults.session_id,
        source_component: defaults.source_component,
        tags: defaults.tags
      }),
      
    error: (message: string, error: Error | any, context: Record<string, any> = {}) => 
      logError(error, message, {
        category: defaults.category || LogCategory.SYSTEM,
        context,
        user_id: defaults.user_id,
        farm_id: defaults.farm_id,
        source_component: defaults.source_component,
        tags: defaults.tags
      }),
      
    userAction: (action: string, details: Record<string, any> = {}) => 
      logUserAction(action, details, {
        user_id: defaults.user_id,
        farm_id: defaults.farm_id,
        tags: defaults.tags
      }),
      
    performance: (operation: string, durationMs: number, additionalContext: Record<string, any> = {}) => 
      logPerformance(operation, durationMs, {
        context: additionalContext,
        source_component: defaults.source_component,
        tags: defaults.tags
      })
  };
}
