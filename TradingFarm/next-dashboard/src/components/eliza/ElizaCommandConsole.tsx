'use client';

import React, { useState, useEffect, useRef } from 'react';
import { elizaClient } from '@/utils/eliza/eliza-client';
import { MessageCircle, Send, Database, TrendingUp, AlertTriangle, FileText } from 'lucide-react';

// Define types for messages
type MessageSource = 'user' | 'agent' | 'system';
type MessageCategory = 'command' | 'query' | 'analysis' | 'alert';
type MessageOrigin = 'knowledge-base' | 'market-data' | 'strategy' | 'system';

interface Message {
  id: string;
  text: string;
  source: MessageSource;
  timestamp: Date;
  category?: MessageCategory;
  origin?: MessageOrigin;
  metadata?: Record<string, any>;
}

// Socket event types
const TRADING_EVENTS = {
  COMMAND_SENT: 'command:sent',
  COMMAND_RESPONSE: 'command:response',
  KNOWLEDGE_QUERY: 'knowledge:query',
  KNOWLEDGE_RESPONSE: 'knowledge:response',
  MARKET_UPDATE: 'market:update',
  AGENT_STATUS: 'agent:status',
};

interface ElizaCommandConsoleProps {
  agentId: number;
  farmId: number;
  socketUrl?: string;
}

