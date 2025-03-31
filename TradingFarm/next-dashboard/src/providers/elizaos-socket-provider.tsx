'use client';

import React, { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react';
import { io, Socket } from 'socket.io-client';
import { toast } from '@/components/ui/use-toast';

// Define types for ElizaOS responses
export interface ElizaCommand {
  id: string;
  command: string;
  result: string;
  status: 'pending' | 'success' | 'error';
  timestamp: string;
  source: 'knowledge-base' | 'market-data' | 'strategy' | 'system';
  type: 'command' | 'query' | 'analysis' | 'alert';
}

export interface ElizaKnowledgeResponse {
  id: string;
  query: string;
  response: string;
  sources: Array<{
    title: string;
    content: string;
    relevance: number;
  }>;
  timestamp: string;
}

// Context interface
interface ElizaSocketContextType {
  socket: Socket | null;
  connected: boolean;
  commands: ElizaCommand[];
  knowledgeResponses: ElizaKnowledgeResponse[];
  sendCommand: (command: string, agentId?: string) => void;
  sendKnowledgeQuery: (query: string, agentId?: string) => void;
  clearHistory: () => void;
  usingMockMode: boolean;
}

// Create context
const ElizaSocketContext = createContext<ElizaSocketContextType>({
  socket: null,
  connected: false,
  commands: [],
  knowledgeResponses: [],
  sendCommand: () => {},
  sendKnowledgeQuery: () => {},
  clearHistory: () => {},
  usingMockMode: false
});

// Mock responses for when ElizaOS server is not available
const MOCK_COMMAND_RESPONSES = [
  {
    command: "check balance",
    result: "Current balance: 12,485.32 USDT",
    source: "system",
    type: "command"
  },
  {
    command: "market sentiment",
    result: "Bitcoin market sentiment is currently bullish with 65% positive indicators. Major exchanges show increasing buy pressure over the last 24 hours.",
    source: "market-data",
    type: "analysis"
  },
  {
    command: "status",
    result: "All systems operational. Currently monitoring 3 active strategies across 2 exchanges. No alerts detected in the last 12 hours.",
    source: "system",
    type: "command"
  },
  {
    command: "analyze strategy performance",
    result: "Strategy 'Momentum Algo' has +8.4% ROI over the last 7 days with 23 trades. Win rate: 74%. Average holding time: 4.2 hours.",
    source: "strategy",
    type: "analysis"
  }
];

// Provider component
export function ElizaSocketProvider({ children }: { children: React.ReactNode }) {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [connected, setConnected] = useState(false);
  const [commands, setCommands] = useState<ElizaCommand[]>([]);
  const [knowledgeResponses, setKnowledgeResponses] = useState<ElizaKnowledgeResponse[]>([]);
  const [usingMockMode, setUsingMockMode] = useState(false);
  const [connectionAttempts, setConnectionAttempts] = useState(0);
  
  // Initialize socket connection
  useEffect(() => {
    let socketInstance: Socket | null = null;
    
    const initializeSocket = async () => {
      try {
        // Fetch the socket URL from our config API
        const response = await fetch('/api/config?key=socket_io_url');
        const data = await response.json();
        
        if (data.value) {
          // If we've failed to connect multiple times, use mock mode instead
          if (connectionAttempts >= 3) {
            console.log('Switching to mock mode after multiple connection failures');
            setUsingMockMode(true);
            setConnected(true);
            return;
          }
          
          socketInstance = io(data.value, {
            reconnectionAttempts: 3,
            reconnectionDelay: 1000,
            transports: ['websocket'],
            timeout: 5000 // Shorter timeout to fail faster
          });

          // Socket event handlers
          socketInstance.on('connect', () => {
            console.log('Connected to ElizaOS Socket.io server');
            setConnected(true);
            setConnectionAttempts(0); // Reset attempts on successful connection
          });

          socketInstance.on('disconnect', () => {
            console.log('Disconnected from ElizaOS Socket.io server');
            setConnected(false);
          });

          socketInstance.on('connect_error', (error) => {
            console.error('Socket.io connection error:', error);
            setConnectionAttempts(prev => prev + 1);
            
            // If we've failed too many times, switch to mock mode
            if (connectionAttempts >= 2) {
              console.log('Switching to mock mode after connection errors');
              setUsingMockMode(true);
              setConnected(true);
              
              if (socketInstance) {
                socketInstance.disconnect();
              }
            }
          });

          // Handle command responses - using functional state updates to avoid stale state
          socketInstance.on('COMMAND_RESPONSE', (response: ElizaCommand) => {
            setCommands(prev => [...prev, response]);
          });

          // Handle knowledge responses - using functional state updates
          socketInstance.on('KNOWLEDGE_RESPONSE', (response: ElizaKnowledgeResponse) => {
            setKnowledgeResponses(prev => [...prev, response]);
          });

          setSocket(socketInstance);
        } else {
          console.error('No socket URL provided from config API');
          setUsingMockMode(true);
          setConnected(true);
        }
      } catch (error) {
        console.error('Error initializing socket:', error);
        setUsingMockMode(true);
        setConnected(true);
      }
    };

    initializeSocket();

    // Cleanup function
    return () => {
      if (socketInstance) {
        socketInstance.disconnect();
        socketInstance.removeAllListeners();
      }
    };
  }, [connectionAttempts]);

  // Send command to ElizaOS or generate mock response if in mock mode
  const sendCommand = useCallback((command: string, agentId?: string) => {
    if (socket && connected && !usingMockMode) {
      // Real mode - send command to socket server
      socket.emit('SEND_COMMAND', {
        command,
        agentId: agentId || 'default',
        timestamp: new Date().toISOString(),
      });
    } else if (usingMockMode) {
      // Mock mode - generate a response locally
      const mockResponse = MOCK_COMMAND_RESPONSES.find(r => 
        command.toLowerCase().includes(r.command) || 
        r.command.includes(command.toLowerCase())
      );
      
      const commandId = `cmd-${Date.now()}`;
      
      // First show the pending state
      const pendingCommand: ElizaCommand = {
        id: commandId,
        command,
        result: 'Processing...',
        status: 'pending',
        timestamp: new Date().toISOString(),
        source: 'system',
        type: 'command'
      };
      
      setCommands(prev => [...prev, pendingCommand]);
      
      // Then after a delay, update with the result
      setTimeout(() => {
        const responseCommand: ElizaCommand = {
          id: commandId,
          command,
          result: mockResponse 
            ? mockResponse.result 
            : `Processed command: ${command}. No specific response available in mock mode.`,
          status: 'success',
          timestamp: new Date().toISOString(),
          source: mockResponse?.source as any || 'system',
          type: mockResponse?.type as any || 'command'
        };
        
        setCommands(prev => prev.map(cmd => 
          cmd.id === commandId ? responseCommand : cmd
        ));
      }, 1000);
    } else {
      // Not connected, show error
      console.error('Cannot send command: Socket not connected');
      toast({
        title: "Connection Error",
        description: "Cannot send command: Not connected to ElizaOS",
        variant: "destructive"
      });
    }
  }, [socket, connected, usingMockMode]);

  // Send knowledge query
  const sendKnowledgeQuery = useCallback((query: string, agentId?: string) => {
    if (socket && connected && !usingMockMode) {
      socket.emit('KNOWLEDGE_QUERY', {
        query,
        agentId: agentId || 'default',
        timestamp: new Date().toISOString(),
      });
    } else if (usingMockMode) {
      // Mock mode - generate a response locally
      const queryId = `kq-${Date.now()}`;
      
      // Simulate knowledge response after a delay
      setTimeout(() => {
        const mockKnowledgeResponse: ElizaKnowledgeResponse = {
          id: queryId,
          query,
          response: `Based on the Trading Farm knowledge base, the query "${query}" relates to market trends and trading strategies. Analysis shows that momentum-based strategies perform best in trending markets, while mean reversion strategies excel in range-bound conditions.`,
          sources: [
            {
              title: "Trading Strategy Handbook",
              content: "Chapter 4: Momentum vs Mean Reversion",
              relevance: 0.92
            },
            {
              title: "Market Analysis Framework",
              content: "Identifying market conditions for optimal strategy selection",
              relevance: 0.85
            }
          ],
          timestamp: new Date().toISOString()
        };
        
        setKnowledgeResponses(prev => [...prev, mockKnowledgeResponse]);
      }, 1500);
    } else {
      console.error('Cannot send query: Socket not connected');
      toast({
        title: "Connection Error",
        description: "Cannot send knowledge query: Not connected to ElizaOS",
        variant: "destructive"
      });
    }
  }, [socket, connected, usingMockMode]);

  // Clear history
  const clearHistory = useCallback(() => {
    setCommands([]);
    setKnowledgeResponses([]);
  }, []);

  // Memoize the context value to prevent unnecessary re-renders
  const contextValue = useMemo(() => ({
    socket,
    connected: connected || usingMockMode, // Consider connected if using mock mode
    commands,
    knowledgeResponses,
    sendCommand,
    sendKnowledgeQuery,
    clearHistory,
    usingMockMode
  }), [socket, connected, commands, knowledgeResponses, sendCommand, sendKnowledgeQuery, clearHistory, usingMockMode]);

  return (
    <ElizaSocketContext.Provider value={contextValue}>
      {children}
    </ElizaSocketContext.Provider>
  );
}

// Custom hook for easier context usage
export const useElizaSocket = () => useContext(ElizaSocketContext);
