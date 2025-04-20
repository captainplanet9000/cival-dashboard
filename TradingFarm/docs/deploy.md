# Trading Farm: One-Click Deployment Guide

This guide walks you through setting up the complete Trading Farm platform with a single command, using Docker Compose to orchestrate all necessary services:

- **Next.js Frontend**: Modern dashboard UI with real-time data
- **FastAPI Backend**: REST API with natural language trading commands and cross-chain bridging
- **Supabase**: PostgreSQL database with Row Level Security and real-time subscriptions
- **Windmill**: Workflow automation for trading strategies

## System Requirements

- Docker and Docker Compose installed
- At least 4GB of available RAM
- 10GB of free disk space
- Internet connection for pulling Docker images

## Quick Start

```bash
# Clone the repository (if you haven't already)
git clone https://github.com/captainplanet9000/GWDS.git
cd GWDS/TradingFarm

# Initialize and start all services with a single command
make init
make up
```

That's it! Your Trading Farm should now be running with the following services available:

- **Frontend Dashboard**: http://localhost:3000
- **Backend API**: http://localhost:8000
- **Supabase Studio**: http://localhost:3002
- **Windmill Workflows**: http://localhost:8080

## Configuration

The initialization process creates a `.env` file based on `.env.example` with a randomly generated JWT secret. You can edit this file to customize your deployment:

```
# Edit environment variables
nano .env
```

Important configurations:

- **API Keys**: Add your OpenAI API key for natural language commands
- **LayerZero API Key**: For cross-chain bridging (optional for development)
- **Database Credentials**: Customize if needed

## Architecture Overview

The Trading Farm platform consists of interconnected services that work together:

```
┌────────────────┐      ┌────────────────┐      ┌────────────────┐
│    Frontend    │◄────►│    Backend     │◄────►│    Supabase    │
│   (Next.js)    │      │   (FastAPI)    │      │  (PostgreSQL)  │
└────────────────┘      └────────────────┘      └────────────────┘
        ▲                       ▲                       ▲
        │                       │                       │
        │                       │                       │
        │                       ▼                       │
        │               ┌────────────────┐             │
        └───────────────►    Windmill    │◄────────────┘
                        │  (Workflows)   │
                        └────────────────┘
```

- **Frontend** (port 3000): React application built with Next.js and shadcn/ui
- **Backend** (port 8000): FastAPI service with natural language trading commands and cross-chain bridging
- **Supabase** components:
  - PostgreSQL (port 5432): Database with RLS policies
  - REST API (port 3001): PostgREST for direct database access
  - Storage (port 5000): File storage service
  - Studio (port 3002): Web interface for database management
- **Windmill** (port 8080): Workflow automation service

## Command Reference

The `Makefile` provides several helpful commands:

- `make init`: Initialize environment files and check dependencies
- `make up`: Start all services
- `make down`: Stop all services
- `make restart`: Restart all services
- `make logs`: View logs from all services
- `make build`: Build services without starting them
- `make rebuild`: Rebuild and restart all services
- `make clean`: Remove all containers, networks, and volumes (data will be lost)
- `make status`: Show status of all services
- `make help`: Show help message

## Development Workflow

When developing with this environment:

1. Make changes to your frontend or backend code
2. Run `make rebuild` to rebuild and restart the affected services
3. View logs with `make logs` to debug issues

## Features Enabled by This Deployment

### 1. Natural Language Trading Commands

The FastAPI backend includes LangChain integration that allows users to type instructions like:

```
long ETH perp 2× when price crosses 200-MA
```

The system will:
- Parse the intent using GPT-4o
- Confirm the action with the user
- Execute the trade with appropriate parameters

### 2. Cross-Chain Bridge Module (LayerZero)

The bridge integration allows moving tokens across different blockchains:

- Quote fees before transferring
- Execute transfers with transaction tracking
- Monitor status of cross-chain transactions
- Support for 10+ major blockchain networks

### 3. Data Persistence

All data is stored in Supabase PostgreSQL with:

- Row Level Security for data access control
- Automatic timestamp management (created_at/updated_at)
- Real-time subscriptions for dashboard updates

## Troubleshooting

If you encounter issues:

1. Check service status: `make status`
2. View logs: `make logs`
3. Ensure all required ports are available (3000, 3001, 3002, 5000, 5432, 8000, 8080)
4. Verify Docker has sufficient resources allocated
5. Restart all services: `make restart`

For database-specific issues, you can access Supabase Studio at http://localhost:3002.

## Next Steps

After deploying, you should:

1. Configure available exchanges in the dashboard
2. Connect your wallets
3. Set up your first trading farm
4. Create and train trading agents
5. Set goals for your agents

## Cleanup

When you're done, you can stop all services with:

```bash
make down
```

To completely remove all data and containers:

```bash
make clean
```

## Security Considerations

This deployment includes several security measures:

- JWT-based authentication
- Row Level Security policies for database access
- Encrypted database credentials
- Isolated container network

For production deployments, consider:

- Using a reverse proxy with HTTPS
- Setting up database backups
- Implementing additional monitoring
- Using separate API keys for each component
