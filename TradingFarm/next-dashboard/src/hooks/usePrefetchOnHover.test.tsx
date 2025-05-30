import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { usePrefetchOnHover } from '@/hooks/usePrefetchOnHover';
import React from 'react';

// Mock prefetch function
const mockPrefetch = vi.fn();

function TestComponent() {
  const ref = usePrefetchOnHover(mockPrefetch);
  return (
    <button ref={ref} data-testid="hover-btn">
      Hover me
    </button>
  );
}

describe('usePrefetchOnHover', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient();
    mockPrefetch.mockClear();
  });

  it('calls prefetch function on mouse enter', async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <TestComponent />
      </QueryClientProvider>
    );
    const btn = screen.getByTestId('hover-btn');
    fireEvent.mouseEnter(btn);
    await waitFor(() => expect(mockPrefetch).toHaveBeenCalledTimes(1));
  });

  it('calls prefetch function on focus', async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <TestComponent />
      </QueryClientProvider>
    );
    const btn = screen.getByTestId('hover-btn');
    fireEvent.focus(btn);
    await waitFor(() => expect(mockPrefetch).toHaveBeenCalledTimes(1));
  });

  it('only calls prefetch once by default (once=true)', async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <TestComponent />
      </QueryClientProvider>
    );
    const btn = screen.getByTestId('hover-btn');
    fireEvent.mouseEnter(btn);
    fireEvent.focus(btn);
    await waitFor(() => expect(mockPrefetch).toHaveBeenCalledTimes(1));
  });

  it('calls prefetch multiple times if once=false', async () => {
    function MultiTestComponent() {
      const ref = usePrefetchOnHover(mockPrefetch, { once: false });
      return <button ref={ref} data-testid="hover-btn">Hover me</button>;
    }
    render(
      <QueryClientProvider client={queryClient}>
        <MultiTestComponent />
      </QueryClientProvider>
    );
    const btn = screen.getByTestId('hover-btn');
    fireEvent.mouseEnter(btn);
    fireEvent.focus(btn);
    await waitFor(() => expect(mockPrefetch).toHaveBeenCalledTimes(2));
  });
});
