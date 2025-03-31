'use client';

import React from 'react';
const { useState, useRef, useEffect } = React;
import { useSocket } from '@/providers/socket-provider';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/components/ui/use-toast';
import {
  Brain,
  Send,
  Zap,
  Database,
  BookOpen,
  BarChart,
  Bell,
  Clock,
  Sparkles,
  Link,
  Clipboard,
  X,
  Download,
  RefreshCw,
  Type
} from 'lucide-react';
import { format } from 'date-fns/format';
import { createBrowserClient } from '@/utils/supabase/client';
import { ConsoleMessage, MessageCategory, MessageSource, ExtendedDatabase } from '@/types/elizaos.types';
import { SupabaseClient } from '@supabase/supabase-js';

interface CommandConsoleProps {
  farmId: string;
  agentId?: string;
  height?: string;
  showHeader?: boolean;
  placeholder?: string;
  title?: string;
  description?: string;
  autoFocus?: boolean;
  initialMessages?: ConsoleMessage[];
}

export default function CommandConsole({
  farmId,
  agentId,
  height = '500px',
  showHeader = true,
  placeholder = 'Type a command or question...',
  title = 'ElizaOS Command Console',
  description = 'Interact with your trading AI assistant',
  autoFocus = true,
  initialMessages = []
}: CommandConsoleProps) {
  const [messages, setMessages] = useState<ConsoleMessage[]>(initialMessages);
  const [input, setInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const { toast } = useToast();
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const supabase = createBrowserClient() as SupabaseClient<ExtendedDatabase>;
  
  const { isConnected, send, latestMessages, subscribe, unsubscribe } = useSocket();
  
  // Subscribe to relevant channels on mount
  useEffect(() => {
    // Subscribe to farm-specific ElizaOS channels
    const roomName = `farm:${farmId}:elizaos`;
    subscribe(roomName);
    
    // If agent specified, subscribe to agent-specific channel
    if (agentId) {
      subscribe(`agent:${agentId}`);
    }
    
    // Cleanup on unmount
    return () => {
      unsubscribe(`farm:${farmId}:elizaos`);
      if (agentId) {
        unsubscribe(`agent:${agentId}`);
      }
    };
  }, [farmId, agentId, subscribe, unsubscribe]);
  
  // Handle incoming command responses
  useEffect(() => {
    const commandResponse = latestMessages?.COMMAND_RESPONSE;
    
    if (commandResponse && isProcessing) {
      // Add ElizaOS response to messages
      setMessages((prev: ConsoleMessage[]) => [
        ...prev.filter((m: ConsoleMessage) => !m.isLoading), // Remove any loading messages
        {
          id: `elizaos-${Date.now()}`,
          content: commandResponse.data.result.message || 'Command executed successfully.',
          timestamp: commandResponse.timestamp,
          sender: 'elizaos',
          category: 'command',
          source: 'system',
          isUser: false,
          metadata: commandResponse.data.result.data
        }
      ]);
      
      setIsProcessing(false);
    }
  }, [latestMessages?.COMMAND_RESPONSE, isProcessing]);
  
  // Handle incoming knowledge responses
  useEffect(() => {
    const knowledgeResponse = latestMessages?.KNOWLEDGE_RESPONSE;
    
    if (knowledgeResponse && isProcessing) {
      // Add ElizaOS knowledge response to messages
      setMessages((prev: ConsoleMessage[]) => [
        ...prev.filter((m: ConsoleMessage) => !m.isLoading), // Remove any loading messages
        {
          id: `elizaos-${Date.now()}`,
          content: knowledgeResponse.data.result.answer,
          timestamp: knowledgeResponse.timestamp,
          sender: 'elizaos',
          category: 'query',
          source: 'knowledge-base',
          isUser: false,
          references: knowledgeResponse.data.result.sources,
          metadata: {
            confidence: knowledgeResponse.data.result.confidence
          }
        }
      ]);
      
      setIsProcessing(false);
    }
  }, [latestMessages?.KNOWLEDGE_RESPONSE, isProcessing]);
  
  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if (scrollAreaRef.current) {
      const scrollElement = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollElement) {
        scrollElement.scrollTop = scrollElement.scrollHeight;
      }
    }
  }, [messages]);
  
  // Submit handler for sending commands/queries
  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    
    if (!input.trim() || isProcessing) return;
    
    if (!isConnected) {
      toast({
        title: "Connection Error",
        description: "Not connected to ElizaOS. Please check your connection.",
        variant: "destructive",
      });
      return;
    }
    
    // Add user message to chat
    const userMessage: ConsoleMessage = {
      id: `user-${Date.now()}`,
      content: input,
      timestamp: new Date().toISOString(),
      isUser: true,
      sender: 'user'
    };
    
    // Add loading message
    const loadingMessage: ConsoleMessage = {
      id: `loading-${Date.now()}`,
      content: 'Processing your request...',
      timestamp: new Date().toISOString(),
      isUser: false,
      sender: 'elizaos',
      isLoading: true
    };
    
    setMessages((prev: ConsoleMessage[]) => [...prev, userMessage, loadingMessage]);
    setIsProcessing(true);
    
    try {
      // Determine if this is a command or a query
      const isCommand = /^(\/|!|>)/.test(input.trim());
      
      if (isCommand) {
        // Send as a command
        send('ELIZAOS_COMMAND', {
          command: input.replace(/^(\/|!|>)/, '').trim(),
          farm_id: farmId,
          agent_id: agentId,
          params: {}
        });
      } else {
        // Send as a knowledge query
        send('KNOWLEDGE_QUERY', {
          query: input.trim(),
          farm_id: farmId,
          agent_id: agentId,
          context: {}
        });
      }
      
      // Clear input
      setInput('');
      
      // Log the interaction
      try {
        await supabase
          .from('elizaos_interactions')
          .insert({
            farm_id: farmId,
            command: input,
            response: "Pending response...",
            category: isCommand ? 'command' : 'query',
            source: isCommand ? 'system' : 'knowledge-base'
          });
      } catch (dbError) {
        console.error('Error logging to database:', dbError);
      }
    } catch (error) {
      console.error('Error sending message:', error);
      
      // Remove loading message and add error message
      setMessages((prev: ConsoleMessage[]) => [
        ...prev.filter((m: ConsoleMessage) => !m.isLoading),
        {
          id: `error-${Date.now()}`,
          content: 'Failed to process your request. Please try again.',
          timestamp: new Date().toISOString(),
          isUser: false,
          sender: 'elizaos',
          isError: true,
          errorMessage: error instanceof Error ? error.message : 'Unknown error'
        }
      ]);
      
      setIsProcessing(false);
      
      toast({
        title: "Error",
        description: "Failed to send message to ElizaOS",
        variant: "destructive",
      });
    }
  };
  
  // Get icon for message category
  const getCategoryIcon = (category?: MessageCategory) => {
    switch (category) {
      case 'command':
        return <Zap className="h-4 w-4 text-amber-500" />;
      case 'query':
        return <BookOpen className="h-4 w-4 text-blue-500" />;
      case 'analysis':
        return <BarChart className="h-4 w-4 text-purple-500" />;
      case 'alert':
        return <Bell className="h-4 w-4 text-red-500" />;
      default:
        return <Type className="h-4 w-4" />;
    }
  };
  
  // Get icon for message source
  const getSourceIcon = (source?: MessageSource) => {
    switch (source) {
      case 'knowledge-base':
        return <Database className="h-4 w-4 text-teal-500" />;
      case 'market-data':
        return <BarChart className="h-4 w-4 text-indigo-500" />;
      case 'strategy':
        return <Sparkles className="h-4 w-4 text-amber-500" />;
      case 'system':
        return <Zap className="h-4 w-4 text-blue-500" />;
      default:
        return null;
    }
  };
  
  // Clear conversation
  const clearConversation = () => {
    setMessages([]);
    toast({
      title: "Conversation cleared",
      description: "The command history has been cleared",
    });
  };
  
  // Copy conversation to clipboard
  const copyToClipboard = () => {
    const text = messages
      .filter((m: ConsoleMessage) => !m.isLoading)
      .map((m: ConsoleMessage) => `[${m.sender}] ${m.content}`)
      .join('\n\n');
    
    navigator.clipboard.writeText(text);
    
    toast({
      title: "Copied to clipboard",
      description: "The conversation has been copied to your clipboard",
    });
  };

  // Handle input change
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInput(e.target.value);
  };
  
  return (
    <Card className="w-full">
      {showHeader && (
        <CardHeader>
          <div className="flex justify-between items-start">
            <div>
              <CardTitle className="text-xl flex items-center">
                <Brain className="h-5 w-5 mr-2 text-primary" />
                {title}
              </CardTitle>
              <CardDescription>
                {description}
              </CardDescription>
            </div>
            
            <div className="flex items-center space-x-2">
              <Badge 
                className={`flex items-center ${
                  isConnected 
                    ? 'bg-green-100 text-green-800 border-green-200' 
                    : 'bg-red-100 text-red-800 border-red-200'
                }`}
              >
                <Link className="h-3 w-3 mr-1" />
                {isConnected ? 'Connected' : 'Disconnected'}
              </Badge>
              
              <Button variant="ghost" size="icon" onClick={clearConversation}>
                <X className="h-4 w-4" />
              </Button>
              
              <Button variant="ghost" size="icon" onClick={copyToClipboard}>
                <Clipboard className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
      )}
      
      <CardContent className="p-0">
        <ScrollArea className="h-[calc(100%-64px)]" style={{ height }} ref={scrollAreaRef}>
          <div className="p-4 space-y-4">
            {messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <Brain className="h-16 w-16 text-primary opacity-20 mb-4" />
                <h3 className="text-lg font-medium">Welcome to ElizaOS Command Console</h3>
                <p className="text-sm text-muted-foreground mt-1 max-w-md">
                  Ask questions about trading strategies, market data, or use commands to control your trading agents.
                </p>
                <div className="mt-4 text-xs text-muted-foreground">
                  <p>Try these example commands:</p>
                  <ul className="mt-2 space-y-1">
                    <li><code>/status</code> - Check agent status</li>
                    <li><code>/market BTC/USD</code> - Get market data</li>
                    <li><code>/analyze recent_trades</code> - Analyze recent trading activity</li>
                  </ul>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {messages.map((message: ConsoleMessage, index: number) => (
                  <div
                    key={message.id}
                    className={`flex ${
                      message.sender === 'user' ? 'justify-end' : 'justify-start'
                    }`}
                    ref={(ref: HTMLDivElement | null) => {
                      // Assign a ref to the last message for scrolling
                      if (index === messages.length - 1) {
                        if (ref) ref.scrollIntoView({ behavior: 'smooth' });
                      }
                    }}
                  >
                    <div
                      className={`rounded-lg px-4 py-2 max-w-[80%] ${
                        message.sender === 'user'
                          ? 'bg-primary text-primary-foreground'
                          : message.isError
                            ? 'bg-destructive/10 border border-destructive/20 text-destructive-foreground'
                            : message.isLoading
                              ? 'bg-muted border border-muted-foreground/20'
                              : 'bg-muted border'
                      }`}
                    >
                      {message.sender === 'elizaos' && !message.isLoading && !message.isError && (
                        <div className="flex items-center space-x-2 mb-1">
                          <Brain className="h-4 w-4 text-primary" />
                          <span className="text-xs font-medium">ElizaOS</span>
                          
                          {message.category && (
                            <Badge variant="outline" className="text-xs px-1 h-5 ml-1">
                              {getCategoryIcon(message.category)}
                              <span className="ml-1 capitalize">{message.category}</span>
                            </Badge>
                          )}
                          
                          {message.source && (
                            <Badge variant="outline" className="text-xs px-1 h-5">
                              {getSourceIcon(message.source)}
                              <span className="ml-1 capitalize">{message.source.replace('-', ' ')}</span>
                            </Badge>
                          )}
                        </div>
                      )}
                      
                      {message.isLoading ? (
                        <div className="flex items-center space-x-2">
                          <RefreshCw className="h-4 w-4 animate-spin" />
                          <span>{message.content}</span>
                        </div>
                      ) : (
                        <div className="whitespace-pre-wrap">{message.content}</div>
                      )}
                      
                      <div className="mt-2 text-xs opacity-60 flex items-center">
                        <Clock className="h-3 w-3 mr-1" />
                        {format(new Date(message.timestamp), 'HH:mm:ss')}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </ScrollArea>
      </CardContent>
      
      <CardFooter className="p-3 border-t">
        <form onSubmit={handleSubmit} className="flex w-full space-x-2">
          <Input
            type="text"
            placeholder={placeholder}
            value={input}
            onChange={handleInputChange}
            disabled={!isConnected || isProcessing}
            className="flex-1"
            autoFocus={autoFocus}
          />
          
          <Button 
            type="submit" 
            disabled={!isConnected || isProcessing || !input.trim()}
            className="bg-primary hover:bg-primary/90"
          >
            <Send className="h-4 w-4 mr-1" />
            Send
          </Button>
        </form>
      </CardFooter>
    </Card>
  );
}
