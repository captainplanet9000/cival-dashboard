# AI-Driven Trading Farm Dashboard

A decentralized AI-driven trading farm that operates on Hyperliquid (Arbitrum) and Sonic blockchain through Vertex. This project leverages the ElizaOS framework for blockchain integration and utilizes advanced trading strategies, risk management, and workflow automation.

## Features

- **Blockchain Integration**: Connects to Hyperliquid (Arbitrum) and Sonic Blockchain via Vertex
- **Advanced Trading Strategies**: Implements Elliott Wave Analysis, Darvas Box Strategy, Renko Charts, Ichimoku Cloud, and Williams Alligator
- **Risk Management**: Implements stop-loss, take-profit, and trailing stop mechanisms
- **Workflow Automation**: Modular workflows for data ingestion, signal generation, order execution, and risk monitoring
- **Backtesting**: Integrated historical data analysis and strategy optimization
- **Real-time Market Data**: WebSocket connections to multiple exchanges with data normalization
- **Python Libraries Integration**: Leverages OpenBB, Pandas, NumPy, Zipline, VectorBT, and Riskfolio
- **ElizaOS Command System**: Natural language interface for trading operations
- **Monitoring & Observability**: Prometheus and Grafana integration for system health and performance

## Project Structure

```
TradingFarm/
├── .github/workflows/      # CI/CD pipelines
├── config/                 # Configuration files
├── docker-compose.yml      # Docker services orchestration
├── Dockerfile              # Next.js dashboard container
├── monitoring/             # Prometheus and Grafana configuration
├── next-dashboard/         # Next.js frontend application
│   ├── public/             # Static assets
│   ├── src/                # Frontend source code
│   │   ├── app/            # Next.js app router
│   │   ├── components/     # UI components
│   │   ├── hooks/          # React hooks
│   │   ├── lib/            # Utility functions
│   │   └── services/       # API service clients
│   └── next.config.js      # Next.js configuration
├── python-libraries-mcp/   # Python Libraries MCP server
│   ├── Dockerfile          # MCP server container
│   ├── main.py             # FastAPI application
│   ├── requirements.txt    # Python dependencies
│   └── routes/             # API endpoints
├── src/
│   ├── blockchain/         # Blockchain integration modules
│   ├── strategies/         # Trading strategy implementations
│   ├── risk_management/    # Risk management components
│   ├── workflow/           # Workflow automation modules
│   └── backtesting/        # Backtesting and optimization tools
├── tests/                  # Test suite
├── deploy.sh               # Deployment automation script
├── .env.example            # Environment variables template
└── README.md               # Project documentation
```

## Getting Started

### Prerequisites

- Docker and Docker Compose
- Node.js 18+ (for local development)
- Python 3.10+ (for local development)
- Git

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/captainplanet9000/GWDS.git
   cd GWDS/TradingFarm
   ```

2. Create environment file:
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

3. Start the application with Docker:
   ```bash
   ./deploy.sh
   ```

4. For local development:
   ```bash
   # Frontend
   cd next-dashboard
   npm install
   npm run dev

   # MCP Server
   cd python-libraries-mcp
   pip install -r requirements.txt
   uvicorn main:app --reload
   ```

### Docker Deployment

The project uses Docker Compose to orchestrate the following services:

- **next-dashboard**: Next.js frontend application
- **python-libraries-mcp**: Python Libraries MCP server (FastAPI)
- **redis**: Caching layer
- **timescaledb**: Time-series database
- **prometheus**: Metrics collection
- **grafana**: Monitoring dashboards

Run the full stack:
```bash
docker-compose up -d
```

## CI/CD Pipeline

The GitHub Actions workflow handles:

1. **Testing**: Runs frontend and backend tests
2. **Building**: Creates Docker images for the dashboard and MCP server
3. **Deployment**: Pushes to production server
4. **Monitoring**: Performs health checks after deployment

## Monitoring

Access monitoring tools:

- Prometheus: http://localhost:9090
- Grafana: http://localhost:3001 (admin/secure_grafana_password)

## Backtesting

Run backtesting with historical data:
```bash
python -m src.backtesting.backtest --strategy ichimoku --start-date 2023-01-01 --end-date 2023-12-31
```

## Security

This project implements secure API key management and input validation. Two-factor authentication is available for user accounts. Security features include:

- HTTP security headers
- Secrets management with environment variables
- Rate limiting for API endpoints
- JWT authentication for protected routes
- Database backup automation

## License

This project is licensed under the MIT License - see the LICENSE file for details.
