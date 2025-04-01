"use client";

import React, { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { createBrowserClient } from "@/utils/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
  SendIcon, 
  Braces, 
  FileText, 
  Database, 
  BarChart2, 
  AlertTriangle,
  HelpCircle,
  Info,
  BookOpen,
  Save,
  Check,
  Settings,
  Clock,
  Zap,
  RefreshCw
} from "lucide-react";

// Message type definitions
interface ElizaMessage {
  id: string;
  type: 'user' | 'system' | 'command' | 'query' | 'analysis' | 'alert';
  source?: 'knowledge-base' | 'market-data' | 'strategy' | 'system';
  content: string;
  timestamp: Date;
  metadata?: {
    code?: string;
    chart?: string;
    success?: boolean;
    warning?: boolean;
    error?: boolean;
    assets?: string[];
    confidence?: number;
  };
}

// Mock saved queries/commands
const savedItems = [
  { id: 1, name: "Market overview", content: "Give me a market overview for BTC, ETH, and SOL" },
  { id: 2, name: "Portfolio risk", content: "Analyze my portfolio risk exposure" },
  { id: 3, name: "Recent alerts", content: "Show recent trading alerts" },
  { id: 4, name: "Performance summary", content: "Summarize trading performance for the last 7 days" },
  { id: 5, name: "Strategy comparison", content: "Compare performance of momentum vs mean reversion strategies" }
];

// Mock knowledge topics
const knowledgeTopics = [
  { id: 1, name: "Trading Strategies", items: 24 },
  { id: 2, name: "Risk Management", items: 18 },
  { id: 3, name: "Market Analysis", items: 32 },
  { id: 4, name: "Technical Indicators", items: 45 },
  { id: 5, name: "Asset Fundamentals", items: 27 },
  { id: 6, name: "Portfolio Construction", items: 15 }
];

