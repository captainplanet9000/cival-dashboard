/**
 * Exchange Hook
 * 
 * React hook for interacting with cryptocurrency exchanges
 * Provides market data, trading operations, and account information
 */

import { useState, useEffect, useCallback } from 'react';
import { ExchangeClient, Order, MarketData, Position, AccountBalance, ExchangeInfo } from '../clients/exchange-client';
import { MonitoringService } from '../monitoring-service';

export interface UseExchangeOptions {
  defaultExchange?: string;
  autoConnect?: boolean;
}

/**
 * Hook for interacting with cryptocurrency exchanges
 */
export default function useExchange(options: UseExchangeOptions = {}) {
  const { defaultExchange = 'bybit', autoConnect = true } = options;
  
  const [exchange, setExchange] = useState(defaultExchange);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [marketData, setMarketData] = useState<MarketData | null>(null);
  const [lastPrice, setLastPrice] = useState<number | null>(null);
  
  // Initialize client
  const client = ExchangeClient.getInstance();
  
  // Check connection status
  useEffect(() => {
    const connected = client.isConnected(exchange);
    setIsConnected(connected);
  }, [exchange, client]);
  
  // Auto-connect to exchange
  useEffect(() => {
    if (autoConnect && !isConnected) {
      const checkConnection = async () => {
        try {
          const { data: info } = await client.getExchangeInfo(exchange);
          setIsConnected(!!info);
        } catch (err) {
          setIsConnected(false);
          setError(err instanceof Error ? err : new Error('Failed to connect to exchange'));
        }
      };
      
      checkConnection();
    }
    
    // Cleanup function
    return () => {
      // No cleanup needed for connection check
    };
  }, [autoConnect, exchange, isConnected, client]);
  
  /**
   * Get market data from the exchange
   */
  const getMarketData = useCallback(async (
    symbol: string,
    interval: string = '1h',
    limit: number = 100
  ): Promise<MarketData | null> => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await client.getMarketData(exchange, symbol, interval, limit);
      
      if (response.error) {
        throw new Error(response.error.message);
      }
      
      if (response.data) {
        setMarketData(response.data);
      }
      
      return response.data;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to get market data');
      setError(error);
      
      MonitoringService.logEvent({
        type: 'error',
        message: `Failed to get market data for ${symbol} on ${exchange}`,
        data: { error, symbol, interval, exchange }
      });
      
      return null;
    } finally {
      setLoading(false);
    }
  }, [exchange, client]);
  
  /**
   * Get latest price for a symbol
   */
  const getLatestPrice = useCallback(async (
    symbol: string
  ): Promise<number | null> => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await client.getLatestPrice(exchange, symbol);
      
      if (response.error) {
        throw new Error(response.error.message);
      }
      
      if (response.data !== null) {
        setLastPrice(response.data);
      }
      
      return response.data;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to get latest price');
      setError(error);
      
      MonitoringService.logEvent({
        type: 'error',
        message: `Failed to get latest price for ${symbol} on ${exchange}`,
        data: { error, symbol, exchange }
      });
      
      return null;
    } finally {
      setLoading(false);
    }
  }, [exchange, client]);
  
  /**
   * Subscribe to real-time market updates
   */
  const subscribeToMarket = useCallback((
    symbol: string,
    onUpdate: (data: any) => void
  ): (() => void) => {
    return client.subscribeToMarket(exchange, symbol, onUpdate);
  }, [exchange, client]);
  
  /**
   * Place an order on the exchange
   */
  const placeOrder = useCallback(async (
    params: Omit<Parameters<typeof client.placeOrder>[1], 'clientOrderId'> & {
      clientOrderId?: string;
    }
  ): Promise<Order | null> => {
    setLoading(true);
    setError(null);
    
    try {
      // Generate a client order ID if not provided
      if (!params.clientOrderId) {
        params.clientOrderId = `order-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
      }
      
      const response = await client.placeOrder(exchange, params);
      
      if (response.error) {
        throw new Error(response.error.message);
      }
      
      return response.data;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to place order');
      setError(error);
      
      MonitoringService.logEvent({
        type: 'error',
        message: `Failed to place order on ${exchange}`,
        data: { error, params, exchange }
      });
      
      return null;
    } finally {
      setLoading(false);
    }
  }, [exchange, client]);
  
  /**
   * Cancel an order on the exchange
   */
  const cancelOrder = useCallback(async (
    symbol: string,
    orderId: string
  ): Promise<boolean> => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await client.cancelOrder(exchange, symbol, orderId);
      
      if (response.error) {
        throw new Error(response.error.message);
      }
      
      return response.data || false;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to cancel order');
      setError(error);
      
      MonitoringService.logEvent({
        type: 'error',
        message: `Failed to cancel order ${orderId} on ${exchange}`,
        data: { error, orderId, symbol, exchange }
      });
      
      return false;
    } finally {
      setLoading(false);
    }
  }, [exchange, client]);
  
  /**
   * Get account balances from the exchange
   */
  const getAccountBalance = useCallback(async (): Promise<AccountBalance | null> => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await client.getAccountBalance(exchange);
      
      if (response.error) {
        throw new Error(response.error.message);
      }
      
      return response.data;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to get account balance');
      setError(error);
      
      MonitoringService.logEvent({
        type: 'error',
        message: `Failed to get account balance on ${exchange}`,
        data: { error, exchange }
      });
      
      return null;
    } finally {
      setLoading(false);
    }
  }, [exchange, client]);
  
  /**
   * Get open positions from the exchange
   */
  const getPositions = useCallback(async (
    symbol?: string
  ): Promise<Position[] | null> => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await client.getPositions(exchange, symbol);
      
      if (response.error) {
        throw new Error(response.error.message);
      }
      
      return response.data;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to get positions');
      setError(error);
      
      MonitoringService.logEvent({
        type: 'error',
        message: `Failed to get positions on ${exchange}`,
        data: { error, exchange, symbol }
      });
      
      return null;
    } finally {
      setLoading(false);
    }
  }, [exchange, client]);
  
  /**
   * Get exchange information and available markets
   */
  const getExchangeInfo = useCallback(async (): Promise<ExchangeInfo | null> => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await client.getExchangeInfo(exchange);
      
      if (response.error) {
        throw new Error(response.error.message);
      }
      
      return response.data;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to get exchange info');
      setError(error);
      
      MonitoringService.logEvent({
        type: 'error',
        message: `Failed to get exchange info for ${exchange}`,
        data: { error, exchange }
      });
      
      return null;
    } finally {
      setLoading(false);
    }
  }, [exchange, client]);
  
  /**
   * Change the active exchange
   */
  const changeExchange = useCallback((newExchange: string) => {
    setExchange(newExchange);
    setIsConnected(client.isConnected(newExchange));
  }, [client]);
  
  /**
   * Reset error state
   */
  const resetError = useCallback(() => {
    setError(null);
  }, []);
  
  // Close all connections when component unmounts
  useEffect(() => {
    return () => {
      // Only close connections for the current exchange
      // To avoid disrupting other components that might be using different exchanges
    };
  }, [exchange]);
  
  return {
    exchange,
    loading,
    error,
    isConnected,
    marketData,
    lastPrice,
    getMarketData,
    getLatestPrice,
    subscribeToMarket,
    placeOrder,
    cancelOrder,
    getAccountBalance,
    getPositions,
    getExchangeInfo,
    changeExchange,
    resetError
  };
}
