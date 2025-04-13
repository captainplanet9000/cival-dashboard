# ElizaOS Trading Agent System Documentation

This document provides a comprehensive guide to the ElizaOS Trading Agent System, including multi-agent coordination, strategy optimization, and exchange connection management.

## Table of Contents

1. [Overview](#overview)
2. [Trading Agent Dashboard](#trading-agent-dashboard)
3. [Multi-Agent Coordination](#multi-agent-coordination)
4. [Strategy Optimization](#strategy-optimization)
5. [Exchange Connection Management](#exchange-connection-management)
6. [API Reference](#api-reference)
7. [Database Schema](#database-schema)

## Overview

The ElizaOS Trading Agent System extends the capabilities of ElizaOS agents to perform autonomous trading operations. Key features include:

- **Multi-Agent Coordination**: Enables research agents to collaborate with trading agents
- **Strategy Optimization**: Automatically improves strategy parameters using genetic algorithms
- **Exchange Connection Management**: Securely manages multiple exchange accounts
- **Performance Analytics**: Tracks and analyzes trading performance metrics

## Trading Agent Dashboard

The Trading Agent Dashboard provides a comprehensive view of your trading agent's performance.

### Performance Metrics

The dashboard displays key performance indicators:

- **Total Return**: The overall profit/loss percentage
- **Win Rate**: Percentage of profitable trades
- **Max Drawdown**: Maximum percentage decline from a peak
- **Sharpe Ratio**: Risk-adjusted return metric
- **Sortino Ratio**: Downside risk-adjusted return
- **Calmar Ratio**: Return relative to maximum drawdown

### Trade History

View detailed history of trades executed by your agent:

- **Symbol**: The trading pair (e.g., BTC/USDT)
- **Side**: Buy or sell
- **Amount**: Quantity traded
- **Price**: Execution price
- **P/L**: Profit/loss amount and percentage
- **Time**: When the trade was executed

### Equity Curve

Visualize your agent's performance over time with:

- **Equity Curve**: How your capital has grown/decreased
- **Drawdown Chart**: Visualize periods of decline
- **Daily Returns**: Performance on a day-by-day basis

## Multi-Agent Coordination

ElizaOS agents can now collaborate to execute more sophisticated trading strategies.

### Research and Trading Collaboration

A typical workflow involves:

1. Trading agent identifies a potential opportunity
2. Trading agent requests analysis from a research agent
3. Research agent analyzes the market and returns insights
4. Trading agent makes a decision based on the research

### Setting Up Agent Coordination

To enable coordination between agents:

1. Create at least one research agent and one trading agent
2. Register capabilities for each agent:

```javascript
// Register research agent capabilities
await fetch('/api/elizaos/agent-coordination', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    action: 'register_capabilities',
    agent_id: 'your-research-agent-id',
    capabilities: [
      {
        capability: 'market_research',
        description: 'Can perform technical, fundamental, and sentiment analysis',
        parameters: { supported_timeframes: ['1h', '4h', '1d'] }
      }
    ]
  })
});

// Register trading agent capabilities
await fetch('/api/elizaos/agent-coordination', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    action: 'register_capabilities',
    agent_id: 'your-trading-agent-id',
    capabilities: [
      {
        capability: 'execute_trade',
        description: 'Can execute trades on supported exchanges',
        parameters: { supported_symbols: ['BTC/USDT', 'ETH/USDT'] }
      }
    ]
  })
});
```

### Creating Research Tasks

Your trading agent can request research:

```javascript
await fetch('/api/elizaos/agent-coordination', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    action: 'create_research_task',
    coordinator_id: 'your-trading-agent-id',
    symbol: 'BTC/USDT',
    timeframe: '4h',
    research_type: 'technical',
    additional_params: {
      indicators: ['RSI', 'MACD', 'Moving Averages']
    }
  })
});
```

### Sending Trading Signals

Research agents can send trading signals:

```javascript
await fetch('/api/elizaos/agent-coordination', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    action: 'create_trading_signal',
    research_agent_id: 'your-research-agent-id',
    symbol: 'BTC/USDT',
    signal_type: 'BUY',
    confidence: 0.85,
    analysis: {
      reason: 'RSI oversold with bullish divergence',
      indicators: {
        rsi: 28,
        macd: { histogram: 0.0012, signal: 0.0, macd: 0.0012 }
      }
    },
    timeframe: '4h'
  })
});
```

## Strategy Optimization

The Strategy Optimization system automatically improves your trading strategies using genetic algorithms.

### How It Works

1. **Parameter Definition**: Define the parameters to optimize and their ranges
2. **Backtesting**: Each parameter set is evaluated through backtesting
3. **Genetic Evolution**: The best parameter sets are selected and evolved
4. **Convergence**: Over multiple generations, the system finds optimal parameters

### Optimizing a Strategy

To optimize a trading strategy:

1. Navigate to the Strategy page for your agent
2. Click "Optimize Strategy"
3. Select the date range for optimization
4. Configure optimization settings (optional)
5. Click "Start Optimization"

Alternatively, use the API:

```javascript
await fetch(`/api/elizaos/agents/${agentId}/optimize`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    start_date: '2024-01-01T00:00:00Z',
    end_date: '2024-04-01T00:00:00Z',
    parameters: [
      {
        name: 'fast_period',
        min: 5,
        max: 50,
        step: 1,
        type: 'integer',
        path: ['indicators', 'moving_average', 'fast_period']
      },
      {
        name: 'slow_period',
        min: 20,
        max: 200,
        step: 5,
        type: 'integer',
        path: ['indicators', 'moving_average', 'slow_period']
      }
    ],
    target_metric: 'sharpe_ratio',
    max_iterations: 20
  })
});
```

### Optimization Results

After optimization completes:

1. View the top-performing parameter sets
2. Compare metrics like Sharpe ratio, total return, drawdown
3. Apply the best parameters to your strategy with one click
4. See which parameters had the most impact on performance

## Exchange Connection Management

Securely manage multiple exchange connections for your trading agents.

### Supported Exchanges

- Coinbase
- Bybit
- Hyperliquid
- More coming soon...

### Adding an Exchange Connection

1. Navigate to Settings > Exchange Connections
2. Click "Add Connection"
3. Select the exchange and provide a label
4. Enter your API credentials
5. Choose testnet if you want to use the exchange's test environment
6. Click "Test Connection" to verify credentials
7. Save the connection

### Associating Exchange with Trading Agent

1. Navigate to your trading agent's settings
2. Select "Exchange Connection" tab
3. Choose the exchange connection from the dropdown
4. Save changes

### Secure Credential Storage

All API credentials are:

- Encrypted using AES-256-CBC before storage
- Never transmitted in plaintext
- Protected by Row Level Security in the database
- Only accessible to the user who created them

## API Reference

### Agent Coordination API

- `POST /api/elizaos/agent-coordination`
  - Actions:
    - `create_task`: Create a new task for an agent
    - `create_trading_signal`: Send a trading signal
    - `create_research_task`: Request market research
    - `update_task_status`: Update task status
    - `register_capabilities`: Register agent capabilities

- `GET /api/elizaos/agent-coordination?agent_id=<id>&status=<status>`
  - Get tasks assigned to an agent, optionally filtered by status

### Strategy Optimization API

- `POST /api/elizaos/agents/:id/optimize`
  - Start strategy optimization for an agent

- `GET /api/elizaos/agents/:id/optimization-results`
  - Get optimization results for a strategy

### Exchange Connection API

- `POST /api/exchange-connections`
  - Create a new exchange connection

- `PUT /api/exchange-connections/:id`
  - Update an existing exchange connection

- `DELETE /api/exchange-connections/:id`
  - Delete an exchange connection

## Database Schema

The system utilizes several database tables:

- `elizaos_agent_tasks`: Stores tasks for agent coordination
- `elizaos_agent_capabilities`: Stores agent capabilities
- `exchange_credentials`: Securely stores encrypted API credentials
- `exchange_connections`: Manages exchange connection details
- `trading_strategies`: Stores trading strategy definitions
- `strategy_optimization_results`: Stores optimization results
- `trading_agent_performance`: Tracks agent performance metrics
- `trading_agent_trades`: Records trade history

For further details, see the database migration file: `20250413_elizaos_trading_agent_integration.sql`

---

## Advanced Usage Examples

### Creating a Multi-Agent Trading System

```javascript
// Step 1: Create a research agent
const researchAgentResponse = await fetch('/api/elizaos/agents', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    name: 'Market Research Agent',
    description: 'Performs technical analysis and research',
    agent_type: 'research',
    model: 'gpt-4',
    farm_id: 1,
    configuration: {
      capabilities: ['technical_analysis', 'sentiment_analysis']
    }
  })
});
const researchAgent = await researchAgentResponse.json();

// Step 2: Create a trading agent
const tradingAgentResponse = await fetch('/api/elizaos/agents', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    name: 'BTC Trader',
    description: 'Executes trades based on research signals',
    agent_type: 'trading_agent',
    model: 'gpt-4',
    farm_id: 1,
    configuration: {
      trading_pairs: ['BTC/USDT'],
      risk_per_trade: 2, // percentage
      exchange_id: 'bybit',
      exchange_connection_id: 'your-connection-id'
    }
  })
});
const tradingAgent = await tradingAgentResponse.json();

// Step 3: Register agent capabilities
await Promise.all([
  // Register research capabilities
  fetch('/api/elizaos/agent-coordination', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      action: 'register_capabilities',
      agent_id: researchAgent.id,
      capabilities: [
        {
          capability: 'market_research',
          description: 'Technical and sentiment analysis',
          parameters: { timeframes: ['1h', '4h', '1d'] }
        }
      ]
    })
  }),
  
  // Register trading capabilities
  fetch('/api/elizaos/agent-coordination', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      action: 'register_capabilities',
      agent_id: tradingAgent.id,
      capabilities: [
        {
          capability: 'execute_trade',
          description: 'Execute trades on Bybit',
          parameters: { symbols: ['BTC/USDT'] }
        }
      ]
    })
  })
]);
```

---

For any issues or feature requests, please contact the ElizaOS support team.

Last updated: April 13, 2025
