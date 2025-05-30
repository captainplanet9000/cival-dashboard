# Trading API

This section covers endpoints related to trading operations, including order management, position retrieval, and trading history.

## Create Order

Creates a new order for execution.

**Endpoint:** `POST /api/elizaos/trading/orders`

**Request Body:**

```json
{
  "agent_id": "56b2e4c3-f7g4-6d7f-1c9h-3f8g0d500g34",
  "exchange_connection_id": "45a1d3b2-e6f3-5c6e-0b8g-2e7f9c400f23",
  "symbol": "BTC/USDT",
  "order_type": "limit",
  "side": "buy",
  "quantity": 0.01,
  "price": 43500,
  "time_in_force": "GTC",
  "post_only": false,
  "reduce_only": false,
  "paper_trading": false,
  "client_order_id": "client_12345678",
  "metadata": {
    "strategy_id": "38f9d2a1-c5e2-4b5e-9a7f-1d6f8b300e12",
    "signal_id": "67c3f5d4-g8h5-7e8g-2d0i-4g9h1e600h45",
    "trade_rationale": "RSI oversold condition with MA crossover"
  }
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "order_id": "78d4e5f6-g7h8-i9j0-k1l2-m3n4o5p6q7r8",
    "exchange_order_id": "1234567890",
    "agent_id": "56b2e4c3-f7g4-6d7f-1c9h-3f8g0d500g34",
    "exchange_connection_id": "45a1d3b2-e6f3-5c6e-0b8g-2e7f9c400f23",
    "symbol": "BTC/USDT",
    "order_type": "limit",
    "side": "buy",
    "quantity": 0.01,
    "price": 43500,
    "status": "open",
    "time_in_force": "GTC",
    "post_only": false,
    "reduce_only": false,
    "paper_trading": false,
    "client_order_id": "client_12345678",
    "metadata": {
      "strategy_id": "38f9d2a1-c5e2-4b5e-9a7f-1d6f8b300e12",
      "signal_id": "67c3f5d4-g8h5-7e8g-2d0i-4g9h1e600h45",
      "trade_rationale": "RSI oversold condition with MA crossover"
    },
    "created_at": "2025-04-13T16:30:45.123Z",
    "updated_at": "2025-04-13T16:30:45.123Z"
  },
  "error": null
}
```

**Status Codes:**
- `201 Created`: Order created successfully
- `400 Bad Request`: Invalid parameters
- `401 Unauthorized`: Invalid or missing authentication
- `404 Not Found`: Agent or exchange connection not found
- `429 Too Many Requests`: Rate limit exceeded
- `500 Internal Server Error`: Order creation failed

## Get All Orders

Retrieves a list of orders based on filtering criteria.

**Endpoint:** `GET /api/elizaos/trading/orders`

**Query Parameters:**
- `agent_id` (optional): Filter by agent ID
- `exchange_connection_id` (optional): Filter by exchange connection ID
- `symbol` (optional): Filter by trading pair symbol
- `status` (optional): Filter by order status (open, closed, canceled)
- `side` (optional): Filter by order side (buy, sell)
- `start_time` (optional): Filter by order creation time (start)
- `end_time` (optional): Filter by order creation time (end)
- `paper_trading` (optional): Filter by paper trading status (true, false)
- `limit` (optional): Maximum number of results to return (default: 100)
- `offset` (optional): Offset for pagination (default: 0)

**Response:**

```json
{
  "success": true,
  "data": {
    "orders": [
      {
        "order_id": "78d4e5f6-g7h8-i9j0-k1l2-m3n4o5p6q7r8",
        "exchange_order_id": "1234567890",
        "agent_id": "56b2e4c3-f7g4-6d7f-1c9h-3f8g0d500g34",
        "exchange_connection_id": "45a1d3b2-e6f3-5c6e-0b8g-2e7f9c400f23",
        "symbol": "BTC/USDT",
        "order_type": "limit",
        "side": "buy",
        "quantity": 0.01,
        "price": 43500,
        "status": "filled",
        "filled_quantity": 0.01,
        "average_fill_price": 43480,
        "time_in_force": "GTC",
        "post_only": false,
        "reduce_only": false,
        "paper_trading": false,
        "client_order_id": "client_12345678",
        "created_at": "2025-04-13T16:30:45.123Z",
        "updated_at": "2025-04-13T16:35:12.456Z"
      },
      {
        "order_id": "89e5f6g7-h8i9-j0k1-l2m3-n4o5p6q7r8s9",
        "exchange_order_id": "1234567891",
        "agent_id": "56b2e4c3-f7g4-6d7f-1c9h-3f8g0d500g34",
        "exchange_connection_id": "45a1d3b2-e6f3-5c6e-0b8g-2e7f9c400f23",
        "symbol": "ETH/USDT",
        "order_type": "market",
        "side": "sell",
        "quantity": 0.15,
        "status": "filled",
        "filled_quantity": 0.15,
        "average_fill_price": 2850,
        "time_in_force": "IOC",
        "post_only": false,
        "reduce_only": true,
        "paper_trading": false,
        "client_order_id": "client_12345679",
        "created_at": "2025-04-13T15:20:33.789Z",
        "updated_at": "2025-04-13T15:20:34.123Z"
      }
    ],
    "total": 2,
    "limit": 100,
    "offset": 0
  },
  "error": null
}
```

