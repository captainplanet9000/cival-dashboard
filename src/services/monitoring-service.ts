/**
 * MonitoringService for logging events, errors, and performance metrics
 * This service centralizes all monitoring functionality for the application
 */
export interface MonitoringEvent {
  type: 'info' | 'warning' | 'error' | 'debug' | 'performance';
  message: string;
  data?: Record<string, any>;
  timestamp?: number;
  source?: string;
  userId?: string;
  sessionId?: string;
  tags?: string[];
}

export interface PerformanceMetric {
  name: string;
  value: number;
  unit: 'ms' | 'bytes' | 'count' | 'percentage' | 'rating';
  tags?: string[];
  timestamp?: number;
}

export class MonitoringService {
  private static instance: MonitoringService;
  private eventListeners: Array<(event: MonitoringEvent) => void> = [];
  private metricsListeners: Array<(metric: PerformanceMetric) => void> = [];
  private sessionId: string = '';
  private userId: string = '';
  private debugMode: boolean = false;
  
  private constructor() {
    // Generate a random session ID
    this.sessionId = Date.now().toString(36) + Math.random().toString(36).substring(2);
    
    // Check for debug mode
    this.debugMode = process.env.NODE_ENV === 'development' || localStorage?.getItem('debug_mode') === 'true';
  }
  
  /**
   * Get singleton instance
   */
  public static getInstance(): MonitoringService {
    if (!MonitoringService.instance) {
      MonitoringService.instance = new MonitoringService();
    }
    return MonitoringService.instance;
  }
  
  /**
   * Set user ID for tracking
   */
  public setUserId(userId: string): void {
    this.userId = userId;
  }
  
  /**
   * Add event listener
   */
  public addEventListerner(listener: (event: MonitoringEvent) => void): void {
    this.eventListeners.push(listener);
  }
  
  /**
   * Add metrics listener
   */
  public addMetricsListener(listener: (metric: PerformanceMetric) => void): void {
    this.metricsListeners.push(listener);
  }
  
  /**
   * Remove event listener
   */
  public removeEventListener(listener: (event: MonitoringEvent) => void): void {
    const index = this.eventListeners.indexOf(listener);
    if (index > -1) {
      this.eventListeners.splice(index, 1);
    }
  }
  
  /**
   * Remove metrics listener
   */
  public removeMetricsListener(listener: (metric: PerformanceMetric) => void): void {
    const index = this.metricsListeners.indexOf(listener);
    if (index > -1) {
      this.metricsListeners.splice(index, 1);
    }
  }
  
  /**
   * Log an event
   */
  public logEvent(event: Omit<MonitoringEvent, 'timestamp' | 'sessionId' | 'userId'>): void {
    const fullEvent: MonitoringEvent = {
      ...event,
      timestamp: Date.now(),
      sessionId: this.sessionId,
      userId: this.userId
    };
    
    // Log to console in development
    if (this.debugMode || event.type === 'error') {
      this.logToConsole(fullEvent);
    }
    
    // Notify listeners
    this.notifyEventListeners(fullEvent);
    
    // Send to backend if configured (excluding debug events in production)
    if (event.type !== 'debug' || this.debugMode) {
      this.sendToBackend(fullEvent);
    }
  }
  
  /**
   * Track a performance metric
   */
  public trackMetric(metric: Omit<PerformanceMetric, 'timestamp'>): void {
    const fullMetric: PerformanceMetric = {
      ...metric,
      timestamp: Date.now()
    };
    
    // Log to console in development
    if (this.debugMode) {
      console.info(`[Metric] ${metric.name}: ${metric.value}${metric.unit}`, 
        metric.tags ? `Tags: ${metric.tags.join(', ')}` : '');
    }
    
    // Notify listeners
    this.notifyMetricsListeners(fullMetric);
    
    // Send to backend
    this.sendMetricToBackend(fullMetric);
  }
  
