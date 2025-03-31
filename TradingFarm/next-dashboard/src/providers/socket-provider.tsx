'use client';

import React, { createContext, useContext, useEffect, useState, useRef, useCallback } from 'react';
import { useToast } from '@/components/ui/use-toast';
import { Socket, io } from 'socket.io-client';
import { usePathname } from 'next/navigation';
import { createBrowserClient } from '@/utils/supabase/client';

// Message types for Socket.io events
export type SocketMessageType = 
  | 'ORDER_UPDATE' 
  | 'POSITION_UPDATE' 
  | 'BALANCE_UPDATE' 
  | 'PRICE_ALERT'
  | 'MARKET_DATA'
  | 'EXECUTION_NOTIFICATION'
  | 'RISK_ALERT'
  | 'ELIZAOS_NOTIFICATION'
  | 'SYNC_STATUS'
  | 'COMMAND_RESPONSE'
  | 'KNOWLEDGE_RESPONSE';

// Message structure
export interface SocketMessage {
  type: SocketMessageType;
  data: any;
  timestamp: string;
  farm_id?: string;
  exchange_id?: string;
  symbol?: string;
}

// Socket provider props
interface SocketProviderProps {
  children: React.ReactNode;
  url?: string;
  enableLogging?: boolean;
  autoConnect?: boolean;
}

// Context structure
interface SocketContextType {
  isConnected: boolean;
  messages: SocketMessage[];
  latestMessages: Record<SocketMessageType, SocketMessage | null>;
  clearMessages: () => void;
  send: (event: string, data: any) => void;
  subscribe: (room: string) => void;
  unsubscribe: (room: string) => void;
  connect: () => void;
  disconnect: () => void;
  connectionStatus: 'connecting' | 'connected' | 'disconnected' | 'error';
  subscribedRooms: string[];
  lastActivity: Date | null;
  socket: Socket | null;
  stats: {
    messagesReceived: number;
    messagesSent: number;
    connectionStartTime: Date | null;
  };
}

// Create context with default values
const SocketContext = createContext<SocketContextType>({
  isConnected: false,
  messages: [],
  latestMessages: {},
  clearMessages: () => {},
  send: () => {},
  subscribe: () => {},
  unsubscribe: () => {},
  connect: () => {},
  disconnect: () => {},
  connectionStatus: 'disconnected',
  subscribedRooms: [],
  lastActivity: null,
  socket: null,
  stats: {
    messagesReceived: 0,
    messagesSent: 0,
    connectionStartTime: null,
  },
});

