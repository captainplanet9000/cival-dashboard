import { useState, useEffect, useCallback } from 'react';
import { FarmMcpService, FarmEvent } from '@/services/farm/farm-mcp-service';

interface UseFarmEventsOptions {
  supabaseUrl: string;
  supabaseKey: string;
  farmId: string;
  eventTypes?: FarmEvent['type'][];
}

interface UseFarmEventsReturn {
  events: FarmEvent[];
  isLoading: boolean;
  error: string | null;
  broadcastEvent: (type: FarmEvent['type'], data: any) => Promise<{ success: boolean; error?: string }>;
  refreshEvents: () => Promise<void>;
}

export function useFarmEvents({
  supabaseUrl,
  supabaseKey,
  farmId,
  eventTypes
}: UseFarmEventsOptions): UseFarmEventsReturn {
  const [events, setEvents] = useState<FarmEvent[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const farmMcpService = new FarmMcpService(supabaseUrl, supabaseKey);

  const refreshEvents = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await farmMcpService.getFarmEvents(farmId);
      if (result.success && result.data) {
        setEvents(result.data);
      } else {
        setError(result.error || 'Failed to fetch farm events');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  }, [farmId, farmMcpService]);

  const broadcastEvent = async (type: FarmEvent['type'], data: any) => {
    try {
      const result = await farmMcpService.broadcastFarmEvent({
        type,
        farmId,
        data,
        timestamp: new Date().toISOString()
      });

      if (result.success) {
        await refreshEvents();
      }

      return result;
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Failed to broadcast event'
      };
    }
  };

  useEffect(() => {
    // Subscribe to farm events when the component mounts
    const setupSubscription = async () => {
      try {
        await farmMcpService.subscribeFarmEvents(farmId, eventTypes);
        await refreshEvents();
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to subscribe to farm events');
      }
    };

    setupSubscription();

    // Refresh events periodically
    const intervalId = setInterval(refreshEvents, 30000); // Every 30 seconds

    return () => {
      clearInterval(intervalId);
    };
  }, [farmId, eventTypes, farmMcpService, refreshEvents]);

  return {
    events,
    isLoading,
    error,
    broadcastEvent,
    refreshEvents
  };
} 