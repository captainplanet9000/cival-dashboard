import React, { useEffect, useState } from 'react';
import { MonitoringService } from '../services/monitoring-service';

interface WebVitalMetrics {
  // First Contentful Paint (time to first content)
  fcp: number | null;
  
  // Largest Contentful Paint (loading performance)
  lcp: number | null;
  
  // First Input Delay (interactivity)
  fid: number | null;
  
  // Cumulative Layout Shift (visual stability)
  cls: number | null;
  
  // Time to Interactive
  tti: number | null;
  
  // Time to First Byte (server response time)
  ttfb: number | null;
}

interface PerformanceTimelineEntry {
  name: string;
  timestamp: number;
  duration: number;
  type: string;
}

interface PerformanceMonitorProps {
  // Whether to display the performance metrics UI
  showMetrics?: boolean;
  
  // Whether to report metrics to the monitoring service
  reportToMonitoring?: boolean;
  
  // Callback when performance metrics are available
  onMetricsCollected?: (metrics: WebVitalMetrics) => void;
  
  // Whether to automatically collapse the UI initially
  initiallyCollapsed?: boolean;
  
  // Custom class for the monitor
  className?: string;
}

/**
 * Performance Monitor Component
 * 
 * Tracks and optionally displays web vital metrics for performance monitoring.
 */
