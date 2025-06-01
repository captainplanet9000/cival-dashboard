"use client";

import React, { useState, useRef, useEffect } from 'react';
import { useAIAgentV2 } from '@/context/ai-agent-v2-context';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  SendHorizonal, Bot, Loader2, Terminal, 
  MessageSquare, TrendingUp, AlertTriangle, 
  BarChart2, RefreshCw, ChevronDown
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from '@/components/ui/skeleton';
import { AIAgentV2 } from '@/context/ai-agent-v2-context';

interface AIAgentConsoleV2Props {
  className?: string;
  minimized?: boolean;
  onMinimize?: () => void;
  onMaximize?: () => void;
}

export function AIAgentConsoleV2({ 
  className = '', 
  minimized = false,
  onMinimize,
  onMaximize
}: AIAgentConsoleV2Props) {
  const { 
    agents,
    messages,
    isLoading, 
    isSending,
    activeAgentId,
    setActiveAgentId,
    sendMessage,
    clearMessages,
    refreshAgents
  } = useAIAgentV2();
  
  const [inputValue, setInputValue] = useState<string>('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  const activeAgent = activeAgentId 
    ? agents.find(agent => agent.id === activeAgentId) 
    : null;

  // Scroll to bottom when messages change
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  // Handle sending a message
  const handleSendMessage = async () => {
    if (!inputValue.trim() || !activeAgentId) return;
    
    await sendMessage(inputValue);
    setInputValue('');
  };

  // Handle keydown for sending message with Enter
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Render messages
  const renderMessages = () => {
    if (messages.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center h-full text-center p-8 text-muted-foreground">
          <MessageSquare className="h-12 w-12 mb-4 opacity-20" />
          <p className="mb-2">No messages yet</p>
          <p className="text-sm">Start a conversation with this agent by typing a message below.</p>
        </div>
      );
    }

    return (
      <div className="space-y-4 pb-4">
        {messages.map((msg) => (
          <div 
            key={msg.id} 
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div 
              className={`max-w-[80%] rounded-lg p-3 ${
                msg.role === 'user' 
                  ? 'bg-primary text-primary-foreground' 
                  : msg.role === 'system'
                    ? 'bg-destructive/10 border border-destructive/20 text-foreground'
                    : 'bg-muted text-foreground'
              }`}
            >
              {msg.role === 'system' ? (
                <div className="flex items-center gap-2 mb-1">
                  <AlertTriangle className="h-4 w-4 text-destructive" />
                  <span className="text-xs font-semibold">System Message</span>
                </div>
              ) : null}
              <div className="whitespace-pre-wrap">{msg.content}</div>
              <div className="text-xs opacity-70 mt-1 text-right">
                {new Date(msg.timestamp).toLocaleTimeString()}
              </div>
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>
    );
  };

  // Agent selector dropdown
  const renderAgentSelector = () => {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" className="justify-between w-full" disabled={isLoading}>
            <div className="flex items-center gap-2 truncate">
              <Bot className="h-4 w-4" />
              <span className="truncate">
                {activeAgent ? activeAgent.name : 'Select an agent'}
              </span>
            </div>
            <ChevronDown className="h-4 w-4 opacity-50" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-[200px]">
          {agents.map((agent) => (
            <DropdownMenuItem 
              key={agent.id}
              onClick={() => {
                setActiveAgentId(agent.id);
                clearMessages();
              }}
              className="flex items-center gap-2 cursor-pointer"
            >
              <span 
                className={`h-2 w-2 rounded-full ${
                  agent.status === 'active' ? 'bg-green-500' : 
                  agent.status === 'paused' ? 'bg-yellow-500' : 'bg-gray-400'
                }`} 
              />
              <span className="truncate">{agent.name}</span>
            </DropdownMenuItem>
          ))}
          {agents.length === 0 && (
            <DropdownMenuItem disabled>
              No agents available
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    );
  };

  if (minimized) {
    return (
      <Card className={`fixed bottom-4 right-4 w-16 h-16 flex items-center justify-center cursor-pointer ${className}`} onClick={onMaximize}>
        <Bot className="h-8 w-8 text-primary" />
      </Card>
    );
  }

  return (
    <Card className={`w-full h-full flex flex-col border shadow-md rounded-lg overflow-hidden ${className}`}>
      <CardHeader className="px-4 py-2 border-b flex-row flex justify-between items-center space-y-0">
        <div className="flex items-center gap-2">
          <Bot className="h-5 w-5 text-primary" />
          <CardTitle className="text-base font-medium">AI Agent Console</CardTitle>
        </div>
        <div className="flex items-center gap-2">
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-8 w-8" 
            onClick={refreshAgents}
            disabled={isLoading}
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
          </Button>
          {onMinimize && (
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-8 w-8" 
              onClick={onMinimize}
            >
              <ChevronDown className="h-4 w-4" />
            </Button>
          )}
        </div>
      </CardHeader>
      
      <div className="flex-1 overflow-hidden flex flex-col">
        <div className="p-3 border-b">
          {renderAgentSelector()}
        </div>
        
        <div className="flex-1 overflow-y-auto p-3">
          {isLoading ? (
            <div className="space-y-3 p-4">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-20 w-4/5" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-16 w-3/5 ml-auto" />
            </div>
          ) : (
            renderMessages()
          )}
        </div>
        
        <CardFooter className="p-3 pt-2 border-t">
          <form 
            className="flex w-full gap-2" 
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
          >
            <Input
              placeholder={
                !activeAgent 
                  ? "First select an agent..." 
                  : "Type your message here..."
              }
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={!activeAgent || isSending}
              className="flex-1"
            />
            <Button 
              type="submit" 
              size="icon" 
              disabled={!activeAgent || !inputValue.trim() || isSending}
            >
              {isSending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <SendHorizonal className="h-4 w-4" />
              )}
            </Button>
          </form>
        </CardFooter>
      </div>
    </Card>
  );
}
