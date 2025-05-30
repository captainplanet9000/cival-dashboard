# Creating Your First Trading Agent

This guide walks you through the process of creating, configuring, and deploying your first ElizaOS trading agent within the Trading Farm dashboard.

## Overview

ElizaOS trading agents are autonomous AI systems that can execute trading strategies based on market data, technical indicators, and fundamental analysis. They can operate independently or as part of a larger multi-agent system.

## Prerequisites

Before creating your first trading agent, ensure you have:

- Completed the [Installation & Setup](./installation.md) process
- Set up paper trading (recommended for initial testing)
- Familiar with basic trading concepts and terminology

## Step 1: Access the Agent Creation Interface

1. Login to your Trading Farm dashboard
2. Navigate to Dashboard > Agents > Create Agent
3. Select "Trading Agent" as the agent type

## Step 2: Configure Basic Agent Settings

![Agent Creation Form](../assets/agent-creation-form.png)

Fill in the following basic information:

| Field | Description | Example |
|-------|-------------|---------|
| Agent Name | A descriptive name for your agent | "BTC Momentum Trader" |
| Description | Purpose and strategy of the agent | "Trades BTC/USDT using momentum indicators" |
| Trading Mode | Paper or Live trading | "Paper Trading" (recommended for beginners) |
| Base Model | AI model to power the agent | "GPT-4o" or "Claude-3-Opus" |

## Step 3: Select Trading Strategy

Choose a trading strategy template or create a custom one:

### Using a Template:

1. Click "Select Strategy Template"
2. Browse the available templates (e.g., Moving Average Crossover, RSI, Bollinger Bands)
3. Select the template that matches your trading style
4. Click "Apply Template"

### Creating a Custom Strategy:

1. Click "Create Custom Strategy"
2. Define the strategy parameters:
   - Indicators (Moving Averages, RSI, MACD, etc.)
   - Signal conditions (when to buy/sell)
   - Timeframes for analysis
3. Click "Save Custom Strategy"

## Step 4: Configure Trading Parameters

Set the following parameters for your agent:

### Markets & Instruments

1. Select the trading pairs (e.g., BTC/USDT, ETH/USDT)
2. Choose the timeframes to analyze (e.g., 5m, 15m, 1h, 4h)
3. Specify maximum positions per trading pair

### Risk Management

Set risk parameters to protect your capital:

| Parameter | Description | Recommended Value |
|-----------|-------------|-------------------|
| Position Size | % of portfolio per trade | 1-5% |
| Stop Loss | % loss before exit | 2-3% |
| Take Profit | % gain for exit | 3-5% |
| Max Drawdown | Max portfolio loss before pause | 10-15% |
| Max Open Positions | Total concurrent positions | 3-5 |

### Exchange Connection

1. Select "Paper Trading" for initial testing
2. For live trading (later), select your configured exchange connection

## Step 5: Configure Agent Capabilities

Select the capabilities your agent will have:

- **Technical Analysis**: Enable indicators and chart pattern recognition
- **Sentiment Analysis**: Consider market sentiment from news and social media
- **Order Management**: Manage entries, exits, and position sizing
- **Risk Management**: Apply risk controls and circuit breakers
- **Journaling**: Record detailed trading journals for later analysis

## Step 6: Set Operating Schedule

Configure when your agent will be active:

1. Trading Hours: 24/7 or specific hours
2. Weekends: Enabled or disabled
3. Maintenance Window: Time for strategy updates

## Step 7: Create and Deploy the Agent

1. Review all settings
2. Click "Create Agent"
3. Confirm agent creation in the confirmation dialog

After creation, you'll be redirected to the agent dashboard where you can monitor its status.

## Step 8: Initialize the Agent

On the agent dashboard:

1. Review the agent status card at the top of the page
2. Click "Initialize Agent" to start the agent
3. Confirm initialization in the confirmation dialog

The agent will now go through a startup sequence:

1. Loading strategy and parameters
2. Connecting to market data
3. Performing initial market analysis
4. Entering standby mode awaiting trading opportunities

## Step 9: Monitor Your Agent

Once running, monitor your agent from the dashboard:

![Agent Dashboard](../assets/agent-dashboard.png)

Key monitoring sections:

- **Agent Status**: Current state and health
- **Performance Metrics**: P&L, win rate, drawdown
- **Open Positions**: Current positions and unrealized P&L
- **Recent Trades**: History of executed trades
- **Agent Logs**: Detailed activity log for debugging

## Step 10: Fine-tune Your Agent

After observing your agent's performance:

1. Navigate to the "Performance" tab
2. Analyze trading results and metrics
3. Identify areas for improvement
4. Adjust strategy parameters or risk settings
5. Consider using the "Strategy Optimizer" for automated tuning

## Example: Simple Moving Average Crossover Agent

Here's an example configuration for a basic Moving Average Crossover trading agent:

```json
{
  "name": "BTC MA Crossover",
  "description": "Trades BTC/USDT using moving average crossovers",
  "trading_mode": "paper_trading",
  "base_model": "gpt-4o",
  "strategy": {
    "type": "moving_average_crossover",
    "parameters": {
      "fast_period": 9,
      "slow_period": 21,
      "signal_threshold": 0.5,
      "confirmation_candles": 2
    }
  },
  "trading_pairs": ["BTC/USDT"],
  "timeframes": ["1h", "4h"],
  "risk_management": {
    "position_size_percent": 2,
    "stop_loss_percent": 2,
    "take_profit_percent": 4,
    "max_drawdown_percent": 15,
    "max_open_positions": 3
  },
  "capabilities": [
    "technical_analysis",
    "order_management",
    "risk_management",
    "journaling"
  ],
  "schedule": {
    "active_hours": "24/7",
    "include_weekends": true
  }
}
```

## Common Questions

### How long should I test in paper trading mode?
We recommend at least 2-4 weeks of paper trading to ensure your strategy performs as expected under various market conditions.

### Can I modify my agent after creation?
Yes, most parameters can be adjusted by navigating to the agent settings page. However, some core strategy changes may require creating a new agent.

### What if my agent performs poorly?
Use the performance analytics to identify issues. Common problems include:
- Poor entry/exit timing
- Inappropriate position sizing
- Trading during unsuitable market conditions
- Strategy parameters that need optimization

### Can I clone an existing agent?
Yes, from the agent dashboard, click the "Clone" button to create a copy that you can modify.

## Next Steps

After creating your first trading agent, consider:

1. [Paper Trading Guide](./paper-trading.md) for testing your agent risk-free
2. [Strategy Optimization](./strategy-optimization.md) for improving performance
3. [Multi-Agent Systems](./multi-agent-systems.md) for creating coordinated agent teams
