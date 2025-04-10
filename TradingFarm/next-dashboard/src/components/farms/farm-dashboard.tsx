'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { 
  ArrowUpDown, 
  Cog, 
  BarChart2, 
  User, 
  Users, 
  Bot, 
  BrainCircuit, 
  Wrench, 
  LineChart, 
  Network, 
  Clock, 
  Calendar,
  Target,
  ArrowRight,
  ListChecks,
  TrendingUp,
  RefreshCw
} from 'lucide-react';
import Link from 'next/link';
import { Farm, FarmStatusSummary } from '@/services/farm-service';
import { AgentCollaborationManager } from '@/components/agents/agent-collaboration-manager';
import { FarmPerformanceCard } from '@/components/farms/farm-performance-card';
import { FarmAgentsTable } from '@/components/farms/farm-agents-table';
import { FarmGoalsSection } from '@/components/farms/farm-goals-section';
import { FarmPerformanceChart } from '@/components/charts/farm-performance-chart';
import { FarmPerformancePreview } from '@/components/farms/farm-performance-preview';
import { AssetAllocationChart } from '@/components/charts/asset-allocation-chart';
import { GoalProgressChart } from '@/components/charts/goal-progress-chart';
import { GoalProgressPreview } from '@/components/goals/goal-progress-preview';
import { format, subDays } from 'date-fns';

interface FarmDashboardProps {
  farm: Farm;
  statusSummary?: FarmStatusSummary | null;
  agents?: any[];
  elizaAgents?: any[];
  goals?: any[];
}

