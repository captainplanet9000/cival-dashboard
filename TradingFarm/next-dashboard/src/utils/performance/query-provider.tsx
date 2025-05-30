'use client';

import React, { useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { measureAsync } from './performance-monitor';

/**
 * Custom React Query Provider with integrated performance monitoring
 * and optimized settings for Trading Farm dashboard.
 */
export function TradingQueryProvider({ 
  children 
}: { 
  children: React.ReactNode 
}) {
  // Create a client with performance-optimized settings
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        // Optimize refetching behavior for trading data
        refetchOnWindowFocus: false,
        refetchOnMount: true,
        refetchOnReconnect: true,
        staleTime: 30 * 1000, // 30 seconds before data is considered stale
        cacheTime: 5 * 60 * 1000, // 5 minutes cache retention
        retry: 2,
        retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 30000),
        
        // Wrap query function with performance monitoring
        queryFn: async (context) => {
          const originalFn = context.queryFn;
          if (!originalFn) {
            throw new Error('Query function is required');
          }
          
          return measureAsync(
            () => originalFn(context),
            `Query-${context.queryKey.join('-')}`,
            'data-fetch',
            { queryKey: context.queryKey }
          );
        }
      },
      mutations: {
        retry: 1,
        retryDelay: 1000,
        // Optimistic updates are handled on a case-by-case basis
      },
    },
  }));

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      {process.env.NODE_ENV === 'development' && (
        <ReactQueryDevtools initialIsOpen={false} position="bottom-right" />
      )}
    </QueryClientProvider>
  );
}
