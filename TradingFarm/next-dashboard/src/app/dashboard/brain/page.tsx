"use client";

// ... (rest of the code remains the same)
import React, { useState } from "react";
import { 
  BrainCircuit, TrendingUp, ListChecks, Globe, BarChart2, 
  BookText, Settings, ChevronRight, Plus, List, Edit, Copy, 
  ArrowUpRight, Bot, Circle, PlusCircle, CheckCircle2, 
  Search, Download, RefreshCw, Filter, ArrowDown, Share2, 
  Zap, Terminal, Shield, FileSpreadsheet, FileJson, MoreVertical,
  Trash, Network, Lock
} from "lucide-react";
import { LucideIcon } from "lucide-react";

import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger
} from "@/components/ui/tabs";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";

// Placeholder for ElizaChatInterface component
// This should be replaced with the actual import when available
const ElizaChatInterface = () => {
  return (
    <div className="border rounded-lg p-4">
      <h3 className="text-lg font-medium mb-2">ElizaOS Command Interface</h3>
      <div className="bg-muted p-3 rounded-md">
        <p className="text-sm">Command interface placeholder. Import the actual ElizaChatInterface component to enable full functionality.</p>
      </div>
      <div className="flex mt-3">
        <Input placeholder="Type a command..." className="flex-1 mr-2" />
        <Button size="sm">Send</Button>
      </div>
    </div>
  );
};

// Define types
interface Strategy {
  id: string;
  name: string;
  type: string;
  source: string;
  description: string;
  performance: {
    winRate: number;
    profitFactor: number;
    sharpeRatio: number;
    maxDrawdown: number;
    monthlyReturn: number;
  };
  pairs: string[];
  timeframe: string;
  status: "active" | "inactive" | "backtest";
  lastUpdated: string;
  integrations?: string[];
}

interface SOP {
  id: string;
  name: string;
  category: string;
  description: string;
  steps: { step: string; details: string }[];
  checklist: { task: string; completed: boolean }[];
  resources: { name: string; url: string }[];
  lastUpdated: string;
  version?: number;
  associatedAgents?: number;
}

interface Exchange {
  id: string;
  name: string;
  type: string;
  status: "online" | "offline" | "issues";
  farms: number;
  apiVersion: string;
  lastConnected: string;
  apiConfig: {
    keys: number;
    permissions: string[];
    ipRestricted: string | null;
    rateLimit: number;
    currentUsage: number;
    serviceStatus: {
      [key: string]: "operational" | "issues" | "down";
    };
    connections: {
      type: string;
      active: boolean;
    }[];
  };
  tradingSpecs: {
    supportedPairs: number;
    orderTypes: string[];
    fees: {
      maker: number;
      taker: number;
    };
  };
  issues?: string[];
}

interface MarketData {
  id: string;
  pair: string;
  exchange: string;
  lastPrice: number;
  change24h: number;
  volume24h: number;
  high24h: number;
  low24h: number;
  marketCap: number;
  lastUpdated: string;
}

interface KnowledgeEntry {
  id: string;
  title: string;
  category: string;
  tags: string[];
  content: string;
  source: string;
  dateAdded: string;
  lastAccessed: string;
}

interface SOPCategory {
  id: string;
  name: string;
  icon?: LucideIcon;
  count: number;
}

type MessageType = 'user' | 'ai' | 'system' | 'error' | 'metadata';

interface ChatMessage {
  id?: string;
  content: string;
  type: MessageType;
  timestamp?: Date;
  metadata?: {
    modelName?: string;
    tokens?: number;
    processingTime?: number;
    intent?: string;
    confidence?: number;
    [key: string]: any;
  };
}

interface QuickCommand {
  id: string;
  label: string;
  command: string;
  icon: string;
  description: string;
}

// Format date helper function
const formatDate = (date: Date): string => {
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  }).format(date);
};

// Mock data for Strategies
const strategies: (Strategy & { activeDeployments: number })[] = [
  {
    id: "str-001",
    name: "BTC Momentum Tracker",
    type: "momentum",
    source: "Custom",
    description: "Follows BTC price momentum with adjustable thresholds",
    performance: {
      winRate: 68,
      profitFactor: 1.8,
      sharpeRatio: 1.2,
      maxDrawdown: 15,
      monthlyReturn: 4.2
    },
    pairs: ["BTC/USD", "BTC/USDT"],
    timeframe: "4h",
    status: "active",
    lastUpdated: "2025-03-10T12:00:00Z",
    integrations: ["TradingView", "ElizaOS"],
    activeDeployments: 3
  },
  {
    id: "str-002",
    name: "ETH/BTC Arbitrage",
    type: "arbitrage",
    source: "ElizaOS Library",
    description: "Cross-exchange ETH/BTC arbitrage with auto-calculated spreads",
    performance: {
      winRate: 92,
      profitFactor: 2.6,
      sharpeRatio: 2.1,
      maxDrawdown: 8,
      monthlyReturn: 3.5
    },
    pairs: ["ETH/BTC"],
    timeframe: "15m",
    status: "active",
    lastUpdated: "2025-03-15T10:30:00Z",
    activeDeployments: 2
  },
  {
    id: "str-003",
    name: "SONIC Grid Strategy",
    type: "market-neutral",
    source: "Community",
    description: "Dynamic grid strategy optimized for SONIC token sideways markets",
    performance: {
      winRate: 84,
      profitFactor: 1.9,
      sharpeRatio: 1.7,
      maxDrawdown: 12,
      monthlyReturn: 5.8
    },
    pairs: ["SONIC/USD", "SONIC/USDT"],
    timeframe: "1h",
    status: "inactive",
    lastUpdated: "2025-03-01T16:15:00Z",
    integrations: ["TradingView"],
    activeDeployments: 0
  }
];

