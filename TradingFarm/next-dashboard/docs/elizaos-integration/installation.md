# ElizaOS Trading Agent System - Installation & Setup

This guide provides step-by-step instructions for setting up the ElizaOS Trading Agent System within the Trading Farm dashboard.

## Prerequisites

Before beginning the installation, ensure you have the following:

- Node.js 18.0 or higher
- PostgreSQL 14.0+ with Supabase extensions
- Git client
- NPM or Yarn package manager
- Access to your exchange API credentials (for live trading)

## Installation Steps

### 1. Clone the Repository

```bash
git clone https://github.com/yourorganization/trading-farm-dashboard.git
cd trading-farm-dashboard
```

### 2. Install Dependencies

```bash
npm install
# or with yarn
yarn install
```

### 3. Configure Environment Variables

Create a `.env.local` file in the root directory with the following variables:

```env
# Database Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# ElizaOS API Configuration
ELIZAOS_API_KEY=your_elizaos_api_key
ELIZAOS_API_BASE_URL=https://api.elizaos.com/v1

# Exchange API Keys (Optional - for live trading)
# These will be stored encrypted in the database
# COINBASE_API_KEY=your_coinbase_api_key
# COINBASE_API_SECRET=your_coinbase_api_secret
# BYBIT_API_KEY=your_bybit_api_key
# BYBIT_API_SECRET=your_bybit_api_secret
# HYPERLIQUID_PRIVATE_KEY=your_hyperliquid_private_key

# Feature Flags
ENABLE_PAPER_TRADING=true
ENABLE_LIVE_TRADING=false
ENABLE_STRATEGY_OPTIMIZATION=true
ENABLE_MULTI_AGENT=true
```

### 4. Initialize the Database

```bash
# Start the local Supabase instance
npx supabase start

# Run migrations
npx supabase migration up

# Generate TypeScript types
npx supabase gen types typescript --local > src/types/database.types.ts
```

### 5. Start the Development Server

```bash
npm run dev
# or with yarn
yarn dev
```

The application will be available at `http://localhost:3000`.

## Setting Up ElizaOS Integration

### 1. Connect Your ElizaOS Account

1. Navigate to Dashboard > Settings > Integrations
2. Click "Connect ElizaOS Account"
3. Enter your ElizaOS API key
4. Verify the connection status shows "Connected"

### 2. Configure Trading Agent Templates

1. Navigate to Dashboard > Settings > Agent Templates
2. Click "Import Default Templates"
3. Verify that the default trading agent templates are imported
4. (Optional) Create custom templates based on your specific needs

### 3. Set Up Paper Trading Environment

1. Navigate to Dashboard > Settings > Paper Trading
2. Configure initial balances for paper trading
3. Set desired simulation parameters (slippage, execution delay, etc.)
4. Click "Initialize Paper Trading Account"

## Exchange Connection Setup

### 1. Add Exchange Connections

1. Navigate to Dashboard > Settings > Exchanges
2. Click "Add Exchange Connection"
3. Select your exchange (Coinbase, Bybit, Hyperliquid, etc.)
4. Enter your API credentials (these will be encrypted)
5. Set a friendly name for this connection
6. Choose testnet/sandbox mode for initial testing
7. Click "Test Connection" to verify
8. Save the connection

### 2. Verify Exchange Permissions

Ensure your exchange API keys have the following permissions:

- **Read**: Account balances, order history, positions
- **Trade**: Place, modify, and cancel orders
- **Withdrawal**: Disabled (recommended for security)

## Initial Configuration

### 1. Configure Risk Parameters

1. Navigate to Dashboard > Settings > Risk Management
2. Set global risk parameters:
   - Maximum position size (% of portfolio)
   - Maximum drawdown limit
   - Default stop-loss percentage
   - Default take-profit percentage
3. Save the configuration

### 2. Configure System Monitoring

1. Navigate to Dashboard > Settings > Monitoring
2. Set alert thresholds for:
   - Unusual trading volume
   - Large drawdowns
   - Connection failures
   - System performance degradation
3. Configure alert destinations (email, dashboard, etc.)
4. Save the configuration

## Verify Installation

To verify that your installation is working correctly:

1. Create a simple trading agent (see [Creating Your First Trading Agent](./first-agent.md))
2. Run the agent in paper trading mode
3. Verify that the agent can:
   - Receive market data
   - Generate trading signals
   - Execute paper trades
   - Record performance metrics

## Troubleshooting

If you encounter issues during installation, check the following:

- Ensure all environment variables are correctly set
- Verify that your database migrations ran successfully
- Check that your Supabase instance is running
- Verify your ElizaOS API key is valid
- Check the application logs for specific error messages

For more detailed troubleshooting, refer to the [Troubleshooting Guide](./troubleshooting.md).

## Next Steps

After completing the installation, proceed to:

1. [Creating Your First Trading Agent](./first-agent.md)
2. [Paper Trading Guide](./paper-trading.md)
3. [Multi-Agent Systems](./multi-agent-systems.md)
