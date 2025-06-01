/**
 * Performance Monitoring Service
 * Provides tools for monitoring and optimizing application performance
 */

// Type definitions for performance metrics
export interface PerformanceMetric {
  name: string;
  value: number;
  unit: 'ms' | 'bytes' | 'count' | 'percent';
  timestamp: number;
}

export interface PerformanceMarker {
  name: string;
  startTime: number;
  endTime?: number;
  duration?: number;
}

export interface ComponentRenderMetric {
  componentName: string;
  renderTime: number;
  renderCount: number;
  lastRenderedAt: number;
}

// Core performance monitoring class
class PerformanceMonitor {
  private metrics: PerformanceMetric[] = [];
  private markers: Map<string, PerformanceMarker> = new Map();
  private componentRenders: Map<string, ComponentRenderMetric> = new Map();
  private enabled: boolean = process.env.NODE_ENV === 'production' || process.env.NEXT_PUBLIC_ENABLE_MONITORING === 'true';
  private metricsBufferSize: number = 100;
  private flushInterval: number = 30000; // 30 seconds
  private flushIntervalId?: NodeJS.Timeout;

  // Initialize the performance monitor
  constructor() {
    if (typeof window !== 'undefined' && this.enabled) {
      // Set up automatic flushing of metrics
      this.flushIntervalId = setInterval(() => this.flush(), this.flushInterval);
      
      // Listen for page visibility changes to flush metrics when page becomes hidden
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'hidden') {
          this.flush();
        }
      });
      
      // Capture web vitals
      this.captureWebVitals();
      
      // Track memory usage periodically
      if (performance.memory) {
        setInterval(() => this.trackMemoryUsage(), 10000);
      }
      
      console.log('Performance monitoring initialized');
    }
  }

  // Start timing a named operation
  public startMark(name: string): void {
    if (!this.enabled) return;
    
    const startTime = performance.now();
    this.markers.set(name, { name, startTime });
  }

  // End timing a named operation and record the duration
  public endMark(name: string): number | undefined {
    if (!this.enabled) return;
    
    const marker = this.markers.get(name);
    if (!marker) {
      console.warn(`No performance marker found with name: ${name}`);
      return;
    }
    
    const endTime = performance.now();
    const duration = endTime - marker.startTime;
    
    this.markers.set(name, {
      ...marker,
      endTime,
      duration
    });
    
    this.recordMetric({
      name: `mark.${name}`,
      value: duration,
      unit: 'ms',
      timestamp: Date.now()
    });
    
    return duration;
  }

  // Record a component render
  public trackComponentRender(componentName: string, renderTime: number): void {
    if (!this.enabled) return;
    
    const existing = this.componentRenders.get(componentName);
    
    if (existing) {
      this.componentRenders.set(componentName, {
        componentName,
        renderTime: existing.renderTime + renderTime,
        renderCount: existing.renderCount + 1,
        lastRenderedAt: Date.now()
      });
    } else {
      this.componentRenders.set(componentName, {
        componentName,
        renderTime,
        renderCount: 1,
        lastRenderedAt: Date.now()
      });
    }
    
    // Record the individual render time for this instance
    this.recordMetric({
      name: `component.${componentName}.render`,
      value: renderTime,
      unit: 'ms',
      timestamp: Date.now()
    });
  }

  // Record a custom metric
  public recordMetric(metric: PerformanceMetric): void {
    if (!this.enabled) return;
    
    this.metrics.push(metric);
    
    // Flush if buffer is full
    if (this.metrics.length >= this.metricsBufferSize) {
      this.flush();
    }
  }

  // Track memory usage
  private trackMemoryUsage(): void {
    if (!this.enabled || !performance.memory) return;
    
    // Cast to any to avoid TypeScript errors since memory is non-standard
    const memory = (performance as any).memory;
    
    this.recordMetric({
      name: 'memory.usedJSHeapSize',
      value: memory.usedJSHeapSize,
      unit: 'bytes',
      timestamp: Date.now()
    });
    
    this.recordMetric({
      name: 'memory.jsHeapSizeLimit',
      value: memory.jsHeapSizeLimit,
      unit: 'bytes',
      timestamp: Date.now()
    });
  }

  // Capture Web Vitals metrics
  private captureWebVitals(): void {
    if (!this.enabled || typeof window === 'undefined') return;
    
    try {
      // Using dynamic import to avoid bundling issues
      import('web-vitals').then(({ onCLS, onFID, onLCP, onTTFB, onFCP }) => {
        onCLS(metric => {
          this.recordMetric({
            name: 'web-vitals.CLS',
            value: metric.value,
            unit: 'count',
            timestamp: Date.now()
          });
        });
        
        onFID(metric => {
          this.recordMetric({
            name: 'web-vitals.FID',
            value: metric.value,
            unit: 'ms',
            timestamp: Date.now()
          });
        });
        
        onLCP(metric => {
          this.recordMetric({
            name: 'web-vitals.LCP',
            value: metric.value,
            unit: 'ms',
            timestamp: Date.now()
          });
        });
        
        onTTFB(metric => {
          this.recordMetric({
            name: 'web-vitals.TTFB',
            value: metric.value,
            unit: 'ms',
            timestamp: Date.now()
          });
        });
        
        onFCP(metric => {
          this.recordMetric({
            name: 'web-vitals.FCP',
            value: metric.value,
            unit: 'ms',
            timestamp: Date.now()
          });
        });
      });
    } catch (error) {
      console.error('Failed to load web-vitals:', error);
    }
  }

  // Get performance report
  public getPerformanceReport(): {
    metrics: PerformanceMetric[];
    componentRenders: ComponentRenderMetric[];
  } {
    return {
      metrics: this.metrics,
      componentRenders: Array.from(this.componentRenders.values())
    };
  }

  // Flush metrics to backend or analytics service
  private flush(): void {
    if (!this.enabled || this.metrics.length === 0) return;
    
    if (typeof window !== 'undefined') {
      // In a real app, we would send this data to a backend endpoint
      // For now, we'll just log it to console in dev mode
      if (process.env.NODE_ENV !== 'production') {
        console.debug('Flushing performance metrics:', this.metrics.length);
      }
      
      try {
        // Example API call to store metrics
        // Using fetch because it's more lightweight than including axios
        fetch('/api/performance-metrics', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            metrics: this.metrics,
            timestamp: Date.now(),
            userAgent: navigator.userAgent,
            url: window.location.href
          }),
          // Use keepalive to ensure the request completes even if the page is unloading
          keepalive: true
        }).catch(error => {
          console.error('Failed to send performance metrics:', error);
        });
      } catch (error) {
        // Fail silently in production, log in development
        if (process.env.NODE_ENV !== 'production') {
          console.error('Failed to flush performance metrics:', error);
        }
      }
    }
    
    // Clear the metrics array
    this.metrics = [];
  }

  // Clean up resources
  public dispose(): void {
    if (this.flushIntervalId) {
      clearInterval(this.flushIntervalId);
    }
    
    if (typeof document !== 'undefined') {
      document.removeEventListener('visibilitychange', () => this.flush());
    }
    
    // Final flush of metrics
    this.flush();
  }
}

// Create singleton instance
export const performanceMonitor = new PerformanceMonitor();

// React performance hook for component monitoring
export function usePerformanceMonitoring(componentName: string) {
  return {
    trackRender: (renderTime: number) => {
      performanceMonitor.trackComponentRender(componentName, renderTime);
    },
    startMark: (name: string) => {
      performanceMonitor.startMark(`${componentName}.${name}`);
    },
    endMark: (name: string) => {
      return performanceMonitor.endMark(`${componentName}.${name}`);
    }
  };
}

// Higher-order component for automatic performance tracking
export function withPerformanceTracking<P extends object>(
  Component: React.ComponentType<P>,
  displayName: string
): React.FC<P> {
  const WrappedComponent: React.FC<P> = (props: P) => {
    const startTime = performance.now();
    
    // Wrap the component to measure render time
    const result = <Component {...props} />;
    
    const renderTime = performance.now() - startTime;
    performanceMonitor.trackComponentRender(displayName, renderTime);
    
    return result;
  };
  
  // Set display name for debugging
  WrappedComponent.displayName = `withPerformanceTracking(${displayName})`;
  
  return WrappedComponent;
}

export default performanceMonitor;
