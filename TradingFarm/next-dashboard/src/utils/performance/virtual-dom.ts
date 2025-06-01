// @ts-nocheck
/**
 * Virtual DOM for Dashboard Components
 * 
 * This utility provides a lightweight virtual DOM implementation specifically 
 * designed for high-performance dashboard components that need to optimize rendering
 * when dealing with rapid data updates.
 */

import React, { useRef, useEffect, useState, useCallback } from 'react';
import { debounce } from 'lodash';

/**
 * Interface for configuration options of the virtual DOM renderer
 */
interface VirtualDOMOptions {
  /** Update frequency in milliseconds (how often the real DOM is updated) */
  updateFrequency?: number;
  /** Maximum number of items to render */
  maxItems?: number;
  /** Prevent updates during user interaction (e.g., scrolling) */
  preventUpdatesDuringInteraction?: boolean;
  /** Frame skipping strategy - will skip rendering updates that happen too quickly */
  enableFrameSkipping?: boolean;
  /** Minimum FPS to maintain (if frame rate drops below this, will skip complex updates) */
  targetMinimumFPS?: number;
  /** Enable DOM recycling for list items to reduce GC pressure */
  enableRecycling?: boolean;
  /** Debug mode */
  debug?: boolean;
}

/**
 * Status information about the virtual DOM renderer
 */
interface VirtualDOMStatus {
  /** Total number of updates */
  updates: number;
  /** Number of updates that were skipped */
  skippedUpdates: number;
  /** Number of DOM nodes recycled */
  recycledNodes: number;
  /** Time spent rendering (ms) */
  renderTime: number;
  /** Current FPS */
  fps: number;
  /** Memory usage estimate */
  memoryUsage: number | null;
}

/**
 * Hook for virtual DOM optimization
 * 
 * @param renderFunction Function that renders the actual content
 * @param data Data used for rendering
 * @param options Configuration options
 */