// Mock data for SOP Categories
const sopCategories: SOPCategory[] = [
  {
    id: "cat-001",
    name: "Trade Management",
    icon: ListChecks,
    count: 3
  },
  {
    id: "cat-002",
    name: "Risk Management",
    icon: Shield as LucideIcon,
    count: 2
  },
  {
    id: "cat-003",
    name: "Technical Analysis",
    icon: BarChart2,
    count: 4
  },
  {
    id: "cat-004",
    name: "Exchange Integration",
    icon: Globe,
    count: 2
  }
];

// Mock data for SOPs
const sops: SOP[] = [
  {
    id: "sop-001",
    name: "BTC Bull Market Entry",
    category: "cat-001",
    description: "Standard procedure for entering BTC positions in bull market conditions",
    steps: [
      { step: "Verify market sentiment indicators", details: "Check Fear & Greed index > 70" },
      { step: "Check moving averages", details: "Confirm price above 20 EMA and 50 SMA" },
      { step: "Set entry triggers", details: "Buy on first pullback to support" }
    ],
    checklist: [
      { task: "Risk % set to bull market parameters", completed: true },
      { task: "Stop-loss placed below recent swing low", completed: true },
      { task: "Position sizing calculated", completed: false }
    ],
    resources: [
      { name: "Bull market playbook", url: "/resources/bull-market-playbook" },
      { name: "Risk calculator", url: "/tools/risk-calculator" }
    ],
    lastUpdated: "2025-03-18T09:00:00Z",
    version: 2,
    associatedAgents: 3
  },
  {
    id: "sop-002",
    name: "Exchange API Recovery",
    category: "cat-004",
    description: "Recovery procedure for lost or compromised exchange API keys",
    steps: [
      { step: "Revoke compromised keys", details: "Log into exchange and revoke all existing keys" },
      { step: "Generate new keys", details: "Create new API keys with appropriate permissions" },
      { step: "Update farm configuration", details: "Replace keys in the agent configuration" }
    ],
    checklist: [
      { task: "IP restriction applied to new keys", completed: true },
      { task: "Trading permission verified", completed: true },
      { task: "Withdrawal permission disabled", completed: true }
    ],
    resources: [
      { name: "Security best practices", url: "/resources/api-security" }
    ],
    lastUpdated: "2025-03-05T14:30:00Z",
    version: 1,
    associatedAgents: 5
  },
  {
    id: "sop-003",
    name: "Risk Management Review",
    category: "cat-002",
    description: "Monthly portfolio and risk exposure review process",
    steps: [
      { step: "Calculate current exposure", details: "Sum all open positions across exchanges" },
      { step: "Review drawdown metrics", details: "Check maximum drawdown against limits" },
      { step: "Adjust risk parameters", details: "Update position sizing based on performance" }
    ],
    checklist: [
      { task: "Portfolio heat map generated", completed: false },
      { task: "Correlation matrix updated", completed: false },
      { task: "Max risk per trade recalculated", completed: false }
    ],
    resources: [
      { name: "Risk assessment template", url: "/resources/risk-template" },
      { name: "Correlation calculator", url: "/tools/correlation-calc" }
    ],
    lastUpdated: "2025-03-20T11:15:00Z",
    version: 3,
    associatedAgents: 7
  }
];

// Mock data for Exchanges
const exchanges: Exchange[] = [
  {
    id: "exch-001",
    name: "Binance",
    type: "Spot & Futures",
    status: "online",
    farms: 3,
    apiVersion: "v3",
    lastConnected: "2025-03-23T16:30:00Z",
    apiConfig: {
      keys: 2,
      permissions: ["spot", "futures", "margin"],
      ipRestricted: "10.0.0.1/24",
      rateLimit: 1200,
      currentUsage: 345,
      serviceStatus: {
        "spot": "operational",
        "futures": "operational",
        "margin": "operational",
        "websocket": "operational"
      },
      connections: [
        { type: "REST", active: true },
        { type: "WebSocket", active: true }
      ]
    },
    tradingSpecs: {
      supportedPairs: 420,
      orderTypes: ["limit", "market", "stop_limit", "oco"],
      fees: {
        maker: 0.001,
        taker: 0.001
      }
    }
  },
  {
    id: "exch-002",
    name: "Kraken",
    type: "Spot & Futures",
    status: "issues",
    farms: 1,
    apiVersion: "v2",
    lastConnected: "2025-03-23T15:45:00Z",
    apiConfig: {
      keys: 1,
      permissions: ["spot", "futures"],
      ipRestricted: null,
      rateLimit: 600,
      currentUsage: 120,
      serviceStatus: {
        "spot": "operational",
        "futures": "issues",
        "websocket": "operational"
      },
      connections: [
        { type: "REST", active: true },
        { type: "WebSocket", active: true }
      ]
    },
    tradingSpecs: {
      supportedPairs: 155,
      orderTypes: ["limit", "market", "stop_loss"],
      fees: {
        maker: 0.0016,
        taker: 0.0026
      }
    },
    issues: ["Intermittent futures API delays", "Rate limiting stricter than documented"]
  }
];

