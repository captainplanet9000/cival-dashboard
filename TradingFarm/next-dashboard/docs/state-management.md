# Trading Farm State Management Architecture

## Overview

This document outlines the state management architecture for the Trading Farm Dashboard. It provides guidelines for consistent state handling across the application, defines the responsibilities of different state layers, and documents best practices for state updates and subscriptions.

## State Management Layers

### 1. Server State (React Query)

React Query is used for managing server state, including:

- API data fetching
- Caching
- Background refetching
- Mutation management

#### Key Patterns

```tsx
// Example hook for fetching exchange data
export function useExchanges(userId: string) {
  return useQuery({
    queryKey: ['exchanges', userId],
    queryFn: () => exchangeService.getUserExchanges(userId),
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: true,
    retry: 2,
  });
}

// Example hook for mutation
export function useConnectExchange() {
  const queryClient = useQueryClient();
  const userId = useUserId();
  
  return useMutation({
    mutationFn: (credentials: ExchangeCredentials) => 
      exchangeService.storeExchangeCredentials(credentials),
    onSuccess: () => {
      // Invalidate and refetch exchanges after successful connection
      queryClient.invalidateQueries({ queryKey: ['exchanges', userId] });
    },
  });
}
```

### 2. Global Application State (React Context)

React Context is used for application-wide state that needs to be accessible across multiple components:

- User authentication state
- Theme/preferences
- Modal management
- Global notifications
- WebSocket connection state

#### Key Patterns

```tsx
// Example context for authentication
export const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Auth state initialization and subscription
  useEffect(() => {
    const { data: authListener } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setUser(session?.user ?? null);
        setLoading(false);
      }
    );
    
    return () => {
      authListener?.subscription.unsubscribe();
    };
  }, []);
  
  // Provide auth methods and state
  const value = useMemo(
    () => ({
      user,
      loading,
      signIn: (email: string, password: string) => 
        supabase.auth.signInWithPassword({ email, password }),
      signOut: () => supabase.auth.signOut(),
    }),
    [user, loading]
  );
  
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// Custom hook for consuming the context
export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
```

### 3. UI Component State (React useState/useReducer)

Local component state is used for UI-specific state that doesn't need to be shared:

- Form input values
- Validation errors
- Open/closed states
- Local UI preferences

#### Key Patterns

```tsx
// Example of component-local state
function TradingForm({ onSubmit }: { onSubmit: (order: OrderRequest) => void }) {
  const [formData, setFormData] = useState<OrderFormState>({
    symbol: '',
    side: 'buy',
    type: 'limit',
    quantity: '',
    price: '',
  });
  
  const [errors, setErrors] = useState<Record<string, string>>({});
  
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    // Clear error when field is modified
    if (errors[name]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };
  
  // Rest of component...
}
```

## State Management Decision Tree

Use this decision tree to determine where state should be managed:

1. Does the state represent server data?
   - Yes → Use React Query
   - No → Continue to question 2

2. Does the state need to be accessed by multiple components across the application?
   - Yes → Use React Context
   - No → Continue to question 3

3. Does the state need to be accessed by multiple components within a limited scope?
   - Yes → Consider a local context provider or prop drilling
   - No → Use component-local state (useState/useReducer)

## Best Practices

### React Query

- **Consistent Query Keys**: Follow a consistent pattern for query keys
  ```tsx
  // Collection-level queries
  ['exchanges']
  // Entity-level queries
  ['exchanges', exchangeId]
  // Parameterized queries
  ['orders', { status: 'open', symbol: 'BTC/USDT' }]
  ```

- **Optimistic Updates**: Use optimistic updates for responsive UI
  ```tsx
  useMutation({
    mutationFn: updateOrder,
    onMutate: async (newOrder) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['orders', newOrder.id] });
      
      // Snapshot previous value
      const previousOrder = queryClient.getQueryData(['orders', newOrder.id]);
      
      // Optimistically update
      queryClient.setQueryData(['orders', newOrder.id], newOrder);
      
      // Return context with snapshotted value
      return { previousOrder };
    },
    onError: (err, newOrder, context) => {
      // Revert to previous value on error
      queryClient.setQueryData(
        ['orders', newOrder.id], 
        context?.previousOrder
      );
    },
  });
  ```

