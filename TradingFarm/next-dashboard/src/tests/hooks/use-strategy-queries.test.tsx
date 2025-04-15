import { renderHook, waitFor } from '@testing-library/react';
import { createWrapper } from '../utils/test-query-utils';
import { useStrategies, useStrategyDetail } from '@/hooks/react-query/use-strategy-queries';
import { server } from '../mocks/server';
import { rest } from 'msw';

// Mock the API service to avoid actual network requests
import { vi } from 'vitest';
vi.mock('@/services/api-service', () => ({
  apiService: {
    get: vi.fn().mockImplementation((url) => {
      // Mock strategy list response
      if (url === '/api/strategies') {
        return Promise.resolve({
          data: [
            { 
              id: 'strategy-1', 
              name: 'Golden Cross', 
              type: 'technical', 
              status: 'active' 
            },
            { 
              id: 'strategy-2', 
              name: 'RSI Strategy', 
              type: 'technical', 
              status: 'paused' 
            },
            { 
              id: 'strategy-3', 
              name: 'MACD Strategy', 
              type: 'technical', 
              status: 'draft' 
            }
          ]
        });
      }
      
      // Mock single strategy response
      if (url.startsWith('/api/strategies/')) {
        const strategyId = url.split('/').pop();
        
        if (strategyId === 'strategy-1') {
          return Promise.resolve({
            data: { 
              id: 'strategy-1', 
              name: 'Golden Cross', 
              type: 'technical', 
              status: 'active',
              description: 'A strategy based on moving average crossovers',
              parameters: {
                timeframe: '1h',
                symbols: ['BTCUSDT', 'ETHUSDT'],
                riskManagement: {
                  maxPositionSize: 0.1,
                  stopLoss: 5,
                  takeProfit: 15
                }
              },
              performance: {
                winRate: 65,
                profitLoss: 2500,
                totalTrades: 48,
                averageTradeLength: 8.5
              }
            }
          });
        }
        
        // Return 404 for non-existent strategy
        return Promise.reject({
          response: {
            status: 404,
            data: { message: 'Strategy not found' }
          }
        });
      }
      
      return Promise.reject(new Error('Not implemented'));
    })
  }
}));

describe('Strategy Query Hooks', () => {
  describe('useStrategies', () => {
    it('should fetch strategies successfully', async () => {
      const { result } = renderHook(() => useStrategies(), {
        wrapper: createWrapper()
      });
      
      // Initially in loading state
      expect(result.current.isLoading).toBe(true);
      
      // Wait for the query to complete
      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      
      // Check the fetched data
      expect(result.current.data).toHaveLength(3);
      expect(result.current.data).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ name: 'Golden Cross' }),
          expect.objectContaining({ name: 'RSI Strategy' }),
          expect.objectContaining({ name: 'MACD Strategy' })
        ])
      );
    });
    
    it('should handle filters correctly', async () => {
      const filters = { status: 'active' };
      
      // Mock the implementation for this specific test
      vi.spyOn(require('@/services/api-service').apiService, 'get')
        .mockImplementationOnce(() => Promise.resolve({
          data: [{ id: 'strategy-1', name: 'Golden Cross', type: 'technical', status: 'active' }]
        }));
      
      const { result } = renderHook(() => useStrategies(filters), {
        wrapper: createWrapper()
      });
      
      // Wait for the query to complete
      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      
      // Check that only active strategies are returned
      expect(result.current.data).toHaveLength(1);
      expect(result.current.data[0]).toMatchObject({ status: 'active', name: 'Golden Cross' });
    });
  });
  
  describe('useStrategyDetail', () => {
    it('should fetch a single strategy by ID', async () => {
      const { result } = renderHook(() => useStrategyDetail('strategy-1'), {
        wrapper: createWrapper()
      });
      
      // Initially in loading state
      expect(result.current.isLoading).toBe(true);
      
      // Wait for the query to complete
      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      
      // Check the fetched data
      expect(result.current.data).toBeDefined();
      expect(result.current.data).toMatchObject({
        id: 'strategy-1',
        name: 'Golden Cross',
        parameters: expect.objectContaining({
          symbols: expect.arrayContaining(['BTCUSDT'])
        }),
        performance: expect.objectContaining({ winRate: 65 })
      });
    });
    
    it('should handle non-existent strategy', async () => {
      const { result } = renderHook(() => useStrategyDetail('non-existent'), {
        wrapper: createWrapper()
      });
      
      // Wait for the query to fail
      await waitFor(() => expect(result.current.isError).toBe(true));
      
      // Check the error
      expect(result.current.error).toBeDefined();
    });
    
    it('should not fetch if ID is not provided', () => {
      const { result } = renderHook(() => useStrategyDetail(''), {
        wrapper: createWrapper()
      });
      // The hook returns isLoading: false and isFetched: false when disabled
      expect(result.current.isLoading).toBe(false);
      expect(result.current.isFetched).toBe(false);
      expect(result.current.data).toBeUndefined();
    });
  });
});
