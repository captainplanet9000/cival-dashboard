# Trading Farm Dashboard Service Layer

This directory contains the service layer implementation for the Trading Farm Dashboard application. The service layer sits between the UI components and the data access layer (repositories), providing business logic and coordinating operations across multiple repositories.

## Architecture

The service layer follows a simple, consistent architecture:

1. **BaseService**: An abstract base class providing common operations for all entity types
2. **Entity Services**: Specific implementations for each entity type (Farm, Agent, Order, Trade)
3. **Dashboard Service**: Aggregates data from multiple sources for dashboard views

## Service Classes

### BaseService

The `BaseService` class provides common CRUD operations for all entity types:

- `findById`: Retrieve a single entity by ID
- `findAll`: Retrieve multiple entities with filtering
- `create`: Create a new entity
- `update`: Update an existing entity
- `delete`: Delete an entity
- `count`: Count entities with optional filtering

### Entity Services

Each entity has its own service class with entity-specific operations:

#### FarmService

- `findByOwnerId`: Find farms by owner
- `findActiveFarms`: Find active farms
- `getFarmWithRelations`: Get farm with related data (agents, wallets, etc.)
- `getFarmPerformanceHistory`: Get performance metrics over time
- `calculateRiskProfile`: Calculate risk profile based on strategies and positions
- `getTotalValueLocked`: Calculate total value across all farms

#### AgentService

- `findByFarmId`: Find agents by farm
- `findActiveAgents`: Find active agents
- `startAgent`: Activate an agent
- `stopAgent`: Deactivate an agent
- `updateParameters`: Update agent parameters
- `getPerformanceMetrics`: Get agent performance metrics
- `hasActiveTrades`: Check if agent has active trades

#### OrderService

- `findByFarmId`: Find orders by farm
- `findByAgentId`: Find orders by agent
- `findByStatus`: Find orders by status
- `findFilledOrders`: Find filled orders
- `findOpenOrders`: Find open orders
- `cancelOrder`: Cancel a single order
- `cancelAllOrders`: Cancel all open orders for a farm
- `getOrderStatistics`: Get order statistics for a farm

#### TradeService

- `findByFarmId`: Find trades by farm
- `findByAgentId`: Find trades by agent
- `findByOrderId`: Find trades by order
- `findBySymbol`: Find trades by symbol
- `calculatePnL`: Calculate profit/loss for trades
- `getRecentTrades`: Get recent trades with pagination
- `calculateTradeMetrics`: Calculate trade metrics for a farm

### DashboardService

The `DashboardService` aggregates data from multiple services for dashboard views:

- `getDashboardSummary`: Get overall dashboard summary
- `getFarmDashboard`: Get farm-specific dashboard data
- `getAgentDashboard`: Get agent-specific dashboard data

## Usage

The service layer can be used from UI components or API routes. Here's an example:

```typescript
import { dashboardService, farmService } from '../data-access/services';

// In a component or API route
async function getDashboardData(userId: number) {
  return dashboardService.getDashboardSummary(userId);
}

async function getFarmDetails(farmId: number) {
  return farmService.getFarmWithRelations(farmId);
}
```

## Singleton Pattern

The services are exported as singletons to ensure consistent state across the application:

```typescript
export const farmService = new FarmService();
export const agentService = new AgentService();
export const orderService = new OrderService();
export const tradeService = new TradeService();
export const dashboardService = new DashboardService(
  farmService,
  agentService,
  orderService,
  tradeService
);
```

This allows for easier testing and dependency injection while providing convenient access throughout the application. 