# Trading Farm Dashboard

A comprehensive dashboard for managing crypto trading farms with Supabase backend integration and real-time updates.

## Overview

Trading Farm Dashboard is a modern web application that allows users to manage and monitor their crypto trading operations. The application uses Next.js for the frontend and Supabase for the backend, with real-time updates powered by Supabase's realtime functionality.

## Features

- **Farm Management:** Create and manage trading farms with customizable goals and risk levels
- **Portfolio Analytics:** Track performance metrics, equity curves, and allocations
- **Banking:** Manage wallets, transactions, and flash loans
- **Trading:** Create and monitor orders across multiple exchanges
- **Strategies:** Create, backtest, and deploy trading strategies
- **ElizaOS AI:** Integrated AI assistant for natural language operations
- **Real-time Updates:** Get real-time notifications for key events
- **Webhooks:** Integrate with external services

## Backend Architecture

The backend is built on Supabase with the following components:

### Database Schema

The database schema is organized into the following main sections:

1. **Farm Core Tables**
   - `farms`: Main farm entities
   - `farm_wallets`: Wallet management for farms
   - `farm_agents`: Automated agents for farms
   - `farm_settings`: Configuration settings

2. **Trading Tables**
   - `orders`: Trading orders with statuses
   - `trades`: Executed trades
   - `flash_loans`: Flash loan operations

3. **Strategy Tables**
   - `strategies`: Trading strategy definitions
   - `strategy_versions`: Version history for strategies
   - `strategy_backtests`: Backtest results
   - `farm_strategies`: Mapping between farms and strategies

4. **ElizaOS Tables**
   - `eliza_conversations`: AI conversations
   - `eliza_messages`: Individual messages in conversations
   - `knowledge_base`: Knowledge items for AI
   - `memory_items`: Memory storage for AI

5. **Analytics Tables**
   - `strategy_analytics`: Performance metrics for strategies
   - `farm_performance_snapshots`: Historical performance snapshots
   - `risk_assessment_reports`: Risk analysis reports

6. **Integration Tables**
   - `webhooks`: External integrations via webhooks
   - `integrations`: External service connections
   - `notification_settings`: User notification preferences
   - `notifications`: User notifications

### Edge Functions

Custom Supabase Edge Functions are used for:

1. **Webhook Handling**: Process incoming webhooks from external services
2. **Real-time Updates**: Manage real-time subscriptions and broadcasts
3. **Scheduled Jobs**: Run automated tasks based on schedules

### Supabase Message Control Protocol (MCP)

The application uses Supabase MCP to handle more complex interactions with the database. The MCP endpoint is located at:

```
https://mcp.composio.dev/supabase/ancient-brash-planet-yjteSe
```

MCP provides:
- Enhanced query capabilities
- Transactional operations
- Custom function execution

## Service Modules

The application is organized into service modules that handle specific functionality:

1. **Farm Service**: Manages farm creation, configuration, and lifecycle
2. **Wallet Service**: Handles wallet operations and transaction history
3. **Strategy Service**: Manages trading strategies and backtesting
4. **Trading Service**: Handles orders, trades, and flash loans
5. **Analytics Service**: Provides performance metrics and risk assessment
6. **ElizaOS Service**: Powers the AI assistant capabilities

## Getting Started

### Prerequisites

- Node.js 16+
- Supabase account and project
- PostgreSQL knowledge for advanced database operations

### Installation

1. Clone the repository
```bash
git clone https://github.com/yourusername/trading-farm-dashboard.git
cd trading-farm-dashboard
```

2. Install dependencies
```bash
npm install
```

3. Set up environment variables
```bash
cp .env.example .env.local
```

4. Update `.env.local` with your Supabase credentials

5. Run database migrations
```bash
npx supabase migration up
```

6. Start the development server
```bash
npm run dev
```

### Database Migrations

Database migrations are located in the `supabase/migrations` directory. To apply a migration:

```bash
npx supabase migration up
```

To create a new migration:

```bash
npx supabase migration new <migration-name>
```

After creating a migration, don't forget to run:

```bash
npx supabase gen types typescript --local > src/types/database.types.ts
```

## Real-time Functionality

The dashboard uses Supabase's real-time capabilities for:

1. Live order updates
2. Real-time trade notifications
3. Farm status changes
4. Performance metric updates

To enable real-time for a specific table, modify the Supabase dashboard or use the following SQL:

```sql
-- Enable real-time for a table
ALTER PUBLICATION supabase_realtime ADD TABLE public.table_name;
```

## Webhooks

External services can integrate with the Trading Farm Dashboard through webhooks. The webhook endpoint is available at:

```
https://your-project.supabase.co/functions/v1/webhook-handler
```

Supported webhook events include:
- `farm.status.changed`
- `trade.executed`
- `order.status.changed`
- `strategy.performance.updated`
- `flash.loan.status.changed`
- `risk.threshold.exceeded`

## Scheduled Jobs

The application supports scheduled jobs for automated tasks such as:
- Performance metric calculation
- Risk assessment
- Position cleanup
- Wallet balance synchronization
- Notification digests

Jobs are managed through the `scheduled_jobs` table and processed by the cron-scheduler Edge Function.

## Security

The application implements a comprehensive security model:

1. **Row Level Security (RLS)**: All tables have RLS policies to ensure users can only access their own data
2. **API Key Management**: Secure API key generation and validation for external access
3. **Audit Logging**: Comprehensive audit trail of important actions
4. **Secure Webhook Signatures**: Webhook payloads are signed for verification

## Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes
4. Commit your changes (`git commit -m 'Add some amazing feature'`)
5. Push to the branch (`git push origin feature/amazing-feature`)
6. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgements

- Supabase for the incredible backend platform
- Next.js team for the frontend framework
- OpenAI for ElizaOS AI capabilities