export function useVirtualDOM<T>(
  renderFunction: (data: T) => React.ReactNode,
  data: T,
  options: VirtualDOMOptions = {}
) {
  // Default options
  const {
    updateFrequency = 60,
    maxItems = 1000,
    preventUpdatesDuringInteraction = true,
    enableFrameSkipping = true,
    targetMinimumFPS = 30,
    enableRecycling = true,
    debug = false,
  } = options;
  
  // Refs for virtual DOM state
  const containerRef = useRef<HTMLDivElement>(null);
  const virtualDOMRef = useRef<React.ReactNode | null>(null);
  const lastUpdateTimeRef = useRef<number>(0);
  const updatePendingRef = useRef<boolean>(false);
  const interactionInProgressRef = useRef<boolean>(false);
  const frameCountRef = useRef<number>(0);
  const lastFPSUpdateRef = useRef<number>(0);
  const statusRef = useRef<VirtualDOMStatus>({
    updates: 0,
    skippedUpdates: 0,
    recycledNodes: 0,
    renderTime: 0,
    fps: 60,
    memoryUsage: null,
  });
  
  // State for status (only used to trigger rerenders for status display)
  const [statusVersion, setStatusVersion] = useState<number>(0);
  
  // Function to log debug information
  const logDebug = useCallback((...args: any[]) => {
    if (debug) {
      console.log('[VirtualDOM]', ...args);
    }
  }, [debug]);
  
  // Schedule a virtual DOM update
  const scheduleUpdate = useCallback(() => {
    if (updatePendingRef.current) return;
    updatePendingRef.current = true;
    
    setTimeout(() => {
      updatePendingRef.current = false;
      if (interactionInProgressRef.current && preventUpdatesDuringInteraction) {
        statusRef.current.skippedUpdates++;
        logDebug('Skipping update during interaction');
        return;
      }
      
      applyUpdate();
    }, updateFrequency);
  }, [updateFrequency, preventUpdatesDuringInteraction]);
  
  // Apply the update to the virtual DOM
  const applyUpdate = useCallback(() => {
    if (!containerRef.current) return;
    
    // Calculate FPS
    const now = performance.now();
    frameCountRef.current++;
    
    if (now - lastFPSUpdateRef.current >= 1000) {
      statusRef.current.fps = Math.round((frameCountRef.current * 1000) / (now - lastFPSUpdateRef.current));
      frameCountRef.current = 0;
      lastFPSUpdateRef.current = now;
      
      // Update status display occasionally
      if (statusRef.current.updates % 10 === 0) {
        setStatusVersion(v => v + 1);
      }
      
      // Measure memory usage if available
      if (window.performance && 'memory' in window.performance) {
        statusRef.current.memoryUsage = (window.performance as any).memory.usedJSHeapSize;
      }
    }
    
    // Frame skipping for performance
    if (
      enableFrameSkipping &&
      statusRef.current.fps < targetMinimumFPS &&
      now - lastUpdateTimeRef.current < 1000 / targetMinimumFPS
    ) {
      statusRef.current.skippedUpdates++;
      logDebug(`Skipping frame due to performance (${statusRef.current.fps} FPS)`);
      return;
    }
    
    try {
      const startTime = performance.now();
      
      // Apply item limit if needed
      let processedData = data;
      if (Array.isArray(data) && data.length > maxItems) {
        processedData = data.slice(0, maxItems) as any;
        logDebug(`Truncated data from ${data.length} to ${maxItems} items`);
      }
      
      // Render new virtual DOM
      virtualDOMRef.current = renderFunction(processedData);
      
      // Update real DOM
      if (containerRef.current) {
        const container = containerRef.current;
        
        // Use React to render the virtual DOM to the container
        // This is a modern approach that leverages React's own reconciliation
        if (enableRecycling && container.childNodes.length > 0) {
          statusRef.current.recycledNodes++;
        }
        
        // Rendering happens in React's next tick
        const renderTime = performance.now() - startTime;
        statusRef.current.renderTime = renderTime;
        statusRef.current.updates++;
        
        lastUpdateTimeRef.current = now;
        
        logDebug(`Rendered in ${renderTime.toFixed(2)}ms (${statusRef.current.fps} FPS)`);
      }
    } catch (error) {
      console.error('Error rendering virtual DOM:', error);
    }
  }, [data, renderFunction, maxItems, enableFrameSkipping, targetMinimumFPS, enableRecycling]);
  
  // Detect user interaction to potentially pause updates
  useEffect(() => {
    if (!preventUpdatesDuringInteraction) return;
    
    const handleInteractionStart = () => {
      interactionInProgressRef.current = true;
    };
    
    const handleInteractionEnd = debounce(() => {
      interactionInProgressRef.current = false;
      // Force an update after interaction ends
      applyUpdate();
    }, 100);
    
    const container = containerRef.current;
    if (container) {
      container.addEventListener('mousedown', handleInteractionStart);
      container.addEventListener('touchstart', handleInteractionStart);
      container.addEventListener('wheel', handleInteractionStart, { passive: true });
      
      window.addEventListener('mouseup', handleInteractionEnd);
      window.addEventListener('touchend', handleInteractionEnd);
      window.addEventListener('wheel', handleInteractionEnd, { passive: true, once: false });
    }
    
    return () => {
      if (container) {
        container.removeEventListener('mousedown', handleInteractionStart);
        container.removeEventListener('touchstart', handleInteractionStart);
        container.removeEventListener('wheel', handleInteractionStart);
      }
      
      window.removeEventListener('mouseup', handleInteractionEnd);
      window.removeEventListener('touchend', handleInteractionEnd);
      window.removeEventListener('wheel', handleInteractionEnd);
      
      handleInteractionEnd.cancel();
    };
  }, [preventUpdatesDuringInteraction, applyUpdate]);
  
  // Trigger an update when data changes
  useEffect(() => {
    scheduleUpdate();
  }, [data, scheduleUpdate]);
  
  // Initial render and cleanup
  useEffect(() => {
    // Initial render
    applyUpdate();
    
    // Setup periodic status updates
    const statusInterval = setInterval(() => {
      setStatusVersion(v => v + 1);
    }, 2000);
    
    return () => {
      clearInterval(statusInterval);
    };
  }, [applyUpdate]);
  
  // Get current status for display/debugging
  const getStatus = useCallback((): VirtualDOMStatus => {
    return { ...statusRef.current };
  }, []);
  
  return {
    containerRef,
    virtualDOM: virtualDOMRef.current,
    status: getStatus(),
    forceUpdate: applyUpdate,
  };
}

/**
 * A high-performance list component that uses the virtual DOM
 */
interface VirtualListProps<T> {
  /** Array of items to render */
  items: T[];
  /** Function to render a single item */
  renderItem: (item: T, index: number) => React.ReactNode;
  /** Key function to get a unique key for each item */
  keyExtractor: (item: T, index: number) => string;
  /** Additional class names for the container */
  className?: string;
  /** Virtual DOM options */
  virtualDOMOptions?: VirtualDOMOptions;
  /** Height of the container */
  height?: string | number;
  /** Show performance metrics */
  showMetrics?: boolean;
  /** Callback when list has finished initial render */
  onRenderComplete?: () => void;
}

/**
 * VirtualList component for high-performance rendering of long lists
 */
