import { ethers } from 'ethers';
import axios from 'axios';

// Error types for better categorization
export enum DeFiErrorType {
  NETWORK_ERROR = 'network_error',
  TRANSACTION_ERROR = 'transaction_error',
  USER_REJECTED = 'user_rejected',
  INSUFFICIENT_FUNDS = 'insufficient_funds',
  SLIPPAGE_ERROR = 'slippage_error',
  PRICE_IMPACT_ERROR = 'price_impact_error',
  CONTRACT_ERROR = 'contract_error',
  API_ERROR = 'api_error',
  UNKNOWN_ERROR = 'unknown_error'
}

export interface DeFiError {
  type: DeFiErrorType;
  message: string;
  details?: any;
  originalError?: any;
  isRecoverable: boolean;
  protocol?: string;
  action?: string;
}

export interface RetryOptions {
  maxRetries: number; 
  initialDelay: number; // in ms
  backoffFactor: number;
  maxDelay?: number; // in ms
  retryableErrorTypes?: DeFiErrorType[];
}

export class ErrorHandler {
  private static instance: ErrorHandler;
  private errorLog: DeFiError[] = [];
  private errorCallbacks: ((error: DeFiError) => void)[] = [];
  
  private defaultRetryOptions: RetryOptions = {
    maxRetries: 3,
    initialDelay: 1000,
    backoffFactor: 2,
    maxDelay: 10000,
    retryableErrorTypes: [
      DeFiErrorType.NETWORK_ERROR,
      DeFiErrorType.API_ERROR
    ]
  };
  
  private constructor() {}
  
  // Singleton pattern
  public static getInstance(): ErrorHandler {
    if (!ErrorHandler.instance) {
      ErrorHandler.instance = new ErrorHandler();
    }
    return ErrorHandler.instance;
  }
  
  // Register error callback
  public registerErrorCallback(callback: (error: DeFiError) => void): void {
    this.errorCallbacks.push(callback);
  }
  
  // Clear all registered callbacks
  public clearErrorCallbacks(): void {
    this.errorCallbacks = [];
  }
  
  // Get error log
  public getErrorLog(): DeFiError[] {
    return [...this.errorLog]; // Return a copy
  }
  
  // Clear error log
  public clearErrorLog(): void {
    this.errorLog = [];
  }
  
  // Process and categorize errors
  public handleError(error: any, protocol?: string, action?: string): DeFiError {
    const deFiError = this.categorizeError(error, protocol, action);
    
    // Log error
    this.errorLog.push(deFiError);
    
    // Notify all registered callbacks
    this.errorCallbacks.forEach(callback => {
      try {
        callback(deFiError);
      } catch (callbackError) {
        console.error('Error in error callback:', callbackError);
      }
    });
    
    return deFiError;
  }
  
