"use client";

import { useEffect, useRef, useState, useCallback } from 'react';
import { useToast } from '@/components/ui/use-toast';
import { createBrowserClient } from '@/utils/supabase/client';
import { v4 as uuidv4 } from 'uuid';
import { WebSocketStatus } from '@/types/database.types';

interface WebSocketManagerOptions {
  url: string;
  onMessage?: (event: MessageEvent) => void;
  onOpen?: (event: Event) => void;
  onClose?: (event: CloseEvent) => void;
  onError?: (event: Event) => void;
  autoReconnect?: boolean;
  reconnectInterval?: number;
  maxReconnectAttempts?: number;
}

interface WebSocketManagerState {
  connectionId: string;
  status: WebSocketStatus;
  lastMessage: any | null;
  error: Error | null;
  reconnectAttempts: number;
}

/**
 * Hook for managing WebSocket connections with Supabase integration
 * Uses the WebSocket connection manager function to track connection status
 */
export function useWebSocketManager(options: WebSocketManagerOptions) {
  const {
    url,
    onMessage,
    onOpen,
    onClose,
    onError,
    autoReconnect = true,
    reconnectInterval = 5000,
    maxReconnectAttempts = 5
  } = options;

  const { toast } = useToast();
  const supabase = createBrowserClient();
  const socketRef = useRef<WebSocket | null>(null);
  const connectionIdRef = useRef<string>(uuidv4());
  
  const [state, setState] = useState<WebSocketManagerState>({
    connectionId: connectionIdRef.current,
    status: 'disconnected',
    lastMessage: null,
    error: null,
    reconnectAttempts: 0
  });

  // Function to update connection status in Supabase
  const updateConnectionStatus = useCallback(async (
    status: WebSocketStatus, 
    errorMessage?: string
  ) => {
    try {
      const clientInfo = {
        userAgent: navigator.userAgent,
        url: window.location.href,
        timestamp: new Date().toISOString()
      };

      const { data, error } = await supabase.rpc('manage_websocket_connection', {
        p_connection_id: connectionIdRef.current,
        p_status: status,
        p_client_info: clientInfo,
        p_error_message: errorMessage
      });

      if (error) {
        console.error('Failed to update WebSocket connection status:', error);
      }
    } catch (err) {
      console.error('Error in updateConnectionStatus:', err);
    }
  }, [supabase]);

  // Connect function
  const connect = useCallback(() => {
    if (socketRef.current?.readyState === WebSocket.OPEN) return;

    try {
      const socket = new WebSocket(url);
      socketRef.current = socket;

      socket.onopen = (event) => {
        setState(prev => ({ 
          ...prev, 
          status: 'connected', 
          error: null,
          reconnectAttempts: 0
        }));
        updateConnectionStatus('connected');
        if (onOpen) onOpen(event);
      };

      socket.onmessage = (event) => {
        setState(prev => ({ ...prev, lastMessage: JSON.parse(event.data) }));
        if (onMessage) onMessage(event);
      };

      socket.onclose = (event) => {
        setState(prev => ({ ...prev, status: 'disconnected' }));
        updateConnectionStatus('disconnected');
        if (onClose) onClose(event);

        // Handle reconnection
        if (autoReconnect && state.reconnectAttempts < maxReconnectAttempts) {
          setTimeout(() => {
            setState(prev => ({ 
              ...prev, 
              reconnectAttempts: prev.reconnectAttempts + 1 
            }));
            connect();
          }, reconnectInterval);
        } else if (state.reconnectAttempts >= maxReconnectAttempts) {
          toast({
            variant: 'destructive',
            title: 'Connection failed',
            description: `Failed to connect after ${maxReconnectAttempts} attempts`
          });
        }
      };

      socket.onerror = (event) => {
        const errorMsg = 'WebSocket connection error';
        setState(prev => ({ 
          ...prev, 
          status: 'error', 
          error: new Error(errorMsg)
        }));
        updateConnectionStatus('error', errorMsg);
        if (onError) onError(event);
      };
    } catch (error: any) {
      setState(prev => ({ 
        ...prev, 
        status: 'error', 
        error: error instanceof Error ? error : new Error(error.toString())
      }));
      updateConnectionStatus('error', error.message);
      toast({
        variant: 'destructive',
        title: 'Connection error',
        description: error.message || 'Failed to establish WebSocket connection'
      });
    }
  }, [
    url, 
    onMessage, 
    onOpen, 
    onClose, 
    onError, 
    updateConnectionStatus,
    toast,
    autoReconnect,
    maxReconnectAttempts,
    reconnectInterval,
    state.reconnectAttempts
  ]);

  // Disconnect function
  const disconnect = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.close();
      socketRef.current = null;
      updateConnectionStatus('disconnected');
    }
  }, [updateConnectionStatus]);

  // Send message function
  const sendMessage = useCallback((data: any) => {
    if (socketRef.current?.readyState === WebSocket.OPEN) {
      socketRef.current.send(typeof data === 'string' ? data : JSON.stringify(data));
      return true;
    }
    return false;
  }, []);

  // Connect on mount, disconnect on unmount
  useEffect(() => {
    connect();

    return () => {
      disconnect();
    };
  }, [connect, disconnect]);

  return {
    state,
    connect,
    disconnect,
    sendMessage
  };
}
