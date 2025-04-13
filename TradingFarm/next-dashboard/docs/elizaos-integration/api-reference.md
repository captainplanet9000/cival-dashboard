# ElizaOS Trading Agent System - API Reference

## Introduction

The ElizaOS Trading Agent System provides a comprehensive REST API that allows you to programmatically create and manage trading agents, optimize strategies, execute trades, and monitor performance. This reference documents all available endpoints, parameters, and response formats.

### Base URL

All API endpoints are available at:

```
https://your-dashboard-domain.com/api/elizaos/
```

For local development, use:

```
http://localhost:3000/api/elizaos/
```

### Authentication

All API requests require authentication using a JWT token. The token should be included in the `Authorization` header:

```
Authorization: Bearer your-jwt-token
```

You can obtain a JWT token through the standard authentication flow in the dashboard or by using the authentication endpoints.

### Response Format

All API responses follow a standard format:

```json
{
  "success": true,
  "data": { ... },
  "error": null
}
```

Or in the case of an error:

```json
{
  "success": false,
  "data": null,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error message",
    "details": { ... }
  }
}
```

### Rate Limiting

API requests are subject to rate limiting to ensure system stability. Rate limits are defined on a per-endpoint basis, with details provided in the endpoint documentation.

## Agent Management API

### Create Agent

Creates a new trading agent with the specified configuration.

**Endpoint:** `POST /api/elizaos/agents`

**Request Body:**

```json
{
  "name": "BTC Momentum Trader",
  "description": "A momentum trading strategy for Bitcoin",
  "type": "trading_agent",
  "model": "gpt-4o",
  "capabilities": ["technical_analysis", "order_execution"],
  "trading_pairs": ["BTC/USDT"],
  "strategy_id": "38f9d2a1-c5e2-4b5e-9a7f-1d6f8b300e12",
  "risk_parameters": {
    "max_position_size": 0.1,
    "max_drawdown": 0.05,
    "take_profit": 0.03,
    "stop_loss": 0.02
  },
  "exchange_connection_id": "45a1d3b2-e6f3-5c6e-0b8g-2e7f9c400f23"
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "id": "56b2e4c3-f7g4-6d7f-1c9h-3f8g0d500g34",
    "name": "BTC Momentum Trader",
    "description": "A momentum trading strategy for Bitcoin",
    "type": "trading_agent",
    "status": "initializing",
    "created_at": "2025-04-13T15:30:45.123Z",
    "updated_at": "2025-04-13T15:30:45.123Z"
  },
  "error": null
}
```

**Status Codes:**
- `201 Created`: Agent created successfully
- `400 Bad Request`: Invalid parameters
- `401 Unauthorized`: Invalid or missing authentication
- `409 Conflict`: Agent with the same name already exists

### Get All Agents

Retrieves a list of all agents for the authenticated user.

**Endpoint:** `GET /api/elizaos/agents`

**Query Parameters:**
- `type` (optional): Filter by agent type (e.g., trading_agent, research_agent)
- `status` (optional): Filter by agent status (e.g., active, paused, error)
- `limit` (optional): Maximum number of results to return (default: 20)
- `offset` (optional): Offset for pagination (default: 0)

**Response:**

