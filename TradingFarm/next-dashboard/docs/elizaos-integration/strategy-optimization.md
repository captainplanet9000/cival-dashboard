# Strategy Optimization Guide

This guide covers the process of optimizing trading strategies using the ElizaOS Trading Agent System's genetic algorithm-based optimization engine.

## Introduction to Strategy Optimization

Strategy optimization is the process of finding the best parameters for your trading strategy based on historical market data. The ElizaOS Trading Agent System uses advanced genetic algorithms to explore the parameter space efficiently and identify optimal configurations for your trading strategies.

## How It Works

Our optimization engine works through the following process:

1. **Parameter Definition**: You define the parameters and their possible ranges
2. **Population Creation**: The system creates a population of strategy variants
3. **Backtesting**: Each variant is tested against historical data
4. **Fitness Evaluation**: Variants are scored based on performance metrics
5. **Selection**: The best performers are selected for the next generation
6. **Crossover & Mutation**: New variants are created by combining and mutating successful ones
7. **Iteration**: The process repeats for multiple generations
8. **Result Analysis**: The best parameters are identified and applied

## When to Use Strategy Optimization

Consider optimization in these scenarios:

- When creating a new trading strategy
- After significant market regime changes
- When expanding to new trading pairs
- As part of regular strategy maintenance
- When performance metrics start declining

## Step 1: Access the Optimization Interface

1. Navigate to Dashboard > Agents > [Your Agent] > Optimization
2. Review the existing strategy parameters
3. Click "New Optimization Job"

## Step 2: Configure Optimization Parameters

![Optimization Configuration](../assets/optimization-configuration.png)

### Time Range Selection

Choose the historical data period for optimization:

| Setting | Description | Recommendation |
|---------|-------------|----------------|
| Start Date | Beginning of test period | Include at least one market cycle |
| End Date | End of test period | Recent enough to be relevant |
| Out-of-Sample | Data reserved for validation | 20-30% of total period |

### Strategy Parameters

Define which parameters to optimize and their ranges:

```json
{
  "parameters": [
    {
      "name": "fast_period",
      "min": 5,
      "max": 50,
      "step": 1,
      "type": "integer",
      "path": ["indicators", "moving_average", "fast_period"]
    },
    {
      "name": "slow_period",
      "min": 20,
      "max": 200,
      "step": 5,
      "type": "integer",
      "path": ["indicators", "moving_average", "slow_period"]
    },
    {
      "name": "signal_threshold",
      "min": 0,
      "max": 5,
      "step": 0.1,
      "type": "float",
      "path": ["signals", "threshold"]
    }
  ]
}
```

### Optimization Settings

Configure how the genetic algorithm operates:

| Setting | Description | Recommended Value |
|---------|-------------|-------------------|
| Population Size | Number of parameter sets per generation | 30-50 |
| Max Iterations | Maximum number of generations | 20-30 |
| Mutation Rate | Probability of random parameter changes | 0.1-0.3 |
| Crossover Rate | Probability of parameter combining | 0.6-0.8 |
| Early Stopping | Stop if no improvement for N generations | Enabled, 5 generations |

### Optimization Target

Select the metric to optimize for:

- **Total Return**: Maximize overall returns
- **Sharpe Ratio**: Optimize risk-adjusted returns
- **Calmar Ratio**: Optimize return relative to maximum drawdown
- **Profit Factor**: Optimize gross profit divided by gross loss
- **Score**: A composite metric combining multiple factors

## Step 3: Run the Optimization

1. Review all configuration settings
2. Click "Start Optimization"
3. The system will display the optimization status:
   - Queued
   - Running (with progress indication)
   - Completed
   - Failed (with error details)

Depending on the complexity of your strategy and the amount of historical data, optimization may take from a few minutes to several hours.

## Step 4: Review Optimization Results

![Optimization Results](../assets/optimization-results.png)

Once complete, the system will display:

1. **Top Parameter Sets**: Best-performing parameter combinations
2. **Performance Metrics**: Key metrics for each parameter set
3. **Comparison Chart**: Visual comparison with the original strategy
4. **Parameter Sensitivity**: Analysis of parameter impact on performance

### Understanding the Results Table

| Column | Description |
|--------|-------------|
| Rank | Position based on target metric |
| Parameters | Optimized parameter values |
| Total Return | Overall percentage return |
| Sharpe Ratio | Risk-adjusted return metric |
| Max Drawdown | Maximum peak-to-trough decline |
| Win Rate | Percentage of profitable trades |
| Profit Factor | Gross profit / gross loss |
| Trade Count | Number of trades executed |

