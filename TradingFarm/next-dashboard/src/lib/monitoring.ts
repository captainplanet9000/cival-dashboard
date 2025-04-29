/**
 * Trading Farm Dashboard Monitoring System
 * 
 * This module provides comprehensive monitoring and alerting capabilities for the
 * production deployment of the Trading Farm dashboard.
 */

import { isProduction, isClient } from '@/lib/environment';

// Define monitoring event types
export type MonitoringEventType = 
  | 'error'           // Application errors
  | 'api_error'       // API request errors
  | 'performance'     // Performance metrics
  | 'security'        // Security events
  | 'trading'         // Trading related events
  | 'user_action'     // User interactions
  | 'agent_status'    // Agent operational status
  | 'vault'           // Vault banking events
  | 'system';         // System operations

// Define severity levels
export type SeverityLevel = 'info' | 'warning' | 'error' | 'critical';

// Monitoring event interface
export interface MonitoringEvent {
  type: MonitoringEventType;
  severity: SeverityLevel;
  message: string;
  timestamp: string;
  source?: string;
  details?: Record<string, any>;
  userId?: string;
  sessionId?: string;
  metadata?: Record<string, any>;
}

// Alert thresholds
const ALERT_THRESHOLDS = {
  api_latency_ms: 2000,           // API call latency threshold in ms
  error_rate_percent: 5,          // Error rate threshold (per minute)
  memory_usage_percent: 90,       // Memory usage threshold
  cpu_usage_percent: 80,          // CPU usage threshold
  db_connection_errors: 3,        // Database connection error threshold
  concurrent_requests: 100,       // Concurrent request threshold
  agent_health_percent: 80,       // Agent health threshold
  failed_transactions: 2,         // Failed transaction threshold
};

// In-memory metrics storage (for short-term tracking)
let metrics = {
  errors: {
    count: 0,
    byType: {} as Record<string, number>,
    timestamps: [] as number[],
  },
  performance: {
    apiLatency: [] as number[],
    renderTime: [] as number[],
    ttfb: [] as number[],
  },
  usage: {
    memory: 0,
    cpu: 0,
    connections: 0,
  },
  agents: {
    healthy: 0,
    total: 0,
  },
  transactions: {
    successful: 0,
    failed: 0,
  },
};

// Clear old metrics to prevent memory leaks
if (isClient()) {
  setInterval(() => {
    // Keep only errors from the last hour
    const oneHourAgo = Date.now() - 60 * 60 * 1000;
    metrics.errors.timestamps = metrics.errors.timestamps.filter(t => t >= oneHourAgo);
    
    // Reset counts that are time-window based
    if (metrics.errors.timestamps.length === 0) {
      metrics.errors.count = 0;
      metrics.errors.byType = {};
    }
    
    // Keep only recent performance metrics
    const keepLatest = 100;
    if (metrics.performance.apiLatency.length > keepLatest) {
      metrics.performance.apiLatency = metrics.performance.apiLatency.slice(-keepLatest);
    }
    if (metrics.performance.renderTime.length > keepLatest) {
      metrics.performance.renderTime = metrics.performance.renderTime.slice(-keepLatest);
    }
    if (metrics.performance.ttfb.length > keepLatest) {
      metrics.performance.ttfb = metrics.performance.ttfb.slice(-keepLatest);
    }
  }, 5 * 60 * 1000); // Every 5 minutes
}

/**
 * Log an event to the monitoring system
 * @param event The event to log
 */
export async function logEvent(event: MonitoringEvent): Promise<void> {
  // Add default timestamp if not provided
  if (!event.timestamp) {
    event.timestamp = new Date().toISOString();
  }
  
  // Add session ID if available
  if (isClient() && !event.sessionId) {
    event.sessionId = getSessionId();
  }
  
  // Track metrics based on event type
  trackMetrics(event);
  
  // Log to console in development
  if (!isProduction()) {
    console.log(`[MONITORING] ${event.severity.toUpperCase()} - ${event.type}: ${event.message}`);
    if (event.details) {
      console.log(event.details);
    }
    return;
  }
  
  // In production, send to monitoring service
  try {
    // Check if we need to send an alert based on the severity
    if (event.severity === 'error' || event.severity === 'critical') {
      await sendAlert(event);
    }
    
    // Send to monitoring service (if configured)
    if (process.env.NEXT_PUBLIC_ENABLE_PERFORMANCE_MONITORING === 'true') {
      await sendToMonitoringService(event);
    }
  } catch (error) {
    // Avoid recursive error logging
    console.error('Failed to send monitoring event:', error);
  }
}

