"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AIAgentV2 } from '@/context/ai-agent-v2-context';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/components/ui/use-toast';
import { useSocket } from '@/providers/socket-provider';
import { TRADING_EVENTS } from '@/constants/socket-events';
import { 
  Plus, 
  ArrowUpRight, 
  ArrowDownRight, 
  Bot, 
  Activity, 
  LineChart, 
  Settings, 
  Play, 
  Pause, 
  AlertTriangle, 
  Info
} from 'lucide-react';

export default function AgentsPage() {
  const router = useRouter();
  const { socket } = useSocket();
  const { toast } = useToast();
  const [agents, setAgents] = useState<AIAgentV2[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all');
  
  useEffect(() => {
    fetchAgents();
    
    // Set up socket listeners for agent updates
    if (socket) {
      socket.on(TRADING_EVENTS.AGENT_STATUS, handleAgentStatusUpdate);
      socket.on(TRADING_EVENTS.AGENT_PERFORMANCE, handleAgentPerformanceUpdate);
    }
    
    return () => {
      if (socket) {
        socket.off(TRADING_EVENTS.AGENT_STATUS, handleAgentStatusUpdate);
        socket.off(TRADING_EVENTS.AGENT_PERFORMANCE, handleAgentPerformanceUpdate);
      }
    };
  }, [socket]);
  
  const fetchAgents = async () => {
    try {
      setLoading(true);
      // In a real app, we would fetch from API
      // const response = await fetch('/api/agents');
      // const data = await response.json();
      // setAgents(data);
      
      // For demo purposes, creating some sample data
      const sampleAgents: AIAgentV2[] = [
        {
          id: 'agent-001',
          name: 'Trend Navigator',
          status: 'active',
          specialization: ['trend_following'],
          performance: 15.8,
          settings: {
            automation_level: 'full',
            risk_level: 3,
            max_drawdown: 15,
            timeframes: ['15m', '1h', '4h'],
            indicators: ['RSI', 'MACD', 'Moving Averages'],
            strategyType: 'trend_following'
          },
          instructions: ['Focus on strong trends only']
        },
        {
          id: 'agent-002',
          name: 'Swing Master',
          status: 'active',
          specialization: ['swing_trading'],
          performance: 8.2,
          settings: {
            automation_level: 'semi',
            risk_level: 2,
            max_drawdown: 10,
            timeframes: ['4h', '1d'],
            indicators: ['Bollinger Bands', 'Stochastic', 'Support/Resistance'],
            strategyType: 'swing_trading'
          },
          instructions: ['Trade price reversals at key levels']
        },
        {
          id: 'agent-003',
          name: 'Scalping Pro',
          status: 'paused',
          specialization: ['scalping'],
          performance: -2.4,
          settings: {
            automation_level: 'full',
            risk_level: 4,
            max_drawdown: 5,
            timeframes: ['1m', '5m', '15m'],
            indicators: ['EMA', 'Volume', 'Price Action'],
            strategyType: 'scalping'
          },
          instructions: ['Multiple quick trades with small gains']
        }
      ];
      
      setAgents(sampleAgents);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching agents:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch agents.',
        variant: 'destructive'
      });
      setLoading(false);
    }
  };
  
  const handleAgentStatusUpdate = (data: { agentId: string; status: string }) => {
    setAgents(prev => prev.map(agent => 
      agent.id === data.agentId ? { ...agent, status: data.status } : agent
    ));
  };
  
  const handleAgentPerformanceUpdate = (data: { agentId: string; performance: number }) => {
    setAgents(prev => prev.map(agent => 
      agent.id === data.agentId ? { ...agent, performance: data.performance } : agent
    ));
  };
  
  const filteredAgents = agents.filter(agent => {
    if (activeTab === 'all') return true;
    if (activeTab === 'active') return agent.status === 'active';
    if (activeTab === 'paused') return agent.status === 'paused';
    if (activeTab === 'offline') return agent.status === 'offline';
    return true;
  });
  
  const navigateToCreateAgent = () => {
    router.push('/agents/create');
  };
  
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-500';
      case 'paused': return 'bg-yellow-500';
      case 'offline': return 'bg-gray-500';
      default: return 'bg-gray-500';
    }
  };
  
  const getPerformanceBadgeColor = (performance: number) => {
    if (performance > 0) return 'bg-green-100 text-green-800 border-green-200';
    if (performance < 0) return 'bg-red-100 text-red-800 border-red-200';
    return 'bg-gray-100 text-gray-800 border-gray-200';
  };
  
  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Trading Agents</h1>
        <Button onClick={navigateToCreateAgent}>
          <Plus className="mr-2 h-4 w-4" />
          Create Agent
        </Button>
      </div>
      
      <Tabs defaultValue="all" value={activeTab} onValueChange={setActiveTab}>
        <div className="flex items-center justify-between">
          <TabsList>
            <TabsTrigger value="all">All Agents</TabsTrigger>
            <TabsTrigger value="active">Active</TabsTrigger>
            <TabsTrigger value="paused">Paused</TabsTrigger>
            <TabsTrigger value="offline">Offline</TabsTrigger>
          </TabsList>
          
          <Button variant="outline" onClick={fetchAgents} disabled={loading}>
            <Activity className="mr-2 h-4 w-4" />
            Refresh
          </Button>
        </div>
        
        <TabsContent value={activeTab} className="mt-6">
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3].map(i => (
                <Card key={i}>
                  <CardHeader className="pb-2">
                    <Skeleton className="h-5 w-32" />
                    <Skeleton className="h-4 w-24" />
                  </CardHeader>
                  <CardContent>
                    <Skeleton className="h-16 w-full" />
                  </CardContent>
                  <CardFooter>
                    <Skeleton className="h-9 w-full" />
                  </CardFooter>
                </Card>
              ))}
            </div>
          ) : filteredAgents.length === 0 ? (
            <div className="text-center py-10">
              <Info className="h-10 w-10 mx-auto text-muted-foreground" />
              <h3 className="mt-2 text-lg font-medium">No agents found</h3>
              <p className="text-muted-foreground">
                {activeTab === 'all' 
                  ? "You haven't created any agents yet. Create your first agent to start trading."
                  : `You don't have any ${activeTab} agents.`}
              </p>
              <Button onClick={navigateToCreateAgent} className="mt-4">
                <Plus className="mr-2 h-4 w-4" />
                Create Agent
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredAgents.map(agent => (
                <Card key={agent.id} className="overflow-hidden relative">
                  <div className={`absolute w-2 h-full left-0 top-0 ${getStatusColor(agent.status)}`} />
                  
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center">
                        <Avatar className="h-9 w-9 mr-2">
                          <AvatarFallback>{agent.name.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <div>
                          <CardTitle className="text-base">{agent.name}</CardTitle>
                          <CardDescription className="text-xs capitalize">
                            {agent.specialization.map(spec => spec.replace(/_/g, ' ')).join(', ')}
                          </CardDescription>
                        </div>
                      </div>
                      
                      <Badge variant={agent.status === 'active' ? 'default' : 'outline'} className="capitalize">
                        {agent.status}
                      </Badge>
                    </div>
                  </CardHeader>
                  
                  <CardContent>
                    <div className="grid grid-cols-2 gap-2 my-2">
                      <div className="text-xs text-muted-foreground">Performance</div>
                      <div className={`text-xs font-medium px-2 py-1 rounded border ${getPerformanceBadgeColor(agent.performance || 0)}`}>
                        {agent.performance !== undefined ? (
                          <>
                            {agent.performance > 0 ? '+' : ''}{agent.performance}%
                            {agent.performance > 0 ? 
                              <ArrowUpRight className="h-3 w-3 inline ml-1" /> : 
                              agent.performance < 0 ? 
                              <ArrowDownRight className="h-3 w-3 inline ml-1" /> : 
                              null}
                          </>
                        ) : '0.00%'}
                      </div>
                      
                      <div className="text-xs text-muted-foreground">Strategy</div>
                      <div className="text-xs capitalize">
                        {agent.settings?.strategyType?.replace(/_/g, ' ') || 'Custom'}
                      </div>
                      
                      <div className="text-xs text-muted-foreground">Risk Level</div>
                      <div className="text-xs">
                        {agent.settings?.risk_level || agent.settings?.riskLevel || '-'}
                      </div>
                    </div>
                  </CardContent>
                  
                  <CardFooter className="flex justify-between pt-1">
                    <Button asChild variant="ghost" size="sm">
                      <Link href={`/agents/${agent.id}`}>
                        <Bot className="mr-2 h-4 w-4" />
                        Details
                      </Link>
                    </Button>
                    
                    <div className="flex gap-2">
                      <Button variant="outline" size="icon">
                        <LineChart className="h-4 w-4" />
                      </Button>
                      <Button variant="outline" size="icon">
                        <Settings className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant={agent.status === 'active' ? 'outline' : 'default'} 
                        size="icon"
                      >
                        {agent.status === 'active' ? (
                          <Pause className="h-4 w-4" />
                        ) : (
                          <Play className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </CardFooter>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
