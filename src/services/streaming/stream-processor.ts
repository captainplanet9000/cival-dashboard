/**
 * Stream Processor
 * 
 * Provides utilities for handling high-frequency data streams with
 * proper backpressure handling and buffering.
 */

import { MonitoringService } from '../monitoring-service';

/**
 * Stream processor options
 */
export interface StreamProcessorOptions<T> {
  // Maximum buffer size before applying backpressure
  maxBufferSize?: number;
  
  // Batch size for processing
  batchSize?: number;
  
  // Processing interval in milliseconds
  processingInterval?: number;
  
  // Processing function that handles data
  processFn: (items: T[]) => Promise<void> | void;
  
  // Optional data transformation before buffering
  transformFn?: (data: any) => T;
  
  // Function to determine data uniqueness (prevents duplicates)
  uniqueKeyFn?: (item: T) => string;
  
  // Whether to drop older items when buffer is full (true) or newer items (false)
  dropOldest?: boolean;
  
  // Whether to start processing immediately
  autoStart?: boolean;
  
  // Optional error handler
  onError?: (error: Error) => void;
}

/**
 * Stream processor class for handling high-frequency data
 */
export class StreamProcessor<T> {
  private buffer: T[] = [];
  private uniqueKeys: Set<string> = new Set();
  private isProcessing = false;
  private processingInterval: number;
  private maxBufferSize: number;
  private batchSize: number;
  private processFn: (items: T[]) => Promise<void> | void;
  private transformFn?: (data: any) => T;
  private uniqueKeyFn?: (item: T) => string;
  private dropOldest: boolean;
  private intervalId: ReturnType<typeof setInterval> | null = null;
  private onError?: (error: Error) => void;
  private metrics = {
    itemsProcessed: 0,
    batchesProcessed: 0,
    itemsDropped: 0,
    errors: 0,
    lastProcessingTime: 0,
    maxProcessingTime: 0,
    totalProcessingTime: 0,
  };

  /**
   * Create a new stream processor
   * 
   * @param options Stream processor options
   */
  constructor(options: StreamProcessorOptions<T>) {
    this.processFn = options.processFn;
    this.transformFn = options.transformFn;
    this.uniqueKeyFn = options.uniqueKeyFn;
    this.maxBufferSize = options.maxBufferSize || 1000;
    this.batchSize = options.batchSize || 100;
    this.processingInterval = options.processingInterval || 100;
    this.dropOldest = options.dropOldest !== undefined ? options.dropOldest : true;
    this.onError = options.onError;

    // Start processing if autoStart is true
    if (options.autoStart !== false) {
      this.start();
    }
  }

  /**
   * Add an item to the processing buffer
   * 
   * @param data Data to process
   * @returns True if added, false if dropped due to backpressure
   */
  public push(data: any): boolean {
    // Transform data if a transformation function is provided
    const item = this.transformFn ? this.transformFn(data) : data as T;
    
    // Check uniqueness if a unique key function is provided
    if (this.uniqueKeyFn) {
      const key = this.uniqueKeyFn(item);
      if (this.uniqueKeys.has(key)) {
        return true; // Item already exists, silently ignore
      }
      this.uniqueKeys.add(key);
    }
    
    // Check buffer capacity
    if (this.buffer.length >= this.maxBufferSize) {
      this.metrics.itemsDropped++;
      
      // Apply backpressure strategy - either drop oldest or newest
      if (this.dropOldest) {
        // Drop oldest item (from the front of the buffer)
        this.buffer.shift();
        // Remove from unique keys if necessary
        if (this.uniqueKeyFn) {
          const oldestItem = this.buffer[0];
          if (oldestItem) {
            const key = this.uniqueKeyFn(oldestItem);
            this.uniqueKeys.delete(key);
          }
        }
      } else {
        // Drop this new item instead of adding it
        MonitoringService.logEvent({
          type: 'warning',
          message: 'StreamProcessor buffer full, dropping new item',
          data: { bufferSize: this.buffer.length, maxBufferSize: this.maxBufferSize }
        });
        return false;
      }
    }
    
    // Add item to buffer
    this.buffer.push(item);
    return true;
  }

