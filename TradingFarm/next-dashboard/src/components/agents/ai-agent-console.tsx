"use client";

import React, { useState, useRef, useEffect } from 'react';
import { useAIAgent } from '@/context/ai-agent-context';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { SendHorizonal, Bot, Loader2, Terminal, MessageSquare, TrendingUp, AlertTriangle } from 'lucide-react';
import { AgentInstruction } from '@/types/ai-agent';

interface AIAgentConsoleProps {
  className?: string;
  minimized?: boolean;
  onMinimize?: () => void;
  onMaximize?: () => void;
}

export function AIAgentConsole({ 
  className = '', 
  minimized = false,
  onMinimize,
  onMaximize
}: AIAgentConsoleProps) {
  const { activeAgent, processInstruction, isLoading, error } = useAIAgent();
  const [inputValue, setInputValue] = useState<string>('');
  const [messages, setMessages] = useState<{role: 'system' | 'user' | 'agent', content: string, timestamp: Date}[]>([
    { 
      role: 'system', 
      content: 'Welcome to Trading Farm AI Assistant. How can I help with your trading activities today?',
      timestamp: new Date()
    }
  ]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // Suggested trading-related commands
  const suggestedCommands = [
    { label: "Analyze BTC trend", command: "Analyze the current BTC trend and give me entry suggestions" },
    { label: "Create risk strategy", command: "Create a medium risk strategy for day trading cryptocurrencies" },
    { label: "Explain pattern", command: "What does a bullish engulfing pattern indicate for future price movement?" },
    { label: "Assess portfolio", command: "Assess my current portfolio allocation and suggest improvements" },
  ];

  // Submit the user's instruction to the agent
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!inputValue.trim() || !activeAgent) return;
    
    // Add user message
    const userMessage = {
      role: 'user' as const,
      content: inputValue,
      timestamp: new Date()
    };
    
    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    
    try {
      // Show typing indicator
      setMessages(prev => [...prev, { 
        role: 'system', 
        content: '___typing___', 
        timestamp: new Date() 
      }]);
      
      // Process instruction with AI
      const result = await processInstruction(inputValue);
      
      // Remove typing indicator and add agent response
      setMessages(prev => prev.filter(m => m.content !== '___typing___'));
      
      setMessages(prev => [...prev, { 
        role: 'agent', 
        content: result.response || 'I processed your request but encountered an issue.',
        timestamp: new Date()
      }]);
    } catch (err: any) {
      // Remove typing indicator and add error message
      setMessages(prev => prev.filter(m => m.content !== '___typing___'));
      
      setMessages(prev => [...prev, { 
        role: 'system', 
        content: `Error: ${err.message || 'Failed to process your request'}`,
        timestamp: new Date()
      }]);
    }
  };
  
  // Handle suggested command click
  const handleSuggestedCommand = (command: string) => {
    setInputValue(command);
  };
  
  // Scroll to bottom of messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);
  
  // If minimized, show only the header
  if (minimized) {
    return (
      <Card className={`${className} w-auto fixed bottom-4 right-4 shadow-lg z-50`}>
        <CardHeader className="flex flex-row items-center justify-between p-4 cursor-pointer" onClick={onMaximize}>
          <CardTitle className="text-sm flex items-center">
            <Bot className="h-4 w-4 mr-2" />
            <span>{activeAgent ? activeAgent.name : 'AI Assistant'}</span>
          </CardTitle>
          <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
            <TrendingUp className="h-3 w-3" />
          </Button>
        </CardHeader>
      </Card>
    );
  }
  
  return (
    <Card className={`${className} w-full max-w-md fixed bottom-4 right-4 shadow-lg z-50 max-h-[80vh] flex flex-col`}>
      <CardHeader className="flex flex-row items-center justify-between p-4 border-b">
        <CardTitle className="text-sm flex items-center">
          <Bot className="h-4 w-4 mr-2" />
          <span>{activeAgent ? activeAgent.name : 'AI Assistant'}</span>
          {isLoading && <Loader2 className="h-3 w-3 ml-2 animate-spin" />}
        </CardTitle>
        <div className="flex items-center space-x-1">
          <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
            <Terminal className="h-3 w-3" />
          </Button>
          <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={onMinimize}>
            <span className="h-1 w-3 bg-current block rounded-sm" />
          </Button>
        </div>
      </CardHeader>
      
      <CardContent className="px-4 py-3 overflow-y-auto flex-grow">
        <div className="space-y-4">
          {messages.map((message, index) => {
            // Skip typing indicators - they're handled separately
            if (message.content === '___typing___') {
              return (
                <div key={index} className="flex items-center text-muted-foreground text-sm">
                  <Loader2 className="h-3 w-3 mr-2 animate-spin" />
                  <span>Thinking...</span>
                </div>
              );
            }
            
            return (
              <div 
                key={index} 
                className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div 
                  className={`max-w-[80%] px-3 py-2 rounded-lg ${
                    message.role === 'user' 
                      ? 'bg-primary text-primary-foreground' 
                      : message.role === 'system' 
                        ? 'bg-muted text-muted-foreground text-sm' 
                        : 'bg-accent text-accent-foreground'
                  }`}
                >
                  {message.role === 'system' && message.content.startsWith('Error:') ? (
                    <div className="flex items-start">
                      <AlertTriangle className="h-4 w-4 mr-2 mt-0.5 text-destructive" />
                      <span>{message.content}</span>
                    </div>
                  ) : (
                    <span>{message.content}</span>
                  )}
                  
                  <div className="text-xs opacity-70 mt-1">
                    {message.role !== 'system' && (
                      new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                    )}
                  </div>
                </div>
              </div>
            );
          })}
          <div ref={messagesEndRef} />
        </div>
      </CardContent>
      
      <CardFooter className="p-4 border-t">
        <form onSubmit={handleSubmit} className="w-full space-y-2">
          <div className="flex">
            <Input
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder={`Ask ${activeAgent?.name || 'AI Assistant'}...`}
              className="flex-grow"
              disabled={isLoading || !activeAgent}
            />
            <Button
              type="submit"
              size="sm"
              variant="ghost"
              className="ml-2"
              disabled={isLoading || !inputValue.trim() || !activeAgent}
            >
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <SendHorizonal className="h-4 w-4" />}
            </Button>
          </div>
          
          {/* Suggested commands */}
          <div className="flex flex-wrap gap-2">
            {suggestedCommands.map((cmd, i) => (
              <Button
                key={i}
                variant="outline"
                size="sm"
                className="text-xs py-1 h-auto"
                onClick={() => handleSuggestedCommand(cmd.command)}
                disabled={isLoading}
              >
                {cmd.label}
              </Button>
            ))}
          </div>
        </form>
      </CardFooter>
    </Card>
  );
}