**Status Codes:**
- `200 OK`: Success
- `400 Bad Request`: Invalid parameters
- `401 Unauthorized`: Invalid or missing authentication

## Get Order Details

Retrieves detailed information about a specific order.

**Endpoint:** `GET /api/elizaos/trading/orders/{order_id}`

**Path Parameters:**
- `order_id`: Order ID

**Response:**

```json
{
  "success": true,
  "data": {
    "order_id": "78d4e5f6-g7h8-i9j0-k1l2-m3n4o5p6q7r8",
    "exchange_order_id": "1234567890",
    "agent_id": "56b2e4c3-f7g4-6d7f-1c9h-3f8g0d500g34",
    "exchange_connection_id": "45a1d3b2-e6f3-5c6e-0b8g-2e7f9c400f23",
    "symbol": "BTC/USDT",
    "order_type": "limit",
    "side": "buy",
    "quantity": 0.01,
    "price": 43500,
    "status": "filled",
    "filled_quantity": 0.01,
    "average_fill_price": 43480,
    "time_in_force": "GTC",
    "post_only": false,
    "reduce_only": false,
    "paper_trading": false,
    "client_order_id": "client_12345678",
    "metadata": {
      "strategy_id": "38f9d2a1-c5e2-4b5e-9a7f-1d6f8b300e12",
      "signal_id": "67c3f5d4-g8h5-7e8g-2d0i-4g9h1e600h45",
      "trade_rationale": "RSI oversold condition with MA crossover"
    },
    "fills": [
      {
        "fill_id": "90f6g7h8-i9j0-k1l2-m3n4-o5p6q7r8s9t0",
        "price": 43480,
        "quantity": 0.01,
        "fee": 0.0435,
        "fee_currency": "USDT",
        "timestamp": "2025-04-13T16:35:12.456Z"
      }
    ],
    "created_at": "2025-04-13T16:30:45.123Z",
    "updated_at": "2025-04-13T16:35:12.456Z"
  },
  "error": null
}
```

**Status Codes:**
- `200 OK`: Success
- `401 Unauthorized`: Invalid or missing authentication
- `404 Not Found`: Order not found

## Cancel Order

Cancels an open order.

**Endpoint:** `DELETE /api/elizaos/trading/orders/{order_id}`

**Path Parameters:**
- `order_id`: Order ID

**Response:**

```json
{
  "success": true,
  "data": {
    "order_id": "78d4e5f6-g7h8-i9j0-k1l2-m3n4o5p6q7r8",
    "status": "canceling",
    "message": "Order cancellation in progress"
  },
  "error": null
}
```

**Status Codes:**
- `200 OK`: Success
- `400 Bad Request`: Order cannot be canceled
- `401 Unauthorized`: Invalid or missing authentication
- `404 Not Found`: Order not found
- `409 Conflict`: Order already canceled or filled

## Get Open Positions

Retrieves current open positions.

**Endpoint:** `GET /api/elizaos/trading/positions`

**Query Parameters:**
- `agent_id` (optional): Filter by agent ID
- `exchange_connection_id` (optional): Filter by exchange connection ID
- `symbol` (optional): Filter by trading pair symbol
- `paper_trading` (optional): Filter by paper trading status (true, false)

**Response:**

