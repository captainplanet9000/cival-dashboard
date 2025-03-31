# Trading Farm Platform

A comprehensive trading platform with strategy development, backtesting, and deployment capabilities.

## Features and Implementation Checklist

### Core Components
- [x] PineScript code editor for trading strategies
- [x] Memory system with vector embeddings for semantic search
- [x] Memory visualization (timeline, graph, table views)
- [x] Supabase integration with pgvector for embeddings storage

### Strategy Management
- [x] Strategy import and storage
- [x] Strategy editing and versioning
- [x] Strategy organization and categorization

### Backtesting System
- [x] Complete backtesting page with configuration options
- [x] Mock trade data generation for testing
- [x] Performance metrics calculation (win rate, P/L, Sharpe ratio)
- [x] D3.js visualization of equity curves with interactive tooltips

### Strategy Deployment System
- [x] Strategy deployment service
- [x] Deployment configuration dialog
- [x] API route for fetching available trading farms
- [x] Deployment management UI (pause, resume, stop, restart)
- [x] Farm filtering and status controls

### Performance Monitoring
- [x] Real-time performance dashboard
- [x] Daily profit/loss visualization
- [x] Strategy performance comparison
- [x] Performance metrics cards with KPIs
- [x] Risk assessment tools
- [x] Performance alerts and notifications

### Risk Management
- [x] Position sizing controls
- [x] Stop-loss and take-profit mechanisms
- [x] Max drawdown settings
- [x] Risk metrics visualization
- [x] Volatility-based position sizing

### Portfolio Management
- [ ] Multi-strategy portfolio construction
- [ ] Portfolio optimization tools
- [ ] Capital allocation modeling
- [ ] Correlation analysis for diversification
- [ ] Rebalancing tools

### User Management
- [ ] User authentication and authorization
- [ ] Team collaboration features
- [ ] Role-based access controls
- [ ] Activity logging and audit trails

### User Interface
- [x] Responsive dashboard layout
- [x] Dark/light mode support
- [x] Interactive charts and visualizations
- [ ] Customizable dashboard widgets
- [ ] Mobile companion app

## Getting Started

```bash
# Install dependencies
npm install

# Run development server
npm run dev
```

## Technology Stack

- Next.js for the frontend framework
- React for UI components
- TypeScript for type-safe code
- Tailwind CSS for styling
- Supabase for database and authentication
- Chart.js for data visualization
- D3.js for advanced visualizations

## Roadmap

- Real-time market data integration
- Multi-asset portfolio backtesting
- Machine learning strategy optimization
- Social sharing of strategy performance

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





