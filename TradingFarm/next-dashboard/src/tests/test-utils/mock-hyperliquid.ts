// Mock Hyperliquid API for testing exchange adapter

// Mock server vault
export function mockServerVault() {
  jest.mock('@/utils/server-vault', () => ({
    ServerVaultService: jest.fn().mockImplementation(() => ({
      getApiCredentials: jest.fn().mockImplementation((userId: string) => {
        if (userId === 'bad') {
          return Promise.resolve({ apiKey: 'bad', apiSecret: 'bad' });
        }
        return Promise.resolve({ 
          apiKey: 'test-api-key', 
          apiSecret: 'test-api-secret'
        });
      })
    }))
  }));
}

// Mock successful REST API responses
export function mockHyperliquidApi() {
  global.fetch = jest.fn().mockImplementation((url, options) => {
    // Handle authentication errors
    const body = options?.body ? JSON.parse(options.body as string) : {};
    if (body.signature === 'bad' || body.apiKey === 'bad') {
      return Promise.resolve({
        ok: false,
        status: 401,
        json: () => Promise.resolve({ code: 'UNAUTHORIZED', message: 'Invalid API key' })
      });
    }

    // Handle different endpoint responses
    if (url.includes('/info')) {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({
          universe: [
            {
              name: 'BTC',
              szDecimals: 8,
              pxDecimals: 1
            }
          ]
        })
      });
    }

    if (url.includes('/order')) {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({
          status: 'filled',
          oid: 'mock-order-id',
          cloid: 'mock-client-id'
        })
      });
    }

    if (url.includes('/user')) {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({
          walletBalance: '10000',
          crossMarginSummary: {
            accountValue: '10000'
          },
          positions: [
            {
              coin: 'BTC',
              position: '1.5',
              entryPx: '45000',
              positionValue: '75000'
            }
          ]
        })
      });
    }

    if (url.includes('/meta')) {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({
          allMids: {
            'BTC': '50000'
          }
        })
      });
    }

    // Default response for any other endpoints
    return Promise.resolve({
      ok: true,
      json: () => Promise.resolve({})
    });
  });

  // Mock WebSocket
  global.WebSocket = jest.fn().mockImplementation(() => ({
    addEventListener: jest.fn((event, callback) => {
      if (event === 'open') {
        setTimeout(callback, 50);
      }
    }),
    removeEventListener: jest.fn(),
    send: jest.fn(),
    close: jest.fn(),
  }));
}

// Restore all mocks
export function restoreMocks() {
  jest.restoreAllMocks();
}