/**
 * Track metrics based on event type
 * @param event The event to track
 */
function trackMetrics(event: MonitoringEvent): void {
  // Track errors
  if (event.severity === 'error' || event.severity === 'critical') {
    metrics.errors.count++;
    metrics.errors.timestamps.push(Date.now());
    
    // Track by type
    const errorType = event.details?.errorType || event.type;
    metrics.errors.byType[errorType] = (metrics.errors.byType[errorType] || 0) + 1;
  }
  
  // Track performance metrics
  if (event.type === 'performance') {
    if (event.details?.apiLatency) {
      metrics.performance.apiLatency.push(event.details.apiLatency);
    }
    if (event.details?.renderTime) {
      metrics.performance.renderTime.push(event.details.renderTime);
    }
    if (event.details?.ttfb) {
      metrics.performance.ttfb.push(event.details.ttfb);
    }
    if (event.details?.memory) {
      metrics.usage.memory = event.details.memory;
    }
    if (event.details?.cpu) {
      metrics.usage.cpu = event.details.cpu;
    }
    if (event.details?.connections) {
      metrics.usage.connections = event.details.connections;
    }
  }
  
  // Track agent metrics
  if (event.type === 'agent_status') {
    if (event.details?.healthy !== undefined && event.details?.total !== undefined) {
      metrics.agents.healthy = event.details.healthy;
      metrics.agents.total = event.details.total;
    }
  }
  
  // Track transaction metrics
  if (event.type === 'vault') {
    if (event.details?.transactionSuccess) {
      metrics.transactions.successful++;
    }
    if (event.details?.transactionFailed) {
      metrics.transactions.failed++;
    }
  }
  
  // Check for threshold violations
  checkThresholds();
}

/**
 * Check metrics against thresholds and trigger alerts if needed
 */
function checkThresholds(): void {
  const alerts: MonitoringEvent[] = [];
  
  // Check API latency
  const avgLatency = metrics.performance.apiLatency.length > 0
    ? metrics.performance.apiLatency.reduce((a, b) => a + b, 0) / metrics.performance.apiLatency.length
    : 0;
  
  if (avgLatency > ALERT_THRESHOLDS.api_latency_ms) {
    alerts.push({
      type: 'performance',
      severity: 'warning',
      message: `High API latency detected: ${avgLatency.toFixed(2)}ms`,
      timestamp: new Date().toISOString(),
      details: { avgLatency, threshold: ALERT_THRESHOLDS.api_latency_ms },
    });
  }
  
  // Check error rate (last minute)
  const oneMinuteAgo = Date.now() - 60 * 1000;
  const recentErrors = metrics.errors.timestamps.filter(t => t >= oneMinuteAgo).length;
  
  if (recentErrors >= 5) { // More than 5 errors in the last minute
    alerts.push({
      type: 'error',
      severity: 'error',
      message: `High error rate detected: ${recentErrors} errors in the last minute`,
      timestamp: new Date().toISOString(),
      details: { recentErrors, timeWindow: '1 minute' },
    });
  }
  
  // Check resource usage
  if (metrics.usage.memory > ALERT_THRESHOLDS.memory_usage_percent) {
    alerts.push({
      type: 'system',
      severity: 'warning',
      message: `High memory usage detected: ${metrics.usage.memory}%`,
      timestamp: new Date().toISOString(),
      details: { memoryUsage: metrics.usage.memory, threshold: ALERT_THRESHOLDS.memory_usage_percent },
    });
  }
  
  if (metrics.usage.cpu > ALERT_THRESHOLDS.cpu_usage_percent) {
    alerts.push({
      type: 'system',
      severity: 'warning',
      message: `High CPU usage detected: ${metrics.usage.cpu}%`,
      timestamp: new Date().toISOString(),
      details: { cpuUsage: metrics.usage.cpu, threshold: ALERT_THRESHOLDS.cpu_usage_percent },
    });
  }
  
  // Check agent health
  if (metrics.agents.total > 0) {
    const healthPercent = (metrics.agents.healthy / metrics.agents.total) * 100;
    if (healthPercent < ALERT_THRESHOLDS.agent_health_percent) {
      alerts.push({
        type: 'agent_status',
        severity: 'error',
        message: `Low agent health detected: ${healthPercent.toFixed(2)}%`,
        timestamp: new Date().toISOString(),
        details: { healthy: metrics.agents.healthy, total: metrics.agents.total, healthPercent },
      });
    }
  }
  
  // Check transaction failures
  if (metrics.transactions.failed >= ALERT_THRESHOLDS.failed_transactions) {
    alerts.push({
      type: 'vault',
      severity: 'error',
      message: `Multiple transaction failures detected: ${metrics.transactions.failed} failed transactions`,
      timestamp: new Date().toISOString(),
      details: { failed: metrics.transactions.failed, successful: metrics.transactions.successful },
    });
  }
  
  // Send alerts
  alerts.forEach(alert => {
    sendAlert(alert).catch(err => {
      console.error('Failed to send alert:', err);
    });
  });
}

