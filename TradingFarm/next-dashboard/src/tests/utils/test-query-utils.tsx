import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render } from '@testing-library/react';

/**
 * Creates a wrapper component for testing TanStack Query hooks
 * Provides a fresh QueryClient instance for each test
 */
export function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        // Turn off auto refetching for tests
        staleTime: Infinity,
        // Don't retry failed queries in tests
        retry: false,
        // Disable caching for tests
        gcTime: Infinity,
      },
    },
    // Silence logs during tests
    logger: {
      log: console.log,
      warn: console.warn,
      error: process.env.NODE_ENV === 'test' ? () => {} : console.error,
    },
  });
}

/**
 * Wrapper component for testing TanStack Query hooks
 */
export function createWrapper() {
  const testQueryClient = createTestQueryClient();
  
  // Return a component that wraps children with the test query client
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={testQueryClient}>
      {children}
    </QueryClientProvider>
  );
}

/**
 * Custom render function for testing components that use TanStack Query
 * Provides a fresh QueryClient instance for each test
 */
export function renderWithQueryClient(ui: React.ReactElement) {
  const testQueryClient = createTestQueryClient();
  const { rerender, ...result } = render(
    <QueryClientProvider client={testQueryClient}>
      {ui}
    </QueryClientProvider>
  );
  
  // Return a function that allows rerenders with a fresh query client
  return {
    ...result,
    rerender: (rerenderUi: React.ReactElement) =>
      rerender(
        <QueryClientProvider client={testQueryClient}>
          {rerenderUi}
        </QueryClientProvider>
      ),
  };
}

/**
 * Helper function to wait for queries to settle
 * Useful when testing components that make multiple queries
 */
export async function waitForQueries() {
  // Wait a tick for query client to settle
  await new Promise(resolve => setTimeout(resolve, 0));
}

/**
 * Mock query response data for testing
 */
export function createMockQueryData<T>(data: T) {
  return {
    data,
    isLoading: false,
    isError: false,
    isSuccess: true,
    error: null,
    refetch: jest.fn(),
    isFetching: false,
  };
}

/**
 * Mock mutation response data for testing
 */
export function createMockMutationData<T, V = unknown>(data?: T) {
  return {
    data,
    isLoading: false,
    isError: false,
    isSuccess: !!data,
    error: null,
    mutate: jest.fn(),
    mutateAsync: jest.fn().mockResolvedValue(data),
    reset: jest.fn(),
    variables: undefined as V | undefined,
    status: !!data ? 'success' : 'idle',
  };
}
