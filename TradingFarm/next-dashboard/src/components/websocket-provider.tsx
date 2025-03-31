'use client';

import React from 'react';
import websocketService, { WebSocketTopic } from '@/services/websocket-service';
import { toast } from 'sonner';

interface WebSocketContextType {
  isConnected: boolean;
  connectionStatus: 'connected' | 'connecting' | 'disconnected' | 'failed';
  reconnectAttempt: number;
  lastMessage: Record<string, any>;
  sendMessage: (topic: string | WebSocketTopic, message: any) => boolean;
}

const WebSocketContext = React.createContext<WebSocketContextType>({
  isConnected: false,
  connectionStatus: 'disconnected',
  reconnectAttempt: 0,
  lastMessage: {},
  sendMessage: () => false,
});

interface WebSocketProviderProps {
  url: string | undefined;
  debug?: boolean;
  children: React.ReactNode;
}

export const WebSocketProvider: React.FC<WebSocketProviderProps> = ({
  url,
  debug = false,
  children,
}) => {
  const [isConnected, setIsConnected] = React.useState(false);
  const [connectionStatus, setConnectionStatus] = React.useState<'connected' | 'connecting' | 'disconnected' | 'failed'>('disconnected');
  const [reconnectAttempt, setReconnectAttempt] = React.useState(0);
  const [lastMessage, setLastMessage] = React.useState<Record<string, any>>({});

  React.useEffect(() => {
    if (!url) {
      console.warn('WebSocket URL is not provided');
      return;
    }

    // Initialize WebSocket service
    websocketService.initialize(url);

    // Subscribe to system messages
    const unsubscribe = websocketService.subscribe(WebSocketTopic.SYSTEM, (message) => {
      if (message.type === 'connection') {
        setIsConnected(message.status === 'connected');
        setConnectionStatus(message.status);
        
        if (message.status === 'reconnecting' && message.attempt) {
          setReconnectAttempt(message.attempt);
        }
      }
    });

    // Set up topic listeners for all topics to track last messages
    const topics = Object.values(WebSocketTopic);
    const unsubscribers = topics.map(topic => 
      websocketService.subscribe(topic, (message) => {
        setLastMessage((prev: Record<string, any>) => ({
          ...prev,
          [topic]: message
        }));
      })
    );

    // Display connection status to user
    if (debug) {
      toast.info('Connecting to trading server...');
    }

    // Cleanup function
    return () => {
      unsubscribe();
      unsubscribers.forEach(unsub => unsub());
      websocketService.close();
    };
  }, [url, debug]);

  // Message sending function
  const sendMessage = (topic: string | WebSocketTopic, message: any) => {
    return websocketService.send(topic, message);
  };

  const contextValue: WebSocketContextType = {
    isConnected,
    connectionStatus,
    reconnectAttempt,
    lastMessage,
    sendMessage,
  };

  return (
    <WebSocketContext.Provider value={contextValue}>
      {children}
    </WebSocketContext.Provider>
  );
};

export const useWebSocket = () => React.useContext(WebSocketContext);

// Connection status indicator component
export const ConnectionStatus: React.FC = () => {
  const { connectionStatus, reconnectAttempt } = useWebSocket();

  // Determine status indicator appearance
  let bgColor = 'bg-gray-400';
  let statusText = 'Disconnected';
  let pulsate = false;

  switch (connectionStatus) {
    case 'connected':
      bgColor = 'bg-green-500';
      statusText = 'Connected';
      break;
    case 'connecting':
      bgColor = 'bg-blue-500';
      statusText = 'Connecting...';
      pulsate = true;
      break;
    case 'reconnecting':
      bgColor = 'bg-yellow-500';
      statusText = `Reconnecting (${reconnectAttempt})...`;
      pulsate = true;
      break;
    case 'failed':
      bgColor = 'bg-red-500';
      statusText = 'Connection Failed';
      break;
  }

  return (
    <div className="flex items-center">
      <div 
        className={`h-2 w-2 rounded-full mr-2 ${bgColor} ${
          pulsate ? 'animate-pulse' : ''
        }`}
      />
      <span className="text-xs text-muted-foreground">{statusText}</span>
    </div>
  );
};

// Topic subscriber hook
export function useTopicSubscriber<T = any>(topic: string | WebSocketTopic, defaultValue?: T) {
  const [messages, setMessages] = React.useState<T[]>([]);
  const [lastMessage, setLastMessage] = React.useState<T | undefined>(defaultValue);

  React.useEffect(() => {
    const handler = (message: T) => {
      setLastMessage(message);
      setMessages((prev: T[]) => [...prev, message].slice(-100)); // Keep last 100 messages
    };

    const unsubscribe = websocketService.subscribe(topic, handler);
    return () => {
      unsubscribe();
    };
  }, [topic]);

  return { messages, lastMessage };
}

// Order updates hook
export function useOrderUpdates() {
  return useTopicSubscriber(WebSocketTopic.ORDER_UPDATES);
}

// Trade updates hook
export function useTradeUpdates() {
  return useTopicSubscriber(WebSocketTopic.TRADE_UPDATES);
}

// Market data hook
export function useMarketData(symbol?: string) {
  const { messages, lastMessage } = useTopicSubscriber(WebSocketTopic.MARKET_DATA);
  
  // Filter messages by symbol if provided
  const filteredMessages = symbol 
    ? messages.filter((msg: any) => msg.symbol === symbol)
    : messages;
  
  // Get latest message for the symbol
  const symbolLastMessage = symbol && lastMessage && (lastMessage as any).symbol === symbol
    ? lastMessage
    : undefined;
  
  return { messages: filteredMessages, lastMessage: symbolLastMessage };
}

// Agent updates hook
export function useAgentUpdates(agentId?: string) {
  const { messages, lastMessage } = useTopicSubscriber(WebSocketTopic.AGENT_UPDATES);
  
  // Filter messages by agentId if provided
  const filteredMessages = agentId 
    ? messages.filter((msg: any) => msg.agent_id === agentId)
    : messages;
  
  // Get latest message for the agent
  const agentLastMessage = agentId && lastMessage && (lastMessage as any).agent_id === agentId
    ? lastMessage
    : undefined;
  
  return { messages: filteredMessages, lastMessage: agentLastMessage };
}

// Performance updates hook
export function usePerformanceUpdates() {
  return useTopicSubscriber(WebSocketTopic.PERFORMANCE);
}

// Alerts hook
export function useAlerts() {
  return useTopicSubscriber(WebSocketTopic.ALERTS);
}
