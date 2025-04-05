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
- **AI Agent Integration**: MCP server for AI agent interaction with protocols
- **Dashboard UI**: User-friendly interface for exploring and interacting with protocols

## Supported Protocols

| Protocol     | Category   | Description                          | Chains Supported        |
|--------------|------------|--------------------------------------|-----------------------|
| Uniswap      | DEX        | Decentralized token exchange         | Ethereum, Polygon, Arbitrum, Optimism, Base |
| SushiSwap    | DEX        | Decentralized token exchange         | Multiple chains       |
| Aave         | Lending    | Lending and borrowing protocol       | Ethereum, Polygon, Arbitrum, Optimism, Avalanche, Base |
| Morpho       | Lending    | Lending optimizer                    | Ethereum, Optimism, Base |
| Vertex       | Perpetuals | Multi-chain perpetual trading        | Arbitrum, Base, Mantle, etc. |
| Hyperliquid  | Derivatives| Decentralized derivatives exchange   | Hyperliquid Chain     |
| GMX          | Perpetuals | Decentralized perpetual exchange     | Arbitrum, Avalanche   |
| Bluefin      | CLOB       | Orderbook-based exchange             | Arbitrum              |
| Ethena       | Synthetics | Synthetic USDe stablecoin protocol   | Ethereum              |
| Avalon       | Derivatives| Bitcoin market derivatives           | Ethereum              |
| Silo         | Lending    | Isolated lending markets             | Multiple chains       |
| Kamino       | Liquidity  | Automated liquidity management       | Solana                |

## Architecture

The framework is built on a modular architecture with the following key components:

### Core Components

1. **Protocol Connector Interface**: Base interface all connectors implement
2. **Protocol Service Factory**: Creates and manages protocol connector instances
3. **Cross-Protocol Aggregator**: Provides cross-protocol functionality
4. **API Layer**: REST endpoints for protocol interaction
5. **MCP Server**: Model Context Protocol server for AI agent integration
6. **Dashboard UI**: User interface for protocol interaction

### Key Files

- `src/types/defi-protocol-types.ts`: Core types and interfaces
- `src/services/defi/protocol-connector-interface.ts`: Base connector interface
- `src/services/defi/protocol-service-factory.ts`: Factory for creating connectors
- `src/services/defi/cross-protocol-aggregator.ts`: Cross-protocol functionality
- `src/services/defi/connectors/*`: Individual protocol connectors
- `src/services/mcp/defi-protocol-mcp.ts`: MCP service for AI agent integration
- `src/mcp-servers/defi-protocol-mcp/index.ts`: MCP server implementation

## Getting Started

### Prerequisites

- Node.js 16+ and npm
- DeFi protocol API keys (where applicable)
- Ethereum wallet (for signing transactions)

### Installation

1. Clone the repository:
   ```
   git clone https://github.com/your-org/trading-farm.git
   cd trading-farm
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. Configure environment variables (see `.env.example`)

4. Start the development server:
   ```
   npm run dev
   ```

### Basic Usage

#### 1. Protocol Access via API

Access protocols through API endpoints:

```
GET /api/defi/get-protocol-data?protocol=uniswap
POST /api/defi/execute-action
```

#### 2. Direct Component Integration

```typescript
import { ProtocolServiceFactory } from '@/services/defi/protocol-service-factory';
import { ProtocolType } from '@/types/defi-protocol-types';

// Example: Get Uniswap connector
const connector = await ProtocolServiceFactory.getConnector(ProtocolType.UNISWAP);
await connector.connect();
const data = await connector.getProtocolData();
```

#### 3. Cross-Protocol Aggregation

```typescript
import { crossProtocolAggregator } from '@/services/defi/cross-protocol-aggregator';

// Compare swap rates across DEXes
const rates = await crossProtocolAggregator.getBestSwapRate('ETH', 'USDC', '1.0');

// Compare lending rates
const lendingRates = await crossProtocolAggregator.compareLendingRates('USDC');
```

#### 4. MCP Server for AI Agents

The MCP server provides a standardized way for AI agents to interact with protocols.

Start the MCP server:
```
node dist/mcp-servers/defi-protocol-mcp/index.js
```

## Development

### Adding a New Protocol

To add a new protocol:

1. Add the protocol to the `ProtocolType` enum in `src/types/defi-protocol-types.ts`
2. Create a new connector implementation in `src/services/defi/connectors/`
3. Update `protocol-service-factory.ts` to include the new connector
4. Add protocol metadata and category
5. Implement protocol-specific methods in the connector

Example connector template:

```typescript
import { ProtocolConnectorInterface } from '../protocol-connector-interface';
import { ProtocolAction, ProtocolPosition, ProtocolType } from '../../../types/defi-protocol-types';

export class NewProtocolConnector implements ProtocolConnectorInterface {
  // Implementation here
}
```

### Running Tests

```
npm test
```

## License

MIT
