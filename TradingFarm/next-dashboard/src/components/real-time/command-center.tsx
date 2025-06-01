"use client";

import { useState, useRef, useEffect } from "react";
import { useSocket } from "@/providers/socket-provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AlertCircle, Send, Terminal, TerminalSquare, UserCircle, Bot, LineChart, Wallet } from "lucide-react";
import { cn } from "@/components/ui/utils";
import { useToast } from "@/components/ui/use-toast";
import { TRADING_EVENTS } from "@/constants/events";
import { Message, MessageType } from "@/types/socket";

const EXAMPLE_COMMANDS = [
  { command: "market watch BTC/USD ETH/USD", description: "Subscribe to market updates" },
  { command: "buy BTC 0.01", description: "Place a buy order" },
  { command: "sell ETH 0.5", description: "Place a sell order" },
  { command: "agent status", description: "Get all agent statuses" },
  { command: "portfolio", description: "Get portfolio summary" },
];

interface CommandCenterProps {
  defaultWelcomeMessage?: string;
  commandContext?: string;
  placeholderText?: string;
}

export function CommandCenter({
  defaultWelcomeMessage = "Welcome to the Trading Farm Command Center powered by ElizaOS. Type 'help' to see available commands or use natural language to interact with the system.",
  commandContext = "trading",
  placeholderText = "Type a command..."
}: CommandCenterProps) {
  const { socket, isConnected } = useSocket();
  const { toast } = useToast();
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      content: defaultWelcomeMessage,
      timestamp: new Date().toISOString(),
      type: MessageType.System,
    },
    {
      id: "welcome-ai",
      content: "I'm your ElizaOS assistant, ready to help with trading, market analysis, and knowledge management. You can ask me things like \"What's the current Bitcoin price?\" or \"Show me my portfolio performance\".",
      timestamp: new Date().toISOString(),
      type: MessageType.Response,
      sender: "ElizaOS"
    },
    {
      id: "nlu-hint",
      content: "✨ Try using natural language! For example:\n• \"What's the current price of BTC?\"\n• \"How is my portfolio performing today?\"\n• \"Show me active trading agents\"\n• \"Explain the RSI strategy in the knowledge base\"",
      timestamp: new Date().toISOString(),
      type: MessageType.System,
    }
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isConnected && socket) {
      // Handle command responses
      socket.on(TRADING_EVENTS.COMMAND_RESPONSE, (data: any) => {
        handleCommandResponse(data);
      });

      // Handle command errors
      socket.on(TRADING_EVENTS.COMMAND_ERROR, (data: any) => {
        handleCommandError(data);
      });

      // Handle system messages
      socket.on(TRADING_EVENTS.SYSTEM_MESSAGE, (data: any) => {
        handleSystemMessage(data);
      });

      return () => {
        socket.off(TRADING_EVENTS.COMMAND_RESPONSE);
        socket.off(TRADING_EVENTS.COMMAND_ERROR);
        socket.off(TRADING_EVENTS.SYSTEM_MESSAGE);
      };
    }
  }, [socket, isConnected]);

  useEffect(() => {
    // Auto-scroll to bottom when messages change
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Function to handle command responses
  const handleCommandResponse = (data: any) => {
    const responseMessage: Message = {
      id: `response-${Date.now()}`,
      content: data.message || data.response || "Command processed successfully.",
      timestamp: new Date().toISOString(),
      type: MessageType.Response,
      sender: "ElizaOS",
      metadata: data.metadata || {}
    };

    setMessages((prev) => [...prev, responseMessage]);
    setIsLoading(false);
  };

  // Function to handle command errors
  const handleCommandError = (data: any) => {
    const errorMessage: Message = {
      id: `error-${Date.now()}`,
      content: data.message || data.error || "An error occurred while processing your command.",
      timestamp: new Date().toISOString(),
      type: MessageType.Error,
    };

    setMessages((prev) => [...prev, errorMessage]);
    setIsLoading(false);
    
    toast({
      title: "Command Error",
      description: data.message || data.error || "An error occurred while processing your command.",
      variant: "destructive",
    });
  };

  // Function to handle system messages
  const handleSystemMessage = (data: any) => {
    const systemMessage: Message = {
      id: `system-${Date.now()}`,
      content: data.message || "System notification",
      timestamp: new Date().toISOString(),
      type: MessageType.System,
    };

    setMessages((prev) => [...prev, systemMessage]);
  };

  // Function to handle sending commands
  const handleSendCommand = (command: string) => {
    // Prevent empty commands
    if (!command.trim()) return;
    
    const newMessage: Message = {
      id: `command-${Date.now()}`,
      content: command,
      timestamp: new Date().toISOString(),
      type: MessageType.Command,
    };
    
    setMessages((prev) => [...prev, newMessage]);
    setInput("");
    setIsLoading(true);
    
    // Add context to the command if available
    const contextualCommand = commandContext 
      ? { command, context: commandContext }
      : { command };
    
    // Send command to socket with context
    if (socket && isConnected) {
      socket.emit(TRADING_EVENTS.COMMAND_SEND, contextualCommand);
      
      // Auto-scroll to bottom
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
      }, 100);
    } else {
      // Simulate response if not connected
      setTimeout(() => {
        const response = simulateCommandResponse(command, commandContext);
        handleCommandResponse(response);
        setIsLoading(false);
      }, 1000);
    }
  };

  // Function to simulate command response when socket is not connected
  const simulateCommandResponse = (command: string, context?: string): any => {
    const lcCommand = command.toLowerCase();
    
    // Add context-aware responses based on commandContext
    if (context === 'farm-management') {
      if (lcCommand.includes('farm status') || lcCommand.includes('show farms')) {
        return {
          status: "success",
          message: "Farm Status Report:\n- Active Farms: 3\n- Paused Farms: 1\n- Total Farms: 4\n\nMost active farm: Alpha Strategy (96% uptime)"
        };
      }
      
      if (lcCommand.includes('create farm')) {
        return {
          status: "success",
          message: "To create a farm, please use the visual interface or provide the following details:\n- Farm name\n- Risk level\n- Initial allocation\n- BossMan AI model"
        };
      }
      
      if (lcCommand.includes('agent') || lcCommand.includes('agents')) {
        return {
          status: "success",
          message: "Farm Agents:\n- TrendMaster: Active (analyzing BTC/USD)\n- MarketScanner: Active (monitoring 12 pairs)\n- VolatilityTracker: Paused\n- StableCoin Arbitrageur: Active"
        };
      }
    }
    
    // Default simulation responses
    if (lcCommand.includes('help')) {
      return {
        status: "success",
        message: "Available Commands:\n- market [watch|price] [symbol]\n- portfolio\n- agent status\n- buy/sell [symbol] [amount]\n- strategy list"
      };
    }
    
    if (lcCommand.includes('portfolio')) {
      return {
        status: "success",
        message: "Portfolio Value: $124,532\nDaily Change: +2.3%\nHoldings:\n- BTC: 1.23 ($45,678)\n- ETH: 15.5 ($28,431)\n- SOL: 245.3 ($19,624)"
      };
    }
    
    if (lcCommand.includes('price') || lcCommand.includes('btc') || lcCommand.includes('bitcoin')) {
      return {
        status: "success",
        message: "BTC/USD: $37,245.50 (+1.2% 24h)\nETH/USD: $1,834.25 (+0.8% 24h)\nSOL/USD: $79.95 (+3.5% 24h)"
      };
    }
    
    if (lcCommand.includes('agent') || lcCommand.includes('agents')) {
      return {
        status: "success",
        message: "Active Agents:\n- TrendMaster: Active (analyzing BTC/USD)\n- MarketScanner: Active (monitoring 12 pairs)\n- VolatilityTracker: Paused\n- StableCoin Arbitrageur: Active"
      };
    }
    
    // Default response for unknown commands
    return {
      status: "info",
      message: `I've processed your command "${command}". Is there anything specific you'd like to know about ${context || 'trading'}?`
    };
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleSendCommand(input);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      const commandText = input.trim();
      if (commandText) {
        handleSendCommand(commandText);
      }
    }
  };

  const handleCommandClick = (command: string) => {
    setInput(command);
    handleSendCommand(command);
  };

  return (
    <Card className="flex flex-col h-full shadow-md border-slate-200 dark:border-slate-700">
      <CardHeader className="pb-3">
        <div className="flex justify-between items-center">
          <div>
            <CardTitle className="text-lg flex items-center">
              <TerminalSquare className="h-5 w-5 mr-2 text-primary" />
              ElizaOS Command Center
            </CardTitle>
            <CardDescription>Access all system features through natural language</CardDescription>
          </div>
          <Badge variant={isConnected ? "default" : "destructive"} className="px-3 py-1">
            {isConnected ? "Connected" : "Disconnected"}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="flex-1 overflow-hidden pt-0">
        <ScrollArea className="h-[400px] pr-4">
          <div className="space-y-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={cn(
                  "flex gap-3 w-full",
                  message.type === MessageType.Command ? "justify-end" : "justify-start"
                )}
              >
                {message.type === MessageType.Response && (
                  <div className="h-8 w-8 rounded-full bg-purple-100 dark:bg-purple-900 flex items-center justify-center text-purple-500">
                    <Bot className="h-5 w-5" />
                  </div>
                )}
                
                {message.type === MessageType.System && (
                  <div className="h-8 w-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500">
                    <Terminal className="h-5 w-5" />
                  </div>
                )}
                
                <div
                  className={cn(
                    "max-w-[85%] rounded-lg px-3 py-2 text-sm",
                    message.type === MessageType.Command
                      ? "bg-primary text-primary-foreground ml-auto"
                      : message.type === MessageType.Response
                      ? "bg-muted"
                      : message.type === MessageType.Error
                      ? "bg-destructive text-destructive-foreground"
                      : "bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                  )}
                >
                  {typeof message.content === 'string' ? (
                    <div className="whitespace-pre-wrap">{message.content}</div>
                  ) : (
                    message.content
                  )}
                  
                  {message.timestamp && (
                    <div className="text-xs mt-1 opacity-60">
                      {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  )}
                </div>
                
                {message.type === MessageType.Command && (
                  <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground">
                    <UserCircle className="h-5 w-5" />
                  </div>
                )}
              </div>
            ))}
            
            {isLoading && (
              <div className="flex gap-3">
                <div className="h-8 w-8 rounded-full bg-purple-100 dark:bg-purple-900 flex items-center justify-center text-purple-500">
                  <Bot className="h-5 w-5" />
                </div>
                <div className="bg-muted max-w-[85%] rounded-lg px-3 py-2 text-sm">
                  <div className="flex items-center space-x-2">
                    <div className="h-2 w-2 rounded-full bg-purple-500 animate-pulse"></div>
                    <div className="h-2 w-2 rounded-full bg-purple-500 animate-pulse delay-150"></div>
                    <div className="h-2 w-2 rounded-full bg-purple-500 animate-pulse delay-300"></div>
                    <span className="text-xs text-muted-foreground ml-2">ElizaOS is processing...</span>
                  </div>
                </div>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>
      </CardContent>
      <CardFooter className="border-t pt-3">
        <div className="w-full space-y-3">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <div className="flex items-center space-x-1">
              <Terminal className="h-3 w-3" />
              <span>Try example commands</span>
            </div>
            {!isConnected && (
              <div className="flex items-center space-x-1 text-amber-500">
                <AlertCircle className="h-3 w-3" />
                <span>Using simulation mode</span>
              </div>
            )}
          </div>
          
          <div className="flex flex-wrap gap-2 mb-2">
            {EXAMPLE_COMMANDS.map((cmd, i) => (
              <Badge
                key={i}
                variant="outline"
                className="cursor-pointer hover:bg-accent"
                onClick={() => handleCommandClick(cmd.command)}
              >
                {cmd.command}
              </Badge>
            ))}
          </div>
          
          <form onSubmit={handleSubmit} className="flex w-full space-x-2">
            <Input
              placeholder={placeholderText}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              ref={inputRef}
              className="flex-1"
              disabled={!isConnected && isLoading}
            />
            <Button type="submit" size="icon" disabled={!isConnected && isLoading}>
              <Send className="h-4 w-4" />
            </Button>
          </form>
        </div>
      </CardFooter>
    </Card>
  );
}
