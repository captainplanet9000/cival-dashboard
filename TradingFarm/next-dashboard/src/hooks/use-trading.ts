/**
 * Trading Farm - Phase 4 Trading Hooks
 * React hooks for interacting with the trading API
 */

import { useCallback, useState } from 'react';
import { useToast } from '@/components/ui/use-toast';
import { createServerClient } from '@/utils/supabase/server';
import {
  Order,
  OrderRequest,
  OrderResponse,
  Position,
  RiskProfile,
  MarketData,
  WalletBalance,
  ApiError
} from '@/types/trading';

// Base API URL
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

/**
 * Hook for order-related functionality
 */
export function useOrders() {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);

  /**
   * Create a new order
   */
  const createOrder = async (orderRequest: OrderRequest): Promise<OrderResponse | null> => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_BASE_URL}/trading/orders`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(orderRequest),
        credentials: 'include',
      });

      const data = await response.json();

      if (!response.ok) {
        const error: ApiError = {
          status: response.status,
          message: data.detail || 'Failed to create order'
        };
        setError(error);
        toast({
          variant: 'destructive',
          title: 'Order Error',
          description: error.message,
        });
        return null;
      }

      toast({
        title: 'Order Created',
        description: `Successfully placed ${orderRequest.side} order for ${orderRequest.quantity} ${orderRequest.symbol}`,
      });

      return data;
    } catch (err) {
      const error: ApiError = {
        status: 500,
        message: err instanceof Error ? err.message : 'Unknown error occurred'
      };
      setError(error);
      toast({
        variant: 'destructive',
        title: 'Order Error',
        description: error.message,
      });
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Get a list of orders
   */
  const getOrders = async (
    agentId?: string,
    status?: string,
    limit: number = 100
  ): Promise<Order[]> => {
    setIsLoading(true);
    setError(null);

    try {
      // Build URL with query parameters
      let url = `${API_BASE_URL}/trading/orders?limit=${limit}`;
      if (agentId) url += `&agent_id=${agentId}`;
      if (status) url += `&status=${status}`;

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      });

      const data = await response.json();

      if (!response.ok) {
        const error: ApiError = {
          status: response.status,
          message: data.detail || 'Failed to fetch orders'
        };
        setError(error);
        toast({
          variant: 'destructive',
          title: 'Error',
          description: error.message,
        });
        return [];
      }

      return data;
    } catch (err) {
      const error: ApiError = {
        status: 500,
        message: err instanceof Error ? err.message : 'Unknown error occurred'
      };
      setError(error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message,
      });
      return [];
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Get details for a specific order
   */
  const getOrder = async (orderId: number): Promise<Order | null> => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_BASE_URL}/trading/orders/${orderId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      });

      const data = await response.json();

      if (!response.ok) {
        const error: ApiError = {
          status: response.status,
          message: data.detail || 'Failed to fetch order'
        };
        setError(error);
        toast({
          variant: 'destructive',
          title: 'Error',
          description: error.message,
        });
        return null;
      }

      return data;
    } catch (err) {
      const error: ApiError = {
        status: 500,
        message: err instanceof Error ? err.message : 'Unknown error occurred'
      };
      setError(error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message,
      });
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Cancel an open order
   */
  const cancelOrder = async (orderId: number): Promise<boolean> => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_BASE_URL}/trading/orders/${orderId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      });

      const data = await response.json();

      if (!response.ok) {
        const error: ApiError = {
          status: response.status,
          message: data.detail || 'Failed to cancel order'
        };
        setError(error);
        toast({
          variant: 'destructive',
          title: 'Error',
          description: error.message,
        });
        return false;
      }

      toast({
        title: 'Order Cancelled',
        description: 'Order has been cancelled successfully',
      });

      return true;
    } catch (err) {
      const error: ApiError = {
        status: 500,
        message: err instanceof Error ? err.message : 'Unknown error occurred'
      };
      setError(error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message,
      });
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Sync order status with the exchange
   */
  const syncOrderStatus = async (orderId: number): Promise<boolean> => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_BASE_URL}/trading/orders/${orderId}/sync`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      });

      const data = await response.json();

      if (!response.ok) {
        const error: ApiError = {
          status: response.status,
          message: data.detail || 'Failed to sync order status'
        };
        setError(error);
        toast({
          variant: 'destructive',
          title: 'Error',
          description: error.message,
        });
        return false;
      }

      toast({
        title: 'Order Synced',
        description: 'Order status has been synced with the exchange',
      });

      return true;
    } catch (err) {
      const error: ApiError = {
        status: 500,
        message: err instanceof Error ? err.message : 'Unknown error occurred'
      };
      setError(error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message,
      });
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    isLoading,
    error,
    createOrder,
    getOrders,
    getOrder,
    cancelOrder,
    syncOrderStatus,
  };
}

/**
 * Hook for position-related functionality
 */