export default function ElizaCommandPage() {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<ElizaMessage[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [activeTab, setActiveTab] = useState("command");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const supabase = createBrowserClient();

  // Scroll to bottom of messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Focus input on load
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Mock socket connection
  useEffect(() => {
    // Simulate connection delay
    const timer = setTimeout(() => {
      setIsConnected(true);
      
      // Add welcome message
      setMessages([
        {
          id: "welcome",
          type: "system",
          content: "Welcome to ElizaOS Command Center. I'm your AI assistant for trading farm analysis and operations. How can I help you today?",
          timestamp: new Date(),
          metadata: {
            success: true
          }
        }
      ]);
    }, 1500);

    return () => clearTimeout(timer);
  }, []);

  // Handle sending message
  const handleSend = () => {
    if (!input.trim() || isProcessing) return;

    // Add user message
    const userMessage: ElizaMessage = {
      id: `user-${Date.now()}`,
      type: "user",
      content: input,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput("");
    setIsProcessing(true);

    // Simulate AI response delay
    setTimeout(() => {
      handleElizaResponse(input);
      setIsProcessing(false);
    }, 1500);
  };

  // Handle key press
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Generate AI response based on input
  const handleElizaResponse = (userInput: string) => {
    const lowerInput = userInput.toLowerCase();

    // Different response types based on input
    if (lowerInput.includes("market") || lowerInput.includes("price")) {
      // Market data response
      const responseMessage: ElizaMessage = {
        id: `system-${Date.now()}`,
        type: "analysis",
        source: "market-data",
        content: "Based on current market conditions, Bitcoin is showing strong momentum with a 3.2% increase in the last 24 hours. Ethereum is consolidating around support levels, while Solana is experiencing increased volatility following recent protocol updates.",
        timestamp: new Date(),
        metadata: {
          assets: ["BTC", "ETH", "SOL"],
          confidence: 0.92
        }
      };
      setMessages(prev => [...prev, responseMessage]);
    } 
    else if (lowerInput.includes("risk") || lowerInput.includes("exposure")) {
      // Risk analysis response
      const responseMessage: ElizaMessage = {
        id: `system-${Date.now()}`,
        type: "analysis",
        source: "strategy",
        content: "Your current portfolio risk exposure is moderate with a Sharpe ratio of 1.75. The primary risk factors are concentration in high-volatility assets (SOL, AVAX) and correlation shifts between BTC and ETH. Consider rebalancing to reduce risk or implementing hedging strategies.",
        timestamp: new Date(),
        metadata: {
          code: "Risk Score: 68/100",
          confidence: 0.88
        }
      };
      setMessages(prev => [...prev, responseMessage]);
    }
    else if (lowerInput.includes("alert") || lowerInput.includes("warning")) {
      // Alert message
      const responseMessage: ElizaMessage = {
        id: `system-${Date.now()}`,
        type: "alert",
        source: "system",
        content: "There are 3 active alerts in your trading system:\n1. Unusual volatility detected for BTC (triggered 25 min ago)\n2. Liquidity risk increasing for DOT markets (triggered 2 hours ago)\n3. Agent 'Alpha Momentum' stopped execution due to risk limits (triggered 45 min ago)",
        timestamp: new Date(),
        metadata: {
          warning: true,
          assets: ["BTC", "DOT"]
        }
      };
      setMessages(prev => [...prev, responseMessage]);
    }
    else if (lowerInput.includes("performance") || lowerInput.includes("profit")) {
      // Performance data
      const responseMessage: ElizaMessage = {
        id: `system-${Date.now()}`,
        type: "analysis",
        source: "strategy",
        content: "Trading performance over the last 7 days:\n- Total trades: 34\n- Win rate: 64.7%\n- Net profit: +2.8%\n- Best strategy: Mean Reversion (+4.2%)\n- Worst strategy: Trend Following (-1.1%)\n\nOverall farm performance is 12% above baseline benchmark.",
        timestamp: new Date(),
        metadata: {
          chart: "performance-chart-data",
          success: true
        }
      };
      setMessages(prev => [...prev, responseMessage]);
    }
    else if (lowerInput.includes("help") || lowerInput.includes("command") || lowerInput.includes("what can you")) {
      // Help response
      const responseMessage: ElizaMessage = {
        id: `system-${Date.now()}`,
        type: "command",
        source: "system",
        content: "I can help with the following:\n\n- Market analysis and insights\n- Trading strategy evaluation\n- Risk assessment and management\n- Portfolio optimization\n- Performance tracking and reporting\n- Alert monitoring and management\n- Knowledge base queries\n- Agent supervision and control\n\nTry asking specific questions about your trading farm, market conditions, or strategies.",
        timestamp: new Date()
      };
      setMessages(prev => [...prev, responseMessage]);
    }
    else {
      // Generic knowledge response
      const responseMessage: ElizaMessage = {
        id: `system-${Date.now()}`,
        type: "query",
        source: "knowledge-base",
        content: "Based on my knowledge base, I've analyzed your query and found relevant information. Your trading farm currently has 3 active agents running different strategies. The primary focus appears to be on momentum and mean reversion strategies across major cryptocurrency pairs. Would you like more specific information about a particular aspect of your trading operations?",
        timestamp: new Date(),
        metadata: {
          confidence: 0.85
        }
      };
      setMessages(prev => [...prev, responseMessage]);
    }
  };

  // Execute saved command
  const executeSavedCommand = (content: string) => {
    setInput(content);
    
    // Focus and scroll input into view
    inputRef.current?.focus();
    inputRef.current?.scrollIntoView();
  };

  // Message component based on type
  const MessageComponent = ({ message }: { message: ElizaMessage }) => {
    return (
      <div className={`mb-4 flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}>
        <div className={`flex max-w-[80%] ${message.type === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
          {/* Avatar */}
          <div className={`flex-shrink-0 ${message.type === 'user' ? 'ml-3' : 'mr-3'}`}>
            {message.type === 'user' ? (
              <Avatar>
                <AvatarFallback>U</AvatarFallback>
              </Avatar>
            ) : (
              <Avatar>
                <AvatarImage src="/elizaos-logo.png" alt="ElizaOS" />
                <AvatarFallback>AI</AvatarFallback>
              </Avatar>
            )}
          </div>

          {/* Message content */}
          <div className={`rounded-lg px-4 py-3 ${
            message.type === 'user' 
              ? 'bg-primary text-primary-foreground' 
              : message.type === 'alert'
                ? 'bg-amber-50 text-amber-900 border border-amber-200'
                : message.type === 'analysis'
                  ? 'bg-blue-50 text-blue-900 border border-blue-200'
                  : 'bg-muted text-muted-foreground'
          }`}>
            {/* Source badge */}
            {message.source && (
              <Badge variant="outline" className="mb-2 text-xs">
                {message.source === 'knowledge-base' && <BookOpen className="mr-1 h-3 w-3" />}
                {message.source === 'market-data' && <BarChart2 className="mr-1 h-3 w-3" />}
                {message.source === 'strategy' && <Braces className="mr-1 h-3 w-3" />}
                {message.source === 'system' && <Settings className="mr-1 h-3 w-3" />}
                {message.source}
              </Badge>
            )}

            {/* Message content with white space preserved */}
            <div className="whitespace-pre-line">{message.content}</div>
            
            {/* Code block */}
            {message.metadata?.code && (
              <div className="mt-2 rounded bg-gray-900 p-2 font-mono text-xs text-white">
                {message.metadata.code}
              </div>
            )}

            {/* Chart placeholder */}
            {message.metadata?.chart && (
              <div className="mt-2 flex h-32 items-center justify-center rounded bg-gray-100 p-2">
                <BarChart2 className="h-6 w-6 text-gray-400" />
                <span className="ml-2 text-sm text-gray-500">Chart visualization</span>
              </div>
            )}

            {/* Metadata indicators */}
            <div className="mt-2 flex items-center justify-between text-xs">
              <div className="flex items-center space-x-2">
                {message.metadata?.success && (
                  <span className="flex items-center text-green-600">
                    <Check className="mr-1 h-3 w-3" /> Success
                  </span>
                )}
                {message.metadata?.warning && (
                  <span className="flex items-center text-amber-600">
                    <AlertTriangle className="mr-1 h-3 w-3" /> Warning
                  </span>
                )}
                {message.metadata?.error && (
                  <span className="flex items-center text-red-600">
                    <AlertTriangle className="mr-1 h-3 w-3" /> Error
                  </span>
                )}
                {message.metadata?.confidence && (
                  <span className="flex items-center text-blue-600">
                    <Info className="mr-1 h-3 w-3" /> 
                    Confidence: {(message.metadata.confidence * 100).toFixed(0)}%
                  </span>
                )}
              </div>
              <span className="text-gray-400">
                {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="container mx-auto py-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">ElizaOS Command Center</h1>
        <p className="text-muted-foreground">
          Interact with your Trading Farm using natural language
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-4">
        {/* Sidebar */}
        <div className="lg:col-span-1">
          <Card className="mb-6">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center text-lg">
                <div className={`mr-2 h-2 w-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
                Status
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm">Connection</span>
                  <Badge variant={isConnected ? "success" : "destructive"}>
                    {isConnected ? 'Connected' : 'Disconnected'}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Knowledge Base</span>
                  <Badge variant="outline">6 Topics, 161 Items</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Last Update</span>
                  <span className="text-xs text-gray-500">Just now</span>
                </div>
                <Button className="w-full" variant="outline" size="sm">
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Refresh Connection
                </Button>
              </div>
            </CardContent>
          </Card>

          <Tabs defaultValue="saved" className="mb-6">
            <TabsList className="w-full">
              <TabsTrigger value="saved" className="flex-1">Saved</TabsTrigger>
              <TabsTrigger value="knowledge" className="flex-1">Knowledge</TabsTrigger>
            </TabsList>
            <TabsContent value="saved">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">Saved Commands</CardTitle>
                  <CardDescription>
                    Quickly access your saved queries
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[280px] pr-4">
                    <div className="space-y-2">
                      {savedItems.map(item => (
                        <Button
                          key={item.id}
                          variant="ghost"
                          className="flex w-full justify-start px-2 py-1.5 text-left"
                          onClick={() => executeSavedCommand(item.content)}
                        >
                          <Clock className="mr-2 h-4 w-4 text-gray-500" />
                          <div className="overflow-hidden">
                            <div className="truncate font-medium">{item.name}</div>
                            <div className="truncate text-xs text-muted-foreground">
                              {item.content}
                            </div>
                          </div>
                        </Button>
                      ))}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            </TabsContent>
            <TabsContent value="knowledge">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">Knowledge Base</CardTitle>
                  <CardDescription>
                    Topics in the trading knowledge base
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[280px] pr-4">
                    <div className="space-y-2">
                      {knowledgeTopics.map(topic => (
                        <Button
                          key={topic.id}
                          variant="ghost"
                          className="flex w-full justify-start px-2 py-1.5 text-left"
                          onClick={() => executeSavedCommand(`Tell me about ${topic.name.toLowerCase()}`)}
                        >
                          <BookOpen className="mr-2 h-4 w-4 text-gray-500" />
                          <div className="flex-1 overflow-hidden">
                            <div className="truncate font-medium">{topic.name}</div>
                          </div>
                          <Badge variant="outline" className="ml-2">
                            {topic.items}
                          </Badge>
                        </Button>
                      ))}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        {/* Main chat area */}
        <div className="lg:col-span-3">
          <Card className="flex h-[650px] flex-col">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle>ElizaOS Command Interface</CardTitle>
                <div className="flex items-center space-x-2">
                  <Badge variant="outline" className="flex items-center">
                    <Zap className="mr-1 h-3 w-3" />
                    AI Powered
                  </Badge>
                  <Button size="sm" variant="ghost">
                    <HelpCircle className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="w-full">
                  <TabsTrigger value="command" className="flex-1">
                    Command
                  </TabsTrigger>
                  <TabsTrigger value="market" className="flex-1">
                    Market
                  </TabsTrigger>
                  <TabsTrigger value="strategy" className="flex-1">
                    Strategy
                  </TabsTrigger>
                  <TabsTrigger value="agents" className="flex-1">
                    Agents
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </CardHeader>
            <CardContent className="flex-1 overflow-hidden p-0">
              <ScrollArea className="h-[450px] px-6">
                {messages.length > 0 ? (
                  <div className="pt-6">
                    {messages.map(message => (
                      <MessageComponent key={message.id} message={message} />
                    ))}
                    {isProcessing && (
                      <div className="flex items-center space-x-2 px-4">
                        <Skeleton className="h-5 w-5 rounded-full" />
                        <Skeleton className="h-4 w-24" />
                      </div>
                    )}
                    <div ref={messagesEndRef} />
                  </div>
                ) : (
                  <div className="flex h-full flex-col items-center justify-center">
                    {isConnected ? (
                      <>
                        <div className="mb-4 rounded-full bg-muted p-3">
                          <HelpCircle className="h-6 w-6 text-muted-foreground" />
                        </div>
                        <h3 className="mb-2 text-xl font-semibold text-gray-700">
                          Getting Connected
                        </h3>
                        <p className="text-center text-sm text-muted-foreground">
                          Establishing connection to ElizaOS...
                        </p>
                      </>
                    ) : (
                      <div className="flex items-center space-x-4">
                        <Skeleton className="h-12 w-12 rounded-full" />
                        <div className="space-y-2">
                          <Skeleton className="h-4 w-[250px]" />
                          <Skeleton className="h-4 w-[200px]" />
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </ScrollArea>
            </CardContent>

            {/* Input area */}
            <div className="border-t p-4">
              <div className="flex items-center space-x-2">
                <Input
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyPress}
                  placeholder="Ask anything about your trading farm..."
                  className="flex-1"
                  disabled={!isConnected || isProcessing}
                />
                <Button 
                  onClick={handleSend} 
                  disabled={!isConnected || isProcessing || !input.trim()}
                >
                  <SendIcon className="h-4 w-4" />
                </Button>
                <Button variant="outline">
                  <Save className="h-4 w-4" />
                </Button>
              </div>
              {isConnected && (
                <div className="mt-2 text-center text-xs text-muted-foreground">
                  ElizaOS will process your natural language requests and connect to your trading farm systems
                </div>
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
