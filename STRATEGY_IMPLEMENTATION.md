# Strategy Implementation Documentation

## Overview

The Trading Farm Dashboard includes a comprehensive strategy management system that allows users to create, manage, and deploy trading strategies. The system supports natural language inputs, enabling users to describe strategies in plain English which are then converted to structured rules.

## Architecture

The strategy implementation consists of several key components:

1. **Database Schema**: Structured tables in Supabase for storing strategies, versions, and execution data
2. **API Services**: Backend services for managing strategy data and executing strategies
3. **UI Components**: Frontend interfaces for creating and managing strategies
4. **Execution Engine**: Logic for running strategies and generating signals based on market conditions

## Database Schema

The strategy system uses the following Supabase tables:

- `strategies`: Core strategy definitions
- `strategy_versions`: Version history for strategies
- `strategy_backtests`: Backtest results for strategies
- `agent_strategies`: Links strategies to agents
- `farm_strategies`: Links strategies to farms

The database includes useful enums and functions:

- `strategy_status` enum: draft, active, paused, archived, backtesting, optimizing
- `strategy_type` enum: momentum, mean_reversion, breakout, trend_following, arbitrage, grid, martingale, custom
- `timeframe` enum: 1m, 5m, 15m, 30m, 1h, 4h, 1d, 1w

## Strategy Data Model

### Strategy Core Properties

- `id`: Unique identifier for the strategy
- `name`: Human-readable name
- `description`: Detailed description
- `status`: Current status (draft, active, etc.)
- `strategy_type`: Type of strategy
- `version`: Current version string
- `creator_id`: User who created the strategy
- `is_public`: Whether the strategy is publicly visible

### Strategy Rules

- `entry_conditions`: Array of conditions that determine when to enter a position
- `exit_conditions`: Array of conditions that determine when to exit a position
- `risk_management`: Risk parameters like stop loss, take profit, position sizing
- `parameters`: Strategy configuration like timeframe, markets, indicators

## Natural Language Processing

The strategy ingestion service (`strategyIngestionService`) provides methods for:

1. Converting natural language descriptions into structured strategy rules
2. Enhancing existing strategies with new instructions
3. Extracting key parameters and conditions from text

Example:
```
"Buy Bitcoin when RSI drops below 30, use a 2% stop loss and a 6% take profit target"
```

Gets converted into:
```json
{
  "strategy_type": "mean_reversion",
  "entry_conditions": [
    {
      "type": "indicator_threshold",
      "params": { "indicator": "RSI", "threshold": 30, "comparison": "below" },
      "description": "RSI is below oversold threshold (30)"
    }
  ],
  "exit_conditions": [
    {
      "type": "price_target",
      "params": { "targetType": "percent", "value": 6 },
      "description": "Price reaches 6% gain"
    },
    {
      "type": "stop_loss",
      "params": { "stopType": "percent", "value": 2 },
      "description": "Price hits 2% loss"
    }
  ],
  "risk_management": {
    "stopLoss": 2,
    "takeProfit": 6
  }
}
```

## Strategy Execution

The strategy execution service (`strategyExecutionService`) provides:

1. Methods for executing strategies based on market conditions
2. Signal generation for entry and exit
3. Order creation and management
4. Deployment to trading agents

### Execution Flow

1. An agent requests execution with the current market context
2. The system loads the appropriate strategy and configuration
3. Entry or exit conditions are evaluated against the context
4. If conditions are met, a signal is generated (buy, sell, or hold)
5. For actionable signals, an order is created
6. The order is executed by the agent
7. Results are recorded for performance tracking

## API Endpoints

### Strategy Management

- `GET /api/strategies`: Get all strategies or a specific strategy
- `POST /api/strategies`: Create a new strategy
- `PUT /api/strategies`: Update an existing strategy
- `DELETE /api/strategies`: Delete a strategy

### Strategy Execution

- `POST /api/strategies/execute`: Execute a strategy with a given context
- `POST /api/strategies/deploy`: Deploy a strategy to an agent

## UI Components

The system includes UI components for:

1. Strategy creation with natural language input
2. Strategy listing and management
3. Strategy detail viewing and editing
4. Backtest configuration and results visualization
5. Deployment to agents and farms

## Integration with Agents

Agents interact with strategies through:

1. Deployment - linking a strategy to an agent with specific configuration
2. Execution - requesting signals based on current market conditions
3. Feedback - providing performance data back to the strategy system

## Example Usage

### Creating a Strategy via API

```javascript
// Create a strategy with natural language
const response = await fetch('/api/strategies', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    name: 'RSI Bounce Strategy',
    naturalLanguageDefinition: 'Buy Bitcoin when RSI drops below 30 on the 1-hour timeframe. Use a 2% stop loss and a 6% take profit. Exit the position after 24 hours if neither stop loss nor take profit has been hit.',
    isPublic: true,
    tags: ['bitcoin', 'mean-reversion', 'rsi']
  })
});

const result = await response.json();
console.log('Created strategy ID:', result.strategy.id);
```

### Executing a Strategy

```javascript
// Execute a strategy with the current market context
const response = await fetch('/api/strategies/execute', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    strategyId: 'abcd1234',
    agentId: 'agent5678',
    context: {
      market: 'BTC-USD',
      timeframe: '1h',
      timestamp: Date.now(),
      price: 50000,
      volume: 1200,
      indicators: {
        RSI: { value: 28, previous: 32 },
        MACD: { value: -5, signal: -3, histogram: -2, crossover: null }
      },
      position: {
        active: false,
        entryPrice: null,
        entryTime: null,
        size: null,
        currentProfit: null,
        currentProfitPercent: null
      },
      balances: {
        base: 1.5,
        quote: 25000,
        total: 100000
      }
    }
  })
});

const { signal, order } = await response.json();
console.log('Signal:', signal.action);
console.log('Order:', order);
```

## Future Enhancements

1. **Strategy Marketplace**: Allow users to share and sell strategies
2. **Machine Learning Optimization**: Automatically optimize strategy parameters based on performance
3. **Advanced Backtesting**: More sophisticated backtesting with historical data and market simulation
4. **Strategy Combining**: Ability to combine multiple strategies with weighting
5. **Custom Conditions Builder**: Visual interface for building custom entry and exit conditions
6. **Strategy Templates**: Pre-built templates for common trading strategies

## Security Considerations

1. Strategy data is protected with Row Level Security (RLS) in Supabase
2. Each user can only view/edit their own strategies unless marked as public
3. Execution rights are controlled through agent-strategy linking
4. Parameter validation prevents unsafe strategy configurations 