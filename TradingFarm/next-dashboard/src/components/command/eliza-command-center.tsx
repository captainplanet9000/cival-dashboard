"use client";

import React, { useState, useRef, useEffect } from "react";
import { Send, ArrowRight, RefreshCw, X, Cpu, DollarSign, Users, BarChart2 } from "lucide-react";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useSocket } from "@/providers/socket-provider";
import { MessageType, Message } from "@/types/socket";
import { cn } from "@/utils/ui-utils";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

/**
 * Message styling for different message types
 */
const messageStyles = {
  [MessageType.Command]: "bg-muted text-foreground",
  [MessageType.Response]: "bg-primary/10 text-primary-foreground border-l-4 border-primary",
  [MessageType.System]: "bg-secondary/20 text-secondary-foreground italic",
  [MessageType.Error]: "bg-destructive/20 text-destructive-foreground border-l-4 border-destructive",
  [MessageType.Processing]: "bg-muted/50 text-muted-foreground italic"
};

/**
 * Quick command buttons for common operations
 */
const quickCommands = [
  { label: "BTC Price", command: "What's the current Bitcoin price?", icon: <DollarSign className="h-3 w-3" /> },
  { label: "Portfolio", command: "Show my portfolio", icon: <BarChart2 className="h-3 w-3" /> },
  { label: "Agents", command: "List active trading agents", icon: <Cpu className="h-3 w-3" /> },
  { label: "Strategies", command: "Show available strategies", icon: <Users className="h-3 w-3" /> },
];

/**
 * ElizaOS Command Center - Modern chat interface for ElizaAI interactions
 */
export function ElizaCommandCenter() {
  const { messages, sendCommand, clearMessages, isConnected } = useSocket();
  const [inputValue, setInputValue] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  
  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Focus the input field on initial render
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Handle command submission
  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!inputValue.trim() || !isConnected) return;
    
    setIsProcessing(true);
    sendCommand(inputValue);
    setInputValue("");
    
    // Simulate processing state for better UX
    setTimeout(() => {
      setIsProcessing(false);
    }, 500);
  };

  // Handle quick command button click
  const handleQuickCommand = (command: string) => {
    if (!isConnected) return;
    
    setIsProcessing(true);
    sendCommand(command);
    
    // Simulate processing state for better UX
    setTimeout(() => {
      setIsProcessing(false);
    }, 500);
  };

  // Render individual message
  const renderMessage = (message: Message) => {
    return (
      <div
        key={message.id}
        className={cn(
          "p-3 rounded-lg my-2 max-w-[90%] shadow-sm",
          messageStyles[message.type],
          message.type === MessageType.Command ? "ml-auto" : "mr-auto"
        )}
      >
        {/* Display sender badge if available */}
        {message.sender && (
          <Badge variant="outline" className="mb-1">
            {message.sender}
          </Badge>
        )}
        
        {/* Message content */}
        <div className="break-words">{message.content}</div>
        
        {/* Message metadata (timestamp and metadata if available) */}
        <div className="flex justify-between items-center mt-1 text-xs text-muted-foreground">
          <span>
            {new Date(message.timestamp).toLocaleTimeString()}
          </span>
          
          {message.metadata?.intent && (
            <Badge variant="outline" className="text-xs">
              {message.metadata.intent}
              {message.metadata.confidence && ` (${Math.round(message.metadata.confidence * 100)}%)`}
            </Badge>
          )}
        </div>
      </div>
    );
  };

  return (
    <Card className="flex flex-col h-[600px] max-h-[80vh]">
      <CardHeader className="pb-2">
        <div className="flex justify-between items-center">
          <CardTitle className="flex items-center gap-2">
            <Cpu className="h-5 w-5 text-primary" />
            ElizaOS Command Center
            {isConnected ? (
              <Badge variant="outline" className="bg-green-500/10 text-green-500">Connected</Badge>
            ) : (
              <Badge variant="outline" className="bg-destructive/10 text-destructive">Disconnected</Badge>
            )}
          </CardTitle>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={clearMessages}
                  disabled={messages.length === 0}
                >
                  <RefreshCw className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Clear messages</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </CardHeader>
      
      <CardContent className="flex-grow overflow-y-auto pb-0 space-y-4">
        {/* Welcome message when no messages exist */}
        {messages.length === 0 && (
          <div className="h-full flex flex-col items-center justify-center text-center text-muted-foreground">
            <Cpu className="h-10 w-10 mb-4" />
            <p className="text-lg font-medium">Welcome to ElizaOS Command Center</p>
            <p className="max-w-md">
              Ask anything about market data, your portfolio, trading agents, or strategies using natural language.
            </p>
          </div>
        )}
        
        {/* Message history */}
        <div className="flex flex-col">
          {messages.map(renderMessage)}
          <div ref={messagesEndRef} />
        </div>
      </CardContent>
      
      <CardFooter className="flex flex-col gap-2 pt-3">
        {/* Quick command buttons */}
        <div className="flex gap-2 flex-wrap w-full">
          {quickCommands.map((cmd) => (
            <Button
              key={cmd.label}
              variant="outline"
              size="sm"
              className="h-7 gap-1"
              onClick={() => handleQuickCommand(cmd.command)}
              disabled={!isConnected || isProcessing}
            >
              {cmd.icon}
              <span>{cmd.label}</span>
            </Button>
          ))}
        </div>
        
        {/* Command input form */}
        <form onSubmit={handleSubmit} className="flex w-full gap-2">
          <Input
            ref={inputRef}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder={isConnected ? "Type a command or ask a question..." : "Connecting to ElizaOS..."}
            disabled={!isConnected || isProcessing}
            className="flex-grow"
          />
          <Button type="submit" size="icon" disabled={!isConnected || !inputValue.trim() || isProcessing}>
            {isProcessing ? <RefreshCw className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
          </Button>
        </form>
        
        {/* Natural language hint */}
        <p className="text-xs text-muted-foreground">
          <span className="font-medium">Pro tip:</span> Try using natural language like "Show me Bitcoin price trend for the last week"
        </p>
      </CardFooter>
    </Card>
  );
}
