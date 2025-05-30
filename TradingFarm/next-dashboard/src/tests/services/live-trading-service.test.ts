import { liveTradingService } from '@/services/live-trading-service';
import { OrderParams } from '@/types/trading-types';

// Mock createBrowserClient to control Supabase responses
jest.mock('@/utils/supabase/client', () => ({
  createBrowserClient: jest.fn().mockReturnValue({
    from: jest.fn().mockReturnValue({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          single: jest.fn().mockReturnValue({
            data: { id: 'exchange1', name: 'Test Exchange' },
            error: null
          })
        })
      }),
      insert: jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          data: { id: 'order1' },
          error: null
        })
      }),
      update: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          data: null,
          error: null
        })
      })
    }),
    auth: {
      getUser: jest.fn().mockResolvedValue({
        data: { user: { id: 'user1' } },
        error: null
      })
    }
  })
}));

describe('LiveTradingService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('isEnabled', () => {
    it('should return false when NEXT_PUBLIC_ENABLE_LIVE_TRADING is not true', () => {
      const originalEnv = process.env.NEXT_PUBLIC_ENABLE_LIVE_TRADING;
      process.env.NEXT_PUBLIC_ENABLE_LIVE_TRADING = 'false';
      
      expect(liveTradingService.isEnabled()).toBe(false);
      
      process.env.NEXT_PUBLIC_ENABLE_LIVE_TRADING = originalEnv;
    });

    it('should return true when NEXT_PUBLIC_ENABLE_LIVE_TRADING is true', () => {
      const originalEnv = process.env.NEXT_PUBLIC_ENABLE_LIVE_TRADING;
      process.env.NEXT_PUBLIC_ENABLE_LIVE_TRADING = 'true';
      
      expect(liveTradingService.isEnabled()).toBe(true);
      
      process.env.NEXT_PUBLIC_ENABLE_LIVE_TRADING = originalEnv;
    });
  });

  describe('getExchangeCredentials', () => {
    it('should return credentials when found', async () => {
      const mockSupabase = require('@/utils/supabase/client').createBrowserClient();
      mockSupabase.from().select().eq().single.mockReturnValueOnce({
        data: { api_key: 'encrypted-key', api_secret: 'encrypted-secret' },
        error: null
      });
      
      const result = await liveTradingService.getExchangeCredentials('exchange1');
      
      expect(mockSupabase.from).toHaveBeenCalledWith('exchange_credentials');
      expect(result).toEqual({ api_key: 'encrypted-key', api_secret: 'encrypted-secret' });
    });

    it('should return null when credentials not found', async () => {
      const mockSupabase = require('@/utils/supabase/client').createBrowserClient();
      mockSupabase.from().select().eq().single.mockReturnValueOnce({
        data: null,
        error: { message: 'Credentials not found' }
      });
      
      const result = await liveTradingService.getExchangeCredentials('exchange1');
      
      expect(result).toBeNull();
    });
  });

  describe('placeOrder', () => {
    const orderParams: OrderParams = {
      symbol: 'BTC/USDT',
      side: 'buy',
      type: 'market',
      quantity: 0.1
    };

    it('should return error when live trading is disabled', async () => {
      // Mock live trading as disabled
      jest.spyOn(liveTradingService, 'isEnabled').mockReturnValue(false);
      
      const result = await liveTradingService.placeOrder('exchange1', orderParams);
      
      expect(result.success).toBe(false);
      expect(result.message).toContain('disabled');
    });

    it('should place order successfully when live trading is enabled', async () => {
      // Mock live trading as enabled
      jest.spyOn(liveTradingService, 'isEnabled').mockReturnValue(true);
      
      // Mock getExchangeCredentials
      jest.spyOn(liveTradingService, 'getExchangeCredentials').mockResolvedValue({
        api_key: 'test-key',
        api_secret: 'test-secret'
      });
      
      // Mock createExchangeConnector
      jest.spyOn(liveTradingService, 'createExchangeConnector').mockResolvedValue({
        placeOrder: jest.fn().mockResolvedValue({
          success: true,
          orderId: 'order123',
          message: 'Order placed successfully',
          order: {
            id: 'order123',
            exchangeId: 'exchange1',
            symbol: 'BTC/USDT',
            side: 'buy',
            type: 'market',
            quantity: 0.1,
            price: 0,
            status: 'open',
            timestamp: expect.any(String),
            clientOrderId: expect.any(String),
            fillPrice: null,
            fillQuantity: 0
          }
        })
      });
      
      const result = await liveTradingService.placeOrder('exchange1', orderParams);
      
      expect(liveTradingService.getExchangeCredentials).toHaveBeenCalledWith('exchange1');
      expect(liveTradingService.createExchangeConnector).toHaveBeenCalled();
      expect(result.success).toBe(true);
      expect(result.orderId).toBe('order123');
    });

    it('should handle errors when exchange not found', async () => {
      // Mock live trading as enabled
      jest.spyOn(liveTradingService, 'isEnabled').mockReturnValue(true);
      
      // Mock Supabase to return error for exchange query
      const mockSupabase = require('@/utils/supabase/client').createBrowserClient();
      mockSupabase.from().select().eq().single.mockReturnValueOnce({
        data: null,
        error: { message: 'Exchange not found' }
      });
      
      const result = await liveTradingService.placeOrder('invalidExchange', orderParams);
      
      expect(result.success).toBe(false);
      expect(result.message).toContain('Exchange not found');
    });
  });

  describe('getMarketData', () => {
    it('should return null when live trading is disabled', async () => {
      // Mock live trading as disabled
      jest.spyOn(liveTradingService, 'isEnabled').mockReturnValue(false);
      
      const result = await liveTradingService.getMarketData('exchange1', 'BTC/USDT');
      
      expect(result).toBeNull();
    });

    it('should return market data when live trading is enabled', async () => {
      // Mock live trading as enabled
      jest.spyOn(liveTradingService, 'isEnabled').mockReturnValue(true);
      
      // Mock getExchangeCredentials
      jest.spyOn(liveTradingService, 'getExchangeCredentials').mockResolvedValue({
        api_key: 'test-key',
        api_secret: 'test-secret'
      });
      
      // Mock createExchangeConnector
      const mockMarketData = {
        symbol: 'BTC/USDT',
        price: 50000,
        bid: 49990,
        ask: 50010,
        volume: 100,
        timestamp: '2023-04-28T10:00:00Z'
      };
      
      jest.spyOn(liveTradingService, 'createExchangeConnector').mockResolvedValue({
        getMarketData: jest.fn().mockResolvedValue(mockMarketData)
      });
      
      const result = await liveTradingService.getMarketData('exchange1', 'BTC/USDT');
      
      expect(liveTradingService.getExchangeCredentials).toHaveBeenCalledWith('exchange1');
      expect(liveTradingService.createExchangeConnector).toHaveBeenCalled();
      expect(result).toEqual(mockMarketData);
    });
  });

  // Add more test cases for other methods as needed
});
