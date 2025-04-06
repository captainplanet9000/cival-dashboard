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

## Services Integrated

### Exchange APIs
- **Bybit**: Spot and futures trading
- **Coinbase Pro**: Spot trading
- **Hyperliquid**: Perpetual trading

### Market Data
- **MarketStack**: Stock and ETF data

### AI & Strategy
- **OpenAI**: Market analysis and strategy generation

### Memory & Data Management
- **Neon PostgreSQL with pgvector**: Vector database for strategy storage and similarity search

### Blockchain Infrastructure
- **Alchemy**: Ethereum transaction simulation and optimization

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
- Node.js for backend
- Express for API server
- WebSockets for real-time updates
- OAuth2 and JWT for authentication

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

# Trading Farm DeFi Protocol Integration Framework

A comprehensive framework for integrating multiple DeFi protocols into the Trading Farm platform, enabling unified access to 12+ DeFi protocols for trading, lending, borrowing, and more.

## Overview

The DeFi Protocol Integration Framework provides a standardized way to interact with various DeFi protocols through a unified interface. It abstracts away the complexities of individual protocol APIs and provides a consistent interaction pattern for consumers.

Key features include:

- **Protocol Connectors**: Standard interfaces for each supported protocol
- **Cross-Protocol Aggregation**: Find best rates, compare fees, and analyze opportunities across protocols
- **Multi-Chain Support**: Most protocols support multiple chains (Ethereum, Arbitrum, Base, etc.)
- **AI Agent Integration**: MCP support for AI-driven trading and decision making

## Implementation Status

- ✅ Core Protocol Connector Interface
- ✅ Protocol Service Factory
- ✅ Cross-Protocol Aggregator
- ✅ API Endpoints for protocol data and actions
- ✅ UI Components for protocol display and interaction
- ✅ Wallet Provider with multi-wallet support
- ✅ Protocol Connectors:
  - ✅ GMX (Perpetuals)
  - ✅ Uniswap (DEX)
  - ✅ Aave (Lending/Borrowing)
  - ✅ SushiSwap (DEX)
  - ✅ Vertex (Perpetuals)
  - ✅ Morpho (Lending)
- ✅ Protocol SDKs Integrated:
  - ✅ Uniswap SDK (v3-sdk & sdk-core)
  - ✅ Aave Protocol JS
- ✅ Type Safety Fixes:
  - ✅ Standardized interface implementation across all connectors
  - ✅ Proper credential type handling in connect() methods
- ✅ Test Harness:
  - ✅ Unit tests for protocol connectors
  - ✅ Integration tests for wallet connections

## Installation

To install the dependencies for the DeFi Protocol Integration Framework:

```bash
node src/utils/install-dependencies.js
```

## Usage Example

```typescript
import { ProtocolConnectorFactory } from '@/services/defi/protocol-connector-factory';
import { ProtocolType, ProtocolAction } from '@/types/defi-protocol-types';
import { WalletProvider, WalletType } from '@/services/wallet/wallet-provider';

// Connect wallet
const walletProvider = WalletProvider.getInstance();
await walletProvider.connect(WalletType.METAMASK);

// Get protocol connector
const gmxConnector = await ProtocolConnectorFactory.getConnector(ProtocolType.GMX);

// Connect to protocol with wallet
await ProtocolConnectorFactory.connectWallet(ProtocolType.GMX);

// Get user positions
const positions = await gmxConnector.getUserPositions(walletProvider.getWalletInfo()?.address || '');

// Execute action (e.g. open position)
await gmxConnector.executeAction(ProtocolAction.OPEN_POSITION, {
  market: '0x...',
  collateralToken: '0x...',
  isLong: true,
  size: '1000000000000000000', // 1 ETH
  leverage: 10
});
```

## Architecture Diagram

```
┌─────────────────────────────────────────┐
│          Cross-Protocol Aggregator      │
└───────────────────┬─────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────┐
│        Protocol Connector Factory       │
└───┬───────────┬───────────┬─────────────┘
    │           │           │
    ▼           ▼           ▼
┌─────────┐ ┌─────────┐ ┌─────────┐
│   GMX   │ │ Uniswap │ │  Aave   │
│Connector│ │Connector│ │Connector│ ...
└─────────┘ └─────────┘ └─────────┘
```

## License

MIT

## Advanced Agent Workflow System

The Trading Farm Dashboard includes a powerful agent workflow system that leverages Large Language Models (LLMs) and Model Context Protocol (MCP) tools to automate and enhance trading operations.

### Key Features

- **LLM-powered Workflows**: Agents use large language models for planning, analysis, and reasoning in workflow execution.
- **MCP Tool Integration**: Connect to external services, exchange APIs, and DeFi protocols through a unified interface.
- **Workflow Templates**: Pre-configured templates for common operations like market analysis, portfolio rebalancing, and trade execution.
- **Scheduled Workflows**: Schedule workflows to run automatically at specified intervals or custom cron schedules.
- **Multi-agent Collaboration**: Different agent types (Analysts, Traders, Monitors) work together seamlessly within a farm.

### Components

- **Agent Workflow Service**: Core service for executing workflows with LLM planning and MCP tool integration.
- **LLM Service**: Handles natural language processing tasks like workflow planning, analysis, and summarization.
- **MCP Tools Service**: Provides a unified interface for external tool execution like fetching exchange data, price analysis, and trade execution.
- **Workflow Templates**: Pre-defined templates for common workflows with customizable parameters.
- **Workflow Scheduler**: Automates workflow execution on custom schedules.

### Workflow Types

- **Market Analysis**: Analyze market conditions, price trends, and sentiment for specified assets.
- **Risk Assessment**: Evaluate portfolio risk exposure, volatility metrics, and correlation factors.
- **Trade Execution**: Execute trades with customizable parameters like entry price, stop loss, and take profit.
- **Portfolio Rebalance**: Rebalance portfolio to target allocations with slippage control.

### Usage

1. Select an agent in the Farm Dashboard
2. Navigate to the "Workflows" tab
3. Choose a workflow type or select from available templates
4. Configure workflow parameters
5. Execute workflow or schedule for future execution

### Technical Implementation

The system follows a modular design with separation of concerns:
- UI components for user interaction 
- Service layer for business logic
- API endpoints for data access
- Integration with external systems via MCP tools

### Example Workflow

A typical Market Analysis workflow might:
1. Fetch current market data for specified assets
2. Analyze price trends and patterns
3. Generate sentiment analysis from news and social media
4. Compile a final market report with recommendations

### Further Development

The agent workflow system can be extended with:
- Additional workflow types for specific trading strategies
- More sophisticated LLM prompting techniques
- Integration with advanced MCP tools and data sources
- Real-time collaboration between multiple agents
- Integration with backtesting systems for strategy validation
