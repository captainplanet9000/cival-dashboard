import { QueryClient } from '@tanstack/react-query';

// Create a client with default configuration
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Default configuration for all queries
      staleTime: 1000 * 60, // 1 minute
      gcTime: 1000 * 60 * 10, // 10 minutes
      retry: 1,
      refetchOnWindowFocus: import.meta.env.PROD, // Only in production
    },
  },
});
