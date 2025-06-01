'use client';

import * as React from 'react';
import { createBrowserClient } from '@/utils/supabase/client';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import {
  Brain,
  BrainCircuit,
  Zap,
  BarChart,
  LineChart,
  Wallet,
  AlertTriangle,
  CheckCircle,
  PlayCircle,
  PauseCircle,
  RefreshCw,
  Settings,
  ChevronDown,
  List,
  Sparkles,
  Clock
} from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { useStrategies } from '@/hooks/use-strategies';
import { AgentStrategySelector } from '@/components/agent/AgentStrategySelector';

interface AgentTradingDashboardProps {
  userId: string;
  agentId?: string;
  farmId?: string;
}

type AgentTradeSignal = {
  id: string;
  agentId: string;
  timestamp: string;
  symbol: string;
  exchange: string;
  signalType: 'buy' | 'sell' | 'hold';
  confidence: number;
  entryPrice?: number;
  targetPrice?: number;
  stopLossPrice?: number;
  status: 'pending' | 'executed' | 'rejected' | 'expired';
  metadata?: Record<string, any>;
  reasoning?: string;
};

export default function AgentTradingDashboard({ userId, agentId, farmId }: AgentTradingDashboardProps) {
  const [agent, setAgent] = React.useState<any>(null);
  const [loading, setLoading] = React.useState(true);
  const [signals, setSignals] = React.useState<AgentTradeSignal[]>([]);
  const [signalsLoading, setSignalsLoading] = React.useState(false);
  const [autoTradeEnabled, setAutoTradeEnabled] = React.useState(false);
  const [agentStatus, setAgentStatus] = React.useState<string>('inactive');
  const [openAgent, setOpenAgent] = React.useState<string | null>(null);
  const [pendingApproval, setPendingApproval] = React.useState<AgentTradeSignal[]>([]);

  const { toast } = useToast();
  
  // Fetch agent data
  React.useEffect(() => {
    if (!agentId) return;
    
    const fetchAgentData = async () => {
      try {
        setLoading(true);
        const supabase = createBrowserClient();
        
        const { data, error } = await supabase
          .from('agents')
          .select('*, agent_health(status, last_active, memory_usage, cpu_usage, active_tasks, error_count)')
          .eq('id', agentId)
          .single();
          
        if (error) throw error;
        
        setAgent(data);
        setAgentStatus(data.agent_health?.status || 'inactive');
      } catch (error) {
        console.error('Error fetching agent data:', error);
        toast({
          title: 'Error',
          description: 'Failed to load agent data.',
          variant: 'destructive'
        });
      } finally {
        setLoading(false);
      }
    };
    
    fetchAgentData();
  }, [agentId]);
  
  // Fetch trade signals
  React.useEffect(() => {
    if (!agentId) return;
    
    const fetchSignals = async () => {
      try {
        setSignalsLoading(true);
        
        // In a real implementation, this would fetch from the database
        // Mock data for now
        const mockSignals: AgentTradeSignal[] = [
          {
            id: 'sig-1',
            agentId,
            timestamp: new Date(Date.now() - 1000 * 60 * 30).toISOString(), // 30 mins ago
            symbol: 'BTC/USD',
            exchange: 'coinbase',
            signalType: 'buy',
            confidence: 0.85,
            entryPrice: 42500,
            targetPrice: 43500,
            stopLossPrice: 42000,
            status: 'executed',
            reasoning: 'Strong momentum detected with increasing volume and positive MACD crossover.'
          },
          {
            id: 'sig-2',
            agentId,
            timestamp: new Date(Date.now() - 1000 * 60 * 120).toISOString(), // 2 hours ago
            symbol: 'ETH/USD',
            exchange: 'binance',
            signalType: 'sell',
            confidence: 0.72,
            entryPrice: 2850,
            targetPrice: 2750,
            stopLossPrice: 2900,
            status: 'executed',
            reasoning: 'Bearish divergence on RSI with resistance at key level. Volume decreasing with price increase.'
          },
          {
            id: 'sig-3',
            agentId,
            timestamp: new Date(Date.now() - 1000 * 60 * 15).toISOString(), // 15 mins ago
            symbol: 'SOL/USD',
            exchange: 'kraken',
            signalType: 'buy',
            confidence: 0.68,
            entryPrice: 150,
            targetPrice: 160,
            stopLossPrice: 145,
            status: 'pending',
            reasoning: 'Support level holding with increased buying pressure. Short-term oversold conditions.'
          }
        ];
        
        setSignals(mockSignals);
        setPendingApproval(mockSignals.filter(s => s.status === 'pending'));
      } catch (error) {
        console.error('Error fetching agent signals:', error);
        toast({
          title: 'Error',
          description: 'Failed to load trading signals.',
          variant: 'destructive'
        });
      } finally {
        setSignalsLoading(false);
      }
    };
    
    fetchSignals();
    
    // Poll for signals every 60 seconds
    const interval = setInterval(fetchSignals, 60000);
    
    return () => clearInterval(interval);
  }, [agentId]);
  
  // Toggle agent status
  const toggleAgentStatus = async () => {
    try {
      // In a real implementation, this would update the database
      setAgentStatus(agentStatus === 'active' ? 'inactive' : 'active');
      
      toast({
        title: agentStatus === 'active' ? 'Agent Paused' : 'Agent Activated',
        description: agentStatus === 'active' 
          ? 'The trading agent has been paused and will no longer generate signals.'
          : 'The trading agent has been activated and will begin analyzing the market.',
        variant: 'default'
      });
    } catch (error) {
      console.error('Error toggling agent status:', error);
      toast({
        title: 'Error',
        description: 'Failed to update agent status.',
        variant: 'destructive'
      });
    }
  };
  
  // Handle signal approval/rejection
  const handleSignalAction = async (signalId: string, action: 'approve' | 'reject') => {
    try {
      // In a real implementation, this would update the database
      const updatedSignals = signals.map((signal: AgentTradeSignal) => 
        signal.id === signalId
          ? { ...signal, status: action === 'approve' ? 'executed' : 'rejected' }
          : signal
      );
      
      setSignals(updatedSignals);
      setPendingApproval(pendingApproval.filter((s: AgentTradeSignal) => s.id !== signalId));
      
      toast({
        title: action === 'approve' ? 'Signal Approved' : 'Signal Rejected',
        description: action === 'approve'
          ? 'The trading signal has been approved and will be executed.'
          : 'The trading signal has been rejected and will not be executed.',
        variant: action === 'approve' ? 'default' : 'secondary'
      });
    } catch (error) {
      console.error('Error handling signal action:', error);
      toast({
        title: 'Error',
        description: 'Failed to process your request.',
        variant: 'destructive'
      });
    }
  };
  
  // Render agent status indicator
  const renderAgentStatus = () => {
    return (
      <div className="flex items-center space-x-2">
        <div
          className={`w-3 h-3 rounded-full ${
            agentStatus === 'active' ? 'bg-green-500' : 
            agentStatus === 'warning' ? 'bg-yellow-500' : 
            agentStatus === 'error' ? 'bg-red-500' : 'bg-gray-500'
          }`}
        />
        <span className="text-sm font-medium">
          {agentStatus === 'active' ? 'Active' : 
           agentStatus === 'warning' ? 'Warning' : 
           agentStatus === 'error' ? 'Error' : 'Inactive'}
        </span>
      </div>
    );
  };

  // Render trade signals
  const renderSignals = () => {
    if (signalsLoading) {
      return (
        <div className="flex items-center justify-center h-64">
          <RefreshCw className="h-5 w-5 animate-spin mr-2" />
          <span>Loading signals...</span>
        </div>
      );
    }
    
    if (signals.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center h-64 text-center">
          <AlertTriangle className="h-8 w-8 text-muted-foreground mb-2" />
          <h3 className="text-lg font-medium mb-1">No Trading Signals</h3>
          <p className="text-sm text-muted-foreground max-w-md">
            This agent hasn't generated any trading signals yet. Make sure the agent is active and has a strategy assigned.
          </p>
        </div>
      );
    }
    
    return (
      <div className="space-y-4">
        {signals.map((signal: AgentTradeSignal) => (
          <Card key={signal.id} className={`overflow-hidden ${signal.status === 'pending' ? 'border-yellow-500/50' : ''}`}>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Badge variant={signal.signalType === 'buy' ? 'default' : 'destructive'}>
                    {signal.signalType.toUpperCase()}
                  </Badge>
                  <CardTitle className="text-base">{signal.symbol}</CardTitle>
                  <Badge variant="outline">{signal.exchange}</Badge>
                </div>
                <Badge variant={
                  signal.status === 'executed' ? 'default' : 
                  signal.status === 'rejected' ? 'destructive' : 
                  signal.status === 'expired' ? 'secondary' : 'outline'
                }>
                  {signal.status}
                </Badge>
              </div>
              <CardDescription className="flex items-center">
                <Clock className="h-3 w-3 mr-1" />
                {formatDistanceToNow(new Date(signal.timestamp), { addSuffix: true })}
                <span className="mx-1">•</span>
                Confidence: {(signal.confidence * 100).toFixed(0)}%
              </CardDescription>
            </CardHeader>
            <CardContent className="pb-2">
              <div className="grid grid-cols-3 gap-2 mb-3 text-sm">
                <div>
                  <div className="text-muted-foreground">Entry</div>
                  <div className="font-medium">${signal.entryPrice?.toLocaleString()}</div>
                </div>
                <div>
                  <div className="text-muted-foreground">Target</div>
                  <div className="font-medium">${signal.targetPrice?.toLocaleString()}</div>
                </div>
                <div>
                  <div className="text-muted-foreground">Stop</div>
                  <div className="font-medium">${signal.stopLossPrice?.toLocaleString()}</div>
                </div>
              </div>
              
              <div className="text-sm text-muted-foreground border-l-2 border-muted-foreground/20 pl-2 italic">
                {signal.reasoning}
              </div>
            </CardContent>
            {signal.status === 'pending' && (
              <CardFooter className="pt-0 flex justify-end space-x-2">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => handleSignalAction(signal.id, 'reject')}
                >
                  Reject
                </Button>
                <Button 
                  size="sm"
                  onClick={() => handleSignalAction(signal.id, 'approve')}
                >
                  Approve & Execute
                </Button>
              </CardFooter>
            )}
          </Card>
        ))}
      </div>
    );
  };

  // Render agent performance metrics
  const renderPerformanceMetrics = () => {
    return (
      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Win Rate</CardTitle>
            <CardDescription>Last 30 days</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">68%</div>
            <div className="flex items-center text-xs text-muted-foreground mt-1">
              <LineChart className="h-3 w-3 mr-1" />
              <span>15 wins, 7 losses</span>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Profit/Loss</CardTitle>
            <CardDescription>Last 30 days</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-500">+9.7%</div>
            <div className="flex items-center text-xs text-muted-foreground mt-1">
              <BarChart className="h-3 w-3 mr-1" />
              <span>$2,450 realized</span>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Average Holding</CardTitle>
            <CardDescription>Time in trades</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">2.4d</div>
            <div className="flex items-center text-xs text-muted-foreground mt-1">
              <Clock className="h-3 w-3 mr-1" />
              <span>Min: 4h, Max: 5d</span>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Signal Accuracy</CardTitle>
            <CardDescription>Prediction rate</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">76%</div>
            <div className="flex items-center text-xs text-muted-foreground mt-1">
              <Sparkles className="h-3 w-3 mr-1" />
              <span>High confidence</span>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  };

  // Render agent configuration
  const renderAgentConfig = () => {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div className="space-y-1">
            <h3 className="font-medium">Auto-Trading</h3>
            <p className="text-sm text-muted-foreground">
              Automatically execute trades based on agent signals
            </p>
          </div>
          <Switch
            checked={autoTradeEnabled}
            onCheckedChange={setAutoTradeEnabled}
          />
        </div>
        
        <div className="p-4 border rounded-md space-y-4">
          <h3 className="font-medium">Trade Execution Settings</h3>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="minConfidence">Minimum Confidence</Label>
              <Select defaultValue="0.7">
                <SelectTrigger id="minConfidence">
                  <SelectValue placeholder="Select confidence level" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0.5">50%</SelectItem>
                  <SelectItem value="0.6">60%</SelectItem>
                  <SelectItem value="0.7">70%</SelectItem>
                  <SelectItem value="0.8">80%</SelectItem>
                  <SelectItem value="0.9">90%</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="maxTradesPerDay">Max Trades/Day</Label>
              <Select defaultValue="5">
                <SelectTrigger id="maxTradesPerDay">
                  <SelectValue placeholder="Select max trades" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1</SelectItem>
                  <SelectItem value="3">3</SelectItem>
                  <SelectItem value="5">5</SelectItem>
                  <SelectItem value="10">10</SelectItem>
                  <SelectItem value="unlimited">Unlimited</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="maxPositionSize">Max Position Size</Label>
              <Select defaultValue="10">
                <SelectTrigger id="maxPositionSize">
                  <SelectValue placeholder="Select position size" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="5">5% of portfolio</SelectItem>
                  <SelectItem value="10">10% of portfolio</SelectItem>
                  <SelectItem value="20">20% of portfolio</SelectItem>
                  <SelectItem value="50">50% of portfolio</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="riskLevel">Risk Level</Label>
              <Select defaultValue="medium">
                <SelectTrigger id="riskLevel">
                  <SelectValue placeholder="Select risk level" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
        
        <Button className="w-full">
          Save Configuration
        </Button>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <BrainCircuit className="h-6 w-6 text-blue-500" />
          <div>
            <h2 className="text-xl font-semibold">{agent?.name || 'Trading Agent'}</h2>
            <div className="flex items-center space-x-2 text-sm text-muted-foreground">
              {renderAgentStatus()}
              {agent?.type && (
                <>
                  <span>•</span>
                  <Badge variant="outline">{agent.type}</Badge>
                </>
              )}
            </div>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          {pendingApproval.length > 0 && (
            <Button variant="outline" size="sm" className="border-yellow-500/50 text-yellow-500">
              <AlertTriangle className="h-4 w-4 mr-2" />
              {pendingApproval.length} Pending Approval
            </Button>
          )}
          
          <Button
            variant={agentStatus === 'active' ? 'outline' : 'default'}
            size="sm"
            onClick={toggleAgentStatus}
          >
            {agentStatus === 'active' ? (
              <>
                <PauseCircle className="h-4 w-4 mr-2" />
                Pause Agent
              </>
            ) : (
              <>
                <PlayCircle className="h-4 w-4 mr-2" />
                Activate Agent
              </>
            )}
          </Button>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <Settings className="h-4 w-4 mr-2" />
                <span>Options</span>
                <ChevronDown className="h-4 w-4 ml-1" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Agent Actions</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem>
                <RefreshCw className="h-4 w-4 mr-2" />
                <span>Refresh Status</span>
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Brain className="h-4 w-4 mr-2" />
                <span>Update Agent Model</span>
              </DropdownMenuItem>
              <DropdownMenuItem>
                <List className="h-4 w-4 mr-2" />
                <span>View Agent Logs</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
      
      {autoTradeEnabled && (
        <Alert className="bg-green-50 border-green-500 dark:bg-green-950 dark:border-green-800">
          <CheckCircle className="h-4 w-4 text-green-500" />
          <AlertTitle>Auto-Trading Enabled</AlertTitle>
          <AlertDescription>
            This agent will automatically execute trades based on its signals without requiring manual approval.
          </AlertDescription>
        </Alert>
      )}
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Tabs defaultValue="signals" className="w-full">
            <TabsList>
              <TabsTrigger value="signals">Signals & Recommendations</TabsTrigger>
              <TabsTrigger value="performance">Performance</TabsTrigger>
              <TabsTrigger value="configuration">Configuration</TabsTrigger>
            </TabsList>
            
            <TabsContent value="signals" className="mt-4 space-y-4">
              {renderSignals()}
            </TabsContent>
            
            <TabsContent value="performance" className="mt-4 space-y-4">
              {renderPerformanceMetrics()}
            </TabsContent>
            
            <TabsContent value="configuration" className="mt-4">
              {renderAgentConfig()}
            </TabsContent>
          </Tabs>
        </div>
        
        <div>
          <AgentStrategySelector
            agentId={agentId || ''}
            farmId={farmId || ''}
            onStrategyAssigned={(strategyId, agentId) => {
              toast({
                title: 'Strategy Assigned',
                description: 'The trading strategy has been successfully assigned to this agent.',
                variant: 'default'
              });
            }}
          />
        </div>
      </div>
    </div>
  );
}
