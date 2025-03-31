'use client';

import * as React from 'react';
import { io, type Socket } from 'socket.io-client';

interface SocketContextType {
  socket: Socket | null;
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
}

export function SocketProvider({ 
  children,
  farmId,
  userId
}: SocketProviderProps) {
  const [socket, setSocket] = React.useState<Socket | null>(null);
  const [isConnected, setIsConnected] = React.useState(false);
  const [socketUrl, setSocketUrl] = React.useState<string | null>(null);
  const [messages, setMessages] = React.useState<any[]>([]);
  const [latestMessages, setLatestMessages] = React.useState<{[key: string]: any}>({});
  
  // Fetch the socket URL from the API
  React.useEffect(() => {
    const fetchSocketUrl = async () => {
      try {
        const response = await fetch('/api/config?key=socket_io_url');
        if (!response.ok) {
          throw new Error(`Failed to fetch Socket URL: ${response.statusText}`);
        }
        
        const data = await response.json();
        // Parse the JSON string if it's stored as a string in the database
        const url = typeof data.value === 'string' && data.value.startsWith('"') 
          ? JSON.parse(data.value) 
          : data.value;
          
        setSocketUrl(url);
      } catch (error: any) {
        console.error('Error getting Socket URL:', error);
        // Fallback to default URL
        setSocketUrl('http://localhost:3002');
      }
    };
    
    fetchSocketUrl();
  }, []);
  
  // Initialize socket connection when URL is available
  React.useEffect(() => {
    if (!socketUrl) return;
    
    try {
      // @ts-ignore - Ignoring the type issue with Socket.io
      const socketInstance = io(socketUrl, {
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
        autoConnect: true,
        query: userId ? { userId } : undefined
      });
      
      socketInstance.on('connect', () => {
        console.log('Socket connected');
        setIsConnected(true);
        
        // Join farm room if farmId is provided
        if (farmId) {
          socketInstance.emit('JOIN_FARM', farmId);
          // Also join ElizaOS room for commands and knowledge queries
          socketInstance.emit('JOIN_ELIZAOS', { farmId });
        }
      });
      
      socketInstance.on('disconnect', () => {
        console.log('Socket disconnected');
        setIsConnected(false);
      });
      
      socketInstance.on('connect_error', (error: any) => {
        console.error('Connection error:', error);
        setIsConnected(false);
      });
      
      // Generic message handler that collects all messages
      const messageTypes = [
        'ORDER_UPDATE', 
        'PRICE_ALERT', 
        'EXECUTION_NOTIFICATION',
        'COMMAND_RESPONSE',
        'KNOWLEDGE_RESPONSE'
      ];
      
      messageTypes.forEach(type => {
        socketInstance.on(type, (message: any) => {
          // Update all messages
          setMessages((prev: any[]) => [...prev, { ...message, receivedAt: new Date().toISOString() }]);
          
          // Also store the latest message of each type
          setLatestMessages((prev: any) => ({
            ...prev,
            [type]: message
          }));
        });
      });
      
      setSocket(socketInstance);
      
      return () => {
        messageTypes.forEach(type => {
          socketInstance.off(type);
        });
        socketInstance.off('connect');
        socketInstance.off('disconnect');
        socketInstance.off('connect_error');
        socketInstance.disconnect();
      };
    } catch (error) {
      console.error("Error initializing socket:", error);
      return () => {};
    }
  }, [socketUrl, farmId, userId]);
  
  // Send message to the server
  const send = (event: string, data: any) => {
    if (socket && isConnected) {
      socket.emit(event, data);
    } else {
      console.error('Cannot send message: socket not connected');
    }
  };
  
  // Subscribe to a room
  const subscribe = (room: string) => {
    if (socket && isConnected) {
      console.log(`Joining room: ${room}`);
      socket.emit('join', room);
    }
  };
  
  // Unsubscribe from a room
  const unsubscribe = (room: string) => {
    if (socket && isConnected) {
      console.log(`Leaving room: ${room}`);
      socket.emit('leave', room);
    }
  };
  
  return (
    <SocketContext.Provider 
      value={{ 
        socket, 
        isConnected, 
        messages,
        latestMessages,
        send,
        subscribe,
        unsubscribe
      }}
    >
      {children}
    </SocketContext.Provider>
  );
}
