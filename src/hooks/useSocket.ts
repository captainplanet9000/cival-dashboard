import { useState, useEffect, useCallback } from 'react';
import { socketService } from '../services/api/socket-service';

/**
 * Hook for managing socket connection and events
 */
export function useSocket() {
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Connect to socket
  const connect = useCallback(async (token?: string) => {
    try {
      setError(null);
      const connected = await socketService.connect(token);
      setIsConnected(connected);
      return connected;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to connect to server';
      setError(errorMessage);
      setIsConnected(false);
      return false;
    }
  }, []);

  // Disconnect from socket
  const disconnect = useCallback(() => {
    socketService.disconnect();
    setIsConnected(false);
  }, []);

  // Emit an event
  const emit = useCallback((event: string, data?: any) => {
    return socketService.emit(event, data);
  }, []);

  // Subscribe to an event
  const subscribe = useCallback((event: string, callback: (data: any) => void) => {
    return socketService.on(event, callback);
  }, []);

  // Join a room
  const joinRoom = useCallback((room: string) => {
    socketService.joinRoom(room);
  }, []);

  // Leave a room
  const leaveRoom = useCallback((room: string) => {
    socketService.leaveRoom(room);
  }, []);

  // Subscribe to strategy updates
  const subscribeToStrategy = useCallback((strategyId: string, callback: (data: any) => void) => {
    socketService.joinStrategyRoom(strategyId);
    return socketService.onStrategyUpdate(callback);
  }, []);

  // Subscribe to farm updates
  const subscribeToFarm = useCallback((farmId: string, callback: (data: any) => void) => {
    socketService.joinFarmRoom(farmId);
    return socketService.onFarmUpdate(callback);
  }, []);

  // Subscribe to agent updates
  const subscribeToAgent = useCallback((agentId: string, callback: (data: any) => void) => {
    socketService.joinAgentRoom(agentId);
    return socketService.onAgentUpdate(callback);
  }, []);

  // Subscribe to execution updates
  const subscribeToExecutions = useCallback((callback: (data: any) => void) => {
    return socketService.onExecutionUpdate(callback);
  }, []);

  // Disconnect on component unmount
  useEffect(() => {
    return () => {
      disconnect();
    };
  }, [disconnect]);

  return {
    isConnected,
    error,
    connect,
    disconnect,
    emit,
    subscribe,
    joinRoom,
    leaveRoom,
    subscribeToStrategy,
    subscribeToFarm,
    subscribeToAgent,
    subscribeToExecutions
  };
}

/**
 * Hook for managing realtime updates for a specific strategy
 */
export function useStrategySocket(strategyId: string | null) {
  const { isConnected, connect, subscribeToStrategy } = useSocket();
  const [updates, setUpdates] = useState<any[]>([]);

  // Connect and subscribe to strategy updates
  useEffect(() => {
    if (strategyId) {
      // Connect if not already connected
      if (!isConnected) {
        connect();
      }

      // Subscribe to strategy updates
      const unsubscribe = subscribeToStrategy(strategyId, (data) => {
        setUpdates(prev => [data, ...prev].slice(0, 100)); // Keep last 100 updates
      });

      return () => {
        unsubscribe();
      };
    }
  }, [strategyId, isConnected, connect, subscribeToStrategy]);

  return {
    updates,
    isConnected
  };
}

/**
 * Hook for managing realtime updates for a specific farm
 */
export function useFarmSocket(farmId: string | null) {
  const { isConnected, connect, subscribeToFarm } = useSocket();
  const [updates, setUpdates] = useState<any[]>([]);

  // Connect and subscribe to farm updates
  useEffect(() => {
    if (farmId) {
      // Connect if not already connected
      if (!isConnected) {
        connect();
      }

      // Subscribe to farm updates
      const unsubscribe = subscribeToFarm(farmId, (data) => {
        setUpdates(prev => [data, ...prev].slice(0, 100)); // Keep last 100 updates
      });

      return () => {
        unsubscribe();
      };
    }
  }, [farmId, isConnected, connect, subscribeToFarm]);

  return {
    updates,
    isConnected
  };
}

/**
 * Hook for managing realtime updates for a specific agent
 */
export function useAgentSocket(agentId: string | null) {
  const { isConnected, connect, subscribeToAgent } = useSocket();
  const [updates, setUpdates] = useState<any[]>([]);

  // Connect and subscribe to agent updates
  useEffect(() => {
    if (agentId) {
      // Connect if not already connected
      if (!isConnected) {
        connect();
      }

      // Subscribe to agent updates
      const unsubscribe = subscribeToAgent(agentId, (data) => {
        setUpdates(prev => [data, ...prev].slice(0, 100)); // Keep last 100 updates
      });

      return () => {
        unsubscribe();
      };
    }
  }, [agentId, isConnected, connect, subscribeToAgent]);

  return {
    updates,
    isConnected
  };
}

/**
 * Hook for managing realtime updates for executions
 */
export function useExecutionSocket() {
  const { isConnected, connect, subscribeToExecutions } = useSocket();
  const [updates, setUpdates] = useState<any[]>([]);

  // Connect and subscribe to execution updates
  useEffect(() => {
    // Connect if not already connected
    if (!isConnected) {
      connect();
    }

    // Subscribe to execution updates
    const unsubscribe = subscribeToExecutions((data) => {
      setUpdates(prev => [data, ...prev].slice(0, 100)); // Keep last 100 updates
    });

    return () => {
      unsubscribe();
    };
  }, [isConnected, connect, subscribeToExecutions]);

  return {
    updates,
    isConnected
  };
} 