- **Prefetching**: Prefetch data for likely user interactions
  ```tsx
  // Prefetch order details when hovering over an order in a list
  const prefetchOrder = useCallback((orderId: string) => {
    queryClient.prefetchQuery({
      queryKey: ['orders', orderId],
      queryFn: () => orderService.getOrder(orderId),
    });
  }, [queryClient]);
  ```

### React Context

- **Context Splitting**: Split contexts by domain for better performance
  ```tsx
  // Bad: One giant context
  <AppContext.Provider value={allAppState}>
  
  // Good: Multiple domain-specific contexts
  <AuthProvider>
    <ThemeProvider>
      <NotificationProvider>
        <ModalProvider>
          {children}
        </ModalProvider>
      </NotificationProvider>
    </ThemeProvider>
  </AuthProvider>
  ```

- **Context Selectors**: Use selector patterns to prevent unnecessary re-renders
  ```tsx
  function useTheme() {
    const { theme } = useContext(ThemeContext);
    return theme;
  }
  
  function useThemeActions() {
    const { setTheme } = useContext(ThemeContext);
    return { setTheme };
  }
  ```

- **Memoized Values**: Memoize context values to prevent unnecessary re-renders
  ```tsx
  const value = useMemo(() => ({ user, loading }), [user, loading]);
  ```

### Component State

- **Derived State**: Compute derived state instead of storing it
  ```tsx
  // Bad
  const [total, setTotal] = useState(0);
  
  useEffect(() => {
    setTotal(items.reduce((sum, item) => sum + item.price, 0));
  }, [items]);
  
  // Good
  const total = useMemo(
    () => items.reduce((sum, item) => sum + item.price, 0),
    [items]
  );
  ```

- **Initial State Functions**: Use function form for expensive initial state
  ```tsx
  // Expensive computation only runs once
  const [state, setState] = useState(() => {
    return computeExpensiveInitialState();
  });
  ```

- **Reducers for Complex State**: Use useReducer for complex state logic
  ```tsx
  const [state, dispatch] = useReducer(reducer, initialState);
  
  // Reducer function
  function reducer(state, action) {
    switch (action.type) {
      case 'increment':
        return { count: state.count + 1 };
      case 'decrement':
        return { count: state.count - 1 };
      default:
        throw new Error();
    }
  }
  ```

## Performance Optimization

### Memoization

- Use `useMemo` for expensive computations
- Use `useCallback` for functions passed as props
- Use `React.memo` for components that render often but with the same props

```tsx
const memoizedValue = useMemo(() => computeExpensiveValue(a, b), [a, b]);

const memoizedCallback = useCallback(() => {
  doSomething(a, b);
}, [a, b]);

const MemoizedComponent = React.memo(function MyComponent(props) {
  // Only re-renders if props change
});
```

### Context Optimization

- Keep context values as small as possible
- Split contexts by update frequency
- Use context selectors to extract only needed values

## Real-time Data Management

For WebSocket and real-time data:

1. Create a central socket manager service
2. Use React Query's `useQueryClient().setQueryData()` to update cached data
3. Implement connection state management in a context provider

```tsx
// Socket manager hook
export function useSocketSubscription(channel: string, event: string, callback: (data: any) => void) {
  const socket = useSocket();
  
  useEffect(() => {
    if (!socket) return;
    
    socket.subscribe(channel, event, callback);
    
    return () => {
      socket.unsubscribe(channel, event);
    };
  }, [socket, channel, event, callback]);
}

// Example usage with React Query
function OrderBook({ symbol }: { symbol: string }) {
  const queryClient = useQueryClient();
  
  // Initial fetch
  const { data: orderBook } = useQuery({
    queryKey: ['orderbook', symbol],
    queryFn: () => marketDataService.getOrderBook(symbol),
  });
  
  // Real-time updates
  const handleOrderBookUpdate = useCallback((update) => {
    queryClient.setQueryData(['orderbook', symbol], (old) => {
      return mergeOrderBookUpdate(old, update);
    });
  }, [queryClient, symbol]);
  
  useSocketSubscription(`market:${symbol}`, 'orderbook', handleOrderBookUpdate);
  
  // Render order book...
}
```

