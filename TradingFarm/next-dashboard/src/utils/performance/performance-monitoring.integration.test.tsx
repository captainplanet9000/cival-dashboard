/**
 * Integration tests for the performance monitoring system
 * Tests the interaction between performance monitoring, React components,
 * and data visualization
 */
import React, { useEffect } from 'react';
import { render, screen, act, waitFor } from '@/utils/test/test-utils';
import { 
  startMeasurement, 
  endMeasurement, 
  recordMetric, 
  getMetrics, 
  clearMetrics 
} from '@/utils/performance/performance-monitor';
import { PerformanceMonitor } from '@/components/performance/perf-monitor';

// Test component that uses performance monitoring
function TestComponent({ name = 'TestComponent', delay = 0 }: { name?: string, delay?: number }) {
  useEffect(() => {
    const measurementId = startMeasurement(`${name}-render`);
    
    if (delay > 0) {
      // Simulate work
      const start = Date.now();
      while (Date.now() - start < delay) {
        // Busy wait to simulate CPU usage
      }
    }
    
    // End the measurement
    endMeasurement(measurementId);
    
    return () => {
      // Record a component unmount metric
      recordMetric(`${name}-unmount`, 'component-lifecycle', 0);
    };
  }, [name, delay]);
  
  return <div data-testid={`test-${name}`}>Performance Test Component</div>;
}

