/**
 * ErrorSimulator
 * 
 * Simulates realistic exchange errors based on configured models for dry-run testing.
 * This helps agents develop robust error handling by experiencing errors in a safe environment.
 */
import { ErrorModel } from '../simulation-service';
import { ExchangeErrorType, ExchangeError } from '../exchange-service';

export interface OperationContext {
  exchange: string;
  operation: 'placeOrder' | 'cancelOrder' | 'getMarketData' | 'getOrderStatus' | 'getLatestPrice' | string;
  symbol?: string;
  retryCount?: number;
  requestParams?: any;
}

export class ErrorSimulator {
  /**
   * Determine if an error should be simulated for the current operation
   * 
   * @param context Operation context
   * @param model Error simulation model
   * @returns Error object if an error should be simulated, null otherwise
   */
  static simulateError(
    context: OperationContext,
    model: ErrorModel
  ): ExchangeError | null {
    // If error model is set to 'none', don't simulate any errors
    if (model.parameters.type === 'none') {
      return null;
    }
    
    // If retry count is too high, don't keep simulating errors
    // This prevents infinite error loops
    if (context.retryCount && context.retryCount > 3) {
      return null;
    }
    
    if (model.parameters.type === 'random') {
      return this.simulateRandomError(context, model.parameters);
    } else if (model.parameters.type === 'targeted') {
      return this.simulateTargetedError(context, model.parameters);
    }
    
    return null;
  }
  
  /**
   * Simulate random errors based on configured probabilities
   */
  private static simulateRandomError(
    context: OperationContext,
    parameters: any
  ): ExchangeError | null {
    const random = Math.random();
    
    // Network errors (connection timeouts, etc.)
    if (random < (parameters.networkErrorRate || 0.01)) {
      return new ExchangeError('Simulated network error: Connection timed out', {
        type: ExchangeErrorType.NETWORK_ERROR,
        exchange: context.exchange,
        isRetryable: true,
        context
      });
    }
    
    // Rate limit errors
    if (random < (parameters.rateLimitErrorRate || 0.005) + (parameters.networkErrorRate || 0.01)) {
      return new ExchangeError('Simulated rate limit error: Too many requests', {
        type: ExchangeErrorType.RATE_LIMIT,
        exchange: context.exchange,
        isRetryable: true,
        httpStatus: 429,
        context
      });
    }
    
    // For order placement, we can simulate insufficient funds
    if (context.operation === 'placeOrder' && random < (parameters.insufficientFundsRate || 0.01) + (parameters.rateLimitErrorRate || 0.005) + (parameters.networkErrorRate || 0.01)) {
      return new ExchangeError('Simulated error: Insufficient funds for this order', {
        type: ExchangeErrorType.INSUFFICIENT_FUNDS,
        exchange: context.exchange,
        isRetryable: false,
        context
      });
    }
    
    // Exchange maintenance (less common)
    if (random < 0.001 + (parameters.insufficientFundsRate || 0.01) + (parameters.rateLimitErrorRate || 0.005) + (parameters.networkErrorRate || 0.01)) {
      return new ExchangeError('Simulated exchange maintenance: Service temporarily unavailable', {
        type: ExchangeErrorType.EXCHANGE_MAINTENANCE,
        exchange: context.exchange,
        isRetryable: true,
        httpStatus: 503,
        context
      });
    }
    
    return null;
  }
  
  /**
   * Simulate specific errors for testing targeted scenarios
   */
  private static simulateTargetedError(
    context: OperationContext,
    parameters: any
  ): ExchangeError | null {
    // This mode is designed to test specific error handling
    // based on the configured targets
    
    if (!parameters.targets) {
      return null;
    }
    
    // Check if this operation is targeted
    const target = parameters.targets.find((t: any) => 
      t.operation === context.operation && 
      (!t.symbol || t.symbol === context.symbol)
    );
    
    if (target) {
      return new ExchangeError(`Simulated targeted error: ${target.errorMessage || 'Error for testing'}`, {
        type: target.errorType || ExchangeErrorType.UNKNOWN_ERROR,
        exchange: context.exchange,
        isRetryable: target.isRetryable !== undefined ? target.isRetryable : true,
        httpStatus: target.httpStatus,
        context
      });
    }
    
    return null;
  }
  
  /**
   * Get default error model for simulations
   */
  static getDefaultErrorModel(): ErrorModel {
    return {
      id: 'default-errors',
      userId: '00000000-0000-0000-0000-000000000000',
      name: 'Realistic Errors',
      modelType: 'error',
      isSystemModel: true,
      parameters: {
        type: 'random',
        networkErrorRate: 0.01,       // 1% chance of network error
        rateLimitErrorRate: 0.005,    // 0.5% chance of rate limit
        insufficientFundsRate: 0.01,  // 1% chance of insufficient funds
        description: 'Realistic random errors with configurable rates'
      },
      createdAt: new Date().toISOString()
    };
  }
  
  /**
   * Create a targeted error model for specific testing scenarios
   */
  static createTargetedErrorModel(targets: Array<{
    operation: string;
    symbol?: string;
    errorType: ExchangeErrorType;
    errorMessage?: string;
    isRetryable?: boolean;
    httpStatus?: number;
  }>): ErrorModel {
    return {
      id: 'targeted-errors',
      userId: '00000000-0000-0000-0000-000000000000',
      name: 'Targeted Error Testing',
      modelType: 'error',
      isSystemModel: false,
      parameters: {
        type: 'targeted',
        targets,
        description: 'Specific errors for targeted testing scenarios'
      },
      createdAt: new Date().toISOString()
    };
  }
}
