# Strategy API

This section covers endpoints related to trading strategy management, including creation, retrieval, updating, and optimization.

## Create Strategy

Creates a new trading strategy with the specified parameters.

**Endpoint:** `POST /api/elizaos/strategies`

**Request Body:**

```json
{
  "name": "BTC RSI Momentum",
  "description": "RSI-based momentum strategy for Bitcoin",
  "type": "technical",
  "indicators": ["rsi", "moving_average"],
  "timeframes": ["1h", "4h"],
  "trading_pairs": ["BTC/USDT"],
  "parameters": {
    "rsi_period": 14,
    "rsi_overbought": 70,
    "rsi_oversold": 30,
    "ma_fast_period": 9,
    "ma_slow_period": 21
  },
  "entry_conditions": [
    {
      "indicator": "rsi",
      "condition": "below",
      "value": 30,
      "timeframe": "1h"
    },
    {
      "indicator": "moving_average",
      "condition": "crossover",
      "parameters": {
        "fast": "ma_fast_period",
        "slow": "ma_slow_period"
      },
      "timeframe": "4h"
    }
  ],
  "exit_conditions": [
    {
      "indicator": "rsi",
      "condition": "above",
      "value": 70,
      "timeframe": "1h"
    },
    {
      "indicator": "profit",
      "condition": "above",
      "value": 0.03
    },
    {
      "indicator": "loss",
      "condition": "below",
      "value": -0.02
    }
  ]
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "id": "38f9d2a1-c5e2-4b5e-9a7f-1d6f8b300e12",
    "name": "BTC RSI Momentum",
    "description": "RSI-based momentum strategy for Bitcoin",
    "type": "technical",
    "created_at": "2025-04-13T15:30:45.123Z",
    "updated_at": "2025-04-13T15:30:45.123Z"
  },
  "error": null
}
```

**Status Codes:**
- `201 Created`: Strategy created successfully
- `400 Bad Request`: Invalid parameters
- `401 Unauthorized`: Invalid or missing authentication
- `409 Conflict`: Strategy with the same name already exists

## Get All Strategies

Retrieves a list of all strategies for the authenticated user.

**Endpoint:** `GET /api/elizaos/strategies`

**Query Parameters:**
- `type` (optional): Filter by strategy type (e.g., technical, fundamental, hybrid)
- `limit` (optional): Maximum number of results to return (default: 20)
- `offset` (optional): Offset for pagination (default: 0)

**Response:**

```json
{
  "success": true,
  "data": {
    "strategies": [
      {
        "id": "38f9d2a1-c5e2-4b5e-9a7f-1d6f8b300e12",
        "name": "BTC RSI Momentum",
        "description": "RSI-based momentum strategy for Bitcoin",
        "type": "technical",
        "created_at": "2025-04-13T15:30:45.123Z",
        "updated_at": "2025-04-13T15:30:45.123Z"
      },
      {
        "id": "49b0c5d2-e7a3-6c8f-0b7d-2e5f9a400e23",
        "name": "ETH Hybrid Strategy",
        "description": "Hybrid technical and sentiment strategy for Ethereum",
        "type": "hybrid",
        "created_at": "2025-04-12T09:15:22.789Z",
        "updated_at": "2025-04-12T09:15:22.789Z"
      }
    ],
    "total": 2,
    "limit": 20,
    "offset": 0
  },
  "error": null
}
```

**Status Codes:**
- `200 OK`: Success
- `401 Unauthorized`: Invalid or missing authentication

## Get Strategy Details

Retrieves detailed information about a specific strategy.

**Endpoint:** `GET /api/elizaos/strategies/{id}`

**Path Parameters:**
- `id`: Strategy ID

**Response:**