export const SocketProvider: React.FC<SocketProviderProps> = ({
  children,
  url,
  enableLogging = false,
  autoConnect = true,
}) => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected' | 'error'>('disconnected');
  const [messages, setMessages] = useState<SocketMessage[]>([]);
  const [latestMessages, setLatestMessages] = useState<Record<SocketMessageType, SocketMessage | null>>({} as Record<SocketMessageType, SocketMessage | null>);
  const [subscribedRooms, setSubscribedRooms] = useState<string[]>([]);
  const [lastActivity, setLastActivity] = useState<Date | null>(null);
  const [stats, setStats] = useState({
    messagesReceived: 0,
    messagesSent: 0,
    connectionStartTime: null as Date | null,
  });
  
  const socketRef = useRef<Socket | null>(null);
  const { toast } = useToast();
  const pathname = usePathname();
  const supabase = createBrowserClient();
  
  // Get Socket.io URL
  const getSocketUrl = useCallback(async () => {
    if (url) return url;
    
    try {
      // Get Socket URL from environment or from database
      const { data: config, error } = await supabase
        .from('config')
        .select('socket_url')
        .eq('is_active', true)
        .single();
      
      if (error) {
        console.error('Error getting Socket URL:', error);
        return process.env.NEXT_PUBLIC_SOCKET_URL || 'https://api.tradingfarm.io';
      }
      
      return config.socket_url || process.env.NEXT_PUBLIC_SOCKET_URL || 'https://api.tradingfarm.io';
    } catch (error) {
      console.error('Error getting Socket URL:', error);
      return process.env.NEXT_PUBLIC_SOCKET_URL || 'https://api.tradingfarm.io';
    }
  }, [url, supabase]);
  
  // Connect to Socket.io server
  const connectSocket = useCallback(async () => {
    // Clean up existing connection
    if (socketRef.current) {
      socketRef.current.disconnect();
    }
    
    try {
      const socketUrl = await getSocketUrl();
      setConnectionStatus('connecting');
      
      // Get auth token for socket authentication
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      
      // Initialize Socket.io with options
      const socketInstance = io(socketUrl, {
        transports: ['websocket', 'polling'],
        autoConnect: false,
        reconnection: true,
        reconnectionAttempts: 10,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 10000,
        timeout: 20000,
        auth: token ? { token } : undefined,
      });
      
      // Setup event listeners
      socketInstance.on('connect', () => {
        if (enableLogging) {
          console.log('Socket.io connection established');
        }
        
        setIsConnected(true);
        setConnectionStatus('connected');
        setStats(prev => ({
          ...prev,
          connectionStartTime: new Date(),
        }));
        
        // Restore room subscriptions
        subscribedRooms.forEach(room => {
          socketInstance.emit('join', room);
        });
      });
      
      socketInstance.on('disconnect', (reason) => {
        if (enableLogging) {
          console.log(`Socket.io disconnected: ${reason}`);
        }
        
        setIsConnected(false);
        setConnectionStatus('disconnected');
      });
      
      socketInstance.on('connect_error', (error) => {
        console.error('Socket.io connection error:', error);
        setConnectionStatus('error');
        
        toast({
          title: "Connection Error",
          description: "Failed to connect to trading server. Please check your network.",
          variant: "destructive",
        });
      });
      
      // Set up event listeners for message types
      const messageTypes: SocketMessageType[] = [
        'ORDER_UPDATE', 
        'POSITION_UPDATE', 
        'BALANCE_UPDATE', 
        'PRICE_ALERT',
        'MARKET_DATA',
        'EXECUTION_NOTIFICATION',
        'RISK_ALERT',
        'ELIZAOS_NOTIFICATION',
        'SYNC_STATUS',
        'COMMAND_RESPONSE',
        'KNOWLEDGE_RESPONSE'
      ];
      
      messageTypes.forEach(type => {
        socketInstance.on(type, (data) => {
          const message: SocketMessage = {
            type,
            data,
            timestamp: new Date().toISOString(),
          };
          
          // Update messages state
          setMessages(prev => [...prev.slice(-99), message]);
          
          // Update latest message for the specific type
          setLatestMessages(prev => ({
            ...prev,
            [type]: message,
          }));
          
          // Update stats
          setStats(prev => ({
            ...prev,
            messagesReceived: prev.messagesReceived + 1,
          }));
          
          // Update last activity
          setLastActivity(new Date());
          
          if (enableLogging) {
            console.log(`Socket.io ${type} received:`, data);
          }
        });
      });
      
      // Store socket instance
      socketRef.current = socketInstance;
      setSocket(socketInstance);
      
      // Connect if autoConnect is true
      if (autoConnect) {
        socketInstance.connect();
      }
      
      return socketInstance;
    } catch (error) {
      console.error('Error creating Socket.io connection:', error);
      setConnectionStatus('error');
      
      toast({
        title: "Connection Error",
        description: "Failed to initialize socket connection. Please try again later.",
        variant: "destructive",
      });
      
      return null;
    }
  }, [getSocketUrl, supabase, toast, subscribedRooms, enableLogging, autoConnect]);
  
  // Initialize connection when component mounts
  useEffect(() => {
    connectSocket();
    
    // Cleanup on unmount
    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, [connectSocket]);
  
  // Subscribe to a room
  const subscribe = useCallback((room: string) => {
    if (!socketRef.current || !isConnected) {
      // Store for when connection is established
      setSubscribedRooms(prev => {
        if (prev.includes(room)) return prev;
        return [...prev, room];
      });
      return;
    }
    
    socketRef.current.emit('join', room);
    
    setSubscribedRooms(prev => {
      if (prev.includes(room)) return prev;
      return [...prev, room];
    });
    
    if (enableLogging) {
      console.log(`Subscribed to room: ${room}`);
    }
  }, [isConnected, enableLogging]);
  
  // Unsubscribe from a room
  const unsubscribe = useCallback((room: string) => {
    if (!socketRef.current || !isConnected) {
      setSubscribedRooms(prev => prev.filter(r => r !== room));
      return;
    }
    
    socketRef.current.emit('leave', room);
    
    setSubscribedRooms(prev => prev.filter(r => r !== room));
    
    if (enableLogging) {
      console.log(`Unsubscribed from room: ${room}`);
    }
  }, [isConnected, enableLogging]);
  
  // Send message to server
  const send = useCallback((event: string, data: any) => {
    if (!socketRef.current || !isConnected) {
      toast({
        title: "Not Connected",
        description: "Cannot send message: socket is not connected",
      });
      return;
    }
    
    socketRef.current.emit(event, data);
    
    // Update stats
    setStats(prev => ({
      ...prev,
      messagesSent: prev.messagesSent + 1,
    }));
    
    // Update last activity
    setLastActivity(new Date());
    
    if (enableLogging) {
      console.log(`Socket.io sent ${event}:`, data);
    }
  }, [isConnected, toast, enableLogging]);
  
  // Clear message history
  const clearMessages = useCallback(() => {
    setMessages([]);
    setLatestMessages({} as Record<SocketMessageType, SocketMessage | null>);
  }, []);
  
  // Connect to Socket.io server
  const connect = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.connect();
    } else {
      connectSocket();
    }
  }, [connectSocket]);
  
  // Disconnect from Socket.io server
  const disconnect = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.disconnect();
    }
  }, []);
  
  // Context value
  const contextValue: SocketContextType = {
    isConnected,
    messages,
    latestMessages,
    clearMessages,
    send,
    subscribe,
    unsubscribe,
    connect,
    disconnect,
    connectionStatus,
    subscribedRooms,
    lastActivity,
    socket,
    stats,
  };
  
  return (
    <SocketContext.Provider value={contextValue}>
      {children}
    </SocketContext.Provider>
  );
};

// Custom hook to use the socket context
export const useSocket = () => {
  const context = useContext(SocketContext);
  if (context === undefined) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
};
