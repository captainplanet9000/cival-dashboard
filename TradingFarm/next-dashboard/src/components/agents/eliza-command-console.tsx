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
import { useAgentEvents } from '@/hooks/useAgentOrchestration';
import { createBrowserClient } from '@/utils/supabase/client';
import type { Database } from '@/types/database.types';
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

  // --- PHASE 4: Persistent Event History via Supabase ---
  const { data: eventHistory, isLoading: isLoadingEvents, error: eventsError } = useAgentEvents(agentId);
  const supabase = createBrowserClient<Database>();

  useEffect(() => {
    // If eventHistory is loaded, map to messages
    if (eventHistory && eventHistory.length > 0) {
      setMessages(eventHistory.map(evt => ({
        id: evt.id,
        content: evt.content,
        type: evt.type as MessageType,
        source: evt.source as SourceType,
        timestamp: new Date(evt.created_at),
        metadata: evt.metadata || {}
      })));
    } else {
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
  }, [eventHistory, agentName]);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight;
    }
  }, [messages]);

  // Persist response to agent_events
  const handleElizaResponse = async (response: ElizaCommandResponse) => {
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
    // --- Persist to Supabase ---
    await supabase.from('agent_events').insert({
      agent_id: agentId,
      type: response.type === 'ERROR_RESPONSE' ? 'error' : 'response',
      source: response.source,
      content: response.content,
      metadata: response.metadata
    });
    setIsLoading(false);
  };

  const handleInputSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || isLoading) return;
    const isQuery = inputText.trim().endsWith('?') || 
                   inputText.toLowerCase().startsWith('what') ||
                   inputText.toLowerCase().startsWith('how') ||
                   inputText.toLowerCase().startsWith('show') ||
                   inputText.toLowerCase().startsWith('analyze');
    setIsLoading(true);
    // Add user command to message list
    setMessages(prevMessages => [
      ...prevMessages,
      {
        id: `user-${Date.now()}`,
        content: inputText,
        type: isQuery ? 'query' : 'command',
        source: 'user',
        timestamp: new Date(),
        metadata: {}
      }
    ]);
    // --- Persist user command to Supabase ---
    await supabase.from('agent_events').insert({
      agent_id: agentId,
      type: isQuery ? 'query' : 'command',
      source: 'user',
      content: inputText,
      metadata: {}
    });
    // Send command to agent
    try {
      const response = await agentMessagingService.sendCommandToAgent(agentId, inputText);
      handleElizaResponse(response);
    } catch (err) {
      setMessages(prevMessages => [
        ...prevMessages,
        {
          id: `error-${Date.now()}`,
          content: 'Failed to send command. Please try again.',
          type: 'error',
          source: 'system',
          timestamp: new Date(),
          metadata: { error: err }
        }
      ]);
      setIsLoading(false);
    } finally {
      setInputText('');
    }
  };

  // Focus input after sending
  if (inputRef.current) {
    inputRef.current.focus();
  }

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
