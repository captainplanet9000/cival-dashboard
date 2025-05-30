/**
 * Mock implementation for exchange queries
 */

// Mock useExchangeAccounts function to fix build errors
export function useExchangeAccounts() {
  return {
    data: [
      {
        id: 'mock-exchange-1',
        name: 'Mock Exchange 1',
        type: 'spot',
        balance: {
          total: 10000,
          available: 9000,
          locked: 1000
        }
      }
    ],
    isLoading: false,
    isError: false,
    error: null
  };
}
