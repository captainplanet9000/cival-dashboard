import { renderHook, act } from '@testing-library/react';
import { useOrderManagement } from './use-order-management';
import { createBrowserClient } from '@/utils/supabase/client';
import { waitForAsync } from '@/tests/test-utils';

// Mock the supabase client
jest.mock('@/utils/supabase/client');
const mockSupabase = {
  from: jest.fn().mockReturnThis(),
  select: jest.fn().mockReturnThis(),
  insert: jest.fn().mockReturnThis(),
  update: jest.fn().mockReturnThis(),
  delete: jest.fn().mockReturnThis(),
  eq: jest.fn().mockReturnThis(),
  order: jest.fn().mockReturnThis(),
  single: jest.fn(),
};

(createBrowserClient as jest.Mock).mockReturnValue(mockSupabase);

// Mock toast
jest.mock('@/components/ui/use-toast', () => ({
  useToast: () => ({
    toast: jest.fn(),
  }),
}));

describe('useOrderManagement', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Set up default mock responses
    mockSupabase.single.mockResolvedValue({ data: null, error: null });
  });

  it('should initialize with default values', () => {
    const { result } = renderHook(() => useOrderManagement());
    
    expect(result.current.orders).toEqual([]);
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBe(null);
  });

  it('should load orders successfully', async () => {
    // Mock successful response
    const mockOrders = [
      { id: '1', symbol: 'BTC/USDT', side: 'buy', type: 'limit', price: 50000, amount: 1 },
      { id: '2', symbol: 'ETH/USDT', side: 'sell', type: 'market', price: 3000, amount: 5 },
    ];
    
    mockSupabase.single.mockResolvedValueOnce({ 
      data: mockOrders, 
      error: null 
    });

    const { result } = renderHook(() => useOrderManagement());
    
    // Initially, orders should be empty
    expect(result.current.orders).toEqual([]);
    
    // Trigger loading orders
    await act(async () => {
      await result.current.getOrders();
    });
    
    // After loading, orders should contain the mock data
    expect(result.current.orders).toEqual(mockOrders);
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBe(null);
  });

  it('should handle errors when loading orders', async () => {
    // Mock error response
    const mockError = { message: 'Error loading orders' };
    mockSupabase.single.mockResolvedValueOnce({ 
      data: null, 
      error: mockError 
    });

    const { result } = renderHook(() => useOrderManagement());
    
    // Trigger loading orders
    await act(async () => {
      await result.current.getOrders();
    });
    
    // After error, orders should be empty and error should be set
    expect(result.current.orders).toEqual([]);
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBe(mockError);
  });

  it('should create orders successfully', async () => {
    // Mock successful response
    const mockOrder = { 
      id: '3', 
      symbol: 'BTC/USDT', 
      side: 'buy', 
      type: 'limit', 
      price: 50000, 
      amount: 1 
    };
    
    mockSupabase.single.mockResolvedValueOnce({ 
      data: mockOrder, 
      error: null 
    });

    const { result } = renderHook(() => useOrderManagement());
    
    // Create order parameters
    const orderParams = {
      symbol: 'BTC/USDT',
      side: 'buy',
      type: 'limit',
      amount: 1,
      price: 50000,
    };
    
    // Trigger creating order
    let createdOrder;
    await act(async () => {
      createdOrder = await result.current.createOrder(orderParams);
    });
    
    // Should return the created order
    expect(createdOrder).toEqual(mockOrder);
    
    // Should have called the Supabase client correctly
    expect(createBrowserClient).toHaveBeenCalled();
    expect(mockSupabase.from).toHaveBeenCalledWith('orders');
    expect(mockSupabase.insert).toHaveBeenCalled();
  });

  it('should cancel orders successfully', async () => {
    // Mock successful response
    mockSupabase.single.mockResolvedValueOnce({ 
      data: { id: '1', status: 'canceled' }, 
      error: null 
    });

    const { result } = renderHook(() => useOrderManagement());
    
    // Trigger canceling order
    let success;
    await act(async () => {
      success = await result.current.cancelOrder('1');
    });
    
    // Should return true indicating success
    expect(success).toBe(true);
    
    // Should have called the Supabase client correctly
    expect(createBrowserClient).toHaveBeenCalled();
    expect(mockSupabase.from).toHaveBeenCalledWith('orders');
    expect(mockSupabase.update).toHaveBeenCalledWith({ status: 'canceled' });
    expect(mockSupabase.eq).toHaveBeenCalledWith('id', '1');
  });

  it('should handle errors when canceling orders', async () => {
    // Mock error response
    const mockError = { message: 'Error canceling order' };
    mockSupabase.single.mockResolvedValueOnce({ 
      data: null, 
      error: mockError 
    });

    const { result } = renderHook(() => useOrderManagement());
    
    // Trigger canceling order
    let success;
    await act(async () => {
      success = await result.current.cancelOrder('1');
    });
    
    // Should return false indicating failure
    expect(success).toBe(false);
    
    // Error should be set
    expect(result.current.error).toBe(mockError);
  });
});
