import { QueryClient } from '@tanstack/react-query';
import { apiService } from '@/services/api-service';
import { queryKeys } from './query-keys';

/**
 * Prefetches data for common navigation paths to improve user experience.
 * This function should be called when specific events occur (like hovering over a link)
 * or when we're confident a user will navigate to a specific page.
 */
export function prefetchEntityData(
  queryClient: QueryClient,
  entityType: 'strategy' | 'position' | 'agent' | 'farm',
  entityId: string,
  options?: {
    staleTime?: number;
    includeRelatedData?: boolean;
  }
) {
  const staleTime = options?.staleTime ?? 1000 * 60 * 5; // 5 minutes default
  const includeRelated = options?.includeRelatedData ?? true;

  switch (entityType) {
    case 'strategy':
      // Prefetch strategy detail
      queryClient.prefetchQuery({
        queryKey: queryKeys.strategies.detail(entityId)._def,
        queryFn: () => apiService.get(`/api/strategies/${entityId}`).then(res => res.data),
        staleTime,
      });

      // Optionally prefetch related data
      if (includeRelated) {
        queryClient.prefetchQuery({
          queryKey: queryKeys.strategies.backtests(entityId)._def,
          queryFn: () => apiService.get(`/api/strategies/${entityId}/backtests`).then(res => res.data),
          staleTime,
        });

        queryClient.prefetchQuery({
          queryKey: queryKeys.strategies.executions(entityId)._def,
          queryFn: () => apiService.get(`/api/strategies/${entityId}/executions`).then(res => res.data),
          staleTime,
        });
      }
      break;

    case 'position':
      // Prefetch position detail
      queryClient.prefetchQuery({
        queryKey: queryKeys.positions.detail(entityId)._def,
        queryFn: () => apiService.get(`/api/positions/${entityId}`).then(res => res.data),
        staleTime,
      });

      // Optionally prefetch related data
      if (includeRelated) {
        queryClient.prefetchQuery({
          queryKey: queryKeys.positions.trades(entityId)._def,
          queryFn: () => apiService.get(`/api/positions/${entityId}/trades`).then(res => res.data),
          staleTime,
        });
      }
      break;

    case 'agent':
      // Prefetch agent detail
      queryClient.prefetchQuery({
        queryKey: queryKeys.agents.detail(entityId)._def,
        queryFn: () => apiService.get(`/api/agents/${entityId}`).then(res => res.data),
        staleTime,
      });

      // Optionally prefetch related data
      if (includeRelated) {
        queryClient.prefetchQuery({
          queryKey: queryKeys.agents.positions(entityId)._def,
          queryFn: () => apiService.get(`/api/agents/${entityId}/positions`).then(res => res.data),
          staleTime,
        });

        queryClient.prefetchQuery({
          queryKey: queryKeys.goals.list(entityId)._def,
          queryFn: () => apiService.get(`/api/agents/${entityId}/goals`).then(res => res.data),
          staleTime,
        });
      }
      break;

    case 'farm':
      // Prefetch farm detail
      queryClient.prefetchQuery({
        queryKey: queryKeys.farms.detail(entityId)._def,
        queryFn: () => apiService.get(`/api/farms/${entityId}`).then(res => res.data),
        staleTime,
      });

      // Optionally prefetch related data
      if (includeRelated) {
        queryClient.prefetchQuery({
          queryKey: queryKeys.dashboard.detail(entityId)._def,
          queryFn: () => apiService.get(`/api/dashboard/${entityId}`).then(res => res.data),
          staleTime,
        });

        queryClient.prefetchQuery({
          queryKey: queryKeys.dashboard.riskMetrics(entityId)._def,
          queryFn: () => apiService.get(`/api/dashboard/${entityId}/risk-metrics`).then(res => res.data),
          staleTime,
        });
      }
      break;
  }
}

/**
 * Prefetches list data for common sections of the application.
 * Call this function when user is likely to navigate to a list view.
 */
export function prefetchListData(
  queryClient: QueryClient,
  listType: 'strategies' | 'positions' | 'agents' | 'farms' | 'orders',
  filters?: any,
  options?: {
    staleTime?: number;
    pageSize?: number;
  }
) {
  const staleTime = options?.staleTime ?? 1000 * 60 * 2; // 2 minutes default for lists
  const pageSize = options?.pageSize ?? 10;

  const baseFilters = {
    page: 1,
    pageSize,
    ...filters,
  };

  switch (listType) {
    case 'strategies':
      queryClient.prefetchQuery({
        queryKey: queryKeys.strategies.list(baseFilters)._def,
        queryFn: () => apiService.get('/api/strategies', { params: baseFilters }).then(res => res.data),
        staleTime,
      });
      break;

    case 'positions':
      queryClient.prefetchQuery({
        queryKey: queryKeys.positions.list(baseFilters)._def,
        queryFn: () => apiService.get('/api/positions', { params: baseFilters }).then(res => res.data),
        staleTime,
      });
      break;

    case 'agents':
      queryClient.prefetchQuery({
        queryKey: queryKeys.agents.list(baseFilters)._def,
        queryFn: () => apiService.get('/api/agents', { params: baseFilters }).then(res => res.data),
        staleTime,
      });
      break;

    case 'farms':
      queryClient.prefetchQuery({
        queryKey: queryKeys.farms.list(baseFilters)._def,
        queryFn: () => apiService.get('/api/farms', { params: baseFilters }).then(res => res.data),
        staleTime,
      });
      break;

    case 'orders':
      queryClient.prefetchQuery({
        queryKey: queryKeys.orders.list(baseFilters)._def,
        queryFn: () => apiService.get('/api/orders', { params: baseFilters }).then(res => res.data),
        staleTime,
      });
      break;
  }
}

/**
 * Prefetches data for the dashboard overview.
 * Call this function when user is likely to navigate to the dashboard.
 */
export function prefetchDashboardData(
  queryClient: QueryClient,
  farmId: string,
  options?: {
    staleTime?: number;
    includeAnalytics?: boolean;
  }
) {
  const staleTime = options?.staleTime ?? 1000 * 60 * 2; // 2 minutes default
  const includeAnalytics = options?.includeAnalytics ?? true;

  // Prefetch core dashboard data
  queryClient.prefetchQuery({
    queryKey: queryKeys.dashboard.detail(farmId)._def,
    queryFn: () => apiService.get(`/api/dashboard/${farmId}`).then(res => res.data),
    staleTime,
  });

  queryClient.prefetchQuery({
    queryKey: queryKeys.dashboard.riskMetrics(farmId)._def,
    queryFn: () => apiService.get(`/api/dashboard/${farmId}/risk-metrics`).then(res => res.data),
    staleTime,
  });

  // Prefetch positions with common filters
  prefetchListData(queryClient, 'positions', { farmId, limit: 5 });

  // Optionally prefetch analytics data
  if (includeAnalytics) {
    queryClient.prefetchQuery({
      queryKey: queryKeys.analytics.summary(farmId)._def,
      queryFn: () => apiService.get(`/api/analytics/${farmId}/summary`).then(res => res.data),
      staleTime,
    });

    // First page of performance data
    queryClient.prefetchInfiniteQuery({
      queryKey: queryKeys.analytics.performance(farmId)._def,
      queryFn: ({ pageParam = 0 }) => 
        apiService.get(`/api/analytics/${farmId}/performance`, { 
          params: { page: pageParam, limit: 30 } 
        }).then(res => res.data),
      initialPageParam: 0,
      staleTime,
    });
  }
}