```json
{
  "success": true,
  "data": {
    "id": "38f9d2a1-c5e2-4b5e-9a7f-1d6f8b300e12",
    "name": "BTC RSI Momentum",
    "description": "RSI-based momentum strategy for Bitcoin",
    "type": "technical",
    "indicators": ["rsi", "moving_average"],
    "timeframes": ["1h", "4h"],
    "trading_pairs": ["BTC/USDT"],
    "parameters": {
      "rsi_period": 14,
      "rsi_overbought": 70,
      "rsi_oversold": 30,
      "ma_fast_period": 9,
      "ma_slow_period": 21
    },
    "entry_conditions": [
      {
        "indicator": "rsi",
        "condition": "below",
        "value": 30,
        "timeframe": "1h"
      },
      {
        "indicator": "moving_average",
        "condition": "crossover",
        "parameters": {
          "fast": "ma_fast_period",
          "slow": "ma_slow_period"
        },
        "timeframe": "4h"
      }
    ],
    "exit_conditions": [
      {
        "indicator": "rsi",
        "condition": "above",
        "value": 70,
        "timeframe": "1h"
      },
      {
        "indicator": "profit",
        "condition": "above",
        "value": 0.03
      },
      {
        "indicator": "loss",
        "condition": "below",
        "value": -0.02
      }
    ],
    "performance": {
      "backtest_results": {
        "total_trades": 86,
        "win_rate": 0.68,
        "profit_loss": 0.124,
        "max_drawdown": 0.042,
        "sharpe_ratio": 1.87
      },
      "live_results": {
        "total_trades": 23,
        "win_rate": 0.65,
        "profit_loss": 0.078,
        "max_drawdown": 0.035,
        "sharpe_ratio": 1.62
      }
    },
    "created_at": "2025-04-13T15:30:45.123Z",
    "updated_at": "2025-04-13T15:30:45.123Z"
  },
  "error": null
}
```

**Status Codes:**
- `200 OK`: Success
- `401 Unauthorized`: Invalid or missing authentication
- `404 Not Found`: Strategy not found

## Update Strategy

Updates the configuration of an existing strategy.

**Endpoint:** `PATCH /api/elizaos/strategies/{id}`

**Path Parameters:**
- `id`: Strategy ID

**Request Body:**
```json
{
  "name": "BTC RSI Momentum Enhanced",
  "description": "Enhanced RSI-based momentum strategy for Bitcoin",
  "parameters": {
    "rsi_period": 12,
    "rsi_overbought": 75,
    "rsi_oversold": 25
  },
  "exit_conditions": [
    {
      "indicator": "rsi",
      "condition": "above",
      "value": 75,
      "timeframe": "1h"
    },
    {
      "indicator": "profit",
      "condition": "above",
      "value": 0.04
    },
    {
      "indicator": "loss",
      "condition": "below",
      "value": -0.02
    }
  ]
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "38f9d2a1-c5e2-4b5e-9a7f-1d6f8b300e12",
    "name": "BTC RSI Momentum Enhanced",
    "description": "Enhanced RSI-based momentum strategy for Bitcoin",
    "updated_at": "2025-04-13T16:20:33.789Z"
  },
  "error": null
}
```

**Status Codes:**
- `200 OK`: Success
- `400 Bad Request`: Invalid parameters
- `401 Unauthorized`: Invalid or missing authentication
- `404 Not Found`: Strategy not found
- `409 Conflict`: Strategy with the same name already exists

## Delete Strategy

Deletes a strategy from the system.

**Endpoint:** `DELETE /api/elizaos/strategies/{id}`

