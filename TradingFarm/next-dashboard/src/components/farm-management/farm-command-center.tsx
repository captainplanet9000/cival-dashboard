"use client";

import React, { useState, useEffect, useRef } from 'react'
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { SendIcon, Command, MessagesSquare, Terminal, Bot, TerminalSquare, Settings, AlertTriangle } from 'lucide-react'
import { useSocket } from '@/providers/socket-provider'
import { TRADING_EVENTS } from '@/constants/socket-events'
import { useFarmManagement } from './farm-management-provider'
import { FarmCommandShortcuts } from './farm-command-shortcuts'
import { Message, MessageType } from '@/types/socket'

interface FarmCommandCenterProps {
  showShortcuts?: boolean;
  className?: string;
}

export function FarmCommandCenter({ showShortcuts = false, className = '' }: FarmCommandCenterProps) {
  const { socket, isConnected, messages: socketMessages, sendCommand } = useSocket();
  const { farmData } = useFarmManagement();
  const [commandInput, setCommandInput] = useState('');
  const [localMessages, setLocalMessages] = useState<Message[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Default welcome message
  useEffect(() => {
    if (localMessages.length === 0) {
      const welcomeMessage: Message = {
        id: 'welcome-' + Date.now().toString(),
        content: "Welcome to Farm Command Center. I'm ElizaOS, your farm management assistant. How can I help you today?",
        timestamp: new Date().toISOString(),
        type: MessageType.System,
        metadata: { 
          isBot: true 
        }
      };
      
      setLocalMessages([welcomeMessage]);
    }
    
    // If we have socket messages, merge them with our local messages
    if (socketMessages && socketMessages.length > 0) {
      const combinedMessages = [...localMessages];
      
      // Add any socket messages that aren't already in our local state
      socketMessages.forEach(msg => {
        if (!combinedMessages.some(m => m.id === msg.id)) {
          combinedMessages.push({
            ...msg,
            metadata: {
              ...msg.metadata,
              isBot: true
            }
          });
        }
      });
      
      setLocalMessages(combinedMessages);
    }
  }, [socketMessages]);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [localMessages]);

  // Event listeners for shortcuts
  useEffect(() => {
    const handleShortcutClick = (event: Event) => {
      const customEvent = event as CustomEvent;
      if (customEvent.detail && customEvent.detail.command) {
        handleCommandSubmit(customEvent.detail.command);
      }
    };
    
    window.addEventListener('shortcutClicked', handleShortcutClick);
    
    return () => {
      window.removeEventListener('shortcutClicked', handleShortcutClick);
    };
  }, []);

  // Handle command submission
  const handleCommandSubmit = (command: string = commandInput) => {
    if (!command.trim()) return;

    // Add the command to the message list
    const newCommandMsg: Message = {
      id: Date.now().toString(),
      content: command,
      timestamp: new Date().toISOString(),
      type: MessageType.Command
    };

    setLocalMessages(prev => [...prev, newCommandMsg]);
    
    // If connected to socket, send the command
    if (socket && isConnected) {
      sendCommand(command);
    } else {
      // Handle local command processing when socket is unavailable
      processLocalCommand(command);
    }
    
    // Clear the input
    setCommandInput('');
  };

  // Local command processing for offline mode
  const processLocalCommand = (command: string) => {
    // Simple command processing logic for demo purposes
    setTimeout(() => {
      let responseContent = 'Sorry, I cannot process this command while offline.';
      let responseType = MessageType.Error;
      
      // Very basic command handling
      if (command.toLowerCase().includes('hello') || command.toLowerCase().includes('hi')) {
        responseContent = 'Hello! How can I assist you with farm management today?';
        responseType = MessageType.Response;
      } 
      else if (command.toLowerCase().includes('help')) {
        responseContent = 'Available commands: list farms, create farm, farm status, connect agents, list agents, farm performance';
        responseType = MessageType.Response;
      }
      else if (command.toLowerCase().includes('list farm')) {
        if (farmData && farmData.length > 0) {
          responseContent = `Found ${farmData.length} farms: ${farmData.map(f => f.name).join(', ')}`;
        } else {
          responseContent = 'No farms found. Use "create farm" to set up a new farm.';
        }
        responseType = MessageType.Response;
      }
      
      // Add response to message list
      const newResponseMsg: Message = {
        id: 'local-' + Date.now().toString(),
        content: responseContent,
        timestamp: new Date().toISOString(),
        type: responseType,
        metadata: {
          isBot: true
        }
      };
      
      setLocalMessages(prev => [...prev, newResponseMsg]);
    }, 500);
  };

  // Handle keydown events
  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      handleCommandSubmit();
    }
  };

  // Render message UI based on type
  const renderMessage = (message: Message) => {
    const isBot = message.metadata?.isBot;
    const isProcessing = message.metadata?.isProcessing;
    
    return (
      <div 
        key={message.id} 
        className={`flex gap-3 p-4 ${isBot ? '' : 'justify-end'}`}
      >
        {isBot && (
          <Avatar className="h-9 w-9">
            <AvatarImage src="/elizaos-avatar.png" alt="ElizaOS" />
            <AvatarFallback>EL</AvatarFallback>
          </Avatar>
        )}
        
        <div className={`flex flex-col space-y-1 ${isBot ? 'items-start' : 'items-end'}`}>
          <div className={`flex items-center gap-2 ${isBot ? 'flex-row' : 'flex-row-reverse'}`}>
            <span className="text-sm font-medium">
              {isBot ? 'ElizaOS' : 'You'}
            </span>
            <span className="text-xs text-muted-foreground">
              {new Date(message.timestamp).toLocaleTimeString()}
            </span>
          </div>
          
          <div 
            className={`rounded-lg px-3 py-2 max-w-md text-sm ${
              isBot 
                ? 'bg-muted' 
                : 'bg-primary text-primary-foreground'
            } ${isProcessing ? 'animate-pulse' : ''}`}
          >
            {message.content}
            
            {isProcessing && (
              <span className="ml-2 animate-pulse">...</span>
            )}
          </div>
          
          {message.type === MessageType.Error && (
            <Badge variant="destructive" className="self-start">Error</Badge>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className={`flex flex-col md:flex-row gap-4 ${className}`}>
      {showShortcuts && (
        <div className="md:w-1/3">
          <FarmCommandShortcuts />
        </div>
      )}
      
      <Card className={`flex flex-col ${showShortcuts ? 'md:w-2/3' : 'w-full'}`}>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <Bot className="mr-2 h-5 w-5 text-primary" />
              <CardTitle>ElizaOS Farm Command Center</CardTitle>
            </div>
            <Badge variant={isConnected ? "outline" : "destructive"}>
              {isConnected ? "Connected" : "Disconnected"}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="flex-grow overflow-hidden p-0">
          <ScrollArea className="h-[400px] px-4">
            <div className="space-y-4 pt-4">
              {localMessages.map((message) => (
                renderMessage(message)
              ))}
              <div ref={messagesEndRef} />
            </div>
          </ScrollArea>
        </CardContent>
        <Separator />
        <CardFooter className="p-4">
          <form onSubmit={(e) => e.preventDefault()} className="flex w-full items-center space-x-2">
            <Command className="h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Type a command..."
              value={commandInput}
              onChange={(e) => setCommandInput(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={!isConnected}
              className="flex-1"
            />
            <Button 
              type="button" 
              size="icon" 
              disabled={!isConnected || !commandInput.trim()} 
              onClick={() => handleCommandSubmit()}
            >
              <SendIcon className="h-4 w-4" />
            </Button>
          </form>
        </CardFooter>
      </Card>
    </div>
  );
}
