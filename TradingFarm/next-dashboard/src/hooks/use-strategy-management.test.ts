import { renderHook, act } from '@testing-library/react';
import { useStrategyManagement } from './use-strategy-management';
import { createBrowserClient } from '@/utils/supabase/client';
import { waitForAsync } from '@/tests/test-utils';

// Mock the Supabase client
jest.mock('@/utils/supabase/client');
const mockSupabase = {
  from: jest.fn().mockReturnThis(),
  select: jest.fn().mockReturnThis(),
  insert: jest.fn().mockReturnThis(),
  update: jest.fn().mockReturnThis(),
  delete: jest.fn().mockReturnThis(),
  eq: jest.fn().mockReturnThis(),
  single: jest.fn(),
  order: jest.fn().mockReturnThis(),
  limit: jest.fn().mockReturnThis(),
  range: jest.fn().mockReturnThis()
};

// Mock useToast hook
jest.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: jest.fn()
  })
}));

describe('useStrategyManagement', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (createBrowserClient as jest.Mock).mockReturnValue(mockSupabase);
  });

  describe('getAllStrategies', () => {
    it('should fetch all strategies successfully', async () => {
      // Mock successful response
      const mockStrategies = [
        { id: 1, name: 'Strategy 1', status: 'active' },
        { id: 2, name: 'Strategy 2', status: 'inactive' }
      ];
      mockSupabase.select.mockReturnValue({
        order: jest.fn().mockReturnValue({
          data: mockStrategies,
          error: null
        })
      });

      const { result } = renderHook(() => useStrategyManagement());

      // Act
      await act(async () => {
        await result.current.getAllStrategies();
      });

      // Assert
      expect(mockSupabase.from).toHaveBeenCalledWith('trading_strategies');
      expect(mockSupabase.select).toHaveBeenCalled();
      expect(result.current.strategies).toEqual(mockStrategies);
      expect(result.current.isLoading).toBe(false);
    });

    it('should handle fetch error', async () => {
      // Mock error response
      mockSupabase.select.mockReturnValue({
        order: jest.fn().mockReturnValue({
          data: null,
          error: { message: 'Failed to fetch strategies' }
        })
      });

      const { result } = renderHook(() => useStrategyManagement());

      // Act
      await act(async () => {
        await result.current.getAllStrategies();
      });

      // Assert
      expect(mockSupabase.from).toHaveBeenCalledWith('trading_strategies');
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBe('Failed to fetch strategies');
    });
  });

  describe('getStrategyById', () => {
    it('should fetch a strategy by ID successfully', async () => {
      // Mock successful response
      const mockStrategy = { id: 1, name: 'Strategy 1', status: 'active' };
      mockSupabase.eq.mockReturnValue({
        single: jest.fn().mockReturnValue({
          data: mockStrategy,
          error: null
        })
      });

      const { result } = renderHook(() => useStrategyManagement());

      // Act
      let fetchedStrategy;
      await act(async () => {
        fetchedStrategy = await result.current.getStrategyById(1);
      });

      // Assert
      expect(mockSupabase.from).toHaveBeenCalledWith('trading_strategies');
      expect(mockSupabase.eq).toHaveBeenCalledWith('id', 1);
      expect(fetchedStrategy).toEqual(mockStrategy);
    });

    it('should handle fetch error for single strategy', async () => {
      // Mock error response
      mockSupabase.eq.mockReturnValue({
        single: jest.fn().mockReturnValue({
          data: null,
          error: { message: 'Strategy not found' }
        })
      });

      const { result } = renderHook(() => useStrategyManagement());

      // Act
      let fetchedStrategy;
      await act(async () => {
        fetchedStrategy = await result.current.getStrategyById(999);
      });

      // Assert
      expect(mockSupabase.from).toHaveBeenCalledWith('trading_strategies');
      expect(fetchedStrategy).toBeNull();
      expect(result.current.error).toBe('Strategy not found');
    });
  });

  describe('createStrategy', () => {
    it('should create a strategy successfully', async () => {
      // Mock successful response
      const newStrategy = {
        name: 'New Strategy',
        description: 'Test strategy',
        parameters: { param1: 'value1' },
        status: 'active'
      };
      const returnedStrategy = { ...newStrategy, id: 123 };
      
      mockSupabase.insert.mockReturnValue({
        select: jest.fn().mockReturnValue({
          data: [returnedStrategy],
          error: null
        })
      });

      const { result } = renderHook(() => useStrategyManagement());

      // Act
      let response;
      await act(async () => {
        response = await result.current.createStrategy(newStrategy);
      });

      // Assert
      expect(mockSupabase.from).toHaveBeenCalledWith('trading_strategies');
      expect(mockSupabase.insert).toHaveBeenCalledWith(expect.objectContaining(newStrategy));
      expect(response).toEqual(returnedStrategy);
    });

    it('should handle creation error', async () => {
      // Mock error response
      mockSupabase.insert.mockReturnValue({
        select: jest.fn().mockReturnValue({
          data: null,
          error: { message: 'Failed to create strategy' }
        })
      });

      const { result } = renderHook(() => useStrategyManagement());

      // Act
      let response;
      await act(async () => {
        response = await result.current.createStrategy({
          name: 'Test Strategy',
          description: 'Description',
          parameters: {},
          status: 'active'
        });
      });

      // Assert
      expect(response).toBeNull();
      expect(result.current.error).toBe('Failed to create strategy');
    });
  });

  describe('updateStrategy', () => {
    it('should update a strategy successfully', async () => {
      // Mock successful response
      const updatedStrategy = {
        id: 1,
        name: 'Updated Strategy',
        description: 'Updated description',
        status: 'inactive'
      };
      
      mockSupabase.eq.mockReturnValue({
        update: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            data: [updatedStrategy],
            error: null
          })
        })
      });

      const { result } = renderHook(() => useStrategyManagement());

      // Act
      let response;
      await act(async () => {
        response = await result.current.updateStrategy(1, updatedStrategy);
      });

      // Assert
      expect(mockSupabase.from).toHaveBeenCalledWith('trading_strategies');
      expect(mockSupabase.eq).toHaveBeenCalledWith('id', 1);
      expect(response).toEqual(updatedStrategy);
    });

    it('should handle update error', async () => {
      // Mock error response
      mockSupabase.eq.mockReturnValue({
        update: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            data: null,
            error: { message: 'Failed to update strategy' }
          })
        })
      });

      const { result } = renderHook(() => useStrategyManagement());

      // Act
      let response;
      await act(async () => {
        response = await result.current.updateStrategy(1, {
          name: 'Updated Strategy',
          status: 'inactive'
        });
      });

      // Assert
      expect(response).toBeNull();
      expect(result.current.error).toBe('Failed to update strategy');
    });
  });

  describe('deleteStrategy', () => {
    it('should delete a strategy successfully', async () => {
      // Mock successful response
      mockSupabase.eq.mockReturnValue({
        delete: jest.fn().mockReturnValue({
          error: null
        })
      });

      const { result } = renderHook(() => useStrategyManagement());

      // Act
      let success;
      await act(async () => {
        success = await result.current.deleteStrategy(1);
      });

      // Assert
      expect(mockSupabase.from).toHaveBeenCalledWith('trading_strategies');
      expect(mockSupabase.eq).toHaveBeenCalledWith('id', 1);
      expect(success).toBe(true);
    });

    it('should handle delete error', async () => {
      // Mock error response
      mockSupabase.eq.mockReturnValue({
        delete: jest.fn().mockReturnValue({
          error: { message: 'Failed to delete strategy' }
        })
      });

      const { result } = renderHook(() => useStrategyManagement());

      // Act
      let success;
      await act(async () => {
        success = await result.current.deleteStrategy(999);
      });

      // Assert
      expect(success).toBe(false);
      expect(result.current.error).toBe('Failed to delete strategy');
    });
  });

  describe('activateStrategy', () => {
    it('should activate a strategy successfully', async () => {
      // Mock successful response
      const activatedStrategy = {
        id: 1,
        name: 'Strategy 1',
        status: 'active'
      };
      
      mockSupabase.eq.mockReturnValue({
        update: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            data: [activatedStrategy],
            error: null
          })
        })
      });

      const { result } = renderHook(() => useStrategyManagement());

      // Act
      let response;
      await act(async () => {
        response = await result.current.activateStrategy(1);
      });

      // Assert
      expect(mockSupabase.from).toHaveBeenCalledWith('trading_strategies');
      expect(mockSupabase.eq).toHaveBeenCalledWith('id', 1);
      expect(mockSupabase.update).toHaveBeenCalledWith({ status: 'active' });
      expect(response).toEqual(activatedStrategy);
    });
  });

  describe('deactivateStrategy', () => {
    it('should deactivate a strategy successfully', async () => {
      // Mock successful response
      const deactivatedStrategy = {
        id: 1,
        name: 'Strategy 1',
        status: 'inactive'
      };
      
      mockSupabase.eq.mockReturnValue({
        update: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            data: [deactivatedStrategy],
            error: null
          })
        })
      });

      const { result } = renderHook(() => useStrategyManagement());

      // Act
      let response;
      await act(async () => {
        response = await result.current.deactivateStrategy(1);
      });

      // Assert
      expect(mockSupabase.from).toHaveBeenCalledWith('trading_strategies');
      expect(mockSupabase.eq).toHaveBeenCalledWith('id', 1);
      expect(mockSupabase.update).toHaveBeenCalledWith({ status: 'inactive' });
      expect(response).toEqual(deactivatedStrategy);
    });
  });
});
