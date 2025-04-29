/**
 * Exchange Error Handling
 * 
 * Comprehensive error handling system for exchange operations
 * Part of Phase 1 Live Trading implementation
 */

import { createLogger } from '@/lib/logging';

// Create a dedicated logger for exchange operations
const logger = createLogger('exchange');

// Error types specific to exchange operations
export enum ExchangeErrorType {
  // Connection Errors
  CONNECTION_FAILED = 'CONNECTION_FAILED',
  AUTHENTICATION_FAILED = 'AUTHENTICATION_FAILED',
  WEBSOCKET_ERROR = 'WEBSOCKET_ERROR',
  
  // API Errors
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
  INSUFFICIENT_PERMISSIONS = 'INSUFFICIENT_PERMISSIONS',
  INVALID_RESPONSE = 'INVALID_RESPONSE',
  TIMEOUT = 'TIMEOUT',
  
  // Trading Errors
  INSUFFICIENT_FUNDS = 'INSUFFICIENT_FUNDS',
  INVALID_ORDER = 'INVALID_ORDER',
  ORDER_NOT_FOUND = 'ORDER_NOT_FOUND',
  PRICE_OUTSIDE_RANGE = 'PRICE_OUTSIDE_RANGE',
  
  // Credential Errors
  INVALID_CREDENTIALS = 'INVALID_CREDENTIALS',
  EXPIRED_CREDENTIALS = 'EXPIRED_CREDENTIALS',
  MISSING_CREDENTIALS = 'MISSING_CREDENTIALS',
  
  // Other Errors
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
  INTERNAL_ERROR = 'INTERNAL_ERROR',
  NETWORK_ERROR = 'NETWORK_ERROR'
}

// Exchange error class
export class ExchangeError extends Error {
  type: ExchangeErrorType;
  exchangeId: string;
  timestamp: Date;
  statusCode?: number;
  retryable: boolean;
  context?: Record<string, any>;
  
  constructor(
    message: string,
    type: ExchangeErrorType,
    exchangeId: string,
    options?: {
      statusCode?: number;
      retryable?: boolean;
      context?: Record<string, any>;
      cause?: Error;
    }
  ) {
    super(message, { cause: options?.cause });
    this.name = 'ExchangeError';
    this.type = type;
    this.exchangeId = exchangeId;
    this.timestamp = new Date();
    this.statusCode = options?.statusCode;
    this.retryable = options?.retryable ?? false;
    this.context = options?.context;
    
    // Log the error when created
    this.logError();
  }
  
  // Log the error
  private logError(): void {
    const logData = {
      type: this.type,
      exchange: this.exchangeId,
      message: this.message,
      timestamp: this.timestamp.toISOString(),
      statusCode: this.statusCode,
      retryable: this.retryable,
      context: this.context
    };
    
    // Log with appropriate level based on error type
    switch (this.type) {
      case ExchangeErrorType.CONNECTION_FAILED:
      case ExchangeErrorType.AUTHENTICATION_FAILED:
      case ExchangeErrorType.INSUFFICIENT_FUNDS:
      case ExchangeErrorType.INTERNAL_ERROR:
        logger.error('Exchange error:', logData);
        break;
        
      case ExchangeErrorType.RATE_LIMIT_EXCEEDED:
      case ExchangeErrorType.TIMEOUT:
      case ExchangeErrorType.WEBSOCKET_ERROR:
      case ExchangeErrorType.PRICE_OUTSIDE_RANGE:
        logger.warn('Exchange warning:', logData);
        break;
        
      default:
        logger.info('Exchange issue:', logData);
    }
  }
  
  // Format for display to users
  toUserMessage(): string {
    switch (this.type) {
      case ExchangeErrorType.CONNECTION_FAILED:
        return `Failed to connect to ${this.exchangeId}. Please check your internet connection and try again.`;
        
      case ExchangeErrorType.AUTHENTICATION_FAILED:
        return `Authentication failed for ${this.exchangeId}. Please check your API credentials.`;
        
      case ExchangeErrorType.INSUFFICIENT_FUNDS:
        return `Insufficient funds on ${this.exchangeId} for this operation.`;
        
      case ExchangeErrorType.RATE_LIMIT_EXCEEDED:
        return `Rate limit exceeded for ${this.exchangeId}. Please try again later.`;
        
      case ExchangeErrorType.INVALID_ORDER:
        return `Invalid order parameters for ${this.exchangeId}.`;
        
      case ExchangeErrorType.ORDER_NOT_FOUND:
        return `Order not found on ${this.exchangeId}.`;
        
      case ExchangeErrorType.TIMEOUT:
        return `Request to ${this.exchangeId} timed out. Please try again.`;
        
      case ExchangeErrorType.INVALID_CREDENTIALS:
      case ExchangeErrorType.EXPIRED_CREDENTIALS:
      case ExchangeErrorType.MISSING_CREDENTIALS:
        return `Invalid or expired credentials for ${this.exchangeId}. Please update your API keys.`;
        
      default:
        return `Error communicating with ${this.exchangeId}: ${this.message}`;
    }
  }
  
