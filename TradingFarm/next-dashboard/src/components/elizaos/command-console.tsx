'use client';

import React from 'react';
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
const cn = (...classes: (string | undefined)[]): string => {
  return classes.filter(Boolean).join(' ');
};

const CommandConsole: React.FC<CommandConsoleProps> = ({
  farmId,
  height = 'normal',
  autoScroll = true,
  className
}: CommandConsoleProps) => {
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
  
  // Auto-scroll to bottom when messages change
  React.useEffect(() => {
    if (autoScroll && messagesEndRef.current && !isMinimized) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isMinimized, autoScroll]);
  
  // Format timestamp for display
  const formatTime = (timestamp: string): string => {
    try {
      return format(new Date(timestamp), 'HH:mm:ss');
    } catch (e) {
      return '00:00:00';
    }
  };

  // Send a command to the socket server
  const sendCommand = (e: React.MouseEvent<HTMLButtonElement>): void => {
    if (!input.trim() || !isConnected) return;
    
    const userMessage: ConsoleMessage = {
      id: `user-${Date.now()}`,
      content: input,
      timestamp: new Date().toISOString(),
      category: 'command' as MessageCategory,
      source: 'user' as MessageSource,
      isUser: true,
      sender: 'user'
    };
    
    setMessages((prev: ConsoleMessage[]) => [...prev, userMessage]);
    
    // Emit the command to the socket server
    send('ELIZAOS_COMMAND', {
      command: input,
      farmId,
      timestamp: new Date().toISOString()
    });
    
    setInput('');
  };

  // Handle Enter key press
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>): void => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendCommand(e);
    }
  };
  
  // Clear all messages
  const clearMessages = (): void => {
    // Keep only welcome message
    const welcomeMessage = messages.find((msg: ConsoleMessage) => msg.id === 'welcome');
    setMessages(welcomeMessage ? [welcomeMessage] : []);
  };
  
  // Get message style based on category and source
  const getMessageStyle = (message: ConsoleMessage): {
    containerClass: string;
    iconComponent: React.ReactNode;
    labelText: string;
    labelClass: string;
  } => {
    // Default styles
    let containerClass = 'bg-muted/30';
    let iconComponent = <Bot className="h-4 w-4" />;
    let labelText = 'System';
    let labelClass = 'bg-muted text-muted-foreground';
    
    // User message styles
    if (message.isUser) {
      return {
        containerClass: 'bg-primary/10',
        iconComponent: null,
        labelText: 'You',
        labelClass: 'bg-primary/20 text-primary'
      };
    }
    
    // Style based on message source
    if (message.source === 'knowledge-base') {
      return {
        containerClass: 'bg-blue-500/10',
        iconComponent: <Database className="h-4 w-4 text-blue-500" />,
        labelText: 'Knowledge',
        labelClass: 'bg-blue-500/20 text-blue-700 dark:text-blue-300'
      };
    }
    
    if (message.source === 'strategy') {
      return {
        containerClass: 'bg-amber-500/10',
        iconComponent: <Bot className="h-4 w-4 text-amber-500" />,
        labelText: 'Strategy',
        labelClass: 'bg-amber-500/20 text-amber-700 dark:text-amber-300'
      };
    }
    
    // Style based on message category
    if (message.category === 'alert') {
      return {
        containerClass: 'bg-red-500/10',
        iconComponent: <Bot className="h-4 w-4 text-red-500" />,
        labelText: 'Alert',
        labelClass: 'bg-red-500/20 text-red-700 dark:text-red-300'
      };
    }
    
    if (message.category === 'analysis') {
      return {
        containerClass: 'bg-purple-500/10',
        iconComponent: <Bot className="h-4 w-4 text-purple-500" />,
        labelText: 'Analysis',
        labelClass: 'bg-purple-500/20 text-purple-700 dark:text-purple-300'
      };
    }
    
    // Default ElizaOS message style
    return {
      containerClass: 'bg-green-500/10',
      iconComponent: <Bot className="h-4 w-4 text-green-500" />,
      labelText: 'ElizaOS',
      labelClass: 'bg-green-500/20 text-green-700 dark:text-green-300'
    };
  };
  
  // Render message content with markdown-like formatting
  const renderMessageContent = (content: string): React.ReactNode => {
    // Simple markdown-like formatting
    // Convert headings
    const withHeadings = content.replace(/^(#+)\s+(.+)$/gm, (match, hashes, text) => {
      const level = hashes.length;
      const size = level === 1 ? 'text-xl font-bold mb-2' 
                 : level === 2 ? 'text-lg font-bold mb-1' 
                 : 'text-base font-bold mb-1';
      return `<h${level} class="${size}">${text}</h${level}>`;
    });
    
    // Convert bold
    const withBold = withHeadings.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    
    // Convert italic
    const withItalic = withBold.replace(/\*(.+?)\*/g, '<em>$1</em>');
    
    // Convert lists
    const withLists = withItalic.replace(/^-\s+(.+)$/gm, '<li>$1</li>');
    
    // Split by line breaks and wrap in paragraphs if not already wrapped
    const formatted = withLists
      .split('\n')
      .map(line => {
        if (line.startsWith('<h') || line.startsWith('<li>')) return line;
        if (!line.trim()) return '<br>';
        return `<p>${line}</p>`;
      })
      .join('');
    
    return <div dangerouslySetInnerHTML={{ __html: formatted }} />;
  };

  return (
    <div className={cn("flex flex-col border rounded-md overflow-hidden bg-background", className)}>
      {/* Console Header */}
      <div className="flex items-center justify-between p-2 border-b bg-muted/20">
        <div className="flex items-center">
          <Bot className="h-5 w-5 mr-2 text-green-500" />
          <span className="font-medium">ElizaOS Command Console</span>
          {!isConnected && <span className="ml-2 text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300">Offline</span>}
        </div>
        <div className="flex items-center gap-1">
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-7 w-7" 
            onClick={clearMessages}
            title="Clear console"
          >
            <X className="h-4 w-4" />
          </Button>
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-7 w-7" 
            onClick={() => setIsMinimized(!isMinimized)}
            title={isMinimized ? "Expand" : "Minimize"}
          >
            {isMinimized ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </Button>
        </div>
      </div>
      
      {/* Messages Area */}
      {!isMinimized && (
        <div className={cn("overflow-y-auto p-3 space-y-3", getConsoleHeight())}>
          {messages.map((message: ConsoleMessage) => {
            const { containerClass, iconComponent, labelText, labelClass } = getMessageStyle(message);
            
            return (
              <div key={message.id} className={cn("p-3 rounded-lg", containerClass)}>
                <div className="flex items-start gap-2">
                  <div className="flex flex-col items-start">
                    <div className="flex items-center gap-1.5 mb-1.5">
                      {iconComponent}
                      <span className={cn("text-xs px-1.5 py-0.5 rounded-full", labelClass)}>
                        {labelText}
                      </span>
                      <span className="text-xs text-muted-foreground ml-1">
                        {formatTime(message.timestamp)}
                      </span>
                    </div>
                    <div className="text-sm">
                      {renderMessageContent(message.content)}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
          <div ref={messagesEndRef} />
        </div>
      )}
      
      {/* Input Area */}
      {!isMinimized && (
        <div className="p-2 border-t mt-auto">
          <div className="flex gap-2">
            <Input
              value={input}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={isConnected ? "Type a command or question..." : "Disconnected..."}
              disabled={!isConnected}
              className="flex-1"
            />
            <Button 
              onClick={sendCommand} 
              disabled={!isConnected || !input.trim()}
              size="icon"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export { CommandConsole };
export default CommandConsole;
