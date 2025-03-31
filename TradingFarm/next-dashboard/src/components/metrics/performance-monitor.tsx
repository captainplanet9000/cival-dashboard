'use client';

import React, { useState, useEffect, useRef } from 'react';
import { api } from '../../lib/api-client';
import { formatDate } from '../../lib/api-utils';

/**
 * API performance metrics interface
 */
interface ApiMetrics {
  endpoint: string;
  responseTime: number;
  status: 'success' | 'error';
  timestamp: string;
}

/**
 * Aggregated metrics for display
 */
interface AggregatedMetrics {
  avgResponseTime: number;
  errorRate: number;
  totalRequests: number;
  lastUpdated: string;
}

/**
 * Performance monitoring component that tracks API response times and error rates
 */
export default function PerformanceMonitor() {
  // State for metrics data
  const [metrics, setMetrics] = useState<ApiMetrics[]>([]);
  const [aggregated, setAggregated] = useState<Record<string, AggregatedMetrics>>({});
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [monitoringInterval, setMonitoringInterval] = useState(30); // seconds
  
  // Refs for intervals
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const apiInterceptorRef = useRef<boolean>(false);

  /**
   * Setup API interceptors to track performance
   */
  useEffect(() => {
    if (!apiInterceptorRef.current) {
      // In a real implementation, we would patch the fetch or axios methods
      // to track all API calls. For this example, we'll simulate it with
      // a scheduled poller.
      apiInterceptorRef.current = true;
    }
    
    return () => {
      // Clear the interval on unmount
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  /**
   * Update aggregated metrics when raw metrics change
   */
  useEffect(() => {
    // Group metrics by endpoint
    const byEndpoint: Record<string, ApiMetrics[]> = {};
    
    metrics.forEach(metric => {
      if (!byEndpoint[metric.endpoint]) {
        byEndpoint[metric.endpoint] = [];
      }
      byEndpoint[metric.endpoint].push(metric);
    });
    
    // Calculate aggregated metrics for each endpoint
    const newAggregated: Record<string, AggregatedMetrics> = {};
    
    Object.entries(byEndpoint).forEach(([endpoint, endpointMetrics]) => {
      const totalRequests = endpointMetrics.length;
      const errors = endpointMetrics.filter(m => m.status === 'error').length;
      const totalResponseTime = endpointMetrics.reduce((sum, m) => sum + m.responseTime, 0);
      
      newAggregated[endpoint] = {
        avgResponseTime: totalRequests ? totalResponseTime / totalRequests : 0,
        errorRate: totalRequests ? (errors / totalRequests) * 100 : 0,
        totalRequests,
        lastUpdated: new Date().toISOString()
      };
    });
    
    setAggregated(newAggregated);
  }, [metrics]);

  /**
   * Start or stop monitoring
   */
  const toggleMonitoring = () => {
    if (isMonitoring) {
      // Stop monitoring
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      setIsMonitoring(false);
    } else {
      // Start monitoring
      measurePerformance(); // Run once immediately
      
      // Then set up the interval
      intervalRef.current = setInterval(() => {
        measurePerformance();
      }, monitoringInterval * 1000);
      
      setIsMonitoring(true);
    }
  };

  /**
   * Measure API performance for various endpoints
   */
  const measurePerformance = async () => {
    // Define endpoints to test
    const endpoints = [
      { name: 'Dashboard Summary', fn: () => api.getDashboardSummary() },
      { name: 'Farms List', fn: () => api.getFarms() },
      { name: 'Orders List', fn: () => api.getOrders() },
      { name: 'Trades List', fn: () => api.getTrades() },
      { name: 'Analytics', fn: () => api.getPerformanceAnalytics() }
    ];
    
    // Test each endpoint and record metrics
    const newMetrics: ApiMetrics[] = [];
    
    for (const endpoint of endpoints) {
      const startTime = performance.now();
      let status: 'success' | 'error' = 'error';
      
      try {
        const response = await endpoint.fn();
        status = response.error ? 'error' : 'success';
      } catch (error) {
        console.error(`Error measuring ${endpoint.name}:`, error);
      }
      
      const endTime = performance.now();
      const responseTime = endTime - startTime;
      
      newMetrics.push({
        endpoint: endpoint.name,
        responseTime,
        status,
        timestamp: new Date().toISOString()
      });
    }
    
    // Update metrics list, keeping the last 100 entries per endpoint
    setMetrics(prev => {
      const updated = [...prev, ...newMetrics];
      
      // Group by endpoint
      const byEndpoint: Record<string, ApiMetrics[]> = {};
      updated.forEach(metric => {
        if (!byEndpoint[metric.endpoint]) {
          byEndpoint[metric.endpoint] = [];
        }
        byEndpoint[metric.endpoint].push(metric);
      });
      
      // Keep most recent 100 per endpoint
      let result: ApiMetrics[] = [];
      Object.values(byEndpoint).forEach(endpointMetrics => {
        result = result.concat(
          endpointMetrics
            .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
            .slice(0, 100)
        );
      });
      
      return result;
    });
  };

  /**
   * Get status indicator class based on metrics
   */
  const getStatusIndicator = (avgResponseTime: number, errorRate: number): string => {
    if (errorRate > 10) return 'bg-red-500'; // High error rate
    if (avgResponseTime > 1000) return 'bg-red-500'; // Very slow
    if (avgResponseTime > 500) return 'bg-yellow-500'; // Slow
    return 'bg-green-500'; // Good
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-medium">API Performance Monitoring</h2>
        
        <div className="flex items-center gap-4">
          <div className="flex items-center">
            <label htmlFor="interval" className="mr-2 text-sm text-gray-600">Interval (seconds):</label>
            <input
              id="interval"
              type="number"
              min={5}
              max={300}
              value={monitoringInterval}
              onChange={(e) => setMonitoringInterval(parseInt(e.target.value))}
              className="w-16 border rounded px-2 py-1"
              disabled={isMonitoring}
            />
          </div>
          
          <button
            onClick={toggleMonitoring}
            className={`px-4 py-2 rounded text-white ${isMonitoring ? 'bg-red-600' : 'bg-green-600'}`}
          >
            {isMonitoring ? 'Stop Monitoring' : 'Start Monitoring'}
          </button>
        </div>
      </div>
      
      {/* Summary metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {Object.entries(aggregated).map(([endpoint, metrics]) => (
          <div key={endpoint} className="bg-white rounded-lg shadow p-4">
            <div className="flex justify-between items-center mb-2">
              <h3 className="font-medium">{endpoint}</h3>
              <div className={`h-3 w-3 rounded-full ${getStatusIndicator(metrics.avgResponseTime, metrics.errorRate)}`}></div>
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-sm text-gray-500">Avg Response Time</p>
                <p className="font-medium">
                  {metrics.avgResponseTime.toFixed(2)} ms
                </p>
              </div>
              
              <div>
                <p className="text-sm text-gray-500">Error Rate</p>
                <p className="font-medium">
                  {metrics.errorRate.toFixed(2)}%
                </p>
              </div>
              
              <div>
                <p className="text-sm text-gray-500">Total Requests</p>
                <p className="font-medium">
                  {metrics.totalRequests}
                </p>
              </div>
              
              <div>
                <p className="text-sm text-gray-500">Last Updated</p>
                <p className="font-medium text-xs">
                  {formatDate(metrics.lastUpdated, { timeStyle: 'medium' })}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>
      
      {!isMonitoring && Object.keys(aggregated).length === 0 && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center">
          <p className="text-gray-500">No performance data available</p>
          <p className="text-sm text-gray-400 mt-1">
            Click "Start Monitoring" to begin collecting API performance metrics
          </p>
        </div>
      )}
      
      {isMonitoring && Object.keys(aggregated).length === 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-8 text-center">
          <div className="animate-spin h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full mx-auto"></div>
          <p className="text-blue-600 mt-4">Collecting performance data...</p>
        </div>
      )}
      
      {/* Overall system health */}
      {Object.keys(aggregated).length > 0 && (
        <div className="bg-white rounded-lg shadow p-4">
          <h3 className="font-medium mb-4">System Health</h3>
          
          <div className="h-12 w-full bg-gray-100 rounded overflow-hidden">
            {Object.values(aggregated).length > 0 && (
              <div 
                className={`h-full ${
                  getOverallHealthColor(Object.values(aggregated))
                }`}
                style={{ 
                  width: `${calculateOverallHealth(Object.values(aggregated))}%` 
                }}
              ></div>
            )}
          </div>
          
          <div className="flex justify-between mt-2 text-sm text-gray-500">
            <span>Degraded</span>
            <span>Optimal</span>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Calculate overall system health percentage based on all metrics
 */
function calculateOverallHealth(metrics: AggregatedMetrics[]): number {
  if (metrics.length === 0) return 0;
  
  // Calculate health score based on response times and error rates
  let totalHealth = 0;
  
  metrics.forEach(metric => {
    // Response time factor (0-50%)
    const responseTimeFactor = Math.max(0, 50 - (metric.avgResponseTime / 20));
    
    // Error rate factor (0-50%)
    const errorRateFactor = Math.max(0, 50 - metric.errorRate);
    
    // Combine factors for this endpoint
    const endpointHealth = Math.min(100, responseTimeFactor + errorRateFactor);
    totalHealth += endpointHealth;
  });
  
  // Return average health percentage
  return totalHealth / metrics.length;
}

/**
 * Get color class based on overall health
 */
function getOverallHealthColor(metrics: AggregatedMetrics[]): string {
  const health = calculateOverallHealth(metrics);
  
  if (health > 80) return 'bg-green-500';
  if (health > 60) return 'bg-green-400';
  if (health > 40) return 'bg-yellow-500';
  if (health > 20) return 'bg-orange-500';
  return 'bg-red-500';
} 