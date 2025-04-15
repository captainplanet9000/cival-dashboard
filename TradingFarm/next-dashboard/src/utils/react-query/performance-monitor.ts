/**
 * TanStack Query Performance Monitor
 * 
 * This utility helps track query performance metrics to identify
 * optimization opportunities and detect performance regressions.
 */

import { QueryClient } from '@tanstack/react-query';
import { Env } from '@/utils/environment';

interface QueryMetrics {
  queryKey: string;
  count: number;
  totalTime: number;
  averageTime: number;
  maxTime: number;
  lastExecuted: number;
  cacheHits: number;
  cacheMisses: number;
}

interface PerformanceReport {
  timestamp: number;
  metrics: QueryMetrics[];
  slowestQueries: QueryMetrics[];
  mostFrequentQueries: QueryMetrics[];
  totalQueries: number;
  averageQueryTime: number;
  cacheHitRate: number;
}

class QueryPerformanceMonitor {
  private metrics: Map<string, QueryMetrics> = new Map();
  private isEnabled: boolean = false;
  private queryClient: QueryClient | null = null;
  private originalDefaultOptions: any = null;
  private unsubscribe: (() => void) | null = null;

  /**
   * Initialize the performance monitor with a QueryClient
   */
  initialize(queryClient: QueryClient): void {
    if (this.queryClient) {
      this.disable();
    }

    this.queryClient = queryClient;
    this.metrics = new Map();
    this.originalDefaultOptions = { ...queryClient.getDefaultOptions() };
  }

  /**
   * Enable performance monitoring
   */
  enable(): void {
    if (!this.queryClient || this.isEnabled) return;

    // Subscribe to query cache changes
    this.unsubscribe = this.queryClient.getQueryCache().subscribe((event) => {
      if (event.type === 'queryUpdated') {
        this.trackQuery(event.query);
      }
    });

    // Patch default options to include performance measurement
    const patchedOptions = {
      ...this.originalDefaultOptions,
      queries: {
        ...this.originalDefaultOptions?.queries,
        notifyOnChangeProps: 'all',
      }
    };

    this.queryClient.setDefaultOptions(patchedOptions);
    this.isEnabled = true;

    if (Env.isDevelopment) {
      console.log('🔍 Query Performance Monitor enabled');
    }
  }

  /**
   * Disable performance monitoring
   */
  disable(): void {
    if (!this.isEnabled || !this.queryClient) return;

    if (this.unsubscribe) {
      this.unsubscribe();
      this.unsubscribe = null;
    }

    if (this.originalDefaultOptions) {
      this.queryClient.setDefaultOptions(this.originalDefaultOptions);
    }

    this.isEnabled = false;

    if (Env.isDevelopment) {
      console.log('🔍 Query Performance Monitor disabled');
    }
  }

  /**
   * Track query execution metrics
   */
  private trackQuery(query: any): void {
    if (!query) return;

    const queryKeyString = JSON.stringify(query.queryKey);
    const state = query.state;
    
    if (!state) return;

    const isCacheHit = state.dataUpdateCount > 0 && !state.isFetching;
    const dataUpdatedAt = state.dataUpdatedAt || Date.now();
    const fetchDuration = state.fetchMeta?.fetchDuration || 0;

    let metric = this.metrics.get(queryKeyString);

    if (!metric) {
      metric = {
        queryKey: queryKeyString,
        count: 0,
        totalTime: 0,
        averageTime: 0,
        maxTime: 0,
        lastExecuted: 0,
        cacheHits: 0,
        cacheMisses: 0,
      };
    }

    // Only update metrics for completed queries
    if (fetchDuration > 0) {
      metric.count++;
      metric.totalTime += fetchDuration;
      metric.averageTime = metric.totalTime / metric.count;
      metric.maxTime = Math.max(metric.maxTime, fetchDuration);
      metric.lastExecuted = dataUpdatedAt;
    }

    // Track cache hits/misses
    if (isCacheHit) {
      metric.cacheHits++;
    } else if (state.fetchStatus === 'fetching') {
      metric.cacheMisses++;
    }

    this.metrics.set(queryKeyString, metric);
  }

