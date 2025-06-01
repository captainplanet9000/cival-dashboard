// Mock Bybit API for testing exchange adapter
import { mockSuccessResponse, mockErrorResponse } from './mock-common';

// Mock successful WebSocket for ticker updates
const mockWebSocketInstance = {
  addEventListener: jest.fn((event, callback) => {
    if (event === 'open') {
      setTimeout(callback, 50);
    } else if (event === 'message') {
      // Emit simulated ticker data after a small delay
      setTimeout(() => {
        callback({
          data: JSON.stringify({
            topic: 'tickers',
            data: {
              symbol: 'BTCUSDT',
              lastPrice: '50000',
              highPrice24h: '51000',
              lowPrice24h: '49000',
              volume24h: '1000',
              bid1Price: '49990',
              ask1Price: '50010'
            }
          })
        });
      }, 75);
    }
  }),
  removeEventListener: jest.fn(),
  send: jest.fn(),
  close: jest.fn(),
};


// Mock successful REST API responses
export function mockBybitApi() {
  global.fetch = jest.fn().mockImplementation((url, options) => {
    // Handle authentication errors
    const body = options?.body ? JSON.parse(options.body as string) : {};
    const headers = options?.headers as Record<string, string> || {};
    
    if (body.apiKey === 'bad' || headers['X-BAPI-API-KEY'] === 'bad') {
      return mockErrorResponse(401, 'Invalid API key');
    }

    // Handle different endpoint responses
    if (url.includes('/v5/account/wallet-balance')) {
      return mockSuccessResponse({
        result: {
          list: [
            {
              totalEquity: '10000',
              coin: [
                { coin: 'USDT', walletBalance: '10000', availableToWithdraw: '10000' },
                { coin: 'BTC', walletBalance: '1.5', availableToWithdraw: '1.5' }
              ]
            }
          ]
        },
        retCode: 0,
        retMsg: 'OK'
      });
    }

    if (url.includes('/v5/order/create')) {
      return mockSuccessResponse({
        result: {
          orderId: 'mock-order-id',
          orderLinkId: 'mock-link-id'
        },
        retCode: 0,
        retMsg: 'OK'
      });
    }

    if (url.includes('/v5/order/realtime')) {
      return mockSuccessResponse({
        result: {
          list: [
            {
              orderId: 'mock-order-id',
              symbol: 'BTCUSDT',
              side: 'Buy',
              orderType: 'Market',
              price: '50000',
              qty: '0.01',
              orderStatus: 'Filled',
              cumExecQty: '0.01',
              cumExecFee: '0.01',
              createdTime: new Date().toISOString(),
              updatedTime: new Date().toISOString(),
            }
          ]
        },
        retCode: 0,
        retMsg: 'OK'
      });
    }

    if (url.includes('/v5/market/tickers')) {
      return mockSuccessResponse({
        result: {
          list: [
            {
              symbol: 'BTCUSDT',
              lastPrice: '50000',
              bid1Price: '49990',
              ask1Price: '50010',
              volume24h: '1000',
              highPrice24h: '51000',
              lowPrice24h: '49000'
            }
          ]
        },
        retCode: 0,
        retMsg: 'OK'
      });
    }

    // Default response for any other endpoints
    return mockSuccessResponse({
      result: {},
      retCode: 0,
      retMsg: 'OK'
    });
  });

  // Mock WebSocket - use a simpler approach that won't try to modify read-only properties
  global.WebSocket = jest.fn().mockImplementation(() => mockWebSocketInstance) as any;
  
  // The adapter code doesn't use the static properties, so we don't need to mock them
}

// Restore all mocks
export function restoreMocks() {
  jest.restoreAllMocks();
  jest.resetAllMocks();
}
