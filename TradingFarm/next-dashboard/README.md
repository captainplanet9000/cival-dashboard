# Trading Farm Dashboard

A modern dashboard for managing blockchain trading farms and agents.

## Overview

Trading Farm Dashboard is a comprehensive platform for crypto trading operations, allowing users to:

- Monitor and manage trading farms
- Configure and control trading agents
- Track orders and trades
- Analyze performance metrics
- Visualize trading data

Built with Next.js 14, TypeScript, Tailwind CSS, and leveraging a Supabase database.

## Architecture

The application follows a clean architecture pattern:

```
src/
├── app/               # Next.js App Router
│   ├── api/           # API Routes
│   ├── dashboard/     # Dashboard Pages
│   └── auth/          # Authentication Pages
├── components/        # React Components
├── data-access/       # Data Access Layer
│   ├── models/        # Data Models
│   ├── repositories/  # Data Repositories
│   └── services/      # Business Logic
├── lib/               # Utilities
└── types/             # TypeScript Types
```

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

## Getting Started

### Prerequisites
- Node.js 18+ 
- npm or yarn
- Supabase account (for database)

### Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/trading-farm-dashboard.git

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