  /**
   * Start processing the buffer at regular intervals
   */
  public start(): void {
    if (this.intervalId !== null) {
      return; // Already started
    }
    
    this.intervalId = setInterval(() => {
      this.processBuffer();
    }, this.processingInterval);
    
    MonitoringService.logEvent({
      type: 'info',
      message: 'StreamProcessor started',
      data: { interval: this.processingInterval, batchSize: this.batchSize }
    });
  }

  /**
   * Stop processing the buffer
   */
  public stop(): void {
    if (this.intervalId === null) {
      return; // Already stopped
    }
    
    clearInterval(this.intervalId);
    this.intervalId = null;
    
    MonitoringService.logEvent({
      type: 'info',
      message: 'StreamProcessor stopped',
      data: {
        itemsInBuffer: this.buffer.length,
        metrics: this.metrics
      }
    });
  }

  /**
   * Clear the buffer
   */
  public clear(): void {
    this.buffer = [];
    this.uniqueKeys.clear();
    
    MonitoringService.logEvent({
      type: 'info',
      message: 'StreamProcessor buffer cleared',
    });
  }

  /**
   * Get current buffer size
   */
  public getBufferSize(): number {
    return this.buffer.length;
  }

  /**
   * Get processor metrics
   */
  public getMetrics(): typeof this.metrics {
    return { ...this.metrics };
  }

  /**
   * Force immediate processing of the buffer
   */
  public async flush(): Promise<void> {
    return this.processBuffer(true);
  }

  /**
   * Process items in the buffer
   * 
   * @param processAll Whether to process all items in the buffer regardless of batch size
   */
  private async processBuffer(processAll = false): Promise<void> {
    // Skip if already processing or buffer is empty
    if (this.isProcessing || this.buffer.length === 0) {
      return;
    }
    
    this.isProcessing = true;
    
    try {
      // Determine how many items to process
      const itemsToProcess = processAll 
        ? this.buffer.length 
        : Math.min(this.buffer.length, this.batchSize);
      
      // Extract items from buffer
      const batch = this.buffer.splice(0, itemsToProcess);
      
      // Remove processed items from uniqueKeys if needed
      if (this.uniqueKeyFn) {
        batch.forEach(item => {
          const key = this.uniqueKeyFn!(item);
          this.uniqueKeys.delete(key);
        });
      }
      
      // Process the batch
      const startTime = performance.now();
      
      const result = this.processFn(batch);
      
      // Handle promise if returned
      if (result instanceof Promise) {
        await result;
      }
      
      // Update metrics
      const processingTime = performance.now() - startTime;
      this.metrics.lastProcessingTime = processingTime;
      this.metrics.maxProcessingTime = Math.max(this.metrics.maxProcessingTime, processingTime);
      this.metrics.totalProcessingTime += processingTime;
      this.metrics.itemsProcessed += batch.length;
      this.metrics.batchesProcessed++;
      
      // Track performance metrics
      MonitoringService.trackMetric({
        name: 'stream_processing_time',
        value: processingTime,
        unit: 'ms',
        tags: ['data_processing', 'streaming']
      });
      
      // If buffer still has items and we're processing all, continue processing
      if (processAll && this.buffer.length > 0) {
        await this.processBuffer(true);
      }
    } catch (error) {
      this.metrics.errors++;
      
      MonitoringService.logEvent({
        type: 'error',
        message: 'Error processing stream data',
        data: { error }
      });
      
      if (this.onError && error instanceof Error) {
        this.onError(error);
      }
    } finally {
      this.isProcessing = false;
    }
  }
}

/**
 * Create a new stream processor with the given options
 * 
 * @param options Stream processor options
 * @returns Stream processor instance
 */
export function createStreamProcessor<T>(options: StreamProcessorOptions<T>): StreamProcessor<T> {
  return new StreamProcessor<T>(options);
} 