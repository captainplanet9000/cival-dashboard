"use client";

import * as React from 'react';
import { createBrowserClient } from "@/utils/supabase/client";
// Enable synthetic default imports for compatibility
// @ts-ignore - This is needed for module compatibility
import { WidgetContainer } from '@/components/dashboard/widget-container';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue 
} from "@/components/ui/select";
import { useTheme } from 'next-themes';
import { useToast } from '@/components/ui/use-toast';
import {
  Wallet,
  ArrowRightLeft,
  DollarSign,
  Send,
  Loader2,
  RefreshCw,
  Terminal,
  BarChart,
  ArrowDown,
  ArrowUp,
  History,
  Info,
  AlertCircle
} from 'lucide-react';
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { v4 as uuidv4 } from 'uuid';
import { handleSupabaseError, handleApiError, ErrorSource, ErrorCategory } from '@/utils/error-handling';
import { cardStyles, widgetStyles, statusBadgeStyles, tableStyles } from '@/components/ui/component-styles';

interface Message {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: Date;
  status?: "sending" | "sent" | "error";
}

interface DeFiProtocol {
  id: string;
  name: string;
  symbol: string;
  type: "lending" | "dex" | "yield" | "staking" | "other";
  apy?: number;
  tvl?: number;
  riskLevel?: "low" | "medium" | "high";
  chain: string;
  status: "active" | "inactive";
}

interface PositionData {
  id: string;
  protocol: string;
  asset: string;
  type: "deposit" | "loan" | "stake" | "lp";
  amount: number;
  value: number;
  apy?: number;
  startDate: Date;
  endDate?: Date;
}

const protocols: DeFiProtocol[] = [
  { id: "aave-v3", name: "Aave", symbol: "AAVE", type: "lending", apy: 3.2, tvl: 5.4, riskLevel: "low", chain: "ethereum", status: "active" },
  { id: "compound-v3", name: "Compound", symbol: "COMP", type: "lending", apy: 2.8, tvl: 3.1, riskLevel: "low", chain: "ethereum", status: "active" },
  { id: "uniswap-v3", name: "Uniswap", symbol: "UNI", type: "dex", tvl: 7.2, chain: "ethereum", status: "active" },
  { id: "curve", name: "Curve", symbol: "CRV", type: "dex", apy: 5.1, tvl: 4.8, riskLevel: "medium", chain: "ethereum", status: "active" },
  { id: "lido", name: "Lido", symbol: "LDO", type: "staking", apy: 4.0, tvl: 9.3, riskLevel: "low", chain: "ethereum", status: "active" },
  { id: "yearn", name: "Yearn Finance", symbol: "YFI", type: "yield", apy: 7.2, tvl: 1.5, riskLevel: "medium", chain: "ethereum", status: "active" },
];

const mockPositions: PositionData[] = [
  { 
    id: "pos-1", 
    protocol: "Aave",
    asset: "ETH",
    type: "deposit",
    amount: 2.5,
    value: 7500,
    apy: 2.1,
    startDate: new Date(2025, 1, 15)
  },
  { 
    id: "pos-2", 
    protocol: "Curve",
    asset: "ETH/USDC",
    type: "lp",
    amount: 5000,
    value: 5120,
    apy: 4.8,
    startDate: new Date(2025, 2, 10)
  },
  { 
    id: "pos-3", 
    protocol: "Lido",
    asset: "ETH",
    type: "stake",
    amount: 5,
    value: 15000,
    apy: 4.0,
    startDate: new Date(2025, 0, 20)
  }
];

interface ElizaDeFiConsoleWidgetProps {
  id: string;
  title?: string;
  onRefresh?: (id: string) => void;
  onRemove?: (id: string) => void;
  defaultSize?: { width: number; height: number };
  farmId?: string;
}