/**
 * Send an alert for a critical event
 * @param event The event that triggered the alert
 */
async function sendAlert(event: MonitoringEvent): Promise<void> {
  // Implement alert notification (email, SMS, etc.)
  if (process.env.ALERT_EMAIL && isProduction()) {
    try {
      // In a real implementation, this would send an email or SMS
      console.log(`[ALERT] Would send alert to ${process.env.ALERT_EMAIL}:`, event);
      
      // For production, implement actual notification sending
      // e.g., call an email API, SMS service, or push to a notification system
      
      // For now, we'll just log to the monitoring service
      await sendToMonitoringService({
        ...event,
        type: 'system',
        message: `Alert sent: ${event.message}`,
        details: {
          ...event.details,
          originalEvent: event,
          alertSent: true,
        },
      });
    } catch (error) {
      console.error('Failed to send alert notification:', error);
    }
  }
}

/**
 * Send data to the monitoring service
 * @param event The event to send
 */
async function sendToMonitoringService(event: MonitoringEvent): Promise<void> {
  // Skip if monitoring is disabled
  if (process.env.NEXT_PUBLIC_ENABLE_PERFORMANCE_MONITORING !== 'true') {
    return;
  }
  
  // In production, this would send to a service like Sentry, Datadog, etc.
  const monitoringApiKey = process.env.MONITORING_API_KEY;
  
  if (!monitoringApiKey) {
    console.warn('Monitoring API key not configured');
    return;
  }
  
  // Implementation would depend on the specific monitoring service
  // This is a placeholder for the real implementation
  if (process.env.SENTRY_DSN) {
    // Sentry integration would go here
    console.log('[MONITORING] Sent to Sentry:', event);
  } else {
    // Basic monitoring API call
    try {
      if (isClient()) {
        // Browser implementation
        const blob = new Blob([JSON.stringify(event)], { type: 'application/json' });
        
        // Use Beacon API for non-blocking logging
        if (navigator.sendBeacon) {
          navigator.sendBeacon('/api/monitoring', blob);
        } else {
          // Fallback to fetch
          fetch('/api/monitoring', {
            method: 'POST',
            body: blob,
            headers: {
              'Content-Type': 'application/json',
              'X-Monitoring-Key': monitoringApiKey,
            },
            // Use keepalive to ensure the request completes even if the page is unloading
            keepalive: true,
          }).catch(err => {
            console.error('Failed to send monitoring event:', err);
          });
        }
      } else {
        // Server implementation
        // In a real implementation, this would send to a monitoring service
        console.log('[MONITORING] Server-side event:', event);
      }
    } catch (error) {
      console.error('Failed to send to monitoring service:', error);
    }
  }
}

/**
 * Get or create a session ID for tracking
 */
function getSessionId(): string {
  if (typeof window === 'undefined') {
    return 'server';
  }
  
  let sessionId = sessionStorage.getItem('tf_session_id');
  if (!sessionId) {
    sessionId = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    sessionStorage.setItem('tf_session_id', sessionId);
  }
  
  return sessionId;
}

/**
 * Get current monitoring metrics
 */
export function getMetrics() {
  return { ...metrics };
}

/**
 * Measure the performance of a function
 * @param fn The function to measure
 * @param name The name of the function for reporting
 * @returns The result of the function call
 */
