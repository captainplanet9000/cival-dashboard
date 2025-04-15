# Trading Farm Services Documentation

## Exchange Adapters
- **Purpose:** Normalize REST/WebSocket APIs for supported exchanges (Bybit, Coinbase, Hyperliquid).
- **Key Methods:** placeOrder, modifyOrder, cancelOrder, subscribeOrderBook, subscribeTrades
- **Extension:** Add new adapters by implementing the standard interface.

## Order Manager Service
- **Purpose:** Orchestrates order placement, modification, cancellation, and real-time status updates.
- **Integration:** Uses adapters for exchange-specific logic; emits events for UI updates.
- **Key Methods:** placeOrder, modifyOrder, cancelOrder, onOrderUpdate

## Market Data Store
- **Purpose:** Aggregates and normalizes order book and trade data from all exchanges.
- **Features:** Caching, subscription management, unified data access.
- **Key Methods:** getOrderBook, getTrades, subscribeOrderBook, subscribeTrades

## Rate Limiter
- **Purpose:** Enforces exchange-specific API request limits.
- **Usage:** Wrap all REST calls; prevents throttling.
- **Key Methods:** acquire, release

## Credentials Service
- **Purpose:** Securely stores and retrieves exchange API credentials with encryption.
- **Security:** AES-256-CBC encryption, server-side storage, RLS policies.
- **Key Methods:** storeCredentials, getCredentials

---

### For detailed usage and extension, see inline code comments in each service file.
