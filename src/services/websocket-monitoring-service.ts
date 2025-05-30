import { useEffect, useRef, useState } from 'react';

interface WebSocketMessage {
  type: string;
  data: any;
}

interface WebSocketHookOptions {
  url: string;
  onMessage?: (data: any) => void;
  onConnect?: () => void;
  onDisconnect?: () => void;
  onError?: (error: Event) => void;
  autoReconnect?: boolean;
  reconnectInterval?: number;
  maxReconnectAttempts?: number;
}

export function useWebSocketMonitoring({
  url,
  onMessage,
  onConnect,
  onDisconnect,
  onError,
  autoReconnect = true,
  reconnectInterval = 5000,
  maxReconnectAttempts = 5
}: WebSocketHookOptions) {
  const [isConnected, setIsConnected] = useState(false);
  const [lastMessage, setLastMessage] = useState<any>(null);
  const [reconnectAttempts, setReconnectAttempts] = useState(0);
  
  const socketRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  const connect = () => {
    try {
      // Close any existing socket
      if (socketRef.current) {
        socketRef.current.close();
      }
      
      // Create new WebSocket connection
      const socket = new WebSocket(url);
      
      socket.onopen = () => {
        console.log('WebSocket connected');
        setIsConnected(true);
        setReconnectAttempts(0);
        onConnect?.();
      };
      
      socket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          setLastMessage(data);
          onMessage?.(data);
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };
      
      socket.onclose = () => {
        console.log('WebSocket disconnected');
        setIsConnected(false);
        onDisconnect?.();
        
        // Attempt to reconnect if enabled
        if (autoReconnect && reconnectAttempts < maxReconnectAttempts) {
          console.log(`Reconnecting in ${reconnectInterval / 1000} seconds...`);
          if (reconnectTimeoutRef.current) {
            clearTimeout(reconnectTimeoutRef.current);
          }
          
          reconnectTimeoutRef.current = setTimeout(() => {
            setReconnectAttempts(prev => prev + 1);
            connect();
          }, reconnectInterval);
        }
      };
      
      socket.onerror = (error) => {
        console.error('WebSocket error:', error);
        onError?.(error);
      };
      
      socketRef.current = socket;
    } catch (error) {
      console.error('Error creating WebSocket connection:', error);
    }
  };
  
  // Initialize connection
  useEffect(() => {
    connect();
    
    // Cleanup function
    return () => {
      if (socketRef.current) {
        socketRef.current.close();
      }
      
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, [url]);
  
  // Function to send messages to the server
  const sendMessage = (message: any) => {
    if (socketRef.current && isConnected) {
      const stringifiedMessage = typeof message === 'string' 
        ? message 
        : JSON.stringify(message);
      
      socketRef.current.send(stringifiedMessage);
    } else {
      console.warn('Cannot send message: WebSocket is not connected');
    }
  };
  
  // Function to manually disconnect
  const disconnect = () => {
    if (socketRef.current) {
      socketRef.current.close();
    }
  };
  
  // Function to manually reconnect
  const reconnect = () => {
    setReconnectAttempts(0);
    connect();
  };
  
  return {
    isConnected,
    lastMessage,
    sendMessage,
    disconnect,
    reconnect,
    reconnectAttempts
  };
}

// Specialized hooks for different monitoring types
export function useAgentMonitoring(agentId: string, options?: Partial<Omit<WebSocketHookOptions, 'url'>>) {
  // In a real implementation, this would connect to a real WebSocket endpoint
  const websocketUrl = `wss://api.tradingfarm.example/v1/monitoring/agents/${agentId}`;
  
  return useWebSocketMonitoring({
    url: websocketUrl,
    ...options
  });
}

export function useFarmMonitoring(farmId: string, options?: Partial<Omit<WebSocketHookOptions, 'url'>>) {
  // In a real implementation, this would connect to a real WebSocket endpoint
  const websocketUrl = `wss://api.tradingfarm.example/v1/monitoring/farms/${farmId}`;
  
  return useWebSocketMonitoring({
    url: websocketUrl,
    ...options
  });
}

export function useSystemMonitoring(options?: Partial<Omit<WebSocketHookOptions, 'url'>>) {
  // In a real implementation, this would connect to a real WebSocket endpoint
  const websocketUrl = `wss://api.tradingfarm.example/v1/monitoring/system`;
  
  return useWebSocketMonitoring({
    url: websocketUrl,
    ...options
  });
}

// Mock implementation for development and testing
export class MockWebSocketService {
  private listeners: Map<string, Set<(data: any) => void>> = new Map();
  private intervalIds: Map<string, NodeJS.Timeout> = new Map();
  
  constructor() {
    // Initialize default event types
    this.listeners.set('system', new Set());
    this.listeners.set('farm', new Set());
    this.listeners.set('agent', new Set());
  }
  
  subscribe(eventType: string, callback: (data: any) => void) {
    if (!this.listeners.has(eventType)) {
      this.listeners.set(eventType, new Set());
    }
    
    this.listeners.get(eventType)?.add(callback);
    
    // Start sending mock data if this is the first subscriber
    if (this.listeners.get(eventType)?.size === 1) {
      this.startMockDataStream(eventType);
    }
    
    // Return unsubscribe function
    return () => {
      this.listeners.get(eventType)?.delete(callback);
      
      // Stop mock data if no more subscribers
      if (this.listeners.get(eventType)?.size === 0) {
        this.stopMockDataStream(eventType);
      }
    };
  }
  
  private startMockDataStream(eventType: string) {
    const generateMockData = () => {
      let mockData: any;
      
      // Generate different data based on event type
      switch (eventType) {
        case 'system':
          mockData = {
            cpu: 30 + Math.random() * 50,
            memory: 40 + Math.random() * 40,
            disk: 50 + Math.random() * 30,
            network: 20 + Math.random() * 50,
            timestamp: new Date().toISOString()
          };
          break;
        case 'farm':
          mockData = {
            id: 'farm-1',
            activeAgents: Math.floor(3 + Math.random() * 5),
            tradingVolume: Math.floor(1000 + Math.random() * 5000),
            profitLoss: Math.random() > 0.6 ? (100 + Math.random() * 500) : -(50 + Math.random() * 200),
            timestamp: new Date().toISOString()
          };
          break;
        case 'agent':
          mockData = {
            id: 'agent-1',
            status: Math.random() > 0.9 ? 'warning' : 'normal',
            trades: Math.floor(1 + Math.random() * 3),
            winRate: 40 + Math.random() * 50,
            responseTime: 50 + Math.random() * 150,
            timestamp: new Date().toISOString()
          };
          break;
        default:
          mockData = {
            timestamp: new Date().toISOString(),
            value: Math.random() * 100
          };
      }
      
      // Notify all subscribers
      this.notify(eventType, mockData);
    };
    
    // Send data at appropriate intervals based on type
    const interval = eventType === 'system' ? 3000 : 
                     eventType === 'agent' ? 2000 : 5000;
    
    const intervalId = setInterval(generateMockData, interval);
    this.intervalIds.set(eventType, intervalId);
    
    // Send initial data immediately
    generateMockData();
  }
  
  private stopMockDataStream(eventType: string) {
    const intervalId = this.intervalIds.get(eventType);
    if (intervalId) {
      clearInterval(intervalId);
      this.intervalIds.delete(eventType);
    }
  }
  
  private notify(eventType: string, data: any) {
    this.listeners.get(eventType)?.forEach(callback => {
      callback(data);
    });
  }
  
  // For testing and debugging
  simulateMessage(eventType: string, data: any) {
    this.notify(eventType, data);
  }
}

// Create singleton instance
export const mockWebSocketService = new MockWebSocketService(); 