# Trading Farm Database Implementation Plan

## Database Setup

- [x] **Supabase Database Configuration**
  - [x] Set up Supabase project
  - [x] Configure authentication
  - [x] Set up environment variables
    ```
    SUPABASE_URL=http://localhost:3007
    SUPABASE_ANON_KEY=your_anonymous_key
    ```

- [ ] **Core Table Schema Creation**
  - [x] farms
    - [x] id (PK)
    - [x] name
    - [x] description
    - [x] is_active
    - [x] risk_profile (JSON)
    - [x] performance_metrics (JSON)
    - [x] config (JSON)
    - [x] metadata (JSON)
    - [x] created_at
    - [x] updated_at
  - [x] agents
    - [x] id (PK)
    - [x] farm_id (FK)
    - [x] name
    - [x] description
    - [x] is_active
    - [x] agent_type
    - [x] parameters (JSON)
    - [x] performance_metrics (JSON)
    - [x] created_at
    - [x] updated_at
  - [ ] agent_messages
    - [ ] id (PK)
    - [ ] agent_id (FK)
    - [ ] content
    - [ ] direction
    - [ ] source
    - [ ] metadata (JSON)
    - [ ] created_at
  - [x] wallets
    - [x] id (PK)
    - [x] owner_id
    - [x] owner_type
    - [x] name
    - [x] balance
    - [x] currency
    - [x] is_active
    - [x] blockchain_address (optional)
    - [x] private_key_encrypted (optional)
    - [x] metadata (JSON)
    - [x] created_at
    - [x] updated_at
  - [ ] transactions
    - [ ] id (PK)
    - [ ] wallet_id (FK)
    - [ ] amount
    - [ ] currency
    - [ ] transaction_type
    - [ ] status
    - [ ] external_id (optional)
    - [ ] metadata (JSON)
    - [ ] created_at
    - [ ] updated_at

- [ ] **Trading Data Tables**
  - [x] market_data
    - [x] id (PK)
    - [x] symbol
    - [x] exchange
    - [x] data_type
    - [x] data (JSON)
    - [x] market_data (JSON)
    - [x] fetched_at
    - [x] source
    - [x] created_at
  - [x] orders
    - [x] id (PK)
    - [x] farm_id (FK)
    - [x] agent_id (FK, optional)
    - [x] exchange
    - [x] symbol
    - [x] order_type
    - [x] side
    - [x] quantity
    - [x] price
    - [x] status
    - [x] filled_quantity
    - [x] external_id (optional)
    - [x] metadata (JSON)
    - [x] created_at
    - [x] updated_at
  - [x] trades
    - [x] id (PK)
    - [x] order_id (FK)
    - [x] quantity
    - [x] price
    - [x] side
    - [x] exchange
    - [x] symbol
    - [x] executed_at
    - [x] fee (optional)
    - [x] fee_currency (optional)
    - [x] metadata (JSON)
    - [x] created_at

- [ ] **Strategy Management Tables**
  - [ ] trading_strategies
    - [ ] id (PK)
    - [ ] name
    - [ ] description
    - [ ] strategy_type
    - [ ] parameters (JSON)
    - [ ] is_active
    - [ ] performance_metrics (JSON)
    - [ ] backtest_results (JSON, optional)
    - [ ] created_at
    - [ ] updated_at
  - [ ] farm_strategies
    - [ ] id (PK)
    - [ ] farm_id (FK)
    - [ ] strategy_id (FK)
    - [ ] allocation
    - [ ] config (JSON)
    - [ ] is_active
    - [ ] created_at
    - [ ] updated_at

- [ ] **ElizaOS Integration Tables**
  - [ ] eliza_commands
    - [ ] id (PK)
    - [ ] command
    - [ ] source
    - [ ] context (JSON)
    - [ ] response (JSON, optional)
    - [ ] status
    - [ ] completed_at (optional)
    - [ ] processing_time_ms (optional)
    - [ ] created_at
  - [ ] memory_items
    - [ ] id (PK)
    - [ ] agent_id (FK)
    - [ ] content
    - [ ] type
    - [ ] importance
    - [ ] metadata (JSON)
    - [ ] created_at

## Database Migration Implementation

- [ ] **Migration Scripts**
  - [ ] Create apply-schema-migration.ts script
  - [ ] Create trading-strategies-migration.ts script
  - [ ] Set up version control for migrations
  - [ ] Create rollback procedures

- [ ] **Data Seeding**
  - [ ] Create seed data for development
  - [ ] Create example farms and agents
  - [ ] Create sample trading strategies
  - [ ] Generate synthetic market data for testing

## Backend Services

- [x] **Repository Layer**
  - [x] Implement BaseRepository
  - [x] Implement FarmRepository
  - [x] Implement AgentRepository
  - [ ] Implement StrategyRepository
  - [x] Implement WalletRepository
  - [x] Implement MarketDataRepository
  - [x] Implement OrderRepository
  - [x] Implement TradeRepository

- [ ] **Service Layer**
  - [ ] Implement ElizaCommandService
  - [ ] Implement RealtimeService
  - [ ] Implement TradingFarmDataService

- [ ] **Memory Systems**
  - [ ] Implement CogneeClient for agent memory
  - [ ] Implement GraphitiClient for knowledge graphs
  - [ ] Implement TradingFarmMemory integration

- [ ] **Realtime Features**
  - [ ] Set up Supabase realtime channels
  - [ ] Configure PostgreSQL for realtime events
  - [ ] Create subscription management

## Integration Testing

- [ ] **Connection Tests**
  - [ ] Create test-connection.ts script
  - [ ] Create verify-table-schemas.ts script
  - [ ] Create test-repositories.ts script

- [ ] **Realtime Testing**
  - [ ] Create test-realtime-subscriptions.ts script
  - [ ] Test event propagation
  - [ ] Test data consistency

## Frontend Integration

- [ ] **Data Access Layer**
  - [ ] Create dashboard-integration.ts
  - [ ] Connect UI components to data services
  - [ ] Implement loading/error states

- [ ] **Memory Visualization**
  - [ ] Connect to agent memory systems
  - [ ] Create knowledge graph visualization
  - [ ] Implement market relationship insights

## Final Verification

- [ ] **Performance Testing**
  - [ ] Test database query performance
  - [ ] Test realtime event handling
  - [ ] Optimize critical database operations

- [ ] **Security Review**
  - [ ] Review authentication implementation
  - [ ] Check data access controls
  - [ ] Secure sensitive data (wallets, keys)

_Last updated: March 29, 2025_ 