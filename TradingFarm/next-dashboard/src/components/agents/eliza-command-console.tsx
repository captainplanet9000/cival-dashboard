'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Avatar } from '@/components/ui/avatar';
import { agentMessagingService, ElizaCommandResponse } from '@/services/agent-messaging';
import { Loader2, Send, AlertCircle, Info, Brain, ChevronRight, Database, TrendingUp, Bot } from 'lucide-react';

type MessageType = 'command' | 'query' | 'response' | 'system' | 'error';
type SourceType = 'knowledge-base' | 'market-data' | 'strategy' | 'system' | 'user';

interface Message {
  id: string;
  content: string;
  type: MessageType;
  source: SourceType;
  timestamp: Date;
  metadata?: any;
}

interface ElizaCommandConsoleProps {
  agentId: string;
  agentName: string;
}

export function ElizaCommandConsole({ agentId, agentName }: ElizaCommandConsoleProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Load previous messages
    const loadMessages = async () => {
      const response = await agentMessagingService.getMessagesForAgent(agentId, 20, true);
      
      if (response.success && response.data) {
        const formattedMessages = response.data
          .filter(msg => msg.message_type === 'command' || msg.message_type === 'query' || 
                         msg.metadata?.is_response)
          .map(msg => ({
            id: msg.id,
            content: msg.content,
            type: msg.metadata?.is_response ? 'response' : 
                  msg.message_type === 'query' ? 'query' : 'command',
            source: msg.metadata?.source || 
                    (msg.sender_id === agentId ? 'system' : 'user'),
            timestamp: new Date(msg.timestamp),
            metadata: msg.metadata || {}
          }));
        
        setMessages(formattedMessages);
      }
      
      // Add welcome message if no messages exist
      if (!response.data || response.data.length === 0) {
        setMessages([
          {
            id: 'welcome',
            content: `Welcome to the ElizaOS Command Console. I'm ${agentName}, your trading agent. How can I assist you today?`,
            type: 'system',
            source: 'system',
            timestamp: new Date(),
            metadata: { welcome: true }
          }
        ]);
      }
    };
    
    loadMessages();
    
    // Subscribe to ElizaOS events
    const unsubscribe = agentMessagingService.subscribeToElizaEvents(
      agentId,
      (response) => {
        handleElizaResponse(response);
      }
    );
    
    return () => {
      unsubscribe();
    };
  }, [agentId, agentName]);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight;
    }
  }, [messages]);

  const handleElizaResponse = (response: ElizaCommandResponse) => {
    setMessages(prevMessages => [
      ...prevMessages,
      {
        id: response.id,
        content: response.content,
        type: response.type === 'ERROR_RESPONSE' ? 'error' : 'response',
        source: response.source,
        timestamp: new Date(response.timestamp),
        metadata: response.metadata
      }
    ]);
    
    setIsLoading(false);
  };

  const handleInputSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!inputText.trim() || isLoading) return;
    
    const isQuery = inputText.trim().endsWith('?') || 
                   inputText.toLowerCase().startsWith('what') ||
                   inputText.toLowerCase().startsWith('how') ||
                   inputText.toLowerCase().startsWith('why');
    
    // Add user message to the list
    const userMessage: Message = {
      id: `user-${Date.now()}`,
      content: inputText,
      type: isQuery ? 'query' : 'command',
      source: 'user',
      timestamp: new Date()
    };
    
    setMessages(prev => [...prev, userMessage]);
    setInputText('');
    setIsLoading(true);
    
    // Send command to agent
    try {
      await agentMessagingService.sendElizaCommand(
        agentId,
        inputText,
        { messageId: userMessage.id }
      );
      
      // The response will be handled by the subscription
      
    } catch (error) {
      console.error('Error sending command:', error);
      
      // Add error message
      setMessages(prev => [
        ...prev,
        {
          id: `error-${Date.now()}`,
          content: 'There was an error processing your command. Please try again.',
          type: 'error',
          source: 'system',
          timestamp: new Date()
        }
      ]);
      
      setIsLoading(false);
    }
    
    // Focus input after sending
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  // Get icon based on message source
  const getSourceIcon = (source: SourceType) => {
    switch (source) {
      case 'knowledge-base':
        return <Database className="h-4 w-4" />;
      case 'market-data':
        return <TrendingUp className="h-4 w-4" />;
      case 'strategy':
        return <ChevronRight className="h-4 w-4" />;
      case 'system':
        return <Bot className="h-4 w-4" />;
      case 'user':
        return null;
      default:
        return <Info className="h-4 w-4" />;
    }
  };

  // Get color based on message type
  const getTypeColor = (type: MessageType) => {
    switch (type) {
      case 'command':
        return 'bg-blue-500';
      case 'query':
        return 'bg-purple-500';
      case 'response':
        return 'bg-green-500';
      case 'system':
        return 'bg-slate-500';
      case 'error':
        return 'bg-red-500';
      default:
        return 'bg-gray-500';
    }
  };

  // Auto-suggest commands
  const suggestedCommands = [
    "Start trading session",
    "Monitor market conditions",
    "What's the current performance?",
    "Show recent trading activity",
    "Analyze current strategy",
    "Adjust risk parameters"
  ];

  return (
    <Card className="w-full h-[calc(100vh-12rem)]">
      <CardHeader className="py-3">
        <CardTitle className="text-lg flex items-center">
          <Brain className="w-5 h-5 mr-2" />
          ElizaOS Command Console
        </CardTitle>
      </CardHeader>
      
      <ScrollArea ref={scrollAreaRef} className="h-[calc(100%-8rem)] p-4">
        <CardContent className="space-y-4 pb-4">
          {messages.map((message, i) => (
            <div 
              key={message.id} 
              className={`flex ${message.source === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div 
                className={`rounded-lg p-3 max-w-[80%] ${
                  message.source === 'user' 
                    ? 'bg-primary text-primary-foreground' 
                    : 'bg-muted'
                }`}
              >
                {message.source !== 'user' && (
                  <div className="flex items-center mb-1 space-x-1">
                    <Avatar className="w-6 h-6">
                      <div className="flex items-center justify-center text-xs">
                        {agentName.substring(0, 2).toUpperCase()}
                      </div>
                    </Avatar>
                    <span className="text-xs font-medium">{agentName}</span>
                    <Badge variant="outline" className="ml-2 text-xs flex items-center gap-1">
                      {getSourceIcon(message.source)}
                      {message.source}
                    </Badge>
                  </div>
                )}
                
                <div className="text-sm whitespace-pre-wrap">{message.content}</div>
                
                <div className="mt-1 flex justify-between items-center">
                  <Badge 
                    variant="secondary" 
                    className={`text-[10px] ${getTypeColor(message.type)} text-white`}
                  >
                    {message.type}
                  </Badge>
                  <span className="text-[10px] opacity-70">
                    {message.timestamp.toLocaleTimeString()}
                  </span>
                </div>
              </div>
            </div>
          ))}
          
          {isLoading && (
            <div className="flex justify-start">
              <div className="rounded-lg p-3 bg-muted">
                <div className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span className="text-sm">Processing...</span>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </ScrollArea>
      
      <div className="px-4 pt-0 pb-1">
        <div className="flex flex-wrap gap-1 mb-2">
          {suggestedCommands.map((cmd, i) => (
            <Badge 
              key={i} 
              variant="outline" 
              className="cursor-pointer hover:bg-secondary"
              onClick={() => setInputText(cmd)}
            >
              {cmd}
            </Badge>
          ))}
        </div>
      </div>
      
      <CardFooter>
        <form onSubmit={handleInputSubmit} className="w-full flex space-x-2">
          <Input
            ref={inputRef}
            type="text"
            placeholder="Enter a command or ask a question..."
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            disabled={isLoading}
            className="flex-1"
          />
          <Button type="submit" disabled={isLoading || !inputText.trim()}>
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </form>
      </CardFooter>
    </Card>
  );
}
