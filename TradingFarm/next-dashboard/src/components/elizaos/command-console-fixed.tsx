'use client';

import * as React from 'react';
import { useSocket } from '@/providers/socket-provider';
import { format } from 'date-fns';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Send, Bot, Database, ChevronDown, ChevronUp, X, Loader2 } from 'lucide-react';
import { ConsoleMessage, MessageCategory, MessageSource } from '@/types/elizaos.types';
import { elizaOSMessagingAdapter } from '@/services/elizaos-messaging-adapter';
import { elizaOSAgentServiceSafe } from '@/services/elizaos-agent-service-safe';

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
  const [isLoading, setIsLoading] = React.useState(false);
  const messagesEndRef = React.useRef<HTMLDivElement>(null);
  const { isConnected } = useSocket();
  
  // Track update cycles with refs to prevent excessive re-renders
  const lastUpdateRef = React.useRef<number>(Date.now());
  const updateCounterRef = React.useRef<number>(0);
  const processedMsgIds = React.useRef(new Set<string>());
  const MIN_UPDATE_INTERVAL = 2000; // ms between updates

  // Calculate height based on the height prop
  const getConsoleHeight = (): string => {
    if (isMinimized) return 'h-0';
    
    switch (height) {
      case 'compact':
        return 'h-[300px]';
      case 'full':
        return className?.includes('h-[calc') ? '' : 'h-[600px]';
      case 'normal':
      default:
        return 'h-[400px]';
    }
  };

  // Add welcome message on component mount only once
  React.useEffect(() => {
    if (updateCounterRef.current === 0) {
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
      updateCounterRef.current++;
    }
  }, [farmId]);

  // Fetch agent commands periodically with throttling
  const fetchAgentCommands = React.useCallback(async () => {
    try {
      // Throttle updates to prevent excessive rendering
      const now = Date.now();
      if (now - lastUpdateRef.current < MIN_UPDATE_INTERVAL) {
        return; // Skip this update cycle
      }
      
      // Update the last update timestamp
      lastUpdateRef.current = now;
      
      // We need a valid agent ID to fetch commands
      // Since we only have farmId, we'll try to get the first agent in the farm
      const agents = await elizaOSAgentServiceSafe.getAgents();
      const farmAgents = agents.filter(a => a.farm_id?.toString() === farmId);
      
      if (farmAgents.length === 0) return;
      
      // Use the first agent in the farm
      const agentId = farmAgents[0].id;
      
      // Get the agent's recent commands
      const commands = await elizaOSAgentServiceSafe.getAgentCommands(agentId, 10);
      
      // Convert commands to console messages
      commands.forEach(cmd => {
        const messageId = cmd.id;
        
        // Skip if already processed
        if (processedMsgIds.current.has(messageId)) return;
        processedMsgIds.current.add(messageId);
        
        // Add user command
        const userMessage: ConsoleMessage = {
          id: `user-${messageId}`,
          content: cmd.command_text,
          timestamp: cmd.created_at,
          category: 'command' as MessageCategory,
          source: 'user' as MessageSource,
          isUser: true,
          sender: 'user',
          metadata: {
            agentId: cmd.agent_id,
            farmId
          }
        };
        
        // Add response if available
        const responseMessage: ConsoleMessage = {
          id: messageId,
          content: cmd.response_text || 'Command processed',
          timestamp: cmd.updated_at || cmd.created_at,
          category: 'response' as MessageCategory,
          source: 'system' as MessageSource,
          isUser: false,
          sender: 'elizaos',
          metadata: {
            agentId: cmd.agent_id,
            farmId,
            status: cmd.status,
            executionTime: cmd.execution_time_ms
          }
        };
        
        setMessages(prev => {
          // Check if messages with these IDs already exist
          const hasUserMsg = prev.some(m => m.id === `user-${messageId}`);
          const hasResponseMsg = prev.some(m => m.id === messageId);
          
          if (hasUserMsg && hasResponseMsg) return prev;
          
          // Add the new messages
          const newMessages = [...prev];
          if (!hasUserMsg) newMessages.push(userMessage);
          if (!hasResponseMsg && cmd.response_text) newMessages.push(responseMessage);
          
          // Sort by timestamp
          return newMessages.sort((a, b) => 
            new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
          );
        });
      });
    } catch (error) {
      console.error('Error fetching agent commands:', error);
    }
  }, [farmId]);
  
  // Set up subscription to message events with throttling
  React.useEffect(() => {
    // Function to handle new messages with throttling
    const handleNewMessage = (eventType: string, data: any) => {
      const now = Date.now();
      if (now - lastUpdateRef.current < MIN_UPDATE_INTERVAL) {
        return; // Skip this update to prevent loops
      }
      
      lastUpdateRef.current = now;
      
      const messageId = data.id || `${eventType}-${Date.now()}`;
      
      // Skip if already processed
      if (processedMsgIds.current.has(messageId)) return;
      processedMsgIds.current.add(messageId);
      
      // Create a message based on event type
      const newMessage: ConsoleMessage = {
        id: messageId,
        content: data.content || `${eventType} event received`,
        timestamp: data.timestamp || new Date().toISOString(),
        category: (data.category || eventType.toLowerCase()) as MessageCategory,
        source: (data.source || 'system') as MessageSource,
        isUser: false,
        sender: eventType === 'USER_MESSAGE' ? 'user' : 'elizaos',
        metadata: {
          ...data.metadata,
          farmId
        }
      };
      
      setMessages(prev => [...prev, newMessage]);
    };
    
    // Set up event subscriptions
    const unsubscribeCommand = elizaOSMessagingAdapter.subscribeToElizaEvents(
      'system', // Use 'system' as a placeholder for global events
      (response) => {
        handleNewMessage(response.type, response);
      }
    );
    
    // Initial fetch
    fetchAgentCommands();
    
    // Set up periodic fetching
    const intervalId = setInterval(() => {
      fetchAgentCommands();
    }, 10000); // Every 10 seconds
    
    return () => {
      unsubscribeCommand();
      clearInterval(intervalId);
    };
  }, [farmId, fetchAgentCommands]);

  // Auto-scroll to the latest message when messages change
  React.useEffect(() => {
    if (autoScroll && !isMinimized && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, autoScroll, isMinimized]);

  // Format timestamp for display
  const formatTime = (timestamp: string): string => {
    try {
      const date = new Date(timestamp);
      return format(date, 'HH:mm:ss');
    } catch (e) {
      return 'Invalid time';
    }
  };
  
  // Send a command using our safe messaging adapter
  const sendCommand = async (e: React.MouseEvent<HTMLButtonElement>): Promise<void> => {
    e.preventDefault();
    
    if (!input.trim() || !isConnected || isLoading) return;
    
    setIsLoading(true);
    
    try {
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
      
      // Add user message to the conversation
      setMessages(prev => [...prev, userMessage]);
      
      // We need to get the agent ID from the farm to send the command
      // Since we only have farmId, we'll try to get the first agent in the farm
      const agents = await elizaOSAgentServiceSafe.getAgents();
      const farmAgents = agents.filter(a => a.farm_id?.toString() === farmId);
      
      if (farmAgents.length === 0) {
        throw new Error('No agents found for this farm');
      }
      
      // Use the first agent in the farm
      const agentId = farmAgents[0].id;
      
      // Send the command using our safe adapter
      const commandText = input.startsWith('/') || input.startsWith('?') 
        ? input 
        : `/${input}`; // Format as command if it's not already
        
      await elizaOSAgentServiceSafe.addAgentCommand(agentId, commandText);
      
      // Schedule a refresh of the commands to get the response
      setTimeout(() => {
        fetchAgentCommands();
      }, 1000);
    } catch (error) {
      console.error('Error sending command:', error);
      
      // Add error message to conversation
      const errorMessage: ConsoleMessage = {
        id: `error-${Date.now()}`,
        content: error instanceof Error ? error.message : 'An unknown error occurred',
        timestamp: new Date().toISOString(),
        category: 'error' as MessageCategory,
        source: 'system' as MessageSource,
        isUser: false,
        sender: 'system',
        metadata: {
          farmId
        }
      };
      
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      // Clear input and loading state
      setInput('');
      setIsLoading(false);
    }
  };

  // Handle Enter key press
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>): void => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendCommand(e as unknown as React.MouseEvent<HTMLButtonElement>);
    }
  };

  // Clear all messages
  const clearMessages = (): void => {
    setMessages([]);
    processedMsgIds.current.clear();
  };

  // Get message style based on category and source
  const getMessageStyle = (message: ConsoleMessage): {
    containerClass: string;
    iconComponent: React.ReactNode;
    labelText: string;
    labelClass: string;
  } => {
    // Default ElizaOS message style
    const defaultStyle = {
      containerClass: 'bg-primary/10',
      iconComponent: <Bot className="h-5 w-5 text-primary" />,
      labelText: 'ElizaOS',
      labelClass: 'bg-primary/20 text-primary'
    };
    
    // User message style
    if (message.isUser) {
      return {
        containerClass: 'bg-blue-100 dark:bg-blue-900/20',
        iconComponent: <Send className="h-5 w-5 text-blue-500" />,
        labelText: 'You',
        labelClass: 'bg-blue-200 dark:bg-blue-700/30 text-blue-700 dark:text-blue-300'
      };
    }
    
    // Determine style based on category and source
    if (message.category === 'system') {
      return {
        containerClass: 'bg-gray-100 dark:bg-gray-800/50',
        iconComponent: <Database className="h-5 w-5 text-gray-500" />,
        labelText: 'System',
        labelClass: 'bg-gray-200 dark:bg-gray-700/50 text-gray-700 dark:text-gray-300'
      };
    }
    
    if (message.category === 'error') {
      return {
        containerClass: 'bg-red-100 dark:bg-red-900/20',
        iconComponent: <X className="h-5 w-5 text-red-500" />,
        labelText: 'Error',
        labelClass: 'bg-red-200 dark:bg-red-700/30 text-red-700 dark:text-red-300'
      };
    }
    
    if (message.category === 'knowledge') {
      return {
        containerClass: 'bg-purple-100 dark:bg-purple-900/20',
        iconComponent: <Database className="h-5 w-5 text-purple-500" />,
        labelText: 'Knowledge',
        labelClass: 'bg-purple-200 dark:bg-purple-700/30 text-purple-700 dark:text-purple-300'
      };
    }
    
    return defaultStyle;
  };

  // Render message content with markdown-like formatting
  const renderMessageContent = (content: string): React.ReactNode => {
    // Simple markdown-like formatting for headings
    let formatted = content
      .replace(/^# (.+)$/gm, '<h1 class="text-lg font-bold mb-2">$1</h1>')
      .replace(/^## (.+)$/gm, '<h2 class="text-base font-bold mb-1">$1</h2>')
      .replace(/^### (.+)$/gm, '<h3 class="text-sm font-bold mb-1">$1</h3>')
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.+?)\*/g, '<em>$1</em>')
      .replace(/`(.+?)`/g, '<code class="bg-muted px-1 py-0.5 rounded text-xs">$1</code>');
    
    // Simple bullet lists
    formatted = formatted.replace(/^- (.+)$/gm, '<li class="ml-4">• $1</li>');
    
    // Find consecutive <li> elements and wrap them in <ul>
    const withLists = formatted.replace(
      /(<li[^>]*>.*?<\/li>(\s*<li[^>]*>.*?<\/li>)+)/g,
      '<ul class="my-2">$1</ul>'
    );
    
    // Wrap remaining text in paragraphs if not already formatted
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
    <div className={cn("flex flex-col border rounded-md overflow-hidden bg-background h-full", className)}>
      {/* Console Header */}
      <div className="flex items-center justify-between p-2 border-b bg-muted/30">
        <div className="flex items-center">
          <Bot className="h-5 w-5 mr-2 text-primary" />
          <span className="font-medium">ElizaOS Command Console</span>
          {!isConnected && <span className="ml-2 text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300">Offline</span>}
          {isConnected && <span className="ml-2 text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300">Connected</span>}
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
      <div className={cn(
        "overflow-y-auto p-3 space-y-3 bg-accent/10 transition-all duration-300 flex-1", 
        getConsoleHeight(),
        isMinimized ? 'max-h-0 p-0 opacity-0' : 'opacity-100'
      )}>
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
      
      {/* Input Area */}
      <div className={cn(
        "p-2 border-t mt-auto transition-all duration-300",
        isMinimized ? 'h-0 p-0 opacity-0 overflow-hidden' : 'opacity-100'
      )}>
        <div className="flex gap-2">
          <Input
            value={input}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={isConnected ? "Type a command or question..." : "Disconnected..."}
            disabled={!isConnected || isMinimized || isLoading}
            className="flex-1"
          />
          <Button 
            onClick={sendCommand} 
            disabled={!isConnected || !input.trim() || isMinimized || isLoading}
            size="icon"
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};

export { CommandConsole };
export default CommandConsole;