## Step 5: Apply Optimization Results

After reviewing the results:

1. Select the parameter set you wish to apply
2. Click "Apply to Agent"
3. Confirm application in the dialog
4. The agent will be updated with the new parameters

Consider these factors when selecting parameters:

- **Highest Returns**: Maximize profit potential (but potentially higher risk)
- **Best Sharpe Ratio**: Balance returns and risk
- **Lowest Drawdown**: More conservative approach
- **Robustness**: Consistent performance across different metrics

## Step 6: Validate the Optimized Strategy

Before using the optimized strategy in live trading:

1. Run a backtest on the out-of-sample data
2. Test the strategy in paper trading mode
3. Monitor performance metrics
4. Ensure the strategy behaves as expected under current market conditions

## Advanced Optimization Techniques

### Multi-Objective Optimization

Optimize for multiple metrics simultaneously:

1. Click "Advanced Options" in the optimization interface
2. Enable "Multi-Objective Optimization"
3. Select primary and secondary objectives (e.g., Sharpe and Drawdown)
4. Configure the weighting between objectives

### Walk-Forward Optimization

Test strategy robustness across different time periods:

1. Click "Advanced Options" in the optimization interface
2. Enable "Walk-Forward Optimization"
3. Configure the number of time windows
4. Set the overlap percentage between windows

### Monte Carlo Analysis

Assess strategy performance under randomized conditions:

1. Click "Advanced Options" in the optimization interface
2. Enable "Monte Carlo Simulation"
3. Set the number of simulations
4. Configure randomization parameters

## Avoiding Over-Optimization

To prevent creating strategies that work well in backtests but fail in live trading:

1. **Use Sufficient Data**: Ensure you have enough historical data
2. **Out-of-Sample Testing**: Always validate on separate data
3. **Limit Parameters**: Optimize only the most impactful parameters
4. **Reasonable Ranges**: Use sensible parameter ranges
5. **Robustness Testing**: Test across multiple market conditions
6. **Simplicity**: Prefer simpler strategies over complex ones
7. **Forward Testing**: Validate in paper trading before live trading

## Real-World Example: Optimizing an RSI Strategy

Here's an example of optimizing an RSI-based trading strategy:

### Initial Parameters:
```json
{
  "rsi_period": 14,
  "oversold_threshold": 30,
  "overbought_threshold": 70,
  "position_size_percent": 2
}
```

### Optimization Configuration:
```json
{
  "parameters": [
    {
      "name": "rsi_period",
      "min": 7,
      "max": 21,
      "step": 1,
      "type": "integer"
    },
    {
      "name": "oversold_threshold",
      "min": 20,
      "max": 40,
      "step": 1,
      "type": "integer"
    },
    {
      "name": "overbought_threshold",
      "min": 60,
      "max": 80,
      "step": 1,
      "type": "integer"
    }
  ],
  "optimization_target": "sharpe_ratio",
  "population_size": 40,
  "max_iterations": 25
}
```

### Optimization Results:
```json
{
  "best_parameters": {
    "rsi_period": 11,
    "oversold_threshold": 27,
    "overbought_threshold": 73
  },
  "metrics": {
    "total_return": 34.2,
    "sharpe_ratio": 1.87,
    "max_drawdown": 12.3,
    "win_rate": 58.6,
    "profit_factor": 1.62,
    "trade_count": 142
  },
  "improvement": {
    "sharpe_ratio": "+0.53",
    "total_return": "+8.7%"
  }
}
```

## Troubleshooting

### Optimization Job Fails

If your optimization job fails:

1. Check the error message in the job details
2. Ensure your date range has sufficient data
3. Verify your parameter ranges are valid
4. Try reducing the complexity (fewer parameters or narrower ranges)
5. Check system resources and try again later

### Results Show No Improvement

If optimization doesn't improve your strategy:

1. Your current parameters may already be optimal
2. Try different parameter ranges
3. Consider optimizing different parameters
4. The strategy may not be suitable for the selected time period
5. Consider testing a different strategy approach

### Extreme Parameter Values

If optimization consistently selects the minimum or maximum values:

1. Expand your parameter ranges
2. Check for logical constraints between parameters
3. Verify your strategy implementation is correct

## Next Steps

After optimizing your strategy, consider:

1. [Paper Trading](./paper-trading.md) with the optimized strategy
2. [Multi-Agent Systems](./multi-agent-systems.md) for coordinated trading
3. [Monitoring & Alerts](./monitoring.md) to track performance
