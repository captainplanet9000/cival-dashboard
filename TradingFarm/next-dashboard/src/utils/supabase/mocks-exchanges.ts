/**
 * Mock Exchange Connections and Market Data
 * Provides testnet equivalent data for all trading operations
 */

// Mock exchange connections
export const mockExchangeConnections = [
  {
    id: 'conn-1',
    farm_id: 'farm-1',
    name: 'Coinbase Pro Main',
    exchange: 'coinbase',
    api_key_name: 'Farm1-Coinbase-Key',
    status: 'active',
    is_testnet: false,
    created_at: '2025-01-20T00:00:00Z',
    updated_at: '2025-04-01T00:00:00Z',
    permissions: {
      read: true,
      trade: true,
      withdraw: false
    },
    metadata: {
      last_sync: '2025-04-01T12:00:00Z',
      trading_enabled: true,
      ip_whitelist: true
    }
  },
  {
    id: 'conn-2',
    farm_id: 'farm-1',
    name: 'Binance Main',
    exchange: 'binance',
    api_key_name: 'Farm1-Binance-Key',
    status: 'active',
    is_testnet: false,
    created_at: '2025-01-22T00:00:00Z',
    updated_at: '2025-03-15T00:00:00Z',
    permissions: {
      read: true,
      trade: true,
      withdraw: false
    },
    metadata: {
      last_sync: '2025-04-01T12:10:00Z',
      trading_enabled: true,
      ip_whitelist: true
    }
  },
  {
    id: 'conn-3',
    farm_id: 'farm-1',
    name: 'Kraken Testnet',
    exchange: 'kraken',
    api_key_name: 'Farm1-Kraken-Test-Key',
    status: 'active',
    is_testnet: true,
    created_at: '2025-02-15T00:00:00Z',
    updated_at: '2025-03-30T00:00:00Z',
    permissions: {
      read: true,
      trade: true,
      withdraw: true
    },
    metadata: {
      last_sync: '2025-04-01T12:05:00Z',
      trading_enabled: true,
      ip_whitelist: false
    }
  },
  {
    id: 'conn-4',
    farm_id: 'farm-2',
    name: 'Bybit Main',
    exchange: 'bybit',
    api_key_name: 'Farm2-Bybit-Key',
    status: 'active',
    is_testnet: false,
    created_at: '2025-02-20T00:00:00Z',
    updated_at: '2025-03-25T00:00:00Z',
    permissions: {
      read: true,
      trade: true,
      withdraw: false
    },
    metadata: {
      last_sync: '2025-04-01T12:15:00Z',
      trading_enabled: true,
      ip_whitelist: true
    }
  },
  {
    id: 'conn-5',
    farm_id: 'farm-2',
    name: 'Binance Testnet',
    exchange: 'binance',
    api_key_name: 'Farm2-Binance-Test-Key',
    status: 'active',
    is_testnet: true,
    created_at: '2025-03-01T00:00:00Z',
    updated_at: '2025-03-28T00:00:00Z',
    permissions: {
      read: true,
      trade: true,
      withdraw: true
    },
    metadata: {
      last_sync: '2025-04-01T12:20:00Z',
      trading_enabled: true,
      ip_whitelist: false
    }
  },
  {
    id: 'conn-6',
    farm_id: 'farm-2',
    name: 'Coinbase Pro Testnet',
    exchange: 'coinbase',
    api_key_name: 'Farm2-Coinbase-Test-Key',
    status: 'active',
    is_testnet: true,
    created_at: '2025-03-05T00:00:00Z',
    updated_at: '2025-03-28T00:00:00Z',
    permissions: {
      read: true,
      trade: true,
      withdraw: true
    },
    metadata: {
      last_sync: '2025-04-01T12:25:00Z',
      trading_enabled: true,
      ip_whitelist: false
    }
  }
];