export function usePositions() {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);

  /**
   * Get all positions with optional filtering
   */
  const getPositions = async (
    agentId?: string,
    symbol?: string
  ): Promise<Position[]> => {
    setIsLoading(true);
    setError(null);

    try {
      // Build URL with query parameters
      let url = `${API_BASE_URL}/trading/positions`;
      const params = new URLSearchParams();
      if (agentId) params.append('agent_id', agentId);
      if (symbol) params.append('symbol', symbol);
      
      if (params.toString()) {
        url += `?${params.toString()}`;
      }

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      });

      const data = await response.json();

      if (!response.ok) {
        const error: ApiError = {
          status: response.status,
          message: data.detail || 'Failed to fetch positions'
        };
        setError(error);
        toast({
          variant: 'destructive',
          title: 'Error',
          description: error.message,
        });
        return [];
      }

      return data;
    } catch (err) {
      const error: ApiError = {
        status: 500,
        message: err instanceof Error ? err.message : 'Unknown error occurred'
      };
      setError(error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message,
      });
      return [];
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Update unrealized PnL for all positions
   */
  const updatePositionsPnl = async (): Promise<boolean> => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_BASE_URL}/trading/positions/update-pnl`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      });

      const data = await response.json();

      if (!response.ok) {
        const error: ApiError = {
          status: response.status,
          message: data.detail || 'Failed to update positions PnL'
        };
        setError(error);
        toast({
          variant: 'destructive',
          title: 'Error',
          description: error.message,
        });
        return false;
      }

      return true;
    } catch (err) {
      const error: ApiError = {
        status: 500,
        message: err instanceof Error ? err.message : 'Unknown error occurred'
      };
      setError(error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message,
      });
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    isLoading,
    error,
    getPositions,
    updatePositionsPnl,
  };
}

/**
 * Hook for risk management functionality
 */
export function useRiskManagement() {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);

  /**
   * Get risk profile for user/agent
   */
  const getRiskProfile = async (agentId?: string): Promise<RiskProfile | null> => {
    setIsLoading(true);
    setError(null);

    try {
      // Build URL with query parameters
      let url = `${API_BASE_URL}/trading/risk-profile`;
      if (agentId) url += `?agent_id=${agentId}`;

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      });

      const data = await response.json();

      if (!response.ok) {
        const error: ApiError = {
          status: response.status,
          message: data.detail || 'Failed to fetch risk profile'
        };
        setError(error);
        toast({
          variant: 'destructive',
          title: 'Error',
          description: error.message,
        });
        return null;
      }

      return data;
    } catch (err) {
      const error: ApiError = {
        status: 500,
        message: err instanceof Error ? err.message : 'Unknown error occurred'
      };
      setError(error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message,
      });
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Update risk profile
   */
  const updateRiskProfile = async (profile: RiskProfile): Promise<RiskProfile | null> => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_BASE_URL}/trading/risk-profile`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(profile),
        credentials: 'include',
      });

      const data = await response.json();

      if (!response.ok) {
        const error: ApiError = {
          status: response.status,
          message: data.detail || 'Failed to update risk profile'
        };
        setError(error);
        toast({
          variant: 'destructive',
          title: 'Error',
          description: error.message,
        });
        return null;
      }

      toast({
        title: 'Risk Profile Updated',
        description: 'Risk management settings have been updated',
      });

      return data;
    } catch (err) {
      const error: ApiError = {
        status: 500,
        message: err instanceof Error ? err.message : 'Unknown error occurred'
      };
      setError(error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message,
      });
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    isLoading,
    error,
    getRiskProfile,
    updateRiskProfile,
  };
}

/**
 * Hook for market data functionality
 */
export function useMarketData() {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);

  /**
   * Get market data for a specific symbol
   */
  const getMarketData = async (
    exchange: string,
    symbol: string
  ): Promise<MarketData | null> => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `${API_BASE_URL}/trading/market-data/${exchange}/${symbol}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
        }
      );

      const data = await response.json();

      if (!response.ok) {
        const error: ApiError = {
          status: response.status,
          message: data.detail || 'Failed to fetch market data'
        };
        setError(error);
        toast({
          variant: 'destructive',
          title: 'Error',
          description: error.message,
        });
        return null;
      }

      return data;
    } catch (err) {
      const error: ApiError = {
        status: 500,
        message: err instanceof Error ? err.message : 'Unknown error occurred'
      };
      setError(error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message,
      });
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    isLoading,
    error,
    getMarketData,
  };
}

/**
 * Hook for wallet/balance functionality
 */
export function useWallets() {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);

  /**
   * Get wallet balances for an exchange
   */
  const getWalletBalances = async (exchange: string): Promise<WalletBalance[]> => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_BASE_URL}/trading/balances/${exchange}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      });

      const data = await response.json();

      if (!response.ok) {
        const error: ApiError = {
          status: response.status,
          message: data.detail || 'Failed to fetch wallet balances'
        };
        setError(error);
        toast({
          variant: 'destructive',
          title: 'Error',
          description: error.message,
        });
        return [];
      }

      return data;
    } catch (err) {
      const error: ApiError = {
        status: 500,
        message: err instanceof Error ? err.message : 'Unknown error occurred'
      };
      setError(error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message,
      });
      return [];
    } finally {
      setIsLoading(false);
    }
  };

  return {
    isLoading,
    error,
    getWalletBalances,
  };
}