```json
{
  "success": true,
  "data": {
    "agents": [
      {
        "id": "56b2e4c3-f7g4-6d7f-1c9h-3f8g0d500g34",
        "name": "BTC Momentum Trader",
        "description": "A momentum trading strategy for Bitcoin",
        "type": "trading_agent",
        "status": "active",
        "created_at": "2025-04-13T15:30:45.123Z",
        "updated_at": "2025-04-13T15:35:12.456Z"
      },
      {
        "id": "67c3f5d4-g8h5-7e8g-2d0i-4g9h1e600h45",
        "name": "ETH Sentiment Analyzer",
        "description": "Sentiment analysis for Ethereum",
        "type": "research_agent",
        "status": "active",
        "created_at": "2025-04-12T09:15:22.789Z",
        "updated_at": "2025-04-13T10:20:33.123Z"
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

### Get Agent Details

Retrieves detailed information about a specific agent.

**Endpoint:** `GET /api/elizaos/agents/{id}`

**Path Parameters:**
- `id`: Agent ID

**Response:**

```json
{
  "success": true,
  "data": {
    "id": "56b2e4c3-f7g4-6d7f-1c9h-3f8g0d500g34",
    "name": "BTC Momentum Trader",
    "description": "A momentum trading strategy for Bitcoin",
    "type": "trading_agent",
    "model": "gpt-4o",
    "capabilities": ["technical_analysis", "order_execution"],
    "trading_pairs": ["BTC/USDT"],
    "strategy_id": "38f9d2a1-c5e2-4b5e-9a7f-1d6f8b300e12",
    "risk_parameters": {
      "max_position_size": 0.1,
      "max_drawdown": 0.05,
      "take_profit": 0.03,
      "stop_loss": 0.02
    },
    "exchange_connection_id": "45a1d3b2-e6f3-5c6e-0b8g-2e7f9c400f23",
    "status": "active",
    "performance": {
      "total_trades": 42,
      "win_rate": 0.64,
      "profit_loss": 0.082,
      "max_drawdown": 0.032
    },
    "created_at": "2025-04-13T15:30:45.123Z",
    "updated_at": "2025-04-13T15:35:12.456Z"
  },
  "error": null
}
```

**Status Codes:**
- `200 OK`: Success
- `401 Unauthorized`: Invalid or missing authentication
- `404 Not Found`: Agent not found

### Update Agent

Updates the configuration of an existing agent.

**Endpoint:** `PATCH /api/elizaos/agents/{id}`

**Path Parameters:**
- `id`: Agent ID

**Request Body:**
```json
{
  "name": "BTC Momentum Trader V2",
  "description": "Updated momentum trading strategy for Bitcoin",
  "risk_parameters": {
    "max_position_size": 0.15,
    "max_drawdown": 0.04,
    "take_profit": 0.04,
    "stop_loss": 0.02
  }
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "56b2e4c3-f7g4-6d7f-1c9h-3f8g0d500g34",
    "name": "BTC Momentum Trader V2",
    "description": "Updated momentum trading strategy for Bitcoin",
    "type": "trading_agent",
    "status": "paused",
    "updated_at": "2025-04-13T16:20:33.789Z"
  },
  "error": null
}
```

**Status Codes:**
- `200 OK`: Success
- `400 Bad Request`: Invalid parameters
- `401 Unauthorized`: Invalid or missing authentication
- `404 Not Found`: Agent not found
- `409 Conflict`: Agent with the same name already exists

### Delete Agent

Deletes an agent from the system.

**Endpoint:** `DELETE /api/elizaos/agents/{id}`

**Path Parameters:**
- `id`: Agent ID

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "56b2e4c3-f7g4-6d7f-1c9h-3f8g0d500g34",
    "deleted": true
  },
  "error": null
}
```

**Status Codes:**
- `200 OK`: Success
- `401 Unauthorized`: Invalid or missing authentication
- `404 Not Found`: Agent not found

### Start Agent

Activates an agent to begin processing.

**Endpoint:** `POST /api/elizaos/agents/{id}/start`

**Path Parameters:**
- `id`: Agent ID

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "56b2e4c3-f7g4-6d7f-1c9h-3f8g0d500g34",
    "status": "initializing",
    "message": "Agent initialization in progress"
  },
  "error": null
}
```

**Status Codes:**
- `200 OK`: Success
- `400 Bad Request`: Agent cannot be started in its current state
- `401 Unauthorized`: Invalid or missing authentication
- `404 Not Found`: Agent not found

### Stop Agent

Stops an active agent.

**Endpoint:** `POST /api/elizaos/agents/{id}/stop`

**Path Parameters:**
- `id`: Agent ID

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "56b2e4c3-f7g4-6d7f-1c9h-3f8g0d500g34",
    "status": "stopping",
    "message": "Agent shutdown in progress"
  },
  "error": null
}
```

**Status Codes:**
- `200 OK`: Success
- `400 Bad Request`: Agent cannot be stopped in its current state
- `401 Unauthorized`: Invalid or missing authentication
- `404 Not Found`: Agent not found

### Get Agent Logs

Retrieves logs for a specific agent.

**Endpoint:** `GET /api/elizaos/agents/{id}/logs`

**Path Parameters:**
- `id`: Agent ID

**Query Parameters:**
- `level` (optional): Filter by log level (e.g., info, warning, error)
- `start_time` (optional): Start timestamp for logs
- `end_time` (optional): End timestamp for logs
- `limit` (optional): Maximum number of logs to return (default: 100)
- `offset` (optional): Offset for pagination (default: 0)

**Response:**
```json
{
  "success": true,
  "data": {
    "logs": [
      {
        "timestamp": "2025-04-13T16:30:45.123Z",
        "level": "info",
        "message": "Agent started successfully",
        "context": {}
      },
      {
        "timestamp": "2025-04-13T16:35:12.456Z",
        "level": "info",
        "message": "Analyzing BTC/USDT market data",
        "context": {
          "timeframe": "1h",
          "indicators": ["rsi", "macd"]
        }
      },
      {
        "timestamp": "2025-04-13T16:40:33.789Z",
        "level": "warning",
        "message": "RSI calculation delayed due to missing candle data",
        "context": {
          "missing_intervals": ["2025-04-13T15:00:00Z"]
        }
      }
    ],
    "total": 42,
    "limit": 100,
    "offset": 0
  },
  "error": null
}
```

**Status Codes:**
- `200 OK`: Success
- `401 Unauthorized`: Invalid or missing authentication
- `404 Not Found`: Agent not found
