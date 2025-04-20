"use client";

import React, { useState, useRef, useEffect } from 'react';
import { 
  Card, 
  CardContent 
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Bot, 
  Send, 
  Sparkles,
  Cpu,
  BarChart,
  Wallet,
  ArrowUp,
  ArrowDown,
  Shuffle,
  RefreshCw
} from 'lucide-react';
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Badge } from '../ui/badge';
import { useToast } from '../ui/use-toast';
import { ElizaOSService } from '@/services/elizaos.service';
import { createBrowserClient } from '@/utils/supabase/client';
import Markdown from 'react-markdown';

// Define message types
type MessageType = 'user' | 'assistant' | 'system' | 'suggestion';

interface Message {
  id: string;
  content: string;
  type: MessageType;
  timestamp: Date;
  status?: 'sending' | 'sent' | 'error';
  actions?: MessageAction[];
}

interface MessageAction {
  label: string;
  action: () => void;
  icon?: React.ReactNode;
}

// Suggestion categories for DeFi commands
const SUGGESTION_CATEGORIES = [
  {
    name: "Lending Strategies",
    icon: <Cpu className="mr-2 h-4 w-4" />,
    suggestions: [
      "Create a new lending strategy with WETH as collateral",
      "Show me my lending positions with health factor below 1.5",
      "What's the best recursive loop strategy for ETH on Arbitrum?",
      "Rebalance my lending strategies to target health factor of 2.0",
      "Close my lending positions that are at risk of liquidation"
    ]
  },
  {
    name: "Market Analysis",
    icon: <BarChart className="mr-2 h-4 w-4" />,
    suggestions: [
      "Analyze interest rates across lending protocols",
      "Compare supply APYs for stablecoins on Aave",
      "What are the current liquidation thresholds for ETH on Aave?",
      "Find the best yield opportunities for my assets",
      "Show historical interest rate trends for USDC"
    ]
  },
  {
    name: "Portfolio Management",
    icon: <Wallet className="mr-2 h-4 w-4" />,
    suggestions: [
      "Optimize my lending portfolio for maximum yield",
      "Set up automatic rebalancing for my positions",
      "Create a self-repaying loan strategy for my ETH",
      "What's my current collateral utilization?",
      "Show my lending positions across all chains"
    ]
  }
];

// Quick action suggestions
const QUICK_ACTIONS = [
  {
    label: "Supply",
    icon: <ArrowUp className="h-4 w-4" />,
    action: () => {}
  },
  {
    label: "Borrow",
    icon: <ArrowDown className="h-4 w-4" />,
    action: () => {}
  },
  {
    label: "Swap Collateral",
    icon: <Shuffle className="h-4 w-4" />,
    action: () => {}
  },
  {
    label: "Rebalance",
    icon: <RefreshCw className="h-4 w-4" />,
    action: () => {}
  }
];