  /**
   * Generate a performance report
   */
  generateReport(): PerformanceReport {
    const metricsArray = Array.from(this.metrics.values());
    
    // Calculate aggregate metrics
    const totalQueries = metricsArray.reduce((sum, m) => sum + m.count, 0);
    const totalQueryTime = metricsArray.reduce((sum, m) => sum + m.totalTime, 0);
    const averageQueryTime = totalQueries > 0 ? totalQueryTime / totalQueries : 0;
    
    const totalCacheRequests = metricsArray.reduce(
      (sum, m) => sum + m.cacheHits + m.cacheMisses, 
      0
    );
    const totalCacheHits = metricsArray.reduce((sum, m) => sum + m.cacheHits, 0);
    const cacheHitRate = totalCacheRequests > 0 
      ? totalCacheHits / totalCacheRequests 
      : 0;
    
    // Sort by performance metrics
    const slowestQueries = [...metricsArray]
      .sort((a, b) => b.averageTime - a.averageTime)
      .slice(0, 5);
    
    const mostFrequentQueries = [...metricsArray]
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
    
    return {
      timestamp: Date.now(),
      metrics: metricsArray,
      slowestQueries,
      mostFrequentQueries,
      totalQueries,
      averageQueryTime,
      cacheHitRate,
    };
  }

  /**
   * Reset all collected metrics
   */
  reset(): void {
    this.metrics.clear();
  }

  /**
   * Log a performance report to the console (development only)
   */
  logReport(): void {
    if (!Env.isDevelopment) return;

    const report = this.generateReport();
    
    console.group('📊 TanStack Query Performance Report');
    console.log(`Total Queries: ${report.totalQueries}`);
    console.log(`Average Query Time: ${report.averageQueryTime.toFixed(2)}ms`);
    console.log(`Cache Hit Rate: ${(report.cacheHitRate * 100).toFixed(2)}%`);
    
    console.group('🐢 Slowest Queries:');
    report.slowestQueries.forEach((q, i) => {
      console.log(`${i + 1}. ${q.queryKey.substring(0, 100)}: ${q.averageTime.toFixed(2)}ms`);
    });
    console.groupEnd();
    
    console.group('🔄 Most Frequent Queries:');
    report.mostFrequentQueries.forEach((q, i) => {
      console.log(`${i + 1}. ${q.queryKey.substring(0, 100)}: ${q.count} executions`);
    });
    console.groupEnd();
    
    console.groupEnd();
  }
}

// Singleton instance
export const queryPerformanceMonitor = new QueryPerformanceMonitor();

/**
 * Hook up the performance monitor to the QueryClient
 */
export function setupQueryPerformanceMonitoring(queryClient: QueryClient): void {
  queryPerformanceMonitor.initialize(queryClient);
  
  if (Env.isDevelopment) {
    queryPerformanceMonitor.enable();
    
    // Log performance report every 5 minutes in development
    setInterval(() => {
      queryPerformanceMonitor.logReport();
    }, 5 * 60 * 1000);
  }
}

/**
 * Enable performance monitoring for a specific period
 * Useful for performance testing in production
 */
export function enablePerformanceMonitoringForPeriod(
  queryClient: QueryClient, 
  durationMs: number = 60 * 1000
): Promise<PerformanceReport> {
  queryPerformanceMonitor.initialize(queryClient);
  queryPerformanceMonitor.reset();
  queryPerformanceMonitor.enable();
  
  return new Promise((resolve) => {
    setTimeout(() => {
      const report = queryPerformanceMonitor.generateReport();
      queryPerformanceMonitor.disable();
      resolve(report);
    }, durationMs);
  });
}
