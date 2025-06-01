'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Loader2, Send, Bot, User, Info, AlertCircle, Command, Zap, ArrowRight, BarChart2, Brain, Database } from 'lucide-react';
import { websocketConfig } from "@/config/app-config";
import { createBrowserClient } from '@/utils/supabase/client';

// Define trading events constants
const TRADING_EVENTS = {
  COMMAND_REQUEST: 'command_request',
  COMMAND_RESPONSE: 'command_response',
  KNOWLEDGE_REQUEST: 'knowledge_request',
  KNOWLEDGE_RESPONSE: 'knowledge_response',
  MARKET_UPDATE: 'market_update',
  TRADE_EXECUTION: 'trade_execution',
  PORTFOLIO_UPDATE: 'portfolio_update',
  AGENT_STATUS: 'agent_status'
};

type MessageType = 'command' | 'query' | 'analysis' | 'alert';
type MessageSource = 'knowledge-base' | 'market-data' | 'strategy' | 'system';

interface Message {
  id: string;
  content: string;
  timestamp: Date;
  type: MessageType;
  source?: MessageSource;
  isUser: boolean;
  isLoading?: boolean;
  metadata?: any;
}

export const CommandCenter: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const socketRef = useRef<WebSocket | null>(null);
  const supabase = createBrowserClient();

  // Scroll to bottom of messages
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    // Generate a welcome message
    setMessages([
      {
        id: '0',
        content: "Welcome to the ElizaOS Command Center. How can I assist you with your trading today?",
        timestamp: new Date(),
        type: 'command',
        source: 'system',
        isUser: false
      }
    ]);

    // Initialize WebSocket connection
    const connectWebSocket = () => {
      try {
        const wsUrl = websocketConfig.url || 'ws://localhost:3002';
        const socket = new WebSocket(wsUrl);
        socketRef.current = socket;

        socket.onopen = () => {
          console.log('WebSocket connection established');
          setIsConnected(true);
        };

        socket.onmessage = (event) => {
          const data = JSON.parse(event.data);
          console.log('WebSocket message received:', data);

          handleSocketEvent(data);
        };

        socket.onerror = (error) => {
          console.error('WebSocket error:', error);
          setIsConnected(false);
        };

        socket.onclose = () => {
          console.log('WebSocket connection closed');
          setIsConnected(false);
          // Attempt to reconnect after a delay
          setTimeout(connectWebSocket, 5000);
        };

        return socket;
      } catch (error) {
        console.error('Failed to connect to WebSocket:', error);
        setIsConnected(false);
        // Simulate responses if we can't connect
        simulateResponses();
        return null;
      }
    };

    const socket = connectWebSocket();

    // Cleanup on unmount
    return () => {
      if (socket) {
        socket.close();
      }
    };
  }, []);

  const handleSocketEvent = (data: any) => {
    if (!data.event) return;

    switch (data.event) {
      case TRADING_EVENTS.COMMAND_RESPONSE:
        addMessage({
          id: data.id || generateId(),
          content: data.message || data.content,
          timestamp: new Date(),
          type: data.messageType || 'command',
          source: data.source || 'system',
          isUser: false,
          metadata: data.metadata
        });
        setIsLoading(false);
        break;

      case TRADING_EVENTS.KNOWLEDGE_RESPONSE:
        addMessage({
          id: data.id || generateId(),
          content: data.content,
          timestamp: new Date(),
          type: 'analysis',
          source: 'knowledge-base',
          isUser: false,
          metadata: data.metadata
        });
        setIsLoading(false);
        break;

      case TRADING_EVENTS.MARKET_UPDATE:
        // Handle market update event
        break;

      case TRADING_EVENTS.TRADE_EXECUTION:
        // Handle trade execution event
        break;

      default:
        console.log('Unhandled event type:', data.event);
    }
  };

  const simulateResponses = () => {
    // This function simulates websocket responses for demonstration purposes
    console.log('Using simulated response mode');
  };

  const simulateResponse = (userQuery: string) => {
    // Simulate a response based on the user's query
    setIsLoading(true);
    
    // Analyze the query to determine the type of response
    const query = userQuery.toLowerCase();
    
    // Determine response based on query keywords
    setTimeout(() => {
      let responseContent = '';
      let messageType: MessageType = 'command';
      let messageSource: MessageSource = 'system';
      
      if (query.includes('market') || query.includes('price') || query.includes('btc') || query.includes('bitcoin')) {
        responseContent = "Bitcoin is currently trading at $132,456.78, up 2.3% in the last 24 hours. The market sentiment is bullish with strong buying pressure.";
        messageType = 'analysis';
        messageSource = 'market-data';
      } 
      else if (query.includes('strategy') || query.includes('algorithm')) {
        responseContent = "Your current active strategies are: EMA Crossover (performing +12.5%), RSI Reversal (+8.2%), and News Sentiment (+9.1%). Would you like to modify any of these strategies?";
        messageType = 'command';
        messageSource = 'strategy';
      }
      else if (query.includes('portfolio') || query.includes('balance') || query.includes('asset')) {
        responseContent = "Your portfolio currently contains: 0.5 BTC, 8.2 ETH, 120 SOL, and 25,000 USDT. Total value: $178,523.45, up 3.2% since yesterday.";
        messageType = 'analysis';
        messageSource = 'system';
      }
      else if (query.includes('explain') || query.includes('how') || query.includes('what is')) {
        responseContent = "I've retrieved the following information from the knowledge base: " + 
          "The concept you're asking about refers to a trading strategy that utilizes price action and volume analysis to identify potential market reversals. It's particularly effective in volatile markets where traditional indicators may lag.";
        messageType = 'analysis';
        messageSource = 'knowledge-base';
      }
      else if (query.includes('alert') || query.includes('warning')) {
        responseContent = "⚠️ ALERT: Unusual volatility detected in ETH/USDT. Your active trades may be affected. Would you like me to adjust your stop-loss levels?";
        messageType = 'alert';
        messageSource = 'system';
      }
      else {
        responseContent = "I understand your request about '" + userQuery + "'. Based on the current market conditions and your trading parameters, I recommend monitoring the BTC/USDT pair closely as it approaches a key resistance level.";
        messageType = 'command';
        messageSource = 'system';
      }
      
      addMessage({
        id: generateId(),
        content: responseContent,
        timestamp: new Date(),
        type: messageType,
        source: messageSource,
        isUser: false
      });
      
      setIsLoading(false);
    }, 1000);
  };

  const handleSendMessage = () => {
    if (!input.trim()) return;
    
    const userMessage: Message = {
      id: generateId(),
      content: input,
      timestamp: new Date(),
      type: 'command',
      isUser: true
    };
    
    addMessage(userMessage);
    setInput('');
    
    // Show loading message
    setIsLoading(true);
    
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      // Send to WebSocket if connected
      socketRef.current.send(JSON.stringify({
        event: TRADING_EVENTS.COMMAND_REQUEST,
        command: input,
        timestamp: new Date().toISOString()
      }));
    } else {
      // Simulate response if not connected
      simulateResponse(input);
    }
  };

  const sendQuickCommand = (command: string) => {
    setInput(command);
    setTimeout(() => {
      handleSendMessage();
    }, 100);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const addMessage = (message: Message) => {
    setMessages(prev => [...prev, message]);
  };

  const generateId = () => {
    return Math.random().toString(36).substring(2, 11);
  };

  const getMessageColorClass = (message: Message) => {
    if (message.isUser) return 'bg-primary text-primary-foreground';
    
    if (message.type === 'alert') return 'bg-destructive text-destructive-foreground';
    if (message.type === 'analysis') return 'bg-muted';
    
    return 'bg-secondary';
  };

  const getSourceIcon = (source?: MessageSource) => {
    switch (source) {
      case 'knowledge-base':
        return <Database className="h-4 w-4" />;
      case 'market-data':
        return <BarChart2 className="h-4 w-4" />;
      case 'strategy':
        return <Brain className="h-4 w-4" />;
      case 'system':
      default:
        return <Command className="h-4 w-4" />;
    }
  };

  return (
    <div className="flex flex-col h-[70vh]">
      {!isConnected && (
        <Alert variant="destructive" className="mb-4">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Connection Error</AlertTitle>
          <AlertDescription>
            Unable to connect to the ElizaOS server. Using simulated responses.
          </AlertDescription>
        </Alert>
      )}
      
      <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
        <Button variant="outline" size="sm" onClick={() => sendQuickCommand("What's the current BTC price?")}>
          <Zap className="mr-2 h-4 w-4" />
          BTC Price
        </Button>
        <Button variant="outline" size="sm" onClick={() => sendQuickCommand("Show my portfolio summary")}>
          <BarChart2 className="mr-2 h-4 w-4" />
          Portfolio
        </Button>
        <Button variant="outline" size="sm" onClick={() => sendQuickCommand("List active agents")}>
          <Bot className="mr-2 h-4 w-4" />
          Agents
        </Button>
        <Button variant="outline" size="sm" onClick={() => sendQuickCommand("Explain RSI strategy")}>
          <Info className="mr-2 h-4 w-4" />
          Strategies
        </Button>
      </div>
      
      <Card className="flex-1 mb-4">
        <CardContent className="p-4 h-full">
          <ScrollArea className="h-full pr-4">
            <div className="space-y-4">
              {messages.map((message) => (
                <div 
                  key={message.id}
                  className={`flex ${message.isUser ? 'justify-end' : 'justify-start'}`}
                >
                  <div className={`flex max-w-[80%] ${message.isUser ? 'flex-row-reverse' : 'flex-row'}`}>
                    <Avatar className={`h-8 w-8 ${message.isUser ? 'ml-2' : 'mr-2'}`}>
                      <AvatarFallback>
                        {message.isUser ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <div className={`rounded-lg px-3 py-2 ${getMessageColorClass(message)}`}>
                        {message.content}
                      </div>
                      <div className={`flex text-xs text-muted-foreground mt-1 ${message.isUser ? 'justify-end' : 'justify-start'}`}>
                        {!message.isUser && message.source && (
                          <Badge variant="outline" className="mr-2 text-xs">
                            <div className="flex items-center">
                              {getSourceIcon(message.source)}
                              <span className="ml-1">{message.source}</span>
                            </div>
                          </Badge>
                        )}
                        <span>{message.timestamp.toLocaleTimeString()}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
              
              {isLoading && (
                <div className="flex justify-start">
                  <div className="flex max-w-[80%] flex-row">
                    <Avatar className="h-8 w-8 mr-2">
                      <AvatarFallback>
                        <Bot className="h-4 w-4" />
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="rounded-lg px-3 py-2 bg-secondary">
                        <Loader2 className="h-4 w-4 animate-spin" />
                      </div>
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
      
      <div className="flex">
        <Input
          placeholder="Type a command or question..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          className="flex-1 mr-2"
        />
        <Button onClick={handleSendMessage} disabled={isLoading || !input.trim()}>
          {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        </Button>
      </div>
    </div>
  );
};
