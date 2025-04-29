import { renderHook, act } from '@testing-library/react';
import { usePerformanceData } from './use-performance-data';
import { createBrowserClient } from '@/utils/supabase/client';
import { waitForAsync } from '@/tests/test-utils';

// Mock the Supabase client
jest.mock('@/utils/supabase/client');
const mockSupabase = {
  from: jest.fn().mockReturnThis(),
  select: jest.fn().mockReturnThis(),
  eq: jest.fn().mockReturnThis(),
  order: jest.fn().mockReturnThis(),
  limit: jest.fn().mockReturnThis(),
  between: jest.fn().mockReturnThis(),
  gte: jest.fn().mockReturnThis(),
  lte: jest.fn().mockReturnThis(),
  in: jest.fn().mockReturnThis(),
  range: jest.fn().mockReturnThis()
};

// Mock useToast hook
jest.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: jest.fn()
  })
}));

describe('usePerformanceData', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (createBrowserClient as jest.Mock).mockReturnValue(mockSupabase);
  });

  describe('getPerformanceMetrics', () => {
    it('should fetch performance metrics successfully', async () => {
      // Mock successful response
      const mockPerformanceData = {
        totalPnl: 5000,
        winRate: 0.65,
        averageTrade: 250,
        sharpeRatio: 1.8,
        maxDrawdown: -15,
        bestTrade: 1200,
        worstTrade: -500,
        totalTrades: 120
      };
      
      mockSupabase.select.mockReturnValue({
        single: jest.fn().mockReturnValue({
          data: mockPerformanceData,
          error: null
        })
      });

      const { result } = renderHook(() => usePerformanceData());

      // Act
      await act(async () => {
        await result.current.getPerformanceMetrics();
      });

      // Assert
      expect(mockSupabase.from).toHaveBeenCalledWith('performance_metrics');
      expect(mockSupabase.select).toHaveBeenCalled();
      expect(result.current.performanceMetrics).toEqual(mockPerformanceData);
      expect(result.current.isLoading).toBe(false);
    });

    it('should handle fetch error', async () => {
      // Mock error response
      mockSupabase.select.mockReturnValue({
        single: jest.fn().mockReturnValue({
          data: null,
          error: { message: 'Failed to fetch performance metrics' }
        })
      });

      const { result } = renderHook(() => usePerformanceData());

      // Act
      await act(async () => {
        await result.current.getPerformanceMetrics();
      });

      // Assert
      expect(mockSupabase.from).toHaveBeenCalledWith('performance_metrics');
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBe('Failed to fetch performance metrics');
    });
  });

  describe('getTradeHistory', () => {
    it('should fetch trade history successfully', async () => {
      // Mock successful response
      const mockTradeHistory = [
        { id: 1, symbol: 'BTC/USDT', entryPrice: 40000, exitPrice: 42000, pnl: 200, timestamp: '2025-04-20T10:00:00Z' },
        { id: 2, symbol: 'ETH/USDT', entryPrice: 2800, exitPrice: 2750, pnl: -50, timestamp: '2025-04-21T11:30:00Z' }
      ];
      
      mockSupabase.order.mockReturnValue({
        range: jest.fn().mockReturnValue({
          data: mockTradeHistory,
          error: null
        })
      });

      const { result } = renderHook(() => usePerformanceData());

      // Act
      await act(async () => {
        await result.current.getTradeHistory({ limit: 10, offset: 0 });
      });

      // Assert
      expect(mockSupabase.from).toHaveBeenCalledWith('trade_history');
      expect(mockSupabase.order).toHaveBeenCalledWith('timestamp', { ascending: false });
      expect(mockSupabase.range).toHaveBeenCalledWith(0, 9);
      expect(result.current.tradeHistory).toEqual(mockTradeHistory);
      expect(result.current.isLoading).toBe(false);
    });

    it('should handle filter parameters', async () => {
      // Mock successful response
      mockSupabase.order.mockReturnValue({
        range: jest.fn().mockReturnValue({
          data: [],
          error: null
        })
      });

      const { result } = renderHook(() => usePerformanceData());
      const startDate = new Date('2025-04-01');
      const endDate = new Date('2025-04-25');
      const symbols = ['BTC/USDT', 'ETH/USDT'];

      // Act
      await act(async () => {
        await result.current.getTradeHistory({ 
          limit: 20, 
          offset: 10,
          startDate,
          endDate,
          symbols
        });
      });

      // Assert
      expect(mockSupabase.from).toHaveBeenCalledWith('trade_history');
      expect(mockSupabase.between).toHaveBeenCalledWith('timestamp', startDate.toISOString(), endDate.toISOString());
      expect(mockSupabase.in).toHaveBeenCalledWith('symbol', symbols);
      expect(mockSupabase.range).toHaveBeenCalledWith(10, 29);
    });

    it('should handle fetch error for trade history', async () => {
      // Mock error response
      mockSupabase.order.mockReturnValue({
        range: jest.fn().mockReturnValue({
          data: null,
          error: { message: 'Failed to fetch trade history' }
        })
      });

      const { result } = renderHook(() => usePerformanceData());

      // Act
      await act(async () => {
        await result.current.getTradeHistory({ limit: 10, offset: 0 });
      });

      // Assert
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBe('Failed to fetch trade history');
    });
  });

  describe('getStrategyPerformance', () => {
    it('should fetch strategy performance data successfully', async () => {
      // Mock successful response
      const mockStrategyPerformance = [
        { strategyId: 1, name: 'Strategy 1', totalPnl: 3000, winRate: 0.7, trades: 80 },
        { strategyId: 2, name: 'Strategy 2', totalPnl: 2000, winRate: 0.6, trades: 40 }
      ];
      
      mockSupabase.select.mockReturnValue({
        data: mockStrategyPerformance,
        error: null
      });

      const { result } = renderHook(() => usePerformanceData());

      // Act
      await act(async () => {
        await result.current.getStrategyPerformance();
      });

      // Assert
      expect(mockSupabase.from).toHaveBeenCalledWith('strategy_performance');
      expect(mockSupabase.select).toHaveBeenCalled();
      expect(result.current.strategyPerformance).toEqual(mockStrategyPerformance);
      expect(result.current.isLoading).toBe(false);
    });

    it('should handle fetch error for strategy performance', async () => {
      // Mock error response
      mockSupabase.select.mockReturnValue({
        data: null,
        error: { message: 'Failed to fetch strategy performance' }
      });

      const { result } = renderHook(() => usePerformanceData());

      // Act
      await act(async () => {
        await result.current.getStrategyPerformance();
      });

      // Assert
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBe('Failed to fetch strategy performance');
    });
  });

  describe('getPortfolioValue', () => {
    it('should fetch portfolio value history successfully', async () => {
      // Mock successful response
      const mockPortfolioHistory = [
        { timestamp: '2025-04-01T00:00:00Z', value: 10000 },
        { timestamp: '2025-04-02T00:00:00Z', value: 10200 },
        { timestamp: '2025-04-03T00:00:00Z', value: 10350 }
      ];
      
      mockSupabase.order.mockReturnValue({
        data: mockPortfolioHistory,
        error: null
      });

      const { result } = renderHook(() => usePerformanceData());

      // Act
      await act(async () => {
        await result.current.getPortfolioValue({ days: 7 });
      });

      // Assert
      expect(mockSupabase.from).toHaveBeenCalledWith('portfolio_value_history');
      expect(mockSupabase.order).toHaveBeenCalledWith('timestamp', { ascending: true });
      expect(result.current.portfolioHistory).toEqual(mockPortfolioHistory);
      expect(result.current.isLoading).toBe(false);
    });

    it('should apply date filtering correctly', async () => {
      // Mock successful response
      mockSupabase.order.mockReturnValue({
        data: [],
        error: null
      });

      const { result } = renderHook(() => usePerformanceData());
      const today = new Date();
      const sevenDaysAgo = new Date(today);
      sevenDaysAgo.setDate(today.getDate() - 7);

      // Act
      await act(async () => {
        await result.current.getPortfolioValue({ days: 7 });
      });

      // Assert
      expect(mockSupabase.from).toHaveBeenCalledWith('portfolio_value_history');
      expect(mockSupabase.gte).toHaveBeenCalled();
      // The date comparison would be close to 7 days ago
      expect(mockSupabase.order).toHaveBeenCalledWith('timestamp', { ascending: true });
    });

    it('should handle fetch error for portfolio history', async () => {
      // Mock error response
      mockSupabase.order.mockReturnValue({
        data: null,
        error: { message: 'Failed to fetch portfolio history' }
      });

      const { result } = renderHook(() => usePerformanceData());

      // Act
      await act(async () => {
        await result.current.getPortfolioValue({ days: 30 });
      });

      // Assert
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBe('Failed to fetch portfolio history');
    });
  });

  describe('getAssetAllocation', () => {
    it('should fetch asset allocation data successfully', async () => {
      // Mock successful response
      const mockAssetAllocation = [
        { asset: 'BTC', value: 5000, percentage: 50 },
        { asset: 'ETH', value: 3000, percentage: 30 },
        { asset: 'USDT', value: 2000, percentage: 20 }
      ];
      
      mockSupabase.select.mockReturnValue({
        data: mockAssetAllocation,
        error: null
      });

      const { result } = renderHook(() => usePerformanceData());

      // Act
      await act(async () => {
        await result.current.getAssetAllocation();
      });

      // Assert
      expect(mockSupabase.from).toHaveBeenCalledWith('asset_allocation');
      expect(mockSupabase.select).toHaveBeenCalled();
      expect(result.current.assetAllocation).toEqual(mockAssetAllocation);
      expect(result.current.isLoading).toBe(false);
    });

    it('should handle fetch error for asset allocation', async () => {
      // Mock error response
      mockSupabase.select.mockReturnValue({
        data: null,
        error: { message: 'Failed to fetch asset allocation' }
      });

      const { result } = renderHook(() => usePerformanceData());

      // Act
      await act(async () => {
        await result.current.getAssetAllocation();
      });

      // Assert
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBe('Failed to fetch asset allocation');
    });
  });
});
