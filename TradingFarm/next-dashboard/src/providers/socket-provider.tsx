'use client';

import * as React from 'react';
import io from 'socket.io-client';

interface SocketContextType {
  socket: any | null;
  isConnected: boolean;
  latestMessages: {
    [key: string]: any;
  };
  messages: any[];
  send: (event: string, data: any) => void;
  subscribe: (room: string) => void;
  unsubscribe: (room: string) => void;
}

const SocketContext = React.createContext<SocketContextType>({
  socket: null,
  isConnected: false,
  latestMessages: {},
  messages: [],
  send: () => {},
  subscribe: () => {},
  unsubscribe: () => {}
});

export const useSocket = () => React.useContext(SocketContext);

export interface SocketProviderProps {
  children: React.ReactNode;
  farmId?: string;
  userId?: string;
  enableLogging?: boolean;
}

export function SocketProvider({ 
  children,
  farmId,
  userId,
  enableLogging = false
}: SocketProviderProps) {
  const [socket, setSocket] = React.useState<any | null>(null);
  const [isConnected, setIsConnected] = React.useState(false);
  const [socketUrl, setSocketUrl] = React.useState<string | null>(null);
  const [socketEnabled, setSocketEnabled] = React.useState<boolean>(false);
  const [mockModeEnabled, setMockModeEnabled] = React.useState<boolean>(true);
  const [messages, setMessages] = React.useState<any[]>([]);
  const [latestMessages, setLatestMessages] = React.useState<{[key: string]: any}>({});
  
  // Fetch the socket URL and configuration from the API
  React.useEffect(() => {
    const fetchConfig = async () => {
      try {
        // Fetch all configuration at once to reduce API calls
        const response = await fetch('/api/config');
        
        if (!response.ok) {
          if (enableLogging) console.log('Failed to fetch socket configuration, using defaults');
          setSocketUrl('http://localhost:3002');
          setSocketEnabled(false);
          setMockModeEnabled(true);
          return;
        }
        
        const config = await response.json();
        
        if (enableLogging) console.log('Socket config:', config);
        
        // Set the socket URL
        setSocketUrl(config.socket_io_url || 'http://localhost:3002');
        
        // Check if socket is enabled
        setSocketEnabled(config.socket_enabled === 'true');
        
        // Check if mock mode is enabled
        setMockModeEnabled(
          config.mock_api_enabled === 'true' || 
          config.force_mock_mode === 'true'
        );
      } catch (error) {
        if (enableLogging) console.error('Error fetching socket config:', error);
        setSocketUrl('http://localhost:3002');
        setSocketEnabled(false);
        setMockModeEnabled(true);
      }
    };
    
    fetchConfig();
  }, [enableLogging]);
  
  // Connect to the socket when the URL is available
  React.useEffect(() => {
    // Skip socket connection if socket is disabled or mock mode is enabled
    if (!socketUrl || !socketEnabled || mockModeEnabled) {
      if (enableLogging) {
        console.log('Socket connection skipped:', {
          socketUrl,
          socketEnabled,
          mockModeEnabled
        });
      }
      return;
    }
    
    if (enableLogging) console.log(`Connecting to socket at ${socketUrl}`);
    
    try {
      const socketInstance = io(socketUrl, {
        reconnectionAttempts: 3,
        reconnectionDelay: 1000,
        autoConnect: true,
        forceNew: true,
        query: {
          farmId,
          userId
        }
      });
      
      socketInstance.on('connect', () => {
        if (enableLogging) console.log('Socket connected');
        setIsConnected(true);
      });
      
      socketInstance.on('disconnect', () => {
        if (enableLogging) console.log('Socket disconnected');
        setIsConnected(false);
      });
      
      socketInstance.on('error', (error) => {
        if (enableLogging) console.error('Socket error:', error);
      });
      
      // Listen for all messages using a more compatible approach
      const messageTypes = [
        'ORDER_UPDATE', 
        'PRICE_ALERT', 
        'EXECUTION_NOTIFICATION',
        'COMMAND_RESPONSE',
        'KNOWLEDGE_RESPONSE'
      ];
      
      messageTypes.forEach(type => {
        socketInstance.on(type, (data) => {
          // Store latest message by event type
          setLatestMessages(prev => ({
            ...prev,
            [type]: data
          }));
          
          // Add to messages history
          setMessages(prev => [
            ...prev, 
            { event: type, data, timestamp: new Date().toISOString() }
          ]);
          
          if (enableLogging) console.log(`Socket event: ${type}`, data);
        });
      });
      
      setSocket(socketInstance);
      
      // Cleanup on unmount
      return () => {
        if (enableLogging) console.log('Disconnecting socket');
        messageTypes.forEach(type => {
          socketInstance.off(type);
        });
        socketInstance.disconnect();
      };
    } catch (error) {
      console.error("Error initializing socket:", error);
      return () => {};
    }
  }, [socketUrl, socketEnabled, mockModeEnabled, farmId, userId, enableLogging]);
  
  // Define socket event handlers
  const send = React.useCallback((event: string, data: any) => {
    if (socket && isConnected) {
      if (enableLogging) console.log(`Sending event: ${event}`, data);
      socket.emit(event, data);
    } else if (enableLogging) {
      console.log(`Failed to send event: ${event} - socket disconnected`);
    }
  }, [socket, isConnected, enableLogging]);
  
  const subscribe = React.useCallback((room: string) => {
    if (socket && isConnected) {
      if (enableLogging) console.log(`Subscribing to room: ${room}`);
      socket.emit('subscribe', { room });
    } else if (enableLogging) {
      console.log(`Failed to subscribe to room: ${room} - socket disconnected`);
    }
  }, [socket, isConnected, enableLogging]);
  
  const unsubscribe = React.useCallback((room: string) => {
    if (socket && isConnected) {
      if (enableLogging) console.log(`Unsubscribing from room: ${room}`);
      socket.emit('unsubscribe', { room });
    } else if (enableLogging) {
      console.log(`Failed to unsubscribe from room: ${room} - socket disconnected`);
    }
  }, [socket, isConnected, enableLogging]);
  
  const value = {
    socket,
    isConnected,
    latestMessages,
    messages,
    send,
    subscribe,
    unsubscribe
  };
  
  return (
    <SocketContext.Provider value={value}>
      {children}
    </SocketContext.Provider>
  );
}
