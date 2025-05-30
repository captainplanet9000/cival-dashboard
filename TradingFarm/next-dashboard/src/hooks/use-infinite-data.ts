import { useState, useEffect, useCallback } from 'react';
import { useInView } from 'react-intersection-observer';

interface UseInfiniteDataParams<T> {
  /** Function to fetch data for a specific page */
  fetchData: (page: number, pageSize: number) => Promise<{
    data: T[];
    /** Indicates if there are more pages to fetch */
    hasMore: boolean;
  }>;
  /** Number of items per page */
  pageSize?: number;
  /** Initial data to use (optional) */
  initialData?: T[];
  /** Enable or disable the infinite scrolling */
  enabled?: boolean;
}

/**
 * Hook for efficiently loading large datasets with infinite scrolling
 * Optimizes data loading by fetching only what's visible to the user
 */
export function useInfiniteData<T>({
  fetchData,
  pageSize = 20,
  initialData = [],
  enabled = true,
}: UseInfiniteDataParams<T>) {
  const [data, setData] = useState<T[]>(initialData);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  
  // Create a ref for the loadMore trigger element (usually at the bottom of the list)
  const { ref, inView } = useInView({
    threshold: 0,
    // Only trigger once per enter
    triggerOnce: false,
    // Add a small delay to avoid too many requests while scrolling
    delay: 100,
  });

  // Load the next page of data
  const loadNextPage = useCallback(async () => {
    if (!enabled || loading || !hasMore) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const result = await fetchData(currentPage, pageSize);
      
      setData(prevData => [...prevData, ...result.data]);
      setHasMore(result.hasMore);
      setCurrentPage(prev => prev + 1);
    } catch (err) {
      console.error('Failed to fetch data:', err);
      setError(err instanceof Error ? err : new Error('Failed to fetch data'));
    } finally {
      setLoading(false);
    }
  }, [currentPage, fetchData, hasMore, loading, pageSize, enabled]);

  // Reset the data and fetch from the beginning
  const refresh = useCallback(() => {
    setData([]);
    setHasMore(true);
    setCurrentPage(1);
    setError(null);
  }, []);

  // Fetch next page when the loadMore element comes into view
  useEffect(() => {
    if (inView && enabled) {
      loadNextPage();
    }
  }, [inView, loadNextPage, enabled]);

  return {
    /** The data that has been loaded so far */
    data,
    /** Whether more data is being loaded */
    loading,
    /** Whether there is more data to load */
    hasMore,
    /** Any error that occurred during loading */
    error,
    /** Function to manually load the next page of data */
    loadNextPage,
    /** Function to reset the data and start from the beginning */
    refresh,
    /** Ref to attach to the element that should trigger loading more data */
    loadMoreRef: ref,
  };
}
