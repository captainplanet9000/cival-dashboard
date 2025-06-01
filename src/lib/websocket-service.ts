import { useEffect, useState } from 'react';

interface WebSocketOptions {
  reconnectInterval?: number;
  maxReconnectAttempts?: number;
  onMessage?: (data: any) => void;
  onConnect?: () => void;
  onDisconnect?: () => void;
  onError?: (error: Event) => void;
}

class WebSocketService {
  private socket: WebSocket | null = null;
  private url: string;
  private reconnectInterval: number;
  private maxReconnectAttempts: number;
  private reconnectAttempts: number = 0;
  private reconnectTimeout: NodeJS.Timeout | null = null;
  private messageHandlers: Map<string, (data: any) => void> = new Map();
  private isConnected: boolean = false;
  
  constructor(options: WebSocketOptions = {}) {
    this.url = process.env.NEXT_PUBLIC_WEBSOCKET_URL || '';
    this.reconnectInterval = options.reconnectInterval || 3000;
    this.maxReconnectAttempts = options.maxReconnectAttempts || 10;
    
    if (options.onMessage) {
      this.addMessageHandler('default', options.onMessage);
    }
    
    if (typeof window !== 'undefined') {
      this.initialize(options);
    }
  }
  
  private initialize(options: WebSocketOptions) {
    // Only initialize in browser environment
    if (typeof window === 'undefined' || !this.url) return;
    
    try {
      this.socket = new WebSocket(this.url);
      
      this.socket.onopen = () => {
        this.isConnected = true;
        this.reconnectAttempts = 0;
        if (options.onConnect) options.onConnect();
      };
      
      this.socket.onclose = () => {
        this.isConnected = false;
        if (options.onDisconnect) options.onDisconnect();
        this.attemptReconnect();
      };
      
      this.socket.onerror = (error) => {
        if (options.onError) options.onError(error);
      };
      
      this.socket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          
          // Check if it has a type and call the appropriate handler
          if (data.type && this.messageHandlers.has(data.type)) {
            const handler = this.messageHandlers.get(data.type);
            if (handler) handler(data.payload);
          }
          
          // Also call the default handler if it exists
          const defaultHandler = this.messageHandlers.get('default');
          if (defaultHandler) defaultHandler(data);
        } catch (error) {
          console.error('WebSocket message parsing error:', error);
        }
      };
    } catch (error) {
      console.error('WebSocket initialization error:', error);
    }
  }
  
  private attemptReconnect() {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
    }
    
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('Max reconnect attempts reached, giving up');
      return;
    }
    
    this.reconnectAttempts++;
    
    this.reconnectTimeout = setTimeout(() => {
      console.log(`Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts})...`);
      this.initialize({});
    }, this.reconnectInterval);
  }
  
  public addMessageHandler(type: string, handler: (data: any) => void) {
    this.messageHandlers.set(type, handler);
  }
  
  public removeMessageHandler(type: string) {
    this.messageHandlers.delete(type);
  }
  
  public sendMessage(type: string, payload: any) {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
      console.error('Cannot send message, WebSocket is not connected');
      return false;
    }
    
    try {
      this.socket.send(JSON.stringify({ type, payload }));
      return true;
    } catch (error) {
      console.error('Error sending WebSocket message:', error);
      return false;
    }
  }
  
  public subscribe(channel: string, params: any = {}) {
    return this.sendMessage('subscribe', { channel, params });
  }
  
  public unsubscribe(channel: string) {
    return this.sendMessage('unsubscribe', { channel });
  }
  
  public disconnect() {
    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }
    
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
  }
  
  public isSocketConnected() {
    return this.isConnected;
  }
}

// Create a singleton instance
export const websocketService = new WebSocketService();

// React hook for using the WebSocket service
export function useWebSocket<T = any>(
  channel: string, 
  params: any = {},
  onMessage?: (data: T) => void
) {
  const [isConnected, setIsConnected] = useState(websocketService.isSocketConnected());
  const [lastMessage, setLastMessage] = useState<T | null>(null);
  
  useEffect(() => {
    // Message handler for this specific channel
    const messageHandler = (data: T) => {
      setLastMessage(data);
      if (onMessage) onMessage(data);
    };
    
    // Subscribe to the channel
    websocketService.addMessageHandler(channel, messageHandler);
    websocketService.subscribe(channel, params);
    
    // Update connection status
    const handleConnect = () => setIsConnected(true);
    const handleDisconnect = () => setIsConnected(false);
    
    window.addEventListener('ws:connect', handleConnect);
    window.addEventListener('ws:disconnect', handleDisconnect);
    
    // Clean up
    return () => {
      websocketService.removeMessageHandler(channel);
      websocketService.unsubscribe(channel);
      
      window.removeEventListener('ws:connect', handleConnect);
      window.removeEventListener('ws:disconnect', handleDisconnect);
    };
  }, [channel, params, onMessage]);
  
  return { isConnected, lastMessage };
}

