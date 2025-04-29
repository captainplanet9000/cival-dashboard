/**
 * Web Worker Factory for offloading CPU-intensive operations
 * Improves UI responsiveness by moving heavy calculations to background threads
 */

// Define the shape of the worker message payload
export interface WorkerMessage<T> {
  /** Unique ID to track the message */
  id: string;
  /** Type of operation to perform */
  type: string;
  /** Data required for the operation */
  payload: T;
}

// Define the shape of the worker response
export interface WorkerResponse<T> {
  /** ID that matches the original request */
  id: string;
  /** Type of operation that was performed */
  type: string;
  /** Resulting data from the operation */
  result: T;
  /** Error information if the operation failed */
  error?: string;
  /** Performance metrics */
  performance?: {
    /** Duration in milliseconds */
    duration: number;
    /** Memory usage in bytes (if available) */
    memory?: number;
  };
}

// Type for Worker Task Handler Functions
type WorkerTaskHandler<T, R> = (data: T) => R | Promise<R>;

/**
 * Creates a dedicated worker with registered task handlers
 * @param workerPath Path to the worker script
 * @returns Worker interface for sending tasks
 */
export function createDedicatedWorker(workerPath: string) {
  // Create the worker
  const worker = new Worker(new URL(workerPath, import.meta.url));
  
  // Track pending tasks with a Map of task IDs to their resolve/reject functions
  const tasks = new Map<string, {
    resolve: (value: any) => void;
    reject: (reason: any) => void;
    startTime: number;
  }>();
  
  // Set up message handling from the worker
  worker.onmessage = (event: MessageEvent<WorkerResponse<any>>) => {
    const { id, result, error, performance } = event.data;
    
    // Find the pending task
    const task = tasks.get(id);
    if (!task) {
      console.warn(`[WorkerFactory] Received response for unknown task ID: ${id}`);
      return;
    }
    
    // Calculate performance if not provided
    const duration = performance?.duration || (Date.now() - task.startTime);
    
    // Log performance data
    console.debug(`[Worker] Task ${id} completed in ${duration}ms`);
    
    // Resolve or reject the promise
    if (error) {
      task.reject(new Error(error));
    } else {
      task.resolve(result);
    }
    
    // Remove the task from the pending map
    tasks.delete(id);
  };
  
  // Handle worker errors
  worker.onerror = (error) => {
    console.error('[WorkerFactory] Worker error:', error);
    
    // Reject all pending tasks
    for (const [id, task] of tasks.entries()) {
      task.reject(new Error('Worker encountered an error'));
      tasks.delete(id);
    }
  };
  
  /**
   * Send a task to the worker
   * @param type Task type
   * @param payload Data for the task
   * @returns Promise that resolves with the task result
   */
  const sendTask = <T, R>(type: string, payload: T): Promise<R> => {
    return new Promise((resolve, reject) => {
      // Generate unique ID for this task
      const id = `task_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      
      // Store the promise callbacks
      tasks.set(id, {
        resolve,
        reject,
        startTime: Date.now()
      });
      
      // Send the message to the worker
      worker.postMessage({
        id,
        type,
        payload
      } as WorkerMessage<T>);
    });
  };
  
  /**
   * Terminate the worker
   */
  const terminate = () => {
    worker.terminate();
    
    // Reject all pending tasks
    for (const [id, task] of tasks.entries()) {
      task.reject(new Error('Worker was terminated'));
      tasks.delete(id);
    }
  };
  
  // Return the worker interface
  return {
    sendTask,
    terminate,
    worker
  };
}

/**
 * Create a worker script with registered task handlers
 * @param taskHandlers Object mapping task types to handler functions
 * @returns Worker script source code as a Blob URL
 */
export function createWorkerScript(taskHandlers: Record<string, WorkerTaskHandler<any, any>>): string {
  // Generate the worker script
  const script = `
    // Worker script
    self.onmessage = async function(event) {
      const { id, type, payload } = event.data;
      
      const startTime = performance.now();
      let result = null;
      let error = null;
      
      try {
        // Execute the appropriate handler based on type
        switch(type) {
          ${Object.keys(taskHandlers).map(type => `
            case '${type}':
              result = await ${taskHandlers[type].toString()}(payload);
              break;
          `).join('')}
          default:
            throw new Error('Unknown task type: ' + type);
        }
      } catch (err) {
        error = err.message || 'Unknown error in worker';
        console.error('[Worker]', error);
      }
      
      // Calculate performance metrics
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      // Report memory usage if available
      let memory = undefined;
      if (self.performance && self.performance.memory) {
        memory = self.performance.memory.usedJSHeapSize;
      }
      
      // Send response back to main thread
      self.postMessage({
        id,
        type,
        result,
        error,
        performance: {
          duration,
          memory
        }
      });
    };
    
    // Signal that the worker is ready
    self.postMessage({ type: 'ready' });
  `;
  
  return script;
}

/**
 * Create an inline worker without requiring a separate file
 * @param taskHandlers Object mapping task types to handler functions
 * @returns Worker interface for sending tasks
 */
export function createInlineWorker(taskHandlers: Record<string, WorkerTaskHandler<any, any>>) {
  // Generate the worker script
  const script = createWorkerScript(taskHandlers);
  
  // Create a blob URL for the script
  const blob = new Blob([script], { type: 'application/javascript' });
  const blobUrl = URL.createObjectURL(blob);
  
  // Create the worker
  const worker = createDedicatedWorker(blobUrl);
  
  // Clean up the blob URL when the worker is terminated
  const originalTerminate = worker.terminate;
  worker.terminate = () => {
    originalTerminate();
    URL.revokeObjectURL(blobUrl);
  };
  
  return worker;
}

/**
 * Create a pool of workers for distributing tasks
 * @param workerPath Path to the worker script
 * @param poolSize Number of workers in the pool
 * @returns Worker pool interface
 */
export function createWorkerPool(workerPath: string, poolSize = navigator.hardwareConcurrency || 4) {
  // Create the workers
  const workers = Array.from({ length: poolSize }, () => createDedicatedWorker(workerPath));
  
  // Track available workers
  const availableWorkers = [...workers];
  
  // Track tasks waiting for an available worker
  const waitingTasks: Array<{
    type: string;
    payload: any;
    resolve: (value: any) => void;
    reject: (reason: any) => void;
  }> = [];
  
  /**
   * Get an available worker from the pool
   * @returns Available worker or null if none available
   */
  const getAvailableWorker = () => {
    if (availableWorkers.length === 0) return null;
    return availableWorkers.shift()!;
  };
  
  /**
   * Return a worker to the pool
   * @param worker Worker to return to the pool
   */
  const releaseWorker = (worker: ReturnType<typeof createDedicatedWorker>) => {
    availableWorkers.push(worker);
    
    // Process any waiting tasks
    if (waitingTasks.length > 0) {
      const task = waitingTasks.shift()!;
      executeTask(task.type, task.payload, task.resolve, task.reject);
    }
  };
  
  /**
   * Execute a task on an available worker
   */
  const executeTask = <T, R>(
    type: string,
    payload: T,
    resolve: (value: R) => void,
    reject: (reason: any) => void
  ) => {
    const worker = getAvailableWorker();
    
    if (!worker) {
      // No workers available, queue the task
      waitingTasks.push({ type, payload, resolve, reject });
      return;
    }
    
    // Execute the task
    worker.sendTask<T, R>(type, payload)
      .then(result => {
        resolve(result);
        releaseWorker(worker);
      })
      .catch(error => {
        reject(error);
        releaseWorker(worker);
      });
  };
  
  /**
   * Send a task to an available worker in the pool
   */
  const sendTask = <T, R>(type: string, payload: T): Promise<R> => {
    return new Promise((resolve, reject) => {
      executeTask<T, R>(type, payload, resolve, reject);
    });
  };
  
  /**
   * Terminate all workers in the pool
   */
  const terminate = () => {
    // Terminate all workers
    workers.forEach(worker => worker.terminate());
    
    // Reject all waiting tasks
    waitingTasks.forEach(task => {
      task.reject(new Error('Worker pool was terminated'));
    });
    waitingTasks.length = 0;
  };
  
  // Return the worker pool interface
  return {
    sendTask,
    terminate,
    poolSize
  };
}

// Example task handlers for common operations
export const commonTasks = {
  /**
   * Calculate technical indicators for a set of price data
   */
  calculateIndicators: (data: {
    prices: number[];
    volume: number[];
    type: 'rsi' | 'macd' | 'bollinger' | 'all';
    period?: number;
  }) => {
    const { prices, volume, type, period = 14 } = data;
    
    // Helper function to calculate simple moving average
    const calculateSMA = (values: number[], period: number) => {
      const result = [];
      for (let i = period - 1; i < values.length; i++) {
        const slice = values.slice(i - period + 1, i + 1);
        const sum = slice.reduce((a, b) => a + b, 0);
        result.push(sum / period);
      }
      return result;
    };
    
    // Helper function to calculate RSI
    const calculateRSI = (prices: number[], period: number) => {
      const deltas = [];
      for (let i = 1; i < prices.length; i++) {
        deltas.push(prices[i] - prices[i - 1]);
      }
      
      const gains = deltas.map(d => d > 0 ? d : 0);
      const losses = deltas.map(d => d < 0 ? -d : 0);
      
      const avgGain = calculateSMA(gains, period);
      const avgLoss = calculateSMA(losses, period);
      
      const rs = avgGain.map((gain, i) => gain / (avgLoss[i] || 0.001));
      return rs.map(rs => 100 - (100 / (1 + rs)));
    };
    
    // Helper function to calculate MACD
    const calculateMACD = (prices: number[]) => {
      const ema12 = calculateEMA(prices, 12);
      const ema26 = calculateEMA(prices, 26);
      
      // Adjust lengths to match (EMA26 will be shorter)
      const adjustedEMA12 = ema12.slice(ema12.length - ema26.length);
      
      const macdLine = adjustedEMA12.map((ema12, i) => ema12 - ema26[i]);
      const signalLine = calculateEMA(macdLine, 9);
      
      // Adjust MACD line to match signal line length
      const adjustedMACDLine = macdLine.slice(macdLine.length - signalLine.length);
      
      const histogram = adjustedMACDLine.map((macd, i) => macd - signalLine[i]);
      
      return {
        macdLine: adjustedMACDLine,
        signalLine,
        histogram
      };
    };
    
    // Helper function to calculate EMA
    const calculateEMA = (values: number[], period: number) => {
      const k = 2 / (period + 1);
      const ema = [values[0]];
      
      for (let i = 1; i < values.length; i++) {
        ema.push(values[i] * k + ema[i - 1] * (1 - k));
      }
      
      return ema;
    };
    
    // Helper function to calculate Bollinger Bands
    const calculateBollingerBands = (prices: number[], period: number) => {
      const sma = calculateSMA(prices, period);
      
      // Calculate standard deviation
      const stdDev = [];
      for (let i = period - 1; i < prices.length; i++) {
        const slice = prices.slice(i - period + 1, i + 1);
        const avg = slice.reduce((a, b) => a + b, 0) / period;
        const squaredDiffs = slice.map(price => Math.pow(price - avg, 2));
        const variance = squaredDiffs.reduce((a, b) => a + b, 0) / period;
        stdDev.push(Math.sqrt(variance));
      }
      
      const upperBand = sma.map((sma, i) => sma + (2 * stdDev[i]));
      const lowerBand = sma.map((sma, i) => sma - (2 * stdDev[i]));
      
      return {
        middle: sma,
        upper: upperBand,
        lower: lowerBand
      };
    };
    
    // Calculate the requested indicators
    const result: any = {};
    
    if (type === 'rsi' || type === 'all') {
      result.rsi = calculateRSI(prices, period);
    }
    
    if (type === 'macd' || type === 'all') {
      result.macd = calculateMACD(prices);
    }
    
    if (type === 'bollinger' || type === 'all') {
      result.bollinger = calculateBollingerBands(prices, period);
    }
    
    return result;
  },
  
  /**
   * Perform portfolio optimization calculations
   */
  optimizePortfolio: (data: {
    assets: Array<{
      id: string;
      returns: number[];
      volatility: number;
      correlation: Record<string, number>;
    }>;
    riskTolerance: number;
    constraints?: {
      minWeight?: Record<string, number>;
      maxWeight?: Record<string, number>;
    };
  }) => {
    const { assets, riskTolerance, constraints = {} } = data;
    
    // This is a simplified portfolio optimization
    // In reality, this would use a more sophisticated algorithm
    
    // Simplified Markowitz portfolio optimization with risk constraint
    const optimizeWeights = () => {
      // Start with equal weights
      let weights = assets.map(() => 1 / assets.length);
      
      // Apply constraints
      if (constraints.minWeight) {
        Object.entries(constraints.minWeight).forEach(([assetId, minWeight]) => {
          const index = assets.findIndex(a => a.id === assetId);
          if (index !== -1 && weights[index] < minWeight) {
            weights[index] = minWeight;
          }
        });
      }
      
      if (constraints.maxWeight) {
        Object.entries(constraints.maxWeight).forEach(([assetId, maxWeight]) => {
          const index = assets.findIndex(a => a.id === assetId);
          if (index !== -1 && weights[index] > maxWeight) {
            weights[index] = maxWeight;
          }
        });
      }
      
      // Normalize weights to sum to 1
      const sum = weights.reduce((a, b) => a + b, 0);
      weights = weights.map(w => w / sum);
      
      // Calculate expected return and risk
      const expectedReturns = assets.map(asset => {
        return asset.returns.reduce((a, b) => a + b, 0) / asset.returns.length;
      });
      
      const portfolioReturn = weights.reduce((sum, weight, i) => {
        return sum + weight * expectedReturns[i];
      }, 0);
      
      // Calculate portfolio risk (simplified)
      let portfolioRisk = 0;
      for (let i = 0; i < assets.length; i++) {
        for (let j = 0; j < assets.length; j++) {
          const correlation = i === j ? 1 : (
            assets[i].correlation[assets[j].id] || 
            assets[j].correlation[assets[i].id] || 
            0
          );
          
          portfolioRisk += weights[i] * weights[j] * 
            assets[i].volatility * assets[j].volatility * correlation;
        }
      }
      portfolioRisk = Math.sqrt(portfolioRisk);
      
      return {
        weights: Object.fromEntries(assets.map((asset, i) => [asset.id, weights[i]])),
        expectedReturn: portfolioReturn,
        expectedRisk: portfolioRisk,
        sharpeRatio: portfolioReturn / portfolioRisk
      };
    };
    
    return optimizeWeights();
  }
};

// Export a pre-configured worker with common tasks
export const createCommonWorker = () => createInlineWorker(commonTasks);
