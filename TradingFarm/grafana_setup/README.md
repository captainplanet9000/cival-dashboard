# Trading Farm Grafana Dashboard

This directory contains the configuration for the new Grafana-based dashboard with a forest green theme for the Trading Farm.

## Features

- Modern, responsive dashboard with a forest green color theme
- Real-time monitoring of trading signals, positions, and portfolio performance
- Historical data visualization with time-series graphs
- Agent performance comparison
- Symbol-specific metrics and visualization

## Setup Instructions

### Prerequisites

- Docker and Docker Compose
- Python 3.9+
- Trading Farm database with metrics data

### Running the Dashboard

1. **Start the API Server**

   ```bash
   python -m src.api.grafana_api
   ```

   This will start the FastAPI server that exposes the Trading Farm metrics to Grafana.

2. **Start Grafana using Docker Compose**

   ```bash
   cd grafana_setup
   docker-compose up -d
   ```

3. **Access the Dashboard**

   Open your browser and navigate to:
   http://localhost:3000

   Login with the following credentials:
   - Username: admin
   - Password: tradingfarm

## Dashboard Components

### Trading Metrics

- **Portfolio Performance**: Track PnL over time with a forest green theme
- **Active Positions**: Monitor current open positions
- **Signals Dashboard**: View signal accuracy and distribution
- **Win Rate Gauge**: Visual representation of trading performance
- **Asset Price Charts**: Track asset prices with forest green styling

### Management Interface

- **Agent Management**: Monitor agent performance and status
- **Position Table**: Detailed view of all active positions
- **Recent Signals**: Table of recent trading signals

## Customization

You can customize the dashboard by:

1. Editing the `trading_dashboard.json` file
2. Updating color themes in the `docker-compose.yml` environment variables
3. Adding new panels through the Grafana UI (changes will persist)

## Technology Stack

- **Grafana**: Visualization platform
- **FastAPI**: API service for exposing metrics
- **SQLite**: Database backend for Trading Farm
- **Docker**: Containerization for easy deployment

## Troubleshooting

- If the dashboard doesn't load, check that both the API server and Grafana container are running
- For data issues, verify the database connection and ensure metrics are being collected
- Check logs with `docker-compose logs grafana` for Grafana-specific issues
