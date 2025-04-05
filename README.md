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

## Installation

To finalize the implementation, run the dependency installation script:

```bash
node src/utils/install-dependencies.js
```

This will install all required dependencies and update your package.json accordingly.

## Remaining Tasks

### 1. Fix Protocol Connector Types

Some protocol connectors have type compatibility issues with the main interface:

- SushiSwap and Morpho connectors: Update their `connect` methods to accept `Record<string, string> | undefined` parameter
- Update all connectors to match the new action enum-based approach

### 2. Protocol-Specific SDKs

For full protocol connectivity, add the following dependencies:

```bash
# For GMX integration
npm install @gmx-io/v2-contracts

# For Uniswap integration 
npm install @uniswap/v3-sdk @uniswap/sdk-core

# For Aave integration
npm install @aave/protocol-js
```

### 3. Implement Testing

Create the following test files:

- `src/tests/protocols/gmx-connector.test.ts`
- `src/tests/protocols/uniswap-connector.test.ts`
- `src/tests/protocols/cross-protocol-aggregator.test.ts`
- `src/tests/wallet/wallet-provider.test.ts`

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
