'use client';

import * as React from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from '@/components/ui/breadcrumb';
import { StrategyExecutionForm } from '@/components/strategies/strategy-execution-form';
import { ExecutionMonitor } from '@/components/strategies/execution-monitor';
import { ElizaCommandConsole } from '@/components/agents/eliza-command-console';
import { createBrowserClient } from '@/utils/supabase/client';
import { getStrategyExecutions } from '@/services/strategy-execution';

interface Strategy {
  id: number;
  name: string;
  description: string;
  owner_id: string;
  created_at: string;
  updated_at: string;
  settings: any;
}

interface Agent {
  id: number;
  name: string;
  description: string;
  owner_id: string;
  created_at: string;
  updated_at: string;
  settings: any;
}

export default function StrategyExecutePage() {
  const params = useParams();
  const router = useRouter();
  const strategyId = Number(params.id);
  
  const [loading, setLoading] = React.useState(true);
  const [strategy, setStrategy] = React.useState<Strategy | null>(null);
  const [agents, setAgents] = React.useState<Agent[]>([]);
  const [executions, setExecutions] = React.useState<any[]>([]);
  const [currentExecutionId, setCurrentExecutionId] = React.useState<number | null>(null);
  const [activeTab, setActiveTab] = React.useState('new');
  
  // Fetch strategy, agents, and executions
  React.useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      
      try {
        // Fetch strategy
        const supabase = createBrowserClient();
        const { data: strategyData, error: strategyError } = await supabase
          .from('strategies')
          .select('*')
          .eq('id', strategyId)
          .single();
        
        if (strategyError) throw strategyError;
        setStrategy(strategyData);
        
        // Fetch agents
        const { data: agentsData, error: agentsError } = await supabase
          .from('agents')
          .select('*')
          .order('name', { ascending: true });
        
        if (agentsError) throw agentsError;
        setAgents(agentsData);
        
        // Fetch executions
        const executionsData = await getStrategyExecutions(strategyId);
        setExecutions(executionsData);
        
        // Set current execution if any recent ones exist
        const runningExecution = executionsData.find(e => 
          e.status === 'running' || e.status === 'paused'
        );
        
        if (runningExecution) {
          setCurrentExecutionId(runningExecution.id);
          setActiveTab('monitor');
        } else if (executionsData.length > 0) {
          setCurrentExecutionId(executionsData[0].id);
        }
      } catch (error) {
        console.error('Error loading strategy and execution data:', error);
      } finally {
        setLoading(false);
      }
    };
    
    if (strategyId) {
      fetchData();
    }
  }, [strategyId]);
  
  // Handle new execution start
  const handleExecutionStart = (executionId: number) => {
    setCurrentExecutionId(executionId);
    setActiveTab('monitor');
    
    // Refresh executions list
    getStrategyExecutions(strategyId).then(executionsData => {
      setExecutions(executionsData);
    });
  };
  
  // Handle execution selection
  const handleExecutionSelect = (executionId: number) => {
    setCurrentExecutionId(executionId);
    setActiveTab('monitor');
  };
  
  // Loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center h-[500px]">
        <div className="text-center">
          <div className="w-8 h-8 border-t-2 border-primary rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading strategy and execution data...</p>
        </div>
      </div>
    );
  }
  
  // Missing strategy
  if (!strategy) {
    return (
      <div className="flex flex-col items-center justify-center h-[500px] space-y-4">
        <p className="text-xl font-medium">Strategy not found</p>
        <p className="text-muted-foreground">The requested strategy could not be found.</p>
        <Button onClick={() => router.back()}>Go Back</Button>
      </div>
    );
  }

  // Get current execution agent if any
  const currentExecution = currentExecutionId 
    ? executions.find(e => e.id === currentExecutionId)
    : null;
  
  const currentAgentId = currentExecution?.agent_id;
  const currentAgent = currentAgentId
    ? agents.find(a => a.id === currentAgentId)
    : null;
  
  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Breadcrumb navigation */}
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink href="/dashboard">Dashboard</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbLink href="/dashboard/strategies">Strategies</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbLink href={`/dashboard/strategies/${strategyId}`}>
              {strategy.name}
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>Execute</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>
      
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{strategy.name} - Execution</h1>
          <p className="text-muted-foreground">{strategy.description}</p>
        </div>
        
        <div className="flex space-x-2">
          <Button 
            variant="outline" 
            onClick={() => router.push(`/dashboard/strategies/${strategyId}/backtest`)}
          >
            Backtest Strategy
          </Button>
          <Button 
            variant="outline" 
            onClick={() => router.push(`/dashboard/strategies/${strategyId}`)}
          >
            Back to Strategy
          </Button>
        </div>
      </div>
      
      <Separator />
      
      {/* Main content */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full md:w-[600px] grid-cols-3">
          <TabsTrigger value="new">New Execution</TabsTrigger>
          <TabsTrigger value="monitor" disabled={!currentExecutionId}>
            Monitor
          </TabsTrigger>
          <TabsTrigger value="command-console" disabled={!currentExecutionId || !currentAgentId}>
            Command Console
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="new" className="mt-6">
          <StrategyExecutionForm
            strategyId={strategyId}
            strategyName={strategy.name}
            agents={agents}
            onExecutionStart={handleExecutionStart}
          />
        </TabsContent>
        
        <TabsContent value="monitor" className="mt-6">
          {currentExecutionId ? (
            <ExecutionMonitor executionId={currentExecutionId} />
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>No Execution Selected</CardTitle>
                <CardDescription>
                  Start a new execution or select an existing one to monitor.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button onClick={() => setActiveTab('new')}>
                  Create New Execution
                </Button>
              </CardContent>
            </Card>
          )}
          
          {executions.length > 0 && (
            <Card className="mt-6">
              <CardHeader>
                <CardTitle>Previous Executions</CardTitle>
                <CardDescription>
                  Select an execution to monitor its progress
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {executions.map((execution) => (
                    <Card 
                      key={execution.id}
                      className={`cursor-pointer transition-all hover:border-primary ${
                        currentExecutionId === execution.id ? 'border-primary bg-primary/5' : ''
                      }`}
                      onClick={() => handleExecutionSelect(execution.id)}
                    >
                      <CardHeader className="pb-2">
                        <div className="flex justify-between items-start">
                          <CardTitle className="text-sm">
                            Execution #{execution.id}
                          </CardTitle>
                          <div className="px-2 py-1 text-xs rounded-full bg-muted font-medium capitalize">
                            {execution.status}
                          </div>
                        </div>
                        <CardDescription className="text-xs">
                          {execution.symbol} {execution.timeframe}
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="pb-4">
                        <div className="text-xs">
                          <p>Created: {new Date(execution.created_at).toLocaleString()}</p>
                          <p>Mode: {execution.live_mode ? 'Live' : 'Backfill'} {execution.paper_trading && '(Paper)'}</p>
                          {execution.agent_id && (
                            <p>Agent: {agents.find(a => a.id === execution.agent_id)?.name || 'Unknown Agent'}</p>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
        
        <TabsContent value="command-console" className="mt-6">
          {currentAgentId && currentExecution ? (
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">
                    ElizaOS Command Console - {currentAgent?.name || 'Agent'} - Execution #{currentExecutionId}
                  </CardTitle>
                  <CardDescription>
                    Use natural language commands to interact with your strategy execution
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ElizaCommandConsole 
                    agentId={currentAgentId.toString()}
                    agentName={currentAgent?.name || 'Agent'}
                  />
                </CardContent>
              </Card>
            </div>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>No Agent Selected</CardTitle>
                <CardDescription>
                  Create an execution with an assigned agent to use the command console.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button onClick={() => setActiveTab('new')}>
                  Create New Execution with Agent
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
