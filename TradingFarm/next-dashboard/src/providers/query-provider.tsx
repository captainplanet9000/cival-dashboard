'use client';

import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

type QueryProviderProps = {
  children: React.ReactNode;
};

/**
 * React Query provider for managing server state
 * This component sets up the QueryClient and wraps the application with QueryClientProvider
 */
export function QueryProvider({ children }: QueryProviderProps) {
  const [queryClient] = React.useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        // Global query options
        staleTime: 1000 * 60, // 1 minute
        gcTime: 1000 * 60 * 5, // 5 minutes
        refetchOnWindowFocus: true,
        retry: 1,
      },
      mutations: {
        // Global mutation options
        retry: 1,
      },
    },
  }));

  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
}
