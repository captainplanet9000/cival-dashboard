import { useState, useEffect, useCallback } from 'react';
import { FarmPerformanceService, PerformanceMetrics, Trade } from '@/services/farm/farm-performance-service';
import { FarmRealtimeService } from '@/services/farm/farm-realtime-service';

interface UseFarmPerformanceOptions {
  supabaseUrl: string;
  supabaseKey: string;
  farmId: string;
  refreshInterval?: number;
}

interface UseFarmPerformanceReturn {
  metrics: PerformanceMetrics | null;
  isLoading: boolean;
  error: string | null;
  recordTrade: (trade: Trade) => Promise<{ success: boolean; error?: string }>;
  refreshMetrics: (options?: {
    startTime?: string;
    endTime?: string;
    strategyId?: string;
    symbol?: string;
  }) => Promise<void>;
}

export function useFarmPerformance({
  supabaseUrl,
  supabaseKey,
  farmId,
  refreshInterval = 60000 // Default to 1 minute
}: UseFarmPerformanceOptions): UseFarmPerformanceReturn {
  const [metrics, setMetrics] = useState<PerformanceMetrics | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const farmPerformanceService = new FarmPerformanceService(supabaseUrl, supabaseKey);
  const farmRealtimeService = new FarmRealtimeService(supabaseUrl, supabaseKey);

  const refreshMetrics = useCallback(async (options?: {
    startTime?: string;
    endTime?: string;
    strategyId?: string;
    symbol?: string;
  }) => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await farmPerformanceService.getPerformanceMetrics(
        farmId,
        options?.startTime,
        options?.endTime,
        options?.strategyId,
        options?.symbol
      );

      if (result.success && result.data) {
        setMetrics(result.data);
      } else {
        setError(result.error || 'Failed to fetch performance metrics');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  }, [farmId, farmPerformanceService]);

  const recordTrade = async (trade: Trade) => {
    try {
      const result = await farmPerformanceService.recordTrade(trade);
      if (result.success) {
        await refreshMetrics();
      }
      return result;
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Failed to record trade'
      };
    }
  };

  useEffect(() => {
    refreshMetrics();

    // Set up real-time subscriptions
    const unsubscribeTrades = farmRealtimeService.subscribeFarmTrades(farmId, {
      onInsert: () => refreshMetrics(),
      onUpdate: () => refreshMetrics(),
      onDelete: () => refreshMetrics(),
      onError: (err) => setError(err instanceof Error ? err.message : 'Subscription error')
    });

    const unsubscribePerformance = farmRealtimeService.subscribeFarmPerformance(farmId, {
      onInsert: (newMetrics) => setMetrics(newMetrics),
      onUpdate: (_, newMetrics) => setMetrics(newMetrics),
      onError: (err) => setError(err instanceof Error ? err.message : 'Subscription error')
    });

    // Set up periodic refresh as a fallback
    const intervalId = setInterval(refreshMetrics, refreshInterval);

    return () => {
      clearInterval(intervalId);
      unsubscribeTrades();
      unsubscribePerformance();
    };
  }, [farmId, refreshInterval, refreshMetrics, farmRealtimeService]);

  return {
    metrics,
    isLoading,
    error,
    recordTrade,
    refreshMetrics
  };
} 