```json
{
  "success": true,
  "data": {
    "positions": [
      {
        "position_id": "01g7h8i9-j0k1-l2m3-n4o5-p6q7r8s9t0u1",
        "agent_id": "56b2e4c3-f7g4-6d7f-1c9h-3f8g0d500g34",
        "exchange_connection_id": "45a1d3b2-e6f3-5c6e-0b8g-2e7f9c400f23",
        "symbol": "BTC/USDT",
        "side": "long",
        "quantity": 0.01,
        "entry_price": 43480,
        "current_price": 43850,
        "liquidation_price": 30000,
        "unrealized_pnl": 37.00,
        "unrealized_pnl_percentage": 0.0085,
        "initial_margin": 435.00,
        "maintenance_margin": 217.50,
        "leverage": 10,
        "paper_trading": false,
        "created_at": "2025-04-13T16:35:12.456Z",
        "updated_at": "2025-04-13T17:30:45.123Z"
      },
      {
        "position_id": "12h8i9j0-k1l2-m3n4-o5p6-q7r8s9t0u1v2",
        "agent_id": "56b2e4c3-f7g4-6d7f-1c9h-3f8g0d500g34",
        "exchange_connection_id": "45a1d3b2-e6f3-5c6e-0b8g-2e7f9c400f23",
        "symbol": "ETH/USDT",
        "side": "short",
        "quantity": 0.15,
        "entry_price": 2850,
        "current_price": 2820,
        "liquidation_price": 3500,
        "unrealized_pnl": 4.50,
        "unrealized_pnl_percentage": 0.0105,
        "initial_margin": 42.75,
        "maintenance_margin": 21.38,
        "leverage": 10,
        "paper_trading": false,
        "created_at": "2025-04-13T15:20:34.123Z",
        "updated_at": "2025-04-13T17:30:45.123Z"
      }
    ],
    "total": 2
  },
  "error": null
}
```

**Status Codes:**
- `200 OK`: Success
- `401 Unauthorized`: Invalid or missing authentication

## Close Position

Closes an open position.

**Endpoint:** `POST /api/elizaos/trading/positions/{position_id}/close`

**Path Parameters:**
- `position_id`: Position ID

**Request Body:**
```json
{
  "order_type": "market",
  "price": null,
  "quantity_percentage": 100,
  "reduce_only": true
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "position_id": "01g7h8i9-j0k1-l2m3-n4o5-p6q7r8s9t0u1",
    "status": "closing",
    "order_id": "23i9j0k1-l2m3-n4o5-p6q7-r8s9t0u1v2w3",
    "message": "Position close order submitted"
  },
  "error": null
}
```

**Status Codes:**
- `200 OK`: Success
- `400 Bad Request`: Invalid parameters
- `401 Unauthorized`: Invalid or missing authentication
- `404 Not Found`: Position not found

## Get Trade History

Retrieves historical trades.

**Endpoint:** `GET /api/elizaos/trading/trades`

**Query Parameters:**
- `agent_id` (optional): Filter by agent ID
- `exchange_connection_id` (optional): Filter by exchange connection ID
- `symbol` (optional): Filter by trading pair symbol
- `start_time` (optional): Filter by trade time (start)
- `end_time` (optional): Filter by trade time (end)
- `paper_trading` (optional): Filter by paper trading status (true, false)
- `limit` (optional): Maximum number of results to return (default: 100)
- `offset` (optional): Offset for pagination (default: 0)

**Response:**

```json
{
  "success": true,
  "data": {
    "trades": [
      {
        "trade_id": "34j0k1l2-m3n4-o5p6-q7r8-s9t0u1v2w3x4",
        "order_id": "78d4e5f6-g7h8-i9j0-k1l2-m3n4o5p6q7r8",
        "agent_id": "56b2e4c3-f7g4-6d7f-1c9h-3f8g0d500g34",
        "exchange_connection_id": "45a1d3b2-e6f3-5c6e-0b8g-2e7f9c400f23",
        "symbol": "BTC/USDT",
        "side": "buy",
        "quantity": 0.01,
        "price": 43480,
        "fee": 0.0435,
        "fee_currency": "USDT",
        "paper_trading": false,
        "timestamp": "2025-04-13T16:35:12.456Z"
      },
      {
        "trade_id": "45k1l2m3-n4o5-p6q7-r8s9-t0u1v2w3x4y5",
        "order_id": "89e5f6g7-h8i9-j0k1-l2m3-n4o5p6q7r8s9",
        "agent_id": "56b2e4c3-f7g4-6d7f-1c9h-3f8g0d500g34",
        "exchange_connection_id": "45a1d3b2-e6f3-5c6e-0b8g-2e7f9c400f23",
        "symbol": "ETH/USDT",
        "side": "sell",
        "quantity": 0.15,
        "price": 2850,
        "fee": 0.4275,
        "fee_currency": "USDT",
        "paper_trading": false,
        "timestamp": "2025-04-13T15:20:34.123Z"
      }
    ],
    "total": 2,
    "limit": 100,
    "offset": 0
  },
  "error": null
}
```

