'use client';

import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';

/**
 * Default stale time for queries (5 minutes)
 */
const DEFAULT_STALE_TIME = 1000 * 60 * 5;

/**
 * Create a client
 */
function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        // Default query options
        staleTime: DEFAULT_STALE_TIME,
        refetchOnWindowFocus: process.env.NODE_ENV === 'production',
        retry: 1,
      },
      mutations: {
        // Default mutation options
        retry: false,
      },
    },
  });
}

let clientSingleton: QueryClient | undefined = undefined;

/**
 * Get the query client (singleton)
 */
function getQueryClient() {
  if (typeof window === 'undefined') {
    // Server: always make a new client
    return makeQueryClient();
  }
  
  // Browser: use singleton pattern for client
  return (clientSingleton = clientSingleton || makeQueryClient());
}

/**
 * React Query Provider component
 */
export function ReactQueryProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = React.useState(getQueryClient);

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      {process.env.NODE_ENV !== 'production' && <ReactQueryDevtools initialIsOpen={false} />}
    </QueryClientProvider>
  );
}