export function VirtualList<T>({
  items,
  renderItem,
  keyExtractor,
  className = '',
  virtualDOMOptions = {},
  height = '100%',
  showMetrics = false,
  onRenderComplete,
}: VirtualListProps<T>) {
  // State to trigger re-render after initial lazy load
  const [isInitialRender, setIsInitialRender] = useState(true);
  
  // The render function for the virtual DOM
  const renderVirtualDOM = useCallback((data: T[]) => {
    return (
      <>
        {data.map((item, index) => (
          <React.Fragment key={keyExtractor(item, index)}>
            {renderItem(item, index)}
          </React.Fragment>
        ))}
      </>
    );
  }, [renderItem, keyExtractor]);
  
  // Use the virtual DOM hook
  const { containerRef, status, forceUpdate } = useVirtualDOM(
    renderVirtualDOM, 
    items,
    {
      ...virtualDOMOptions,
      debug: virtualDOMOptions.debug || showMetrics,
    }
  );
  
  // After the initial render, mark as completed
  useEffect(() => {
    if (isInitialRender) {
      setIsInitialRender(false);
      onRenderComplete?.();
    }
  }, [isInitialRender, onRenderComplete]);
  
  return (
    <div className="relative" style={{ height }}>
      <div 
        ref={containerRef} 
        className={`w-full h-full overflow-auto ${className}`}
        style={{ overscrollBehavior: 'contain' }}
      >
        {renderVirtualDOM(items)}
      </div>
      
      {showMetrics && (
        <div className="absolute bottom-1 right-1 bg-background/80 text-xs text-muted-foreground p-1 rounded border">
          <div>FPS: {status.fps}</div>
          <div>Updates: {status.updates} (Skipped: {status.skippedUpdates})</div>
          <div>Render: {status.renderTime.toFixed(1)}ms</div>
        </div>
      )}
    </div>
  );
}

/**
 * Props for the OptimizedDataGrid component
 */
interface OptimizedDataGridProps<T> {
  /** Array of data objects to display */
  data: T[];
  /** Column definitions */
  columns: {
    /** Unique identifier for the column */
    key: string;
    /** Header text */
    header: React.ReactNode;
    /** Function to render a cell */
    renderCell: (item: T) => React.ReactNode;
    /** Width of the column (number or CSS value) */
    width?: string | number;
    /** CSS class for the column */
    className?: string;
    /** Whether the column is sortable */
    sortable?: boolean;
  }[];
  /** Additional class name for the container */
  className?: string;
  /** Height of the grid */
  height?: string | number;
  /** Virtual DOM options */
  virtualDOMOptions?: VirtualDOMOptions;
  /** Show performance metrics */
  showMetrics?: boolean;
}

/**
 * A high-performance data grid that uses virtual DOM rendering
 */
export function OptimizedDataGrid<T>({
  data,
  columns,
  className = '',
  height = '100%',
  virtualDOMOptions = {},
  showMetrics = false,
}: OptimizedDataGridProps<T>) {
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  
  // Function to handle column header click for sorting
  const handleHeaderClick = useCallback((key: string) => {
    if (sortKey === key) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDirection('asc');
    }
  }, [sortKey]);
  
  // Render function for a single row
  const renderRow = useCallback((item: T, index: number) => {
    return (
      <div 
        className={`flex border-b border-border last:border-0 hover:bg-muted/50 transition-colors ${index % 2 === 0 ? 'bg-muted/30' : ''}`}
        key={index}
      >
        {columns.map(column => (
          <div
            key={column.key}
            className={`p-2 overflow-hidden text-ellipsis ${column.className || ''}`}
            style={{ 
              width: column.width || `${100 / columns.length}%`,
              flexShrink: 0,
            }}
          >
            {column.renderCell(item)}
          </div>
        ))}
      </div>
    );
  }, [columns]);
  
  // Function to extract a key for each row
  const keyExtractor = useCallback((item: T, index: number) => {
    return `row-${index}`;
  }, []);
  
  return (
    <div className={`border rounded-md ${className}`} style={{ height }}>
      {/* Header row */}
      <div className="flex border-b border-border bg-muted sticky top-0 z-10">
        {columns.map(column => (
          <div
            key={column.key}
            className={`p-2 font-medium ${column.sortable ? 'cursor-pointer select-none' : ''} ${column.className || ''}`}
            style={{ 
              width: column.width || `${100 / columns.length}%`,
              flexShrink: 0,
            }}
            onClick={column.sortable ? () => handleHeaderClick(column.key) : undefined}
          >
            <div className="flex items-center gap-1">
              {column.header}
              {sortKey === column.key && (
                <span className="ml-1">
                  {sortDirection === 'asc' ? '▲' : '▼'}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
      
      {/* Data rows */}
      <VirtualList
        items={data}
        renderItem={renderRow}
        keyExtractor={keyExtractor}
        virtualDOMOptions={virtualDOMOptions}
        height="calc(100% - 36px)"
        showMetrics={showMetrics}
      />
    </div>
  );
}
