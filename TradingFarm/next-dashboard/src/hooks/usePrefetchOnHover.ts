import { useRef, useCallback } from 'react';
import { QueryClient } from '@tanstack/react-query';

/**
 * usePrefetchOnHover
 *
 * A custom hook for DRY prefetching of TanStack Query data on hover/focus events.
 *
 * Usage Example:
 *   const ref = usePrefetchOnHover(() => prefetchEntityData(queryClient, 'agent', agentId));
 *   return <a ref={ref} ...>Agent</a>
 *
 * @param prefetchFn - A function that triggers the desired prefetch (should be memoized or stable)
 * @param options - Optional: { once: boolean } (default: true)
 * @returns ref to attach to the interactive element
 */
export function usePrefetchOnHover(
  prefetchFn: () => void | Promise<void>,
  options?: { once?: boolean }
) {
  const triggered = useRef(false);
  const { once = true } = options || {};

  const handlePrefetch = useCallback(() => {
    if (once && triggered.current) return;
    triggered.current = true;
    prefetchFn();
  }, [once, prefetchFn]);

  const ref = useCallback<React.RefCallback<HTMLElement>>((node) => {
    if (!node) return;
    node.addEventListener('mouseenter', handlePrefetch, { once });
    node.addEventListener('focus', handlePrefetch, { once });
  }, [handlePrefetch, once]);

  return ref;
}
