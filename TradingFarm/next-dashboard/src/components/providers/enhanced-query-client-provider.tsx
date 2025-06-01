'use client';

import React, { useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { createReconnectingWebSocket } from '@/utils/react-query/websocket-integration';
import { queryCacheConfig } from '@/utils/react-query/enhanced-cache-config';
import { setupQueryPerformanceMonitoring } from '@/utils/react-query/performance-monitor';
import { setupWebSocketValidation } from '@/utils/react-query/websocket-validation';
import { RequestManager } from '@/utils/react-query/request-manager';
import { Env } from '@/utils/environment';

interface EnhancedQueryClientProviderProps {
  children: React.ReactNode;
  webSocketUrl?: string;
  enablePerformanceMonitoring?: boolean;
  enableWebSocketValidation?: boolean;
}

/**
 * Enhanced QueryClient Provider with integrated performance monitoring,
 * WebSocket connectivity, and improved caching strategies.
 */
export function EnhancedQueryClientProvider({
  children,
  webSocketUrl = process.env.NEXT_PUBLIC_WS_URL,
  enablePerformanceMonitoring = Env.isDevelopment,
  enableWebSocketValidation = Env.isDevelopment,
}: EnhancedQueryClientProviderProps) {
  // Create a client instance that persists across renders
  const [queryClient] = useState(() => {
    // Initialize the QueryClient with enhanced cache configuration
    const client = new QueryClient({
      defaultOptions: queryCacheConfig.defaultOptions,
    });

    // Set up WebSocket integration if URL is provided
    if (webSocketUrl) {
      const wsConnection = createReconnectingWebSocket(webSocketUrl, client);
      wsConnection.connect();
    }

    // Set up performance monitoring
    if (enablePerformanceMonitoring) {
      setupQueryPerformanceMonitoring(client);
    }

    // Set up WebSocket validation
    if (enableWebSocketValidation && webSocketUrl) {
      setupWebSocketValidation(client);
    }

    // Handle route changes for request cancellation
    if (typeof window !== 'undefined') {
      // Set up navigation event listeners for cancelling requests
      const handleRouteChange = () => {
        RequestManager.cancelAllRequests('Navigation: Cancelling in-flight requests');
      };

      window.addEventListener('beforeunload', handleRouteChange);
      
      // For Next.js route changes
      document.addEventListener('nextjs:beforeHistoryChange', handleRouteChange);
    }

    return client;
  });

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      {Env.isDevelopment && <ReactQueryDevtools initialIsOpen={false} />}
    </QueryClientProvider>
  );
}
