# TanStack Query Implementation Guide

This guide provides an overview of how TanStack Query is implemented in the Trading Farm Dashboard, explaining patterns, conventions, and best practices.

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Query Hooks](#query-hooks)
3. [Mutation Hooks](#mutation-hooks)
4. [Advanced Features](#advanced-features)
5. [WebSocket Integration](#websocket-integration)
6. [Testing](#testing)
7. [Migration Guide](#migration-guide)

## Architecture Overview

Our TanStack Query implementation follows a domain-driven approach, organizing hooks by entity type:

```
src/
├── hooks/
│   └── react-query/
│       ├── use-dashboard-queries.ts
│       ├── use-position-queries.ts
│       ├── use-strategy-queries.ts
│       ├── use-agent-queries.ts
│       ├── use-position-mutations.ts
│       ├── use-strategy-mutations.ts
│       ├── use-agent-mutations.ts
│       └── use-enhanced-infinite-queries.ts
└── utils/
    └── react-query/
        ├── query-keys.ts
        ├── prefetching.ts
        ├── cache-config.ts
        ├── request-manager.ts
        └── websocket-integration.ts
```

### Provider Setup

Our application wraps the entire app with a configured `QueryClientProvider` that sets up:

- Environment-specific caching behavior
- WebSocket connections
- Request cancellation for navigation
- React Query DevTools (in development)

## Query Hooks

### Naming Convention

Query hooks follow a consistent naming pattern:

- `use<Entity>` - For getting a list of entities (e.g., `useStrategies`)
- `use<Entity>Detail` - For getting a single entity (e.g., `useStrategyDetail`)
- `use<RelatedEntity>` - For getting related entities (e.g., `useStrategyBacktests`)

### Standard Pattern

All query hooks follow this pattern:

```typescript
export function useEntityName(params) {
  return useQuery({
    queryKey: queryKeys.entityName.operation(params)._def,
    queryFn: () => fetchFunction(params),
    staleTime: appropriate cache time,
    // Additional options as needed
  });
}
```

### Filtering and Pagination

For hooks that support filtering, sorting, or pagination:

- Filter parameters are included in the query key
- Each unique filter combination has its own cache entry
- Properly typed filter interfaces are provided

Example:
```typescript
export interface PositionsFilter {
  page?: number;
  pageSize?: number;
  sort?: {
    field: PositionSortField;
    direction: SortDirection;
  };
  // Other filter fields
}

export function usePositions(filters: PositionsFilter) {
  return useQuery({
    queryKey: queryKeys.positions.list(filters)._def,
    queryFn: () => fetchPositions(filters),
    // Other options
  });
}
```

### Dependent Queries

For queries that depend on the results of other queries:

```typescript
export function useDependentData(parentId: string) {
  // First query
  const parentQuery = useQuery({
    queryKey: queryKeys.parent.detail(parentId)._def,
    queryFn: () => fetchParent(parentId),
  });
  
  // Dependent query - only runs if parent data exists
  const childQuery = useQuery({
    queryKey: queryKeys.parent.children(parentId)._def,
    queryFn: () => fetchChildren(parentId),
    enabled: !!parentQuery.data,
  });
  
  return {
    parent: parentQuery.data,
    children: childQuery.data,
    isLoading: parentQuery.isLoading || childQuery.isLoading,
    isError: parentQuery.isError || childQuery.isError,
    // Other combined properties
  };
}
```

## Mutation Hooks

### Naming Convention

Mutation hooks follow this pattern:

- `useCreate<Entity>` - For creating entities
- `useUpdate<Entity>` - For updating entities
- `useDelete<Entity>` - For deleting entities
- `use<Action><Entity>` - For other actions (e.g., `useActivateAgent`)

### Standard Pattern

```typescript
export function useCreateEntity() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (data) => apiService.post('/api/entities', data),
    
    onSuccess: (data) => {
      // Invalidate queries that should refetch
      queryClient.invalidateQueries({
        queryKey: queryKeys.entities.list._def,
      });
      
      // Show success notification
      toast({
        title: 'Success',
        description: 'Entity created successfully',
      });
    },
    
    onError: (error) => {
      // Handle error
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}
```

### Optimistic Updates

For mutations that should update the UI immediately:

```typescript
export function useUpdateWithOptimistic() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (data) => apiService.put(`/api/entities/${data.id}`, data),
    
    onMutate: async (newData) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({
        queryKey: queryKeys.entities.detail(newData.id)._def,
      });
      
      // Snapshot the previous value
      const previousData = queryClient.getQueryData(
        queryKeys.entities.detail(newData.id)._def
      );
      
      // Update cache with optimistic value
      queryClient.setQueryData(
        queryKeys.entities.detail(newData.id)._def,
        newData
      );
      
      // Return context to use in onError
      return { previousData };
    },
    
    onError: (err, newData, context) => {
      // If the mutation fails, revert the optimistic update
      queryClient.setQueryData(
        queryKeys.entities.detail(newData.id)._def,
        context.previousData
      );
    },
    
    onSettled: (data, error, variables) => {
      // Always refetch after error or success for consistency
      queryClient.invalidateQueries({
        queryKey: queryKeys.entities.detail(variables.id)._def,
      });
    },
  });
}
```

## Advanced Features

### Prefetching

Prefetch data for anticipated navigation paths:

```typescript
// In a component with links
import { prefetchEntityData } from '@/utils/react-query/prefetching';

function MyComponent() {
  const queryClient = useQueryClient();
  
  const handleMouseEnter = () => {
    prefetchEntityData(queryClient, 'strategy', strategyId);
  };
  
  return (
    <Link 
      href={`/strategies/${strategyId}`} 
      onMouseEnter={handleMouseEnter}
    >
      View Strategy
    </Link>
  );
}

// Or use the PrefetchingNavLink component
import { PrefetchingNavLink } from '@/components/navigation/prefetching-nav-link';

function MyComponent() {
  return (
    <PrefetchingNavLink
      href={`/strategies/${strategyId}`}
      prefetchType="entity"
      entityType="strategy"
      entityId={strategyId}
    >
      View Strategy
    </PrefetchingNavLink>
  );
}
```

### Infinite Queries

For data that requires infinite scrolling:

```typescript
import { useTradeHistory, flattenInfiniteQueryData } from '@/hooks/react-query/use-enhanced-infinite-queries';

function TradeHistoryComponent() {
  const { 
    data, 
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage
  } = useTradeHistory({ 
    farmId: 'farm-123',
    sort: { field: 'date', direction: 'desc' }
  });
  
  // Convert paged data to flat array
  const trades = flattenInfiniteQueryData(data);
  
  return (
    <div>
      {trades.map(trade => (
        <TradeItem key={trade.id} trade={trade} />
      ))}
      
      {hasNextPage && (
        <Button 
          onClick={() => fetchNextPage()}
          disabled={isFetchingNextPage}
        >
          {isFetchingNextPage ? 'Loading...' : 'Load More'}
        </Button>
      )}
    </div>
  );
}
```

### Request Cancellation

Requests are automatically cancelled during navigation, but you can also manually cancel requests:

```typescript
import { RequestManager } from '@/utils/react-query/request-manager';

// Cancel specific request
RequestManager.cancelRequest('my-request-id');

// Cancel all requests matching a pattern
RequestManager.cancelRequestsByPattern('positions');

// Cancel all requests
RequestManager.cancelAllRequests();
```

## WebSocket Integration

WebSocket events automatically update the query cache:

```typescript
// In your layout component
import { createReconnectingWebSocket } from '@/utils/react-query/websocket-integration';
import { useQueryClient } from '@tanstack/react-query';

function AppLayout() {
  const queryClient = useQueryClient();
  
  useEffect(() => {
    const wsConnection = createReconnectingWebSocket(
      'wss://api.tradingfarm.io/ws',
      queryClient
    );
    
    wsConnection.connect();
    
    return () => {
      wsConnection.disconnect();
    };
  }, [queryClient]);
  
  return <>{children}</>;
}
```

The WebSocket integration:
- Automatically updates entity data when changes occur
- Updates market prices in real-time
- Invalidates related queries when needed
- Reconnects automatically if the connection is lost

## Testing

### Testing Query Hooks

We use React Testing Library and Mock Service Worker to test query hooks:

```typescript
import { renderHook, waitFor } from '@testing-library/react';
import { createWrapper } from '../test-utils';
import { useStrategies } from '@/hooks/react-query/use-strategy-queries';
import { server } from '../mocks/server';
import { rest } from 'msw';

describe('useStrategies', () => {
  it('fetches strategies successfully', async () => {
    const { result } = renderHook(() => useStrategies(), {
      wrapper: createWrapper()
    });
    
    // Initially loading
    expect(result.current.isLoading).toBe(true);
    
    // Wait for the query to finish
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    
    // Check data
    expect(result.current.data).toHaveLength(3);
    expect(result.current.data[0].name).toBe('Test Strategy');
  });
  
  it('handles errors', async () => {
    // Override handler to return error
    server.use(
      rest.get('/api/strategies', (req, res, ctx) => {
        return res(ctx.status(500));
      })
    );
    
    const { result } = renderHook(() => useStrategies(), {
      wrapper: createWrapper()
    });
    
    // Wait for the query to fail
    await waitFor(() => expect(result.current.isError).toBe(true));
    
    // Check error
    expect(result.current.error).toBeDefined();
  });
});
```

### Testing Mutations

```typescript
import { renderHook, act } from '@testing-library/react';
import { createWrapper } from '../test-utils';
import { useCreateStrategy } from '@/hooks/react-query/use-strategy-mutations';

describe('useCreateStrategy', () => {
  it('creates a strategy successfully', async () => {
    const { result } = renderHook(() => useCreateStrategy(), {
      wrapper: createWrapper()
    });
    
    const newStrategy = {
      name: 'New Strategy',
      type: 'technical',
      // Other fields
    };
    
    await act(async () => {
      await result.current.mutateAsync(newStrategy);
    });
    
    expect(result.current.isSuccess).toBe(true);
    expect(result.current.data).toMatchObject({
      id: expect.any(String),
      name: 'New Strategy',
    });
  });
});
```

## Migration Guide

### Converting from Manual Fetching

Before:
```typescript
const [data, setData] = useState(null);
const [isLoading, setIsLoading] = useState(false);
const [error, setError] = useState(null);

useEffect(() => {
  const fetchData = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/data');
      const json = await response.json();
      setData(json);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };
  
  fetchData();
}, []);
```

After:
```typescript
const { data, isLoading, error } = useQuery({
  queryKey: ['data'],
  queryFn: () => fetch('/api/data').then(res => res.json()),
});
```

### Converting from Manual Mutations

Before:
```typescript
const [isSubmitting, setIsSubmitting] = useState(false);
const [error, setError] = useState(null);

const handleSubmit = async (data) => {
  setIsSubmitting(true);
  try {
    const response = await fetch('/api/data', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    
    if (!response.ok) throw new Error('Failed to submit');
    
    // Update UI, show success message, etc.
  } catch (err) {
    setError(err.message);
  } finally {
    setIsSubmitting(false);
  }
};
```

After:
```typescript
const mutation = useMutation({
  mutationFn: (data) => 
    fetch('/api/data', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    }).then(res => {
      if (!response.ok) throw new Error('Failed to submit');
      return res.json();
    }),
  
  onSuccess: () => {
    // Show success message, redirect, etc.
  },
});

// In component:
const handleSubmit = (data) => {
  mutation.mutate(data);
};
```