// Mock data for Knowledge Entries
const knowledgeEntries: KnowledgeEntry[] = [
  {
    id: "know-001",
    title: "BTC Market Cycles Analysis",
    category: "Market Analysis",
    tags: ["bitcoin", "cycles", "indicators"],
    content: "Bitcoin historically follows four-year market cycles tied to the halving events. Recent analysis suggests a potential compression of cycle time with increased institutional adoption.",
    source: "ElizaOS Analysis Engine",
    dateAdded: "2025-03-01T10:00:00Z",
    lastAccessed: "2025-03-22T14:30:00Z"
  },
  {
    id: "know-002",
    title: "Optimal Order Routing for Arbitrage",
    category: "Trading Strategy",
    tags: ["arbitrage", "order-routing", "exchanges"],
    content: "Implementing latency-aware order routing improved arbitrage execution success by 34% in high volatility environments. Primary improvements came from parallel order submission and confirmation.",
    source: "Strategy Research Team",
    dateAdded: "2025-02-15T16:20:00Z",
    lastAccessed: "2025-03-20T09:15:00Z"
  },
  {
    id: "know-003",
    title: "SONIC Token Analysis Report",
    category: "Token Research",
    tags: ["sonic", "fundamental-analysis", "tokenomics"],
    content: "SONIC token implements a dynamic staking mechanism with emission reduction tied to network usage. Current metrics show 73% of total supply is staked with an effective APY of 8.5%.",
    source: "Knowledge Base Import",
    dateAdded: "2025-03-10T11:45:00Z",
    lastAccessed: "2025-03-21T15:30:00Z"
  }
];

// Mock data for Quick Commands
const quickCommands: QuickCommand[] = [
  {
    id: "cmd-001",
    label: "BTC Price",
    command: "price BTC",
    icon: "📊",
    description: "Get current BTC price and 24h change"
  },
  {
    id: "cmd-002",
    label: "Portfolio",
    command: "show portfolio",
    icon: "💼",
    description: "Display portfolio summary"
  },
  {
    id: "cmd-003",
    label: "Agents",
    command: "list agents",
    icon: "🤖",
    description: "List all active trading agents"
  },
  {
    id: "cmd-004",
    label: "Strategies",
    command: "show strategies",
    icon: "📈",
    description: "Display all trading strategies"
  }
];

// Mock chat messages
const initialChatMessages: ChatMessage[] = [
  {
    id: "msg-001",
    content: "Welcome to ElizaOS Command Center. How can I assist with your trading operations today?",
    type: "ai",
    timestamp: new Date("2025-03-23T15:30:00Z"),
    metadata: {
      modelName: "ElizaOS v3.2",
      processingTime: 210
    }
  }
];

