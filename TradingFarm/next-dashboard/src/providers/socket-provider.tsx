'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';

interface SocketContextType {
  isConnected: boolean;
  sendMessage: (message: any) => void;
  lastMessage: any;
  connect: () => void;
  disconnect: () => void;
}

const SocketContext = createContext<SocketContextType>({
  isConnected: false,
  sendMessage: () => { },
  lastMessage: null,
  connect: () => { },
  disconnect: () => { }
});

export const useSocket = () => useContext(SocketContext);

interface SocketProviderProps {
  children: React.ReactNode;
}

export function SocketProvider({ children }: SocketProviderProps) {
  const [socket, setSocket] = useState<WebSocket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [lastMessage, setLastMessage] = useState<any>(null);
  const [reconnectTimeout, setReconnectTimeout] = useState<NodeJS.Timeout | null>(null);
  const [reconnectAttempts, setReconnectAttempts] = useState(0);
  const maxReconnectAttempts = 5;
  const reconnectDelay = 3000; // 3 seconds
  
  const getWebSocketUrl = () => {
    // Try to get the WebSocket URL from environment variable
    const wsUrl = process.env.NEXT_PUBLIC_GRAPHQL_WS_URL || process.env.NEXT_PUBLIC_WS_URL;
    
    if (wsUrl) {
      return wsUrl;
    }
    
    // Fallback to derived URL based on current host
    const isSecure = window.location.protocol === 'https:';
    const protocol = isSecure ? 'wss:' : 'ws:';
    const host = window.location.host;
    
    return `${protocol}//${host}/api/ws`;
  };
  
  const createSocketConnection = () => {
    try {
      const wsUrl = getWebSocketUrl();
      console.log(`Connecting to WebSocket at ${wsUrl}`);
      
      const ws = new WebSocket(wsUrl);
      setSocket(ws);
      
      ws.onopen = () => {
        console.log('WebSocket connected');
        setIsConnected(true);
        setReconnectAttempts(0);
        
        // Send authentication if needed
        if (typeof window !== 'undefined') {
          // Get auth token from localStorage if available
          const token = localStorage.getItem('auth_token');
          if (token) {
            ws.send(JSON.stringify({ type: 'auth', token }));
          }
        }
      };
      
      ws.onclose = (event) => {
        console.log(`WebSocket disconnected: ${event.code} ${event.reason}`);
        setIsConnected(false);
        
        // Try to reconnect if not a normal closure and we haven't exceeded max attempts
        if (event.code !== 1000 && reconnectAttempts < maxReconnectAttempts) {
          const timeout = setTimeout(() => {
            console.log(`Attempting to reconnect (${reconnectAttempts + 1}/${maxReconnectAttempts})...`);
            setReconnectAttempts(prev => prev + 1);
            createSocketConnection();
          }, reconnectDelay);
          
          setReconnectTimeout(timeout);
        }
      };
      
      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
      };
      
      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log('WebSocket message received:', data);
          setLastMessage(data);
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };
      
    } catch (error) {
      console.error('Error creating WebSocket connection:', error);
    }
  };
  
  const connect = () => {
    if (!socket || socket.readyState === WebSocket.CLOSED) {
      createSocketConnection();
    }
  };
  
  const disconnect = () => {
    if (socket) {
      // Use code 1000 for normal closure
      socket.close(1000, 'User initiated disconnect');
    }
    
    if (reconnectTimeout) {
      clearTimeout(reconnectTimeout);
      setReconnectTimeout(null);
    }
    
    setIsConnected(false);
  };
  
  const sendMessage = (message: any) => {
    if (socket && isConnected) {
      socket.send(typeof message === 'string' ? message : JSON.stringify(message));
    } else {
      console.warn('Cannot send message: WebSocket not connected');
    }
  };
  
  // Connect on component mount and cleanup on unmount
  useEffect(() => {
    // Auto-connect
    connect();
    
    // Cleanup on unmount
    return () => {
      disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  
  return (
    <SocketContext.Provider value={{ isConnected, sendMessage, lastMessage, connect, disconnect }}>
      {children}
    </SocketContext.Provider>
  );
}
