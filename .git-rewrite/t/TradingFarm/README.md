# AI-Driven Trading Farm

A decentralized AI-driven trading farm that operates on Hyperliquid (Arbitrum) and Sonic blockchain through Vertex. This project leverages the ElizaOS framework for blockchain integration and utilizes advanced trading strategies, risk management, and workflow automation.

## Features

- **Blockchain Integration**: Connects to Hyperliquid (Arbitrum) and Sonic Blockchain via Vertex
- **Advanced Trading Strategies**: Implements Elliott Wave Analysis, Darvas Box Strategy, Renko Charts, Ichimoku Cloud, and Williams Alligator
- **Risk Management**: Implements stop-loss, take-profit, and trailing stop mechanisms
- **Workflow Automation**: Modular workflows for data ingestion, signal generation, order execution, and risk monitoring
- **Backtesting**: Integrated historical data analysis and strategy optimization

## Project Structure

```
TradingFarm/
├── config/                 # Configuration files
├── src/
│   ├── blockchain/         # Blockchain integration modules
│   ├── strategies/         # Trading strategy implementations
│   ├── risk_management/    # Risk management components
│   ├── workflow/           # Workflow automation modules
│   └── backtesting/        # Backtesting and optimization tools
├── tests/                  # Test suite
├── requirements.txt        # Dependencies
└── README.md               # Project documentation
```

## Getting Started

### Prerequisites

- Python 3.10+
- ElizaOS framework
- TA-Lib for technical analysis
- Web3.py for blockchain interaction

### Installation

1. Clone the repository
2. Install dependencies:
   ```
   pip install -r requirements.txt
   ```
3. Set up environment variables in a `.env` file:
   ```
   HYPERLIQUID_API_KEY=your_api_key
   SONIC_API_KEY=your_api_key
   VERTEX_API_KEY=your_api_key
   ```

### Running the Trading Farm

1. Start the data ingestion workflow:
   ```
   python -m src.workflow.data_ingestion
   ```
2. Launch the trading engine:
   ```
   python -m src.main
   ```

## Backtesting

Run backtesting with historical data:
```
python -m src.backtesting.backtest --strategy ichimoku --start-date 2023-01-01 --end-date 2023-12-31
```

## Security

This project implements secure API key management and input validation. Two-factor authentication is available for user accounts.

## License

This project is licensed under the MIT License - see the LICENSE file for details.
