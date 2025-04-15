// Mock Coinbase API for testing exchange adapter

// Mock server vault
export function mockServerVault() {
  jest.mock('@/utils/server-vault', () => ({
    ServerVaultService: jest.fn().mockImplementation(() => ({
      getApiCredentials: jest.fn().mockImplementation((userId: string) => {
        if (userId === 'bad') {
          return Promise.resolve({ apiKey: 'bad', apiSecret: 'bad', passphrase: 'bad' });
        }
        return Promise.resolve({ 
          apiKey: 'test-api-key', 
          apiSecret: 'test-api-secret',
          passphrase: 'test-passphrase'
        });
      })
    }))
  }));
}

// Mock successful REST API responses
export function mockCoinbaseApi() {
  global.fetch = jest.fn().mockImplementation((url, options) => {
    // Handle authentication errors
    const headers = options?.headers || {};
    if (headers['CB-ACCESS-KEY'] === 'bad') {
      return Promise.resolve({
        ok: false,
        status: 401,
        json: () => Promise.resolve({ message: 'Invalid API key' })
      });
    }

    // Handle different endpoint responses
    if (url.includes('/accounts')) {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve([
          { id: 'BTC-account', currency: 'BTC', balance: '1.5', available: '1.5' },
          { id: 'USD-account', currency: 'USD', balance: '10000', available: '10000' }
        ])
      });
    }

    if (url.includes('/orders')) {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({
          id: 'mock-order-id',
          status: 'done',
          product_id: 'BTC-USD',
          size: '0.01',
          price: '50000',
          side: 'buy'
        })
      });
    }

    if (url.includes('/products/BTC-USD/ticker')) {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({
          price: '50000',
          ask: '50010',
          bid: '49990',
          volume: '1000'
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
