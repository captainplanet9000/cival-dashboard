/**
 * WebSocket Integration Validation Utility
 * 
 * This utility helps validate that WebSocket events are correctly
 * updating the TanStack Query cache in real-time.
 */

import { QueryClient } from '@tanstack/react-query';
import { Env } from '@/utils/environment';

interface WebSocketValidationConfig {
  logLevel: 'none' | 'errors' | 'verbose';
  captureUpdates: boolean;
  throttleTime: number;
}

interface CacheUpdateEvent {
  timestamp: number;
  source: 'websocket' | 'query' | 'mutation';
  queryKey: unknown[];
  previousData: unknown | null;
  newData: unknown;
}

class WebSocketValidationMonitor {
  private queryClient: QueryClient | null = null;
  private config: WebSocketValidationConfig = {
    logLevel: Env.isDevelopment ? 'verbose' : 'errors',
    captureUpdates: Env.isDevelopment,
    throttleTime: 500, // ms between logging events
  };
  private isEnabled: boolean = false;
  private unsubscribeCache: (() => void) | null = null;
  private logTimeout: NodeJS.Timeout | null = null;
  private pendingLogs: Array<string> = [];
  private cacheUpdates: Array<CacheUpdateEvent> = [];
  private expectedUpdates: Map<string, { createdAt: number, received: boolean }> = new Map();

  /**
   * Initialize the validation monitor
   */
  initialize(queryClient: QueryClient, config?: Partial<WebSocketValidationConfig>): void {
    if (this.queryClient) {
      this.disable();
    }

    this.queryClient = queryClient;
    this.config = { ...this.config, ...config };
    this.cacheUpdates = [];
    this.expectedUpdates = new Map();
  }

  /**
   * Enable validation monitoring
   */
  enable(): void {
    if (!this.queryClient || this.isEnabled) return;

    // Subscribe to query cache changes
    this.unsubscribeCache = this.queryClient.getQueryCache().subscribe((event) => {
      if (event.type === 'queryUpdated' && event.action.type === 'success') {
        this.trackCacheUpdate(event);
      }
    });

    this.isEnabled = true;
    this.log('WebSocket validation monitor enabled', 'info');
  }

  /**
   * Disable validation monitoring
   */
  disable(): void {
    if (!this.isEnabled) return;

    if (this.unsubscribeCache) {
      this.unsubscribeCache();
      this.unsubscribeCache = null;
    }

    if (this.logTimeout) {
      clearTimeout(this.logTimeout);
      this.logTimeout = null;
    }

    this.isEnabled = false;
    this.log('WebSocket validation monitor disabled', 'info');
  }

  /**
   * Track and analyze cache updates
   */
  private trackCacheUpdate(event: any): void {
    if (!event.query) return;

    const queryKey = event.query.queryKey;
    const queryKeyString = JSON.stringify(queryKey);
    const action = event.action || {};
    const previousData = event.query.state.data;
    const newData = action.data;
    
    // Skip if data hasn't actually changed
    if (JSON.stringify(previousData) === JSON.stringify(newData)) {
      return;
    }

    // Determine the update source
    let source: 'websocket' | 'query' | 'mutation' = 'query';
    
    // Check if it's a WebSocket update
    // WebSocket updates typically don't have fetchOptions
    if (!event.query.state.fetchMeta) {
      source = 'websocket';
    } 
    // Mutation updates will have a source tagged in the meta
    else if (event.query.state.fetchMeta?.meta?.source === 'mutation') {
      source = 'mutation';
    }

    // Record the update
    if (this.config.captureUpdates) {
      this.cacheUpdates.push({
        timestamp: Date.now(),
        source,
        queryKey,
        previousData,
        newData,
      });
    }

    // Check if this was an expected update
    if (this.expectedUpdates.has(queryKeyString)) {
      const expected = this.expectedUpdates.get(queryKeyString)!;
      expected.received = true;
      
      this.log(`✅ Received expected WebSocket update for: ${queryKeyString}`, 'info');
      
      // Check timing - should happen reasonably fast
      const responseTime = Date.now() - expected.createdAt;
      if (responseTime > 5000) {
        this.log(`⚠️ WebSocket update was slow: ${responseTime}ms for ${queryKeyString}`, 'warn');
      }
      
      this.expectedUpdates.delete(queryKeyString);
    }
    
    // Log WebSocket updates
    if (source === 'websocket') {
      this.log(`🔄 WebSocket update received for: ${queryKeyString}`, 'info');
    }
  }

