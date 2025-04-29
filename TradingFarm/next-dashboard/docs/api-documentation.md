# Trading Farm API Documentation

## Overview

This document provides comprehensive documentation for all external APIs and integrations used in the Trading Farm Dashboard. It includes authentication requirements, endpoint details, request/response formats, error handling guidelines, and best practices for implementation.

## Table of Contents

1. [Exchange APIs](#exchange-apis)
   - [Binance API](#binance-api)
   - [Coinbase API](#coinbase-api)
   - [Kraken API](#kraken-api)
2. [Market Data APIs](#market-data-apis)
   - [CoinGecko API](#coingecko-api)
   - [CryptoCompare API](#cryptocompare-api)
3. [Internal APIs](#internal-apis)
   - [Order Management API](#order-management-api)
   - [Strategy Management API](#strategy-management-api)
   - [Risk Management API](#risk-management-api)
4. [WebSocket APIs](#websocket-apis)
   - [Real-time Market Data](#real-time-market-data)
   - [Order Updates](#order-updates)
5. [Security Considerations](#security-considerations)
6. [Rate Limiting](#rate-limiting)
7. [Error Handling](#error-handling)
8. [Data Types](#data-types)
9. [Version History](#version-history)

## Exchange APIs

### Binance API

#### Authentication

```typescript
// Binance API Authentication
const createBinanceConnector = (credentials: ExchangeCredentials): BinanceConnector => {
  return new BinanceConnector({
    apiKey: credentials.apiKey,
    apiSecret: credentials.apiSecret,
    options: {
      baseUrl: 'https://api.binance.com',
      recvWindow: 60000,
    }
  });
};
```

#### Market Data Endpoints

| Endpoint | Description | Parameters | Response |
|----------|-------------|------------|----------|
| `/api/v3/ticker/24hr` | 24-hour price statistics | `symbol` (optional) | Price statistics for a symbol or all symbols |
| `/api/v3/ticker/price` | Latest price | `symbol` (optional) | Latest price for a symbol or all symbols |
| `/api/v3/depth` | Order book | `symbol`, `limit` (optional) | Order book with bids and asks |
| `/api/v3/klines` | Candlestick data | `symbol`, `interval`, `startTime` (optional), `endTime` (optional), `limit` (optional) | Candlestick data |

#### Trading Endpoints

| Endpoint | Description | Parameters | Response |
|----------|-------------|------------|----------|
| `/api/v3/order` (POST) | Place order | `symbol`, `side`, `type`, `timeInForce`, `quantity`, `price` (for limit orders) | Order details |
| `/api/v3/order` (DELETE) | Cancel order | `symbol`, `orderId` or `origClientOrderId` | Cancellation confirmation |
| `/api/v3/order` (GET) | Query order | `symbol`, `orderId` or `origClientOrderId` | Order details |
| `/api/v3/allOrders` | Query all orders | `symbol`, `orderId` (optional), `startTime` (optional), `endTime` (optional), `limit` (optional) | List of orders |
| `/api/v3/myTrades` | Query trades | `symbol`, `orderId` (optional), `startTime` (optional), `endTime` (optional), `limit` (optional) | List of trades |

#### Error Handling

```typescript
try {
  const response = await binanceConnector.placeOrder(orderParams);
  return response;
} catch (error) {
  if (error.code === -2010) {
    // Insufficient balance
    throw new Error('Insufficient balance for this order');
  } else if (error.code === -1013) {
    // Invalid quantity/price
    throw new Error('Invalid order parameters: ' + error.message);
  } else if (error.code === -1121) {
    // Invalid symbol
    throw new Error('Invalid trading pair: ' + error.message);
  } else {
    // Unknown error
    console.error('Binance API error:', error);
    throw new Error('Exchange error: ' + (error.message || 'Unknown error'));
  }
}
```

### Coinbase API

#### Authentication

```typescript
// Coinbase API Authentication
const createCoinbaseConnector = (credentials: ExchangeCredentials): CoinbaseConnector => {
  return new CoinbaseConnector({
    apiKey: credentials.apiKey,
    apiSecret: credentials.apiSecret,
    passphrase: credentials.passphrase,
    options: {
      baseUrl: 'https://api.exchange.coinbase.com',
    }
  });
};
```

#### Market Data Endpoints

| Endpoint | Description | Parameters | Response |
|----------|-------------|------------|----------|
| `/products` | List products | N/A | List of available trading pairs |
| `/products/{product_id}/ticker` | Product ticker | `product_id` | Current price and 24h volume |
| `/products/{product_id}/book` | Order book | `product_id`, `level` (1, 2, or 3) | Order book with bids and asks |
| `/products/{product_id}/candles` | Candlestick data | `product_id`, `granularity`, `start`, `end` | Candlestick data |

#### Trading Endpoints

| Endpoint | Description | Parameters | Response |
|----------|-------------|------------|----------|
| `/orders` (POST) | Place order | `product_id`, `side`, `type`, `size`, `price` (for limit orders) | Order details |
| `/orders/{order_id}` (DELETE) | Cancel order | `order_id` | Cancellation confirmation |
| `/orders/{order_id}` (GET) | Query order | `order_id` | Order details |
| `/orders` (GET) | List orders | `status` (optional), `product_id` (optional) | List of orders |
| `/fills` | List fills | `order_id` (optional), `product_id` (optional) | List of fills |

#### Error Handling

```typescript
try {
  const response = await coinbaseConnector.placeOrder(orderParams);
  return response;
} catch (error) {
  if (error.response && error.response.data) {
    const { message } = error.response.data;
    if (message.includes('insufficient funds')) {
      throw new Error('Insufficient balance for this order');
    } else if (message.includes('size is too small')) {
      throw new Error('Order size is below minimum: ' + message);
    } else {
      throw new Error('Coinbase API error: ' + message);
    }
  } else {
    console.error('Coinbase API error:', error);
    throw new Error('Exchange error: ' + (error.message || 'Unknown error'));
  }
}
```

### OKX API

#### Authentication

```typescript
// OKX API Authentication
const createOkxConnector = (credentials: ExchangeCredentials): OkxConnector => {
  return new OkxConnector({
    apiKey: credentials.apiKey,
    apiSecret: credentials.apiSecret,
    passphrase: credentials.passphrase,
    options: {
      baseUrl: 'https://www.okx.com',
    }
  });
};
```

#### Market Data Endpoints

| Endpoint | Description | Parameters | Response |
|----------|-------------|------------|----------|
| `/api/v5/market/tickers` | Tickers | `instType` | Tickers for all instruments |
| `/api/v5/market/ticker` | Ticker | `instId` | Ticker for a specific instrument |
| `/api/v5/market/books` | Order book | `instId`, `sz` (optional) | Order book with bids and asks |
| `/api/v5/market/candles` | Candlestick data | `instId`, `bar`, `after` (optional), `before` (optional), `limit` (optional) | Candlestick data |

#### Trading Endpoints

| Endpoint | Description | Parameters | Response |
|----------|-------------|------------|----------|
| `/api/v5/trade/order` (POST) | Place order | `instId`, `tdMode`, `side`, `ordType`, `sz`, `px` (for limit orders) | Order details |
| `/api/v5/trade/cancel-order` (POST) | Cancel order | `instId`, `ordId` | Cancellation confirmation |
| `/api/v5/trade/order` (GET) | Query order | `instId`, `ordId` | Order details |
| `/api/v5/trade/orders-pending` (GET) | Pending orders | `instType` (optional), `instId` (optional), `ordType` (optional) | List of pending orders |
| `/api/v5/trade/fills` (GET) | Fills | `instType` (optional), `instId` (optional), `ordId` (optional) | List of fills |

#### Error Handling

```typescript
try {
  const response = await okxConnector.placeOrder(orderParams);
  return response;
} catch (error) {
  if (error.code) {
    switch (error.code) {
      case '1001':
        throw new Error('Parameter error: ' + error.message);
      case '51008':
        throw new Error('Insufficient balance for this order');
      case '50011':
        throw new Error('Quantity below minimum limit: ' + error.message);
      default:
        throw new Error('OKX API error: ' + error.message);
    }
  } else {
    console.error('OKX API error:', error);
    throw new Error('Exchange error: ' + (error.message || 'Unknown error'));
  }
}
```

## Market Data APIs

### CryptoCompare API

#### Authentication

```typescript
// CryptoCompare API Authentication
const createCryptoCompareClient = (apiKey: string) => {
  return axios.create({
    baseURL: 'https://min-api.cryptocompare.com',
    headers: {
      'Authorization': `Apikey ${apiKey}`,
    },
  });
};
```

#### Endpoints

| Endpoint | Description | Parameters | Response |
|----------|-------------|------------|----------|
| `/data/price` | Current price | `fsym`, `tsyms` | Current price for symbol in multiple currencies |
| `/data/v2/histoday` | Daily OHLCV | `fsym`, `tsym`, `limit` (optional), `toTs` (optional) | Historical daily OHLCV data |
| `/data/v2/histohour` | Hourly OHLCV | `fsym`, `tsym`, `limit` (optional), `toTs` (optional) | Historical hourly OHLCV data |
| `/data/v2/histominute` | Minute OHLCV | `fsym`, `tsym`, `limit` (optional), `toTs` (optional) | Historical minute OHLCV data |
| `/data/top/exchanges` | Top exchanges | `fsym`, `tsym`, `limit` (optional) | Top exchanges by volume |

#### Error Handling

```typescript
try {
  const response = await cryptoCompareClient.get('/data/price', {
    params: { fsym: 'BTC', tsyms: 'USD,EUR' },
  });
  return response.data;
} catch (error) {
  if (error.response) {
    const { status, data } = error.response;
    if (status === 401) {
      throw new Error('Invalid API key');
    } else if (status === 429) {
      throw new Error('Rate limit exceeded');
    } else if (data && data.Message) {
      throw new Error(`CryptoCompare API error: ${data.Message}`);
    }
  }
  console.error('CryptoCompare API error:', error);
  throw new Error('Market data error: ' + (error.message || 'Unknown error'));
}
```

### CoinGecko API

#### Authentication

```typescript
// CoinGecko API Authentication
const createCoinGeckoClient = (apiKey?: string) => {
  const headers: Record<string, string> = {};
  if (apiKey) {
    headers['x-cg-pro-api-key'] = apiKey;
  }
  
  return axios.create({
    baseURL: apiKey ? 'https://pro-api.coingecko.com/api/v3' : 'https://api.coingecko.com/api/v3',
    headers,
  });
};
```

#### Endpoints

| Endpoint | Description | Parameters | Response |
|----------|-------------|------------|----------|
| `/coins/list` | List all coins | N/A | List of all supported coins |
| `/coins/markets` | Markets | `vs_currency`, `ids` (optional), `order` (optional), `per_page` (optional), `page` (optional) | List of coins with market data |
| `/simple/price` | Simple price | `ids`, `vs_currencies` | Current price for coins in multiple currencies |
| `/coins/{id}/market_chart` | Market chart | `id`, `vs_currency`, `days` | Historical market data |
| `/exchanges` | List exchanges | N/A | List of all exchanges |

#### Error Handling

```typescript
try {
  const response = await coinGeckoClient.get('/simple/price', {
    params: { ids: 'bitcoin,ethereum', vs_currencies: 'usd,eur' },
  });
  return response.data;
} catch (error) {
  if (error.response) {
    const { status, data } = error.response;
    if (status === 429) {
      throw new Error('Rate limit exceeded');
    } else if (status === 401) {
      throw new Error('Invalid API key');
    } else if (data && data.error) {
      throw new Error(`CoinGecko API error: ${data.error}`);
    }
  }
  console.error('CoinGecko API error:', error);
  throw new Error('Market data error: ' + (error.message || 'Unknown error'));
}
```

## News & Sentiment APIs

### CryptoNews API

#### Authentication

```typescript
// Crypto News API Authentication
const createCryptoNewsClient = (apiKey: string) => {
  return axios.create({
    baseURL: 'https://cryptonews-api.com/api/v1',
    params: {
      token: apiKey,
    },
  });
};
```

#### Endpoints

| Endpoint | Description | Parameters | Response |
|----------|-------------|------------|----------|
| `/category` | News by category | `section`, `items` (optional), `page` (optional) | List of news articles |
| `/news` | News by coin | `tickers`, `items` (optional), `page` (optional) | List of news articles |
| `/trending` | Trending news | `items` (optional), `page` (optional) | List of trending news articles |
| `/sentiment` | Sentiment analysis | `tickers`, `date` (optional) | Sentiment analysis for coins |

#### Error Handling

```typescript
try {
  const response = await cryptoNewsClient.get('/news', {
    params: { tickers: 'BTC,ETH', items: 10 },
  });
  return response.data;
} catch (error) {
  if (error.response) {
    const { status, data } = error.response;
    if (status === 401) {
      throw new Error('Invalid API key');
    } else if (status === 429) {
      throw new Error('Rate limit exceeded');
    } else if (data && data.error) {
      throw new Error(`Crypto News API error: ${data.error}`);
    }
  }
  console.error('Crypto News API error:', error);
  throw new Error('News data error: ' + (error.message || 'Unknown error'));
}
```

## Internal APIs

### Supabase Integration

#### Authentication

```typescript
// Supabase Authentication
import { createServerClient } from '@/utils/supabase/server';
import { createBrowserClient } from '@/utils/supabase/client';

// Server component
const supabase = await createServerClient();

// Client component
const supabase = createBrowserClient();
```

#### Database Tables

| Table | Description | Key Fields |
|-------|-------------|------------|
| `users` | User accounts | `id`, `email`, `created_at` |
| `farms` | Trading farms | `id`, `name`, `user_id`, `created_at` |
| `exchange_credentials` | Exchange API credentials | `id`, `user_id`, `exchange`, `api_key`, `api_secret`, `created_at` |
| `orders` | Trading orders | `id`, `user_id`, `exchange_credential_id`, `symbol`, `side`, `type`, `quantity`, `price`, `status`, `created_at` |
| `trades` | Executed trades | `id`, `order_id`, `symbol`, `side`, `quantity`, `price`, `fee`, `executed_at` |
| `agents` | Trading agents | `id`, `user_id`, `farm_id`, `name`, `type`, `configuration`, `created_at` |
| `agent_networks` | Agent orchestration | `id`, `user_id`, `farm_id`, `name`, `created_at` |
| `risk_profiles` | Risk management profiles | `id`, `user_id`, `farm_id`, `name`, `max_drawdown`, `created_at` |
| `dashboard_layouts` | Dashboard customizations | `id`, `user_id`, `farm_id`, `name`, `widgets`, `is_default`, `created_at` |

#### Common Queries

```typescript
// Get all orders for a user
const { data: orders, error } = await supabase
  .from('orders')
  .select('*')
  .eq('user_id', userId);

// Create a new order
const { data: order, error } = await supabase
  .from('orders')
  .insert({
    user_id: userId,
    exchange_credential_id: exchangeCredentialId,
    symbol: 'BTC/USDT',
    side: 'buy',
    type: 'limit',
    quantity: 0.1,
    price: 50000,
    status: 'new',
  })
  .select()
  .single();

// Update order status
const { data, error } = await supabase
  .from('orders')
  .update({ status: 'filled' })
  .eq('id', orderId);

// Delete an order
const { error } = await supabase
  .from('orders')
  .delete()
  .eq('id', orderId);
```

#### Error Handling

```typescript
try {
  const { data, error } = await supabase
    .from('orders')
    .select('*')
    .eq('user_id', userId);
  
  if (error) {
    throw error;
  }
  
  return data;
} catch (error) {
  console.error('Supabase error:', error);
  throw new Error('Database error: ' + (error.message || 'Unknown error'));
}
```

### WebSocket Integration

#### Socket.IO Implementation

```typescript
// Server-side
import { Server } from 'socket.io';

const io = new Server(server);

io.on('connection', (socket) => {
  // Authenticate
  socket.on('authenticate', (token) => {
    try {
      const user = verifyToken(token);
      socket.data.user = user;
      socket.join(`user:${user.id}`);
      socket.emit('authenticated', { success: true });
    } catch (error) {
      socket.emit('authenticated', { success: false, error: 'Invalid token' });
    }
  });
  
  // Subscribe to market data
  socket.on('subscribe', (channel) => {
    if (!socket.data.user) {
      return socket.emit('error', { message: 'Not authenticated' });
    }
    
    socket.join(channel);
    socket.emit('subscribed', { channel });
  });
  
  // Unsubscribe from market data
  socket.on('unsubscribe', (channel) => {
    socket.leave(channel);
    socket.emit('unsubscribed', { channel });
  });
});

// Example: Broadcast market data
function broadcastMarketData(symbol, data) {
  io.to(`market:${symbol}`).emit('market_data', { symbol, data });
}

// Example: Send order update to user
function sendOrderUpdate(userId, orderId, update) {
  io.to(`user:${userId}`).emit('order_update', { orderId, update });
}
```

#### Client-side Integration

```typescript
// Client-side
import { io } from 'socket.io-client';

const socket = io('/');

// Authentication
export function authenticateSocket(token) {
  return new Promise((resolve, reject) => {
    socket.emit('authenticate', token);
    socket.once('authenticated', (response) => {
      if (response.success) {
        resolve();
      } else {
        reject(new Error(response.error));
      }
    });
  });
}

// Subscribe to market data
export function subscribeToMarketData(symbol, callback) {
  const channel = `market:${symbol}`;
  socket.emit('subscribe', channel);
  socket.on('market_data', (data) => {
    if (data.symbol === symbol) {
      callback(data);
    }
  });
  
  return () => {
    socket.emit('unsubscribe', channel);
    socket.off('market_data');
  };
}

// Subscribe to order updates
export function subscribeToOrderUpdates(orderId, callback) {
  socket.on('order_update', (data) => {
    if (data.orderId === orderId) {
      callback(data.update);
    }
  });
  
  return () => {
    socket.off('order_update');
  };
}
```

## Rate Limiting and Quotas

### Exchange API Rate Limits

| Exchange | Endpoint Type | Rate Limit |
|----------|--------------|------------|
| Binance | Market Data | 1200 requests per minute |
| Binance | Trading | 50 requests per 10 seconds |
| Coinbase | Public | 3 requests per second |
| Coinbase | Private | 5 requests per second |
| OKX | Public | 20 requests per 2 seconds |
| OKX | Private | 6 requests per second |

### Implementation

```typescript
// Rate limiter implementation
class RateLimiter {
  private queue: Map<string, Array<() => Promise<any>>> = new Map();
  private executing: Map<string, boolean> = new Map();
  private limits: Map<string, { max: number, interval: number }> = new Map();
  private counts: Map<string, number> = new Map();
  private timers: Map<string, NodeJS.Timeout> = new Map();
  
  constructor() {
    // Set up rate limits for each exchange
    this.limits.set('binance:market', { max: 1200, interval: 60000 });
    this.limits.set('binance:trading', { max: 50, interval: 10000 });
    this.limits.set('coinbase:public', { max: 3, interval: 1000 });
    this.limits.set('coinbase:private', { max: 5, interval: 1000 });
    this.limits.set('okx:public', { max: 20, interval: 2000 });
    this.limits.set('okx:private', { max: 6, interval: 1000 });
    
    // Initialize queues, counts, and executing flags
    for (const key of this.limits.keys()) {
      this.queue.set(key, []);
      this.counts.set(key, 0);
      this.executing.set(key, false);
    }
  }
  
  async execute<T>(key: string, fn: () => Promise<T>): Promise<T> {
    const limit = this.limits.get(key);
    if (!limit) {
      throw new Error(`Unknown rate limit key: ${key}`);
    }
    
    // If under rate limit, execute immediately
    if ((this.counts.get(key) || 0) < limit.max) {
      this.incrementCount(key);
      return fn();
    }
    
    // Otherwise, queue the request
    return new Promise<T>((resolve, reject) => {
      const wrappedFn = async () => {
        try {
          this.incrementCount(key);
          const result = await fn();
          resolve(result);
        } catch (error) {
          reject(error);
        }
      };
      
      this.queue.get(key)!.push(wrappedFn);
      this.processQueue(key);
    });
  }
  
  private incrementCount(key: string) {
    const current = this.counts.get(key) || 0;
    this.counts.set(key, current + 1);
    
    // Start timer to reset count if this is the first request
    if (current === 0) {
      const limit = this.limits.get(key)!;
      const timer = setTimeout(() => {
        this.counts.set(key, 0);
        this.processQueue(key);
      }, limit.interval);
      
      if (this.timers.has(key)) {
        clearTimeout(this.timers.get(key)!);
      }
      
      this.timers.set(key, timer);
    }
  }
  
  private async processQueue(key: string) {
    if (this.executing.get(key) || this.queue.get(key)!.length === 0) {
      return;
    }
    
    const limit = this.limits.get(key)!;
    if ((this.counts.get(key) || 0) >= limit.max) {
      return;
    }
    
    this.executing.set(key, true);
    
    try {
      while (this.queue.get(key)!.length > 0 && (this.counts.get(key) || 0) < limit.max) {
        const fn = this.queue.get(key)!.shift()!;
        await fn();
      }
    } finally {
      this.executing.set(key, false);
    }
  }
}

// Usage example
const rateLimiter = new RateLimiter();

async function getMarketData(symbol: string) {
  return rateLimiter.execute('binance:market', () => {
    return binanceConnector.getMarketData(symbol);
  });
}

async function placeOrder(order: OrderRequest) {
  return rateLimiter.execute('binance:trading', () => {
    return binanceConnector.placeOrder(order);
  });
}
```

## API Security Best Practices

### API Key Storage

- Store API keys encrypted in the database
- Never expose API secrets in client-side code
- Use environment variables for sensitive information
- Implement API key rotation policy

```typescript
// Example: Store API keys securely
async function storeApiKeys(userId: string, exchange: string, apiKey: string, apiSecret: string) {
  // Encrypt API secret before storage
  const encryptedSecret = await encryptApiSecret(apiSecret);
  
  const { data, error } = await supabase
    .from('exchange_credentials')
    .insert({
      user_id: userId,
      exchange,
      api_key: apiKey,
      api_secret: encryptedSecret,
    });
  
  if (error) {
    throw new Error(`Failed to store API keys: ${error.message}`);
  }
  
  return data;
}

// Example: Retrieve and decrypt API keys
async function getApiKeys(userId: string, exchange: string) {
  const { data, error } = await supabase
    .from('exchange_credentials')
    .select('*')
    .eq('user_id', userId)
    .eq('exchange', exchange)
    .single();
  
  if (error) {
    throw new Error(`Failed to retrieve API keys: ${error.message}`);
  }
  
  // Decrypt API secret for use
  const decryptedSecret = await decryptApiSecret(data.api_secret);
  
  return {
    apiKey: data.api_key,
    apiSecret: decryptedSecret,
  };
}
```

### Request Signing

```typescript
// Example: Sign Binance API request
function signBinanceRequest(path: string, params: Record<string, any>, apiSecret: string) {
  const timestamp = Date.now();
  const queryString = Object.entries({ ...params, timestamp })
    .map(([key, value]) => `${key}=${value}`)
    .join('&');
  
  const signature = createHmac('sha256', apiSecret)
    .update(queryString)
    .digest('hex');
  
  return {
    url: `${path}?${queryString}&signature=${signature}`,
    headers: {
      'X-MBX-APIKEY': apiKey,
    },
  };
}

// Example: Sign Coinbase API request
function signCoinbaseRequest(method: string, path: string, body: string, apiSecret: string) {
  const timestamp = Math.floor(Date.now() / 1000);
  const message = `${timestamp}${method}${path}${body}`;
  
  const signature = createHmac('sha256', Buffer.from(apiSecret, 'base64'))
    .update(message)
    .digest('base64');
  
  return {
    headers: {
      'CB-ACCESS-KEY': apiKey,
      'CB-ACCESS-SIGN': signature,
      'CB-ACCESS-TIMESTAMP': timestamp,
      'CB-ACCESS-PASSPHRASE': passphrase,
    },
  };
}
```

## Conclusion

This API documentation provides a comprehensive reference for all external integrations used in the Trading Farm Dashboard. When implementing new features or troubleshooting issues, refer to this document for detailed information about API endpoints, authentication requirements, and error handling strategies.

For any questions or clarifications about API usage, contact the Trading Farm development team.
