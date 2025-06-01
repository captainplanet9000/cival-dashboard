/**
 * Execution Engine Service
 * 
 * This service manages the execution strategies for trading orders, including:
 * - Smart order routing
 * - TWAP/VWAP execution
 * - Iceberg orders
 * - Custom execution algorithms
 */

import { createServerClient } from '@/utils/supabase/server';
import { createBrowserClient } from '@/utils/supabase/client';
import { orderManagementService, OrderRequest, Order, OrderStatus } from './order-management-service';
import { marketDataService } from '@/utils/exchange/market-data-service';

export type ExecutionStrategyType = 'basic' | 'twap' | 'vwap' | 'iceberg' | 'smart';

export interface ExecutionStrategy {
  id: number;
  name: string;
  user_id: string;
  description?: string;
  strategy_type: ExecutionStrategyType;
  parameters: Record<string, any>;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ExecutionConfig {
  strategyType: ExecutionStrategyType;
  parameters: TwapParameters | VwapParameters | IcebergParameters | SmartParameters;
}

export interface TwapParameters {
  durationMinutes: number;
  slices: number;
  maxSlippage?: number;
  randomize?: boolean;
}

export interface VwapParameters {
  durationMinutes: number;
  volumeProfile: number[];
  maxSlippage?: number;
}

export interface IcebergParameters {
  visibleSize: number;
  variance?: number;
  maxSlippage?: number;
}

export interface SmartParameters {
  aggressiveness: number; // 1-10, higher is more aggressive
  maxSlippage?: number;
  adaptiveSpeed?: boolean;
  minTradeSize?: number;
}

export interface ExecutionJob {
  id: string;
  userId: string;
  strategyId: number;
  orderRequests: OrderRequest[];
  orders: Order[];
  status: 'pending' | 'active' | 'completed' | 'failed' | 'cancelled';
  progress: number; // 0-100
  startTime: Date;
  endTime?: Date;
  error?: string;
}

class ExecutionEngineService {
  private static instance: ExecutionEngineService;
  private activeExecutions: Map<string, ExecutionJob> = new Map();
  private executionIntervals: Map<string, NodeJS.Timeout> = new Map();

  private constructor() {
    // Private constructor to enforce singleton pattern
  }

  /**
   * Get singleton instance of ExecutionEngineService
   */
  public static getInstance(): ExecutionEngineService {
    if (!ExecutionEngineService.instance) {
      ExecutionEngineService.instance = new ExecutionEngineService();
    }
    return ExecutionEngineService.instance;
  }

  /**
   * Create a new execution strategy
   * @param strategy Strategy to create
   * @param userId User ID (for server-side use)
   * @returns Created strategy
   */
  public async createStrategy(
    strategy: Omit<ExecutionStrategy, 'id' | 'user_id' | 'created_at' | 'updated_at'>, 
    userId?: string
  ): Promise<ExecutionStrategy> {
    try {
      const supabase = userId ? await createServerClient() : createBrowserClient();
      
      const { data: createdStrategy, error } = await supabase
        .from('execution_strategies')
        .insert({
          name: strategy.name,
          user_id: userId || (await supabase.auth.getUser()).data.user?.id,
          description: strategy.description,
          strategy_type: strategy.strategy_type,
          parameters: strategy.parameters,
          is_active: strategy.is_active
        })
        .select()
        .single();
      
      if (error) {
        throw new Error(`Failed to create strategy: ${error.message}`);
      }

      return createdStrategy;
    } catch (error: any) {
      throw new Error(`Failed to create execution strategy: ${error.message}`);
    }
  }

  /**
   * Get all execution strategies for a user
   * @param userId User ID (for server-side use)
   * @returns List of strategies
   */
  public async getStrategies(userId?: string): Promise<ExecutionStrategy[]> {
    try {
      const supabase = userId ? await createServerClient() : createBrowserClient();
      
      const { data: strategies, error } = await supabase
        .from('execution_strategies')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) {
        throw new Error(`Failed to get strategies: ${error.message}`);
      }

      return strategies || [];
    } catch (error: any) {
      throw new Error(`Failed to get execution strategies: ${error.message}`);
    }
  }

