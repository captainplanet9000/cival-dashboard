"use client";

import React, { useState, useRef, useEffect } from 'react';
import { useChat } from 'ai/react';
import { useTheme } from 'next-themes';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  ArrowUpIcon,
  SendIcon,
  MenuIcon,
  InfoIcon,
  PlusIcon,
  RefreshCcwIcon,
  SettingsIcon,
  BotIcon,
  Trash2Icon,
  UploadIcon,
  BrainIcon,
  ZapIcon
} from 'lucide-react';
import { knowledgeService, DocumentSourceType } from '@/services/knowledge-service';
import { TradingEventEmitter, TRADING_EVENTS } from '@/utils/events/trading-events';
import { useToast } from '@/components/ui/use-toast';

// Command message interface
interface CommandMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  metadata?: {
    type?: 'code' | 'trading' | 'error' | 'success' | 'info';
    action?: string;
    data?: any;
  };
}

// Predefined system prompts
const SYSTEM_PROMPTS = {
  default: `You are ElizaOS, an advanced trading assistant integrated into the Trading Farm Dashboard. You help users with trading strategies, market analysis, and managing their portfolios. You can access user assets and perform actions via commands.`,
  trading: `You are focused on trading execution. Help the user place orders, manage positions, and analyze market conditions. Use specific commands like /trade, /position, /market to perform actions.`,
  research: `You are focused on market research. Help the user analyze market trends, research assets, and develop trading strategies. Use knowledge from uploaded documents.`,
  developer: `You are focused on helping the user with code and automation. Help develop trading algorithms, indicators, and automated strategies. Use PineScript and other supported languages.`,
};

