/**
 * Application configuration settings
 * Contains connection settings, feature flags, and environment-specific configuration
 */

// WebSocket configuration for real-time updates
export const websocketConfig = {
  enabled: true,
  reconnectInterval: 3000,
  reconnectAttempts: 5,
  url: process.env.NEXT_PUBLIC_WEBSOCKET_URL || 'wss://api.tradingfarm.io/ws',
  pingInterval: 30000, // Send ping every 30 seconds to keep connection alive
  connectionTimeout: 5000, // Connection timeout in milliseconds
  channels: {
    marketData: 'market-data',
    orderUpdates: 'order-updates',
    tradeEvents: 'trade-events',
    systemAlerts: 'system-alerts'
  }
};

// Exchange API configuration
export const exchangeConfig = {
  bybit: {
    testnet: process.env.NODE_ENV !== 'production',
    mainnetUrl: 'https://api.bybit.com',
    testnetUrl: 'https://api-testnet.bybit.com',
    websocketMainnet: 'wss://stream.bybit.com',
    websocketTestnet: 'wss://stream-testnet.bybit.com'
  },
  coinbase: {
    url: 'https://api.coinbase.com',
    websocketUrl: 'wss://ws-feed.coinbase.com'
  },
  hyperliquid: {
    url: 'https://api.hyperliquid.xyz',
    websocketUrl: 'wss://api.hyperliquid.xyz/ws'
  }
};

// Feature flags for the application
export const featureFlags = {
  enableElizaOS: true,
  enableRealTimeTrading: process.env.NEXT_PUBLIC_ENABLE_REAL_TRADING === 'true',
  enableFileUploads: true,
  enableVaultTransfers: true,
  enableFlashLoans: process.env.NEXT_PUBLIC_ENABLE_FLASH_LOANS === 'true',
  enableStrategyBuilder: true,
  showDemoMode: process.env.NODE_ENV !== 'production'
};

// System configuration settings
export const systemConfig = {
  pollingInterval: 15000, // Default polling interval for non-websocket endpoints
  maxRetries: 3, // Max retry attempts for failed requests
  defaultCurrency: 'USD',
  defaultTimeframe: '1h', // Default chart timeframe
  defaultLeverage: 1, // Default trading leverage
  apiTimeout: 30000, // Default API timeout in milliseconds
  logLevel: process.env.NODE_ENV === 'production' ? 'error' : 'debug'
};