export default function ElizaCommandPanel() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      content: "👋 Hi! I'm Eliza, your autonomous DeFi assistant. How can I help you manage your lending strategies today?",
      type: 'assistant',
      timestamp: new Date(),
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [elizaService, setElizaService] = useState<ElizaOSService | null>(null);
  const [commandOpen, setCommandOpen] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const supabase = createBrowserClient();
  const { toast } = useToast();
  
  // Initialize ElizaOS service
  useEffect(() => {
    const initElizaOS = async () => {
      try {
        const service = new ElizaOSService();
        await service.initialize();
        setElizaService(service);
      } catch (error) {
        console.error('Failed to initialize ElizaOS', error);
        toast({
          title: 'Error',
          description: 'Failed to initialize AI assistant. Please try refreshing the page.',
          variant: 'destructive'
        });
      }
    };
    
    initElizaOS();
  }, [toast]);
  
  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);
  
  // Command palette keyboard shortcut
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setCommandOpen(prev => !prev);
      }
    };
    
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);
  
  // Handle suggestion selection
  const handleSelectSuggestion = (suggestion: string) => {
    setInput(suggestion);
    setShowSuggestions(false);
    
    // Focus the input
    setTimeout(() => {
      const inputEl = document.getElementById('message-input') as HTMLInputElement;
      if (inputEl) {
        inputEl.focus();
      }
    }, 0);
  };
  
  // Handle command selection
  const handleCommandSelect = (command: string) => {
    setCommandOpen(false);
    setInput(command);
    
    // Focus the input
    setTimeout(() => {
      const inputEl = document.getElementById('message-input') as HTMLInputElement;
      if (inputEl) {
        inputEl.focus();
      }
    }, 0);
  };
  
  // Send message to ElizaOS
  const sendMessage = async () => {
    if (!input.trim() || !elizaService) return;
    
    const userMessage: Message = {
      id: Date.now().toString(),
      content: input,
      type: 'user',
      timestamp: new Date(),
    };
    
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);
    setShowSuggestions(false);
    
    try {
      // Get response from ElizaOS
      const response = await elizaService.processCommand(input, 'defi_lending');
      
      // Parse actions if present
      const actions: MessageAction[] = [];
      
      if (response.actions?.length) {
        for (const action of response.actions) {
          switch (action.type) {
            case 'create_strategy':
              actions.push({
                label: 'Create Strategy',
                icon: <Sparkles className="h-4 w-4" />,
                action: () => {
                  // Navigate to strategy creation page with prefilled values
                  window.location.href = `/dashboard/defi/strategies/create?agent=${action.params.agentId}&type=${action.params.strategyType}&chain=${action.params.chainId}`;
                }
              });
              break;
            case 'refresh_strategy':
              actions.push({
                label: 'Refresh Strategy',
                icon: <RefreshCw className="h-4 w-4" />,
                action: () => {
                  // Call the refresh function
                  elizaService.executeAction(action.type, action.params);
                  toast({
                    title: 'Refreshing Strategy',
                    description: 'Your strategy is being refreshed...'
                  });
                }
              });
              break;
            // Add other action types as needed
          }
        }
      }
      
      const assistantMessage: Message = {
        id: Date.now().toString(),
        content: response.response,
        type: 'assistant',
        timestamp: new Date(),
        actions
      };
      
      setMessages(prev => [...prev, assistantMessage]);
      
      // Show suggestions again after receiving a response
      setTimeout(() => {
        setShowSuggestions(true);
      }, 500);
      
    } catch (error) {
      console.error('Error processing command', error);
      
      // Add error message
      const errorMessage: Message = {
        id: Date.now().toString(),
        content: "I'm sorry, I encountered an error processing your request. Please try again.",
        type: 'system',
        timestamp: new Date(),
        status: 'error'
      };
      
      setMessages(prev => [...prev, errorMessage]);
      
      toast({
        title: 'Error',
        description: 'Failed to process your command',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  // Handle input submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage();
  };
  
  return (
    <>
      <Card className="border-t-0 rounded-t-none">
        <CardContent className="p-4 pb-0">
          <div className="flex flex-col h-[60vh]">
            {/* Messages Container */}
            <div className="flex-1 overflow-y-auto mb-4 space-y-4 p-1">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[75%] rounded-lg p-3 ${
                      message.type === 'user'
                        ? 'bg-primary text-primary-foreground'
                        : message.type === 'system'
                        ? 'bg-muted text-muted-foreground'
                        : 'bg-secondary text-secondary-foreground'
                    }`}
                  >
                    {message.type === 'assistant' && (
                      <div className="flex items-center mb-1">
                        <Bot className="h-4 w-4 mr-1" />
                        <span className="text-xs font-medium">Eliza</span>
                      </div>
                    )}
                    
                    <div className="prose dark:prose-invert prose-sm max-w-none">
                      <Markdown>
                        {message.content}
                      </Markdown>
                    </div>
                    
                    {message.actions && message.actions.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-2">
                        {message.actions.map((action, i) => (
                          <Button 
                            key={i} 
                            size="sm" 
                            variant="outline" 
                            onClick={action.action}
                            className="bg-background/50 backdrop-blur-sm"
                          >
                            {action.icon && <span className="mr-1">{action.icon}</span>}
                            {action.label}
                          </Button>
                        ))}
                      </div>
                    )}
                    
                    <div className="text-xs opacity-70 mt-1 text-right">
                      {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
            
            {/* Suggestions */}
            {showSuggestions && !isLoading && messages.length < 3 && (
              <div className="mb-4">
                <div className="text-sm font-medium mb-2">Suggested commands:</div>
                <div className="flex flex-wrap gap-2">
                  {SUGGESTION_CATEGORIES[0].suggestions.slice(0, 3).map((suggestion, i) => (
                    <Badge
                      key={i}
                      variant="outline"
                      className="cursor-pointer hover:bg-accent px-3 py-1.5"
                      onClick={() => handleSelectSuggestion(suggestion)}
                    >
                      {suggestion}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
            
            {/* Quick Actions */}
            <div className="flex justify-center space-x-2 mb-4">
              {QUICK_ACTIONS.map((action, i) => (
                <Button
                  key={i}
                  variant="outline"
                  size="sm"
                  onClick={action.action}
                  className="flex-shrink-0"
                >
                  {action.icon}
                  <span className="ml-1">{action.label}</span>
                </Button>
              ))}
            </div>
            
            {/* Input Form */}
            <form onSubmit={handleSubmit} className="flex space-x-2 mb-4">
              <Button
                type="button"
                size="icon"
                variant="outline"
                onClick={() => setCommandOpen(true)}
              >
                <Cpu className="h-4 w-4" />
              </Button>
              <div className="relative flex-1">
                <Input
                  id="message-input"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Ask Eliza about lending strategies..."
                  disabled={isLoading}
                  className="pr-10"
                />
                {isLoading && (
                  <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                    <div className="animate-spin h-4 w-4 border-2 border-primary border-t-transparent rounded-full"></div>
                  </div>
                )}
              </div>
              <Button
                type="submit"
                size="icon"
                disabled={!input.trim() || isLoading}
              >
                <Send className="h-4 w-4" />
              </Button>
            </form>
          </div>
        </CardContent>
      </Card>
      
      {/* Command Palette */}
      <CommandDialog open={commandOpen} onOpenChange={setCommandOpen}>
        <CommandInput placeholder="Type a command or search..." />
        <CommandList>
          <CommandEmpty>No results found.</CommandEmpty>
          {SUGGESTION_CATEGORIES.map((category) => (
            <CommandGroup key={category.name} heading={category.name}>
              {category.suggestions.map((suggestion, i) => (
                <CommandItem
                  key={i}
                  value={suggestion}
                  onSelect={() => handleCommandSelect(suggestion)}
                >
                  {category.icon}
                  <span>{suggestion}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          ))}
        </CommandList>
      </CommandDialog>
    </>
  );
}