**Path Parameters:**
- `id`: Strategy ID

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "38f9d2a1-c5e2-4b5e-9a7f-1d6f8b300e12",
    "deleted": true
  },
  "error": null
}
```

**Status Codes:**
- `200 OK`: Success
- `401 Unauthorized`: Invalid or missing authentication
- `404 Not Found`: Strategy not found
- `409 Conflict`: Strategy is in use by one or more agents

## Strategy Backtest

Runs a backtest for a strategy over historical data.

**Endpoint:** `POST /api/elizaos/strategies/{id}/backtest`

**Path Parameters:**
- `id`: Strategy ID

**Request Body:**
```json
{
  "start_date": "2025-01-01T00:00:00Z",
  "end_date": "2025-04-01T00:00:00Z",
  "trading_pairs": ["BTC/USDT"],
  "timeframes": ["1h", "4h"],
  "initial_capital": 10000,
  "position_size_type": "percentage",
  "position_size_value": 10,
  "include_fees": true,
  "fee_rate": 0.001,
  "slippage": 0.001,
  "parameters": {
    "rsi_period": 14,
    "rsi_overbought": 70,
    "rsi_oversold": 30
  }
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "backtest_id": "89h6i7j8-k9l0-1m2n-3o4p-5q6r7s8t9u0v",
    "status": "processing",
    "estimated_completion_time": "2025-04-13T16:35:00Z"
  },
  "error": null
}
```

**Status Codes:**
- `202 Accepted`: Backtest started successfully
- `400 Bad Request`: Invalid parameters
- `401 Unauthorized`: Invalid or missing authentication
- `404 Not Found`: Strategy not found

## Get Backtest Results

Retrieves the results of a previously executed backtest.

**Endpoint:** `GET /api/elizaos/strategies/backtests/{backtest_id}`

**Path Parameters:**
- `backtest_id`: Backtest ID

**Response:**
```json
{
  "success": true,
  "data": {
    "backtest_id": "89h6i7j8-k9l0-1m2n-3o4p-5q6r7s8t9u0v",
    "status": "completed",
    "strategy_id": "38f9d2a1-c5e2-4b5e-9a7f-1d6f8b300e12",
    "start_date": "2025-01-01T00:00:00Z",
    "end_date": "2025-04-01T00:00:00Z",
    "parameters": {
      "rsi_period": 14,
      "rsi_overbought": 70,
      "rsi_oversold": 30,
      "ma_fast_period": 9,
      "ma_slow_period": 21
    },
    "results": {
      "summary": {
        "total_trades": 86,
        "winning_trades": 58,
        "losing_trades": 28,
        "win_rate": 0.674,
        "profit_loss": 0.124,
        "profit_loss_amount": 1240.00,
        "initial_capital": 10000.00,
        "final_capital": 11240.00,
        "max_drawdown": 0.042,
        "max_drawdown_amount": 420.00,
        "sharpe_ratio": 1.87,
        "sortino_ratio": 2.35,
        "profit_factor": 2.14,
        "average_profit": 0.032,
        "average_loss": -0.018,
        "largest_profit": 0.085,
        "largest_loss": -0.025,
        "recovery_factor": 2.95
      },
      "equity_curve": [
        { "timestamp": "2025-01-01T00:00:00Z", "equity": 10000.00 },
        { "timestamp": "2025-01-05T12:00:00Z", "equity": 10120.00 },
        { "timestamp": "2025-01-10T18:00:00Z", "equity": 10080.00 },
        // Additional data points...
        { "timestamp": "2025-04-01T00:00:00Z", "equity": 11240.00 }
      ],
      "trades": [
        {
          "id": 1,
          "timestamp_entry": "2025-01-03T14:00:00Z",
          "timestamp_exit": "2025-01-05T08:00:00Z",
          "pair": "BTC/USDT",
          "direction": "long",
          "entry_price": 42500.00,
          "exit_price": 43200.00,
          "position_size": 0.0235,
          "profit_loss": 0.0165,
          "profit_loss_amount": 165.00,
          "exit_reason": "exit_condition"
        },
        // Additional trades...
      ],
      "monthly_performance": [
        {
          "month": "2025-01",
          "profit_loss": 0.045,
          "profit_loss_amount": 450.00,
          "trades": 28,
          "win_rate": 0.71
        },
        {
          "month": "2025-02",
          "profit_loss": 0.032,
          "profit_loss_amount": 320.00,
          "trades": 25,
          "win_rate": 0.64
        },
        {
          "month": "2025-03",
          "profit_loss": 0.047,
          "profit_loss_amount": 470.00,
          "trades": 33,
          "win_rate": 0.67
        }
      ]
    },
    "created_at": "2025-04-13T16:20:33.789Z",
    "completed_at": "2025-04-13T16:32:45.123Z",
    "execution_time_seconds": 745
  },
  "error": null
}
```

**Status Codes:**
- `200 OK`: Success
- `202 Accepted`: Backtest is still processing
- `401 Unauthorized`: Invalid or missing authentication
- `404 Not Found`: Backtest not found

## Strategy Optimization

Initiates an optimization process for a strategy to find optimal parameters.

**Endpoint:** `POST /api/elizaos/strategies/{id}/optimize`

**Path Parameters:**
- `id`: Strategy ID

**Request Body:**
```json
{
  "start_date": "2025-01-01T00:00:00Z",
  "end_date": "2025-04-01T00:00:00Z",
  "trading_pairs": ["BTC/USDT"],
  "timeframes": ["1h", "4h"],
  "initial_capital": 10000,
  "position_size_type": "percentage",
  "position_size_value": 10,
  "include_fees": true,
  "fee_rate": 0.001,
  "slippage": 0.001,
  "optimization_metric": "sharpe_ratio",
  "optimization_method": "genetic",
  "parameter_ranges": {
    "rsi_period": { "min": 7, "max": 21, "step": 1 },
    "rsi_overbought": { "min": 65, "max": 85, "step": 5 },
    "rsi_oversold": { "min": 15, "max": 35, "step": 5 },
    "ma_fast_period": { "min": 5, "max": 15, "step": 2 },
    "ma_slow_period": { "min": 15, "max": 30, "step": 3 }
  },
  "population_size": 50,
  "generations": 10,
  "mutation_rate": 0.1,
  "crossover_rate": 0.8
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "optimization_id": "0v9u8t7s-6r5q-4p3o-2n1m-0l9k8j7h6i5g",
    "status": "processing",
    "estimated_completion_time": "2025-04-13T18:30:00Z"
  },
  "error": null
}
```

**Status Codes:**
- `202 Accepted`: Optimization started successfully
- `400 Bad Request`: Invalid parameters
- `401 Unauthorized`: Invalid or missing authentication
- `404 Not Found`: Strategy not found

## Get Optimization Results

Retrieves the results of a previously executed strategy optimization.

**Endpoint:** `GET /api/elizaos/strategies/optimizations/{optimization_id}`

**Path Parameters:**
- `optimization_id`: Optimization ID

**Response:**
```json
{
  "success": true,
  "data": {
    "optimization_id": "0v9u8t7s-6r5q-4p3o-2n1m-0l9k8j7h6i5g",
    "status": "completed",
    "strategy_id": "38f9d2a1-c5e2-4b5e-9a7f-1d6f8b300e12",
    "optimization_metric": "sharpe_ratio",
    "optimization_method": "genetic",
    "parameter_ranges": {
      "rsi_period": { "min": 7, "max": 21, "step": 1 },
      "rsi_overbought": { "min": 65, "max": 85, "step": 5 },
      "rsi_oversold": { "min": 15, "max": 35, "step": 5 },
      "ma_fast_period": { "min": 5, "max": 15, "step": 2 },
      "ma_slow_period": { "min": 15, "max": 30, "step": 3 }
    },
    "results": {
      "best_parameters": {
        "rsi_period": 12,
        "rsi_overbought": 75,
        "rsi_oversold": 25,
        "ma_fast_period": 7,
        "ma_slow_period": 21
      },
      "best_performance": {
        "sharpe_ratio": 2.34,
        "profit_loss": 0.168,
        "win_rate": 0.72,
        "max_drawdown": 0.038,
        "total_trades": 92
      },
      "top_results": [
        {
          "parameters": {
            "rsi_period": 12,
            "rsi_overbought": 75,
            "rsi_oversold": 25,
            "ma_fast_period": 7,
            "ma_slow_period": 21
          },
          "performance": {
            "sharpe_ratio": 2.34,
            "profit_loss": 0.168,
            "win_rate": 0.72,
            "max_drawdown": 0.038,
            "total_trades": 92
          }
        },
        {
          "parameters": {
            "rsi_period": 11,
            "rsi_overbought": 75,
            "rsi_oversold": 25,
            "ma_fast_period": 9,
            "ma_slow_period": 21
          },
          "performance": {
            "sharpe_ratio": 2.29,
            "profit_loss": 0.154,
            "win_rate": 0.70,
            "max_drawdown": 0.042,
            "total_trades": 88
          }
        },
        // Additional top results...
      ],
      "generations": [
        {
          "generation": 1,
          "best_fitness": 1.87,
          "average_fitness": 1.42,
          "worst_fitness": 0.95
        },
        // Additional generation data...
        {
          "generation": 10,
          "best_fitness": 2.34,
          "average_fitness": 2.05,
          "worst_fitness": 1.67
        }
      ],
      "parameter_influence": {
        "rsi_period": 0.35,
        "rsi_overbought": 0.20,
        "rsi_oversold": 0.22,
        "ma_fast_period": 0.12,
        "ma_slow_period": 0.11
      }
    },
    "created_at": "2025-04-13T16:20:33.789Z",
    "completed_at": "2025-04-13T18:15:42.456Z",
    "execution_time_seconds": 6908
  },
  "error": null
}
```

**Status Codes:**
- `200 OK`: Success
- `202 Accepted`: Optimization is still processing
- `401 Unauthorized`: Invalid or missing authentication
- `404 Not Found`: Optimization not found
