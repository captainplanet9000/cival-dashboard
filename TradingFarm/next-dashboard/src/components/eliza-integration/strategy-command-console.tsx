'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { SendHorizontal, ChevronDown, Bot, TerminalSquare, BookOpen, AlertTriangle } from 'lucide-react';
import { Node, Edge } from 'reactflow';
import { useWebSocket } from '@/components/websocket-provider';
import { WebSocketTopic } from '@/services/websocket-service';

interface StrategyCommandConsoleProps {
  strategyId?: string;
  strategyName: string;
  nodes?: Node[];
  edges?: Edge[];
}

type MessageType = 'command' | 'query' | 'analysis' | 'alert';
type MessageSource = 'knowledge-base' | 'market-data' | 'strategy' | 'system';

interface Message {
  id: string;
  content: string;
  timestamp: string;
  type: MessageType;
  source?: MessageSource;
  isResponse?: boolean;
}

export default function StrategyCommandConsole({ 
  strategyId, 
  strategyName,
  nodes,
  edges
}: StrategyCommandConsoleProps) {
  const [messages, setMessages] = React.useState<Message[]>([]);
  const [inputValue, setInputValue] = React.useState('');
  const [isProcessing, setIsProcessing] = React.useState(false);
  const messagesEndRef = React.useRef<HTMLDivElement | null>(null);
  const { sendMessage, lastMessage, isConnected } = useWebSocket();
  
  // Generate welcome message
  React.useEffect(() => {
    const welcomeMsg: Message = {
      id: `welcome-${Date.now()}`,
      content: `Welcome to ElizaOS Command Console for "${strategyName}". You can issue commands to analyze, optimize, and manage this trading strategy.`,
      timestamp: new Date().toISOString(),
      type: 'system',
      source: 'system',
      isResponse: true
    };
    
    const helpMsg: Message = {
      id: `help-${Date.now()}`,
      content: 'Try commands like: "analyze strategy", "optimize parameters", "backtest strategy", or "show performance metrics".',
      timestamp: new Date().toISOString(),
      type: 'system',
      source: 'system',
      isResponse: true
    };
    
    setMessages([welcomeMsg, helpMsg]);
  }, [strategyName]);
  
  // Listen for WebSocket responses
  React.useEffect(() => {
    if (lastMessage && lastMessage[WebSocketTopic.SYSTEM]) {
      const response = lastMessage[WebSocketTopic.SYSTEM];
      if (response.command === 'COMMAND_RESPONSE' || response.command === 'KNOWLEDGE_RESPONSE') {
        const newMessage: Message = {
          id: `response-${Date.now()}`,
          content: response.content,
          timestamp: new Date().toISOString(),
          type: response.type || 'analysis',
          source: response.source || 'system',
          isResponse: true
        };
        
        setMessages(prev => [...prev, newMessage]);
        setIsProcessing(false);
        
        // Auto-scroll to bottom
        setTimeout(() => {
          messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }, 100);
      }
    }
  }, [lastMessage]);
  
  // Handle sending commands
  const handleSendCommand = () => {
    if (!inputValue.trim() || isProcessing) return;
    
    // Create user message
    const userMessage: Message = {
      id: `user-${Date.now()}`,
      content: inputValue,
      timestamp: new Date().toISOString(),
      type: 'command',
      isResponse: false
    };
    
    setMessages(prev => [...prev, userMessage]);
    setIsProcessing(true);
    
    // Send command via WebSocket
    sendMessage(WebSocketTopic.SYSTEM, {
      command: 'EXECUTE_COMMAND',
      content: inputValue,
      context: {
        strategyId,
        strategyName,
        strategyData: nodes && edges ? {
          nodes,
          edges
        } : null
      }
    });
    
    setInputValue('');
    
    // Auto-scroll to bottom
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };
  
  // Handle key press (Enter to send)
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendCommand();
    }
  };
  
  // Render message based on type
  const renderMessage = (message: Message) => {
    const isUserMessage = !message.isResponse;
    
    const messageClass = isUserMessage
      ? 'bg-primary/10 ml-8'
      : 'bg-muted mr-8';
    
    // Icon based on message type
    let Icon = TerminalSquare;
    if (message.type === 'alert') {
      Icon = AlertTriangle;
    } else if (message.type === 'query' || message.type === 'analysis') {
      Icon = BookOpen;
    } else if (message.type === 'system') {
      Icon = Bot;
    }
    
    return (
      <div 
        key={message.id} 
        className={`mb-4 p-3 rounded-lg ${messageClass}`}
      >
        <div className="flex items-start">
          <div className={`p-2 rounded-full ${isUserMessage ? 'bg-primary/20' : 'bg-muted-foreground/20'} mr-2`}>
            {isUserMessage ? (
              <TerminalSquare size={16} />
            ) : (
              <Icon size={16} />
            )}
          </div>
          <div className="flex-1">
            <p className="whitespace-pre-wrap">{message.content}</p>
            <div className="text-xs text-muted-foreground mt-1">
              {new Date(message.timestamp).toLocaleTimeString()}
              {message.source && !isUserMessage && (
                <span className="ml-2">Source: {message.source}</span>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };
  
  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="border-b py-3">
        <CardTitle className="text-lg flex items-center">
          <Bot className="mr-2 h-5 w-5" />
          ElizaOS Command Console
          <div className="ml-auto flex items-center space-x-2">
            <div className={`h-2 w-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
            <span className="text-xs text-muted-foreground">
              {isConnected ? 'Connected' : 'Disconnected'}
            </span>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0 flex-1 flex flex-col">
        <div className="flex-1 overflow-y-auto p-4">
          {messages.map(renderMessage)}
          <div ref={messagesEndRef} />
        </div>
        <div className="p-3 border-t">
          <div className="flex items-center space-x-2">
            <Input
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyPress}
              placeholder="Type a command or question..."
              disabled={isProcessing || !isConnected}
              className="flex-1"
            />
            <Button 
              onClick={handleSendCommand} 
              disabled={isProcessing || !inputValue.trim() || !isConnected}
              size="icon"
            >
              <SendHorizontal size={18} />
            </Button>
          </div>
          {isProcessing && (
            <p className="text-xs text-muted-foreground animate-pulse mt-1">ElizaOS is processing...</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