describe('Performance Monitoring Integration', () => {
  beforeEach(() => {
    // Clear all metrics before each test
    clearMetrics();
    
    // Mock performance.now() to ensure consistent timing
    jest.spyOn(performance, 'now')
      .mockImplementation()
      .mockReturnValueOnce(0)
      .mockReturnValueOnce(100); // 100ms elapsed time
  });
  
  afterEach(() => {
    jest.restoreAllMocks();
  });
  
  test('components properly integrate with performance monitoring', async () => {
    // Render a test component that uses performance monitoring
    render(<TestComponent name="IntegrationTest" />);
    
    // Verify the component rendered
    expect(screen.getByTestId('test-IntegrationTest')).toBeInTheDocument();
    
    // Get the recorded metrics
    const metrics = getMetrics();
    
    // There should be at least one metric for the component render
    expect(metrics.length).toBeGreaterThan(0);
    
    // Find the render metric
    const renderMetric = metrics.find(m => m.name === 'IntegrationTest-render');
    expect(renderMetric).toBeDefined();
    expect(renderMetric?.type).toBe('component-render');
    expect(renderMetric?.duration).toBeGreaterThanOrEqual(0);
  });
  
  test('unmounting components records cleanup metrics', async () => {
    const { unmount } = render(<TestComponent name="UnmountTest" />);
    
    // Unmount the component
    unmount();
    
    // Get the recorded metrics
    const metrics = getMetrics();
    
    // Find the unmount metric
    const unmountMetric = metrics.find(m => m.name === 'UnmountTest-unmount');
    expect(unmountMetric).toBeDefined();
    expect(unmountMetric?.type).toBe('component-lifecycle');
  });
  
  test('performance metrics are captured for multiple components', async () => {
    // Render multiple components with different simulated render times
    render(
      <>
        <TestComponent name="Fast" delay={5} />
        <TestComponent name="Medium" delay={20} />
        <TestComponent name="Slow" delay={50} />
      </>
    );
    
    // Get the recorded metrics
    const metrics = getMetrics();
    
    // Should have 3 render metrics, one for each component
    const renderMetrics = metrics.filter(m => m.name.endsWith('-render'));
    expect(renderMetrics.length).toBe(3);
    
    // Find each component's metric
    const fastMetric = metrics.find(m => m.name === 'Fast-render');
    const mediumMetric = metrics.find(m => m.name === 'Medium-render');
    const slowMetric = metrics.find(m => m.name === 'Slow-render');
    
    // Verify metrics exist
    expect(fastMetric).toBeDefined();
    expect(mediumMetric).toBeDefined();
    expect(slowMetric).toBeDefined();
    
    // In a real test environment, we'd check relative performance times
    // But in our mocked environment, we'll just check they exist
  });
  
  test('PerformanceMonitor component renders metrics from the monitoring system', async () => {
    // Pre-populate some metrics
    recordMetric('TestMetric1', 'component-render', 15);
    recordMetric('TestMetric2', 'data-fetch', 150);
    recordMetric('TestMetric3', 'interaction', 5);
    
    // Render the PerformanceMonitor component
    render(<PerformanceMonitor />);
    
    // Check that component renders
    expect(screen.getByText('Performance Monitor')).toBeInTheDocument();
    
    // Verify total metrics count (should be 3)
    expect(screen.getByText('3')).toBeInTheDocument();
    
    // Clicking on Components tab should show component metrics
    act(() => {
      screen.getByRole('tab', { name: 'Components' }).click();
    });
    
    // Should show the component render metric
    await waitFor(() => {
      expect(screen.getByText('Component Render Performance')).toBeInTheDocument();
    });
    
    // Clicking on Data tab should show data fetching metrics
    act(() => {
      screen.getByRole('tab', { name: 'Data Fetching' }).click();
    });
    
    // Should show the data fetch metric
    await waitFor(() => {
      expect(screen.getByText('Data Fetching Performance')).toBeInTheDocument();
      expect(screen.getByText('TestMetric2')).toBeInTheDocument();
    });
  });
  
  test('clearing metrics through the PerformanceMonitor UI works correctly', async () => {
    // Pre-populate some metrics
    recordMetric('ClearTest1', 'component-render', 15);
    recordMetric('ClearTest2', 'data-fetch', 150);
    
    // Render the PerformanceMonitor component
    render(<PerformanceMonitor />);
    
    // Initially should show 2 metrics
    expect(screen.getByText('2')).toBeInTheDocument();
    
    // Mock clearMetrics to track if it was called
    const clearMetricsSpy = jest.spyOn(require('@/utils/performance/performance-monitor'), 'clearMetrics');
    
    // Click the reset button
    act(() => {
      screen.getByText('Reset').click();
    });
    
    // Should have called clearMetrics
    expect(clearMetricsSpy).toHaveBeenCalled();
  });
  
  test('auto-refresh functionality works correctly', async () => {
    jest.useFakeTimers();
    
    // Pre-populate a metric
    recordMetric('AutoRefreshTest', 'component-render', 15);
    
    // Setup a spy to monitor getMetrics calls
    const getMetricsSpy = jest.spyOn(require('@/utils/performance/performance-monitor'), 'getMetrics');
    
    // Render the PerformanceMonitor component
    render(<PerformanceMonitor />);
    
    // Initial metrics fetch
    expect(getMetricsSpy).toHaveBeenCalledTimes(1);
    getMetricsSpy.mockClear();
    
    // Enable auto-refresh
    act(() => {
      screen.getByText('Enable Auto-Refresh').click();
    });
    
    // Text should change
    expect(screen.getByText('Disable Auto-Refresh')).toBeInTheDocument();
    
    // Advance timers by 5 seconds (the auto-refresh interval)
    act(() => {
      jest.advanceTimersByTime(5000);
    });
    
    // Should have fetched metrics again
    expect(getMetricsSpy).toHaveBeenCalledTimes(1);
    
    // Disable auto-refresh
    act(() => {
      screen.getByText('Disable Auto-Refresh').click();
    });
    
    // Text should change back
    expect(screen.getByText('Enable Auto-Refresh')).toBeInTheDocument();
    
    // Clear previous calls
    getMetricsSpy.mockClear();
    
    // Advance timers again
    act(() => {
      jest.advanceTimersByTime(5000);
    });
    
    // Should NOT have fetched metrics since auto-refresh is disabled
    expect(getMetricsSpy).not.toHaveBeenCalled();
    
    jest.useRealTimers();
  });
});
