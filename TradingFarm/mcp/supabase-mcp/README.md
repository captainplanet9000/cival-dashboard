# Trading Farm Supabase MCP Server

A Model-Controller-Provider (MCP) server for connecting Trading Farm agents with Supabase persistence. This server provides a centralized API for agent cooperation, data sharing, and coordinated trading activities.

## Features

- **Agent Cooperation**: Enables trading agents to cooperate via signal sharing, decision voting, and execution delegation
- **Data Persistence**: Stores all agent activity, signals, and trading data in Supabase
- **Real-time Communication**: Provides WebSocket endpoints for real-time data streaming between agents
- **Configuration Management**: Centralized management of agent parameters and strategies
- **Secure API**: JWT authentication and role-based access control
- **Error Handling**: Comprehensive error tracking and reporting
- **Metrics Collection**: Performance tracking for agents, strategies, and trades

## New Features

### Central Coordinator

The Central Coordinator oversees all specialized trading agents within the Trading Farm ecosystem. It provides:

- **Agent Registration & Monitoring**: Tracks all agents, their specializations, and current status
- **Decision Coordination**: Facilitates group decision making using various voting mechanisms
- **Specialist Selection**: Identifies the best agents for specific trading tasks
- **Performance Tracking**: Monitors agent effectiveness and adjusts responsibilities accordingly
- **Adaptable Decision Modes**:
  - `democratic`: Equal weight voting among agents
  - `meritocratic`: Voting weighted by agent performance history
  - `authoritative`: Coordinator makes final decision with agent input
  - `domain_specialist`: Specialist in relevant domain makes decision
  - `consensus`: Requires consensus among all agents

### Message Queue System

The Message Queue system enables asynchronous communication between trading agents with:

- **Priority-based Routing**: Critical messages processed ahead of routine communications
- **Message Types**: Structured message categories (signals, commands, queries, responses, etc.)
- **Delivery Guarantees**: Tracks message status through delivery lifecycle
- **Persistence**: Maintains message history for auditing and analysis
- **Scheduled Messages**: Supports delayed delivery for time-sensitive operations
- **Real-time Notifications**: WebSocket integration for immediate updates

## Getting Started

### Prerequisites

- Node.js (v16+)
- Supabase account with project set up
- PostgreSQL knowledge (for advanced customization)

### Installation

1. Clone the repository
   ```bash
   git clone https://github.com/yourusername/trading-farm-supabase-mcp.git
   ```

2. Install dependencies
   ```bash
   cd trading-farm-supabase-mcp
   npm install
   ```

3. Configure environment variables
   ```bash
   cp .env.example .env
   # Edit .env with your Supabase credentials and settings
   ```

4. Start the server
   ```bash
   npm run dev  # Development mode
   npm start    # Production mode
   ```

## API Endpoints

### Agent Coordinator API

- `POST /api/coordinator/agents` - Register a new agent
- `GET /api/coordinator/agents` - Get all registered agents
- `GET /api/coordinator/agents/:agentId` - Get a specific agent
- `PUT /api/coordinator/agents/:agentId` - Update an agent
- `PATCH /api/coordinator/agents/:agentId/status` - Update agent status
- `GET /api/coordinator/specialists/:specialization` - Get specialist agents
- `POST /api/coordinator/decisions` - Request a coordinated decision
- `GET /api/coordinator/specializations` - List available specializations
- `GET /api/coordinator/decision-modes` - List available decision modes

### Message Queue API

- `POST /api/messages` - Send a message
- `GET /api/messages/agent/:agentId` - Get messages for an agent
- `PATCH /api/messages/:messageId/deliver` - Mark message as delivered
- `PATCH /api/messages/:messageId/read` - Mark message as read
- `POST /api/messages/:messageId/respond` - Respond to a message
- `GET /api/messages/types` - List available message types
- `GET /api/messages/priorities` - List available message priorities

### Agent Cooperation API

- `POST /api/cooperation` - Create cooperation record
- `GET /api/cooperation` - Get all cooperation records
- `GET /api/cooperation/:id` - Get specific cooperation record
- `PUT /api/cooperation/:id` - Update cooperation record
- `DELETE /api/cooperation/:id` - Delete cooperation record

## Architecture

The Supabase MCP server follows a modular architecture:

```
├── config.js           # Configuration settings
├── server.js           # Main entry point
├── logger.js           # Logging utility
├── supabase-client.js  # Supabase connection
│
├── models/             # Data models and validation
│   ├── agent-coordinator-model.js
│   ├── cooperation-model.js
│   └── message-queue-model.js
│
├── routes/             # API routes
│   ├── agents-routes.js
│   ├── coordinator-routes.js
│   ├── cooperation-routes.js
│   └── messages-routes.js
│
├── services/           # Business logic
│   ├── agent-coordinator-service.js
│   ├── cooperation-service.js
│   ├── message-queue-service.js
│   └── scheduler-service.js
│
└── utils/              # Utility functions
    ├── db-setup.js
    └── helpers.js
```

## Agent Specializations

The system supports various specialized agent types:

- **Market Analysis**: Analyzes market trends and conditions
- **Execution**: Specializes in optimal order execution
- **Risk Management**: Monitors and manages trading risks
- **Portfolio Optimization**: Optimizes asset allocation
- **Cross Chain Arbitrage**: Identifies opportunities across chains
- **Alpha Hunting**: Searches for alpha-generating opportunities
- **Liquidity Provider**: Specializes in providing liquidity
- **Research**: Researches new trading strategies
- **Technical Analysis**: Performs technical chart analysis
- **Sentiment Analysis**: Analyzes market sentiment

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request. 