  /**
   * Get a specific execution strategy
   * @param strategyId Strategy ID
   * @param userId User ID (for server-side use)
   * @returns Strategy details
   */
  public async getStrategy(strategyId: number, userId?: string): Promise<ExecutionStrategy> {
    try {
      const supabase = userId ? await createServerClient() : createBrowserClient();
      
      const { data: strategy, error } = await supabase
        .from('execution_strategies')
        .select('*')
        .eq('id', strategyId)
        .single();
      
      if (error || !strategy) {
        throw new Error(`Strategy not found: ${error?.message || 'Not found'}`);
      }

      return strategy;
    } catch (error: any) {
      throw new Error(`Failed to get execution strategy: ${error.message}`);
    }
  }

  /**
   * Update an execution strategy
   * @param strategyId Strategy ID
   * @param updates Updates to apply
   * @param userId User ID (for server-side use)
   * @returns Updated strategy
   */
  public async updateStrategy(
    strategyId: number, 
    updates: Partial<Omit<ExecutionStrategy, 'id' | 'user_id' | 'created_at' | 'updated_at'>>,
    userId?: string
  ): Promise<ExecutionStrategy> {
    try {
      const supabase = userId ? await createServerClient() : createBrowserClient();
      
      const { data: updatedStrategy, error } = await supabase
        .from('execution_strategies')
        .update(updates)
        .eq('id', strategyId)
        .select()
        .single();
      
      if (error) {
        throw new Error(`Failed to update strategy: ${error.message}`);
      }

      return updatedStrategy;
    } catch (error: any) {
      throw new Error(`Failed to update execution strategy: ${error.message}`);
    }
  }

  /**
   * Delete an execution strategy
   * @param strategyId Strategy ID
   * @param userId User ID (for server-side use)
   * @returns Success status
   */
  public async deleteStrategy(strategyId: number, userId?: string): Promise<boolean> {
    try {
      const supabase = userId ? await createServerClient() : createBrowserClient();
      
      const { error } = await supabase
        .from('execution_strategies')
        .delete()
        .eq('id', strategyId);
      
      if (error) {
        throw new Error(`Failed to delete strategy: ${error.message}`);
      }

      return true;
    } catch (error: any) {
      throw new Error(`Failed to delete execution strategy: ${error.message}`);
    }
  }