  /**
   * Register an expected WebSocket update
   * Call this when sending an API request that should trigger a WebSocket event
   */
  expectWebSocketUpdate(queryKey: unknown[]): void {
    if (!this.isEnabled) return;
    
    const queryKeyString = JSON.stringify(queryKey);
    this.expectedUpdates.set(queryKeyString, {
      createdAt: Date.now(),
      received: false
    });
    
    this.log(`⏳ Expecting WebSocket update for: ${queryKeyString}`, 'info');
    
    // Set a timeout to check if the expected update was received
    setTimeout(() => {
      const expected = this.expectedUpdates.get(queryKeyString);
      if (expected && !expected.received) {
        this.log(`❌ Missing expected WebSocket update for: ${queryKeyString}`, 'error');
        this.expectedUpdates.delete(queryKeyString);
      }
    }, 10000); // Wait 10 seconds before considering it missed
  }

  /**
   * Log validation events with throttling
   */
  private log(message: string, level: 'info' | 'warn' | 'error'): void {
    if (this.config.logLevel === 'none') return;
    if (this.config.logLevel === 'errors' && level !== 'error') return;
    
    // Add log to pending list
    this.pendingLogs.push(`[${level.toUpperCase()}] ${message}`);
    
    // Throttle logging
    if (!this.logTimeout) {
      this.logTimeout = setTimeout(() => {
        this.flushLogs();
        this.logTimeout = null;
      }, this.config.throttleTime);
    }
  }

  /**
   * Flush pending logs to console
   */
  private flushLogs(): void {
    if (this.pendingLogs.length === 0) return;
    
    console.group('🌐 WebSocket Validation');
    
    this.pendingLogs.forEach(log => {
      if (log.includes('[ERROR]')) {
        console.error(log);
      } else if (log.includes('[WARN]')) {
        console.warn(log);
      } else {
        console.info(log);
      }
    });
    
    console.groupEnd();
    
    this.pendingLogs = [];
  }

  /**
   * Get validation status report
   */
  getReport() {
    const pendingExpectations = Array.from(this.expectedUpdates.entries())
      .filter(([_, value]) => !value.received)
      .map(([key]) => key);
    
    const wsUpdates = this.cacheUpdates.filter(u => u.source === 'websocket');
    const queryUpdates = this.cacheUpdates.filter(u => u.source === 'query');
    const mutationUpdates = this.cacheUpdates.filter(u => u.source === 'mutation');
    
    return {
      isEnabled: this.isEnabled,
      updatesReceived: {
        total: this.cacheUpdates.length,
        websocket: wsUpdates.length,
        query: queryUpdates.length,
        mutation: mutationUpdates.length,
      },
      pendingExpectations: pendingExpectations.length,
      recentCacheUpdates: this.cacheUpdates.slice(-10),
    };
  }

  /**
   * Reset tracking state
   */
  reset(): void {
    this.cacheUpdates = [];
    this.expectedUpdates.clear();
    this.pendingLogs = [];
  }
}

// Singleton instance
export const webSocketValidation = new WebSocketValidationMonitor();

/**
 * Set up the WebSocket validation monitor
 */
export function setupWebSocketValidation(queryClient: QueryClient): void {
  webSocketValidation.initialize(queryClient, {
    logLevel: Env.isDevelopment ? 'verbose' : 'errors',
    captureUpdates: true,
    throttleTime: 500,
  });
  
  if (Env.isDevelopment) {
    webSocketValidation.enable();
  }
}

/**
 * Helper to expect a WebSocket update after a mutation
 */
export function expectWebSocketUpdateAfterMutation(
  queryKey: unknown[], 
  mutationFn: () => Promise<any>
): Promise<any> {
  webSocketValidation.expectWebSocketUpdate(queryKey);
  return mutationFn();
}