## State Persistence

For state that needs to persist:

1. Use `localStorage`/`sessionStorage` for simple values
2. Implement a storage utility for structured data
3. Add versioning for migration support

```tsx
// Storage utility
export const storage = {
  get: <T>(key: string, defaultValue: T): T => {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : defaultValue;
    } catch (error) {
      console.error(`Error getting item ${key} from localStorage:`, error);
      return defaultValue;
    }
  },
  
  set: <T>(key: string, value: T): void => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      console.error(`Error setting item ${key} in localStorage:`, error);
    }
  },
  
  remove: (key: string): void => {
    try {
      localStorage.removeItem(key);
    } catch (error) {
      console.error(`Error removing item ${key} from localStorage:`, error);
    }
  },
  
  // Versioned storage
  getVersioned: <T>(key: string, version: number, defaultValue: T): T => {
    const data = storage.get<{ version: number; data: T } | null>(
      key,
      null
    );
    
    // Return default if no data or version mismatch
    if (!data || data.version !== version) {
      return defaultValue;
    }
    
    return data.data;
  },
  
  setVersioned: <T>(key: string, version: number, value: T): void => {
    storage.set(key, { version, data: value });
  },
};

// Usage example
const THEME_STORAGE_VERSION = 1;

function usePersistedTheme() {
  const [theme, setThemeState] = useState(() => 
    storage.getVersioned('theme', THEME_STORAGE_VERSION, 'light')
  );
  
  const setTheme = useCallback((newTheme: string) => {
    setThemeState(newTheme);
    storage.setVersioned('theme', THEME_STORAGE_VERSION, newTheme);
  }, []);
  
  return [theme, setTheme];
}
```

## Testing State Management

### React Query Tests

```tsx
// Example React Query test
test('useExchanges returns exchange data', async () => {
  // Mock the service
  jest.spyOn(exchangeService, 'getUserExchanges').mockResolvedValue([
    { id: 1, name: 'Binance' },
    { id: 2, name: 'Coinbase' },
  ]);
  
  // Set up wrapper with QueryClientProvider
  const wrapper = ({ children }) => (
    <QueryClientProvider client={new QueryClient()}>
      {children}
    </QueryClientProvider>
  );
  
  // Render hook with wrapper
  const { result, waitFor } = renderHook(() => useExchanges('user123'), { wrapper });
  
  // Assert initial loading state
  expect(result.current.isLoading).toBe(true);
  
  // Wait for query to resolve
  await waitFor(() => result.current.isSuccess);
  
  // Assert data
  expect(result.current.data).toEqual([
    { id: 1, name: 'Binance' },
    { id: 2, name: 'Coinbase' },
  ]);
});
```

### Context Tests

```tsx
// Example Context test
test('AuthProvider provides auth state and methods', async () => {
  // Mock Supabase
  jest.spyOn(supabase.auth, 'signInWithPassword').mockResolvedValue({
    data: { user: { id: 'user123', email: 'test@example.com' } },
    error: null,
  });
  
  // Render with AuthProvider
  const { result } = renderHook(() => useAuth(), {
    wrapper: ({ children }) => <AuthProvider>{children}</AuthProvider>,
  });
  
  // Assert initial state
  expect(result.current.loading).toBe(true);
  expect(result.current.user).toBe(null);
  
  // Call signIn method
  await act(async () => {
    await result.current.signIn('test@example.com', 'password');
  });
  
  // Assert updated state
  expect(result.current.loading).toBe(false);
  expect(result.current.user).toEqual({ 
    id: 'user123', 
    email: 'test@example.com' 
  });
});
```

## Conclusion

This state management architecture provides a clear framework for managing state in the Trading Farm Dashboard. Following these patterns and best practices will lead to a more maintainable, performant, and consistent application.

When implementing new features, refer to this document to determine the appropriate state management approach based on the type of state and its scope within the application.
