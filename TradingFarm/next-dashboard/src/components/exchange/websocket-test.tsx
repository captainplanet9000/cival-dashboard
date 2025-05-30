'use client';

/**
 * WebSocket Integration Test Component
 * 
 * A component for testing WebSocket connections to exchanges
 * Part of Phase 1 Live Trading implementation.
 */

import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Play, Square, RefreshCw, Wifi, WifiOff } from 'lucide-react';
import { createBrowserClient } from '@/utils/supabase/client';
import { createLogger } from '@/lib/logging';
import { ExchangeError, ExchangeErrorType, createExchangeError } from '@/lib/exchange/error-handling';

const logger = createLogger('websocket-test');

interface WebSocketTestProps {
  userId: string;
}

interface ExchangeConnection {
  id: string;
  name: string;
  exchange: string;
  testnet: boolean;
  active: boolean;
}

interface WebSocketMessage {
  id: string;
  timestamp: Date;
  type: 'sent' | 'received' | 'error';
  content: any;
}

export function WebSocketTest({ userId }: WebSocketTestProps) {
  const [connections, setConnections] = useState<ExchangeConnection[]>([]);
  const [selectedConnection, setSelectedConnection] = useState<string | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<'disconnected' | 'connecting' | 'connected'>('disconnected');
  const [messages, setMessages] = useState<WebSocketMessage[]>([]);
  const [availableChannels, setAvailableChannels] = useState<string[]>([]);
  const [selectedChannel, setSelectedChannel] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const ws = useRef<WebSocket | null>(null);
  
  // Fetch connections
  useEffect(() => {
    const fetchConnections = async () => {
      try {
        setLoading(true);
        const supabase = createBrowserClient();
        
        const { data, error } = await supabase
          .from('exchange_configs')
          .select('*')
          .eq('user_id', userId);
        
        if (error) throw error;
        
        setConnections(data || []);
        
        if (data && data.length > 0 && !selectedConnection) {
          setSelectedConnection(data[0].id);
        }
      } catch (error) {
        logger.error('Error fetching exchange connections', { error });
        addMessage({
          type: 'error',
          content: `Failed to load exchange connections: ${error instanceof Error ? error.message : String(error)}`,
        });
      } finally {
        setLoading(false);
      }
    };
    
    fetchConnections();
  }, [userId]);
  
  // Set available channels based on exchange
  useEffect(() => {
    if (!selectedConnection) return;
    
    const connection = connections.find(c => c.id === selectedConnection);
    if (!connection) return;
    
    // Different exchanges offer different channels
    switch (connection.exchange) {
      case 'coinbase':
        setAvailableChannels([
          'ticker',
          'level2',
          'matches',
          'heartbeat',
        ]);
        break;
      case 'hyperliquid':
        setAvailableChannels([
          'marketData',
          'trades',
          'orderbook',
          'userEvents',
        ]);
        break;
      case 'bybit':
        setAvailableChannels([
          'orderbook.50',
          'trade',
          'ticker',
          'kline.1m',
        ]);
        break;
      default:
        setAvailableChannels(['ticker']);
    }
    
    // Reset selected channel
    setSelectedChannel(null);
  }, [selectedConnection, connections]);
  
  // Add a message to the log
  const addMessage = (message: Omit<WebSocketMessage, 'id' | 'timestamp'>) => {
    setMessages(prev => [
      {
        id: Math.random().toString(36).substring(2, 11),
        timestamp: new Date(),
        ...message
      },
      ...prev
    ].slice(0, 100)); // Keep only last 100 messages
  };
  
  // Connect to WebSocket
  const connectWebSocket = async () => {
    if (!selectedConnection || !selectedChannel) return;
    
    try {
      // First, disconnect if already connected
      disconnectWebSocket();
      
      // Update state
      setConnectionStatus('connecting');
      
      // Find selected connection
      const connection = connections.find(c => c.id === selectedConnection);
      if (!connection) throw new Error('Connection not found');
      
      // Get websocket URL from the API
      const response = await fetch('/api/exchange/websocket-endpoint', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          exchangeId: connection.exchange,
          connectionId: connection.id,
          channel: selectedChannel,
          testnet: connection.testnet,
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to get WebSocket endpoint');
      }
      
      const { url, subscriptionMessage } = await response.json();
      
      // Create WebSocket connection
      ws.current = new WebSocket(url);
      
      // Set up event handlers
      ws.current.onopen = () => {
        setConnectionStatus('connected');
        addMessage({ type: 'sent', content: 'WebSocket connection established' });
        
        // Send subscription message if provided
        if (subscriptionMessage) {
          ws.current?.send(JSON.stringify(subscriptionMessage));
          addMessage({ type: 'sent', content: subscriptionMessage });
        }
      };
      
      ws.current.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          addMessage({ type: 'received', content: data });
        } catch (error) {
          addMessage({ type: 'received', content: event.data });
        }
      };
      
      ws.current.onerror = (event) => {
        const error = createExchangeError(
          new Error('WebSocket error'),
          connection.exchange,
          { connectionId: connection.id, channel: selectedChannel }
        );
        
        error.type = ExchangeErrorType.WEBSOCKET_ERROR;
        logger.error('WebSocket error', { error });
        
        addMessage({ type: 'error', content: 'WebSocket error: ' + error.message });
        setConnectionStatus('disconnected');
      };
      
      ws.current.onclose = () => {
        addMessage({ type: 'sent', content: 'WebSocket connection closed' });
        setConnectionStatus('disconnected');
      };
    } catch (error) {
      logger.error('Error connecting to WebSocket', { error });
      
      addMessage({
        type: 'error',
        content: `Failed to connect: ${error instanceof Error ? error.message : String(error)}`
      });
      
      setConnectionStatus('disconnected');
    }
  };
  
  // Disconnect WebSocket
  const disconnectWebSocket = () => {
    if (ws.current) {
      ws.current.close();
      ws.current = null;
      setConnectionStatus('disconnected');
      addMessage({ type: 'sent', content: 'Manually disconnected from WebSocket' });
    }
  };
  
  // Clear messages
  const clearMessages = () => {
    setMessages([]);
  };
  
  // Format message for display
  const formatMessage = (content: any): string => {
    if (typeof content === 'string') {
      return content;
    }
    
    try {
      return JSON.stringify(content, null, 2);
    } catch (error) {
      return String(content);
    }
  };
  
  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>WebSocket Integration Test</CardTitle>
        <CardDescription>
          Test real-time data connections to your exchanges
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid gap-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Exchange Selection */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Exchange Connection</label>
              <Select 
                value={selectedConnection || ''} 
                onValueChange={setSelectedConnection}
                disabled={connectionStatus !== 'disconnected' || loading}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select connection" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectLabel>Live Connections</SelectLabel>
                    {connections
                      .filter(conn => !conn.testnet)
                      .map(conn => (
                        <SelectItem key={conn.id} value={conn.id}>
                          {conn.name} ({conn.exchange})
                        </SelectItem>
                      ))
                    }
                  </SelectGroup>
                  <SelectGroup>
                    <SelectLabel>Testnet Connections</SelectLabel>
                    {connections
                      .filter(conn => conn.testnet)
                      .map(conn => (
                        <SelectItem key={conn.id} value={conn.id}>
                          {conn.name} ({conn.exchange})
                        </SelectItem>
                      ))
                    }
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>
            
            {/* Channel Selection */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Data Channel</label>
              <Select 
                value={selectedChannel || ''} 
                onValueChange={setSelectedChannel}
                disabled={connectionStatus !== 'disconnected' || !selectedConnection}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select channel" />
                </SelectTrigger>
                <SelectContent>
                  {availableChannels.map(channel => (
                    <SelectItem key={channel} value={channel}>
                      {channel}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          
          {/* Connection Status */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="text-sm font-medium">Connection Status:</div>
              {connectionStatus === 'connected' ? (
                <Badge className="bg-green-500">
                  <Wifi className="h-3 w-3 mr-1" /> Connected
                </Badge>
              ) : connectionStatus === 'connecting' ? (
                <Badge variant="outline" className="animate-pulse text-yellow-500">
                  <RefreshCw className="h-3 w-3 mr-1 animate-spin" /> Connecting...
                </Badge>
              ) : (
                <Badge variant="outline" className="text-muted-foreground">
                  <WifiOff className="h-3 w-3 mr-1" /> Disconnected
                </Badge>
              )}
            </div>
            
            <div className="flex space-x-2">
              {connectionStatus === 'disconnected' ? (
                <Button 
                  onClick={connectWebSocket} 
                  disabled={!selectedConnection || !selectedChannel}
                  size="sm"
                >
                  <Play className="h-4 w-4 mr-1" /> Connect
                </Button>
              ) : (
                <Button 
                  onClick={disconnectWebSocket} 
                  variant="destructive"
                  size="sm"
                >
                  <Square className="h-4 w-4 mr-1" /> Disconnect
                </Button>
              )}
              
              <Button 
                onClick={clearMessages} 
                variant="outline"
                size="sm"
              >
                Clear Log
              </Button>
            </div>
          </div>
          
          {/* Message Log */}
          <div className="border rounded-md">
            <div className="p-2 bg-muted/40 border-b flex items-center justify-between">
              <div className="text-sm font-medium">WebSocket Messages</div>
              <div className="text-xs text-muted-foreground">
                {messages.length} messages
              </div>
            </div>
            
            <ScrollArea className="h-[400px]">
              {messages.length === 0 ? (
                <div className="p-4 text-center text-muted-foreground">
                  No messages yet. Connect to see real-time data.
                </div>
              ) : (
                <div className="p-1">
                  {messages.map(message => (
                    <div 
                      key={message.id} 
                      className={`mb-1 p-2 rounded text-xs font-mono ${
                        message.type === 'sent' 
                          ? 'bg-blue-500/10 border-l-2 border-blue-500' 
                          : message.type === 'error'
                            ? 'bg-red-500/10 border-l-2 border-red-500'
                            : 'bg-green-500/10 border-l-2 border-green-500'
                      }`}
                    >
                      <div className="flex items-center text-[10px] text-muted-foreground mb-1">
                        <span>
                          {message.timestamp.toLocaleTimeString()}
                        </span>
                        <span className="mx-1">·</span>
                        <span>
                          {message.type.toUpperCase()}
                        </span>
                      </div>
                      <pre className="whitespace-pre-wrap break-all">
                        {formatMessage(message.content)}
                      </pre>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </div>
          
          {/* Help Text */}
          <Alert>
            <AlertDescription className="text-sm">
              This tool allows you to test WebSocket connections to your exchanges.
              Select an exchange connection and data channel, then click Connect to start receiving real-time data.
              The message log will show all communication with the exchange's WebSocket API.
            </AlertDescription>
          </Alert>
        </div>
      </CardContent>
      <CardFooter className="border-t pt-4 text-xs text-muted-foreground">
        WebSocket testing is part of Phase 1 Live Trading implementation. Data channels vary by exchange.
      </CardFooter>
    </Card>
  );
}