// Real-time dashboard metrics hook
export function useDashboardMetrics(refreshInterval: number = 5000) {
  const [metrics, setMetrics] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  
  // Use WebSocket if available, otherwise use polling
  const enableRealTime = process.env.NEXT_PUBLIC_ENABLE_REAL_TIME === 'true';
  
  useEffect(() => {
    if (!enableRealTime) {
      // Use polling instead of WebSockets
      const fetchMetrics = async () => {
        try {
          const response = await fetch('/api/dashboard/metrics');
          if (response.ok) {
            const data = await response.json();
            setMetrics(data);
          }
        } catch (error) {
          console.error('Error fetching metrics:', error);
        } finally {
          setLoading(false);
        }
      };
      
      fetchMetrics();
      const interval = setInterval(fetchMetrics, refreshInterval);
      
      return () => clearInterval(interval);
    }
  }, [enableRealTime, refreshInterval]);
  
  // WebSocket-based real-time updates
  const { lastMessage } = useWebSocket<any>(
    'dashboard:metrics',
    {},
    (data) => {
      setMetrics(data);
      setLoading(false);
    }
  );
  
  useEffect(() => {
    if (lastMessage) {
      setMetrics(lastMessage);
    }
  }, [lastMessage]);
  
  return { metrics, loading };
}

// Real-time farm metrics hook
export function useFarmMetrics(farmId: string | number, refreshInterval: number = 5000) {
  const [metrics, setMetrics] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  
  // Use WebSocket if available, otherwise use polling
  const enableRealTime = process.env.NEXT_PUBLIC_ENABLE_REAL_TIME === 'true';
  
  useEffect(() => {
    if (!enableRealTime) {
      // Use polling instead of WebSockets
      const fetchMetrics = async () => {
        try {
          const response = await fetch(`/api/farms/${farmId}/metrics`);
          if (response.ok) {
            const data = await response.json();
            setMetrics(data);
          }
        } catch (error) {
          console.error('Error fetching farm metrics:', error);
        } finally {
          setLoading(false);
        }
      };
      
      fetchMetrics();
      const interval = setInterval(fetchMetrics, refreshInterval);
      
      return () => clearInterval(interval);
    }
  }, [enableRealTime, farmId, refreshInterval]);
  
  // WebSocket-based real-time updates
  const { lastMessage } = useWebSocket<any>(
    'farm:metrics',
    { farmId },
    (data) => {
      setMetrics(data);
      setLoading(false);
    }
  );
  
  useEffect(() => {
    if (lastMessage) {
      setMetrics(lastMessage);
    }
  }, [lastMessage]);
  
  return { metrics, loading };
}

// Real-time agent metrics hook
export function useAgentMetrics(agentId: string | number, refreshInterval: number = 5000) {
  const [metrics, setMetrics] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  
  // Use WebSocket if available, otherwise use polling
  const enableRealTime = process.env.NEXT_PUBLIC_ENABLE_REAL_TIME === 'true';
  
  useEffect(() => {
    if (!enableRealTime) {
      // Use polling instead of WebSockets
      const fetchMetrics = async () => {
        try {
          const response = await fetch(`/api/agents/${agentId}/metrics`);
          if (response.ok) {
            const data = await response.json();
            setMetrics(data);
          }
        } catch (error) {
          console.error('Error fetching agent metrics:', error);
        } finally {
          setLoading(false);
        }
      };
      
      fetchMetrics();
      const interval = setInterval(fetchMetrics, refreshInterval);
      
      return () => clearInterval(interval);
    }
  }, [enableRealTime, agentId, refreshInterval]);
  
  // WebSocket-based real-time updates
  const { lastMessage } = useWebSocket<any>(
    'agent:metrics',
    { agentId },
    (data) => {
      setMetrics(data);
      setLoading(false);
    }
  );
  
  useEffect(() => {
    if (lastMessage) {
      setMetrics(lastMessage);
    }
  }, [lastMessage]);
  
  return { metrics, loading };
} 