  // Check if the error is retryable
  isRetryable(): boolean {
    return this.retryable;
  }
}

/**
 * Create an exchange error from a raw error object
 * 
 * This function analyzes the error and categorizes it appropriately
 */
export function createExchangeError(
  error: any,
  exchangeId: string,
  context?: Record<string, any>
): ExchangeError {
  // Default values
  let message = 'Unknown exchange error';
  let type = ExchangeErrorType.UNKNOWN_ERROR;
  let statusCode: number | undefined = undefined;
  let retryable = false;
  
  // Extract error message if available
  if (error instanceof Error) {
    message = error.message;
  } else if (typeof error === 'string') {
    message = error;
  } else if (error && typeof error === 'object') {
    // Extract error message from JSON response
    message = error.message || error.error || JSON.stringify(error);
    
    // Extract status code if available
    statusCode = error.status || error.code || error.statusCode;
  }
  
  // Analyze error message to categorize it
  if (typeof message === 'string') {
    // Connection errors
    if (
      message.includes('connect') ||
      message.includes('ECONNREFUSED') ||
      message.includes('ENOTFOUND') ||
      message.includes('network')
    ) {
      type = ExchangeErrorType.CONNECTION_FAILED;
      retryable = true;
    }
    // Authentication errors
    else if (
      message.includes('auth') ||
      message.includes('key') ||
      message.includes('signature') ||
      message.includes('permission') ||
      message.includes('unauthorized') ||
      message.includes('forbidden')
    ) {
      type = ExchangeErrorType.AUTHENTICATION_FAILED;
      retryable = false;
    }
    // Rate limit errors
    else if (
      message.includes('rate limit') ||
      message.includes('ratelimit') ||
      message.includes('too many requests')
    ) {
      type = ExchangeErrorType.RATE_LIMIT_EXCEEDED;
      retryable = true;
    }
    // Timeout errors
    else if (message.includes('timeout') || message.includes('timed out')) {
      type = ExchangeErrorType.TIMEOUT;
      retryable = true;
    }
    // Balance errors
    else if (
      message.includes('insufficient') ||
      message.includes('balance') ||
      message.includes('funds')
    ) {
      type = ExchangeErrorType.INSUFFICIENT_FUNDS;
      retryable = false;
    }
    // Invalid order errors
    else if (
      message.includes('invalid order') ||
      message.includes('order parameter')
    ) {
      type = ExchangeErrorType.INVALID_ORDER;
      retryable = false;
    }
    // Not found errors
    else if (message.includes('not found') || message.includes('unknown order')) {
      type = ExchangeErrorType.ORDER_NOT_FOUND;
      retryable = false;
    }
  }
  
  // Use status code to refine categorization
  if (statusCode !== undefined) {
    if (statusCode === 401 || statusCode === 403) {
      type = ExchangeErrorType.AUTHENTICATION_FAILED;
      retryable = false;
    } else if (statusCode === 429) {
      type = ExchangeErrorType.RATE_LIMIT_EXCEEDED;
      retryable = true;
    } else if (statusCode === 408 || statusCode === 504) {
      type = ExchangeErrorType.TIMEOUT;
      retryable = true;
    } else if (statusCode === 404) {
      type = ExchangeErrorType.ORDER_NOT_FOUND;
      retryable = false;
    } else if (statusCode >= 500) {
      type = ExchangeErrorType.INTERNAL_ERROR;
      retryable = true;
    }
  }
  
  return new ExchangeError(message, type, exchangeId, {
    statusCode,
    retryable,
    context,
    cause: error instanceof Error ? error : undefined
  });
}

/**
 * Alias for withExchangeErrorHandling to maintain backward compatibility
 * with existing code that uses handleExchangeError
 */
export const handleExchangeError = withExchangeErrorHandling;

/**
 * Exchange operation wrapper with error handling
 * 
 * This function wraps exchange operations with proper error handling
 */
export async function withExchangeErrorHandling<T>(
  operation: () => Promise<T>,
  exchangeId: string,
  operationName: string,
  context?: Record<string, any>,
  retries: number = 0
): Promise<T> {
  try {
    logger.debug(`Starting exchange operation: ${operationName} on ${exchangeId}`);
    
    // Attempt the operation
    const result = await operation();
    
    logger.debug(`Successfully completed exchange operation: ${operationName} on ${exchangeId}`);
    return result;
  } catch (error) {
    // Convert to ExchangeError
    const exchangeError = error instanceof ExchangeError
      ? error
      : createExchangeError(error, exchangeId, { ...context, operation: operationName });
    
    // Check if we should retry
    if (exchangeError.isRetryable() && retries > 0) {
      logger.warn(`Retrying exchange operation (${retries} attempts left): ${operationName} on ${exchangeId}`);
      
      // Exponential backoff - wait longer between each retry
      const backoffMs = 1000 * Math.pow(2, 3 - retries);
      await new Promise(resolve => setTimeout(resolve, backoffMs));
      
      // Retry the operation
      return withExchangeErrorHandling(
        operation,
        exchangeId,
        operationName,
        context,
        retries - 1
      );
    }
    
    // No more retries or not retryable
    throw exchangeError;
  }
}
