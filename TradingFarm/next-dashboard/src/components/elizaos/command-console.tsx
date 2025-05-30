'use client';

import React from 'react';
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

const PROVIDER_OPTIONS = [
  { value: 'openrouter', label: 'OpenRouter' },
  { value: 'openai', label: 'OpenAI' },
];
const MODEL_OPTIONS: Record<string, { value: string; label: string }[]> = {
  openrouter: [
    { value: 'gpt-4o', label: 'GPT-4o (OpenRouter)' },
    { value: 'openchat/openchat-8b', label: 'OpenChat-8B' },
    { value: 'meta-llama/llama-3-70b-instruct', label: 'Llama-3-70B' },
  ],
  openai: [
    { value: 'gpt-4o', label: 'GPT-4o (OpenAI)' },
    { value: 'gpt-3.5-turbo', label: 'GPT-3.5 Turbo' },
  ],
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
  const [provider, setProvider] = React.useState('openrouter');
  const [model, setModel] = React.useState('gpt-4o');
  const [showAdvanced, setShowAdvanced] = React.useState(false);
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
        return className?.includes('h-[calc') ? 'h-full' : 'h-[600px]';
      case 'normal':
      default:
        return 'h-[400px]';
    }
  };
  
  // Add global CSS variables for scrollbar styling
  // This is moved inside the component to comply with React's Rules of Hooks
  React.useLayoutEffect(() => {
    if (typeof window === 'undefined') return; // Skip during SSR
    
    const root = document.documentElement;
    root.style.setProperty('--scrollbar-width', '8px');
    root.style.setProperty('--scrollbar-track', 'rgba(0, 0, 0, 0.05)');
    root.style.setProperty('--scrollbar-thumb', 'rgba(0, 0, 0, 0.2)');
    
    const darkModeMediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const updateScrollbarColors = (isDark: boolean) => {
      root.style.setProperty('--scrollbar-track', isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)');
      root.style.setProperty('--scrollbar-thumb', isDark ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.2)');
    };
    
    updateScrollbarColors(darkModeMediaQuery.matches);
    darkModeMediaQuery.addEventListener('change', (e) => updateScrollbarColors(e.matches));
    
    // Add custom scrollbar styles
    const style = document.createElement('style');
    style.textContent = `
      .custom-scrollbar::-webkit-scrollbar {
        width: var(--scrollbar-width);
      }
      .custom-scrollbar::-webkit-scrollbar-track {
        background: var(--scrollbar-track);
        border-radius: 4px;
      }
      .custom-scrollbar::-webkit-scrollbar-thumb {
        background: var(--scrollbar-thumb);
        border-radius: 4px;
      }
      .custom-scrollbar::-webkit-scrollbar-thumb:hover {
        background: var(--scrollbar-thumb);
        opacity: 0.8;
      }
    `;
    document.head.appendChild(style);
    
    return () => {
      darkModeMediaQuery.removeEventListener('change', (e) => updateScrollbarColors(e.matches));
      document.head.removeChild(style);
    };
  }, []);

  // Scroll to bottom function with smooth behavior
  const scrollToBottom = React.useCallback(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, []);

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
  
  // Scroll to bottom on new messages
  React.useEffect(() => {
    if (autoScroll && messages.length > 0) {
      scrollToBottom();
    }
  }, [messages, autoScroll, scrollToBottom]);
  
  // Add keyboard shortcut to scroll down (Ctrl+End)
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+End to scroll to bottom
      if (e.ctrlKey && e.key === 'End') {
        scrollToBottom();
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [scrollToBottom]);

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
      
      // Use mock data instead of real API calls in development mode
      // This helps avoid connection errors during TanStack Query migration
      const mockAgents = [
        { id: 'agent-1', name: 'Alpha Bot', farmId: farmId, status: 'active' },
        { id: 'agent-2', name: 'Beta Trader', farmId: farmId, status: 'paused' }
      ];
      
      // Use the first agent in the farm
      const agentId = mockAgents[0].id;
      
      // Mock commands data formatted to match expected data structure
      const commands = [
        {
          id: 'cmd-1',
          agent_id: agentId,
          command_text: 'analyze market BTC/USDT',
          response_text: 'Market analysis complete. Bitcoin shows strong support at current levels.',
          status: 'completed',
          created_at: new Date(Date.now() - 1000 * 60 * 5).toISOString(),
          updated_at: new Date(Date.now() - 1000 * 60 * 4).toISOString(),
          execution_time_ms: 280
        },
        {
          id: 'cmd-2',
          agent_id: agentId,
          command_text: 'check portfolio risk',
          response_text: 'Portfolio risk analysis: Low risk exposure (15%). Diversification score: 8.5/10',
          status: 'completed',
          created_at: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
          updated_at: new Date(Date.now() - 1000 * 60 * 14).toISOString(),
          execution_time_ms: 320
        }
      ];
      
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
        if (cmd.response_text) {
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
            if (!hasResponseMsg) newMessages.push(responseMessage);
            
            // Sort by timestamp
            return newMessages.sort((a, b) => 
              new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
            );
          });
        }
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
  
  // Send a command using LLM server action for natural language, fallback to agent for /agent commands
  const sendCommand = async (e: React.MouseEvent<HTMLButtonElement>): Promise<void> => {
    e.preventDefault();
    if (!input.trim() || !isConnected || isLoading) return;
    setIsLoading(true);
    try {
      // Always show user message immediately
      const userMessage: ConsoleMessage = {
        id: `user-${Date.now()}`,
        content: input,
        timestamp: new Date().toISOString(),
        category: 'command' as MessageCategory,
        source: 'user' as MessageSource,
        isUser: true,
        sender: 'user',
        metadata: { farmId }
      };
      setMessages(prev => [...prev, userMessage]);

      // If command starts with /agent, use agent command logic
      if (input.trim().startsWith('/agent')) {
        // Existing agent command logic
        const agents = await elizaOSAgentServiceSafe.getAgents();
        const farmAgents = agents.filter(a => a.farm_id?.toString() === farmId);
        if (farmAgents.length === 0) throw new Error('No agents found for this farm');
        const agentId = farmAgents[0].id;
        await elizaOSAgentServiceSafe.addAgentCommand(agentId, input);
        setTimeout(() => { fetchAgentCommands(); }, 1000);
        return;
      }

      // Otherwise, send to new intent API
      const res = await fetch('/api/elizaos/intent/route', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ input, provider, model })
      });
      const result = await res.json();
      if (result.error) {
        throw new Error(result.error || 'LLM failed to process command');
      }
      // Compose a system message for the LLM response
      const llmMessage: ConsoleMessage = {
        id: `llm-${Date.now()}`,
        content:
          `**Provider:** ${result.provider || provider}\n**Model:** ${result.model || model}\n---\n${result.completion || result.raw?.choices?.[0]?.message?.content || 'No response.'}`,
        timestamp: new Date().toISOString(),
        category: 'system' as MessageCategory,
        source: 'elizaos' as MessageSource,
        isUser: false,
        sender: 'elizaos',
        metadata: { farmId, provider: result.provider || provider, model: result.model || model }
      };
      setMessages(prev => [...prev, llmMessage]);
    } catch (error) {
      console.error('Error sending command:', error);
      const errorMessage: ConsoleMessage = {
        id: `error-${Date.now()}`,
        content: error instanceof Error ? error.message : 'An unknown error occurred',
        timestamp: new Date().toISOString(),
        category: 'error' as MessageCategory,
        source: 'system' as MessageSource,
        isUser: false,
        sender: 'system',
        metadata: { farmId }
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
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
  type MessageStyle = {
    containerClass: string;
    iconComponent: React.ReactNode;
    labelText: string;
    labelClass: string;
  };
  
  const getMessageStyle = (message: ConsoleMessage): MessageStyle => {
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
    const paragraphed = withLists
      .split('\n')
      .map(line => {
        if (line.startsWith('<h') || line.startsWith('<li>') || line.startsWith('<ul>')) return line;
        if (!line.trim()) return '<br>';
        return `<p>${line}</p>`;
      })
      .join('');
    
    return <div dangerouslySetInnerHTML={{ __html: paragraphed }} />;
  };

  return (
    <div className={cn("flex flex-col border rounded-md overflow-hidden bg-background h-full", className)}>
      {/* Console Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b bg-muted/30">
        <div className="flex items-center">
          <Bot className="h-5 w-5 mr-2 text-primary" />
          <span className="font-medium text-base">ElizaOS Command Console</span>
          <span className="ml-2 text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300">Connected</span>
        </div>
        <div className="flex items-center gap-2">
          <Button 
            variant="ghost" 
            size="sm"
            onClick={clearMessages}
            className="h-8 px-2 text-xs"
          >
            Clear
          </Button>
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-8 w-8" 
            onClick={() => setIsMinimized(!isMinimized)}
            title={isMinimized ? "Expand" : "Minimize"}
          >
            {isMinimized ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </Button>
        </div>
      </div>
      
      {/* Messages Area */}
      <div className={cn(
        "overflow-y-auto p-4 space-y-4 bg-background transition-all duration-300 flex-1 custom-scrollbar", 
        getConsoleHeight(),
        isMinimized ? 'max-h-0 p-0 opacity-0' : 'opacity-100'
      )}
      style={{
        scrollbarWidth: 'thin',
        scrollbarColor: 'var(--scrollbar-thumb) var(--scrollbar-track)',
        maxHeight: height === 'full' ? '100%' : undefined,
      }}>
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
              <Bot size={32} className="mb-2" />
              <p>No messages yet. Start a conversation!</p>
            </div>
          )}
          
          {messages.map((message: ConsoleMessage) => {
            const { containerClass, iconComponent, labelText, labelClass } = getMessageStyle(message);
            
            return (
              <div key={message.id} className={cn("p-4 rounded-lg", containerClass)}>
                <div className="flex items-start gap-3">
                  <div className="flex flex-col items-start w-full">
                    <div className="flex items-center gap-2 mb-2">
                      {iconComponent}
                      <span className={cn("text-xs px-2 py-1 rounded-full", labelClass)}>
                        {labelText}
                      </span>
                      <span className="text-xs text-muted-foreground ml-2">
                        {formatTime(message.timestamp)}
                      </span>
                    </div>
                    <div className="text-sm w-full">
                      {renderMessageContent(message.content)}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
          <div ref={messagesEndRef} />
        </div>
      
      {/* Input Area + Advanced Provider/Model Controls */}
      <div className={cn(
        "p-4 border-t mt-auto transition-all duration-300 bg-muted/20",
        isMinimized ? 'h-0 p-0 opacity-0 overflow-hidden' : 'opacity-100'
      )}>
        <div className="flex flex-col gap-2">
          <div className="flex gap-3 items-center">
            <Input
              value={input}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type a command or question..."
              className="flex-1 bg-background"
            />
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => setShowAdvanced((p) => !p)}
              title={showAdvanced ? 'Hide advanced' : 'Show advanced'}
            >
              <ChevronDown className={cn('h-4 w-4 transition-transform', showAdvanced ? 'rotate-180' : '')} />
            </Button>
            <Button 
              onClick={sendCommand} 
              disabled={!input.trim() || isLoading}
              className="px-4"
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Send className="h-4 w-4 mr-2" />
              )}
              Send
            </Button>
          </div>
          {showAdvanced && (
            <div className="flex gap-3 items-center mt-2 animate-in fade-in">
              <div>
                <label htmlFor="provider-select" className="text-xs font-medium mr-1">Provider:</label>
                <select
                  id="provider-select"
                  className="rounded border px-2 py-1 bg-background text-sm"
                  value={provider}
                  onChange={e => {
                    setProvider(e.target.value);
                    setModel(MODEL_OPTIONS[e.target.value][0]?.value || 'gpt-4o');
                  }}
                >
                  {PROVIDER_OPTIONS.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="model-select" className="text-xs font-medium mr-1">Model:</label>
                <select
                  id="model-select"
                  className="rounded border px-2 py-1 bg-background text-sm"
                  value={model}
                  onChange={e => setModel(e.target.value)}
                >
                  {MODEL_OPTIONS[provider].map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export { CommandConsole };
export default CommandConsole;
