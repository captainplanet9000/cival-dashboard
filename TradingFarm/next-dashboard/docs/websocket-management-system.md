# WebSocket Management System Documentation

## Overview

The WebSocket Management System is a core component of the Trading Farm platform. It provides a robust infrastructure for managing real-time data streams from multiple cryptocurrency exchanges through WebSocket connections. This document outlines the architecture, components, and usage guidelines for the system.

## Architecture

The WebSocket Management System follows a modular architecture with the following key components:

1. **WebSocketManager**: Central coordinator for all exchange connections
2. **Exchange Adapters**: Exchange-specific implementations for WebSocket interactions
3. **Connection Health Dashboard**: UI for monitoring and managing connections
4. **Database Schema**: Supabase tables and functions to persist connection state
5. **API Layer**: RESTful endpoints for programmatic control

### Component Diagram

```
┌───────────────────┐      ┌────────────────────┐
│  Trading Terminal  │◄────►│  WebSocketManager  │
└───────────────────┘      └─────────┬──────────┘
                                    │
                           ┌────────┴──────────┐
                           ▼                   ▼
              ┌─────────────────────┐ ┌─────────────────────┐
              │  Exchange Adapters  │ │  Connection Health  │
              └──────────┬──────────┘ │      Dashboard      │
                        │            └─────────────────────┘
                        ▼
        ┌───────────────────────────────┐
        │           Database            │
        │  (connections, subscriptions, │
        │   metrics, audit logs)        │
        └───────────────────────────────┘
```

## Core Components

### WebSocketManager

The WebSocketManager is the entry point for all WebSocket operations. It provides methods for:

- Connecting to exchanges
- Managing subscriptions to data channels
- Tracking connection health and metrics
- Coordinating reconnection attempts

```typescript
// Example usage
const manager = new WebSocketManager();

// Connect to an exchange
await manager.connectToExchange('binance', {
  connectionId: 'main-connection',
  url: 'wss://stream.binance.com:9443/ws',
  reconnect: {
    auto: true,
    maxAttempts: 5,
    delay: 1000,
    useExponentialBackoff: true
  }
});

// Subscribe to a channel
await manager.subscribe('binance', 'main-connection', {
  channel: 'ticker',
  symbols: ['BTC/USDT', 'ETH/USDT']
});
```

### Exchange Adapters

The system uses adapter classes to handle exchange-specific WebSocket implementations:

- **BaseExchangeAdapter**: Abstract base class with common functionality
- **BinanceWebSocketAdapter**: Binance-specific implementation
- **CoinbaseWebSocketAdapter**: Coinbase-specific implementation
- **BybitWebSocketAdapter**: Bybit-specific implementation

These adapters normalize different exchange WebSocket APIs into a consistent interface.

### Connection Health Dashboard

A React-based dashboard for monitoring and managing WebSocket connections:

- Real-time connection status visualization
- Performance metrics (latency, messages sent/received)
- Connection management controls

## Database Schema

### Tables

1. **websocket_connections**
   - Stores connection details and status

2. **websocket_subscriptions**
   - Tracks active subscriptions to exchange channels

3. **websocket_connection_metrics**
   - Records performance metrics for connections

4. **ip_whitelist**
   - Manages allowed IP addresses for connections

5. **api_key_versions**
   - Manages API key rotation for exchanges

### Row-Level Security (RLS)

All tables implement RLS policies to ensure users can only access their own data:

```sql
-- Example RLS policy
CREATE POLICY "Users can only view their own connections"
  ON websocket_connections
  FOR SELECT
  USING (auth.uid() = user_id);
```

## API Endpoints

### Connections

- `GET /api/websocket/connections`: List all connections
- `POST /api/websocket/connections`: Create a new connection
- `DELETE /api/websocket/connections`: Disconnect and remove a connection

### Subscriptions

- `GET /api/websocket/subscriptions`: List all subscriptions
- `POST /api/websocket/subscriptions`: Create a new subscription
- `DELETE /api/websocket/subscriptions`: Remove a subscription

### Metrics

- `GET /api/websocket/metrics`: Retrieve metrics for a connection
- `GET /api/websocket/metrics/aggregated`: Get aggregated metrics

## Setup & Configuration

### Prerequisites

- Supabase project with the required tables and functions
- Access to exchange WebSocket APIs
- API keys for authenticated endpoints

### Installation

1. Apply the database migrations:

```bash
npx supabase migration up
```

2. Update the database types:

```bash
npx supabase gen types typescript --local > src/types/database.types.ts
```

## Usage Guidelines

### Best Practices

1. **Connection Management**:
   - Limit the number of concurrent connections per exchange
   - Implement proper error handling for connection failures
   - Use the reconnection mechanism with exponential backoff

2. **Subscription Management**:
   - Combine similar subscriptions where possible
   - Unsubscribe from unused channels to reduce resource usage
   - Monitor subscription status to ensure data continuity

3. **Performance Optimization**:
   - Use the connection health dashboard to identify slow connections
   - Implement message filtering at the adapter level
   - Consider using worker threads for high-volume connections

### Security Considerations

1. **API Key Management**:
   - Store API keys securely using the key rotation system
   - Implement automatic key rotation schedules
   - Use read-only API keys when possible

2. **Access Control**:
   - Use IP whitelisting for production connections
   - Review audit logs regularly for unauthorized attempts
   - Limit connection access to authorized users only

## Troubleshooting

### Common Issues

1. **Connection Timeouts**:
   - Check network connectivity
   - Verify API key permissions
   - Ensure the exchange endpoint is correct

2. **Subscription Errors**:
   - Validate symbol format for the specific exchange
   - Check for rate limiting or subscription limits
   - Verify channel name is supported by the exchange

3. **Performance Degradation**:
   - Monitor latency metrics in the dashboard
   - Check for memory leaks in message handling
   - Consider scaling horizontal resources for high-volume connections

### Logging

The system logs important events at several levels:

- **Database**: All connection changes and errors
- **Application**: Runtime errors and state changes
- **Dashboard**: User actions and connection management

## Future Enhancements

1. **Phase 2**: 
   - Additional exchange adapters (Kraken, Kucoin, OKX)
   - Performance optimization for high-frequency trading
   - Enhanced message normalization

2. **Phase 3**:
   - Advanced connection health monitoring
   - Predictive reconnection algorithms
   - Distributed WebSocket connection pooling
