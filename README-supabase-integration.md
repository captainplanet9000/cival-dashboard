# Trading Farm Dashboard - Supabase MCP Integration

This documentation explains how the Trading Farm Dashboard integrates with Supabase via the Message Control Protocol (MCP).

## Overview

The Trading Farm Dashboard uses Supabase as its primary database, connected through an MCP (Message Control Protocol) server. This enables seamless database operations while maintaining a clean separation between frontend and backend logic.

## Architecture

```
┌─────────────┐    HTTP    ┌─────────────┐   Database   ┌─────────────┐
│  Dashboard  │ ──────────► │ Supabase MCP│ ────────────► │  Supabase   │
│  Frontend   │ ◄────────── │   Server    │ ◄──────────── │  Database   │
└─────────────┘            └─────────────┘               └─────────────┘
```

## MCP Server URL

The Supabase MCP server is accessible at:

```
https://mcp.composio.dev/supabase/ancient-brash-planet-yjteSe
```

## Key Services

The integration is structured around five core service modules:

1. **Farm Service** (`src/services/farm-service.ts`): Manages trading farms, their properties, and lifecycle.
2. **Wallet Service** (`src/services/wallet-service.ts`): Handles wallet operations, transactions, and vault storage.
3. **Strategy Service** (`src/services/strategy-service.ts`): Manages trading strategies, backtesting, and assignment to farms.
4. **ElizaOS Service** (`src/services/eliza-service.ts`): Provides AI-powered natural language capabilities for the dashboard.
5. **Analytics Service** (`src/services/analytics-service.ts`): Delivers performance metrics, risk assessment, and reporting.

## Utility Classes

A helper utility class (`src/utils/supabase-mcp.ts`) simplifies interactions with the Supabase MCP server by providing methods for:

- Query execution
- Record insertion
- Record updates
- Record deletion
- Raw SQL execution
- SQL transaction handling
- Specialized farm operations

## Database Schema

The main database tables include:

- `farms`: Core farm information and configuration
- `farm_wallets`: Wallets associated with farms
- `farm_agents`: AI agents that execute trading strategies
- `strategies`: Trading strategies and their parameters
- `strategy_analytics`: Performance data for strategies
- `transactions`: Financial transaction records
- `vault_balances`: Records of funds in secure storage
- `knowledge_base`: Data for ElizaOS AI capabilities
- `eliza_conversations`: User conversations with the AI
- `eliza_messages`: Individual messages in conversations

## MCP Tools

The Supabase MCP server exposes these primary tools:

- `run_query`: Execute queries on specific tables
- `insert_record`: Insert new records
- `update_record`: Update existing records
- `delete_record`: Delete records
- `run_sql`: Execute custom SQL statements
- `sql_transaction`: Run multiple SQL statements in a transaction
- `create_farm`: Create a new trading farm
- `create_agent`: Create a new AI agent
- `create_wallet`: Create a new wallet
- `record_transaction`: Record a financial transaction
- `get_farm_details`: Get comprehensive farm information
- `run_migration`: Execute database migrations

## Error Handling

The services are designed with robust error handling, including:

- Detailed error messages
- Fallback to sample data for development
- Console error logging
- Type-safe API responses with the `ApiResponse<T>` type

## Example Usage

```typescript
import { farmService, walletService, strategyService } from '@/services';

// Create a new farm
const createFarm = async () => {
  const result = await farmService.createFarm({
    name: 'My Trading Farm',
    description: 'A farm for cryptocurrency trading',
    owner_id: 'user-123',
    goal: 'Maximize returns with moderate risk',
    risk_level: 'medium'
  });

  if (result.error) {
    console.error('Failed to create farm:', result.error);
    return;
  }

  console.log('Farm created:', result.data);
};

// Create a wallet for the farm
const createWallet = async (farmId) => {
  const result = await walletService.createWallet({
    name: 'Main Wallet',
    address: '0x1234567890abcdef',
    farm_id: farmId,
    balance: 1000
  });

  if (result.error) {
    console.error('Failed to create wallet:', result.error);
    return;
  }

  console.log('Wallet created:', result.data);
};

// Get performance metrics
const getPerformance = async (farmId) => {
  const result = await analyticsService.getFarmPerformance(farmId);

  if (result.error) {
    console.error('Failed to get performance metrics:', result.error);
    return;
  }

  console.log('Performance metrics:', result.data);
};
```

## Security

- All database operations are performed through the MCP server
- Row Level Security (RLS) policies in Supabase ensure data isolation
- Database roles control access permissions

## Type Safety

The integration provides TypeScript interfaces for all data models, ensuring type safety and developer experience.

## Further Information

For more details, refer to the specific service implementations in the `src/services` directory. 