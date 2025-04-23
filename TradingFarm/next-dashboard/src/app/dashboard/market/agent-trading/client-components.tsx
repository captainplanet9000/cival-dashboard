'use client';

import * as React from 'react';
import { createBrowserClient } from '@/utils/supabase/client';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import AgentList from '@/components/agent/AgentList';
import AgentTradingDashboard from '@/components/agent/AgentTradingDashboard';
import { MarketWatchlist } from '@/components/market/market-watchlist';
import { OrderManagement } from '@/components/market/order-management';
import { ExecutionMonitor } from '@/components/market/execution-monitor';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/components/ui/use-toast';
import {
  Brain,
  BrainCircuit,
  Plus,
  RefreshCw,
  Settings,
  PlusCircle,
  ArrowRight,
  BarChart3,
  LineChart,
  TrendingUp
} from 'lucide-react';

interface AgentTradingPageClientProps {
  userId: string;
}

export function AgentTradingPageClient({ userId }: AgentTradingPageClientProps) {
  const [farms, setFarms] = React.useState<any[]>([]);
  const [agents, setAgents] = React.useState<any[]>([]);
  const [selectedFarm, setSelectedFarm] = React.useState<string | null>(null);
  const [selectedAgent, setSelectedAgent] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [configuring, setConfiguring] = React.useState(false);
  const [selectedSymbol, setSelectedSymbol] = React.useState<string | null>(null);
  const [selectedExchange, setSelectedExchange] = React.useState<string | null>(null);
  const [currentPrice, setCurrentPrice] = React.useState<number | null>(null);

  const { toast } = useToast();

  // Fetch farms on load
  React.useEffect(() => {
    const fetchFarms = async () => {
      try {
        setLoading(true);
        const supabase = createBrowserClient();
        
        const { data, error } = await supabase
          .from('farms')
          .select('*')
          .eq('user_id', userId)
          .order('created_at', { ascending: false });
          
        if (error) throw error;
        
        setFarms(data || []);
        
        // Set first farm as selected if available
        if (data && data.length > 0) {
          setSelectedFarm(data[0].id);
        }
      } catch (error) {
        console.error('Error fetching farms:', error);
        toast({
          title: 'Error',
          description: 'Failed to load farms data.',
          variant: 'destructive'
        });
      } finally {
        setLoading(false);
      }
    };
    
    fetchFarms();
  }, [userId]);

  // Handle selecting an agent
  const handleSelectAgent = (agentId: string) => {
    setSelectedAgent(agentId);
    
    // For demonstration purposes, show toast
    toast({
      title: 'Agent Selected',
      description: 'Trading agent has been selected for configuration.',
      variant: 'default'
    });
  };

  // Handle symbol selection from watchlist
  const handleSymbolSelect = (symbol: string, exchange: string, price: number | null) => {
    setSelectedSymbol(symbol);
    setSelectedExchange(exchange);
    setCurrentPrice(price);
    
    // For demonstration purposes
    toast({
      title: 'Symbol Selected',
      description: `${symbol} selected for agent trading analysis.`,
      variant: 'default'
    });
  };

  // Render farms selector
  const renderFarmsSelector = () => {
    if (loading) {
      return <Skeleton className="h-10 w-full" />;
    }
    
    if (farms.length === 0) {
      return (
        <div className="p-4 text-center">
          <p className="text-muted-foreground">No farms found. Create a farm to get started.</p>
          <Button className="mt-2">
            <PlusCircle className="h-4 w-4 mr-2" />
            Create Farm
          </Button>
        </div>
      );
    }
    
    return (
      <div className="flex items-center space-x-2">
        <Select
          value={selectedFarm || undefined}
          onValueChange={(value: string) => setSelectedFarm(value)}
        >
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Select Farm" />
          </SelectTrigger>
          <SelectContent>
            {farms.map((farm: { id: string; name: string }) => (
              <SelectItem key={farm.id} value={farm.id}>
                {farm.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        
        <Button variant="outline">
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>
    );
  };

  // Filter agents by farm
  const farmAgents = React.useMemo(() => {
    if (!selectedFarm) return [];
    return agents.filter((agent: any) => agent.farm_id === selectedFarm);
  }, [agents, selectedFarm]);

  // Render page content based on selection state
  const renderContent = () => {
    if (!selectedFarm) {
      return (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <Brain className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-xl font-medium mb-2">Select a Farm to Begin</h3>
          <p className="text-muted-foreground max-w-md mb-4">
            Select a farm to view its trading agents or create a new farm if you haven't done so already.
          </p>
          <Button>
            <PlusCircle className="h-4 w-4 mr-2" />
            Create New Farm
          </Button>
        </div>
      );
    }
    
    if (!selectedAgent) {
      return (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium">Trading Agents</h3>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              New Trading Agent
            </Button>
          </div>
          
          <AgentList
            farmId={selectedFarm}
            onSelectAgent={handleSelectAgent}
          />
          
          <div className="p-6 bg-muted/30 rounded-lg text-center">
            <BrainCircuit className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
            <h3 className="text-lg font-medium mb-2">Select an Agent to Configure</h3>
            <p className="text-sm text-muted-foreground max-w-md mx-auto">
              Choose a trading agent from the list above to view its details, assign trading strategies, and configure its parameters.
            </p>
          </div>
        </div>
      );
    }
    
    return (
      <AgentTradingDashboard 
        userId={userId}
        agentId={selectedAgent}
        farmId={selectedFarm}
      />
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h3 className="text-lg font-medium mb-1">Intelligent Trading Dashboard</h3>
          <p className="text-sm text-muted-foreground">
            Configure and monitor AI trading agents for automated market analysis
          </p>
        </div>
        
        {renderFarmsSelector()}
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2">
          {renderContent()}
        </div>
        
        <div className="space-y-6">
          <MarketWatchlist 
            userId={userId}
            className="h-auto"
            onSymbolSelect={handleSymbolSelect}
          />
          
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center justify-between">
                <span>Market Summary</span>
                <Badge variant="outline" className="text-xs font-normal">
                  <RefreshCw className="h-3 w-3 mr-1" />
                  Live
                </Badge>
              </CardTitle>
              <CardDescription>Current market conditions</CardDescription>
            </CardHeader>
            <CardContent className="pb-2">
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="space-y-1">
                    <div className="text-muted-foreground">BTC/USD</div>
                    <div className="font-medium text-lg">$45,230.65</div>
                    <Badge variant="outline" className="text-xs bg-green-50 text-green-600">+2.4%</Badge>
                  </div>
                  
                  <div className="space-y-1">
                    <div className="text-muted-foreground">ETH/USD</div>
                    <div className="font-medium text-lg">$2,895.30</div>
                    <Badge variant="outline" className="text-xs bg-red-50 text-red-600">-0.8%</Badge>
                  </div>
                  
                  <div className="space-y-1">
                    <div className="text-muted-foreground">Fear & Greed</div>
                    <div className="font-medium text-lg">76</div>
                    <Badge variant="outline" className="text-xs">Greed</Badge>
                  </div>
                  
                  <div className="space-y-1">
                    <div className="text-muted-foreground">Market Trend</div>
                    <div className="font-medium text-lg">Bullish</div>
                    <Badge variant="outline" className="text-xs">Mid-term</Badge>
                  </div>
                </div>
                
                <Separator />
                
                <div className="space-y-2">
                  <div className="text-sm font-medium">Market Sentiment Analysis</div>
                  <div className="flex items-center space-x-1 text-xs">
                    <span className="font-medium">Bullish signals:</span>
                    <span className="text-muted-foreground">64%</span>
                    <TrendingUp className="h-3 w-3 text-green-500 ml-1" />
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div className="h-full bg-green-500 rounded-full" style={{ width: '64%' }}></div>
                  </div>
                </div>
              </div>
            </CardContent>
            <CardFooter>
              <Button variant="outline" size="sm" className="w-full text-xs">
                <BarChart3 className="h-3 w-3 mr-1" />
                View Detailed Analysis
              </Button>
            </CardFooter>
          </Card>
          
          {selectedFarm && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle>Smart Insights</CardTitle>
                <CardDescription>AI-generated market insights</CardDescription>
              </CardHeader>
              <CardContent className="pb-3 text-sm space-y-4">
                <div className="border-l-2 border-blue-500 pl-3 py-1">
                  <div className="font-medium">Momentum Analysis</div>
                  <p className="text-muted-foreground mt-1">
                    Bitcoin showing strong momentum with increasing volume. RSI indicates room for further upside in the short term.
                  </p>
                </div>
                
                <div className="border-l-2 border-yellow-500 pl-3 py-1">
                  <div className="font-medium">Correlation Alert</div>
                  <p className="text-muted-foreground mt-1">
                    ETH/BTC correlation weakening, suggesting potential altcoin rotation and diversification opportunities.
                  </p>
                </div>
                
                <div className="border-l-2 border-green-500 pl-3 py-1">
                  <div className="font-medium">Technical Pattern</div>
                  <p className="text-muted-foreground mt-1">
                    SOL forming a bullish flag pattern after recent breakout. Target price zone: $145-155 in next 48 hours.
                  </p>
                </div>
              </CardContent>
              <CardFooter>
                <Button variant="outline" size="sm" className="w-full text-xs">
                  <BrainCircuit className="h-3 w-3 mr-1" />
                  Generate Custom Insight
                </Button>
              </CardFooter>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