export async function measurePerformance<T>(fn: () => Promise<T>, name: string): Promise<T> {
  const start = performance.now();
  try {
    const result = await fn();
    const duration = performance.now() - start;
    
    // Log performance metric
    logEvent({
      type: 'performance',
      severity: 'info',
      message: `Performance measurement for ${name}`,
      timestamp: new Date().toISOString(),
      details: {
        name,
        duration,
        success: true,
      },
    });
    
    return result;
  } catch (error) {
    const duration = performance.now() - start;
    
    // Log error and performance metric
    logEvent({
      type: 'performance',
      severity: 'error',
      message: `Error in ${name}`,
      timestamp: new Date().toISOString(),
      details: {
        name,
        duration,
        success: false,
        error: error instanceof Error ? error.message : String(error),
      },
    });
    
    throw error;
  }
}

/**
 * Track API request performance
 * @param url The URL being requested
 * @param options Fetch options
 * @returns A wrapped fetch function with performance tracking
 */
export function trackApiPerformance(
  url: string,
  options?: RequestInit
): Promise<Response> {
  return measurePerformance(async () => {
    const response = await fetch(url, options);
    
    // Log API latency
    metrics.performance.apiLatency.push(performance.now());
    
    // Check response status
    if (!response.ok) {
      logEvent({
        type: 'api_error',
        severity: 'warning',
        message: `API error: ${response.status} ${response.statusText}`,
        timestamp: new Date().toISOString(),
        details: {
          url,
          status: response.status,
          statusText: response.statusText,
          method: options?.method || 'GET',
        },
      });
    }
    
    return response;
  }, `API Request: ${options?.method || 'GET'} ${url}`);
}

/**
 * Initialize the monitoring system
 */
export function initMonitoring(): void {
  if (isClient()) {
    // Track page loads
    logEvent({
      type: 'user_action',
      severity: 'info',
      message: 'Page loaded',
      timestamp: new Date().toISOString(),
      details: {
        url: window.location.href,
        referrer: document.referrer,
        userAgent: navigator.userAgent,
      },
    });
    
    // Track page visibility changes
    document.addEventListener('visibilitychange', () => {
      logEvent({
        type: 'user_action',
        severity: 'info',
        message: `Page ${document.visibilityState === 'visible' ? 'visible' : 'hidden'}`,
        timestamp: new Date().toISOString(),
        details: {
          visibilityState: document.visibilityState,
        },
      });
    });
    
    // Track network status changes
    window.addEventListener('online', () => {
      logEvent({
        type: 'system',
        severity: 'info',
        message: 'Network online',
        timestamp: new Date().toISOString(),
      });
    });
    
    window.addEventListener('offline', () => {
      logEvent({
        type: 'system',
        severity: 'warning',
        message: 'Network offline',
        timestamp: new Date().toISOString(),
      });
    });
    
    // Track global errors
    window.addEventListener('error', (event) => {
      logEvent({
        type: 'error',
        severity: 'error',
        message: 'Uncaught error',
        timestamp: new Date().toISOString(),
        details: {
          message: event.message,
          filename: event.filename,
          lineno: event.lineno,
          colno: event.colno,
          stack: event.error?.stack,
        },
      });
    });
    
    // Track unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      logEvent({
        type: 'error',
        severity: 'error',
        message: 'Unhandled promise rejection',
        timestamp: new Date().toISOString(),
        details: {
          reason: event.reason instanceof Error 
            ? event.reason.message 
            : String(event.reason),
          stack: event.reason instanceof Error 
            ? event.reason.stack 
            : undefined,
        },
      });
    });
    
    // Periodic performance reporting
    setInterval(() => {
      if (performance && 'memory' in performance) {
        // @ts-ignore - TS doesn't know about the memory property
        const memory = performance.memory;
        
        logEvent({
          type: 'performance',
          severity: 'info',
          message: 'Memory usage report',
          timestamp: new Date().toISOString(),
          details: {
            // @ts-ignore - TS doesn't know about the memory property
            jsHeapSizeLimit: memory.jsHeapSizeLimit,
            // @ts-ignore - TS doesn't know about the memory property
            totalJSHeapSize: memory.totalJSHeapSize,
            // @ts-ignore - TS doesn't know about the memory property
            usedJSHeapSize: memory.usedJSHeapSize,
            // Calculate memory usage as a percentage
            // @ts-ignore - TS doesn't know about the memory property
            memoryUsagePercent: (memory.usedJSHeapSize / memory.jsHeapSizeLimit) * 100,
          },
        });
      }
    }, 60000); // Every minute
  }
}

// Initialize monitoring if in client environment
if (isClient()) {
  // Wait for the page to load
  if (document.readyState === 'complete') {
    initMonitoring();
  } else {
    window.addEventListener('load', initMonitoring);
  }
}
