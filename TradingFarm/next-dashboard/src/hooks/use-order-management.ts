import React from 'react';
const { useState, useCallback } = React;
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { TradingSystem, TradingSystemClient, OrderType, OrderSide, OrderStatus } from '@/utils/supabase/trading-system';
import { createBrowserClient } from '@/utils/supabase/client';

// Using TradingSystem's OrderParams interface
import { OrderParams as TradingSystemOrderParams } from '@/utils/supabase/trading-system';

// Extended interface for local use
interface OrderParams extends TradingSystemOrderParams {
  // Add any additional properties needed for the UI
}

interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

/**
 * Hook for order management functionality
 * Provides methods for creating, validating, and managing orders
 */
export function useOrderManagement() {
  const queryClient = useQueryClient();
  // Using static methods from TradingSystem class
  const [orderErrors, setOrderErrors] = useState<string[]>([]);

  // Create Order
  const createOrderMutation = useMutation({
    mutationFn: async (params: OrderParams) => {
      try {
        // Ensure we're passing the correct parameters to TradingSystem
        const response = await TradingSystem.createOrder({
          farmId: params.farmId,
          exchangeConnectionId: params.exchangeConnectionId,
          symbol: params.symbol,
          orderType: params.orderType,
          side: params.side,
          quantity: params.quantity,
          price: params.price,
          stopPrice: params.stopPrice,
          timeInForce: params.timeInForce,
          isPaperTrading: params.isPaperTrading,
          additionalParams: params.additionalParams
        });
        return response;
      } catch (error: any) {
        setOrderErrors([error.message || 'Failed to create order']);
        throw error;
      }
    },
    onSuccess: () => {
      // Invalidate relevant queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['orderHistory'] });
      queryClient.invalidateQueries({ queryKey: ['positions'] });
      queryClient.invalidateQueries({ queryKey: ['account'] });
    },
    onError: (error: any) => {
      setOrderErrors([error.message || 'Failed to create order']);
    }
  });

  // Create Order
  const createOrder = useCallback(async (orderParams: OrderParams) => {
    return createOrderMutation.mutateAsync(orderParams);
  }, [createOrderMutation]);

  // Validate Order
  const validateOrder = useCallback((orderParams: OrderParams): ValidationResult => {
    const errors: string[] = [];

    // Check required fields
    if (!orderParams.symbol) {
      errors.push('Symbol is required');
    }

    if (!orderParams.side) {
      errors.push('Order side is required');
    }

    if (!orderParams.orderType) {
      errors.push('Order type is required');
    }

    if (!orderParams.quantity || orderParams.quantity <= 0) {
      errors.push('Quantity must be greater than 0');
    }

    // Check price for non-market orders
    if (orderParams.orderType === 'market' && (!orderParams.price || orderParams.price <= 0)) {
      errors.push('Price is required for this order type');
    }

    // Check stop price for stop orders
    if (orderParams.orderType.includes('stop') && (!orderParams.stopPrice || orderParams.stopPrice <= 0)) {
      errors.push('Stop price is required for stop orders');
    }

    // Check trailing percent for trailing stop orders
    if (orderParams.orderType === 'trailing_stop') {
      const trailingPercent = orderParams.additionalParams?.trailingPercent;
      if (!trailingPercent || typeof trailingPercent !== 'number' || trailingPercent <= 0) {
        errors.push(`Trailing stop order requires a valid trailing percentage in additionalParams`);
      }
    }

    // Check exchange credential ID
    if (!orderParams.exchangeConnectionId) {
      errors.push('Exchange connection ID is required');
    }

    // Advanced order validation
    if (orderParams.additionalParams && typeof orderParams.additionalParams !== 'object') {
      errors.push('Additional parameters must be an object if provided');
    } else if (orderParams.orderType === 'limit' && orderParams.additionalParams) {
      const { advancedParams } = orderParams.additionalParams;

      if (advancedParams.type === 'twap') {
        if (!advancedParams.sliceCount || advancedParams.sliceCount < 2) {
          errors.push('TWAP orders require at least 2 slices');
        }
        if (!advancedParams.intervalMs || advancedParams.intervalMs < 1000) {
          errors.push('TWAP interval must be at least 1 second');
        }
      }

      if (advancedParams.type === 'iceberg' && (!advancedParams.visibleQty || advancedParams.visibleQty <= 0)) {
        errors.push('Iceberg orders require a visible quantity');
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }, []);

  // Cancel Order
  const cancelOrderMutation = useMutation({
    mutationFn: async ({ orderId, farmId }: { orderId: string; farmId: string }) => {
      try {
        // Since TradingSystemClient doesn't have a cancelOrder method,
        // we'll mock one by updating the order status through Supabase
        const supabase = createBrowserClient();
        const { data, error } = await supabase
          .from('orders')
          .update({ status: 'canceled' })
          .eq('id', orderId)
          .eq('farm_id', farmId)
          .select()
          .single();
          
        if (error) throw error;
        return data;
      } catch (error: any) {
        setOrderErrors([error.message || 'Failed to cancel order']);
        throw error;
      }
    },
  });

  const cancelOrder = useCallback(async ({ orderId, farmId }: { orderId: string; farmId: string }) => {
    return cancelOrderMutation.mutateAsync({ orderId, farmId });
  }, [cancelOrderMutation]);

  // Cancel All Orders
  const cancelAllOrdersMutation = useMutation({
    mutationFn: async ({ symbol, farmId }: { symbol: string; farmId: string }) => {
      try {
        // Since TradingSystemClient doesn't have a cancelAllOrders method,
        // we'll mock one by updating all pending orders through Supabase
        const supabase = createBrowserClient();
        let query = supabase
          .from('orders')
          .update({ status: 'canceled' })
          .eq('farm_id', farmId)
          .eq('status', 'pending');
          
        if (symbol) {
          query = query.eq('symbol', symbol);
        }
        
        const { data, error } = await query.select();
        
        if (error) throw error;
        return data;
      } catch (error: any) {
        setOrderErrors([error.message || 'Failed to cancel all orders']);
        throw error;
      }
    },
  });

  const cancelAllOrders = useCallback(async ({ symbol, farmId }: { symbol?: string; farmId: string }) => {
    return cancelAllOrdersMutation.mutateAsync({ symbol: symbol || '', farmId });
  }, [cancelAllOrdersMutation]);

  // Helper function to get orders
  const getOrders = useCallback(async (farmId: string, options?: {
    symbol?: string,
    status?: OrderStatus,
    limit?: number,
    offset?: number,
    startDate?: Date,
    endDate?: Date,
    isPaperTrading?: boolean
  }) => {
    try {
      return await TradingSystemClient.getOrders(farmId, options);
    } catch (error: any) {
      setOrderErrors([error.message || 'Failed to fetch orders']);
      throw error;
    }
  }, []);

  return {
    createOrder,
    validateOrder,
    cancelOrder,
    cancelAllOrders,
    getOrders,
    orderErrors,
    clearOrderErrors: () => setOrderErrors([])
  };
}