  // Retry a function with exponential backoff
  public async retryWithBackoff<T>(
    fn: () => Promise<T>,
    options?: Partial<RetryOptions>,
    protocol?: string,
    action?: string
  ): Promise<T> {
    const retryOptions = { ...this.defaultRetryOptions, ...options };
    let lastError: any;
    
    for (let attempt = 0; attempt < retryOptions.maxRetries; attempt++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error;
        
        // Categorize error
        const deFiError = this.categorizeError(error, protocol, action);
        
        // Check if this error type is retryable
        if (!retryOptions.retryableErrorTypes?.includes(deFiError.type)) {
          throw deFiError;
        }
        
        // Log retry attempt
        console.warn(`Retry attempt ${attempt + 1}/${retryOptions.maxRetries} for ${protocol || 'unknown'} ${action || 'operation'} failed:`, deFiError.message);
        
        // Last attempt failed, throw the error
        if (attempt === retryOptions.maxRetries - 1) {
          throw deFiError;
        }
        
        // Calculate delay with exponential backoff
        const delay = Math.min(
          retryOptions.initialDelay * Math.pow(retryOptions.backoffFactor, attempt),
          retryOptions.maxDelay || Infinity
        );
        
        // Wait before next attempt
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    
    // This should never happen due to the throw in the loop, but TypeScript needs it
    throw this.categorizeError(lastError, protocol, action);
  }
  
  // Categorize errors based on common patterns
  private categorizeError(error: any, protocol?: string, action?: string): DeFiError {
    let type = DeFiErrorType.UNKNOWN_ERROR;
    let message = 'An unknown error occurred';
    let isRecoverable = false;
    let details: any = undefined;
    
    // Handle Axios errors (API errors)
    if (axios.isAxiosError(error)) {
      type = DeFiErrorType.API_ERROR;
      message = error.message || 'API request failed';
      isRecoverable = error.code !== '404'; // Most network errors are recoverable
      details = {
        status: error.response?.status,
        statusText: error.response?.statusText,
        url: error.config?.url,
        method: error.config?.method
      };
    } 
    // Handle ethers.js errors (blockchain transaction errors)
    else if (error instanceof ethers.errors.TransactionError) {
      type = DeFiErrorType.TRANSACTION_ERROR;
      message = error.message || 'Transaction failed';
      isRecoverable = false;
      details = {
        transaction: error.transaction,
        receipt: error.receipt
      };
    }
    // Handle user rejection
    else if (
      error.code === 4001 || // MetaMask user denied
      error.message?.includes('User denied') ||
      error.message?.includes('user rejected')
    ) {
      type = DeFiErrorType.USER_REJECTED;
      message = 'Transaction was rejected by the user';
      isRecoverable = false;
    }
    // Handle insufficient funds
    else if (
      error.message?.includes('insufficient funds') ||
      error.message?.includes('exceeds balance')
    ) {
      type = DeFiErrorType.INSUFFICIENT_FUNDS;
      message = 'Insufficient funds for transaction';
      isRecoverable = false;
    }
    // Handle slippage errors
    else if (
      error.message?.includes('slippage') ||
      error.message?.includes('INSUFFICIENT_OUTPUT_AMOUNT')
    ) {
      type = DeFiErrorType.SLIPPAGE_ERROR;
      message = 'Transaction failed due to price movement exceeding slippage tolerance';
      isRecoverable = true;
    }
    // Handle price impact errors
    else if (error.message?.includes('price impact too high')) {
      type = DeFiErrorType.PRICE_IMPACT_ERROR;
      message = 'Transaction failed due to high price impact';
      isRecoverable = false;
    }
    // Handle network errors
    else if (
      error.message?.includes('network') ||
      error.message?.includes('connection') ||
      error.message?.includes('timeout') ||
      error.code === 'ETIMEDOUT' ||
      error.code === 'ECONNRESET'
    ) {
      type = DeFiErrorType.NETWORK_ERROR;
      message = 'Network error, please check your connection';
      isRecoverable = true;
    }
    // Handle smart contract errors
    else if (
      error.message?.includes('execution reverted') ||
      error.message?.includes('call exception')
    ) {
      type = DeFiErrorType.CONTRACT_ERROR;
      message = 'Smart contract execution failed';
      // Extract reason if available
      const reasonMatch = error.message?.match(/reason="([^"]+)"/);
      if (reasonMatch && reasonMatch[1]) {
        message += `: ${reasonMatch[1]}`;
      }
      isRecoverable = false;
    }
    // Generic error handling
    else if (error instanceof Error) {
      message = error.message;
    } else if (typeof error === 'string') {
      message = error;
    }
    
    return {
      type,
      message,
      details,
      originalError: error,
      isRecoverable,
      protocol,
      action
    };
  }
}

// Example usage:
// 
// const errorHandler = ErrorHandler.getInstance();
// 
// // Register error callback
// errorHandler.registerErrorCallback((error) => {
//   console.error(`Error occurred: ${error.type} - ${error.message}`);
//   
//   // Send to analytics or logging service
//   analytics.trackError(error);
// });
// 
// // Use with retry mechanism
// try {
//   const result = await errorHandler.retryWithBackoff(
//     async () => await gmxConnector.executeAction(ProtocolAction.SWAP, params),
//     { maxRetries: 5 },
//     "GMX",
//     "SWAP"
//   );
//   console.log('Success:', result);
// } catch (error) {
//   console.error('Operation failed after retries:', error);
// } 