export const PerformanceMonitor: React.FC<PerformanceMonitorProps> = ({
  showMetrics = process.env.NODE_ENV === 'development',
  reportToMonitoring = true,
  onMetricsCollected,
  initiallyCollapsed = true,
  className = ''
}) => {
  const [metrics, setMetrics] = useState<WebVitalMetrics>({
    fcp: null,
    lcp: null,
    fid: null,
    cls: null,
    tti: null,
    ttfb: null
  });
  
  const [timelineEntries, setTimelineEntries] = useState<PerformanceTimelineEntry[]>([]);
  const [isCollapsed, setIsCollapsed] = useState(initiallyCollapsed);
  
  useEffect(() => {
    // Skip if not in browser or performance API not supported
    if (typeof window === 'undefined' || !window.performance) {
      return;
    }
    
    // Get Performance API
    const { performance } = window;
    
    // Check if Performance Observer is supported
    if (!('PerformanceObserver' in window)) {
      console.warn('PerformanceObserver API not supported');
      return;
    }
    
    // Track TTFB (Time to First Byte)
    const trackTTFB = () => {
      const navigationEntries = performance.getEntriesByType('navigation');
      if (navigationEntries.length > 0) {
        const navEntry = navigationEntries[0] as PerformanceNavigationTiming;
        const ttfb = navEntry.responseStart;
        
        setMetrics(prev => ({ ...prev, ttfb }));
        
        if (reportToMonitoring) {
          MonitoringService.trackMetric({
            name: 'ttfb',
            value: ttfb,
            unit: 'ms',
            tags: ['performance', 'web_vitals']
          });
        }
      }
    };
    
    // Track FCP (First Contentful Paint)
    const fcpObserver = new PerformanceObserver((entryList) => {
      const entries = entryList.getEntries();
      if (entries.length > 0) {
        const fcp = entries[0].startTime;
        
        setMetrics(prev => ({ ...prev, fcp }));
        
        if (reportToMonitoring) {
          MonitoringService.trackMetric({
            name: 'fcp',
            value: fcp,
            unit: 'ms',
            tags: ['performance', 'web_vitals']
          });
        }
      }
    });
    
    // Track LCP (Largest Contentful Paint)
    const lcpObserver = new PerformanceObserver((entryList) => {
      const entries = entryList.getEntries();
      if (entries.length > 0) {
        // Use the most recent LCP candidate
        const mostRecentEntry = entries[entries.length - 1];
        const lcp = mostRecentEntry.startTime;
        
        setMetrics(prev => ({ ...prev, lcp }));
        
        if (reportToMonitoring) {
          MonitoringService.trackMetric({
            name: 'lcp',
            value: lcp,
            unit: 'ms',
            tags: ['performance', 'web_vitals']
          });
        }
      }
    });
    
    // Track FID (First Input Delay)
    const fidObserver = new PerformanceObserver((entryList) => {
      const entries = entryList.getEntries();
      if (entries.length > 0) {
        const firstInput = entries[0];
        const fid = firstInput.processingStart - firstInput.startTime;
        
        setMetrics(prev => ({ ...prev, fid }));
        
        if (reportToMonitoring) {
          MonitoringService.trackMetric({
            name: 'fid',
            value: fid,
            unit: 'ms',
            tags: ['performance', 'web_vitals']
          });
        }
      }
    });
    
    // Track CLS (Cumulative Layout Shift)
    let cumulativeLayoutShift = 0;
    const clsObserver = new PerformanceObserver((entryList) => {
      for (const entry of entryList.getEntries()) {
        // Only count layout shifts without recent user input
        if (!(entry as any).hadRecentInput) {
          cumulativeLayoutShift += (entry as any).value;
          
          // Update CLS value (note: this is unitless)
          const cls = cumulativeLayoutShift;
          setMetrics(prev => ({ ...prev, cls }));
          
          if (reportToMonitoring) {
            MonitoringService.trackMetric({
              name: 'cls',
              value: cls,
              unit: '',
              tags: ['performance', 'web_vitals']
            });
          }
        }
      }
    });
    
    // Track general performance timeline
    const timelineObserver = new PerformanceObserver((entryList) => {
      const entries = entryList.getEntries();
      
      const newEntries = entries.map(entry => ({
        name: entry.name,
        timestamp: entry.startTime,
        duration: entry.duration,
        type: entry.entryType
      }));
      
      setTimelineEntries(prev => [...prev, ...newEntries]);
    });
    
    // Start observing different performance entry types
    try {
      fcpObserver.observe({ type: 'paint', buffered: true });
      lcpObserver.observe({ type: 'largest-contentful-paint', buffered: true });
      fidObserver.observe({ type: 'first-input', buffered: true });
      clsObserver.observe({ type: 'layout-shift', buffered: true });
      
      timelineObserver.observe({ 
        entryTypes: ['resource', 'mark', 'measure', 'paint', 'navigation'] 
      });
      
      // Track TTFB immediately
      trackTTFB();
      
      // Track Time to Interactive when the page is fully loaded
      window.addEventListener('load', () => {
        setTimeout(() => {
          // Approximate TTI using DOMContentLoaded and load events
          const navEntries = performance.getEntriesByType('navigation');
          if (navEntries.length > 0) {
            const navEntry = navEntries[0] as PerformanceNavigationTiming;
            
            // Approximate TTI as DOMContentLoaded + a small buffer
            const tti = navEntry.domContentLoadedEventEnd + 100;
            
            setMetrics(prev => ({ ...prev, tti }));
            
            if (reportToMonitoring) {
              MonitoringService.trackMetric({
                name: 'tti',
                value: tti,
                unit: 'ms',
                tags: ['performance', 'web_vitals']
              });
            }
          }
        }, 500); // Wait a bit after load to calculate TTI
      });
      
    } catch (error) {
      console.error('Error setting up performance observers:', error);
    }
    
    // Notify when metrics are collected
    const metricsInterval = setInterval(() => {
      if (Object.values(metrics).some(val => val !== null) && onMetricsCollected) {
        onMetricsCollected(metrics);
      }
    }, 1000);
    
    // Cleanup
    return () => {
      clearInterval(metricsInterval);
      
      try {
        fcpObserver.disconnect();
        lcpObserver.disconnect();
        fidObserver.disconnect();
        clsObserver.disconnect();
        timelineObserver.disconnect();
      } catch (error) {
        console.error('Error disconnecting performance observers:', error);
      }
    };
  }, [metrics, reportToMonitoring, onMetricsCollected]);
  
  // Don't render UI if not showing metrics
  if (!showMetrics) {
    return null;
  }
  
  // Format milliseconds to a readable format
  const formatTime = (ms: number | null): string => {
    if (ms === null) return 'Measuring...';
    
    if (ms < 1000) {
      return `${ms.toFixed(0)}ms`;
    }
    
    return `${(ms / 1000).toFixed(2)}s`;
  };
  
  // Get color class based on performance thresholds
  const getColorClass = (metric: 'fcp' | 'lcp' | 'fid' | 'cls' | 'tti' | 'ttfb', value: number | null): string => {
    if (value === null) return 'text-gray-400';
    
    // Thresholds based on web vitals guidelines
    switch (metric) {
      case 'fcp':
        return value < 1800 ? 'text-green-500' : value < 3000 ? 'text-yellow-500' : 'text-red-500';
      case 'lcp':
        return value < 2500 ? 'text-green-500' : value < 4000 ? 'text-yellow-500' : 'text-red-500';
      case 'fid':
        return value < 100 ? 'text-green-500' : value < 300 ? 'text-yellow-500' : 'text-red-500';
      case 'cls':
        return (value || 0) < 0.1 ? 'text-green-500' : (value || 0) < 0.25 ? 'text-yellow-500' : 'text-red-500';
      case 'tti':
        return value < 3800 ? 'text-green-500' : value < 7300 ? 'text-yellow-500' : 'text-red-500';
      case 'ttfb':
        return value < 100 ? 'text-green-500' : value < 300 ? 'text-yellow-500' : 'text-red-500';
      default:
        return 'text-gray-400';
    }
  };
  
  return (
    <div 
      className={`fixed bottom-0 right-0 m-4 bg-white border border-gray-200 rounded-lg shadow-lg z-50 transition-all ${className}`}
      style={{ maxWidth: isCollapsed ? '240px' : '600px', maxHeight: isCollapsed ? '40px' : '80vh', overflow: 'hidden' }}
    >
      <div 
        className="flex items-center justify-between p-2 bg-gray-100 cursor-pointer"
        onClick={() => setIsCollapsed(!isCollapsed)}
      >
        <h3 className="text-sm font-semibold flex items-center">
          <svg 
            className="w-4 h-4 mr-1" 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24" 
            xmlns="http://www.w3.org/2000/svg"
          >
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              strokeWidth={2} 
              d="M13 10V3L4 14h7v7l9-11h-7z" 
            />
          </svg>
          Performance Metrics
        </h3>
        <svg 
          className={`w-4 h-4 transition-transform ${isCollapsed ? 'rotate-0' : 'rotate-180'}`} 
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24" 
          xmlns="http://www.w3.org/2000/svg"
        >
          <path 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            strokeWidth={2} 
            d="M19 9l-7 7-7-7" 
          />
        </svg>
      </div>
      
      {!isCollapsed && (
        <div className="p-4 overflow-y-auto max-h-[calc(80vh-40px)]">
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <h4 className="text-xs font-medium text-gray-500 mb-1">First Contentful Paint (FCP)</h4>
              <p className={`text-lg font-bold ${getColorClass('fcp', metrics.fcp)}`}>
                {formatTime(metrics.fcp)}
              </p>
            </div>
            
            <div>
              <h4 className="text-xs font-medium text-gray-500 mb-1">Largest Contentful Paint (LCP)</h4>
              <p className={`text-lg font-bold ${getColorClass('lcp', metrics.lcp)}`}>
                {formatTime(metrics.lcp)}
              </p>
            </div>
            
            <div>
              <h4 className="text-xs font-medium text-gray-500 mb-1">First Input Delay (FID)</h4>
              <p className={`text-lg font-bold ${getColorClass('fid', metrics.fid)}`}>
                {formatTime(metrics.fid)}
              </p>
            </div>
            
            <div>
              <h4 className="text-xs font-medium text-gray-500 mb-1">Cumulative Layout Shift (CLS)</h4>
              <p className={`text-lg font-bold ${getColorClass('cls', metrics.cls)}`}>
                {metrics.cls === null ? 'Measuring...' : metrics.cls.toFixed(3)}
              </p>
            </div>
            
            <div>
              <h4 className="text-xs font-medium text-gray-500 mb-1">Time to Interactive (TTI)</h4>
              <p className={`text-lg font-bold ${getColorClass('tti', metrics.tti)}`}>
                {formatTime(metrics.tti)}
              </p>
            </div>
            
            <div>
              <h4 className="text-xs font-medium text-gray-500 mb-1">Time to First Byte (TTFB)</h4>
              <p className={`text-lg font-bold ${getColorClass('ttfb', metrics.ttfb)}`}>
                {formatTime(metrics.ttfb)}
              </p>
            </div>
          </div>
          
          <h4 className="text-sm font-medium mb-2 mt-4">Performance Timeline</h4>
          <div className="text-xs max-h-40 overflow-y-auto border border-gray-200 rounded">
            {timelineEntries.length === 0 ? (
              <p className="p-2 text-gray-500">No entries yet...</p>
            ) : (
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Type</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Name</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Time</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Duration</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {timelineEntries
                    .sort((a, b) => a.timestamp - b.timestamp)
                    .slice(0, 50) // Limit to 50 entries
                    .map((entry, index) => (
                      <tr key={index} className="hover:bg-gray-50">
                        <td className="px-3 py-1">{entry.type}</td>
                        <td className="px-3 py-1 truncate max-w-[150px]">{entry.name}</td>
                        <td className="px-3 py-1">{entry.timestamp.toFixed(0)}ms</td>
                        <td className="px-3 py-1">{entry.duration > 0 ? `${entry.duration.toFixed(1)}ms` : '-'}</td>
                      </tr>
                    ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

/**
 * Hook for tracking web vital metrics
 * 
 * @param reportToMonitoring Whether to report metrics to the monitoring service
 * @returns Current web vital metrics
 */
export function useWebVitals(reportToMonitoring = true): WebVitalMetrics {
  const [metrics, setMetrics] = useState<WebVitalMetrics>({
    fcp: null,
    lcp: null,
    fid: null,
    cls: null,
    tti: null,
    ttfb: null
  });
  
  useEffect(() => {
    // Check if browser environment and performance API is supported
    if (typeof window === 'undefined' || !window.performance) {
      return;
    }
    
    // Create a hidden performance monitor that will update our metrics
    const handleMetricsCollected = (updatedMetrics: WebVitalMetrics) => {
      setMetrics(updatedMetrics);
    };
    
    // Use the PerformanceMonitor component logic but without rendering UI
    const cleanupFn = () => {
      // This will be populated by the function below
    };
    
    let cleanup: () => void = cleanupFn;
    
    // Dynamically import the web-vitals library if available
    import('web-vitals').then((webVitals) => {
      // Use the web-vitals library for more accurate measurements
      webVitals.onFCP((metric) => {
        setMetrics(prev => ({ ...prev, fcp: metric.value }));
        
        if (reportToMonitoring) {
          MonitoringService.trackMetric({
            name: 'fcp',
            value: metric.value,
            unit: 'ms',
            tags: ['performance', 'web_vitals']
          });
        }
      });
      
      webVitals.onLCP((metric) => {
        setMetrics(prev => ({ ...prev, lcp: metric.value }));
        
        if (reportToMonitoring) {
          MonitoringService.trackMetric({
            name: 'lcp',
            value: metric.value,
            unit: 'ms',
            tags: ['performance', 'web_vitals']
          });
        }
      });
      
      webVitals.onFID((metric) => {
        setMetrics(prev => ({ ...prev, fid: metric.value }));
        
        if (reportToMonitoring) {
          MonitoringService.trackMetric({
            name: 'fid',
            value: metric.value,
            unit: 'ms',
            tags: ['performance', 'web_vitals']
          });
        }
      });
      
      webVitals.onCLS((metric) => {
        setMetrics(prev => ({ ...prev, cls: metric.value }));
        
        if (reportToMonitoring) {
          MonitoringService.trackMetric({
            name: 'cls',
            value: metric.value,
            unit: '',
            tags: ['performance', 'web_vitals']
          });
        }
      });
      
      webVitals.onTTFB((metric) => {
        setMetrics(prev => ({ ...prev, ttfb: metric.value }));
        
        if (reportToMonitoring) {
          MonitoringService.trackMetric({
            name: 'ttfb',
            value: metric.value,
            unit: 'ms',
            tags: ['performance', 'web_vitals']
          });
        }
      });
    }).catch(() => {
      // Fallback to PerformanceObserver if web-vitals library is not available
      cleanup = monitorPerformanceWithObserver(setMetrics, reportToMonitoring);
    });
    
    return () => {
      cleanup();
    };
  }, [reportToMonitoring]);
  
  return metrics;
}

/**
 * Monitor performance using PerformanceObserver
 * This is a fallback if the web-vitals library is not available
 * 
 * @param setMetrics Function to update metrics state
 * @param reportToMonitoring Whether to report metrics to monitoring service
 * @returns Cleanup function
 */
function monitorPerformanceWithObserver(
  setMetrics: React.Dispatch<React.SetStateAction<WebVitalMetrics>>,
  reportToMonitoring: boolean
): () => void {
  // Skip if not in browser or performance API not supported
  if (typeof window === 'undefined' || !window.performance || !('PerformanceObserver' in window)) {
    return () => {};
  }
  
  const { performance } = window;
  const observers: PerformanceObserver[] = [];
  
  // Track TTFB (Time to First Byte)
  const trackTTFB = () => {
    const navigationEntries = performance.getEntriesByType('navigation');
    if (navigationEntries.length > 0) {
      const navEntry = navigationEntries[0] as PerformanceNavigationTiming;
      const ttfb = navEntry.responseStart;
      
      setMetrics(prev => ({ ...prev, ttfb }));
      
      if (reportToMonitoring) {
        MonitoringService.trackMetric({
          name: 'ttfb',
          value: ttfb,
          unit: 'ms',
          tags: ['performance', 'web_vitals']
        });
      }
    }
  };
  
  // Track FCP (First Contentful Paint)
  try {
    const fcpObserver = new PerformanceObserver((entryList) => {
      const entries = entryList.getEntries();
      if (entries.length > 0) {
        const fcp = entries[0].startTime;
        
        setMetrics(prev => ({ ...prev, fcp }));
        
        if (reportToMonitoring) {
          MonitoringService.trackMetric({
            name: 'fcp',
            value: fcp,
            unit: 'ms',
            tags: ['performance', 'web_vitals']
          });
        }
      }
    });
    
    fcpObserver.observe({ type: 'paint', buffered: true });
    observers.push(fcpObserver);
  } catch (error) {
    console.error('Error setting up FCP observer:', error);
  }
  
  // Track LCP (Largest Contentful Paint)
  try {
    const lcpObserver = new PerformanceObserver((entryList) => {
      const entries = entryList.getEntries();
      if (entries.length > 0) {
        const mostRecentEntry = entries[entries.length - 1];
        const lcp = mostRecentEntry.startTime;
        
        setMetrics(prev => ({ ...prev, lcp }));
        
        if (reportToMonitoring) {
          MonitoringService.trackMetric({
            name: 'lcp',
            value: lcp,
            unit: 'ms',
            tags: ['performance', 'web_vitals']
          });
        }
      }
    });
    
    lcpObserver.observe({ type: 'largest-contentful-paint', buffered: true });
    observers.push(lcpObserver);
  } catch (error) {
    console.error('Error setting up LCP observer:', error);
  }
  
  // Track FID (First Input Delay)
  try {
    const fidObserver = new PerformanceObserver((entryList) => {
      const entries = entryList.getEntries();
      if (entries.length > 0) {
        const firstInput = entries[0];
        const fid = firstInput.processingStart - firstInput.startTime;
        
        setMetrics(prev => ({ ...prev, fid }));
        
        if (reportToMonitoring) {
          MonitoringService.trackMetric({
            name: 'fid',
            value: fid,
            unit: 'ms',
            tags: ['performance', 'web_vitals']
          });
        }
      }
    });
    
    fidObserver.observe({ type: 'first-input', buffered: true });
    observers.push(fidObserver);
  } catch (error) {
    console.error('Error setting up FID observer:', error);
  }
  
  // Track CLS (Cumulative Layout Shift)
  try {
    let cumulativeLayoutShift = 0;
    const clsObserver = new PerformanceObserver((entryList) => {
      for (const entry of entryList.getEntries()) {
        // Only count layout shifts without recent user input
        if (!(entry as any).hadRecentInput) {
          cumulativeLayoutShift += (entry as any).value;
          
          const cls = cumulativeLayoutShift;
          setMetrics(prev => ({ ...prev, cls }));
          
          if (reportToMonitoring) {
            MonitoringService.trackMetric({
              name: 'cls',
              value: cls,
              unit: '',
              tags: ['performance', 'web_vitals']
            });
          }
        }
      }
    });
    
    clsObserver.observe({ type: 'layout-shift', buffered: true });
    observers.push(clsObserver);
  } catch (error) {
    console.error('Error setting up CLS observer:', error);
  }
  
  // Track TTFB immediately
  trackTTFB();
  
  // Track Time to Interactive when the page is fully loaded
  const loadHandler = () => {
    setTimeout(() => {
      const navEntries = performance.getEntriesByType('navigation');
      if (navEntries.length > 0) {
        const navEntry = navEntries[0] as PerformanceNavigationTiming;
        
        // Approximate TTI as DOMContentLoaded + a small buffer
        const tti = navEntry.domContentLoadedEventEnd + 100;
        
        setMetrics(prev => ({ ...prev, tti }));
        
        if (reportToMonitoring) {
          MonitoringService.trackMetric({
            name: 'tti',
            value: tti,
            unit: 'ms',
            tags: ['performance', 'web_vitals']
          });
        }
      }
    }, 500);
  };
  
  window.addEventListener('load', loadHandler);
  
  // Return cleanup function
  return () => {
    observers.forEach(observer => {
      try {
        observer.disconnect();
      } catch (error) {
        console.error('Error disconnecting observer:', error);
      }
    });
    
    window.removeEventListener('load', loadHandler);
  };
} 