export default function ElizaCommandConsole({ agentId, farmId, socketUrl = '/api/socket' }: ElizaCommandConsoleProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [socket, setSocket] = useState<WebSocket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [agentDetails, setAgentDetails] = useState<any>(null);
  const [quickCommands, setQuickCommands] = useState<string[]>([
    'Status update',
    'Market analysis',
    'Current strategy',
    'Portfolio performance',
  ]);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Initialize WebSocket connection
  useEffect(() => {
    const initSocket = () => {
      const ws = new WebSocket(socketUrl);
      
      ws.onopen = () => {
        setIsConnected(true);
        addSystemMessage('Connected to ElizaOS command interface', 'system');
        
        // Register agent with socket
        ws.send(JSON.stringify({
          type: 'register',
          agentId,
          farmId
        }));
      };
      
      ws.onclose = () => {
        setIsConnected(false);
        addSystemMessage('Disconnected from ElizaOS command interface', 'system');
        
        // Reconnect after 2 seconds
        setTimeout(() => {
          initSocket();
        }, 2000);
      };
      
      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        addSystemMessage('Error connecting to ElizaOS interface', 'system');
      };
      
      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          
          switch (data.type) {
            case TRADING_EVENTS.COMMAND_RESPONSE:
              handleCommandResponse(data);
              break;
            case TRADING_EVENTS.KNOWLEDGE_RESPONSE:
              handleKnowledgeResponse(data);
              break;
            case TRADING_EVENTS.MARKET_UPDATE:
              handleMarketUpdate(data);
              break;
            case TRADING_EVENTS.AGENT_STATUS:
              handleAgentStatus(data);
              break;
            default:
              console.log('Unknown event type:', data.type);
          }
        } catch (error) {
          console.error('Error processing message:', error);
        }
      };
      
      setSocket(ws);
      
      return () => {
        ws.close();
      };
    };
    
    initSocket();
    loadAgentDetails();
    
    return () => {
      if (socket) {
        socket.close();
      }
    };
  }, [agentId, farmId, socketUrl]);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Load agent details
  const loadAgentDetails = async () => {
    try {
      const response = await fetch(`/api/agents/${agentId}`);
      const data = await response.json();
      
      if (response.ok) {
        setAgentDetails(data);
      } else {
        console.error('Error loading agent details:', data.error);
      }
    } catch (error) {
      console.error('Error loading agent details:', error);
    }
  };

  // Add system message
  const addSystemMessage = (text: string, category: MessageCategory = 'command') => {
    const newMessage: Message = {
      id: `sys-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      text,
      source: 'system',
      timestamp: new Date(),
      category,
      origin: 'system'
    };
    
    setMessages(prev => [...prev, newMessage]);
  };

  // Handle command response
  const handleCommandResponse = (data: any) => {
    const newMessage: Message = {
      id: data.id || `res-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      text: data.message,
      source: 'agent',
      timestamp: new Date(data.timestamp || Date.now()),
      category: data.category || 'command',
      origin: data.origin || 'system',
      metadata: data.metadata
    };
    
    setMessages(prev => [...prev, newMessage]);
    setIsProcessing(false);
  };

  // Handle knowledge response
  const handleKnowledgeResponse = (data: any) => {
    const newMessage: Message = {
      id: data.id || `knw-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      text: data.content,
      source: 'agent',
      timestamp: new Date(data.timestamp || Date.now()),
      category: 'analysis',
      origin: 'knowledge-base',
      metadata: {
        title: data.title,
        tags: data.tags
      }
    };
    
    setMessages(prev => [...prev, newMessage]);
  };

  // Handle market update
  const handleMarketUpdate = (data: any) => {
    const newMessage: Message = {
      id: data.id || `mkt-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      text: data.message,
      source: 'system',
      timestamp: new Date(data.timestamp || Date.now()),
      category: 'analysis',
      origin: 'market-data',
      metadata: data.metadata
    };
    
    setMessages(prev => [...prev, newMessage]);
  };

  // Handle agent status
  const handleAgentStatus = (data: any) => {
    const newMessage: Message = {
      id: data.id || `agt-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      text: data.message,
      source: 'agent',
      timestamp: new Date(data.timestamp || Date.now()),
      category: data.isAlert ? 'alert' : 'analysis',
      origin: 'system',
      metadata: data.metadata
    };
    
    setMessages(prev => [...prev, newMessage]);
  };

  // Send message
  const sendMessage = async () => {
    if (!inputValue.trim() || isProcessing) return;
    
    const text = inputValue.trim();
    
    // Create user message
    const userMessage: Message = {
      id: `usr-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      text,
      source: 'user',
      timestamp: new Date(),
      category: 'command'
    };
    
    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsProcessing(true);
    
    // If websocket is connected, send via socket
    if (socket && isConnected) {
      socket.send(JSON.stringify({
        type: TRADING_EVENTS.COMMAND_SENT,
        agentId,
        message: text,
        timestamp: new Date().toISOString()
      }));
      
      // Simulate response for demo
      simulateResponse(text);
    } else {
      // Fallback to local processing
      processLocalCommand(text);
    }
  };

  // Process command locally when socket isn't available
  const processLocalCommand = async (text: string) => {
    // Check if this is a knowledge query
    if (text.toLowerCase().includes('what') || 
        text.toLowerCase().includes('how') || 
        text.toLowerCase().includes('why') ||
        text.toLowerCase().includes('explain')) {
      
      try {
        const result = await elizaClient.queryKnowledge(text, agentId);
        
        if (result.success && result.data && result.data.length > 0) {
          // Found knowledge
          const knowledgeItem = result.data[0];
          
          handleKnowledgeResponse({
            content: knowledgeItem.content,
            title: knowledgeItem.title,
            tags: knowledgeItem.tags,
            timestamp: new Date().toISOString()
          });
        } else {
          // No knowledge found
          handleCommandResponse({
            message: "I don't have specific information about that. Would you like me to search external sources?",
            category: 'query',
            origin: 'knowledge-base',
            timestamp: new Date().toISOString()
          });
        }
      } catch (error) {
        console.error('Error querying knowledge:', error);
        handleCommandResponse({
          message: "Sorry, I couldn't process your query at this time.",
          category: 'command',
          origin: 'system',
          timestamp: new Date().toISOString()
        });
      }
    } else {
      // Handle as a command
      simulateResponse(text);
    }
  };

  // Simulate response for demo purposes
  const simulateResponse = (text: string) => {
    setTimeout(() => {
      // Process command based on text
      const lowerText = text.toLowerCase();
      let response;
      
      if (lowerText.includes('status') || lowerText.includes('update')) {
        response = {
          message: "Agent is currently active and monitoring markets. No positions are open at this time. Current strategy: Mean Reversion with medium risk tolerance.",
          category: 'command',
          origin: 'system'
        };
      } else if (lowerText.includes('market') || lowerText.includes('analysis')) {
        response = {
          message: "Market Analysis: BTC is down 2.3% over the last 24 hours with increased volatility. ETH is showing bullish divergence on the 4-hour chart. Volume across major exchanges has increased 15% since yesterday.",
          category: 'analysis',
          origin: 'market-data',
          metadata: {
            btc_price: 67235.45,
            eth_price: 3482.12,
            market_sentiment: 'neutral',
            volatility_index: 65
          }
        };
      } else if (lowerText.includes('strategy')) {
        response = {
          message: "Current Strategy: Mean Reversion (Medium Risk). Parameters: lookback period = 14 days, entry threshold = 2 standard deviations, profit target = 1.5%, stop loss = 1%. Markets: BTC/USD, ETH/USD.",
          category: 'analysis',
          origin: 'strategy'
        };
      } else if (lowerText.includes('portfolio') || lowerText.includes('performance')) {
        response = {
          message: "Portfolio Performance: +3.2% MTD, +12.5% YTD. Current allocations: 60% BTC, 30% ETH, 10% Cash. Last trade: Sold 0.15 BTC at $66,450 (2023-03-25).",
          category: 'analysis',
          origin: 'system',
          metadata: {
            mtd_return: 3.2,
            ytd_return: 12.5,
            allocations: { BTC: 60, ETH: 30, CASH: 10 },
            last_trade: { symbol: 'BTC', action: 'SELL', amount: 0.15, price: 66450, date: '2023-03-25' }
          }
        };
      } else {
        response = {
          message: `I've processed your command: "${text}". Processing results will be available shortly.`,
          category: 'command',
          origin: 'system'
        };
      }
      
      handleCommandResponse({
        ...response,
        timestamp: new Date().toISOString()
      });
    }, 1500);
  };

  const getCategoryIcon = (category?: MessageCategory) => {
    switch (category) {
      case 'command':
        return <MessageCircle className="h-4 w-4" />;
      case 'query':
        return <FileText className="h-4 w-4" />;
      case 'analysis':
        return <TrendingUp className="h-4 w-4" />;
      case 'alert':
        return <AlertTriangle className="h-4 w-4" />;
      default:
        return <MessageCircle className="h-4 w-4" />;
    }
  };

  const getOriginIcon = (origin?: MessageOrigin) => {
    switch (origin) {
      case 'knowledge-base':
        return <Database className="h-4 w-4" />;
      case 'market-data':
        return <TrendingUp className="h-4 w-4" />;
      case 'strategy':
        return <MessageCircle className="h-4 w-4" />;
      case 'system':
        return <MessageCircle className="h-4 w-4" />;
      default:
        return <MessageCircle className="h-4 w-4" />;
    }
  };

  return (
    <div className="flex flex-col h-full border rounded-lg overflow-hidden bg-background">
      {/* Header */}
      <div className="px-4 py-3 border-b bg-muted flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className={`h-3 w-3 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
          <h3 className="font-medium">
            ElizaOS Command Console {agentDetails?.name ? `- ${agentDetails.name}` : ''}
          </h3>
        </div>
        <div className="text-xs text-muted-foreground">
          {isConnected ? 'Connected' : 'Disconnected'}
        </div>
      </div>
      
      {/* Quick Commands */}
      <div className="px-4 py-2 border-b flex overflow-x-auto gap-2 bg-background">
        {quickCommands.map((cmd, i) => (
          <button
            key={i}
            className="px-3 py-1.5 text-xs rounded-full bg-muted hover:bg-primary/10 whitespace-nowrap"
            onClick={() => {
              setInputValue(cmd);
              sendMessage();
            }}
          >
            {cmd}
          </button>
        ))}
      </div>
      
      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center text-muted-foreground">
              <Database className="mx-auto h-8 w-8 mb-2" />
              <p>No messages yet. Start by sending a command.</p>
            </div>
          </div>
        ) : (
          messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex ${msg.source === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[80%] rounded-lg px-4 py-2 ${
                  msg.source === 'user'
                    ? 'bg-primary text-primary-foreground'
                    : msg.source === 'system'
                    ? 'bg-muted text-muted-foreground'
                    : 'bg-card border'
                }`}
              >
                {msg.source !== 'user' && (
                  <div className="flex items-center gap-2 mb-1 text-xs text-muted-foreground">
                    {msg.origin && (
                      <span className="flex items-center gap-1">
                        {getOriginIcon(msg.origin)}
                        {msg.origin.charAt(0).toUpperCase() + msg.origin.slice(1).replace('-', ' ')}
                      </span>
                    )}
                    {msg.category && (
                      <span className="flex items-center gap-1">
                        {getCategoryIcon(msg.category)}
                        {msg.category.charAt(0).toUpperCase() + msg.category.slice(1)}
                      </span>
                    )}
                  </div>
                )}
                <div className="whitespace-pre-wrap">{msg.text}</div>
                <div className="text-xs mt-1 text-muted-foreground">
                  {new Date(msg.timestamp).toLocaleTimeString()}
                </div>
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>
      
      {/* Input */}
      <div className="p-4 border-t">
        <div className="flex items-center gap-2">
          <input
            type="text"
            className="flex-1 min-w-0 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            placeholder="Type a command or question..."
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendMessage();
              }
            }}
            disabled={isProcessing}
          />
          <button
            className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2"
            onClick={sendMessage}
            disabled={!inputValue.trim() || isProcessing}
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
