import { renderHook } from '@testing-library/react';
import { createWrapper } from '../utils/test-query-utils';
import { 
  useCreateStrategy, 
  useUpdateStrategy, 
  useDeleteStrategy 
} from '@/hooks/react-query/use-strategy-mutations';
import { QueryClient } from '@tanstack/react-query';
import type { StrategyInput, StrategyUpdateInput } from '@/hooks/react-query/use-strategy-mutations';
import { act } from 'react-dom/test-utils';

// Mock toast notifications
import { vi } from 'vitest';
vi.mock('@/components/ui/use-toast', () => ({
  toast: vi.fn(),
}));

// Mock the API service
vi.mock('@/services/api-service', () => ({
  apiService: {
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  }
}));

describe('Strategy Mutation Hooks', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });
  
  describe('useCreateStrategy', () => {
    it('should create a strategy successfully', async () => {
      const apiService = require('@/services/api-service').apiService;
      const toast = require('@/components/ui/use-toast').toast;
      
      // Mock API response
      apiService.post.mockResolvedValueOnce({
        data: {
          id: 'new-strategy-id',
          name: 'New Strategy',
          type: 'technical',
          status: 'draft'
        }
      });
      
      // Render the hook
      const { result } = renderHook(() => useCreateStrategy(), {
        wrapper: createWrapper()
      });
      
      // Create a new strategy
      const newStrategy: StrategyInput = {
        name: 'New Strategy',
        type: 'technical',
        status: 'draft',
        parameters: {
          timeframe: '1h',
          symbols: ['BTCUSDT'],
          riskManagement: {
            maxPositionSize: 0.1
          }
        }
      };
      
      // Execute the mutation
      await act(async () => {
        await result.current.mutateAsync(newStrategy);
      });
      
      // Check that API was called with correct data
      expect(apiService.post).toHaveBeenCalledWith('/api/strategies', newStrategy);
      
      // Check success state
      expect(result.current.isSuccess).toBe(true);
      expect(result.current.data.id).toBe('new-strategy-id');
      
      // Check that success toast was shown
      expect(toast).toHaveBeenCalledWith(expect.objectContaining({
        title: 'Strategy created'
      }));
    });
    
    it('should handle errors when creating a strategy', async () => {
      const apiService = require('@/services/api-service').apiService;
      const toast = require('@/components/ui/use-toast').toast;
      
      // Mock API error
      const error = new Error('Failed to create strategy');
      apiService.post.mockRejectedValueOnce(error);
      
      // Render the hook
      const { result } = renderHook(() => useCreateStrategy(), {
        wrapper: createWrapper()
      });
      
      // Create a new strategy
      const newStrategy: StrategyInput = {
        name: 'New Strategy',
        type: 'technical',
        status: 'draft',
        parameters: {
          timeframe: '1h',
          symbols: ['BTCUSDT'],
          riskManagement: {
            maxPositionSize: 0.1
          }
        }
      };
      
      // Execute the mutation and catch the error
      await act(async () => {
        try {
          await result.current.mutateAsync(newStrategy);
        } catch (e) {
          // Expected to throw
        }
      });
      
      // Check error state
      expect(result.current.isError).toBe(true);
      expect(result.current.error).toBe(error);
      
      // Check that error toast was shown
      expect(toast).toHaveBeenCalledWith(expect.objectContaining({
        title: 'Failed to create strategy',
        variant: 'destructive'
      }));
    });
  });
  
  describe('useUpdateStrategy', () => {
    it('should update a strategy successfully', async () => {
      const apiService = require('@/services/api-service').apiService;
      const toast = require('@/components/ui/use-toast').toast;
      
      // Mock API response
      apiService.put.mockResolvedValueOnce({
        data: {
          id: 'strategy-1',
          name: 'Updated Strategy',
          type: 'technical',
          status: 'active'
        }
      });
      
      // Create a mock query client to check invalidation
      const queryClient = new QueryClient();
      jest.spyOn(queryClient, 'invalidateQueries');
      
      // Render the hook with the mock query client
      const wrapper = ({ children }: { children: React.ReactNode }) => createWrapper()({ children });
      
      const { result } = renderHook(() => useUpdateStrategy(), {
        wrapper
      });
      
      // Update strategy
      const updatedStrategy: StrategyUpdateInput = {
        id: 'strategy-1',
        name: 'Updated Strategy',
        status: 'active'
      };
      
      // Execute the mutation
      await act(async () => {
        await result.current.mutateAsync(updatedStrategy);
      });
      
      // Check that API was called with correct data
      expect(apiService.put).toHaveBeenCalledWith('/api/strategies/strategy-1', {
        name: 'Updated Strategy',
        status: 'active'
      });
      
      // Check success state
      expect(result.current.isSuccess).toBe(true);
      
      // Check that queries were invalidated
      expect(queryClient.invalidateQueries).toHaveBeenCalled();
      
      // Check that success toast was shown
      expect(toast).toHaveBeenCalledWith(expect.objectContaining({
        title: 'Strategy updated'
      }));
    });
  });
  
  describe('useDeleteStrategy', () => {
    it('should delete a strategy successfully', async () => {
      const apiService = require('@/services/api-service').apiService;
      const toast = require('@/components/ui/use-toast').toast;
      
      // Mock API response
      apiService.delete.mockResolvedValueOnce({});
      
      // Create a mock query client to check cache operations
      const queryClient = new QueryClient();
      jest.spyOn(queryClient, 'invalidateQueries');
      vi.spyOn(queryClient, 'removeQueries');
      
      // Render the hook with the mock query client
      const wrapper = ({ children }: { children: React.ReactNode }) => createWrapper()({ children });
      
      const { result } = renderHook(() => useDeleteStrategy(), {
        wrapper
      });
      
      // Execute the mutation
      await act(async () => {
        await result.current.mutateAsync('strategy-1');
      });
      
      // Check that API was called with correct ID
      expect(apiService.delete).toHaveBeenCalledWith('/api/strategies/strategy-1');
      
      // Check success state
      expect(result.current.isSuccess).toBe(true);
      
      // Check that queries were properly handled
      expect(queryClient.invalidateQueries).toHaveBeenCalled();
      expect(queryClient.removeQueries).toHaveBeenCalled();
      
      // Check that success toast was shown
      expect(toast).toHaveBeenCalledWith(expect.objectContaining({
        title: 'Strategy deleted'
      }));
    });
  });
});