// Mock exchange balances
export const mockExchangeBalances = [
  // Coinbase Pro Main (conn-1) balances
  {
    connection_id: 'conn-1',
    asset: 'BTC',
    total: 0.75,
    available: 0.65,
    in_order: 0.1,
    usd_value: 45000,
    updated_at: '2025-04-01T12:00:00Z'
  },
  {
    connection_id: 'conn-1',
    asset: 'ETH',
    total: 8.5,
    available: 6.0,
    in_order: 2.5,
    usd_value: 17000,
    updated_at: '2025-04-01T12:00:00Z'
  },
  {
    connection_id: 'conn-1',
    asset: 'USD',
    total: 12500,
    available: 12500,
    in_order: 0,
    usd_value: 12500,
    updated_at: '2025-04-01T12:00:00Z'
  },
  
  // Binance Main (conn-2) balances
  {
    connection_id: 'conn-2',
    asset: 'BTC',
    total: 0.35,
    available: 0.35,
    in_order: 0,
    usd_value: 21000,
    updated_at: '2025-04-01T12:10:00Z'
  },
  {
    connection_id: 'conn-2',
    asset: 'ETH',
    total: 4.25,
    available: 4.25,
    in_order: 0,
    usd_value: 8500,
    updated_at: '2025-04-01T12:10:00Z'
  },
  {
    connection_id: 'conn-2',
    asset: 'SOL',
    total: 125,
    available: 100,
    in_order: 25,
    usd_value: 15000,
    updated_at: '2025-04-01T12:10:00Z'
  },
  {
    connection_id: 'conn-2',
    asset: 'USDT',
    total: 8500,
    available: 8500,
    in_order: 0,
    usd_value: 8500,
    updated_at: '2025-04-01T12:10:00Z'
  },
  
  // Kraken Testnet (conn-3) balances
  {
    connection_id: 'conn-3',
    asset: 'BTC',
    total: 5.0,
    available: 4.95,
    in_order: 0.05,
    usd_value: 300000,
    updated_at: '2025-04-01T12:05:00Z'
  },
  {
    connection_id: 'conn-3',
    asset: 'ETH',
    total: 50.0,
    available: 50.0,
    in_order: 0,
    usd_value: 100000,
    updated_at: '2025-04-01T12:05:00Z'
  },
  {
    connection_id: 'conn-3',
    asset: 'SOL',
    total: 1000,
    available: 1000,
    in_order: 0,
    usd_value: 120000,
    updated_at: '2025-04-01T12:05:00Z'
  },
  {
    connection_id: 'conn-3',
    asset: 'USD',
    total: 500000,
    available: 500000,
    in_order: 0,
    usd_value: 500000,
    updated_at: '2025-04-01T12:05:00Z'
  },
  
  // Bybit Main (conn-4) balances
  {
    connection_id: 'conn-4',
    asset: 'BTC',
    total: 0.25,
    available: 0.15,
    in_order: 0.1,
    usd_value: 15000,
    updated_at: '2025-04-01T12:15:00Z'
  },
  {
    connection_id: 'conn-4',
    asset: 'ETH',
    total: 7.0,
    available: 3.5,
    in_order: 3.5,
    usd_value: 14000,
    updated_at: '2025-04-01T12:15:00Z'
  },
  {
    connection_id: 'conn-4',
    asset: 'USDT',
    total: 10000,
    available: 10000,
    in_order: 0,
    usd_value: 10000,
    updated_at: '2025-04-01T12:15:00Z'
  },
  
  // Binance Testnet (conn-5) balances
  {
    connection_id: 'conn-5',
    asset: 'BTC',
    total: 10.0,
    available: 10.0,
    in_order: 0,
    usd_value: 600000,
    updated_at: '2025-04-01T12:20:00Z'
  },
  {
    connection_id: 'conn-5',
    asset: 'ETH',
    total: 100.0,
    available: 100.0,
    in_order: 0,
    usd_value: 200000,
    updated_at: '2025-04-01T12:20:00Z'
  },
  {
    connection_id: 'conn-5',
    asset: 'SOL',
    total: 2000,
    available: 2000,
    in_order: 0,
    usd_value: 240000,
    updated_at: '2025-04-01T12:20:00Z'
  },
  {
    connection_id: 'conn-5',
    asset: 'USDT',
    total: 1000000,
    available: 1000000,
    in_order: 0,
    usd_value: 1000000,
    updated_at: '2025-04-01T12:20:00Z'
  },
  
  // Coinbase Pro Testnet (conn-6) balances
  {
    connection_id: 'conn-6',
    asset: 'BTC',
    total: 8.0,
    available: 8.0,
    in_order: 0,
    usd_value: 480000,
    updated_at: '2025-04-01T12:25:00Z'
  },
  {
    connection_id: 'conn-6',
    asset: 'ETH',
    total: 80.0,
    available: 80.0,
    in_order: 0,
    usd_value: 160000,
    updated_at: '2025-04-01T12:25:00Z'
  },
  {
    connection_id: 'conn-6',
    asset: 'USD',
    total: 1000000,
    available: 1000000,
    in_order: 0,
    usd_value: 1000000,
    updated_at: '2025-04-01T12:25:00Z'
  }
];

