import { useState, useEffect, useCallback } from 'react';
import { TRADING_EVENTS } from '@/constants/socket-events';
import { Strategy, StrategyTemplate } from '@/types/strategy';
import { strategyService } from '@/services/strategy-service';
import { socketService } from '@/services/socket-service';

/**
 * Custom hook for managing strategies with real-time updates
 */
export function useStrategies() {
  const [strategies, setStrategies] = useState<Strategy[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [initialized, setInitialized] = useState<boolean>(false);

  // Fetch strategies from API
  const fetchStrategies = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await strategyService.getStrategies();
      setStrategies(data);
      setLoading(false);
      setInitialized(true);
    } catch (err) {
      console.error('Error fetching strategies:', err);
      setError('Failed to load strategies. Please try again.');
      setLoading(false);
    }
  }, []);

  // Refresh strategies
  const refreshStrategies = useCallback(async () => {
    await fetchStrategies();
  }, [fetchStrategies]);

  // Create a new strategy
  const createStrategy = useCallback(async (strategy: StrategyTemplate) => {
    try {
      setError(null);
      const newStrategy = await strategyService.createStrategy(strategy);
      return newStrategy;
    } catch (err) {
      console.error('Error creating strategy:', err);
      setError('Failed to create strategy. Please try again.');
      throw err;
    }
  }, []);

  // Update a strategy
  const updateStrategy = useCallback(async (id: string, updates: Partial<Strategy>) => {
    try {
      setError(null);
      const updatedStrategy = await strategyService.updateStrategy(id, updates);
      return updatedStrategy;
    } catch (err) {
      console.error('Error updating strategy:', err);
      setError('Failed to update strategy. Please try again.');
      throw err;
    }
  }, []);

  // Delete a strategy
  const deleteStrategy = useCallback(async (id: string) => {
    try {
      setError(null);
      const success = await strategyService.deleteStrategy(id);
      if (!success) {
        throw new Error('Failed to delete strategy');
      }
      return success;
    } catch (err) {
      console.error('Error deleting strategy:', err);
      setError('Failed to delete strategy. Please try again.');
      throw err;
    }
  }, []);

  // Change strategy status
  const changeStrategyStatus = useCallback(async (id: string, status: 'active' | 'paused' | 'inactive') => {
    try {
      setError(null);
      const updatedStrategy = await strategyService.changeStrategyStatus(id, status);
      return updatedStrategy;
    } catch (err) {
      console.error('Error changing strategy status:', err);
      setError('Failed to change strategy status. Please try again.');
      throw err;
    }
  }, []);

  // Set up socket listeners for real-time updates
  useEffect(() => {
    // Only set up listeners once
    if (initialized) return;

    // Handle socket connection status change
    const connectionCleanup = socketService.onConnectionChange((connected) => {
      if (!connected && initialized) {
        setError('Lost connection to server. Reconnecting...');
      } else if (connected && error) {
        setError(null);
        refreshStrategies();
      }
    });

    // Strategy created event
    const createdCleanup = strategyService.addListener(TRADING_EVENTS.STRATEGY_CREATED, (data: Strategy) => {
      setStrategies(prev => [...prev, data]);
    });

    // Strategy updated event
    const updatedCleanup = strategyService.addListener(TRADING_EVENTS.STRATEGY_UPDATED, (data: Strategy) => {
      setStrategies(prev => prev.map(strategy => 
        strategy.id === data.id ? { ...strategy, ...data } : strategy
      ));
    });

    // Strategy deleted event
    const deletedCleanup = strategyService.addListener(TRADING_EVENTS.STRATEGY_DELETED, (data: {id: string}) => {
      setStrategies(prev => prev.filter(strategy => strategy.id !== data.id));
    });

    // Strategy status changed event
    const statusChangedCleanup = strategyService.addListener(TRADING_EVENTS.STRATEGY_STATUS_CHANGED, (data: {id: string, status: 'active' | 'paused' | 'inactive'}) => {
      setStrategies(prev => prev.map(strategy => 
        strategy.id === data.id ? { ...strategy, status: data.status } : strategy
      ));
    });

    // Strategy performance update event
    const performanceUpdateCleanup = strategyService.addListener(TRADING_EVENTS.STRATEGY_PERFORMANCE_UPDATE, (data: {id: string, performance: string}) => {
      setStrategies(prev => prev.map(strategy => 
        strategy.id === data.id ? { ...strategy, performance: data.performance } : strategy
      ));
    });

    // Initial fetch of strategies
    fetchStrategies();

    // Cleanup listeners on unmount
    return () => {
      connectionCleanup();
      createdCleanup();
      updatedCleanup();
      deletedCleanup();
      statusChangedCleanup();
      performanceUpdateCleanup();
    };
  }, [initialized, error, refreshStrategies, fetchStrategies]);

  return {
    strategies,
    loading,
    error,
    refreshStrategies,
    createStrategy,
    updateStrategy,
    deleteStrategy,
    changeStrategyStatus,
  };
}
