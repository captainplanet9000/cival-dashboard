# Trading Farm Mock Data System

This repository contains a comprehensive mock data system that enables development and testing of the Trading Farm platform without requiring external services or network connectivity.

## Features

- **Complete Mock Implementation**: Mock services for storage, vault, blockchain interactions, exchanges, and AI services.
- **Environment Controlled**: Toggle mocks on/off using environment variables.
- **Realistic Test Data**: Pre-populated with realistic test data.
- **Latency Simulation**: Configurable artificial latency to simulate network conditions.
- **Controlled Failures**: Simulate occasional failures to test error handling.
- **TestNet Fallbacks**: When not using full mocks, TestNet integrations are used instead of mainnet.

## Getting Started

1. Copy the `.env.development` file to `.env.local`:

```bash
cp .env.development .env.local
```

2. Adjust mock settings in `.env.local` as needed:

```
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
  /__mocks__
    /services
      /mockStorageService.ts   - Storage service mock implementation
      /mockVaultService.ts     - Vault service mock implementation
      /mockExchangeService.ts  - Exchange service mock implementation
      ...
    /data
      /agentData.ts            - Mock agent data
      /farmData.ts             - Mock farm data
      /storageData.ts          - Mock storage data
      /vaultData.ts            - Mock vault data
      ...
    /supabase
      /mockSupabaseClient.ts   - Mock Supabase client
```

### Service Factory Pattern

The application uses a service factory pattern to dynamically provide real or mock implementations:

```typescript
// Example from src/services/serviceFactory.ts
export const getStorageService = (isServerSide = false) => {
  if (CONFIG.storage.useMock) {
    return new MockStorageService(isServerSide);
  }
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

### TestNet Configuration (when mocks are disabled)

- `NEXT_PUBLIC_USE_EXCHANGE_TESTNET`: Use exchange TestNets instead of mainnet
- `NEXT_PUBLIC_USE_BLOCKCHAIN_TESTNET`: Use blockchain TestNets instead of mainnet

### Latency and Failure Simulation

- `NEXT_PUBLIC_MOCK_*_LATENCY_MS`: Simulate network latency (milliseconds)
- `NEXT_PUBLIC_MOCK_*_FAILURE_RATE`: Simulate occasional failures (0-1, where 0.01 = 1% failure rate)

## Adding New Mock Data

### Adding Mock Agents/Farms

```typescript
import { createMockAgent } from '../__mocks__/data/agentData';
import { createMockFarm } from '../__mocks__/data/farmData';

// Create a new agent
const newAgent = createMockAgent(
  'AI Trading Bot',
  'Advanced AI-powered trading bot',
  'user-id-here'
);

// Create a new farm
const newFarm = createMockFarm(
  'DeFi Yield Farm',
  'Optimized for DeFi yield farming',
  'user-id-here'
);
```

### Adding Mock Storage Resources

```typescript
import { createMockAgentStorage, createMockFarmStorage } from '../__mocks__/data/storageData';

// Create mock agent storage
const agentStorage = createMockAgentStorage(
  agentId,
  'Primary Storage',
  1024 * 1024 * 1024, // 1GB
  {
    description: 'Main storage for model data',
    storageType: 'autonomous'
  }
);

// Create mock farm storage
const farmStorage = createMockFarmStorage(
  farmId,
  'Strategy Storage',
  5 * 1024 * 1024 * 1024, // 5GB
  {
    description: 'Storage for farm strategies',
    storageType: 'centralized',
    reservedSpace: 1024 * 1024 * 1024 // 1GB reserved
  }
);
```

### Adding Mock Vault Resources

```typescript
import { 
  createMockVaultMaster, 
  createMockVaultAccount, 
  createMockVaultTransaction 
} from '../__mocks__/data/vaultData';
import { VaultAccountType, TransactionType } from '@/types/vault';

// Create a vault master
const vaultMaster = createMockVaultMaster(
  'Development Vault',
  'Master vault for development',
  userId,
  1000 // Initial balance
);

// Create a vault account
const vaultAccount = createMockVaultAccount(
  vaultMaster.id,
  'Trading Account',
  VaultAccountType.TRADING,
  'USD',
  {
    initialBalance: 500,
    riskLevel: 'medium',
    securityLevel: 'standard'
  }
);

// Create a transaction
const transaction = createMockVaultTransaction({
  sourceId: 'external-source',
  sourceType: 'exchange',
  destinationId: vaultAccount.id,
  destinationType: 'vault_account',
  amount: 100,
  currency: 'USD',
  type: TransactionType.DEPOSIT,
  description: 'Initial deposit'
});
```

## Resetting Mock Data

Use the `resetAllMockData` function to clear all mock data and return to the initial state:

```typescript
import { resetAllMockData } from '@/services/serviceFactory';

// Reset all mock data
resetAllMockData();
```

## Best Practices

1. **Service Abstraction**: Always use the service factory to get service instances, rather than directly importing specific implementations:

```typescript
// ✅ GOOD
import { getStorageService } from '@/services/serviceFactory';
const storageService = getStorageService();

// ❌ BAD
import { StorageService } from '@/services/storageService';
const storageService = new StorageService();
```

2. **Singleton Access**: For simple cases, use the pre-instantiated service exports:

```typescript
// ✅ GOOD
import { storageService } from '@/services/serviceFactory';

// ❌ BAD
import { StorageService } from '@/services/storageService';
const storageService = new StorageService();
```

3. **Testing**: Use the mock implementations for unit tests, with specific test data:

```typescript
// Reset to a clean state before each test
beforeEach(() => {
  resetAllMockData();
});
```

## Extending the Mock System

When adding new services to the platform, follow this pattern to ensure mock compatibility:

1. Create your real service implementation
2. Create a corresponding mock implementation in `src/__mocks__/services/`
3. Add the service to the service factory
4. Add corresponding mock data in `src/__mocks__/data/`
5. Add appropriate environment variables to control the mock behavior

For example, the Vault Service pattern follows:
- Real implementation: `src/services/vaultService.ts`
- Mock implementation: `src/__mocks__/services/mockVaultService.ts`
- Mock data: `src/__mocks__/data/vaultData.ts`
- Factory integration in: `src/services/serviceFactory.ts`
- Environment control: `NEXT_PUBLIC_USE_MOCK_VAULT` in `.env.development`

## Troubleshooting

- **Mock Data Not Reset**: Ensure you're using the exported `resetAllMockData()` function from the service factory.
- **Mocks Not Working**: Check your `.env.local` file to ensure the correct mock settings are enabled.
- **Dependencies Not Mocked**: Some services may depend on others. Ensure all required mocks are enabled. 