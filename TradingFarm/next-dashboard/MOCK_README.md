# Trading Farm Dashboard Mock System

This document provides a comprehensive guide to using the mock data system in the Trading Farm dashboard. The mock system enables development and testing without requiring external services or network connectivity.

## Getting Started

1. Copy the `.env.local.example` file to `.env.local`:

```bash
cp .env.local.example .env.local
```

2. Adjust mock settings in `.env.local` as needed:

```
# Enable mock services
NEXT_PUBLIC_USE_MOCKS=true
NEXT_PUBLIC_USE_MOCK_STORAGE=true
NEXT_PUBLIC_USE_MOCK_VAULT=true
NEXT_PUBLIC_USE_MOCK_EXCHANGES=true
NEXT_PUBLIC_USE_MOCK_BLOCKCHAIN=true
NEXT_PUBLIC_USE_MOCK_AI=true
NEXT_PUBLIC_USE_MOCK_SUPABASE=true
```

3. Start the development server:

```bash
npm run dev
```

## Mock Architecture

### Directory Structure

```
/src
  /config
    /mockConfig.ts                - Configuration for mock behavior
  /services
    /serviceFactory.ts            - Factory for creating real or mock services
  /utils
    /supabase
      /mock-client.ts             - Mock Supabase client
      /mocks-index.ts             - Consolidated mock data exports
      /mocks.ts                   - Core mock data (users, farms, etc.)
      /mocks-agents.ts            - Agent-related mock data
      /mocks-goals.ts             - Goal-related mock data
      /mocks-orders.ts            - Order-related mock data
      /mocks-exchanges.ts         - Exchange-related mock data
      /mocks-performance.ts       - Performance-related mock data
      /mocks-analytics.ts         - Analytics-related mock data
      /mocks-storage.ts           - Storage-related mock data
      /mocks-helper.ts            - Utility functions for mock data
```

### Service Factory Pattern

The application uses a service factory pattern to dynamically provide real or mock implementations:

```typescript
// Example from src/services/serviceFactory.ts
export const getStorageService = (isServerSide = false) => {
  if (CONFIG.storage.useMock) {
    console.log('[ServiceFactory] Using Mock Storage Service');
    return new MockStorageService(isServerSide);
  }
  console.log('[ServiceFactory] Using Real Storage Service');
  return new StorageService(isServerSide);
};
```

## Mock Configuration Options

### Basic Toggle Switches

- `NEXT_PUBLIC_USE_MOCKS`: Master switch to enable/disable all mocks
- `NEXT_PUBLIC_USE_MOCK_STORAGE`: Enable mock storage service
- `NEXT_PUBLIC_USE_MOCK_VAULT`: Enable mock vault service
- `NEXT_PUBLIC_USE_MOCK_EXCHANGES`: Enable mock exchange service
- `NEXT_PUBLIC_USE_MOCK_BLOCKCHAIN`: Enable mock blockchain service
- `NEXT_PUBLIC_USE_MOCK_AI`: Enable mock AI service
- `NEXT_PUBLIC_USE_MOCK_SUPABASE`: Enable mock Supabase client

### Performance Simulation

- `NEXT_PUBLIC_MOCK_*_LATENCY_MS`: Simulate network latency (milliseconds)
- `NEXT_PUBLIC_MOCK_*_FAILURE_RATE`: Simulate occasional failures (0-1, where 0.01 = 1% failure rate)

## Using Mock Services

### Accessing Services

Always use the service factory to get service instances:

```typescript
// ✅ GOOD - Using the factory
import { getStorageService } from '@/services/serviceFactory';
const storageService = getStorageService();

// ✅ GOOD - Using the singleton export
import { storageService } from '@/services/serviceFactory';

// ❌ BAD - Directly importing the implementation
import { StorageService } from '@/services/storageService';
const storageService = new StorageService();
```

### Storage Service Example

```typescript
import { storageService } from '@/services/serviceFactory';

// Get storage for an agent
const agentStorages = await storageService.getAgentStoragesByAgentId(agentId);

// Get complete storage data
const storageData = await storageService.getCompleteStorageData(
  storageId,
  'agent_storage'
);
```

### Vault Service Example

```typescript
import { vaultService } from '@/services/serviceFactory';

// Get vaults for a farm
const vaults = await vaultService.getVaultsByFarmId(farmId);

// Get complete vault data
const vaultData = await vaultService.getCompleteVaultData(vaultId);
```

### Exchange Service Example

```typescript
import { exchangeService } from '@/services/serviceFactory';

// Get exchange connections for a farm
const connections = await exchangeService.getExchangeConnectionsByFarmId(farmId);

// Get market data
const markets = await exchangeService.getAllMarkets();
```

### AI Service Example

```typescript
import { aiService } from '@/services/serviceFactory';

// Analyze market sentiment
const sentiment = await aiService.analyzeMarketSentiment(marketId);

// Predict price movement
const prediction = await aiService.predictPriceMovement(marketId, '1h');
```

## Handling Network Conditions

The mock services simulate realistic network conditions:

1. **Latency**: Each service has configurable latency to simulate network delays
2. **Failures**: Occasional failures occur based on the configured failure rate
3. **Error Handling**: Always handle potential errors in your components

Example with error handling:

```typescript
import { storageService } from '@/services/serviceFactory';
import { useState, useEffect } from 'react';

function StorageDisplay({ agentId }) {
  const [storages, setStorages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        const data = await storageService.getAgentStoragesByAgentId(agentId);
        setStorages(data);
        setError(null);
      } catch (err) {
        console.error('Failed to fetch storages:', err);
        setError('Failed to load storage data. Please try again.');
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [agentId]);

  if (loading) return <div>Loading...</div>;
  if (error) return <div className="error">{error}</div>;

  return (
    <div>
      {storages.map(storage => (
        <div key={storage.id}>
          <h3>{storage.name}</h3>
          <p>{storage.description}</p>
          <div>Capacity: {formatBytes(storage.capacity)}</div>
          <div>Used: {formatBytes(storage.used_space)}</div>
        </div>
      ))}
    </div>
  );
}
```

## Resetting Mock Data

Use the `resetAllMockData` function to clear all mock data and return to the initial state:

```typescript
import { resetAllMockData } from '@/services/serviceFactory';

// Reset all mock data
resetAllMockData();
```

## Testing with Mock Data

For unit and integration tests, you can leverage the mock services:

```typescript
// In your test setup
beforeEach(() => {
  // Ensure environment is set to use mocks
  process.env.NEXT_PUBLIC_USE_MOCKS = 'true';
  
  // Reset mock data before each test
  resetAllMockData();
});

test('displays agent storage correctly', async () => {
  // Your test code using mock services
});
```

## Extending the Mock System

When adding new services:

1. Create the real service implementation
2. Create a corresponding mock implementation
3. Add the service to the service factory
4. Update the mock data in the appropriate mock file

## Troubleshooting

- **Mock Data Not Working**: Check your `.env.local` file to ensure the correct mock settings are enabled
- **Missing Mock Data**: Ensure the mock data is properly exported in `mocks-index.ts`
- **Service Not Using Mocks**: Verify you're using the service factory to get service instances
- **Network Errors**: Remember that mock services simulate network errors according to configured failure rates

## Best Practices

1. **Use Service Factory**: Always get services through the factory, never directly
2. **Handle Errors**: All service calls should have proper error handling
3. **Reset Before Testing**: Reset mock data before running tests to ensure a clean state
4. **Configure for Development**: Use realistic latency and failure rates during development
5. **Document Mock Dependencies**: When a component depends on mock data, document the structure it expects
