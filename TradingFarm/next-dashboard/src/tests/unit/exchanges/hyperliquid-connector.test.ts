/**
 * HyperLiquid Connector Tests
 * 
 * This file contains tests for the HyperLiquid exchange connector.
 * It uses Jest for testing and Mock Service Worker (MSW) to mock API responses.
 */

import { rest } from 'msw';
import { setupServer } from 'msw/node';
import { HyperliquidConnector } from '@/utils/exchanges/connectors/hyperliquid-connector';
import { ApiCredentials, OrderSide, OrderType, TimeInForce } from '@/utils/exchanges/exchange-types';

// Mock the ethers library
jest.mock('ethers', () => {
  return {
    Wallet: jest.fn().mockImplementation(() => {
      return {
        address: '0xMockedAddress123456789',
        signMessage: jest.fn().mockResolvedValue('mockSignature123'),
      };
    }),
    Contract: jest.fn(),
  };
});

// Setup mock responses
const mockResponses = {
  // Info endpoint response
  info: {
    "universe": {
      "metas": [
        {
          "name": "BTC",
          "szDecimals": 8,
          "assetId": 0
        },
        {
          "name": "ETH",
          "szDecimals": 8,
          "assetId": 1
        }
      ]
    },
    "allMids": ["50000.5", "3000.25"]
  },
  // User data response
  user: {
    "marginSummary": {
      "accountValue": "10000.5",
      "totalMarginUsed": "2000.8",
      "availableMargin": "8000.0"
    },
    "assetPositions": [
      {
        "coin": "BTC",
        "position": {
          "size": "0.5",
          "entryPx": "49000.5",
          "positionValue": "25000.25",
          "unrealizedPnl": "500.25"
        },
        "orders": [
          {
            "oid": 12345,
            "side": "B",
            "sz": "0.1",
            "limit_px": "48000.0",
            "status": "open",
            "time": 1650000000,
            "order_type": {
              "limit": {
                "tif": "Gtc"
              }
            }
          }
        ]
      }
    ]
  },
  // Order book response
  orderbook: {
    "coin": "BTC",
    "bids": [["49000.5", "1.5"], ["48900.5", "2.5"]],
    "asks": [["50100.0", "1.2"], ["50200.0", "3.0"]]
  },
  // Trades response
  trades: [
    {
      "coin": "BTC",
      "side": "B",
      "sz": "0.1",
      "px": "49500.5",
      "time": 1650000000,
      "oid": 12345,
      "fee": "0.05"
    }
  ],
  // Candles response
  candles: [
    {
      "time": 1650000000,
      "open": "49000.0",
      "high": "49500.0",
      "low": "48800.0",
      "close": "49200.0",
      "volume": "100.5"
    },
    {
      "time": 1650003600,
      "open": "49200.0",
      "high": "49700.0",
      "low": "49100.0",
      "close": "49650.0",
      "volume": "85.2"
    }
  ],
  // Order response
  order: {
    "success": true,
    "data": {
      "oid": 12346,
      "status": "open"
    }
  },
  // Cancel response
  cancel: {
    "success": true
  },
  // Fills response
  fills: [
    {
      "coin": "BTC",
      "side": "B",
      "sz": "0.1",
      "px": "49500.5",
      "time": 1650000000,
      "oid": 12345,
      "fee": "0.05",
      "orderType": "limit"
    }
  ]
};

// Create MSW mock server
const server = setupServer(
  // Info endpoint
  rest.get('https://api.hyperliquid.xyz/info', (req, res, ctx) => {
    return res(ctx.json(mockResponses.info));
  }),
  
  // User data endpoint
  rest.post('https://api.hyperliquid.xyz/user', (req, res, ctx) => {
    return res(ctx.json(mockResponses.user));
  }),
  
  // Order book endpoint
  rest.post('https://api.hyperliquid.xyz/orderbook', (req, res, ctx) => {
    return res(ctx.json(mockResponses.orderbook));
  }),
  
  // Trades endpoint
  rest.post('https://api.hyperliquid.xyz/trades', (req, res, ctx) => {
    return res(ctx.json(mockResponses.trades));
  }),
  
  // Candles endpoint
  rest.post('https://api.hyperliquid.xyz/candles', (req, res, ctx) => {
    return res(ctx.json(mockResponses.candles));
  }),
  
  // Order endpoint
  rest.post('https://api.hyperliquid.xyz/exchange/order', (req, res, ctx) => {
    return res(ctx.json(mockResponses.order));
  }),
  
  // Cancel endpoint
  rest.post('https://api.hyperliquid.xyz/exchange/cancel', (req, res, ctx) => {
    return res(ctx.json(mockResponses.cancel));
  }),
  
  // Fills endpoint
  rest.post('https://api.hyperliquid.xyz/fills', (req, res, ctx) => {
    return res(ctx.json(mockResponses.fills));
  })
);

// Setup before tests
beforeAll(() => server.listen());
// Reset handlers after each test
afterEach(() => server.resetHandlers());
// Clean up after all tests
afterAll(() => server.close());