**Status Codes:**
- `200 OK`: Success
- `400 Bad Request`: Invalid parameters
- `401 Unauthorized`: Invalid or missing authentication

## Get Trading Performance

Retrieves trading performance metrics.

**Endpoint:** `GET /api/elizaos/trading/performance`

**Query Parameters:**
- `agent_id` (optional): Filter by agent ID
- `exchange_connection_id` (optional): Filter by exchange connection ID
- `symbol` (optional): Filter by trading pair symbol
- `start_time` (optional): Filter by time period (start)
- `end_time` (optional): Filter by time period (end)
- `paper_trading` (optional): Filter by paper trading status (true, false)
- `timeframe` (optional): Aggregation timeframe (day, week, month)

**Response:**

```json
{
  "success": true,
  "data": {
    "summary": {
      "total_trades": 87,
      "winning_trades": 56,
      "losing_trades": 31,
      "win_rate": 0.644,
      "profit_loss": 1240.50,
      "profit_loss_percentage": 0.124,
      "max_drawdown": 420.00,
      "max_drawdown_percentage": 0.042,
      "sharpe_ratio": 1.87,
      "sortino_ratio": 2.35,
      "profit_factor": 2.14,
      "average_profit": 0.032,
      "average_loss": -0.018,
      "largest_profit": 0.085,
      "largest_loss": -0.025,
      "recovery_factor": 2.95,
      "average_holding_time_hours": 12.4
    },
    "equity_curve": [
      { "timestamp": "2025-04-01T00:00:00Z", "equity": 10000.00 },
      { "timestamp": "2025-04-02T00:00:00Z", "equity": 10120.00 },
      { "timestamp": "2025-04-03T00:00:00Z", "equity": 10080.00 },
      // Additional data points...
      { "timestamp": "2025-04-13T00:00:00Z", "equity": 11240.50 }
    ],
    "by_symbol": [
      {
        "symbol": "BTC/USDT",
        "trades": 52,
        "win_rate": 0.673,
        "profit_loss": 924.30,
        "profit_loss_percentage": 0.0924
      },
      {
        "symbol": "ETH/USDT",
        "trades": 35,
        "win_rate": 0.6,
        "profit_loss": 316.20,
        "profit_loss_percentage": 0.0316
      }
    ],
    "by_timeframe": [
      {
        "timeframe": "2025-04-01",
        "trades": 6,
        "win_rate": 0.67,
        "profit_loss": 85.50,
        "profit_loss_percentage": 0.0085
      },
      // Additional timeframes...
      {
        "timeframe": "2025-04-13",
        "trades": 8,
        "win_rate": 0.75,
        "profit_loss": 142.80,
        "profit_loss_percentage": 0.0128
      }
    ]
  },
  "error": null
}
```

**Status Codes:**
- `200 OK`: Success
- `400 Bad Request`: Invalid parameters
- `401 Unauthorized`: Invalid or missing authentication

## Paper Trading Configuration

Configures paper trading settings.

**Endpoint:** `POST /api/elizaos/trading/paper-trading/configure`

**Request Body:**
```json
{
  "initial_balance": {
    "USDT": 10000,
    "BTC": 0.1,
    "ETH": 1.0
  },
  "trading_pairs": ["BTC/USDT", "ETH/USDT"],
  "fee_rate": 0.001,
  "slippage_model": "fixed",
  "slippage_value": 0.001,
  "price_data_source": "real_time",
  "order_execution_delay_ms": 500,
  "simulate_partial_fills": true,
  "simulate_market_impact": true
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "configuration_id": "56l2m3n4-o5p6-q7r8-s9t0-u1v2w3x4y5z6",
    "message": "Paper trading configuration updated successfully"
  },
  "error": null
}
```

**Status Codes:**
- `200 OK`: Success
- `400 Bad Request`: Invalid parameters
- `401 Unauthorized`: Invalid or missing authentication

## Get Paper Trading Balance

Retrieves current paper trading balance.

**Endpoint:** `GET /api/elizaos/trading/paper-trading/balance`

**Response:**
```json
{
  "success": true,
  "data": {
    "balances": {
      "USDT": 8765.25,
      "BTC": 0.11,
      "ETH": 0.85
    },
    "total_value_usd": 13240.75,
    "pnl": 3240.75,
    "pnl_percentage": 0.3241,
    "updated_at": "2025-04-13T17:30:45.123Z"
  },
  "error": null
}
```

**Status Codes:**
- `200 OK`: Success
- `401 Unauthorized`: Invalid or missing authentication
