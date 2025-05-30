'use client';

import { useState, useCallback } from 'react';
import { useToast } from '@/components/ui/use-toast';
import { liveTradingService } from '@/services/live-trading-service';
import { 
  Order,
  OrderParams,
  OrderResult,
  MarketData
} from '@/types/trading-types';

interface UseLiveTradingProps {
  onError?: (message: string) => void;
}

interface UseLiveTradingState {
  loading: boolean;
  orders: Order[];
  positions: any[];
  balances: any;
  marketData: Record<string, MarketData>;
  error: string | null;
}

export function useLiveTrading({ onError }: UseLiveTradingProps = {}) {
  const { toast } = useToast();
  const [state, setState] = useState<UseLiveTradingState>({
    loading: false,
    orders: [],
    positions: [],
    balances: {},
    marketData: {},
    error: null,
  });

  // Helper to handle errors
  const handleError = useCallback((error: string) => {
    setState(prev => ({ ...prev, error, loading: false }));
    if (onError) {
      onError(error);
    } else {
      toast({
        variant: "destructive",
        title: "Trading Error",
        description: error,
      });
    }
  }, [onError, toast]);

  // Check if live trading is enabled
  const isLiveTradingEnabled = useCallback(() => {
    return liveTradingService.isEnabled();
  }, []);

  // Place an order
  const placeOrder = useCallback(async (exchangeId: string, orderParams: OrderParams): Promise<OrderResult | null> => {
    if (!isLiveTradingEnabled()) {
      handleError('Live trading is disabled');
      return null;
    }

    setState(prev => ({ ...prev, loading: true, error: null }));
    try {
      const result = await liveTradingService.placeOrder(exchangeId, orderParams);
      
      if (!result.success) {
        handleError(`Failed to place order: ${result.message}`);
        return null;
      }
      
      // Add order to state
      if (result.order) {
        setState(prev => ({
          ...prev,
          orders: [result.order, ...prev.orders],
          loading: false,
          error: null
        }));
      }
      
      toast({
        title: "Order Placed",
        description: `Successfully placed ${orderParams.side} order for ${orderParams.quantity} ${orderParams.symbol}`,
      });
      
      return result;
    } catch (error) {
      handleError(`Error placing order: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return null;
    } finally {
      setState(prev => ({ ...prev, loading: false }));
    }
  }, [handleError, isLiveTradingEnabled, toast]);

  // Get account balances
  const getAccountBalances = useCallback(async (exchangeId: string) => {
    if (!isLiveTradingEnabled()) {
      handleError('Live trading is disabled');
      return null;
    }

    setState(prev => ({ ...prev, loading: true, error: null }));
    try {
      const balances = await liveTradingService.getAccountBalances(exchangeId);
      
      if (balances) {
        setState(prev => ({
          ...prev,
          balances,
          loading: false,
          error: null
        }));
      }
      
      return balances;
    } catch (error) {
      handleError(`Error getting account balances: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return null;
    } finally {
      setState(prev => ({ ...prev, loading: false }));
    }
  }, [handleError, isLiveTradingEnabled]);

  // Get open positions
  const getOpenPositions = useCallback(async (exchangeId: string) => {
    if (!isLiveTradingEnabled()) {
      handleError('Live trading is disabled');
      return null;
    }

    setState(prev => ({ ...prev, loading: true, error: null }));
    try {
      const positions = await liveTradingService.getOpenPositions(exchangeId);
      
      if (positions) {
        setState(prev => ({
          ...prev,
          positions,
          loading: false,
          error: null
        }));
      }
      
      return positions;
    } catch (error) {
      handleError(`Error getting open positions: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return null;
    } finally {
      setState(prev => ({ ...prev, loading: false }));
    }
  }, [handleError, isLiveTradingEnabled]);

  // Get market data
  const getMarketData = useCallback(async (exchangeId: string, symbol: string) => {
    if (!isLiveTradingEnabled()) {
      return null;
    }

    try {
      const data = await liveTradingService.getMarketData(exchangeId, symbol);
      
      if (data) {
        setState(prev => ({
          ...prev,
          marketData: {
            ...prev.marketData,
            [symbol]: data
          }
        }));
      }
      
      return data;
    } catch (error) {
      console.error(`Error getting market data for ${symbol}:`, error);
      return null;
    }
  }, [isLiveTradingEnabled]);

  return {
    // State
    ...state,
    isLiveTradingEnabled: isLiveTradingEnabled(),
    
    // Methods
    placeOrder,
    getAccountBalances,
    getOpenPositions,
    getMarketData
  };
}