// Mock available markets on exchanges
export const mockMarkets = [
  {
    id: 'BTC-USD',
    base_currency: 'BTC',
    quote_currency: 'USD',
    exchange_market_codes: {
      coinbase: 'BTC-USD',
      binance: 'BTCUSD',
      kraken: 'XXBTZUSD',
      bybit: 'BTCUSD'
    },
    precision: {
      price: 2,
      amount: 8
    },
    min_order_size: 0.001,
    is_active: true
  },
  {
    id: 'ETH-USD',
    base_currency: 'ETH',
    quote_currency: 'USD',
    exchange_market_codes: {
      coinbase: 'ETH-USD',
      binance: 'ETHUSD',
      kraken: 'XETHZUSD',
      bybit: 'ETHUSD'
    },
    precision: {
      price: 2,
      amount: 6
    },
    min_order_size: 0.01,
    is_active: true
  },
  {
    id: 'SOL-USD',
    base_currency: 'SOL',
    quote_currency: 'USD',
    exchange_market_codes: {
      coinbase: 'SOL-USD',
      binance: 'SOLUSD',
      kraken: 'SOLUSD',
      bybit: 'SOLUSD'
    },
    precision: {
      price: 2,
      amount: 2
    },
    min_order_size: 0.1,
    is_active: true
  },
  {
    id: 'AVAX-USD',
    base_currency: 'AVAX',
    quote_currency: 'USD',
    exchange_market_codes: {
      coinbase: 'AVAX-USD',
      binance: 'AVAXUSD',
      kraken: 'AVAXUSD',
      bybit: 'AVAXUSD'
    },
    precision: {
      price: 2,
      amount: 2
    },
    min_order_size: 0.1,
    is_active: true
  },
  {
    id: 'MATIC-USD',
    base_currency: 'MATIC',
    quote_currency: 'USD',
    exchange_market_codes: {
      coinbase: 'MATIC-USD',
      binance: 'MATICUSD',
      kraken: 'MATICUSD',
      bybit: 'MATICUSD'
    },
    precision: {
      price: 4,
      amount: 1
    },
    min_order_size: 1,
    is_active: true
  },
  {
    id: 'DOT-USD',
    base_currency: 'DOT',
    quote_currency: 'USD',
    exchange_market_codes: {
      coinbase: 'DOT-USD',
      binance: 'DOTUSD',
      kraken: 'DOTUSD',
      bybit: 'DOTUSD'
    },
    precision: {
      price: 3,
      amount: 2
    },
    min_order_size: 0.1,
    is_active: true
  },
  {
    id: 'ADA-USD',
    base_currency: 'ADA',
    quote_currency: 'USD',
    exchange_market_codes: {
      coinbase: 'ADA-USD',
      binance: 'ADAUSD',
      kraken: 'ADAUSD',
      bybit: 'ADAUSD'
    },
    precision: {
      price: 4,
      amount: 1
    },
    min_order_size: 1,
    is_active: true
  },
  {
    id: 'XRP-USD',
    base_currency: 'XRP',
    quote_currency: 'USD',
    exchange_market_codes: {
      coinbase: 'XRP-USD',
      binance: 'XRPUSD',
      kraken: 'XRPUSD',
      bybit: 'XRPUSD'
    },
    precision: {
      price: 4,
      amount: 1
    },
    min_order_size: 1,
    is_active: true
  },
  {
    id: 'DOGE-USD',
    base_currency: 'DOGE',
    quote_currency: 'USD',
    exchange_market_codes: {
      coinbase: 'DOGE-USD',
      binance: 'DOGEUSD',
      kraken: 'XDGUSD',
      bybit: 'DOGEUSD'
    },
    precision: {
      price: 5,
      amount: 1
    },
    min_order_size: 10,
    is_active: true
  },
  {
    id: 'LINK-USD',
    base_currency: 'LINK',
    quote_currency: 'USD',
    exchange_market_codes: {
      coinbase: 'LINK-USD',
      binance: 'LINKUSD',
      kraken: 'LINKUSD',
      bybit: 'LINKUSD'
    },
    precision: {
      price: 3,
      amount: 2
    },
    min_order_size: 0.1,
    is_active: true
  }
];

