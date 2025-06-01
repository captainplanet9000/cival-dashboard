/**
 * ElizaOS Command Center Component
 * 
 * This component serves as the central interface for interacting with the ElizaOS AI system,
 * providing command execution, real-time responses, and natural language processing
 * capabilities for the entire Trading Farm ecosystem.
 */

import React, { useState, useEffect, useRef } from 'react';
import { 
  Send, 
  Zap, 
  Bot, 
  TrendingUp,
  Database, 
  LineChart, 
  Terminal, 
  Wallet, 
  Shield, 
  Info,
  X,
  Maximize2,
  Minimize2,
  Clipboard,
  Sparkles
} from 'lucide-react';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/components/ui/use-toast';
import { elizaOS } from '@/integrations/elizaos';
import { COMMAND_TYPES, MESSAGE_SOURCES, ElizaOSMessage } from '@/types/elizaos';

// Define command button types
interface QuickCommandButton {
  icon: React.ElementType;
  label: string;
  command: string;
  variant?: 'default' | 'secondary' | 'outline' | 'ghost';
}

export interface CommandCenterProps {
  showTitle?: boolean;
  height?: string;
  initialFocus?: boolean;
  contextId?: string;
  contextType?: 'agent' | 'farm' | 'wallet' | 'system';
}

export default function CommandCenter({
  showTitle = true,
  height = '500px',
  initialFocus = false,
  contextId,
  contextType = 'system'
}: CommandCenterProps) {
  const { toast } = useToast();
  const [messages, setMessages] = useState<ElizaOSMessage[]>([]);
  const [input, setInput] = useState('');
  const [isConnected, setIsConnected] = useState(elizaOS.isConnected);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // Initialize with system welcome message
  useEffect(() => {
    setMessages([
      {
        id: 'welcome',
        content: `Welcome to the ElizaOS Command Center. ${contextType !== 'system' ? `Connected to ${contextType} ${contextId}.` : ''} How can I assist you?`,
        sender: 'system',
        timestamp: new Date(),
        type: COMMAND_TYPES.QUERY,
        source: MESSAGE_SOURCES.SYSTEM
      }
    ]);
    
    if (initialFocus && inputRef.current) {
      inputRef.current.focus();
    }
  }, [contextType, contextId, initialFocus]);
  
  // Set up ElizaOS event listeners
  useEffect(() => {
    const handleMessage = (message: ElizaOSMessage) => {
      setMessages(prevMessages => [...prevMessages, message]);
      setIsProcessing(false);
    };
    
    const handleStatus = (status: boolean) => {
      setIsConnected(status);
      
      if (!status) {
        setMessages(prevMessages => [
          ...prevMessages,
          {
            id: `disconnect-${Date.now()}`,
            content: 'Disconnected from ElizaOS. Attempting to reconnect...',
            sender: 'system',
            timestamp: new Date(),
            type: COMMAND_TYPES.ALERT,
            source: MESSAGE_SOURCES.SYSTEM
          }
        ]);
      } else if (prevMessages => prevMessages.some(m => m.id.startsWith('disconnect-'))) {
        setMessages(prevMessages => [
          ...prevMessages,
          {
            id: `reconnect-${Date.now()}`,
            content: 'Reconnected to ElizaOS.',
            sender: 'system',
            timestamp: new Date(),
            type: COMMAND_TYPES.ALERT,
            source: MESSAGE_SOURCES.SYSTEM
          }
        ]);
      }
    };
    
    elizaOS.addEventListener('message', handleMessage);
    elizaOS.addStatusListener(handleStatus);
    
    return () => {
      elizaOS.removeEventListener('message', handleMessage);
      elizaOS.removeStatusListener(handleStatus);
    };
  }, []);
  
  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);
  
  // Define quick command buttons based on context
  const getQuickCommands = (): QuickCommandButton[] => {
    // System-wide commands always available
    const systemCommands: QuickCommandButton[] = [
      { icon: TrendingUp, label: 'Market Status', command: 'get market status' },
      { icon: LineChart, label: 'Performance', command: 'show system performance' }
    ];
    
    // Context-specific commands
    switch (contextType) {
      case 'agent':
        return [
          { icon: Bot, label: 'Agent Status', command: `get agent status ${contextId}` },
          { icon: TrendingUp, label: 'Trading History', command: `show trading history for agent ${contextId}` },
          { icon: Wallet, label: 'Wallet', command: `get wallet for agent ${contextId}` },
          ...systemCommands
        ];
      case 'farm':
        return [
          { icon: Database, label: 'Farm Metrics', command: `get farm metrics ${contextId}` },
          { icon: Bot, label: 'Agents', command: `list agents in farm ${contextId}` },
          { icon: Shield, label: 'Risk Analysis', command: `analyze risk for farm ${contextId}` },
          ...systemCommands
        ];
      case 'wallet':
        return [
          { icon: Wallet, label: 'Balance', command: `get wallet balance ${contextId}` },
          { icon: TrendingUp, label: 'Transactions', command: `show recent transactions for wallet ${contextId}` },
          { icon: Shield, label: 'Security', command: `check wallet security ${contextId}` },
          ...systemCommands
        ];
      default:
        return [
          { icon: Database, label: 'System Status', command: 'get system status' },
          { icon: Bot, label: 'Agents', command: 'list all agents' },
          { icon: Wallet, label: 'Wallets', command: 'show all wallets' },
          { icon: TrendingUp, label: 'Markets', command: 'show market overview' }
        ];
    }
  };
  
  const quickCommands = getQuickCommands();
  
  // Handle command submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!input.trim() || !isConnected) return;
    
    // Add user message to the chat
    const userMessage: ElizaOSMessage = {
      id: `user-${Date.now()}`,
      content: input,
      sender: 'user',
      timestamp: new Date(),
      type: COMMAND_TYPES.COMMAND,
      source: MESSAGE_SOURCES.SYSTEM
    };
    
    setMessages(prevMessages => [...prevMessages, userMessage]);
    setInput('');
    setIsProcessing(true);
    
    // Add context information for the command
    const context = contextId && contextType !== 'system'
      ? { [`${contextType}_id`]: contextId }
      : undefined;
    
    try {
      // Send the command to ElizaOS
      await elizaOS.sendMessage(input, COMMAND_TYPES.COMMAND, MESSAGE_SOURCES.SYSTEM, context);
      
      // Note: The response will be handled by the message event listener
    } catch (error) {
      setIsProcessing(false);
      console.error('Error sending command:', error);
      
      // Add error message to the chat
      setMessages(prevMessages => [
        ...prevMessages,
        {
          id: `error-${Date.now()}`,
          content: `Error: ${error instanceof Error ? error.message : 'Failed to send command'}`,
          sender: 'system',
          timestamp: new Date(),
          type: COMMAND_TYPES.ALERT,
          source: MESSAGE_SOURCES.SYSTEM
        }
      ]);
      
      toast({
        title: 'Command Error',
        description: error instanceof Error ? error.message : 'Failed to send command',
        variant: 'destructive',
      });
    }
  };
  
  // Handle quick command click
  const handleQuickCommand = (command: string) => {
    setInput(command);
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };
  
  // Copy message to clipboard
  const copyToClipboard = (content: string) => {
    navigator.clipboard.writeText(content);
    toast({
      title: 'Copied to clipboard',
      description: 'Message content copied to clipboard',
      duration: 2000,
    });
  };
  
  // Toggle fullscreen mode
  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };
  
  // Render message based on type and source
  const renderMessage = (message: ElizaOSMessage) => {
    const isUser = message.sender === 'user';
    const isSystem = message.sender === 'system';
    const isAI = message.sender === 'ai';
    
    // Get appropriate background color based on message type
    let bgClass = '';
    let textClass = '';
    
    if (isUser) {
      bgClass = 'bg-primary/10';
      textClass = 'text-primary-foreground';
    } else if (isSystem) {
      bgClass = 'bg-muted';
      textClass = 'text-muted-foreground';
    } else if (isAI) {
      if (message.type === COMMAND_TYPES.ALERT) {
        bgClass = 'bg-destructive/10';
        textClass = 'text-destructive';
      } else if (message.type === COMMAND_TYPES.ANALYSIS) {
        bgClass = 'bg-info/10';
        textClass = 'text-info';
      } else {
        bgClass = 'bg-card';
        textClass = 'text-card-foreground';
      }
    }
    
    return (
      <div 
        key={message.id} 
        className={`mb-4 p-3 rounded-lg ${bgClass} ${isUser ? 'ml-auto mr-2 max-w-[80%]' : 'mr-auto ml-2 max-w-[80%]'}`}
      >
        {/* Message header with source badge */}
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2">
            {message.source && (
              <Badge 
                variant="outline" 
                className="text-xs font-normal"
              >
                {message.source}
              </Badge>
            )}
            <span className="text-xs text-muted-foreground">
              {new Date(message.timestamp).toLocaleTimeString()}
            </span>
          </div>
          
          {/* Copy button */}
          {!isSystem && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-5 w-5 opacity-50 hover:opacity-100"
                  onClick={() => copyToClipboard(message.content)}
                >
                  <Clipboard className="h-3 w-3" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Copy to clipboard</TooltipContent>
            </Tooltip>
          )}
        </div>
        
        {/* Message content with appropriate formatting */}
        <div className={`${textClass} whitespace-pre-wrap`}>
          {message.content}
        </div>
        
        {/* Metadata display for AI messages with rich data */}
        {isAI && message.metadata && Object.keys(message.metadata).length > 0 && (
          <div className="mt-2 pt-2 border-t border-border text-sm">
            <details className="text-muted-foreground">
              <summary className="cursor-pointer hover:text-foreground">
                Additional Information
              </summary>
              <pre className="mt-2 p-2 bg-muted rounded text-xs overflow-auto">
                {JSON.stringify(message.metadata, null, 2)}
              </pre>
            </details>
          </div>
        )}
      </div>
    );
  };
  
  // Determine content height based on fullscreen state
  const contentHeight = isFullscreen ? 'calc(100vh - 120px)' : height;
  
  return (
    <Card className={`relative ${isFullscreen ? 'fixed inset-4 z-50' : ''}`}>
      {showTitle && (
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <div className="flex items-center gap-2">
            <Terminal className="h-5 w-5" />
            <CardTitle>ElizaOS Command Center</CardTitle>
            
            {/* Connection status indicator */}
            <Badge 
              variant={isConnected ? "success" : "destructive"}
              className="ml-2"
            >
              {isConnected ? 'Connected' : 'Disconnected'}
            </Badge>
          </div>
          
          {/* Fullscreen toggle */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={toggleFullscreen}
              >
                {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              {isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
            </TooltipContent>
          </Tooltip>
        </CardHeader>
      )}
      
      {/* Messages area */}
      <CardContent className={`p-0 ${showTitle ? 'pt-0' : 'pt-4'}`}>
        <ScrollArea className={`p-4 h-[${contentHeight}]`} type="always">
          <div className="space-y-4 pr-4">
            {messages.map(renderMessage)}
            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>
      </CardContent>
      
      {/* Quick command buttons */}
      <div className="px-4 pb-2">
        <div className="flex flex-wrap gap-2">
          {quickCommands.map((cmd, index) => (
            <Button
              key={index}
              variant="outline"
              size="sm"
              className="h-8 gap-1"
              onClick={() => handleQuickCommand(cmd.command)}
              disabled={!isConnected}
            >
              <cmd.icon className="h-3.5 w-3.5" />
              <span className="text-xs">{cmd.label}</span>
            </Button>
          ))}
        </div>
      </div>
      
      {/* Input area */}
      <CardFooter className="flex gap-2 p-4 pt-2">
        <form onSubmit={handleSubmit} className="flex w-full gap-2">
          <Input
            ref={inputRef}
            className="flex-1"
            placeholder={isConnected ? "Enter a command or ask a question..." : "Disconnected from ElizaOS..."}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={!isConnected || isProcessing}
          />
          <Tooltip>
            <TooltipTrigger asChild>
              <Button 
                type="submit" 
                size="icon" 
                disabled={!isConnected || !input.trim() || isProcessing}
              >
                {isProcessing ? <Sparkles className="h-4 w-4 animate-pulse" /> : <Send className="h-4 w-4" />}
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              {isProcessing ? 'Processing...' : 'Send Command'}
            </TooltipContent>
          </Tooltip>
        </form>
      </CardFooter>
      
      {/* NLP hint */}
      {isConnected && (
        <div className="absolute bottom-16 right-4">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" className="h-5 w-5 opacity-50 hover:opacity-100">
                <Info className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="left" className="max-w-xs">
              <p className="text-xs">
                ElizaOS understands natural language. Try asking questions like "Show me market trends" or "What is the balance of wallet x"
              </p>
            </TooltipContent>
          </Tooltip>
        </div>
      )}
    </Card>
  );
}
