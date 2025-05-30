/**
 * WebSocket Hooks
 * 
 * Custom React hooks for interacting with WebSocket connections.
 * These hooks provide a unified interface for subscribing to WebSocket topics
 * and handling real-time data updates.
 */
import { useState, useEffect, useRef } from 'react';
import websocketService, { WebSocketTopic, MessageHandler } from '@/services/websocket-service';

/**
 * Hook for connecting to a WebSocket topic
 */
export function useWebSocketTopic(topic: WebSocketTopic, options?: { maxMessages?: number }) {
  const [data, setData] = useState<any[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [timestamp, setTimestamp] = useState<Date | null>(null);
  const maxMessages = options?.maxMessages || 100;

  // Use a ref to maintain the latest data without triggering effect dependencies
  const dataRef = useRef<any[]>([]);

  // Update the data and timestamp when a message is received
  const handleMessage = (message: any) => {
    // Add new message to the front of the array
    const newData = [message, ...dataRef.current];
    
    // Limit the number of messages
    if (newData.length > maxMessages) {
      newData.length = maxMessages;
    }
    
    // Update ref and state
    dataRef.current = newData;
    setData(newData);
    setTimestamp(new Date());
  };

  // Set up subscription to the WebSocket topic
  useEffect(() => {
    // Initialize WebSocket if not already done
    websocketService.initialize();
    
    // Subscribe to the topic
    websocketService.subscribe(topic, handleMessage);
    
    // Check if connected
    setIsConnected(websocketService.isConnected());
    
    // Listen for connection status changes
    const handleConnectionChange = (connected: boolean) => {
      setIsConnected(connected);
    };
    
    websocketService.onConnectionChange(handleConnectionChange);
    
    // Clean up on unmount
    return () => {
      websocketService.unsubscribe(topic, handleMessage);
      websocketService.offConnectionChange(handleConnectionChange);
    };
  }, [topic, maxMessages]);

  return {
    data,
    isConnected,
    timestamp,
    clear: () => {
      dataRef.current = [];
      setData([]);
    }
  };
}

/**
 * Hook for broadcasting messages to a WebSocket topic
 */
export function useWebSocketBroadcast() {
  // Broadcast a message to a topic
  const broadcast = (topic: WebSocketTopic, message: any) => {
    websocketService.broadcastToTopic(topic, message);
  };
  
  return { broadcast };
}

/**
 * Hook for subscribing to a specific message pattern within a WebSocket topic
 */
export function useWebSocketMessage<T = any>(
  topic: WebSocketTopic, 
  filter: (message: any) => boolean,
  options?: { maxMessages?: number }
) {
  const [messages, setMessages] = useState<T[]>([]);
  const { data, isConnected } = useWebSocketTopic(topic, options);

  // Filter messages based on the provided filter function
  useEffect(() => {
    const filteredMessages = data
      .filter(filter)
      .map(msg => msg as T);
    
    setMessages(filteredMessages);
  }, [data, filter]);

  return {
    messages,
    isConnected,
    clear: () => setMessages([])
  };
}

/**
 * Hook for getting the latest message from a WebSocket topic that matches a filter
 */
export function useLatestWebSocketMessage<T = any>(
  topic: WebSocketTopic,
  filter: (message: any) => boolean
) {
  const [message, setMessage] = useState<T | null>(null);
  const { data, isConnected } = useWebSocketTopic(topic);

  // Update the latest message when new data arrives
  useEffect(() => {
    if (data.length > 0) {
      const matchingMessage = data.find(filter);
      if (matchingMessage) {
        setMessage(matchingMessage as T);
      }
    }
  }, [data, filter]);

  return {
    message,
    isConnected,
    clear: () => setMessage(null)
  };
}

/**
 * Hook for connecting to the system WebSocket topic
 */
export function useSystemWebSocket() {
  const { data, isConnected } = useWebSocketTopic(WebSocketTopic.SYSTEM);
  const [status, setStatus] = useState<'connected' | 'disconnected' | 'connecting' | 'error'>(
    isConnected ? 'connected' : 'disconnected'
  );
  const [info, setInfo] = useState<any>(null);

  // Process system messages
  useEffect(() => {
    if (data.length > 0) {
      // Look for connection status messages
      const connectionMessage = data.find(msg => msg.type === 'connection');
      if (connectionMessage) {
        setStatus(connectionMessage.status);
        setInfo(connectionMessage);
      }
    }
  }, [data]);

  // Monitor connection status
  useEffect(() => {
    setStatus(isConnected ? 'connected' : 'disconnected');
  }, [isConnected]);

  return {
    status,
    info,
    isConnected,
    messages: data
  };
}

/**
 * Hook for handling WebSocket reconnection
 */
export function useWebSocketReconnect() {
  const { status } = useSystemWebSocket();
  const [reconnectAttempts, setReconnectAttempts] = useState(0);

  // Reconnect to the WebSocket
  const reconnect = () => {
    websocketService.reconnect();
    setReconnectAttempts(prev => prev + 1);
  };

  return {
    status,
    reconnectAttempts,
    reconnect
  };
}