// Mock market data (prices, volume, etc.)
export const mockMarketData = [
  {
    market_id: 'BTC-USD',
    last_price: 60250,
    bid: 60230,
    ask: 60270,
    volume_24h: 1250000000,
    change_24h: 2.5,
    change_24h_percent: 4.23,
    high_24h: 61500,
    low_24h: 59000,
    updated_at: '2025-04-01T12:30:00Z'
  },
  {
    market_id: 'ETH-USD',
    last_price: 2005.50,
    bid: 2005.00,
    ask: 2006.00,
    volume_24h: 750000000,
    change_24h: 35.50,
    change_24h_percent: 1.8,
    high_24h: 2050,
    low_24h: 1950,
    updated_at: '2025-04-01T12:30:00Z'
  },
  {
    market_id: 'SOL-USD',
    last_price: 122.50,
    bid: 122.40,
    ask: 122.60,
    volume_24h: 350000000,
    change_24h: 3.8,
    change_24h_percent: 3.2,
    high_24h: 125,
    low_24h: 115,
    updated_at: '2025-04-01T12:30:00Z'
  },
  {
    market_id: 'AVAX-USD',
    last_price: 36.75,
    bid: 36.70,
    ask: 36.80,
    volume_24h: 120000000,
    change_24h: 0.85,
    change_24h_percent: 2.37,
    high_24h: 37.50,
    low_24h: 35.80,
    updated_at: '2025-04-01T12:30:00Z'
  },
  {
    market_id: 'MATIC-USD',
    last_price: 0.6520,
    bid: 0.6510,
    ask: 0.6530,
    volume_24h: 85000000,
    change_24h: 0.0150,
    change_24h_percent: 2.36,
    high_24h: 0.6600,
    low_24h: 0.6350,
    updated_at: '2025-04-01T12:30:00Z'
  },
  {
    market_id: 'DOT-USD',
    last_price: 7.850,
    bid: 7.840,
    ask: 7.860,
    volume_24h: 65000000,
    change_24h: 0.125,
    change_24h_percent: 1.62,
    high_24h: 7.950,
    low_24h: 7.650,
    updated_at: '2025-04-01T12:30:00Z'
  },
  {
    market_id: 'ADA-USD',
    last_price: 0.3850,
    bid: 0.3845,
    ask: 0.3855,
    volume_24h: 95000000,
    change_24h: 0.0080,
    change_24h_percent: 2.12,
    high_24h: 0.3900,
    low_24h: 0.3750,
    updated_at: '2025-04-01T12:30:00Z'
  },
  {
    market_id: 'XRP-USD',
    last_price: 0.5240,
    bid: 0.5235,
    ask: 0.5245,
    volume_24h: 110000000,
    change_24h: 0.0120,
    change_24h_percent: 2.35,
    high_24h: 0.5300,
    low_24h: 0.5100,
    updated_at: '2025-04-01T12:30:00Z'
  },
  {
    market_id: 'DOGE-USD',
    last_price: 0.12450,
    bid: 0.12445,
    ask: 0.12455,
    volume_24h: 75000000,
    change_24h: 0.00350,
    change_24h_percent: 2.89,
    high_24h: 0.12750,
    low_24h: 0.12050,
    updated_at: '2025-04-01T12:30:00Z'
  },
  {
    market_id: 'LINK-USD',
    last_price: 14.650,
    bid: 14.640,
    ask: 14.660,
    volume_24h: 55000000,
    change_24h: 0.320,
    change_24h_percent: 2.23,
    high_24h: 14.850,
    low_24h: 14.250,
    updated_at: '2025-04-01T12:30:00Z'
  }
];