describe('HyperLiquid Connector', () => {
  let connector: HyperliquidConnector;
  const testCredentials: ApiCredentials = {
    apiKey: 'test-api-key',
    apiSecret: 'test-api-secret',
    passphrase: 'test-private-key' // For HyperLiquid, this is the private key
  };

  beforeEach(() => {
    // Create a fresh connector instance before each test
    connector = new HyperliquidConnector({
      exchange: 'hyperliquid',
      credentials: testCredentials
    });
  });

  describe('Connection and Authentication', () => {
    test('should connect successfully with valid credentials', async () => {
      const connected = await connector.connect();
      expect(connected).toBe(true);
    });

    test('should test connection successfully', async () => {
      const result = await connector.testConnection();
      expect(result.success).toBe(true);
      expect(result.hasTrading).toBe(true);
      expect(result.hasFutures).toBe(true);
    });

    test('should handle connection failure with invalid credentials', async () => {
      // Mock the API to return an error
      server.use(
        rest.post('https://api.hyperliquid.xyz/user', (req, res, ctx) => {
          return res(ctx.status(401), ctx.json({ error: 'Invalid authentication' }));
        })
      );

      const connected = await connector.connect();
      expect(connected).toBe(false);
    });
  });

  describe('Market Data', () => {
    test('should fetch market data for a symbol', async () => {
      await connector.connect();
      const data = await connector.getMarketData('BTC');
      
      expect(data).toBeDefined();
      expect(data.symbol).toBe('BTC');
      expect(data.last).toBe(50000.5);
      expect(data.bid).toBe(49000.5);
      expect(data.ask).toBe(50100.0);
    });

    test('should fetch multiple market data at once', async () => {
      await connector.connect();
      const dataMap = await connector.getMultipleMarketData(['BTC', 'ETH']);
      
      expect(dataMap.size).toBe(2);
      expect(dataMap.get('BTC')).toBeDefined();
      expect(dataMap.get('ETH')).toBeDefined();
    });

    test('should handle errors when fetching market data', async () => {
      await connector.connect();
      
      // Mock an error response
      server.use(
        rest.post('https://api.hyperliquid.xyz/orderbook', (req, res, ctx) => {
          return res(ctx.status(500), ctx.json({ error: 'Server error' }));
        })
      );
      
      await expect(connector.getMarketData('BTC')).rejects.toThrow();
    });
  });

  describe('Order Management', () => {
    test('should place a limit order successfully', async () => {
      await connector.connect();
      
      const orderResult = await connector.placeOrder({
        symbol: 'BTC',
        type: OrderType.LIMIT,
        side: OrderSide.BUY,
        amount: 0.1,
        price: 49000.0,
        timeInForce: TimeInForce.GTC
      });
      
      expect(orderResult).toBeDefined();
      expect(orderResult.id).toBe('12346');
      expect(orderResult.status).toBe('open');
    });

    test('should place a market order successfully', async () => {
      await connector.connect();
      
      const orderResult = await connector.placeOrder({
        symbol: 'BTC',
        type: OrderType.MARKET,
        side: OrderSide.SELL,
        amount: 0.1
      });
      
      expect(orderResult).toBeDefined();
      expect(orderResult.id).toBe('12346');
    });

    test('should cancel an order successfully', async () => {
      await connector.connect();
      
      const result = await connector.cancelOrder('12345', 'BTC');
      expect(result).toBe(true);
    });

    test('should get order status successfully', async () => {
      await connector.connect();
      
      const orderStatus = await connector.getOrderStatus('12345', 'BTC');
      expect(orderStatus).toBeDefined();
      expect(orderStatus.id).toBe('12345');
    });

    test('should get open orders successfully', async () => {
      await connector.connect();
      
      const openOrders = await connector.getOpenOrders();
      expect(Array.isArray(openOrders)).toBe(true);
      expect(openOrders.length).toBeGreaterThan(0);
    });

    test('should get order history successfully', async () => {
      await connector.connect();
      
      const orderHistory = await connector.getOrderHistory('BTC');
      expect(Array.isArray(orderHistory)).toBe(true);
      expect(orderHistory.length).toBeGreaterThan(0);
    });
  });

  describe('Account Information', () => {
    test('should get account information successfully', async () => {
      await connector.connect();
      
      const accountInfo = await connector.getAccountInfo();
      expect(accountInfo).toBeDefined();
      expect(accountInfo.balances.size).toBeGreaterThan(0);
      
      const usdBalance = accountInfo.balances.get('USD');
      expect(usdBalance).toBeDefined();
      expect(usdBalance?.total).toBe(10000.5);
    });

    test('should get balances for specific currencies', async () => {
      await connector.connect();
      
      const balances = await connector.getBalances(['USD']);
      expect(balances.size).toBe(1);
      expect(balances.get('USD')?.total).toBe(10000.5);
    });
  });

  describe('Exchange Information', () => {
    test('should get available symbols', async () => {
      await connector.connect();
      
      const symbols = await connector.getAvailableSymbols();
      expect(Array.isArray(symbols)).toBe(true);
      expect(symbols.length).toBe(2);
      expect(symbols[0].symbol).toBe('BTC');
      expect(symbols[1].symbol).toBe('ETH');
    });

    test('should get exchange capabilities', () => {
      const capabilities = connector.getExchangeCapabilities();
      expect(capabilities).toBeDefined();
      expect(capabilities.exchange).toBe('hyperliquid');
      expect(capabilities.supportsFutures).toBe(true);
    });

    test('should calculate fees correctly', async () => {
      await connector.connect();
      
      const fees = await connector.calculateFees('BTC', OrderSide.BUY, 1, 50000);
      expect(fees).toBeDefined();
      expect(fees.percentage).toBe(0.0005); // 0.05% taker fee
      expect(fees.cost).toBe(25); // 1 * 50000 * 0.0005
      expect(fees.currency).toBe('USD');
    });
  });
});
