'use client';

import * as React from 'react';
import { useSocket } from '@/providers/socket-provider';
import { format } from 'date-fns';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Send, Bot, Database, ChevronDown, ChevronUp, X } from 'lucide-react';
import { ConsoleMessage, MessageCategory, MessageSource } from '@/types/elizaos.types';

interface CommandConsoleProps {
  farmId: string;
  height?: 'compact' | 'normal' | 'full';
  autoScroll?: boolean;
  className?: string;
}

// Utility function for classNames
const cn = (...classes: string[]) => {
  return classes.filter(Boolean).join(' ');
};

const CommandConsole: React.FC<CommandConsoleProps> = ({
  farmId,
  height = 'normal',
  autoScroll = true,
  className
}) => {
  const [input, setInput] = React.useState('');
  const [messages, setMessages] = React.useState<ConsoleMessage[]>([]);
  const [isMinimized, setIsMinimized] = React.useState(false);
  const messagesEndRef = React.useRef<HTMLDivElement>(null);
  const { isConnected, send, latestMessages } = useSocket();

  // Calculate height based on the height prop
  const getConsoleHeight = (): string => {
    switch (height) {
      case 'compact':
        return 'h-[300px]';
      case 'full':
        return 'h-[600px]';
      case 'normal':
      default:
        return 'h-[400px]';
    }
  };

  // Add welcome message on component mount
  React.useEffect(() => {
    const welcomeMessage: ConsoleMessage = {
      id: 'welcome',
      content: `# Welcome to ElizaOS Command Console\n\nThis console allows you to interact with the ElizaOS AI to manage your trading farm, access knowledge, and control various system features.\n\n**Available Commands:**\n- Use natural language to query the system\n- Ask about market conditions, strategies, or portfolio status\n- Issue commands to manage positions or adjust settings\n\nType 'help' to see more detailed command information.`,
      timestamp: new Date().toISOString(),
      category: 'system' as MessageCategory,
      source: 'system' as MessageSource,
      isUser: false,
      sender: 'system',
      metadata: {
        farmId
      }
    };
    
    setMessages([welcomeMessage]);
  }, [farmId]);

  // Process incoming messages from socket
  React.useEffect(() => {
    // Check for COMMAND_RESPONSE messages
    const commandResponse = latestMessages?.COMMAND_RESPONSE;
    if (commandResponse) {
      const responseMessage: ConsoleMessage = {
        id: commandResponse.id || `cmd-${Date.now()}`,
        content: commandResponse.content || 'Command processed',
        timestamp: commandResponse.timestamp || new Date().toISOString(),
        category: (commandResponse.category || 'response') as MessageCategory,
        source: (commandResponse.source || 'system') as MessageSource,
        isUser: false,
        sender: 'elizaos',
        metadata: {
          ...commandResponse.metadata,
          farmId
        }
      };
      
      setMessages((prev: ConsoleMessage[]) => [...prev, responseMessage]);
    }
    
    // Check for KNOWLEDGE_RESPONSE messages
    const knowledgeResponse = latestMessages?.KNOWLEDGE_RESPONSE;
    if (knowledgeResponse) {
      const knowledgeMessage: ConsoleMessage = {
        id: knowledgeResponse.id || `knowledge-${Date.now()}`,
        content: knowledgeResponse.content || 'Knowledge retrieved',
        timestamp: knowledgeResponse.timestamp || new Date().toISOString(),
        category: (knowledgeResponse.category || 'knowledge') as MessageCategory,
        source: (knowledgeResponse.source || 'knowledge-base') as MessageSource,
        isUser: false,
        sender: 'elizaos',
        metadata: {
          ...knowledgeResponse.metadata,
          farmId
        }
      };
      
      setMessages((prev: ConsoleMessage[]) => [...prev, knowledgeMessage]);
    }
  }, [latestMessages, farmId]);

  // Auto scroll to bottom when messages change
  React.useEffect(() => {
    if (autoScroll && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, autoScroll]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!input.trim()) return;
    
    // Create a user message
    const userMessage: ConsoleMessage = {
      id: `user-${Date.now()}`,
      content: input,
      timestamp: new Date().toISOString(),
      category: 'command' as MessageCategory,
      source: 'user' as MessageSource,
      isUser: true,
      sender: 'user',
      metadata: {
        farmId
      }
    };
    
    // Add to messages
    setMessages((prev: ConsoleMessage[]) => [...prev, userMessage]);
    
    // Send to server through socket
    send('ELIZAOS_COMMAND', { command: input, farm_id: farmId });
    
    // Clear input
    setInput('');
  };

  const getCategoryStyle = (category: MessageCategory): string => {
    switch (category) {
      case 'command':
        return 'bg-blue-500 text-white';
      case 'query':
        return 'bg-purple-500 text-white';
      case 'alert':
        return 'bg-red-500 text-white';
      case 'analysis':
        return 'bg-indigo-500 text-white';
      case 'system':
        return 'bg-gray-500 text-white';
      default:
        // Handle custom categories
        if (category === 'response' as any) {
          return 'bg-green-500 text-white';
        }
        if (category === 'knowledge' as any) {
          return 'bg-yellow-500 text-white';
        }
        return 'bg-gray-500 text-white';
    }
  };

  const getSourceIcon = (source: MessageSource): React.ReactNode => {
    switch (source) {
      case 'user':
        return null;
      case 'system':
        return <Bot className="h-4 w-4" />;
      case 'knowledge-base':
        return <Database className="h-4 w-4" />;
      default:
        return <Bot className="h-4 w-4" />;
    }
  };

  // Format message content with markdown-like syntax
  const formatContent = (content: string): string => {
    // Replace headers
    let formattedContent = content.replace(/^# (.+)$/gm, '<h3 class="text-lg font-bold mb-2">$1</h3>');
    formattedContent = formattedContent.replace(/^## (.+)$/gm, '<h4 class="text-md font-bold mb-1">$1</h4>');
    formattedContent = formattedContent.replace(/^### (.+)$/gm, '<h5 class="font-bold mb-1">$1</h5>');
    
    // Replace bold
    formattedContent = formattedContent.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    
    // Replace italics
    formattedContent = formattedContent.replace(/\*(.+?)\*/g, '<em>$1</em>');
    
    // Replace code
    formattedContent = formattedContent.replace(/`(.+?)`/g, '<code class="bg-gray-100 dark:bg-gray-800 px-1 rounded">$1</code>');
    
    // Replace links
    formattedContent = formattedContent.replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2" class="text-blue-500 hover:underline">$1</a>');
    
    // Replace bullet lists
    formattedContent = formattedContent.replace(/^- (.+)$/gm, '<li class="ml-4">$1</li>');
    
    // Handle paragraphs
    formattedContent = formattedContent.split('\n\n').map((para: string) => {
      if (
        !para.startsWith('<h') && 
        !para.startsWith('<li') && 
        para.trim() !== ''
      ) {
        return `<p class="mb-2">${para}</p>`;
      }
      return para;
    }).join('');
    
    // Convert line breaks within paragraphs
    formattedContent = formattedContent.replace(/\n/g, '<br/>');
    
    return formattedContent;
  };

  return (
    <div className={cn(
      "flex flex-col border rounded-lg overflow-hidden bg-card",
      className
    )}>
      {/* Header with controls */}
      <div className="flex items-center justify-between p-3 border-b bg-muted">
        <div className="flex items-center gap-2">
          <Bot className="h-5 w-5" />
          <span className="font-medium">ElizaOS Console</span>
          <span className={cn(
            "inline-flex items-center px-2 py-0.5 rounded text-xs",
            isConnected ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300" : 
                         "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300"
          )}>
            {isConnected ? "Connected" : "Disconnected"}
          </span>
        </div>
        
        <div className="flex items-center gap-1">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => setIsMinimized(!isMinimized)}
            className="h-8 w-8"
          >
            {isMinimized ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </Button>
          
          <Button 
            variant="ghost" 
            size="icon"
            onClick={() => setMessages([])}
            className="h-8 w-8"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>
      
      {/* Messages container */}
      {!isMinimized && (
        <div className={cn(
          "flex-1 overflow-y-auto p-3 space-y-3",
          getConsoleHeight()
        )}>
          {messages.map((message: ConsoleMessage) => (
            <div 
              key={message.id}
              className={cn(
                "flex items-start gap-3 p-3 rounded-lg",
                message.source === 'user' 
                  ? "bg-muted ml-6" 
                  : "border"
              )}
            >
              {message.source !== 'user' && (
                <div className={cn(
                  "flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center",
                  getCategoryStyle(message.category)
                )}>
                  {getSourceIcon(message.source)}
                </div>
              )}
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-medium">
                    {message.source === 'user' ? 'You' : 
                     message.source === 'system' ? 'ElizaOS' : 
                     message.source === 'knowledge-base' ? 'Knowledge Base' : 
                     message.source}
                  </span>
                  
                  <span className="text-xs text-muted-foreground">
                    {format(new Date(message.timestamp), 'h:mm:ss a')}
                  </span>
                </div>
                
                <div 
                  className="text-sm"
                  dangerouslySetInnerHTML={{ __html: formatContent(message.content) }}
                />
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>
      )}
      
      {/* Input form */}
      {!isMinimized && (
        <form onSubmit={handleSubmit} className="p-3 border-t">
          <div className="flex gap-2">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={isConnected ? "Type a command or question..." : "Connecting..."}
              disabled={!isConnected}
              className="flex-1"
            />
            <Button 
              type="submit" 
              disabled={!isConnected || !input.trim()}
              size="icon"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </form>
      )}
    </div>
  );
};

export default CommandConsole;
