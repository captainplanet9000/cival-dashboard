import { useEffect, useRef, useState, useCallback } from 'react';
import { MonitoringService } from '../services/monitoring-service';

export interface WebSocketConfig {
  url: string;
  reconnectInterval?: number;
  maxReconnectAttempts?: number;
  pingInterval?: number;
  protocols?: string | string[];
  onOpen?: (event: WebSocketEventMap['open']) => void;
  onClose?: (event: WebSocketEventMap['close']) => void;
  onMessage?: (event: WebSocketEventMap['message']) => void;
  onError?: (event: WebSocketEventMap['error']) => void;
}

export type WebSocketStatus = 'CONNECTING' | 'OPEN' | 'CLOSING' | 'CLOSED' | 'RECONNECTING';

/**
 * Hook for managing WebSocket connections with automatic reconnection
 * 
 * @param config WebSocket configuration
 * @returns WebSocket utilities and state
 */
export function useWebSocket(config: WebSocketConfig) {
  const {
    url,
    reconnectInterval = 2000,
    maxReconnectAttempts = 5,
    pingInterval = 30000,
    protocols,
    onOpen,
    onClose,
    onMessage,
    onError,
  } = config;

  // WebSocket connection reference
  const ws = useRef<WebSocket | null>(null);
  
  // Track WebSocket status
  const [status, setStatus] = useState<WebSocketStatus>('CLOSED');
  
  // Track reconnection attempts
  const reconnectCount = useRef(0);
  
  // Track ping/pong for connection health
  const lastPong = useRef<number>(Date.now());
  
  // Ping interval reference
  const pingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  
  // Reconnect timeout reference
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  /**
   * Connect to WebSocket
   */
  const connect = useCallback(() => {
    // Clear any existing connection
    if (ws.current) {
      ws.current.close();
    }
    
    // Update status
    setStatus('CONNECTING');
    
    try {
      // Create new WebSocket connection
      ws.current = new WebSocket(url, protocols);
      
      // Connection opened
      ws.current.onopen = (event) => {
        setStatus('OPEN');
        reconnectCount.current = 0;
        lastPong.current = Date.now();
        
        // Start ping interval
        if (pingInterval > 0) {
          pingIntervalRef.current = setInterval(() => {
            // Check connection health
            if (Date.now() - lastPong.current > pingInterval * 2) {
              MonitoringService.logEvent({
                type: 'warning',
                message: 'WebSocket connection appears unresponsive, reconnecting',
                data: { lastPong: lastPong.current }
              });
              
              // Force reconnection
              reconnect();
              return;
            }
            
            // Send ping if connection is open
            if (ws.current && ws.current.readyState === WebSocket.OPEN) {
              // Send ping message
              sendMessage({ type: 'ping', timestamp: Date.now() });
            }
          }, pingInterval);
        }
        
        // Call onOpen callback if provided
        if (onOpen) {
          onOpen(event);
        }
        
        MonitoringService.logEvent({
          type: 'info',
          message: 'WebSocket connection established',
          data: { url }
        });
      };
      
      // Connection closed
      ws.current.onclose = (event) => {
        setStatus('CLOSED');
        
        // Clear ping interval
        if (pingIntervalRef.current) {
          clearInterval(pingIntervalRef.current);
          pingIntervalRef.current = null;
        }
        
        // Call onClose callback if provided
        if (onClose) {
          onClose(event);
        }
        
        MonitoringService.logEvent({
          type: 'info',
          message: 'WebSocket connection closed',
          data: { code: event.code, reason: event.reason }
        });
        
        // Attempt reconnection if not intentionally closed
        if (event.code !== 1000) {
          attemptReconnect();
        }
      };
      
      // Message received
      ws.current.onmessage = (event) => {
        try {
          // Parse message data
          const data = JSON.parse(event.data);
          
          // Handle pong response for connection health
          if (data.type === 'pong') {
            lastPong.current = Date.now();
            return;
          }
          
          // Call onMessage callback if provided
          if (onMessage) {
            onMessage(event);
          }
        } catch (error) {
          MonitoringService.logEvent({
            type: 'error',
            message: 'Error processing WebSocket message',
            data: { error, data: event.data }
          });
        }
      };
      
      // Connection error
      ws.current.onerror = (event) => {
        // Call onError callback if provided
        if (onError) {
          onError(event);
        }
        
        MonitoringService.logEvent({
          type: 'error',
          message: 'WebSocket connection error',
          data: { url }
        });
      };
    } catch (error) {
      MonitoringService.logEvent({
        type: 'error',
        message: 'Failed to create WebSocket connection',
        data: { error, url }
      });
      
      // Attempt reconnection
      attemptReconnect();
    }
  }, [url, protocols, pingInterval, onOpen, onClose, onMessage, onError]);
  
  /**
   * Reconnect WebSocket
   */
  const reconnect = useCallback(() => {
    // Clear existing connection and timeout
    if (ws.current) {
      ws.current.close();
    }
    
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    
    // Attempt reconnection
    attemptReconnect();
  }, []);
  
  /**
   * Attempt to reconnect with backoff
   */
  const attemptReconnect = useCallback(() => {
    // Check if max attempts reached
    if (reconnectCount.current >= maxReconnectAttempts) {
      MonitoringService.logEvent({
        type: 'error',
        message: 'Max WebSocket reconnection attempts reached',
        data: { attempts: reconnectCount.current, maxAttempts: maxReconnectAttempts }
      });
      return;
    }
    
    // Update status and increment attempt counter
    setStatus('RECONNECTING');
    reconnectCount.current += 1;
    
    // Calculate backoff delay using exponential backoff
    const delay = reconnectInterval * Math.pow(1.5, reconnectCount.current - 1);
    
    MonitoringService.logEvent({
      type: 'info',
      message: 'Attempting WebSocket reconnection',
      data: { attempt: reconnectCount.current, delay }
    });
    
    // Schedule reconnection
    reconnectTimeoutRef.current = setTimeout(() => {
      connect();
    }, delay);
  }, [connect, reconnectInterval, maxReconnectAttempts]);
  
  /**
   * Send a message through the WebSocket
   * 
   * @param data Data to send
   * @returns True if sent successfully, false otherwise
   */
  const sendMessage = useCallback((data: any): boolean => {
    if (!ws.current || ws.current.readyState !== WebSocket.OPEN) {
      MonitoringService.logEvent({
        type: 'warning',
        message: 'Attempted to send message on closed WebSocket',
        data: { readyState: ws.current?.readyState }
      });
      return false;
    }
    
    try {
      const message = typeof data === 'string' ? data : JSON.stringify(data);
      ws.current.send(message);
      return true;
    } catch (error) {
      MonitoringService.logEvent({
        type: 'error',
        message: 'Error sending WebSocket message',
        data: { error }
      });
      return false;
    }
  }, []);
  
  /**
   * Manually close the WebSocket connection
   */
  const disconnect = useCallback(() => {
    // Clear ping interval
    if (pingIntervalRef.current) {
      clearInterval(pingIntervalRef.current);
      pingIntervalRef.current = null;
    }
    
    // Clear reconnect timeout
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    
    // Close connection
    if (ws.current) {
      ws.current.close(1000, 'Manual disconnection');
      ws.current = null;
    }
    
    setStatus('CLOSED');
  }, []);
  
  // Set up connection when component mounts
  useEffect(() => {
    connect();
    
    // Clean up on unmount
    return () => {
      disconnect();
    };
  }, [connect, disconnect]);
  
  return {
    status,
    sendMessage,
    reconnect,
    disconnect,
    reconnectCount: reconnectCount.current
  };
} 