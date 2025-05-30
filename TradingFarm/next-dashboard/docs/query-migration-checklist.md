# TanStack Query Migration Checklist

Use this checklist to track progress while migrating components from legacy fetching to TanStack Query.

## Component Migration Status

| Component | Status | Reviewer | Notes |
|-----------|--------|----------|-------|
| Dashboard Overview | ✅ Migrated | | Fully implemented with optimized caching, WebSocket integration, and performance monitoring |
| Strategy List | 🔲 Pending | | |
| Strategy Detail | 🔲 Pending | | |
| Position Manager | 🔲 Pending | | |
| Agent List | 🔲 Pending | | |
| Agent Detail | 🔲 Pending | | |
| Trade History | 🔲 Pending | | |
| Performance Monitor | 🔲 Pending | | |
| Settings Page | 🔲 Pending | | |
| Market Data | 🔲 Pending | | |
| Goal Manager | 🔲 Pending | | |
| Analytics Dashboard | 🔲 Pending | | |

## Migration Checklist

For each component, complete the following steps:

### Pre-Migration
- [ ] Run `node scripts/cleanup-legacy-fetching.js --path=path/to/component` to analyze current patterns
- [ ] Review component dependencies and data requirements
- [ ] Identify potential query keys and structures
- [ ] Design appropriate caching strategy
- [ ] Identify optimistic update opportunities

### Implementation
- [ ] Replace direct API calls with appropriate query hooks
- [ ] Remove useState for loading, error, and data management
- [ ] Replace useEffect data fetching with TanStack Query
- [ ] Update component to use query results (data, isLoading, error)
- [ ] Implement dependent queries where needed
- [ ] Replace form submission with mutation hooks
- [ ] Add optimistic updates for mutations
- [ ] Add error handling and toasts for mutations
- [ ] Configure prefetching for linked items

### Testing
- [ ] Create unit tests for new query hooks
- [ ] Test loading, error, and success states
- [ ] Test mutations and optimistic updates
- [ ] Verify component behavior with mock data
- [ ] Test WebSocket integration if applicable

### Cleanup
- [ ] Remove unused code and imports
- [ ] Clean up comments and improve documentation
- [ ] Ensure consistent query key patterns
- [ ] Check for any missed data management code
- [ ] Update component snapshots if needed

### Review
- [ ] Code review by team member
- [ ] Verify consistent patterns with other components
- [ ] Check for performance improvements
- [ ] Update status in this checklist

## Common Patterns to Replace

### Replace State Management

**Before:**
```tsx
const [data, setData] = useState<Data[]>([])
const [isLoading, setIsLoading] = useState(true)
const [error, setError] = useState<Error | null>(null)

useEffect(() => {
  const fetchData = async () => {
    setIsLoading(true)
    try {
      const response = await apiService.get('/api/data')
      setData(response.data)
      setError(null)
    } catch (err) {
      setError(err)
    } finally {
      setIsLoading(false)
    }
  }
  
  fetchData()
}, [])
```

**After:**
```tsx
const { data, isLoading, error } = useQuery({
  queryKey: queryKeys.data.list()._def,
  queryFn: () => apiService.get('/api/data').then(res => res.data)
})
```

### Replace Form Submission

**Before:**
```tsx
const [isSubmitting, setIsSubmitting] = useState(false)
const [error, setError] = useState<Error | null>(null)

const handleSubmit = async (formData) => {
  setIsSubmitting(true)
  try {
    await apiService.post('/api/items', formData)
    // Success handling
  } catch (err) {
    setError(err)
  } finally {
    setIsSubmitting(false)
  }
}
```

**After:**
```tsx
const mutation = useCreateItem()

const handleSubmit = (formData) => {
  mutation.mutate(formData, {
    onSuccess: () => {
      // Success handling
    }
  })
}

// Access mutation state with:
// mutation.isPending, mutation.isError, mutation.error
```

## Resources

- [TanStack Query Guide](./tanstack-query-guide.md) - Detailed implementation guide
- [Query Patterns](./query-patterns.md) - Common patterns and solutions
- [TanStack Query Documentation](https://tanstack.com/query/latest/docs/react/overview) - Official documentation
