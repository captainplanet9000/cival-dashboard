'use client';

import React, { useState, useEffect } from 'react';
import { 
  QueryClientProvider as TanstackQueryClientProvider,
  QueryClient
} from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { createConfiguredQueryClient } from '@/utils/react-query/cache-config';
import { setupNavigationCancellation } from '@/utils/react-query/request-manager';
import { createReconnectingWebSocket } from '@/utils/react-query/websocket-integration';

interface QueryClientProviderProps {
  children: React.ReactNode;
  enableDevTools?: boolean;
  enableWebsockets?: boolean;
  websocketUrl?: string;
  aggressiveCaching?: boolean;
}

export function QueryClientProvider({
  children,
  enableDevTools = process.env.NODE_ENV === 'development',
  enableWebsockets = true,
  websocketUrl = process.env.NEXT_PUBLIC_WS_URL || 'wss://api.tradingfarm.io/ws',
  aggressiveCaching = false,
}: QueryClientProviderProps) {
  // Create a client with Trading Farm specific configuration
  const [queryClient] = useState(() => createConfiguredQueryClient({
    environment: process.env.NODE_ENV === 'production' ? 'production' : 'development',
    enableLogging: process.env.NODE_ENV === 'development',
    aggressiveCaching,
  }));
  
  // Set up WebSocket connection if enabled
  useEffect(() => {
    if (!enableWebsockets) return;
    
    // Create WebSocket connection
    const wsConnection = createReconnectingWebSocket(websocketUrl, queryClient);
    
    // Connect to WebSocket
    wsConnection.connect();
    
    // Clean up connection when component unmounts
    return () => {
      wsConnection.disconnect();
    };
  }, [enableWebsockets, websocketUrl, queryClient]);
  
  // Set up navigation cancellation for improved performance
  useEffect(() => {
    setupNavigationCancellation(queryClient);
  }, [queryClient]);
  
  return (
    <TanstackQueryClientProvider client={queryClient}>
      {children}
      {enableDevTools && <ReactQueryDevtools initialIsOpen={false} position="bottom" />}
    </TanstackQueryClientProvider>
  );
}
