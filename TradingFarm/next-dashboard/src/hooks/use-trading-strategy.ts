/**
 * Trading Strategy Hook
 * 
 * Custom React hook for managing trading strategies in the UI
 * Provides functions for creating, updating, and managing automated strategies
 */
import { useState, useEffect, useCallback } from 'react';
import { useToast } from '@/components/ui/use-toast';
import { useWebSocketTopic } from './use-websocket';
import { WebSocketTopic } from '@/services/websocket-service';
import { StrategyConfig, StrategySignal, StrategyType } from '@/services/trading-strategy-service';
import { ExchangeType } from '@/services/exchange-service';

export interface BacktestResult {
  id?: number;
  strategyId: number;
  farmId: number;
  startDate: string;
  endDate: string;
  initialCapital: number;
  finalCapital: number;
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  maxDrawdown: number;
  sharpeRatio?: number;
  parameters: Record<string, any>;
  trades?: any[];
}

/**
 * Hook for managing trading strategies
 */
export function useTradingStrategies(farmId?: number) {
  const [strategies, setStrategies] = useState<StrategyConfig[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();
  
  // Get real-time updates on strategies
  const { data: strategyEvents } = useWebSocketTopic(WebSocketTopic.TRADING);
  
  // Fetch strategies
  const fetchStrategies = useCallback(async () => {
    if (!farmId) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`/api/trading/strategies${farmId ? `?farmId=${farmId}` : ''}`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch strategies: ${response.statusText}`);
      }
      
      const data = await response.json();
      setStrategies(data.strategies || []);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      toast({
        title: 'Error fetching strategies',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  }, [farmId, toast]);
  
  // Create a strategy
  const createStrategy = useCallback(async (strategyData: Omit<StrategyConfig, 'id'>) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/trading/strategies', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(strategyData),
      });
      
      if (!response.ok) {
        throw new Error(`Failed to create strategy: ${response.statusText}`);
      }
      
      const data = await response.json();
      
      // Update local strategies
      setStrategies(prev => [...prev, data.strategy]);
      
      toast({
        title: 'Strategy created',
        description: `Successfully created ${strategyData.name} strategy`,
      });
      
      return data.strategy;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      toast({
        title: 'Error creating strategy',
        description: errorMessage,
        variant: 'destructive',
      });
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [toast]);
  
  // Update a strategy
  const updateStrategy = useCallback(async (id: number, updates: Partial<StrategyConfig>) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`/api/trading/strategies/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updates),
      });
      
      if (!response.ok) {
        throw new Error(`Failed to update strategy: ${response.statusText}`);
      }
      
      const data = await response.json();
      
      // Update local strategies
      setStrategies(prev => 
        prev.map(strategy => strategy.id === id ? data.strategy : strategy)
      );
      
      toast({
        title: 'Strategy updated',
        description: 'Strategy has been updated successfully',
      });
      
      return data.strategy;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      toast({
        title: 'Error updating strategy',
        description: errorMessage,
        variant: 'destructive',
      });
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [toast]);
  
  // Delete a strategy
  const deleteStrategy = useCallback(async (id: number) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`/api/trading/strategies/${id}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        throw new Error(`Failed to delete strategy: ${response.statusText}`);
      }
      
      // Update local strategies
      setStrategies(prev => prev.filter(strategy => strategy.id !== id));
      
      toast({
        title: 'Strategy deleted',
        description: 'Strategy has been deleted successfully',
      });
      
      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      toast({
        title: 'Error deleting strategy',
        description: errorMessage,
        variant: 'destructive',
      });
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [toast]);
  
  // Start a strategy
  const startStrategy = useCallback(async (id: number) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`/api/trading/strategies/${id}/start`, {
        method: 'POST',
      });
      
      if (!response.ok) {
        throw new Error(`Failed to start strategy: ${response.statusText}`);
      }
      
      // Update local strategies
      setStrategies(prev => 
        prev.map(strategy => 
          strategy.id === id ? { ...strategy, isActive: true } : strategy
        )
      );
      
      toast({
        title: 'Strategy started',
        description: 'Strategy has been started successfully',
      });
      
      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      toast({
        title: 'Error starting strategy',
        description: errorMessage,
        variant: 'destructive',
      });
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [toast]);
  
  // Stop a strategy
  const stopStrategy = useCallback(async (id: number) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`/api/trading/strategies/${id}/stop`, {
        method: 'POST',
      });
      
      if (!response.ok) {
        throw new Error(`Failed to stop strategy: ${response.statusText}`);
      }
      
      // Update local strategies
      setStrategies(prev => 
        prev.map(strategy => 
          strategy.id === id ? { ...strategy, isActive: false } : strategy
        )
      );
      
      toast({
        title: 'Strategy stopped',
        description: 'Strategy has been stopped successfully',
      });
      
      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      toast({
        title: 'Error stopping strategy',
        description: errorMessage,
        variant: 'destructive',
      });
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [toast]);
  
  // Run a backtest for a strategy
  const runBacktest = useCallback(async (strategyConfig: StrategyConfig, backtestParams: {
    startDate: string;
    endDate: string;
    initialCapital: number;
  }): Promise<BacktestResult | null> => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/trading/backtest', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          strategyConfig,
          ...backtestParams
        }),
      });
      
      if (!response.ok) {
        throw new Error(`Failed to run backtest: ${response.statusText}`);
      }
      
      const data = await response.json();
      
      toast({
        title: 'Backtest completed',
        description: `Successfully ran backtest for ${strategyConfig.name}`,
      });
      
      return data.result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      toast({
        title: 'Error running backtest',
        description: errorMessage,
        variant: 'destructive',
      });
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [toast]);
  
  // Load strategies on mount
  useEffect(() => {
    if (farmId) {
      fetchStrategies();
    }
  }, [farmId, fetchStrategies]);
  
  // Update strategies based on WebSocket events
  useEffect(() => {
    if (strategyEvents && strategyEvents.length > 0) {
      // Process strategy events
      const latestEvent = strategyEvents[0];
      
      if (latestEvent.type === 'strategy_started' || latestEvent.type === 'strategy_stopped') {
        // Refresh strategies to get latest state
        fetchStrategies();
      }
    }
  }, [strategyEvents, fetchStrategies]);
  
  return {
    strategies,
    isLoading,
    error,
    fetchStrategies,
    createStrategy,
    updateStrategy,
    deleteStrategy,
    startStrategy,
    stopStrategy,
    runBacktest
  };
}

/**
 * Hook for managing strategy signals
 */
export function useStrategySignals(strategyId?: number, limit: number = 100) {
  const [signals, setSignals] = useState<StrategySignal[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Get real-time updates on signals
  const { data: signalEvents } = useWebSocketTopic(WebSocketTopic.TRADING);
  
  // Fetch signals
  const fetchSignals = useCallback(async () => {
    if (!strategyId) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`/api/trading/strategies/${strategyId}/signals?limit=${limit}`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch signals: ${response.statusText}`);
      }
      
      const data = await response.json();
      setSignals(data.signals || []);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [strategyId, limit]);
  
  // Load signals on mount
  useEffect(() => {
    if (strategyId) {
      fetchSignals();
    }
  }, [strategyId, fetchSignals]);
  
  // Update signals based on WebSocket events
  useEffect(() => {
    if (signalEvents && signalEvents.length > 0 && strategyId) {
      // Process signal events
      const relevantEvents = signalEvents.filter(event => 
        (event.type === 'strategy_signal' || event.type === 'signal_executed') && 
        event.signal?.strategyId === strategyId
      );
      
      if (relevantEvents.length > 0) {
        fetchSignals();
      }
    }
  }, [signalEvents, strategyId, fetchSignals]);
  
  return {
    signals,
    isLoading,
    error,
    fetchSignals
  };
}

