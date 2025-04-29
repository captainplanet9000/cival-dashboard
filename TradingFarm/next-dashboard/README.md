# Trading Farm Dashboard

A modern, high-performance dashboard for managing blockchain trading farms and agents with enterprise-grade reliability and security.

## Overview

Trading Farm Dashboard is a comprehensive platform for crypto trading operations, allowing users to:

- Monitor and manage trading farms
- Configure and control trading agents
- Track orders and trades in real-time
- Analyze performance metrics with interactive visualizations
- Visualize trading data with advanced charting
- Manage vault banking integration
- **Leverage AI-powered DeFi analytics and strategy recommendations via the ElizaOS DeFi Console**

Built with Next.js 14, TypeScript, Tailwind CSS, shadcn/ui components, and leveraging a Supabase database for secure data management.

## Architecture

The application follows a clean architecture pattern with optimized code splitting and performance:

```
src/
├── app/               # Next.js App Router
│   ├── api/           # API Routes with optimized performance
│   ├── dashboard/     # Dashboard Pages with code splitting
│   └── auth/          # Authentication Pages
├── components/        # React Components
│   ├── ai/            # AI-powered panels (ElizaOS DeFi Command Panel, etc)
│   ├── dashboard/     # Dashboard widgets (ElizaDeFiConsoleWidget, etc)
│   ├── ui/            # Reusable UI components (shadcn/ui)
│   ├── vault/         # Vault Banking related components
│   └── widgets/       # Performance-optimized widgets
├── hooks/             # Custom React hooks
├── services/          # Business Logic and API services
│   ├── agent-management-service.ts
│   ├── vault-banking-service.ts
│   ├── enhanced-vault-service.ts
│   ├── live-trading-service.ts
│   └── elizaos-agent-service.ts
├── lib/               # Utilities
│   ├── environment.ts         # Environment detection
│   ├── react-query-config.ts  # Optimized data fetching
│   ├── type-utils.ts          # Type utilities
│   └── utils.ts               # General utilities
├── tests/             # Comprehensive test suite
│   ├── components/    # Component tests
│   └── integration/   # Integration tests
└── types/             # TypeScript Types
```

## Implementation Status

| Module                    | Status      | Functionality                                       |
|---------------------------|-------------|-----------------------------------------------------|
| Dashboard Layout          | ✅ Complete | Responsive layout with navigation sidebar           |
| Dashboard Home            | ✅ Complete | Overview with metrics, stats, and visualizations    |
| Farms Management          | ✅ Complete | List and detail views for farms                     |
| Agents Management         | ✅ Complete | Configure and monitor trading agents                |
| Orders Management         | ✅ Complete | Order tracking and cancellation                     |
| Trade History             | ✅ Complete | View and filter trade execution history             |
| Analytics                 | ✅ Complete | Trade metrics and performance analysis              |
| Vault Banking             | ✅ Complete | Integrated vault management system                  |
| API Implementation        | ✅ Complete | RESTful endpoints for all resources                 |
| FARMDOCS Ingestion        | ✅ Complete | Documentation ingestion and vector search           |
| Performance Optimization   | ✅ Complete | Code splitting, virtualized lists, optimized bundles|
| Production Deployment      | ✅ Complete | Railway deployment configuration                    |
| Authentication            | 🔄 Planned  | User authentication and authorization               |
| Real-time Updates         | 🔄 Planned  | WebSockets for live data updates                    |
| Strategy Builder          | 🔄 Planned  | Visual interface for building trading strategies    |
| Multi-Agent Coordination  | 🔄 Planned  | Agent-to-agent communication and coordination       |
| Advanced Analytics        | 🔄 Planned  | AI-powered performance analysis and predictions     |
| AI Strategy Optimization  | 🔄 Planned  | AI-assisted strategy development and optimization   |

## API Implementation

The API layer follows RESTful principles and provides endpoints for:

- Dashboard data
- Farms management
- Agents operations
- Orders tracking
- Trades analytics

For detailed API documentation, see [API_IMPLEMENTATION.md](./API_IMPLEMENTATION.md).

## Features

### Dashboard Overview
- Summary statistics
- Performance metrics
- Recent activity
- Value locked
- **ElizaOS DeFi Console**: AI-powered DeFi analytics, lending, risk, and strategy command interface (new widget)

### Farm Management
- Create and configure farms
- Set risk parameters
- Assign agents
- Monitor performance

### Agent Control
- Deploy trading agents
- Configure strategies
- Start/stop operations
- Track performance

### Orders & Trades
- View all orders
- Track execution
- Analyze trade performance

### Analytics
- Performance metrics
- Win rates
- Profit factors
- Market insights

### ElizaOS DeFi Console (NEW)
- Natural language interface for DeFi lending, borrowing, and risk analysis
- Integrated with Aave lending module and strategy engine
- Real-time DeFi analytics and recommendations
- Embedded as a dashboard widget for convenient access
- Supports toast notifications for opportunities and risks

## Getting Started

### Prerequisites
- Node.js 18+ 
- npm or yarn
- Supabase account (for database)

### ElizaOS DeFi Console Usage

Once the app is running, you will find the **ElizaOS DeFi Console** as a dedicated widget on the main dashboard. Use it to:
- Ask natural language questions about DeFi lending, borrowing, and strategies
- Get real-time analytics, risk assessments, and actionable recommendations
- Interact with the Aave lending module and strategy engine through a unified AI interface

### Local Development

```bash
# Clone the repository
git clone https://github.com/tradingfarm/next-dashboard.git

# Navigate to the project directory
cd trading-farm-dashboard

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env.local
# Edit .env.local with your Supabase credentials

# Run the development server
npm run dev
```

The application will be available at http://localhost:3000.

## Deployment

The application can be deployed to Vercel with minimal configuration:

```bash
npm run build
vercel deploy
```

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgements

- Next.js Team for the amazing framework
- Supabase for the backend infrastructure
- TailwindCSS for the styling system



