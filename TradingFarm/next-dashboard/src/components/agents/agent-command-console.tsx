"use client";

import { useState, useEffect, useRef } from 'react';
import { useSocket } from '@/providers/socket-provider';
import { TRADING_EVENTS } from '@/constants/socket-events';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/use-toast';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Bot, Send, Cpu, BarChart4, Coins, Zap, History, Brain } from 'lucide-react';

interface AgentCommandConsoleProps {
  agentId: string;
  agentName?: string;
}

type MessageCategory = 'command' | 'query' | 'analysis' | 'alert';
type MessageSource = 'knowledge-base' | 'market-data' | 'strategy' | 'system';

interface CommandMessage {
  id: string;
  content: string;
  type: 'user' | 'agent' | 'system';
  timestamp: Date;
  isProcessing?: boolean;
  metadata?: {
    category?: MessageCategory;
    source?: MessageSource;
  };
}

export function AgentCommandConsole({ agentId, agentName = 'Trading Agent' }: AgentCommandConsoleProps) {
  const { socket } = useSocket();
  const { toast } = useToast();
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<CommandMessage[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    // Initial system message
    setMessages([
      {
        id: 'welcome',
        content: `Trading Agent Console initialized. Agent "${agentName}" is ready to receive commands.`,
        type: 'system',
        timestamp: new Date(),
        metadata: {
          category: 'command',
          source: 'system'
        }
      }
    ]);
    
    // Set up socket listeners
    if (socket) {
      socket.on(TRADING_EVENTS.COMMAND_RESPONSE, handleCommandResponse);
      socket.on(TRADING_EVENTS.KNOWLEDGE_RESPONSE, handleKnowledgeResponse);
      socket.on(TRADING_EVENTS.CONNECT, () => {
        console.log('Socket connected to agent command console');
      });
      socket.on(TRADING_EVENTS.ERROR, (error) => {
        console.error('Socket error in agent command console:', error);
        toast({
          title: 'Connection Error',
          description: 'Failed to connect to command service. Retrying...',
          variant: 'destructive',
        });
      });
    }
    
    return () => {
      if (socket) {
        socket.off(TRADING_EVENTS.COMMAND_RESPONSE, handleCommandResponse);
        socket.off(TRADING_EVENTS.KNOWLEDGE_RESPONSE, handleKnowledgeResponse);
        socket.off(TRADING_EVENTS.CONNECT);
        socket.off(TRADING_EVENTS.ERROR);
      }
    };
  }, [socket, agentId, agentName, toast]);
  
  useEffect(() => {
    scrollToBottom();
  }, [messages]);
  
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };
  
  const handleCommandResponse = (data: any) => {
    if (data.agentId === agentId) {
      // Update the processing message to completed
      setMessages(prev => prev.map(msg => 
        msg.isProcessing ? {
          ...msg,
          isProcessing: false,
          content: data.response,
          metadata: {
            ...msg.metadata,
            category: data.category || msg.metadata?.category,
            source: data.source || msg.metadata?.source
          }
        } : msg
      ));
      
      setIsProcessing(false);
    }
  };
  
  const handleKnowledgeResponse = (data: any) => {
    if (data.agentId === agentId) {
      setMessages(prev => [
        ...prev,
        {
          id: `knowledge-${Date.now()}`,
          content: data.response,
          type: 'agent',
          timestamp: new Date(),
          metadata: {
            category: 'analysis',
            source: 'knowledge-base'
          }
        }
      ]);
    }
  };
  
  const sendCommand = () => {
    if (!input.trim() || isProcessing) return;
    
    // Add user message
    const userMessage: CommandMessage = {
      id: `user-${Date.now()}`,
      content: input,
      type: 'user',
      timestamp: new Date()
    };
    
    // Add processing message from agent
    const processingMessage: CommandMessage = {
      id: `agent-${Date.now()}`,
      content: 'Processing...',
      type: 'agent',
      timestamp: new Date(),
      isProcessing: true,
      metadata: {
        category: 'command',
        source: determineCommandSource(input)
      }
    };
    
    setMessages(prev => [...prev, userMessage, processingMessage]);
    setInput('');
    setIsProcessing(true);
    
    // Send command to server via socket
    if (socket) {
      socket.emit(TRADING_EVENTS.AGENT_COMMAND, {
        agentId,
        command: input
      });
    } else {
      // Simulate response if socket is not available
      simulateResponse(input);
    }
  };
  
  const determineCommandSource = (command: string): MessageSource => {
    const commandLower = command.toLowerCase();
    if (commandLower.includes('market') || commandLower.includes('price')) return 'market-data';
    if (commandLower.includes('strategy') || commandLower.includes('trade')) return 'strategy';
    if (commandLower.includes('what') || commandLower.includes('how') || commandLower.includes('why')) return 'knowledge-base';
    return 'system';
  };
  
  const simulateResponse = (command: string) => {
    // For demo purposes, simulate responses
    setTimeout(() => {
      let response = '';
      
      const commandLower = command.toLowerCase();
      
      if (commandLower.includes('status')) {
        response = 'Agent status: ACTIVE\nPerforming normally with 94% uptime over the last 24 hours.\nNo critical alerts detected.';
      } else if (commandLower.includes('market') || commandLower.includes('price')) {
        response = 'Current market data:\nBTC/USDT: $43,287.65 (+2.4%)\nETH/USDT: $2,356.21 (+1.2%)\nMarket sentiment: Bullish (65%)\nVolatility index: Medium';
      } else if (commandLower.includes('performance')) {
        response = 'Performance metrics:\nTotal PnL: +8.7%\nWin rate: 64%\nAvg trade duration: 4.2 hours\nDrawdown: 3.8% (within acceptable parameters)';
      } else if (commandLower.includes('trade')) {
        response = 'Recent trades:\n1. BTC/USDT - BUY @ $42,150 - OPEN\n2. ETH/USDT - SELL @ $2,380 - CLOSED (+1.2%)\n3. SOL/USDT - BUY @ $142.50 - CLOSED (-0.8%)';
      } else if (commandLower.includes('strategy')) {
        response = 'Currently using: Trend following strategy\nTimeframes: 15m, 1h, 4h\nPrimary indicators: RSI, MACD, Moving Averages\nRisk level: 3/5';
      } else if (commandLower.includes('update') || commandLower.includes('change')) {
        response = 'Command received. Strategy parameters updated successfully.\nNew configuration has been applied and will be used for future trades.';
      } else if (commandLower.includes('explain') || commandLower.includes('what') || commandLower.includes('how')) {
        response = 'Based on the ElizaOS knowledge base:\n\nThe current strategy uses trend following techniques across multiple timeframes (15m, 1h, 4h) to identify strong directional movements. Entry points are determined by RSI confirmation combined with MACD crossovers, while exits are managed with trailing stops at key Moving Average support/resistance levels.';
      } else {
        response = `Command "${command}" processed. The system has acknowledged your request and will take appropriate action based on the current context and strategy parameters.`;
      }
      
      handleCommandResponse({
        agentId,
        response,
        category: commandLower.includes('what') || commandLower.includes('explain') ? 'analysis' : 'command',
        source: determineCommandSource(command)
      });
    }, 1500);
  };
  
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendCommand();
    }
  };
  
  const getQuickCommand = (command: string) => {
    setInput(command);
  };
  
  const getMessageStyles = (message: CommandMessage) => {
    const baseStyles = "p-3 rounded-lg mb-2 max-w-[85%]";
    
    switch (message.type) {
      case 'user':
        return `${baseStyles} bg-primary text-primary-foreground self-end`;
      case 'agent':
        if (message.isProcessing) {
          return `${baseStyles} bg-muted text-muted-foreground self-start animate-pulse`;
        }
        return `${baseStyles} bg-card border self-start`;
      case 'system':
        return `${baseStyles} bg-muted text-muted-foreground text-xs self-center max-w-full text-center`;
      default:
        return baseStyles;
    }
  };
  
  const renderMessageContent = (message: CommandMessage) => {
    if (message.isProcessing) {
      return <span className="flex items-center">Processing request <span className="loading-dots ml-1"></span></span>;
    }
    
    // For system messages or simple content, just render the text
    if (message.type === 'system' || !message.metadata) {
      return message.content;
    }
    
    // For agent responses with metadata, render formatted content
    return (
      <div className="space-y-1">
        {message.metadata.category === 'analysis' && (
          <Badge variant="outline" className="mb-1 bg-blue-50 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300 border-blue-200 dark:border-blue-800">
            <Brain className="h-3 w-3 mr-1" /> Knowledge Analysis
          </Badge>
        )}
        
        {message.metadata.source === 'market-data' && (
          <Badge variant="outline" className="mb-1 bg-green-50 text-green-800 dark:bg-green-900/20 dark:text-green-300 border-green-200 dark:border-green-800">
            <BarChart4 className="h-3 w-3 mr-1" /> Market Data
          </Badge>
        )}
        
        {message.metadata.source === 'strategy' && (
          <Badge variant="outline" className="mb-1 bg-purple-50 text-purple-800 dark:bg-purple-900/20 dark:text-purple-300 border-purple-200 dark:border-purple-800">
            <Cpu className="h-3 w-3 mr-1" /> Strategy
          </Badge>
        )}
        
        {message.content.split('\n').map((line, index) => (
          <div key={index}>{line}</div>
        ))}
      </div>
    );
  };
  
  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center">
          <Bot className="h-5 w-5 mr-2" />
          ElizaOS Command Console
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-grow flex flex-col p-0">
        <div className="px-4 pb-2 border-b flex items-center space-x-2 overflow-x-auto">
          <Button 
            variant="ghost" 
            size="sm" 
            className="text-xs whitespace-nowrap" 
            onClick={() => getQuickCommand("status")}
          >
            <Zap className="h-3 w-3 mr-1" />
            Status
          </Button>
          <Button 
            variant="ghost" 
            size="sm" 
            className="text-xs whitespace-nowrap" 
            onClick={() => getQuickCommand("performance report")}
          >
            <BarChart4 className="h-3 w-3 mr-1" />
            Performance
          </Button>
          <Button 
            variant="ghost" 
            size="sm" 
            className="text-xs whitespace-nowrap" 
            onClick={() => getQuickCommand("recent trades")}
          >
            <History className="h-3 w-3 mr-1" />
            Trades
          </Button>
          <Button 
            variant="ghost" 
            size="sm" 
            className="text-xs whitespace-nowrap" 
            onClick={() => getQuickCommand("market analysis")}
          >
            <Coins className="h-3 w-3 mr-1" />
            Market
          </Button>
          <Button 
            variant="ghost" 
            size="sm" 
            className="text-xs whitespace-nowrap" 
            onClick={() => getQuickCommand("explain current strategy")}
          >
            <Brain className="h-3 w-3 mr-1" />
            Knowledge
          </Button>
        </div>
        
        <div className="flex-grow overflow-y-auto p-4 flex flex-col space-y-2">
          {messages.map(message => (
            <div 
              key={message.id} 
              className={`${getMessageStyles(message)} ${message.type === 'system' ? 'mx-auto' : ''}`}
            >
              {message.type === 'agent' && !message.isProcessing && (
                <div className="flex items-center mb-1">
                  <Avatar className="h-5 w-5 mr-1">
                    <AvatarFallback className="text-[10px]">{agentName.charAt(0)}</AvatarFallback>
                  </Avatar>
                  <span className="text-xs font-medium">{agentName}</span>
                  <span className="text-xs text-muted-foreground ml-auto">
                    {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              )}
              
              {message.type === 'user' && (
                <div className="flex items-center mb-1 justify-end">
                  <span className="text-xs text-primary-foreground ml-auto">
                    {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              )}
              
              <div className="whitespace-pre-line">
                {renderMessageContent(message)}
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>
        
        <div className="p-4 border-t mt-auto">
          <div className="flex space-x-2">
            <Input
              placeholder="Type command or question..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={isProcessing}
              className="flex-grow"
            />
            <Button onClick={sendCommand} disabled={!input.trim() || isProcessing}>
              <Send className="h-4 w-4" />
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            Type commands or natural language queries for the agent.
            Try "status", "performance", or "explain strategy".
          </p>
        </div>
      </CardContent>
      
      <style jsx global>{`
        .loading-dots:after {
          content: '';
          animation: loading 1.5s infinite;
        }
        
        @keyframes loading {
          0% { content: ''; }
          25% { content: '.'; }
          50% { content: '..'; }
          75% { content: '...'; }
          100% { content: ''; }
        }
      `}</style>
    </Card>
  );
}
