# Momentum Strategy Example

This example demonstrates how to create and deploy a momentum trading strategy using the Trading Farm Dashboard.

## Strategy Description

This momentum strategy identifies bullish trends using the MACD indicator and enters long positions when momentum conditions are met. The strategy includes risk management parameters and specific exit conditions.

### Natural Language Definition

```
This is a momentum trading strategy for Bitcoin on the 1-hour timeframe. Enter a long position when the MACD line crosses above the signal line and the RSI is above 50, indicating bullish momentum. Use a 2.5% stop loss to protect capital and a 7.5% take profit to secure gains. Position size should be 5% of available balance. Exit the trade if the price crosses below the 50-period moving average or after holding for 2 days.
```

## Strategy Structure

When the above natural language definition is processed by the system, it creates a structured strategy with the following components:

### Entry Conditions

```json
[
  {
    "type": "indicator_crossover",
    "params": {
      "indicator": "MACD",
      "direction": "bullish"
    },
    "description": "MACD line crosses above signal line"
  },
  {
    "type": "indicator_threshold",
    "params": {
      "indicator": "RSI",
      "threshold": 50,
      "comparison": "above"
    },
    "description": "RSI is above 50"
  }
]
```

### Exit Conditions

```json
[
  {
    "type": "price_target",
    "params": {
      "targetType": "percent",
      "value": 7.5
    },
    "description": "Price reaches 7.5% gain"
  },
  {
    "type": "stop_loss",
    "params": {
      "stopType": "percent",
      "value": 2.5
    },
    "description": "Price hits 2.5% loss"
  },
  {
    "type": "moving_average_crossover",
    "params": {
      "period": 50,
      "direction": "bearish"
    },
    "description": "Price crosses below 50-period moving average"
  },
  {
    "type": "time_based",
    "params": {
      "timeframe": "1h",
      "periods": 48
    },
    "description": "Exit after holding for 2 days"
  }
]
```

### Risk Management

```json
{
  "stopLoss": 2.5,
  "takeProfit": 7.5,
  "positionSizing": "5%",
  "maxPositions": 1
}
```

### Parameters

```json
{
  "timeframe": "1h",
  "markets": ["BTC-USD"],
  "indicators": [
    {
      "name": "MACD",
      "params": {
        "fast": 12,
        "slow": 26,
        "signal": 9
      }
    },
    {
      "name": "RSI",
      "params": {
        "period": 14
      }
    },
    {
      "name": "MA",
      "params": {
        "period": 50,
        "type": "simple"
      }
    }
  ]
}
```

## Implementation Steps

1. Navigate to the Strategy Creation page
2. Enter a name such as "MACD Momentum Strategy"
3. Paste the natural language definition into the appropriate field
4. Add tags like "momentum", "bitcoin", "macd"
5. Click "Create Strategy"
6. Review the created strategy structure
7. Run a backtest to evaluate performance
8. Deploy to a trading agent if the backtest results are satisfactory

## Backtest Results

Here's an example of what the backtest results might look like:

- **Time Period**: Jan 1, 2023 - Mar 31, 2023
- **Market**: BTC-USD
- **Initial Capital**: $10,000
- **Final Balance**: $12,450
- **Total Return**: 24.5%
- **Win Rate**: 65%
- **Profit Factor**: 2.1
- **Max Drawdown**: 8.2%
- **Sharpe Ratio**: 1.8
- **Total Trades**: 28

## Deploying the Strategy

After successful backtesting, you can deploy this strategy to an agent:

1. Navigate to the Strategy Detail page
2. Click "Deploy"
3. Select an available agent (e.g., "Bitcoin Trader")
4. Configure any agent-specific parameters
5. Click "Deploy Strategy"

## Monitoring and Optimization

Once deployed, you can:

1. Monitor the strategy's performance in real-time
2. Adjust parameters if needed through the strategy edit page
3. Create new versions with enhancements
4. Compare different versions through backtests

## Notes on Implementation

- The MACD parameters (12, 26, 9) are standard values but can be optimized
- RSI threshold of 50 is moderate - lower values would be more conservative
- The 2.5% stop loss is tight and may lead to more stopped trades in volatile markets
- The 7.5% take profit may be reached quickly in strong trends
- Consider implementing a trailing stop after reaching a certain profit level

This example demonstrates how easily complex trading strategies can be defined, tested, and deployed using the Trading Farm Dashboard's natural language processing capabilities. 