// Mock order book data (for real-time displays)
export const mockOrderBooks = {
  'BTC-USD': {
    bids: [
      [60230, 0.75],
      [60200, 1.25],
      [60150, 2.10],
      [60100, 3.50],
      [60050, 5.20],
      [60000, 8.75],
      [59950, 10.25],
      [59900, 12.50],
      [59850, 15.00],
      [59800, 18.50]
    ],
    asks: [
      [60270, 0.65],
      [60300, 1.15],
      [60350, 1.85],
      [60400, 3.25],
      [60450, 4.75],
      [60500, 7.50],
      [60550, 9.80],
      [60600, 11.25],
      [60650, 14.50],
      [60700, 17.25]
    ],
    timestamp: '2025-04-01T12:30:00Z'
  },
  'ETH-USD': {
    bids: [
      [2005.00, 5.5],
      [2004.50, 8.2],
      [2004.00, 12.5],
      [2003.50, 18.7],
      [2003.00, 25.3],
      [2002.50, 30.1],
      [2002.00, 35.8],
      [2001.50, 42.5],
      [2001.00, 50.2],
      [2000.50, 60.0]
    ],
    asks: [
      [2006.00, 4.8],
      [2006.50, 7.5],
      [2007.00, 11.2],
      [2007.50, 16.5],
      [2008.00, 22.8],
      [2008.50, 28.5],
      [2009.00, 32.0],
      [2009.50, 38.5],
      [2010.00, 45.0],
      [2010.50, 55.0]
    ],
    timestamp: '2025-04-01T12:30:00Z'
  },
  'SOL-USD': {
    bids: [
      [122.40, 75],
      [122.30, 120],
      [122.20, 200],
      [122.10, 350],
      [122.00, 500],
      [121.90, 750],
      [121.80, 1000],
      [121.70, 1250],
      [121.60, 1500],
      [121.50, 1800]
    ],
    asks: [
      [122.60, 65],
      [122.70, 110],
      [122.80, 180],
      [122.90, 325],
      [123.00, 475],
      [123.10, 700],
      [123.20, 950],
      [123.30, 1200],
      [123.40, 1450],
      [123.50, 1700]
    ],
    timestamp: '2025-04-01T12:30:00Z'
  }
};

// Mock exchange fee structures
export const mockExchangeFees = {
  coinbase: {
    maker: 0.4,
    taker: 0.6,
    withdraw: {
      BTC: 0.0001,
      ETH: 0.005,
      USD: 0,
      USDC: 0
    },
    deposit: {
      BTC: 0,
      ETH: 0,
      USD: 0,
      USDC: 0
    }
  },
  binance: {
    maker: 0.1,
    taker: 0.1,
    withdraw: {
      BTC: 0.0005,
      ETH: 0.01,
      USDT: 1,
      SOL: 0.01
    },
    deposit: {
      BTC: 0,
      ETH: 0,
      USDT: 0,
      SOL: 0
    }
  },
  kraken: {
    maker: 0.16,
    taker: 0.26,
    withdraw: {
      BTC: 0.0002,
      ETH: 0.005,
      USD: 5,
      USDT: 2.5
    },
    deposit: {
      BTC: 0,
      ETH: 0,
      USD: 0,
      USDT: 0
    }
  },
  bybit: {
    maker: 0.1,
    taker: 0.1,
    withdraw: {
      BTC: 0.0005,
      ETH: 0.01,
      USDT: 1
    },
    deposit: {
      BTC: 0,
      ETH: 0,
      USDT: 0
    }
  }
};

// Helper functions
export function getExchangeConnectionsByFarmId(farmId: string) {
  return mockExchangeConnections.filter(connection => connection.farm_id === farmId);
}

export function getExchangeBalancesByConnectionId(connectionId: string) {
  return mockExchangeBalances.filter(balance => balance.connection_id === connectionId);
}

export function getOrderBookByMarketId(marketId: string) {
  return mockOrderBooks[marketId] || null;
}

export function getMarketDataByMarketId(marketId: string) {
  return mockMarketData.find(market => market.market_id === marketId) || null;
}

export function getAllMarkets() {
  return mockMarkets;
}

export function getTestnetConnections() {
  return mockExchangeConnections.filter(connection => connection.is_testnet);
}

export function getExchangeFeeStructure(exchange: string) {
  return mockExchangeFees[exchange] || null;
}