  /**
   * Measure the execution time of a function
   */
  public static async measureExecutionTime<T>(
    name: string,
    fn: () => Promise<T>,
    tags: string[] = []
  ): Promise<T> {
    const instance = MonitoringService.getInstance();
    const startTime = performance.now();
    
    try {
      const result = await fn();
      const endTime = performance.now();
      
      instance.trackMetric({
        name,
        value: endTime - startTime,
        unit: 'ms',
        tags
      });
      
      return result;
    } catch (error) {
      const endTime = performance.now();
      
      instance.trackMetric({
        name: `${name}_error`,
        value: endTime - startTime,
        unit: 'ms',
        tags: [...tags, 'error']
      });
      
      throw error;
    }
  }
  
  /**
   * Static method to log an event
   */
  public static logEvent(event: Omit<MonitoringEvent, 'timestamp' | 'sessionId' | 'userId'>): void {
    MonitoringService.getInstance().logEvent(event);
  }
  
  /**
   * Static method to track a metric
   */
  public static trackMetric(metric: Omit<PerformanceMetric, 'timestamp'>): void {
    MonitoringService.getInstance().trackMetric(metric);
  }
  
  /**
   * Log to console with appropriate formatting
   */
  private logToConsole(event: MonitoringEvent): void {
    const timestamp = new Date(event.timestamp || Date.now()).toISOString();
    
    switch (event.type) {
      case 'error':
        console.error(`[${timestamp}] [ERROR] ${event.message}`, event.data || '');
        break;
      case 'warning':
        console.warn(`[${timestamp}] [WARNING] ${event.message}`, event.data || '');
        break;
      case 'info':
        console.info(`[${timestamp}] [INFO] ${event.message}`, event.data || '');
        break;
      case 'debug':
        console.debug(`[${timestamp}] [DEBUG] ${event.message}`, event.data || '');
        break;
      case 'performance':
        console.info(`[${timestamp}] [PERF] ${event.message}`, event.data || '');
        break;
    }
  }
  
  /**
   * Notify all event listeners
   */
  private notifyEventListeners(event: MonitoringEvent): void {
    this.eventListeners.forEach(listener => {
      try {
        listener(event);
      } catch (error) {
        console.error('Error in event listener:', error);
      }
    });
  }
  
  /**
   * Notify all metrics listeners
   */
  private notifyMetricsListeners(metric: PerformanceMetric): void {
    this.metricsListeners.forEach(listener => {
      try {
        listener(metric);
      } catch (error) {
        console.error('Error in metrics listener:', error);
      }
    });
  }
  
  /**
   * Send event to backend monitoring service
   */
  private sendToBackend(event: MonitoringEvent): void {
    // Skip if in development without explicit backend config
    if (process.env.NODE_ENV === 'development' && !process.env.ENABLE_MONITORING_BACKEND) {
      return;
    }
    
    // TODO: Batch events and send in regular intervals instead of immediately
    
    // Don't block execution with monitoring
    setTimeout(() => {
      fetch('/api/monitoring/events', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(event),
        // Don't fail if monitoring endpoint fails
        keepalive: true,
      }).catch(error => {
        // Only log if in debug mode to avoid infinite loops
        if (this.debugMode) {
          console.error('Failed to send monitoring event:', error);
        }
      });
    }, 0);
  }
  
  /**
   * Send metric to backend monitoring service
   */
  private sendMetricToBackend(metric: PerformanceMetric): void {
    // Skip if in development without explicit backend config
    if (process.env.NODE_ENV === 'development' && !process.env.ENABLE_MONITORING_BACKEND) {
      return;
    }
    
    // TODO: Batch metrics and send in regular intervals
    
    // Don't block execution with monitoring
    setTimeout(() => {
      fetch('/api/monitoring/metrics', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ...metric,
          sessionId: this.sessionId,
          userId: this.userId
        }),
        // Don't fail if monitoring endpoint fails
        keepalive: true,
      }).catch(error => {
        // Only log if in debug mode to avoid infinite loops
        if (this.debugMode) {
          console.error('Failed to send monitoring metric:', error);
        }
      });
    }, 0);
  }
} 