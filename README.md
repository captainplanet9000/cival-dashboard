# Trading Farm Dashboard

A comprehensive dashboard for cryptocurrency trading operations management.

## Features

- Real-time monitoring of trading farms and agents
- Strategy creation, management, and deployment
- Order tracking and execution monitoring
- Trade history and performance analytics
- Advanced visualization of trading metrics

## Strategy System

The Trading Farm Dashboard includes a comprehensive strategy management system:

### Strategy Creation and Management

- Natural language strategy creation - describe your strategy in plain English
- Rule-based strategy definition with clear entry/exit conditions
- Strategy versioning for tracking changes and improvements
- Backtest capabilities for evaluating strategy performance
- Risk management parameters for controlling trade exposure

### Strategy Types Supported

- Momentum strategies
- Mean reversion strategies
- Breakout strategies
- Trend following strategies
- Arbitrage strategies
- Grid trading strategies
- Martingale strategies
- Custom strategies

### Strategy Deployment

- Deploy strategies to specific trading agents
- Configure strategy parameters for each agent
- Monitor strategy performance in real-time
- Analyze historical performance and optimize

### Integration with Agents

- Agents can execute strategies automatically
- Real-time order execution based on strategy signals
- Performance tracking and metrics collection
- Agent cooperation for enhanced strategy execution

## Technology Stack

- Frontend: Next.js, React, TypeScript, Tailwind CSS
- Backend: Node.js, Express
- Database: Supabase (PostgreSQL)
- Real-time updates: WebSockets
- Authentication: OAuth2, JWT

## Setup and Installation

1. Clone the repository
2. Install dependencies with `npm install`
3. Create a `.env` file based on `.env.example`
4. Run the development server with `npm run dev`

## Database Schema

The strategy system uses the following database tables:

- `strategies` - Core strategy definitions
- `strategy_versions` - Version history for strategies
- `strategy_backtests` - Backtest results for strategies
- `agent_strategies` - Linking strategies to agents
- `farm_strategies` - Linking strategies to farms

## API Endpoints

### Strategy Management

- `GET /api/strategies` - Get all strategies or a specific strategy
- `POST /api/strategies` - Create a new strategy
- `PUT /api/strategies` - Update an existing strategy
- `DELETE /api/strategies` - Delete a strategy

### Strategy Execution

- `POST /api/strategies/execute` - Execute a strategy with a given context
- `POST /api/strategies/deploy` - Deploy a strategy to an agent

## License

MIT





