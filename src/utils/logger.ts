import winston from 'winston';
import { LOGGING_CONFIG } from '../config';
import fs from 'fs';
import path from 'path';

// Ensure log directory exists
if (!fs.existsSync(LOGGING_CONFIG.directory)) {
  fs.mkdirSync(LOGGING_CONFIG.directory, { recursive: true });
}

// Define log format
const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.splat(),
  winston.format.json()
);

// Create console transport
const consoleFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.printf(
    ({ level, message, timestamp, ...meta }) => {
      const metaStr = Object.keys(meta).length 
        ? `\n${JSON.stringify(meta, null, 2)}` 
        : '';
      return `${timestamp} [${level}]: ${message}${metaStr}`;
    }
  )
);

// Create Winston logger
const logger = winston.createLogger({
  level: LOGGING_CONFIG.level,
  format: logFormat,
  defaultMeta: { service: 'trading-farm' },
  transports: [
    // Write logs with level 'error' and below to error.log
    new winston.transports.File({
      filename: path.join(LOGGING_CONFIG.directory, 'error.log'),
      level: 'error',
    }),
    // Write all logs to combined.log
    new winston.transports.File({
      filename: path.join(LOGGING_CONFIG.directory, 'combined.log'),
    }),
  ],
});

// Add console transport for non-production environments
if (process.env.NODE_ENV !== 'production') {
  logger.add(
    new winston.transports.Console({
      format: consoleFormat,
    })
  );
}

// Create a stream object for Morgan HTTP request logging
const httpLogStream = {
  write: (message: string) => {
    logger.info(message.trim());
  },
};

// Function to create a child logger with specific context
export function createLogger(context: string) {
  return logger.child({ context });
}

export { logger, httpLogStream };
export default logger; 