export default function ElizaDeFiConsoleWidget({
  id,
  title = "ElizaOS DeFi Console",
  onRefresh,
  onRemove,
  defaultSize = { width: 800, height: 500 },
  farmId
}: ElizaDeFiConsoleWidgetProps) {
  const [activeTab, setActiveTab] = React.useState<string>("overview");
  const [input, setInput] = React.useState<string>("");
  const [isProcessing, setIsProcessing] = React.useState<boolean>(false);
  const [messages, setMessages] = React.useState<Message[]>([
    {
      id: "welcome",
      role: "assistant",
      content: "Welcome to ElizaOS DeFi Console. How can I help optimize your DeFi strategy today?",
      timestamp: new Date(),
    },
  ]);
  const [positions, setPositions] = React.useState<PositionData[]>(mockPositions);
  const [isOfflineMode, setIsOfflineMode] = React.useState<boolean>(false);
  const [isLoading, setIsLoading] = React.useState<boolean>(true);
  const [totalValue, setTotalValue] = React.useState<number>(0);
  
  const { theme } = useTheme();
  const { toast } = useToast();
  const inputRef = React.useRef<HTMLInputElement>(null);
  const endOfMessagesRef = React.useRef<HTMLDivElement>(null);
  const supabaseRef = React.useRef(createBrowserClient());
  
  // Calculate total portfolio value
  React.useEffect(() => {
    const total = positions.reduce((sum: number, pos: PositionData) => sum + pos.value, 0);
    setTotalValue(total);
  }, [positions]);
  
  // Simulate data loading
  React.useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 1500);
    
    return () => clearTimeout(timer);
  }, []);
  
  // Scroll to bottom when messages change
  React.useEffect(() => {
    endOfMessagesRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);
  
  // Test connection to backend/API and initialize connection status
  React.useEffect(() => {
    const testConnection = async () => {
      try {
        const supabase = createBrowserClient();
        const { data, error } = await supabase
          .from('system_health')
          .select('status')
          .maybeSingle();
        
        if (error) {
          handleSupabaseError(error, 'Connection to ElizaOS API failed', {
            showToast: true,
            contextData: { component: 'ElizaDeFiConsoleWidget', action: 'testConnection' }
          });
          setIsOfflineMode(true);
          return false;
        }
        
        setIsOfflineMode(false);
        return true;
      } catch (err) {
        handleApiError(err, 'Unable to connect to ElizaOS services', {
          showToast: true,
          contextData: { component: 'ElizaDeFiConsoleWidget', action: 'testConnection' }
        });
        setIsOfflineMode(true);
        
        // Try to recreate the client
        supabaseRef.current = createBrowserClient();
        return false;
      }
    };
    
    testConnection();
  }, [toast]);
  
  const handleSend = async () => {
    if (!input.trim()) return;

    const userMessage: Message = {
      id: uuidv4(),
      role: "user",
      content: input,
      timestamp: new Date(),
    };

    // Add user message to chat
    setMessages((prev: Message[]) => [...prev, userMessage]);
    setInput("");
    setIsProcessing(true);
    
    // Create thinking message
    const thinkingMessage: Message = {
      id: uuidv4(),
      role: "assistant",
      content: "Analyzing DeFi markets and protocols...",
      timestamp: new Date(),
      status: "sending",
    };
    
    // Add thinking message
    setMessages((prev: Message[]) => [...prev, thinkingMessage]);
    
    try {
      // Try processing with backend if available
      if (!isOfflineMode) {
        try {
          // Store message in supabase
          const { error } = await supabaseRef.current
            .from('elizaos_defi_messages')
            .insert([{
              farm_id: farmId,
              content: input,
              role: 'user',
              session_id: id
            }]);
            
          if (error) {
            console.error('Failed to save message:', error);
            // Silently continue - don't interrupt the user experience
          }
          
          // Try to get response from backend
          const { data, error: responseError } = await supabaseRef.current
            .rpc('get_defi_analysis', { 
              query_text: input.toLowerCase().trim(),
              p_farm_id: farmId
            });
            
          if (responseError || !data) {
            throw new Error('Backend processing failed');
          }
          
          // Remove thinking message and add real response
          setMessages((prev: Message[]) => prev.filter((msg: Message) => msg.id !== thinkingMessage.id));
          
          const assistantMessage: Message = {
            id: uuidv4(),
            role: "assistant",
            content: data.response || processCommand(input.toLowerCase().trim()),
            timestamp: new Date(),
          };
          
          setMessages((prev: Message[]) => [...prev, assistantMessage]);
          setIsProcessing(false);
          return;
        } catch (err) {
          console.error('Backend processing failed, falling back to offline mode:', err);
          // Fall through to offline processing
        }
      }
      
      // Process command in offline mode
      setTimeout(() => {
        const botResponse = processCommand(input.toLowerCase().trim());
        
        // Remove thinking message and add real response
        setMessages((prev: Message[]) => prev.filter((msg: Message) => msg.id !== thinkingMessage.id));
        
        const assistantMessage: Message = {
          id: uuidv4(),
          role: "assistant",
          content: botResponse,
          timestamp: new Date(),
        };
        
        setMessages((prev: Message[]) => [...prev, assistantMessage]);
        setIsProcessing(false);
      }, 2000);
    } catch (error) {
      // Handle any unexpected errors
      console.error('Error in message processing:', error);
      
      // Remove thinking message and add error response
      setMessages((prev: Message[]) => prev.filter((msg: Message) => msg.id !== thinkingMessage.id));
      
      const errorMessage: Message = {
        id: uuidv4(),
        role: "assistant",
        content: "I'm sorry, I encountered an error processing your request. Please try again.",
        timestamp: new Date(),
        status: "error"
      };
      
      setMessages((prev: Message[]) => [...prev, errorMessage]);
      setIsProcessing(false);
      
      toast({
        title: "Processing Error",
        description: "Failed to process your request",
        variant: "destructive"
      });
    }
  };
  
  const processCommand = (command: string): string => {
    // Process basic commands in offline mode
    if (command.includes("help") || command === "?") {
      return "DeFi Console Commands:\n- 'protocols': List available protocols\n- 'apy': Show current yield opportunities\n- 'positions': View your active positions\n- 'optimize': Get portfolio optimization suggestions\n- 'risks': Analyze current risk exposure\n- 'gas': Check current gas prices";
    }
    
    if (command.includes("protocols") || command.includes("platforms")) {
      return `Available DeFi Protocols:\n${protocols.map((p: DeFiProtocol) => `- ${p.name} (${p.type}): ${p.status === 'active' ? 'Available' : 'Unavailable'}`).join('\n')}`;
    }
    
    if (command.includes("apy") || command.includes("yield")) {
      const yieldData = protocols
        .filter((p: DeFiProtocol) => p.apy !== undefined)
        .sort((a: DeFiProtocol, b: DeFiProtocol) => (b.apy || 0) - (a.apy || 0));
      
      return `Current Yield Opportunities:\n${yieldData.map((p: DeFiProtocol) => `- ${p.name}: ${p.apy}% APY (${p.riskLevel} risk)`).join('\n')}`;
    }
    
    if (command.includes("positions") || command.includes("portfolio")) {
      return `Your Active Positions:\n${positions.map((p: PositionData) => `- ${p.protocol} - ${p.amount} ${p.asset}: $${p.value.toLocaleString()} (${p.apy ? p.apy + '% APY' : 'Variable yield'})`).join('\n')}\nTotal Value: $${totalValue.toLocaleString()}`;
    }
    
    if (command.includes("optimize") || command.includes("suggest")) {
      return "Portfolio Optimization Suggestions:\n1. Consider moving 50% of your Aave ETH position to Lido for +1.9% APY increase\n2. Diversify stable coin exposure across Curve and Compound for better risk management\n3. Consider Layer 2 positions (Arbitrum/Optimism) for 30-40% gas savings";
    }
    
    if (command.includes("risks") || command.includes("exposure")) {
      return "Risk Analysis Summary:\n- Protocol Exposure: Moderate (distributed across 3 major platforms)\n- Asset Diversification: Needs improvement (75% ETH exposure)\n- Smart Contract Risk: Low (using only audited blue-chip protocols)\n- Impermanent Loss Risk: Moderate (20% of portfolio in LP positions)\n\nRecommendation: Consider reducing ETH concentration by 15-20%";
    }
    
    if (command.includes("gas") || command.includes("fees")) {
      return "Current Gas Prices (Ethereum):\n- Slow (5-10 min): 25 gwei ($2.40 for swap)\n- Standard (1-3 min): 32 gwei ($3.10 for swap)\n- Fast (< 30 sec): 40 gwei ($3.85 for swap)\n\nL2 Alternatives:\n- Arbitrum: 0.1-0.3 gwei ($0.50 for swap)\n- Optimism: 0.1-0.25 gwei ($0.45 for swap)";
    }
    
    // Generic response for unrecognized commands
    return "I'm not sure how to process that DeFi request. Type 'help' to see available commands.";
  };
  
  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };
  
  const handleRefreshData = async () => {
    setIsLoading(true);
    
    try {
      // Try to fetch real data if not in offline mode
      if (!isOfflineMode && farmId) {
        try {
          const { data, error } = await supabaseRef.current
            .from('defi_positions')
            .select('*')
            .eq('farm_id', farmId);
          
          if (error) {
            handleSupabaseError(error, 'Failed to fetch DeFi positions', {
              showToast: true,
              contextData: { component: 'ElizaDeFiConsoleWidget', farmId }
            });
            throw error;
          }
          
          if (data && data.length > 0) {
            // Transform to PositionData format
            const positionData = data.map((pos: any) => ({
              id: pos.id,
              protocol: pos.protocol_name,
              asset: pos.asset_symbol,
              type: pos.position_type as "deposit" | "loan" | "stake" | "lp",
              amount: parseFloat(pos.amount),
              value: parseFloat(pos.usd_value),
              apy: pos.apy ? parseFloat(pos.apy) : undefined,
              startDate: new Date(pos.start_date),
              endDate: pos.end_date ? new Date(pos.end_date) : undefined
            }));
            
            setPositions(positionData);
            setIsLoading(false);
            
            toast({
              title: "Data refreshed",
              description: "Latest DeFi positions loaded successfully."
            });
            
            if (onRefresh) {
              onRefresh(id);
            }
            
            return;
          }
        } catch (err) {
          handleApiError(err, 'Error fetching positions', {
            showToast: false, // Don't show toast for fallback to offline mode
            logToConsole: true,
            contextData: { component: 'ElizaDeFiConsoleWidget', action: 'handleRefreshData' }
          });
          // Fall through to offline data
        }
      }
      
      // Use mock data if we can't fetch from backend or no positions were found
      setTimeout(() => {
        // Simulate updated data
        const updatedPositions = [...positions];
        updatedPositions.forEach((pos: PositionData) => {
          // Add small random fluctuation to values
          const changePercent = (Math.random() * 3) - 1.5; // -1.5% to +1.5%
          pos.value = pos.value * (1 + (changePercent / 100));
        });
        
        setPositions(updatedPositions);
        setIsLoading(false);
        
        // Show toast
        toast({
          title: "Data refreshed",
          description: isOfflineMode 
            ? "Mock DeFi market data has been updated." 
            : "Could not fetch live data. Using simulation instead."
        });
        
        // Call parent refresh if provided
        if (onRefresh) {
          onRefresh(id);
        }
      }, 1000);
    } catch (error) {
      handleApiError(error, 'Failed to refresh DeFi data', {
        showToast: true,
        contextData: { component: 'ElizaDeFiConsoleWidget', action: 'handleRefreshData' }
      });
      setIsLoading(false);
    }
  };
  
  return (
    <WidgetContainer
      id={id}
      title={title}
      onRemove={onRemove}
      onRefresh={handleRefreshData}
      description="Intelligent DeFi position management and optimization"
      isLoading={isLoading}
      defaultSize={defaultSize}
    >
      <Tabs 
        defaultValue="overview" 
        value={activeTab}
        onValueChange={setActiveTab}
        className="w-full"
      >
        <TabsList className="grid grid-cols-4 mb-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="positions">Positions</TabsTrigger>
          <TabsTrigger value="protocols">Protocols</TabsTrigger>
          <TabsTrigger value="console">Console</TabsTrigger>
        </TabsList>
        
        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-medium text-sm">Total Value</h3>
                  <DollarSign className="h-4 w-4 text-primary" />
                </div>
                <p className="text-2xl font-bold mt-2">${totalValue.toLocaleString()}</p>
                <div className="flex items-center mt-1 text-xs text-emerald-500">
                  <ArrowUp className="h-3 w-3 mr-1" />
                  <span>+2.4% (24h)</span>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-medium text-sm">Avg. APY</h3>
                  <BarChart className="h-4 w-4 text-primary" />
                </div>
                <p className="text-2xl font-bold mt-2">3.7%</p>
                <div className="flex items-center mt-1 text-xs text-amber-500">
                  <ArrowDown className="h-3 w-3 mr-1" />
                  <span>-0.2% (7d)</span>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-medium text-sm">Active Positions</h3>
                  <Wallet className="h-4 w-4 text-primary" />
                </div>
                <p className="text-2xl font-bold mt-2">{positions.length}</p>
                <div className="text-xs text-muted-foreground mt-1">
                  <span>Across {new Set(positions.map(p => p.protocol)).size} protocols</span>
                </div>
              </CardContent>
            </Card>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardContent className="p-4">
                <h3 className="font-medium text-sm mb-3">Position Allocation</h3>
                <div className="space-y-3">
                  {positions.map((position: PositionData, index: number) => (
                    <div key={position.id} className="flex justify-between items-center">
                      <div className="flex items-center">
                        <div className="w-2 h-8 rounded-sm bg-primary mr-3 opacity-80"></div>
                        <div>
                          <p className="text-sm font-medium">{position.protocol}</p>
                          <p className="text-xs text-muted-foreground">{position.asset}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium">${position.value.toLocaleString()}</p>
                        <p className="text-xs text-muted-foreground">
                          {Math.round((position.value / totalValue) * 100)}%
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4">
                <h3 className="font-medium text-sm mb-3">Optimization Suggestions</h3>
                <div className="space-y-3 text-sm">
                  <div className="flex items-start">
                    <Badge className="mt-0.5 mr-2 bg-emerald-100 text-emerald-700 hover:bg-emerald-100">Yield</Badge>
                    <p>Moving ETH to Lido offers +1.9% higher yield than current deposit</p>
                  </div>
                  <div className="flex items-start">
                    <Badge className="mt-0.5 mr-2 bg-blue-100 text-blue-700 hover:bg-blue-100">Gas</Badge>
                    <p>Consider using Layer 2 solutions for 30-40% gas savings</p>
                  </div>
                  <div className="flex items-start">
                    <Badge className="mt-0.5 mr-2 bg-amber-100 text-amber-700 hover:bg-amber-100">Risk</Badge>
                    <p>High ETH concentration (75%) - consider diversifying</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        
        <TabsContent value="positions" className="space-y-4">
          <div className="flex justify-between items-center mb-2">
            <h3 className="font-medium">Active Positions</h3>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleRefreshData}
              disabled={isLoading}
            >
              {isLoading ? (
                <Loader2 className="h-3 w-3 mr-1 animate-spin" />
              ) : (
                <RefreshCw className="h-3 w-3 mr-1" />
              )}
              Refresh
            </Button>
          </div>
          
          <div className="rounded-md border">
            <div className="grid grid-cols-6 px-4 py-2 border-b bg-muted font-medium text-sm">
              <div>Protocol</div>
              <div>Asset</div>
              <div>Type</div>
              <div>Amount</div>
              <div>Value</div>
              <div>APY</div>
            </div>
            <div className="divide-y">
              {positions.map((position: PositionData) => (
                <div key={position.id} className="grid grid-cols-6 px-4 py-3 text-sm">
                  <div>{position.protocol}</div>
                  <div>{position.asset}</div>
                  <div className="capitalize">{position.type}</div>
                  <div>{position.amount}</div>
                  <div>${position.value.toLocaleString()}</div>
                  <div>{position.apy ? `${position.apy}%` : '-'}</div>
                </div>
              ))}
            </div>
          </div>
          
          <div className="flex items-center justify-between px-2 py-1">
            <div className="text-sm text-muted-foreground">
              Total Value: <span className="font-medium">${totalValue.toLocaleString()}</span>
            </div>
            <Button size="sm" variant="outline">
              <ArrowRightLeft className="h-3 w-3 mr-1" /> 
              New Position
            </Button>
          </div>
          
          <div className="rounded-md bg-muted/50 p-3 text-sm flex items-start">
            <Info className="h-4 w-4 mr-2 mt-0.5 text-blue-500" />
            <p>
              Use the ElizaOS DeFi Console to get personalized optimization recommendations
              for your DeFi portfolio. Type "optimize" in the console for suggestions.
            </p>
          </div>
        </TabsContent>
        
        <TabsContent value="protocols" className="space-y-4">
          <div className="flex justify-between items-center mb-2">
            <h3 className="font-medium">Supported Protocols</h3>
            <div className="flex gap-2">
              <Select defaultValue="all">
                <SelectTrigger className="w-[120px] h-8 text-xs">
                  <SelectValue placeholder="Filter by type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="lending">Lending</SelectItem>
                  <SelectItem value="dex">DEX</SelectItem>
                  <SelectItem value="yield">Yield</SelectItem>
                  <SelectItem value="staking">Staking</SelectItem>
                </SelectContent>
              </Select>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleRefreshData}
                disabled={isLoading}
              >
                {isLoading ? (
                  <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                ) : (
                  <RefreshCw className="h-3 w-3 mr-1" />
                )}
                Refresh
              </Button>
            </div>
          </div>
          
          <div className="rounded-md border">
            <div className="grid grid-cols-7 px-4 py-2 border-b bg-muted font-medium text-sm">
              <div>Protocol</div>
              <div>Type</div>
              <div>Chain</div>
              <div>TVL ($B)</div>
              <div>APY</div>
              <div>Risk</div>
              <div>Status</div>
            </div>
            <div className="divide-y">
              {protocols.map((protocol: DeFiProtocol) => (
                <div key={protocol.id} className="grid grid-cols-7 px-4 py-3 text-sm">
                  <div className="flex items-center">
                    <span className="font-medium">{protocol.name}</span>
                    <Badge variant="outline" className="ml-2">{protocol.symbol}</Badge>
                  </div>
                  <div className="capitalize">{protocol.type}</div>
                  <div className="capitalize">{protocol.chain}</div>
                  <div>{protocol.tvl ? protocol.tvl.toFixed(1) : '-'}</div>
                  <div>{protocol.apy ? `${protocol.apy}%` : '-'}</div>
                  <div className="capitalize">{protocol.riskLevel || '-'}</div>
                  <div>
                    <Badge
                      variant={protocol.status === 'active' ? 'default' : 'secondary'}
                      className={protocol.status === 'active' ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-100' : ''}
                    >
                      {protocol.status}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </div>
          
          <div className="rounded-md bg-muted/50 p-3 text-sm flex items-start">
            <AlertCircle className="h-4 w-4 mr-2 mt-0.5 text-amber-500" />
            <p>
              Always research protocols thoroughly before depositing funds. Check audits, 
              TVL history, and team credibility. Type "risks" in the console for risk analysis.
            </p>
          </div>
        </TabsContent>
        
        <TabsContent value="console" className="space-y-4">
          <ScrollArea className="h-[300px] rounded-md border">
            <div className="p-4 space-y-4">
              {messages.map((message: Message) => (
                <div
                  key={message.id}
                  className={`flex gap-3 ${
                    message.role === "user" ? "justify-end" : "justify-start"
                  }`}
                >
                  {message.role === "assistant" && (
                    <Avatar className="flex h-8 w-8 items-center justify-center rounded-full bg-primary">
                      <Terminal className="h-4 w-4 text-primary-foreground" />
                    </Avatar>
                  )}
                  
                  <div
                    className={`rounded-lg px-4 py-2 max-w-[80%] ${
                      message.role === "user"
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted"
                    } ${message.status === "sending" ? "opacity-70" : ""}`}
                  >
                    {message.status === "sending" ? (
                      <div className="flex items-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span>{message.content}</span>
                      </div>
                    ) : (
                      <div className="whitespace-pre-wrap break-words text-sm">
                        {message.content}
                      </div>
                    )}
                  </div>
                  
                  {message.role === "user" && (
                    <Avatar className="flex h-8 w-8 items-center justify-center rounded-full bg-zinc-200 dark:bg-zinc-800">
                      <span className="text-xs font-medium">You</span>
                    </Avatar>
                  )}
                </div>
              ))}
              <div ref={endOfMessagesRef} />
            </div>
          </ScrollArea>
          
          <div className="flex gap-2">
            <Input
              placeholder="Type a DeFi command... (try 'help')"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyPress}
              disabled={isProcessing}
              className="flex-1"
            />
            <Button 
              onClick={handleSend} 
              disabled={isProcessing || !input.trim()}
            >
              {isProcessing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </div>
          
          <div className="text-xs text-muted-foreground flex items-center">
            <Info className="h-3 w-3 mr-1" />
            <span>
              {isOfflineMode 
                ? "Running in offline mode. Limited functionality available." 
                : "Connected to ElizaOS DeFi intelligence engine."}
            </span>
          </div>
        </TabsContent>
      </Tabs>
    </WidgetContainer>
  );
}
