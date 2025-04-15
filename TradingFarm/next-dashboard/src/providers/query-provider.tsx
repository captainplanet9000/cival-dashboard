'use client';

import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { createReconnectingWebSocket } from '@/utils/react-query/websocket-integration';
import { queryCacheConfig } from '@/utils/react-query/enhanced-cache-config';
import { setupQueryPerformanceMonitoring } from '@/utils/react-query/performance-monitor';
import { setupWebSocketValidation } from '@/utils/react-query/websocket-validation';
import { RequestManager } from '@/utils/react-query/request-manager';

type QueryProviderProps = {
  children: React.ReactNode;
  webSocketUrl?: string;
  enablePerformanceMonitoring?: boolean;
  enableWebSocketValidation?: boolean;
};

/**
 * Enhanced React Query provider for the Trading Farm Dashboard
 * Integrates advanced features like performance monitoring, WebSocket support,
 * request cancellation, and optimized caching strategies.
 */
export function QueryProvider({ 
  children,
  webSocketUrl = process.env.NEXT_PUBLIC_WS_URL,
  enablePerformanceMonitoring = process.env.NODE_ENV === 'development',
  enableWebSocketValidation = process.env.NODE_ENV === 'development',
}: QueryProviderProps) {
  const isDevelopment = process.env.NODE_ENV === 'development';
  
  // Create a QueryClient instance that persists across renders
  const [queryClient] = React.useState(() => {
    // Initialize with enhanced cache configuration
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

    return client;
  });

  // Handle route changes for request cancellation
  React.useEffect(() => {
    if (typeof window === 'undefined') return;
    
    // Set up navigation event listeners for cancelling requests
    const handleRouteChange = () => {
      RequestManager.cancelAllRequests('Navigation: Cancelling in-flight requests');
    };

    window.addEventListener('beforeunload', handleRouteChange);
    
    // For Next.js route changes
    document.addEventListener('nextjs:beforeHistoryChange' as any, handleRouteChange);
    
    return () => {
      window.removeEventListener('beforeunload', handleRouteChange);
      document.removeEventListener('nextjs:beforeHistoryChange' as any, handleRouteChange);
    };
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      {isDevelopment && <ReactQueryDevtools initialIsOpen={false} />}
    </QueryClientProvider>
  );
}
