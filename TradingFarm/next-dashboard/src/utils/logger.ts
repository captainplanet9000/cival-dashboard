/**
 * Logger utility for Trading Farm with ElizaOS integration
 * Provides consistent logging across the application
 */

// Log levels
enum LogLevel {
  ERROR = 0,
  WARN = 1,
  INFO = 2,
  DEBUG = 3,
  TRACE = 4
}

// Current log level from environment or default to INFO
const currentLogLevel = process.env.LOG_LEVEL 
  ? (LogLevel[process.env.LOG_LEVEL.toUpperCase() as keyof typeof LogLevel] ?? LogLevel.INFO)
  : LogLevel.INFO;

// Terminal colors for different log levels
const colors = {
  reset: '\x1b[0m',
  error: '\x1b[31m', // Red
  warn: '\x1b[33m',  // Yellow
  info: '\x1b[36m',  // Cyan
  debug: '\x1b[32m', // Green
  trace: '\x1b[90m', // Gray
};

/**
 * Format a log message with timestamp and service info
 */
const formatMessage = (level: string, message: string, ...args: any[]): string => {
  const timestamp = new Date().toISOString();
  const service = process.env.SERVICE_NAME || 'TradingFarm';
  
  // Process any additional arguments (objects, errors, etc.)
  let formattedArgs = '';
  if (args.length > 0) {
    formattedArgs = args.map(arg => {
      if (arg instanceof Error) {
        return `\n${arg.stack || arg.message}`;
      } else if (typeof arg === 'object') {
        try {
          return `\n${JSON.stringify(arg, null, 2)}`;
        } catch (e) {
          return `\n[Circular or Non-Serializable Object]`;
        }
      }
      return ` ${arg}`;
    }).join('');
  }
  
  return `[${timestamp}] [${service}] [${level.toUpperCase()}] ${message}${formattedArgs}`;
};

/**
 * Log a message if the current log level includes the specified level
 */
const log = (level: LogLevel, color: string, levelName: string, message: string, ...args: any[]) => {
  if (currentLogLevel >= level) {
    const formattedMessage = formatMessage(levelName, message, ...args);
    
    // Only use colors in non-production environments
    if (process.env.NODE_ENV !== 'production') {
      console.log(`${color}${formattedMessage}${colors.reset}`);
    } else {
      console.log(formattedMessage);
    }
  }
};

/**
 * Logger interface with ElizaOS integration
 */
export const logger = {
  /**
   * Log error messages
   */
  error: (message: string, ...args: any[]) => {
    log(LogLevel.ERROR, colors.error, 'ERROR', message, ...args);
  },
  
  /**
   * Log warning messages
   */
  warn: (message: string, ...args: any[]) => {
    log(LogLevel.WARN, colors.warn, 'WARN', message, ...args);
  },
  
  /**
   * Log informational messages
   */
  info: (message: string, ...args: any[]) => {
    log(LogLevel.INFO, colors.info, 'INFO', message, ...args);
  },
  
  /**
   * Log debug messages
   */
  debug: (message: string, ...args: any[]) => {
    log(LogLevel.DEBUG, colors.debug, 'DEBUG', message, ...args);
  },
  
  /**
   * Log trace messages (detailed debugging)
   */
  trace: (message: string, ...args: any[]) => {
    log(LogLevel.TRACE, colors.trace, 'TRACE', message, ...args);
  }
};

// Export default logger
export default logger;