export default function BrainPage() {
  // State for the Brain components
  const [activeTab, setActiveTab] = useState("strategies");
  const [selectedStrategy, setSelectedStrategy] = useState<Strategy | null>(null);
  const [selectedSOP, setSelectedSOP] = useState<SOP | null>(null);
  const [selectedSOPCategory, setSelectedSOPCategory] = useState<SOPCategory | null>(null);
  const [selectedExchange, setSelectedExchange] = useState<Exchange | null>(null);
  const [selectedKnowledge, setSelectedKnowledge] = useState<KnowledgeEntry | null>(null);
  const [brainHealth, setBrainHealth] = useState(94);
  const [selectedSOPId, setSelectedSOPId] = useState<string | null>(null);
  const [activeSOPCategory, setActiveSOPCategory] = useState('all');

  // ... (rest of the code remains the same)

  return (
    <div className="container mx-auto py-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center">
            <BrainCircuit className="mr-2 h-8 w-8" />
            Brain
          </h1>
          <p className="text-muted-foreground">
            Central intelligence system for your trading farm operations
          </p>
        </div>
        <Badge className="text-lg py-1 px-3" variant="outline">
          <span className="text-green-500 font-semibold">Brain Health: {brainHealth}%</span>
        </Badge>
      </div>

      {/* Brain Navigation Tabs */}
      <Tabs defaultValue="strategies" value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="mb-6 grid grid-cols-6 md:w-[800px]">
          <TabsTrigger value="strategies" className="gap-2">
            <TrendingUp className="h-4 w-4" />
            <span>Strategies</span>
          </TabsTrigger>
          <TabsTrigger value="sops" className="gap-2">
            <ListChecks className="h-4 w-4" />
            <span>SOPs</span>
          </TabsTrigger>
          <TabsTrigger value="exchange-data" className="gap-2">
            <Globe className="h-4 w-4" />
            <span>Exchange Data</span>
          </TabsTrigger>
          <TabsTrigger value="market-data" className="gap-2">
            <BarChart2 className="h-4 w-4" />
            <span>Market Data</span>
          </TabsTrigger>
          <TabsTrigger value="knowledge-base" className="gap-2">
            <BookText className="h-4 w-4" />
            <span>Knowledge Base</span>
          </TabsTrigger>
          <TabsTrigger value="brain-settings" className="gap-2">
            <Settings className="h-4 w-4" />
            <span>Settings</span>
          </TabsTrigger>
        </TabsList>

        {/* Strategies Tab Content */}
        <TabsContent value="strategies" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Strategy Library Section */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg font-medium">Strategy Library</CardTitle>
                <div className="flex items-center space-x-2">
                  <Search className="h-4 w-4 text-muted-foreground" />
                  <Input placeholder="Search strategies..." className="h-8 w-full" />
                </div>
                <div className="flex items-center mt-2">
                  <Label className="mr-2 text-sm">Filter:</Label>
                  <Select defaultValue="all">
                    <SelectTrigger className="h-8 w-[180px]">
                      <SelectValue placeholder="All Types" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Types</SelectItem>
                      <SelectItem value="accumulation">Accumulation</SelectItem>
                      <SelectItem value="swing">Swing Trading</SelectItem>
                      <SelectItem value="market-neutral">Market Neutral</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {strategies.map((strategy) => (
                    <div
                      key={strategy.id}
                      className={`p-3 border rounded-md cursor-pointer transition-colors ${
                        selectedStrategy?.id === strategy.id
                          ? "border-primary bg-muted"
                          : "hover:bg-muted/50"
                      }`}
                      onClick={() => setSelectedStrategy(strategy)}
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="font-medium">{strategy.name}</h3>
                          <p className="text-sm text-muted-foreground">
                            Type: {strategy.type}
                          </p>
                        </div>
                        <ChevronRight className="h-5 w-5 text-muted-foreground" />
                      </div>
                      <div className="mt-2 text-sm">
                        Active Deployments: {strategy.activeDeployments}
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-4">
                  <Button variant="outline" className="w-full">
                    <List className="h-4 w-4 mr-2" />
                    View All Strategies
                  </Button>
                </div>
              </CardContent>
              <CardFooter className="flex justify-between pt-0">
                <Button className="w-full">
                  <Plus className="h-4 w-4 mr-2" />
                  Create New Strategy
                </Button>
              </CardFooter>
            </Card>

            {/* Strategy Details Section */}
            {selectedStrategy && (
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>
                      Selected Strategy: {selectedStrategy.name}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <Label className="text-xs text-muted-foreground">Type</Label>
                          <p>{selectedStrategy.type}</p>
                        </div>
                        <div>
                          <Label className="text-xs text-muted-foreground">Source</Label>
                          <p>{selectedStrategy.source}</p>
                        </div>
                        <div>
                          <Label className="text-xs text-muted-foreground">Created</Label>
                          <p>{formatDate(new Date(selectedStrategy.lastUpdated))}</p>
                        </div>
                        <div>
                          <Label className="text-xs text-muted-foreground">Last Updated</Label>
                          <p>{formatDate(new Date(selectedStrategy.lastUpdated))}</p>
                        </div>
                      </div>

                      <Separator className="my-3" />

                      <div>
                        <Label className="text-xs text-muted-foreground">Description</Label>
                        <p className="mt-1">{selectedStrategy.description}</p>
                      </div>

                      <Separator className="my-3" />

                      <div>
                        <Label className="text-xs text-muted-foreground">Performance</Label>
                        <div className="grid grid-cols-2 gap-y-2 mt-2">
                          <div className="flex items-center space-x-2">
                            <Circle className="h-2 w-2 fill-green-500 text-green-500" />
                            <span>Win Rate: {selectedStrategy.performance.winRate}%</span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Circle className="h-2 w-2 fill-blue-500 text-blue-500" />
                            <span>Sharpe Ratio: {selectedStrategy.performance.sharpeRatio}</span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Circle className="h-2 w-2 fill-green-500 text-green-500" />
                            <span>Avg Return: +{selectedStrategy.performance.monthlyReturn}%</span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Circle className="h-2 w-2 fill-red-500 text-red-500" />
                            <span>Max Drawdown: {selectedStrategy.performance.maxDrawdown}%</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <Button size="sm" variant="outline">
                        <Edit className="h-4 w-4 mr-2" />
                        Edit
                      </Button>
                      <Button size="sm" variant="outline">
                        <Copy className="h-4 w-4 mr-2" />
                        Clone
                      </Button>
                      <Button size="sm" variant="outline">
                        <ArrowUpRight className="h-4 w-4 mr-2" />
                        Backtest
                      </Button>
                      <Button size="sm">
                        <Bot className="h-4 w-4 mr-2" />
                        Deploy to Agent
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                {selectedStrategy.integrations?.includes("TradingView") && (
                  <Card>
                    <CardHeader>
                      <CardTitle>TradingView Integration</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="border rounded-md h-[180px] flex items-center justify-center bg-muted/50">
                        <div className="text-center">
                          <BarChart2 className="h-16 w-16 mx-auto text-muted-foreground" />
                          <p className="mt-2 text-sm text-muted-foreground">
                            Strategy visualization with technical indicators and generated signals
                          </p>
                        </div>
                      </div>
                      <div className="flex justify-end gap-2 mt-4">
                        <Button size="sm" variant="outline">
                          <ArrowUpRight className="h-4 w-4 mr-2" />
                          View Detailed Chart
                        </Button>
                        <Button size="sm" variant="outline">
                          <Settings className="h-4 w-4 mr-2" />
                          Optimize Parameters
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            )}
          </div>

          {/* Import Strategy Section */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg font-medium">Import Strategy</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Import Options</Label>
                  <div className="flex flex-wrap gap-2">
                    <Button variant="outline" size="sm">
                      <ArrowUpRight className="h-4 w-4 mr-2" />
                      TradingView
                    </Button>
                    <Button variant="outline" size="sm">
                      <FileSpreadsheet className="h-4 w-4 mr-2" />
                      CSV
                    </Button>
                    <Button variant="outline" size="sm">
                      <FileJson className="h-4 w-4 mr-2" />
                      JSON
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <Label>TradingView Account</Label>
                    <Badge variant="outline" className="ml-2">
                      <Circle className="h-2 w-2 fill-green-500 text-green-500 mr-1" />
                      Connected
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Last Sync: 2025-03-23 13:45
                  </p>
                  <p className="text-sm">Available Indicators: 12</p>
                </div>

                <div className="flex flex-col gap-2">
                  <Button>
                    <ArrowUpRight className="h-4 w-4 mr-2" />
                    Import from TradingView
                  </Button>
                  <Button variant="outline">
                    <Plus className="h-4 w-4 mr-2" />
                    Create New Strategy
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* SOPs Tab */}
        <TabsContent value="sops" className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium">Standard Operating Procedures</h3>
            <Button size="sm">
              <PlusCircle className="mr-2 h-4 w-4" />
              New SOP
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {sops.map((sop) => (
              <Card key={sop.id}>
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <CardTitle className="text-lg font-medium">{sop.name}</CardTitle>
                    <div className="flex items-center text-xs font-medium text-green-500">
                      <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                      Up-to-date
                    </div>
                  </div>
                  <div className="flex items-center text-sm text-muted-foreground mt-1">
                    <span className="bg-slate-100 px-2 py-0.5 rounded text-xs mr-2">
                      {sopCategories.find(c => c.id === sop.category)?.name}
                    </span>
                    <span className="text-xs">Updated {formatDate(new Date(sop.lastUpdated))}</span>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 mb-3">
                    <h4 className="text-sm font-medium">Key Steps</h4>
                    <ul className="text-sm space-y-0.5 list-disc list-inside">
                      {sop.steps.map((step, idx) => (
                        <li key={idx} className="text-slate-600 line-clamp-1">{step.step}</li>
                      ))}
                    </ul>
                  </div>
                  <div className="flex items-center text-sm">
                    <span className="text-muted-foreground">In use by {sop.associatedAgents} agents</span>
                  </div>
                </CardContent>
                <CardFooter className="pt-0 flex justify-between">
                  <Button variant="outline" size="sm">View Details</Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* SOPs Tab Content */}
        <TabsContent value="sops" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* SOP Categories */}
            <Card className="md:col-span-1">
              <CardHeader>
                <CardTitle className="text-lg font-medium">Categories</CardTitle>
                <div className="flex items-center space-x-2">
                  <Search className="h-4 w-4 text-muted-foreground" />
                  <Input placeholder="Search categories..." className="h-8 w-full" />
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                {sopCategories.map((category) => (
                  <div
                    key={category.id}
                    className={`p-3 border rounded-md cursor-pointer transition-colors ${
                      selectedSOPCategory?.id === category.id
                        ? "border-primary bg-muted"
                        : "hover:bg-muted/50"
                    }`}
                    onClick={() => setSelectedSOPCategory(category)}
                  >
                    <div className="flex justify-between items-center">
                      <div className="flex items-center">
                        {category.icon && (
                          <div className="mr-2 text-primary">
                            {React.createElement(category.icon, { size: 16 })}
                          </div>
                        )}
                        <span>{category.name}</span>
                      </div>
                      <Badge variant="outline">{category.count}</Badge>
                    </div>
                  </div>
                ))}
              </CardContent>
              <CardFooter>
                <Button variant="outline" className="w-full">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Category
                </Button>
              </CardFooter>
            </Card>

            {/* SOP List */}
            <Card className="md:col-span-1">
              <CardHeader>
                <CardTitle className="text-lg font-medium">
                  {selectedSOPCategory ? selectedSOPCategory.name : "All SOPs"}
                </CardTitle>
                <div className="flex items-center space-x-2">
                  <Search className="h-4 w-4 text-muted-foreground" />
                  <Input placeholder="Search SOPs..." className="h-8 w-full" />
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                {sops
                  .filter(
                    (sop) =>
                      !selectedSOPCategory ||
                      sop.category === selectedSOPCategory.id
                  )
                  .map((sop) => (
                    <div
                      key={sop.id}
                      className={`p-3 border rounded-md cursor-pointer transition-colors ${
                        selectedSOP?.id === sop.id
                          ? "border-primary bg-muted"
                          : "hover:bg-muted/50"
                      }`}
                      onClick={() => setSelectedSOP(sop)}
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="font-medium">{sop.name}</h3>
                          <p className="text-xs text-muted-foreground">
                            {formatDate(new Date(sop.lastUpdated))}
                          </p>
                        </div>
                        <ChevronRight className="h-5 w-5 text-muted-foreground" />
                      </div>
                    </div>
                  ))}
              </CardContent>
              <CardFooter>
                <Button className="w-full">
                  <Plus className="h-4 w-4 mr-2" />
                  Create New SOP
                </Button>
              </CardFooter>
            </Card>

            {/* SOP Details */}
            <Card className="md:col-span-1">
              <CardHeader>
                <CardTitle className="text-lg font-medium">
                  {selectedSOP ? "SOP Details" : "Select an SOP"}
                </CardTitle>
                {selectedSOP && (
                  <div className="flex items-center justify-between">
                    <Badge variant="outline">
                      Version {selectedSOP.version}
                    </Badge>
                    <div className="flex items-center gap-2">
                      <Button size="sm" variant="outline">
                        <Edit className="h-4 w-4 mr-1" />
                        Edit
                      </Button>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button size="icon" variant="ghost" className="h-8 w-8">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem>
                            <Copy className="h-4 w-4 mr-2" />
                            Duplicate
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            <Share2 className="h-4 w-4 mr-2" />
                            Share
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem className="text-red-600">
                            <Trash className="h-4 w-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                )}
              </CardHeader>
              <CardContent>
                {selectedSOP ? (
                  <div className="space-y-4">
                    <div>
                      <h2 className="text-xl font-semibold">{selectedSOP.name}</h2>
                      <p className="text-sm text-muted-foreground">
                        Category: {sopCategories.find(c => c.id === selectedSOP.category)?.name}
                      </p>
                    </div>
                    
                    <Separator />

                    <div>
                      <h3 className="font-medium mb-2">Description</h3>
                      <p className="text-sm">{selectedSOP.description}</p>
                    </div>

                    <Separator />

                    <div>
                      <h3 className="font-medium mb-2">Steps</h3>
                      <div className="space-y-3">
                        {selectedSOP.steps.map((step, index) => (
                          <div key={index} className="flex gap-3">
                            <div className="bg-primary text-primary-foreground w-6 h-6 rounded-full flex items-center justify-center text-sm flex-shrink-0">
                              {index + 1}
                            </div>
                            <div>
                              <p className="font-medium">{step.step}</p>
                              <p className="text-sm">{step.details}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {selectedSOP.checklist && selectedSOP.checklist.length > 0 && (
                      <>
                        <Separator />
                        <div>
                          <h3 className="font-medium mb-2">Checklist</h3>
                          <div className="space-y-2">
                            {selectedSOP.checklist.map((item, index) => (
                              <div key={index} className="flex items-start gap-2">
                                <div className="mt-1 border rounded w-4 h-4 flex-shrink-0"></div>
                                <p className="text-sm">{item.task}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      </>
                    )}

                    {selectedSOP.resources && selectedSOP.resources.length > 0 && (
                      <>
                        <Separator />
                        <div>
                          <h3 className="font-medium mb-2">Resources</h3>
                          <div className="space-y-2">
                            {selectedSOP.resources.map((resource, index) => (
                              <div key={index} className="flex items-center gap-2">
                                <FileJson className="h-4 w-4 text-muted-foreground" />
                                <a href={resource.url} className="text-sm text-primary hover:underline">
                                  {resource.name}
                                </a>
                              </div>
                            ))}
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-[300px] text-center">
                    <FileJson className="h-16 w-16 text-muted-foreground mb-4" />
                    <h3 className="font-medium mb-1">No SOP selected</h3>
                    <p className="text-sm text-muted-foreground">
                      Select an SOP from the list to view its details
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Knowledge Base Integration */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg font-medium">
                ElizaOS Integration
              </CardTitle>
              <CardDescription>
                Connect your SOPs with the knowledge base for AI-assisted execution
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1 space-y-4">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="bg-blue-50">
                      <Circle className="h-2 w-2 fill-blue-500 text-blue-500 mr-1" />
                      Connected
                    </Badge>
                    <span className="text-sm">ElizaOS Knowledge Base</span>
                  </div>
                  
                  <div className="space-y-2">
                    <Label>SOP Execution</Label>
                    <div className="flex flex-wrap gap-2">
                      <Button variant="outline" size="sm">
                        <Bot className="h-4 w-4 mr-2" />
                        Auto-execute with Agent
                      </Button>
                      <Button variant="outline" size="sm">
                        <Terminal className="h-4 w-4 mr-2" />
                        Command Console
                      </Button>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Contextual Assistance</Label>
                    <Input 
                      placeholder="Ask about this SOP..." 
                      className="w-full"
                    />
                  </div>
                </div>
                
                <Separator orientation="vertical" className="hidden md:block h-auto" />
                <Separator className="md:hidden" />
                
                <div className="flex-1">
                  <div className="border rounded-md p-4 bg-muted/50 h-[200px] flex items-center justify-center">
                    <div className="text-center">
                      <Bot className="h-12 w-12 mx-auto text-muted-foreground" />
                      <p className="mt-2 text-sm text-muted-foreground">
                        Select an SOP to see AI-assisted execution options
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
            <CardFooter className="bg-muted/50">
              <div className="w-full text-sm text-muted-foreground">
                ElizaOS can help you execute SOPs by providing step-by-step guidance, automating tasks, and integrating with trading agents.
              </div>
            </CardFooter>
          </Card>
        </TabsContent>

        {/* Exchange Data Tab */}
        <TabsContent value="exchange-data" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Exchanges Overview */}
            <Card className="md:col-span-1">
              <CardHeader>
                <CardTitle className="text-lg font-medium">Connected Exchanges</CardTitle>
                <div className="flex items-center space-x-2">
                  <Search className="h-4 w-4 text-muted-foreground" />
                  <Input placeholder="Search exchanges..." className="h-8 w-full" />
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                {exchanges.map((exchange) => (
                  <div
                    key={exchange.id}
                    className={`p-3 border rounded-md cursor-pointer transition-colors ${
                      selectedExchange?.id === exchange.id
                        ? "border-primary bg-muted"
                        : "hover:bg-muted/50"
                    }`}
                    onClick={() => setSelectedExchange(exchange)}
                  >
                    <div className="flex justify-between items-center">
                      <div className="flex items-center">
                        <div className="mr-2 w-6 h-6 bg-muted rounded-full flex items-center justify-center">
                          {exchange.name.substring(0, 1)}
                        </div>
                        <span className="font-medium">{exchange.name}</span>
                      </div>
                      <Badge variant={exchange.status === 'online' ? "success" : "destructive"}>
                        {exchange.status}
                      </Badge>
                    </div>
                    <div className="mt-1 text-xs text-muted-foreground">
                      API Version: {exchange.apiVersion}
                    </div>
                  </div>
                ))}
              </CardContent>
              <CardFooter>
                <Button className="w-full">
                  <Plus className="h-4 w-4 mr-2" />
                  Connect New Exchange
                </Button>
              </CardFooter>
            </Card>

            {/* Exchange Status & Health */}
            <Card className="md:col-span-1">
              <CardHeader>
                <CardTitle className="text-lg font-medium">Exchange Health</CardTitle>
                <CardDescription>API limits and service status</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {selectedExchange ? (
                  <>
                    <div className="space-y-1">
                      <div className="flex justify-between items-center">
                        <Label className="text-sm">API Calls (24h)</Label>
                        <span className="text-sm font-medium">{selectedExchange.apiConfig.currentUsage} / {selectedExchange.apiConfig.rateLimit}</span>
                      </div>
                      <Progress value={(selectedExchange.apiConfig.currentUsage / selectedExchange.apiConfig.rateLimit) * 100} className="h-2" />
                    </div>

                    <div className="space-y-1">
                      <div className="flex justify-between items-center">
                        <Label className="text-sm">Weight Usage</Label>
                        <span className="text-sm font-medium">{selectedExchange.apiConfig.currentUsage}%</span>
                      </div>
                      <Progress value={selectedExchange.apiConfig.currentUsage} className="h-2" />
                    </div>

                    <div className="space-y-2">
                      <Label className="text-sm">Service Status</Label>
                      <div className="grid grid-cols-2 gap-2">
                        {Object.entries(selectedExchange.apiConfig.serviceStatus).map(([service, status]) => (
                          <div key={service} className="flex items-center space-x-2 bg-muted/50 p-2 rounded-md">
                            <div className={`w-2 h-2 rounded-full ${status === 'operational' ? 'bg-green-500' : status === 'issues' ? 'bg-yellow-500' : 'bg-red-500'}`}></div>
                            <span className="text-xs capitalize">{service}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-sm">Last Connection</Label>
                      <div className="text-sm">{formatDate(new Date(selectedExchange.lastConnected))}</div>
                    </div>
                  </>
                ) : (
                  <div className="flex flex-col items-center justify-center h-[200px] text-center">
                    <Network className="h-16 w-16 text-muted-foreground mb-4" />
                    <h3 className="font-medium mb-1">No Exchange Selected</h3>
                    <p className="text-sm text-muted-foreground">
                      Select an exchange to view its health status
                    </p>
                  </div>
                )}
              </CardContent>
              {selectedExchange && (
                <CardFooter>
                  <Button variant="outline" size="sm" className="w-full">
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Refresh Status
                  </Button>
                </CardFooter>
              )}
            </Card>

            {/* Exchange Configuration */}
            <Card className="md:col-span-1">
              <CardHeader>
                <CardTitle className="text-lg font-medium">API Configuration</CardTitle>
                {selectedExchange && (
                  <CardDescription>{selectedExchange.name} API Settings</CardDescription>
                )}
              </CardHeader>
              <CardContent>
                {selectedExchange ? (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label className="text-sm">API Key</Label>
                      <div className="flex items-center space-x-2">
                        <Input
                          value="••••••••••••••••••••••••••••••"
                          disabled
                          className="font-mono text-xs"
                        />
                        <Button size="sm" variant="ghost" className="h-8 w-8 p-0">
                          <Copy className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-sm">API Secret</Label>
                      <div className="flex items-center space-x-2">
                        <Input
                          value="••••••••••••••••••••••••••••••"
                          disabled
                          className="font-mono text-xs"
                        />
                        <Button size="sm" variant="ghost" className="h-8 w-8 p-0">
                          <Copy className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <Label className="text-xs">Permissions</Label>
                        <div className="flex flex-wrap gap-1">
                          {selectedExchange.apiConfig.permissions.map((permission) => (
                            <Badge key={permission} variant="outline" className="text-xs">
                              {permission}
                            </Badge>
                          ))}
                        </div>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">IP Restrictions</Label>
                        <div className="text-sm font-mono">
                          {selectedExchange.apiConfig.ipRestricted || "None"}
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-sm">Connections</Label>
                      <div className="space-y-1">
                        {selectedExchange.apiConfig.connections.map((connection, idx) => (
                          <div key={idx} className="flex justify-between items-center py-1">
                            <div className="flex items-center">
                              <div className={`w-2 h-2 rounded-full ${connection.active ? 'bg-green-500' : 'bg-red-500'} mr-2`}></div>
                              <span className="text-sm">{connection.type}</span>
                            </div>
                            <span className="text-xs text-muted-foreground">
                              {connection.active ? "Connected" : "Disconnected"}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-[200px] text-center">
                    <Shield className="h-16 w-16 text-muted-foreground mb-4" />
                    <h3 className="font-medium mb-1">No Exchange Selected</h3>
                    <p className="text-sm text-muted-foreground">
                      Select an exchange to view its API configuration
                    </p>
                  </div>
                )}
              </CardContent>
              {selectedExchange && (
                <CardFooter className="flex space-x-2">
                  <Button variant="outline" size="sm" className="flex-1">
                    <Edit className="h-4 w-4 mr-2" />
                    Edit
                  </Button>
                  <Button variant="outline" size="sm" className="flex-1">
                    <Lock className="h-4 w-4 mr-2" />
                    Rotate Keys
                  </Button>
                </CardFooter>
              )}
            </Card>
          </div>

          {/* Exchange Market Data */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg font-medium">
                {selectedExchange ? `${selectedExchange.name} Market Data` : 'Market Data'}
              </CardTitle>
              <CardDescription>
                Available markets and trading pairs
              </CardDescription>
            </CardHeader>
            <CardContent>
              {selectedExchange ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="space-x-2">
                      <Label>Trading Pair</Label>
                      <Select defaultValue="BTCUSDT">
                        <SelectTrigger className="w-[180px]">
                          <SelectValue placeholder="Select trading pair" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="BTCUSDT">BTC/USDT</SelectItem>
                          <SelectItem value="ETHUSDT">ETH/USDT</SelectItem>
                          <SelectItem value="SOLUSDT">SOL/USDT</SelectItem>
                          <SelectItem value="BNBUSDT">BNB/USDT</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <Button variant="outline" size="sm">
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Refresh
                    </Button>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <Card className="bg-muted/50">
                      <CardContent className="p-4">
                        <div className="text-xs text-muted-foreground">Last Price</div>
                        <div className="text-lg font-medium">$27,865.42</div>
                        <div className="text-xs text-green-500">+2.34%</div>
                      </CardContent>
                    </Card>
                    <Card className="bg-muted/50">
                      <CardContent className="p-4">
                        <div className="text-xs text-muted-foreground">24h Volume</div>
                        <div className="text-lg font-medium">$1.2B</div>
                        <div className="text-xs text-muted-foreground">23,546 BTC</div>
                      </CardContent>
                    </Card>
                    <Card className="bg-muted/50">
                      <CardContent className="p-4">
                        <div className="text-xs text-muted-foreground">24h High</div>
                        <div className="text-lg font-medium">$28,123.54</div>
                      </CardContent>
                    </Card>
                    <Card className="bg-muted/50">
                      <CardContent className="p-4">
                        <div className="text-xs text-muted-foreground">24h Low</div>
                        <div className="text-lg font-medium">$27,210.87</div>
                      </CardContent>
                    </Card>
                  </div>

                  <div className="flex justify-end space-x-2">
                    <Button variant="outline" size="sm">
                      <Download className="h-4 w-4 mr-2" />
                      Export Data
                    </Button>
                    <Button size="sm">
                      <ArrowUpRight className="h-4 w-4 mr-2" />
                      Open Chart
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-[200px] text-center">
                  <BarChart2 className="h-16 w-16 text-muted-foreground mb-4" />
                  <h3 className="font-medium mb-1">No Exchange Selected</h3>
                  <p className="text-sm text-muted-foreground">
                    Select an exchange to view market data
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Market Data Tab */}
        <TabsContent value="market-data" className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium">Market Analysis</h3>
            <div className="flex items-center gap-2">
              <Select defaultValue="1d">
                <SelectTrigger className="w-[120px] h-8">
                  <SelectValue placeholder="Timeframe" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1h">1 Hour</SelectItem>
                  <SelectItem value="4h">4 Hours</SelectItem>
                  <SelectItem value="1d">1 Day</SelectItem>
                  <SelectItem value="1w">1 Week</SelectItem>
                </SelectContent>
              </Select>
              <Button size="sm" variant="outline">
                <Filter className="mr-2 h-4 w-4" />
                Filter
              </Button>
              <Button size="sm" variant="outline">
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Market Trend Analysis</CardTitle>
                <CardDescription>
                  Current market direction and strength indicators
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>BTC/USD Trend Strength</span>
                      <span className="font-medium text-green-500">Strong Uptrend</span>
                    </div>
                    <Progress value={85} className="h-2" />
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>ETH/USD Trend Strength</span>
                      <span className="font-medium text-green-500">Moderate Uptrend</span>
                    </div>
                    <Progress value={68} className="h-2" />
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>SONIC/USD Trend Strength</span>
                      <span className="font-medium text-amber-500">Sideways</span>
                    </div>
                    <Progress value={50} className="h-2" />
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>SUI/USD Trend Strength</span>
                      <span className="font-medium text-red-500">Weak Downtrend</span>
                    </div>
                    <Progress value={32} className="h-2" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Volatility Metrics</CardTitle>
                <CardDescription>
                  Volatility indicators for major trading pairs
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid grid-cols-3 gap-4">
                    <div className="flex flex-col items-center justify-center p-3 bg-slate-50 rounded-md">
                      <span className="text-xs text-muted-foreground">BTC/USD</span>
                      <span className="text-xl font-bold">28.4%</span>
                      <span className="text-xs text-green-500">+2.1%</span>
                    </div>
                    <div className="flex flex-col items-center justify-center p-3 bg-slate-50 rounded-md">
                      <span className="text-xs text-muted-foreground">ETH/USD</span>
                      <span className="text-xl font-bold">32.7%</span>
                      <span className="text-xs text-green-500">+4.3%</span>
                    </div>
                    <div className="flex flex-col items-center justify-center p-3 bg-slate-50 rounded-md">
                      <span className="text-xs text-muted-foreground">SONIC/USD</span>
                      <span className="text-xl font-bold">45.2%</span>
                      <span className="text-xs text-green-500">+8.6%</span>
                    </div>
                  </div>

                  <div>
                    <h4 className="text-sm font-medium mb-2">Volatility Insights</h4>
                    <ul className="space-y-2 text-sm">
                      <li className="flex items-start gap-2">
                        <TrendingUp className="h-4 w-4 mt-0.5 text-green-500" />
                        <div>
                          <p className="font-medium">BTC volatility below 30-day average</p>
                          <p className="text-xs text-muted-foreground">Favorable for grid strategies</p>
                        </div>
                      </li>
                      <li className="flex items-start gap-2">
                        <Zap className="h-4 w-4 mt-0.5 text-amber-500" />
                        <div>
                          <p className="font-medium">SONIC showing increased volatility</p>
                          <p className="text-xs text-muted-foreground">Consider widening stop losses</p>
                        </div>
                      </li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Knowledge Base Tab */}
        <TabsContent value="knowledge-base" className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium">Knowledge Repository</h3>
            <div className="flex items-center gap-2">
              <Button size="sm" variant="outline">
                <Share2 className="mr-2 h-4 w-4" />
                Connect ElizaOS
              </Button>
              <Button size="sm">
                <PlusCircle className="mr-2 h-4 w-4" />
                Create Entry
              </Button>
            </div>
          </div>

          <Card>
            <CardContent className="pt-6">
              <div className="space-y-4">
                {knowledgeEntries.map((entry) => (
                  <div key={entry.id} className="space-y-2">
                    <h4 className="text-lg font-medium">{entry.title}</h4>
                    <p className="text-sm text-slate-600">{entry.content}</p>
                    <div className="flex items-center text-sm">
                      <span className="text-muted-foreground">Category: {entry.category}</span>
                      <span className="text-xs text-muted-foreground ml-2">Tags: {entry.tags.join(', ')}</span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Brain Settings Tab */}
        <TabsContent value="brain-settings" className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium">Brain Settings</h3>
          </div>

          <Card>
            <CardContent className="pt-6">
              <div className="space-y-4">
                <div className="grid gap-2">
                  <Label className="text-sm font-medium">Brain Health Threshold</Label>
                  <Input type="number" value={brainHealth} onChange={(e) => setBrainHealth(Number(e.target.value))} />
                </div>
                <div className="grid gap-2">
                  <Label className="text-sm font-medium">Notification Preferences</Label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Select preference" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All notifications</SelectItem>
                      <SelectItem value="critical">Critical notifications only</SelectItem>
                      <SelectItem value="none">No notifications</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* ElizaOS Command Center */}
      <div className="mt-8">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Terminal className="h-5 w-5 mr-2" />
              ElizaOS Command Center
            </CardTitle>
            <CardDescription>
              Interact with your trading farm using natural language
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ElizaChatInterface />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