/**
 * Hook for getting strategy parameters based on type
 */
export function useStrategyParameters(type: StrategyType) {
  // Define default parameters for each strategy type
  const getDefaultParameters = useCallback(() => {
    switch (type) {
      case 'trend_following':
        return {
          lookbackPeriod: 20,
          shortPeriod: 9,
          longPeriod: 21,
          quantity: 0.01
        };
      case 'mean_reversion':
        return {
          lookbackPeriod: 20,
          stdDevMultiplier: 2,
          quantity: 0.01
        };
      case 'breakout':
        return {
          period: 14,
          breakoutPercent: 1.5,
          quantity: 0.01
        };
      case 'grid_trading':
        return {
          upperPrice: 0,
          lowerPrice: 0,
          gridLevels: 5,
          quantityPerGrid: 0.01
        };
      case 'scalping':
        return {
          profitTarget: 0.5,
          stopLoss: 0.2,
          maxHoldingTime: 15, // minutes
          quantity: 0.01
        };
      case 'arbitrage':
        return {
          minPriceDifference: 0.5,
          exchanges: ['bybit', 'coinbase'],
          quantity: 0.01
        };
      case 'custom':
      default:
        return {
          quantity: 0.01
        };
    }
  }, [type]);
  
  // Parameter descriptions for UI labels
  const getParameterDescriptions = useCallback(() => {
    switch (type) {
      case 'trend_following':
        return {
          lookbackPeriod: 'Number of periods to lookback for trend calculation',
          shortPeriod: 'Short EMA period (faster moving average)',
          longPeriod: 'Long EMA period (slower moving average)',
          quantity: 'Trading quantity per order'
        };
      case 'mean_reversion':
        return {
          lookbackPeriod: 'Number of periods to calculate mean and standard deviation',
          stdDevMultiplier: 'Standard deviation multiplier for bands calculation',
          quantity: 'Trading quantity per order'
        };
      case 'breakout':
        return {
          period: 'Number of periods to calculate range',
          breakoutPercent: 'Percentage threshold for breakout detection',
          quantity: 'Trading quantity per order'
        };
      case 'grid_trading':
        return {
          upperPrice: 'Upper price boundary for grid',
          lowerPrice: 'Lower price boundary for grid',
          gridLevels: 'Number of grid levels',
          quantityPerGrid: 'Trading quantity per grid level'
        };
      case 'scalping':
        return {
          profitTarget: 'Target profit percentage',
          stopLoss: 'Stop loss percentage',
          maxHoldingTime: 'Maximum holding time in minutes',
          quantity: 'Trading quantity per order'
        };
      case 'arbitrage':
        return {
          minPriceDifference: 'Minimum price difference percentage for arbitrage',
          exchanges: 'Exchanges to monitor for price differences',
          quantity: 'Trading quantity per order'
        };
      case 'custom':
      default:
        return {
          quantity: 'Trading quantity per order'
        };
    }
  }, [type]);
  
  return {
    defaultParameters: getDefaultParameters(),
    parameterDescriptions: getParameterDescriptions()
  };
}