export function CommandConsole() {
  const { toast } = useToast();
  const { theme } = useTheme();
  const [activePrompt, setActivePrompt] = useState<keyof typeof SYSTEM_PROMPTS>('default');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [listeningToEvents, setListeningToEvents] = useState(false);
  
  // Initialize chat with ai/react
  const { messages, input, handleInputChange, handleSubmit, setMessages, isLoading, error } = useChat({
    api: '/api/chat',
    initialMessages: [
      {
        id: 'system-1',
        role: 'system',
        content: SYSTEM_PROMPTS.default,
      },
    ],
  });
  
  // Convert AI messages to our format with timestamps and metadata
  const formattedMessages: CommandMessage[] = messages.map(msg => ({
    id: msg.id,
    role: msg.role as 'user' | 'assistant' | 'system',
    content: msg.content,
    timestamp: new Date(),
    metadata: msg.role === 'system' ? { type: 'info' } : undefined,
  }));
  
  // Auto scroll to bottom of messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [formattedMessages]);
  
  // Subscribe to trading events when component mounts
  useEffect(() => {
    if (!listeningToEvents) {
      // Subscribe to order events
      const orderHandler = (data: any) => {
        const newMessage: CommandMessage = {
          id: `event-${Date.now()}`,
          role: 'system',
          content: `Order ${data.status}: ${data.side} ${data.size} ${data.symbol} @ ${data.price}`,
          timestamp: new Date(),
          metadata: {
            type: 'trading',
            action: 'order',
            data
          }
        };
        
        setMessages(prev => [...prev, {
          id: newMessage.id,
          role: newMessage.role,
          content: newMessage.content,
        }]);
        
        toast({
          title: "Order Update",
          description: newMessage.content,
        });
      };
      
      // Subscribe to position events
      const positionHandler = (data: any) => {
        const newMessage: CommandMessage = {
          id: `event-${Date.now()}`,
          role: 'system',
          content: `Position Update: ${data.side} ${data.size} ${data.symbol} | PnL: ${data.unrealizedPnl}`,
          timestamp: new Date(),
          metadata: {
            type: 'trading',
            action: 'position',
            data
          }
        };
        
        setMessages(prev => [...prev, {
          id: newMessage.id,
          role: newMessage.role,
          content: newMessage.content,
        }]);
      };
      
      // Subscribe to error events
      const errorHandler = (data: any) => {
        const newMessage: CommandMessage = {
          id: `event-${Date.now()}`,
          role: 'system',
          content: `Error: ${data.message}`,
          timestamp: new Date(),
          metadata: {
            type: 'error',
            data
          }
        };
        
        setMessages(prev => [...prev, {
          id: newMessage.id,
          role: newMessage.role,
          content: newMessage.content,
        }]);
        
        toast({
          variant: "destructive",
          title: "Error",
          description: data.message,
        });
      };
      
      TradingEventEmitter.on(TRADING_EVENTS.ORDER_UPDATE, orderHandler);
      TradingEventEmitter.on(TRADING_EVENTS.POSITION_UPDATE, positionHandler);
      TradingEventEmitter.on(TRADING_EVENTS.ERROR, errorHandler);
      
      setListeningToEvents(true);
      
      // Clean up event listeners
      return () => {
        TradingEventEmitter.off(TRADING_EVENTS.ORDER_UPDATE, orderHandler);
        TradingEventEmitter.off(TRADING_EVENTS.POSITION_UPDATE, positionHandler);
        TradingEventEmitter.off(TRADING_EVENTS.ERROR, errorHandler);
      };
    }
  }, [setMessages, toast, listeningToEvents]);
  
  // Handle changing the system prompt
  const handleChangePrompt = (prompt: keyof typeof SYSTEM_PROMPTS) => {
    setActivePrompt(prompt);
    setMessages([
      {
        id: `system-${Date.now()}`,
        role: 'system',
        content: SYSTEM_PROMPTS[prompt],
      },
      ...messages.filter(msg => msg.role !== 'system'),
    ]);
  };
  
  // Handle clearing the chat
  const handleClearChat = () => {
    setMessages([
      {
        id: `system-${Date.now()}`,
        role: 'system',
        content: SYSTEM_PROMPTS[activePrompt],
      },
    ]);
  };
  
  // Handle file upload button click
  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };
  
  // Handle file upload
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    
    const file = files[0];
    setUploadingFile(true);
    
    try {
      // Upload file to storage
      const path = `uploads/${Date.now()}_${file.name}`;
      const uploadResponse = await knowledgeService.uploadFile(file, path);
      
      if (!uploadResponse.success) {
        throw new Error(uploadResponse.error || 'Upload failed');
      }
      
      // Extract content based on file type
      let content = '';
      let sourceType = DocumentSourceType.TEXT;
      
      // Determine source type from file extension
      if (file.name.endsWith('.pdf')) {
        sourceType = DocumentSourceType.PDF;
        // In a real implementation, you'd use a PDF parsing library
        content = 'PDF content extraction is simulated for this demo.';
      } else if (file.name.endsWith('.pine')) {
        sourceType = DocumentSourceType.PINESCRIPT;
        content = await file.text();
      } else {
        // Default to text
        content = await file.text();
      }
      
      // Add document to knowledge base
      const docResponse = await knowledgeService.addDocument({
        title: file.name,
        content,
        source_type: sourceType,
        file_path: path,
        metadata: {
          fileSize: file.size,
          fileType: file.type,
          uploadDate: new Date().toISOString(),
        },
      });
      
      if (!docResponse.success) {
        throw new Error(docResponse.error || 'Failed to process document');
      }
      
      // Add system message about successful upload
      const newMessage: CommandMessage = {
        id: `upload-${Date.now()}`,
        role: 'system',
        content: `File uploaded and processed: ${file.name}`,
        timestamp: new Date(),
        metadata: {
          type: 'success',
          action: 'upload',
          data: { fileName: file.name, documentId: docResponse.data?.id }
        }
      };
      
      setMessages(prev => [...prev, {
        id: newMessage.id,
        role: newMessage.role,
        content: newMessage.content,
      }]);
      
      toast({
        title: "File Uploaded",
        description: `${file.name} has been added to your knowledge base.`,
      });
    } catch (error: any) {
      console.error('Error uploading file:', error);
      
      // Add error message
      const errorMessage: CommandMessage = {
        id: `error-${Date.now()}`,
        role: 'system',
        content: `Error uploading file: ${error.message}`,
        timestamp: new Date(),
        metadata: {
          type: 'error',
          action: 'upload',
        }
      };
      
      setMessages(prev => [...prev, {
        id: errorMessage.id,
        role: errorMessage.role,
        content: errorMessage.content,
      }]);
      
      toast({
        variant: "destructive",
        title: "Upload Failed",
        description: error.message,
      });
    } finally {
      setUploadingFile(false);
      // Clear the file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };
  
  return (
    <Card className="flex flex-col h-[calc(100vh-2rem)] mx-auto">
      <CardHeader className="px-4 py-2 border-b">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <BrainIcon className="h-6 w-6 text-primary" />
            <CardTitle>ElizaOS Command Console</CardTitle>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <MenuIcon className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Options</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => handleChangePrompt('default')}>
                <BotIcon className="mr-2 h-4 w-4" />
                <span>Default Assistant</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleChangePrompt('trading')}>
                <ZapIcon className="mr-2 h-4 w-4" />
                <span>Trading Assistant</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleChangePrompt('research')}>
                <InfoIcon className="mr-2 h-4 w-4" />
                <span>Research Assistant</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleChangePrompt('developer')}>
                <SettingsIcon className="mr-2 h-4 w-4" />
                <span>Developer Assistant</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleClearChat}>
                <Trash2Icon className="mr-2 h-4 w-4" />
                <span>Clear Chat</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        <CardDescription>
          Ask questions, issue commands, or upload trading documents
        </CardDescription>
      </CardHeader>
      <CardContent className="flex-1 overflow-hidden p-0">
        <ScrollArea className="h-full">
          <div className="flex flex-col p-4 space-y-4">
            {formattedMessages.map((message) => (
              <div 
                key={message.id}
                className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {message.role !== 'user' && message.role !== 'system' && (
                  <Avatar className="h-8 w-8 mr-2">
                    <AvatarFallback>AI</AvatarFallback>
                    <AvatarImage src="/elizaos-avatar.png" alt="ElizaOS" />
                  </Avatar>
                )}
                <div 
                  className={`rounded-lg px-3 py-2 max-w-[80%] ${
                    message.role === 'user'
                      ? 'bg-primary text-primary-foreground'
                      : message.role === 'system'
                      ? 'bg-muted text-muted-foreground text-xs'
                      : 'bg-muted-foreground/10'
                  }`}
                >
                  {message.content}
                </div>
                {message.role === 'user' && (
                  <Avatar className="h-8 w-8 ml-2">
                    <AvatarFallback>U</AvatarFallback>
                    <AvatarImage src="/user-avatar.png" alt="User" />
                  </Avatar>
                )}
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>
      </CardContent>
      <CardFooter className="p-4 pt-2 border-t">
        <form 
          onSubmit={handleSubmit}
          className="flex items-center space-x-2 w-full"
        >
          <Button
            type="button"
            size="icon"
            variant="outline"
            onClick={handleUploadClick}
            disabled={uploadingFile}
          >
            {uploadingFile ? (
              <RefreshCcwIcon className="h-4 w-4 animate-spin" />
            ) : (
              <UploadIcon className="h-4 w-4" />
            )}
          </Button>
          <Input
            value={input}
            onChange={handleInputChange}
            placeholder="Type a message or command..."
            className="flex-1"
            disabled={isLoading}
          />
          <Button type="submit" size="icon" disabled={isLoading || !input.trim()}>
            {isLoading ? (
              <RefreshCcwIcon className="h-4 w-4 animate-spin" />
            ) : (
              <SendIcon className="h-4 w-4" />
            )}
          </Button>
        </form>
        {/* Hidden file input */}
        <input
          type="file"
          ref={fileInputRef}
          className="hidden"
          accept=".txt,.pdf,.pine,.pine5,.js,.csv,.json"
          onChange={handleFileUpload}
        />
      </CardFooter>
    </Card>
  );
}

export default CommandConsole;
