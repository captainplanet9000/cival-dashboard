/**
 * Performance monitoring utilities for the Trading Farm Dashboard.
 * Provides functionality to measure, analyze, and report performance metrics.
 */

// Define metric types for type safety
export type PerformanceMetricType = 
  | 'component-render'
  | 'data-fetch'
  | 'calculation'
  | 'interaction'
  | 'navigation'
  | 'initialization';

export interface PerformanceMetric {
  id: string;
  type: PerformanceMetricType;
  name: string;
  duration: number;
  timestamp: number;
  metadata?: Record<string, any>;
}

// Maximum number of metrics to store in memory
const MAX_METRICS_HISTORY = 100;

// In-memory storage for metrics
const metricsHistory: PerformanceMetric[] = [];

// Flag to determine if we should log metrics to console
let debugMode = process.env.NODE_ENV === 'development';

/**
 * Measure execution time of a function
 * 
 * @param fn Function to measure
 * @param metricName Name of the metric
 * @param type Type of performance metric
 * @param metadata Additional data to store with the metric
 * @returns Result of the function execution
 */
export function measureSync<T>(
  fn: () => T,
  metricName: string,
  type: PerformanceMetricType = 'calculation',
  metadata?: Record<string, any>
): T {
  const start = performance.now();
  const result = fn();
  const end = performance.now();
  
  recordMetric({
    id: generateId(),
    type,
    name: metricName,
    duration: end - start,
    timestamp: Date.now(),
    metadata
  });
  
  return result;
}

/**
 * Measure execution time of an async function
 * 
 * @param fn Async function to measure
 * @param metricName Name of the metric
 * @param type Type of performance metric
 * @param metadata Additional data to store with the metric
 * @returns Promise resolving to the function result
 */
export async function measureAsync<T>(
  fn: () => Promise<T>,
  metricName: string,
  type: PerformanceMetricType = 'data-fetch',
  metadata?: Record<string, any>
): Promise<T> {
  const start = performance.now();
  
  try {
    const result = await fn();
    const end = performance.now();
    
    recordMetric({
      id: generateId(),
      type,
      name: metricName,
      duration: end - start,
      timestamp: Date.now(),
      metadata
    });
    
    return result;
  } catch (error) {
    const end = performance.now();
    
    recordMetric({
      id: generateId(),
      type,
      name: `${metricName} (error)`,
      duration: end - start,
      timestamp: Date.now(),
      metadata: { ...metadata, error: (error as Error).message }
    });
    
    throw error;
  }
}

/**
 * Create a performance measurement hook for React components
 * 
 * @param componentName Name of the component being measured
 * @param metadata Additional data to include with the metric
 * @returns Object with start and end functions
 */
export function useComponentPerformance(componentName: string, metadata?: Record<string, any>) {
  return {
    measureRender: () => {
      const start = performance.now();
      
      return () => {
        const end = performance.now();
        
        recordMetric({
          id: generateId(),
          type: 'component-render',
          name: componentName,
          duration: end - start,
          timestamp: Date.now(),
          metadata
        });
      };
    }
  };
}

/**
 * Record a performance metric
 * 
 * @param metric Performance metric to record
 */
export function recordMetric(metric: PerformanceMetric): void {
  // Store metric in history with limit
  metricsHistory.push(metric);
  
  if (metricsHistory.length > MAX_METRICS_HISTORY) {
    metricsHistory.shift();
  }
  
  // Log in development mode
  if (debugMode) {
    console.log(
      `%c[Performance] ${metric.name}: ${metric.duration.toFixed(2)}ms`,
      `color: ${getDurationColor(metric.duration)}`
    );
    
    if (metric.metadata) {
      console.log(
        '%cMetadata:',
        'color: gray',
        metric.metadata
      );
    }
  }
  
  // In a real app, you might send this to an analytics service
  if (typeof window !== 'undefined' && window.performance) {
    const measure = {
      name: metric.name,
      startTime: metric.timestamp - metric.duration,
      duration: metric.duration,
      detail: {
        type: metric.type,
        metadata: metric.metadata
      }
    };
    
    try {
      // Record as performance entry if supported
      performance.measure(
        `[${metric.type}] ${metric.name}`,
        {
          start: measure.startTime,
          duration: measure.duration,
          detail: measure.detail
        }
      );
    } catch (e) {
      // Fallback for browsers that don't support the detail parameter
      performance.measure(
        `[${metric.type}] ${metric.name}`,
        undefined,
        undefined
      );
    }
  }
}

/**
 * Get all recorded metrics
 * 
 * @returns Array of performance metrics
 */
export function getMetrics(): PerformanceMetric[] {
  return [...metricsHistory];
}

/**
 * Get metrics filtered by type
 * 
 * @param type Type of metrics to retrieve
 * @returns Filtered array of metrics
 */
export function getMetricsByType(type: PerformanceMetricType): PerformanceMetric[] {
  return metricsHistory.filter(metric => metric.type === type);
}

/**
 * Calculate average duration for a specific metric name
 * 
 * @param metricName Name of the metric
 * @returns Average duration in milliseconds
 */
export function getAverageDuration(metricName: string): number {
  const relevantMetrics = metricsHistory.filter(metric => metric.name === metricName);
  
  if (relevantMetrics.length === 0) {
    return 0;
  }
  
  const sum = relevantMetrics.reduce((total, metric) => total + metric.duration, 0);
  return sum / relevantMetrics.length;
}

/**
 * Generate a color based on duration for visual reporting
 * 
 * @param duration Duration in milliseconds
 * @returns CSS color string
 */
function getDurationColor(duration: number): string {
  if (duration < 10) return 'green';
  if (duration < 50) return 'limegreen';
  if (duration < 100) return 'orange';
  if (duration < 300) return 'darkorange';
  return 'red';
}

/**
 * Generate a unique identifier for metrics
 * 
 * @returns Unique ID string
 */
function generateId(): string {
  return `metric_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Enable or disable debug logging
 * 
 * @param enable Whether to enable debug logging
 */
export function setDebugMode(enable: boolean): void {
  debugMode = enable;
}

/**
 * Clear all stored metrics
 */
export function clearMetrics(): void {
  metricsHistory.length = 0;
}

/**
 * Performance report generator for performance analysis
 * 
 * @returns Performance report object
 */
export function generatePerformanceReport() {
  // Group by type
  const metricsByType: Record<string, PerformanceMetric[]> = {};
  
  metricsHistory.forEach(metric => {
    if (!metricsByType[metric.type]) {
      metricsByType[metric.type] = [];
    }
    
    metricsByType[metric.type].push(metric);
  });
  
  // Calculate statistics for each type
  const report = Object.entries(metricsByType).map(([type, metrics]) => {
    const totalDuration = metrics.reduce((sum, m) => sum + m.duration, 0);
    const avgDuration = totalDuration / metrics.length;
    const maxDuration = Math.max(...metrics.map(m => m.duration));
    const minDuration = Math.min(...metrics.map(m => m.duration));
    
    const slowestOperation = metrics.find(m => m.duration === maxDuration);
    
    return {
      type,
      count: metrics.length,
      totalDuration,
      avgDuration,
      maxDuration,
      minDuration,
      slowestOperation: slowestOperation ? slowestOperation.name : 'N/A'
    };
  });
  
  return {
    totalMetricsCollected: metricsHistory.length,
    timestamp: Date.now(),
    typeReports: report,
    slowestOperations: [...metricsHistory]
      .sort((a, b) => b.duration - a.duration)
      .slice(0, 5)
  };
}