  /**
   * Execute an order using a specific strategy
   * @param orderRequest Order to execute
   * @param executionConfig Execution strategy configuration
   * @param userId User ID (for server-side use)
   * @returns Execution job
   */
  public async executeOrder(
    orderRequest: OrderRequest,
    executionConfig: ExecutionConfig,
    userId?: string
  ): Promise<ExecutionJob> {
    try {
      // Create a unique job ID
      const jobId = `exec_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
      
      // Get the current user ID
      const supabase = userId ? await createServerClient() : createBrowserClient();
      const currentUserId = userId || (await supabase.auth.getUser()).data.user?.id;
      
      if (!currentUserId) {
        throw new Error('User not authenticated');
      }

      // Create the execution job
      const job: ExecutionJob = {
        id: jobId,
        userId: currentUserId,
        strategyId: 0, // Will be set if using a saved strategy
        orderRequests: [orderRequest],
        orders: [],
        status: 'pending',
        progress: 0,
        startTime: new Date()
      };

      // If a saved strategy was provided, set the strategyId
      if (typeof executionConfig === 'number') {
        const strategy = await this.getStrategy(executionConfig, userId);
        job.strategyId = strategy.id;
        executionConfig = {
          strategyType: strategy.strategy_type as ExecutionStrategyType,
          parameters: strategy.parameters
        };
      }

      // Store the job in the active executions map
      this.activeExecutions.set(jobId, job);

      // Start the execution based on the strategy
      switch (executionConfig.strategyType) {
        case 'basic':
          await this.executeBasicOrder(jobId, orderRequest, userId);
          break;
        case 'twap':
          this.executeTwapOrder(jobId, orderRequest, executionConfig.parameters as TwapParameters, userId);
          break;
        case 'vwap':
          this.executeVwapOrder(jobId, orderRequest, executionConfig.parameters as VwapParameters, userId);
          break;
        case 'iceberg':
          this.executeIcebergOrder(jobId, orderRequest, executionConfig.parameters as IcebergParameters, userId);
          break;
        case 'smart':
          this.executeSmartOrder(jobId, orderRequest, executionConfig.parameters as SmartParameters, userId);
          break;
        default:
          throw new Error(`Unsupported execution strategy: ${executionConfig.strategyType}`);
      }

      return job;
    } catch (error: any) {
      throw new Error(`Failed to execute order: ${error.message}`);
    }
  }

  /**
   * Get the status of an execution job
   * @param jobId Job ID
   * @returns Execution job details
   */
  public getExecutionStatus(jobId: string): ExecutionJob | undefined {
    return this.activeExecutions.get(jobId);
  }

  /**
   * Cancel an executing job
   * @param jobId Job ID
   * @returns Success status
   */
  public async cancelExecution(jobId: string): Promise<boolean> {
    const job = this.activeExecutions.get(jobId);
    if (!job) {
      throw new Error(`Execution job not found: ${jobId}`);
    }

    // Clear the interval if there is one
    if (this.executionIntervals.has(jobId)) {
      clearInterval(this.executionIntervals.get(jobId));
      this.executionIntervals.delete(jobId);
    }

    // Cancel any open orders
    const cancelPromises = job.orders
      .filter(order => !['filled', 'canceled', 'rejected', 'expired'].includes(order.status))
      .map(order => orderManagementService.cancelOrder(order.id));
    
    await Promise.allSettled(cancelPromises);

    // Update the job status
    job.status = 'cancelled';
    job.endTime = new Date();
    
    return true;
  }

  /**
   * Execute a basic order (simple market or limit)
   * @param jobId Execution job ID
   * @param orderRequest Order request
   * @param userId User ID (for server-side use)
   * @returns Created order
   */
  private async executeBasicOrder(
    jobId: string,
    orderRequest: OrderRequest,
    userId?: string
  ): Promise<Order> {
    const job = this.activeExecutions.get(jobId);
    if (!job) {
      throw new Error(`Execution job not found: ${jobId}`);
    }

    try {
      job.status = 'active';
      
      // Create the order
      const order = await orderManagementService.createOrder(orderRequest, userId);
      
      // Update the job
      job.orders.push(order);
      job.progress = 100;
      job.status = 'completed';
      job.endTime = new Date();
      
      return order;
    } catch (error: any) {
      job.status = 'failed';
      job.error = error.message;
      job.endTime = new Date();
      throw error;
    }
  }

  /**
   * Execute a TWAP (Time-Weighted Average Price) order
   * @param jobId Execution job ID
   * @param orderRequest Order request
   * @param parameters TWAP parameters
   * @param userId User ID (for server-side use)
   */
  private executeTwapOrder(
    jobId: string,
    orderRequest: OrderRequest,
    parameters: TwapParameters,
    userId?: string
  ): void {
    const job = this.activeExecutions.get(jobId);
    if (!job) {
      throw new Error(`Execution job not found: ${jobId}`);
    }

    job.status = 'active';

    // Calculate the slice size and time interval
    const totalQuantity = orderRequest.quantity;
    const sliceSize = totalQuantity / parameters.slices;
    const intervalMs = (parameters.durationMinutes * 60 * 1000) / parameters.slices;
    
    // Keep track of executed quantity and slices
    let executedSlices = 0;
    let remainingQuantity = totalQuantity;

    // Start the execution
    const intervalId = setInterval(async () => {
      try {
        // Check if we should cancel the execution
        if (job.status === 'cancelled' || job.status === 'failed') {
          clearInterval(intervalId);
          return;
        }

        // Calculate the current slice size
        let currentSliceSize = sliceSize;
        
        // Add randomization if enabled
        if (parameters.randomize) {
          const randomFactor = 0.5 + Math.random(); // 0.5 to 1.5
          currentSliceSize = Math.min(remainingQuantity, sliceSize * randomFactor);
        }
        
        // Ensure we don't exceed the total quantity
        currentSliceSize = Math.min(currentSliceSize, remainingQuantity);
        
        // Round to appropriate precision
        currentSliceSize = parseFloat(currentSliceSize.toFixed(8));
        
        // If the slice size is too small, use the remaining quantity
        if (currentSliceSize < 0.00001 || remainingQuantity - currentSliceSize < 0.00001) {
          currentSliceSize = remainingQuantity;
        }

        // Skip if slice size is effectively zero
        if (currentSliceSize <= 0) {
          executedSlices++;
          job.progress = Math.min(100, Math.floor((executedSlices / parameters.slices) * 100));
          
          // Check if we're done
          if (executedSlices >= parameters.slices || remainingQuantity <= 0) {
            clearInterval(intervalId);
            job.status = 'completed';
            job.progress = 100;
            job.endTime = new Date();
          }
          return;
        }

        // Create a child order for this slice
        const childOrderRequest: OrderRequest = {
          ...orderRequest,
          quantity: currentSliceSize,
          clientOrderId: `${orderRequest.clientOrderId || ''}_twap_${executedSlices}`
        };

        // Place the order
        const order = await orderManagementService.createOrder(childOrderRequest, userId);
        
        // Update the job
        job.orders.push(order);
        remainingQuantity -= currentSliceSize;
        executedSlices++;
        job.progress = Math.min(100, Math.floor((executedSlices / parameters.slices) * 100));
        
        // Check if we're done
        if (executedSlices >= parameters.slices || remainingQuantity <= 0) {
          clearInterval(intervalId);
          job.status = 'completed';
          job.progress = 100;
          job.endTime = new Date();
        }
      } catch (error: any) {
        console.error('TWAP execution error:', error);
        job.error = error.message;
        
        // Don't fail the whole job if one slice fails, continue with next slice
        if (job.status !== 'cancelled') {
          job.status = 'active'; // Keep it active to process remaining slices
        }
      }
    }, intervalMs);

    // Store the interval ID for cancellation
    this.executionIntervals.set(jobId, intervalId);
  }

  /**
   * Execute a VWAP (Volume-Weighted Average Price) order
   * @param jobId Execution job ID
   * @param orderRequest Order request
   * @param parameters VWAP parameters
   * @param userId User ID (for server-side use)
   */
  private executeVwapOrder(
    jobId: string,
    orderRequest: OrderRequest,
    parameters: VwapParameters,
    userId?: string
  ): void {
    const job = this.activeExecutions.get(jobId);
    if (!job) {
      throw new Error(`Execution job not found: ${jobId}`);
    }

    job.status = 'active';

    // Calculate the time interval
    const totalQuantity = orderRequest.quantity;
    const intervalMs = (parameters.durationMinutes * 60 * 1000) / parameters.volumeProfile.length;
    
    // Normalize volume profile to ensure it sums to 1
    const volumeProfileSum = parameters.volumeProfile.reduce((sum, val) => sum + val, 0);
    const normalizedProfile = parameters.volumeProfile.map(val => val / volumeProfileSum);
    
    // Keep track of executed quantity and slices
    let executedSlices = 0;
    let remainingQuantity = totalQuantity;

    // Start the execution
    const intervalId = setInterval(async () => {
      try {
        // Check if we should cancel the execution
        if (job.status === 'cancelled' || job.status === 'failed') {
          clearInterval(intervalId);
          return;
        }

        // Calculate the current slice size based on volume profile
        const currentVolumeRatio = normalizedProfile[executedSlices];
        let currentSliceSize = totalQuantity * currentVolumeRatio;
        
        // Ensure we don't exceed the remaining quantity
        currentSliceSize = Math.min(currentSliceSize, remainingQuantity);
        
        // Round to appropriate precision
        currentSliceSize = parseFloat(currentSliceSize.toFixed(8));
        
        // If the slice size is too small, use the remaining quantity
        if (currentSliceSize < 0.00001 || remainingQuantity - currentSliceSize < 0.00001) {
          currentSliceSize = remainingQuantity;
        }

        // Skip if slice size is effectively zero
        if (currentSliceSize <= 0) {
          executedSlices++;
          job.progress = Math.min(100, Math.floor((executedSlices / normalizedProfile.length) * 100));
          
          // Check if we're done
          if (executedSlices >= normalizedProfile.length || remainingQuantity <= 0) {
            clearInterval(intervalId);
            job.status = 'completed';
            job.progress = 100;
            job.endTime = new Date();
          }
          return;
        }

        // Create a child order for this slice
        const childOrderRequest: OrderRequest = {
          ...orderRequest,
          quantity: currentSliceSize,
          clientOrderId: `${orderRequest.clientOrderId || ''}_vwap_${executedSlices}`
        };

        // Place the order
        const order = await orderManagementService.createOrder(childOrderRequest, userId);
        
        // Update the job
        job.orders.push(order);
        remainingQuantity -= currentSliceSize;
        executedSlices++;
        job.progress = Math.min(100, Math.floor((executedSlices / normalizedProfile.length) * 100));
        
        // Check if we're done
        if (executedSlices >= normalizedProfile.length || remainingQuantity <= 0) {
          clearInterval(intervalId);
          job.status = 'completed';
          job.progress = 100;
          job.endTime = new Date();
        }
      } catch (error: any) {
        console.error('VWAP execution error:', error);
        job.error = error.message;
        
        // Don't fail the whole job if one slice fails, continue with next slice
        if (job.status !== 'cancelled') {
          job.status = 'active'; // Keep it active to process remaining slices
        }
      }
    }, intervalMs);

    // Store the interval ID for cancellation
    this.executionIntervals.set(jobId, intervalId);
  }

  /**
   * Execute an Iceberg order (hiding true order size)
   * @param jobId Execution job ID
   * @param orderRequest Order request
   * @param parameters Iceberg parameters
   * @param userId User ID (for server-side use)
   */
  private executeIcebergOrder(
    jobId: string,
    orderRequest: OrderRequest,
    parameters: IcebergParameters,
    userId?: string
  ): void {
    const job = this.activeExecutions.get(jobId);
    if (!job) {
      throw new Error(`Execution job not found: ${jobId}`);
    }

    job.status = 'active';

    // We can only execute iceberg orders as limit orders
    if (orderRequest.type !== 'limit' || !orderRequest.price) {
      job.status = 'failed';
      job.error = 'Iceberg execution strategy requires a limit order with a price';
      return;
    }

    // Calculate parameters
    const totalQuantity = orderRequest.quantity;
    let remainingQuantity = totalQuantity;
    let executedQuantity = 0;
    let activeOrderId: number | null = null;
    let orderCount = 0;

    // Start the execution loop
    const checkAndPlaceOrders = async () => {
      try {
        // Check if we should cancel the execution
        if (job.status === 'cancelled' || job.status === 'failed') {
          return;
        }

        // If there's an active order, check its status
        if (activeOrderId !== null) {
          const activeOrder = await orderManagementService.checkOrderStatus(activeOrderId, userId);
          
          // If the order is filled or cancelled, update quantities
          if (['filled', 'canceled', 'rejected', 'expired'].includes(activeOrder.status)) {
            executedQuantity += activeOrder.executed_quantity;
            remainingQuantity -= activeOrder.executed_quantity;
            activeOrderId = null;
          } else {
            // Order is still active, check again later
            setTimeout(checkAndPlaceOrders, 5000);
            return;
          }
        }

        // If we've filled the total quantity or there's no remaining quantity, we're done
        if (remainingQuantity <= 0 || executedQuantity >= totalQuantity) {
          job.status = 'completed';
          job.progress = 100;
          job.endTime = new Date();
          return;
        }

        // Place a new visible order
        let visibleSize = parameters.visibleSize;
        
        // Add variance if specified
        if (parameters.variance) {
          const varianceFactor = 1 + (Math.random() * 2 - 1) * parameters.variance;
          visibleSize = Math.max(0.00001, visibleSize * varianceFactor);
        }
        
        // Ensure we don't exceed remaining quantity
        visibleSize = Math.min(visibleSize, remainingQuantity);
        
        // Round to appropriate precision
        visibleSize = parseFloat(visibleSize.toFixed(8));

        // Create a new order for the visible portion
        const childOrderRequest: OrderRequest = {
          ...orderRequest,
          quantity: visibleSize,
          clientOrderId: `${orderRequest.clientOrderId || ''}_iceberg_${orderCount}`
        };

        // Place the order
        const order = await orderManagementService.createOrder(childOrderRequest, userId);
        orderCount++;
        
        // Update the job
        job.orders.push(order);
        activeOrderId = order.id;
        job.progress = Math.min(100, Math.floor((executedQuantity / totalQuantity) * 100));
        
        // Schedule next check
        setTimeout(checkAndPlaceOrders, 5000);
      } catch (error: any) {
        console.error('Iceberg execution error:', error);
        job.error = error.message;
        
        // Retry in case of error
        if (job.status !== 'cancelled') {
          setTimeout(checkAndPlaceOrders, 10000);
        }
      }
    };

    // Start the execution
    checkAndPlaceOrders();
  }

  /**
   * Execute a Smart order (adaptive to market conditions)
   * @param jobId Execution job ID
   * @param orderRequest Order request
   * @param parameters Smart parameters
   * @param userId User ID (for server-side use)
   */
  private executeSmartOrder(
    jobId: string,
    orderRequest: OrderRequest,
    parameters: SmartParameters,
    userId?: string
  ): void {
    const job = this.activeExecutions.get(jobId);
    if (!job) {
      throw new Error(`Execution job not found: ${jobId}`);
    }

    job.status = 'active';

    // Calculate parameters based on aggressiveness
    const aggressiveness = Math.max(1, Math.min(10, parameters.aggressiveness)); // 1-10 scale
    const totalQuantity = orderRequest.quantity;
    let remainingQuantity = totalQuantity;
    let executedQuantity = 0;
    let orderCount = 0;
    
    // Calculate base parameters based on aggressiveness
    const maxSlices = 11 - aggressiveness; // More aggressive = fewer slices
    const baseTradeSize = totalQuantity / maxSlices;
    const minTradeSize = parameters.minTradeSize || baseTradeSize * 0.1;
    const checkIntervalMs = 2000 + (1000 * (11 - aggressiveness)); // More aggressive = more frequent checks

    // Start execution
    const executeSmartStep = async () => {
      try {
        // Check if we should cancel the execution
        if (job.status === 'cancelled' || job.status === 'failed') {
          return;
        }

        // If we've filled the total quantity, we're done
        if (remainingQuantity <= 0 || executedQuantity >= totalQuantity) {
          job.status = 'completed';
          job.progress = 100;
          job.endTime = new Date();
          return;
        }

        // Analyze market conditions to determine trade size
        let tradeSize = baseTradeSize;
        
        // Get current market data if available
        try {
          const marketData = await marketDataService.getMarketData(orderRequest.symbol);
          if (marketData && marketData.length > 0) {
            // Adjust trade size based on price volatility
            const data = marketData[0];
            const priceRange = (data.high_24h - data.low_24h) / data.last_price;
            
            // More volatile = smaller trades if adaptive speed is enabled
            if (parameters.adaptiveSpeed) {
              if (priceRange > 0.05) { // High volatility
                tradeSize = baseTradeSize * 0.5;
              } else if (priceRange < 0.01) { // Low volatility
                tradeSize = baseTradeSize * 1.5;
              }
            }
            
            // For buys, be more aggressive when price is dropping
            // For sells, be more aggressive when price is rising
            if (orderRequest.side === 'buy' && data.price_change_percent < 0) {
              tradeSize *= 1 + (Math.abs(data.price_change_percent) / 100);
            } else if (orderRequest.side === 'sell' && data.price_change_percent > 0) {
              tradeSize *= 1 + (data.price_change_percent / 100);
            }
          }
        } catch (error) {
          // If market data is unavailable, proceed with base trade size
          console.warn('Market data unavailable for smart execution:', error);
        }
        
        // Apply aggressiveness multiplier
        tradeSize *= (0.5 + (aggressiveness / 10) * 1.5);
        
        // Ensure minimum trade size
        tradeSize = Math.max(minTradeSize, tradeSize);
        
        // Ensure we don't exceed remaining quantity
        tradeSize = Math.min(tradeSize, remainingQuantity);
        
        // Round to appropriate precision
        tradeSize = parseFloat(tradeSize.toFixed(8));

        // Create a new order
        const childOrderRequest: OrderRequest = {
          ...orderRequest,
          quantity: tradeSize,
          clientOrderId: `${orderRequest.clientOrderId || ''}_smart_${orderCount}`
        };

        // Place the order
        const order = await orderManagementService.createOrder(childOrderRequest, userId);
        orderCount++;
        
        // Update the job
        job.orders.push(order);
        remainingQuantity -= tradeSize;
        executedQuantity += tradeSize;
        job.progress = Math.min(100, Math.floor((executedQuantity / totalQuantity) * 100));
        
        // Schedule next trade
        setTimeout(executeSmartStep, checkIntervalMs);
      } catch (error: any) {
        console.error('Smart execution error:', error);
        job.error = error.message;
        
        // Retry in case of error
        if (job.status !== 'cancelled') {
          setTimeout(executeSmartStep, checkIntervalMs * 2);
        }
      }
    };

    // Start the execution
    executeSmartStep();
  }
}

// Export singleton instance
export const executionEngineService = ExecutionEngineService.getInstance();
