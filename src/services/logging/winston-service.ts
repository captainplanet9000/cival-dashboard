import winston from 'winston';
import path from 'path';
import fs from 'fs';

// Ensure logs directory exists
const logDir = path.join(process.cwd(), 'logs');
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}

// Define log formats
const consoleFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    const metaString = Object.keys(meta).length ? JSON.stringify(meta, null, 2) : '';
    return `[${timestamp}] ${level}: ${message} ${metaString}`;
  })
);

const fileFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.json()
);

/**
 * Winston logger service for Trading Farm
 * Handles all application logging with different levels and transports
 */
export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  defaultMeta: { service: 'trading-farm' },
  transports: [
    // Console transport for development
    new winston.transports.Console({
      format: consoleFormat,
      level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
    }),
    
    // File transports for production
    new winston.transports.File({
      filename: path.join(logDir, 'error.log'),
      level: 'error',
      format: fileFormat,
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    }),
    new winston.transports.File({
      filename: path.join(logDir, 'combined.log'),
      format: fileFormat,
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    }),
  ],
  exitOnError: false,
});

// Create stream for Morgan (HTTP request logging)
export const logStream = {
  write: (message: string) => {
    logger.info(message.trim());
  }
};

// Wrapper class for type-safe logging
export class LoggerService {
  private static instance: LoggerService;
  private _logger: winston.Logger;

  private constructor() {
    this._logger = logger;
  }

  public static getInstance(): LoggerService {
    if (!LoggerService.instance) {
      LoggerService.instance = new LoggerService();
    }
    return LoggerService.instance;
  }

  public debug(message: string, meta?: any): void {
    this._logger.debug(message, meta);
  }

  public info(message: string, meta?: any): void {
    this._logger.info(message, meta);
  }

  public warn(message: string, meta?: any): void {
    this._logger.warn(message, meta);
  }

  public error(message: string, meta?: any): void {
    this._logger.error(message, meta);
  }

  // Log API requests
  public logApiRequest(method: string, url: string, status: number, responseTime: number): void {
    this._logger.info(`API Request: ${method} ${url} ${status} ${responseTime}ms`);
  }

  // Log trading events
  public logTradeExecution(tradeId: string, symbol: string, side: string, amount: number, price: number): void {
    this._logger.info(`Trade Executed: ${tradeId}`, {
      symbol,
      side,
      amount,
      price,
      timestamp: new Date().toISOString()
    });
  }

  // Log strategy events
  public logStrategyEvent(strategyId: string, event: string, details?: any): void {
    this._logger.info(`Strategy ${strategyId}: ${event}`, {
      ...details,
      timestamp: new Date().toISOString()
    });
  }

  // Log errors with context
  public logError(error: Error, context?: string, meta?: any): void {
    this._logger.error(`${context || 'Application Error'}: ${error.message}`, {
      ...meta,
      stack: error.stack,
      timestamp: new Date().toISOString()
    });
  }
}

// Export singleton instance
export const loggerService = LoggerService.getInstance();