export function FarmDashboard({ farm, statusSummary, agents = [], elizaAgents = [], goals = [] }: FarmDashboardProps) {
  const [activeTab, setActiveTab] = useState('overview');
  const [isLoading, setIsLoading] = useState(false);
  const allAgents = [...(agents || []), ...(elizaAgents || [])];
  
  // Format status summary counts
  const goalsCounts = {
    total: statusSummary?.goals_total || 0,
    completed: statusSummary?.goals_completed || 0,
    inProgress: statusSummary?.goals_in_progress || 0,
    notStarted: statusSummary?.goals_not_started || 0,
  };
  
  const agentsCounts = {
    total: statusSummary?.agents_total || 0,
    active: statusSummary?.agents_active || 0,
    standard: agents?.length || 0,
    eliza: elizaAgents?.length || 0
  };

  // Generate sample performance data for demo
  const generatePerformanceData = () => {
    const dates = [];
    const values = [];
    const today = new Date();
    let value = 10000;
    
    for (let i = 30; i >= 0; i--) {
      const date = subDays(today, i);
      dates.push(format(date, 'yyyy-MM-dd'));
      
      // Generate somewhat realistic price movement
      const changePercent = (Math.random() * 3 - 1) / 100; // -1% to 2% daily change
      value = value * (1 + changePercent);
      values.push(value);
    }
    
    return { dates, values };
  };
  
  // Sample asset allocation
  const assetAllocation = [
    { name: 'Bitcoin (BTC)', value: 4500 },
    { name: 'Ethereum (ETH)', value: 3200 },
    { name: 'USD Stablecoins', value: 2800 },
    { name: 'Solana (SOL)', value: 1200 },
    { name: 'Other Tokens', value: 1300 },
  ];
  
  // Farm metrics for display
  const farmMetrics = {
    roi: 0.078, // 7.8%
    winRate: 0.65, // 65%
    totalTrades: 145,
    profitTrades: 94,
    lossTrades: 51,
    performance_data: farm.performance_data || generatePerformanceData(),
  };
  
  const handleRefresh = () => {
    setIsLoading(true);
    // Simulate refresh
    setTimeout(() => {
      setIsLoading(false);
    }, 1000);
  };

  return (
    <div className="space-y-6">
      {/* Farm Header with Stats */}
      <div className="bg-white rounded-lg shadow-sm p-6 border">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">{farm.name}</h1>
            <p className="text-sm text-muted-foreground mt-1">{farm.description}</p>
            
            <div className="mt-2 flex flex-wrap gap-2">
              <Badge variant="outline" className="bg-primary/5">
                <Network className="h-3 w-3 mr-1" />
                {farm.exchange || 'No Exchange'}
              </Badge>
              
              <Badge variant={farm.status === 'active' ? 'default' : 'secondary'}>
                {farm.status === 'active' ? 'Active' : farm.status || 'Inactive'}
              </Badge>
              
              <Badge variant="outline" className="bg-primary/5">
                <Clock className="h-3 w-3 mr-1" />
                Created {new Date(farm.created_at).toLocaleDateString()}
              </Badge>
            </div>
          </div>
          
          <div className="flex gap-2">
            <Button variant="outline" size="sm" asChild>
              <Link href={`/dashboard/farms/${farm.id}/edit`}>
                <Cog className="h-4 w-4 mr-1" />
                Settings
              </Link>
            </Button>
            
            <Button variant="outline" size="sm" asChild>
              <Link href={`/dashboard/farms/${farm.id}/performance`}>
                <BarChart2 className="h-4 w-4 mr-1" />
                Performance
              </Link>
            </Button>
          </div>
        </div>
        
        {/* Quick Stats Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
          <StatCard
            title="Agents"
            value={agentsCounts.total}
            subtext={`${agentsCounts.active} active`}
            icon={<Bot className="h-5 w-5 text-primary" />}
          />
          
          <StatCard
            title="Goals"
            value={goalsCounts.total}
            subtext={`${goalsCounts.completed} completed`}
            icon={<Target className="h-5 w-5 text-primary" />}
          />
          
          <StatCard
            title="Win Rate"
            value={farm.performance_metrics?.win_rate 
              ? `${(farm.performance_metrics.win_rate * 100).toFixed(1)}%` 
              : 'N/A'}
            subtext="Overall farm performance"
            icon={<BarChart2 className="h-5 w-5 text-primary" />}
          />
          
          <StatCard
            title="Profit Factor"
            value={farm.performance_metrics?.profit_factor?.toFixed(2) || 'N/A'}
            subtext="Wins ÷ Losses"
            icon={<LineChart className="h-5 w-5 text-primary" />}
          />
        </div>
      </div>
      
      {/* Main Content Tabs */}
      <Tabs defaultValue="overview" value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="bg-card">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="agents">Agents ({allAgents.length})</TabsTrigger>
          <TabsTrigger value="goals">Goals ({goals.length})</TabsTrigger>
          <TabsTrigger value="collaborations">Collaborations</TabsTrigger>
          <TabsTrigger value="tools">Tools & Resources</TabsTrigger>
        </TabsList>
        
        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Performance Summary */}
            <Card className="md:col-span-2">
              <CardHeader className="pb-2">
                <CardTitle>Performance</CardTitle>
                <CardDescription>Recent trading performance metrics</CardDescription>
              </CardHeader>
              <CardContent>
                <FarmPerformanceCard farmId={farm.id} />
              </CardContent>
            </Card>
            
            {/* Active Agents */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle>Active Agents</CardTitle>
                <CardDescription>Currently running agents</CardDescription>
              </CardHeader>
              <CardContent>
                {allAgents.filter(a => a.is_active || a.status === 'active').length > 0 ? (
                  <ScrollArea className="h-[240px]">
                    <div className="space-y-2">
                      {allAgents
                        .filter(a => a.is_active || a.status === 'active')
                        .map(agent => (
                          <div key={agent.id} className="flex items-center justify-between p-2 rounded hover:bg-muted">
                            <div className="flex items-center gap-2">
                              {agent.type === 'elizaos' ? (
                                <BrainCircuit className="h-4 w-4 text-blue-500" />
                              ) : (
                                <Bot className="h-4 w-4 text-primary" />
                              )}
                              <span className="font-medium truncate max-w-[160px]">{agent.name}</span>
                            </div>
                            <Link href={`/dashboard/agents/${agent.id}`} className="text-primary hover:underline text-sm">
                              <ArrowRight className="h-4 w-4" />
                            </Link>
                          </div>
                        ))}
                    </div>
                  </ScrollArea>
                ) : (
                  <div className="py-8 text-center text-muted-foreground">
                    <Bot className="h-10 w-10 mx-auto mb-2 opacity-20" />
                    <p>No active agents</p>
                    <Button variant="outline" size="sm" className="mt-2" asChild>
                      <Link href={`/dashboard/farms/${farm.id}/agents/new`}>
                        Add Agent
                      </Link>
                    </Button>
                  </div>
                )}
              </CardContent>
              <CardFooter>
                <Button variant="ghost" size="sm" className="w-full" asChild>
                  <Link href={`/dashboard/farms/${farm.id}/agents`}>
                    View All Agents
                  </Link>
                </Button>
              </CardFooter>
            </Card>
          </div>
          
          {/* Recent Goals and Activity */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Recent Goals */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle>Recent Goals</CardTitle>
                <CardDescription>Latest trading objectives</CardDescription>
              </CardHeader>
              <CardContent>
                {goals.length > 0 ? (
                  <ScrollArea className="h-[200px]">
                    <div className="space-y-2">
                      {goals.slice(0, 5).map(goal => (
                        <div key={goal.id} className="p-2 rounded hover:bg-muted">
                          <div className="flex justify-between items-center">
                            <span className="font-medium">{goal.title}</span>
                            <Badge variant={
                              goal.status === 'completed' ? 'default' : 
                              goal.status === 'in-progress' ? 'secondary' : 
                              'outline'
                            }>
                              {goal.status === 'completed' ? 'Completed' : 
                               goal.status === 'in-progress' ? 'In Progress' : 
                               goal.status}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground mt-1 truncate">{goal.description}</p>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                ) : (
                  <div className="py-8 text-center text-muted-foreground">
                    <Target className="h-10 w-10 mx-auto mb-2 opacity-20" />
                    <p>No goals defined</p>
                    <Button variant="outline" size="sm" className="mt-2" asChild>
                      <Link href={`/dashboard/farms/${farm.id}/goals/new`}>
                        Add Goal
                      </Link>
                    </Button>
                  </div>
                )}
              </CardContent>
              <CardFooter>
                <Button variant="ghost" size="sm" className="w-full" asChild>
                  <Link href={`/dashboard/farms/${farm.id}/goals`}>
                    View All Goals
                  </Link>
                </Button>
              </CardFooter>
            </Card>
            
            {/* Recent Activity */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle>Recent Activity</CardTitle>
                <CardDescription>Latest agent activities and trades</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="py-8 text-center text-muted-foreground">
                  <Clock className="h-10 w-10 mx-auto mb-2 opacity-20" />
                  <p>Activity tracking will be available soon</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        
        {/* Agents Tab */}
        <TabsContent value="agents" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle>Farm Agents</CardTitle>
                  <CardDescription>Manage all agents in this farm</CardDescription>
                </div>
                <Button asChild>
                  <Link href={`/dashboard/farms/${farm.id}/agents/new`}>
                    + Add Agent
                  </Link>
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <FarmAgentsTable 
                agents={agents || []} 
                elizaAgents={elizaAgents || []} 
                farmId={farm.id} 
              />
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Goals Tab */}
        <TabsContent value="goals" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle>Farm Goals</CardTitle>
                  <CardDescription>Manage trading objectives for your farm</CardDescription>
                </div>
                <Button asChild>
                  <Link href={`/dashboard/farms/${farm.id}/goals/new`}>
                    + Add Goal
                  </Link>
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <FarmGoalsSection farmId={farm.id} initialGoals={goals} />
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Collaborations Tab */}
        <TabsContent value="collaborations" className="space-y-4">
          <Card>
            <CardContent className="pt-6">
              <AgentCollaborationManager farmId={farm.id} agents={allAgents} />
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Tools Tab */}
        <TabsContent value="tools" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Farm Tools & Resources</CardTitle>
              <CardDescription>Manage tools and resources available to agents in this farm</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Trading Tools */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">Trading Tools</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2">
                      <li className="flex items-center justify-between p-2 rounded hover:bg-muted">
                        <div className="flex items-center gap-2">
                          <ArrowUpDown className="h-4 w-4 text-blue-500" />
                          <span>Market Execution</span>
                        </div>
                        <Badge>Enabled</Badge>
                      </li>
                      <li className="flex items-center justify-between p-2 rounded hover:bg-muted">
                        <div className="flex items-center gap-2">
                          <LineChart className="h-4 w-4 text-blue-500" />
                          <span>Technical Analysis</span>
                        </div>
                        <Badge>Enabled</Badge>
                      </li>
                      <li className="flex items-center justify-between p-2 rounded hover:bg-muted">
                        <div className="flex items-center gap-2">
                          <BarChart2 className="h-4 w-4 text-blue-500" />
                          <span>Risk Management</span>
                        </div>
                        <Badge>Enabled</Badge>
                      </li>
                    </ul>
                  </CardContent>
                  <CardFooter>
                    <Button variant="ghost" size="sm" className="w-full">
                      Manage Trading Tools
                    </Button>
                  </CardFooter>
                </Card>
                
                {/* LLM Configurations */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">LLM Configurations</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2">
                      <li className="flex items-center justify-between p-2 rounded hover:bg-muted">
                        <div className="flex items-center gap-2">
                          <BrainCircuit className="h-4 w-4 text-purple-500" />
                          <span>OpenAI GPT-4</span>
                        </div>
                        <Badge variant="secondary">Active</Badge>
                      </li>
                      <li className="flex items-center justify-between p-2 rounded hover:bg-muted">
                        <div className="flex items-center gap-2">
                          <BrainCircuit className="h-4 w-4 text-purple-500" />
                          <span>Anthropic Claude</span>
                        </div>
                        <Badge variant="outline">Available</Badge>
                      </li>
                    </ul>
                  </CardContent>
                  <CardFooter>
                    <Button variant="ghost" size="sm" className="w-full">
                      Manage LLM Configurations
                    </Button>
                  </CardFooter>
                </Card>
                
                {/* Agent Templates */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">Agent Templates</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2">
                      <li className="flex items-center justify-between p-2 rounded hover:bg-muted">
                        <div className="flex items-center gap-2">
                          <Bot className="h-4 w-4 text-green-500" />
                          <span>Momentum Trader</span>
                        </div>
                        <Link href="#" className="text-primary text-sm">Use</Link>
                      </li>
                      <li className="flex items-center justify-between p-2 rounded hover:bg-muted">
                        <div className="flex items-center gap-2">
                          <Bot className="h-4 w-4 text-green-500" />
                          <span>DCA Bot</span>
                        </div>
                        <Link href="#" className="text-primary text-sm">Use</Link>
                      </li>
                      <li className="flex items-center justify-between p-2 rounded hover:bg-muted">
                        <div className="flex items-center gap-2">
                          <Bot className="h-4 w-4 text-green-500" />
                          <span>Market Analyzer</span>
                        </div>
                        <Link href="#" className="text-primary text-sm">Use</Link>
                      </li>
                    </ul>
                  </CardContent>
                  <CardFooter>
                    <Button variant="ghost" size="sm" className="w-full">
                      Browse Templates
                    </Button>
                  </CardFooter>
                </Card>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

interface StatCardProps {
  title: string;
  value: string | number;
  subtext?: string;
  icon?: React.ReactNode;
}

function StatCard({ title, value, subtext, icon }: StatCardProps) {
  return (
    <div className="bg-card rounded-md border p-4">
      <div className="flex items-center gap-2">
        {icon}
        <p className="text-sm font-medium text-muted-foreground">{title}</p>
      </div>
      <p className="text-2xl font-bold mt-1">{value}</p>
      {subtext && (
        <p className="text-xs text-muted-foreground mt-1">{subtext}</p>
      )}
    </div>
  );
}
