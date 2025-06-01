"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertCircle, CheckCircle, Loader2, PauseCircle, PlayCircle, RefreshCw, Trash2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/components/ui/use-toast";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { TradingAgent, TradingAgentStatus } from "@/services/elizaos/trading-agent-service";
import { useTradingAgents } from "@/hooks/use-trading-agents";
import { formatDistanceToNow } from "date-fns";

interface ElizaOSAgentDetailProps {
  agentId: string;
}

export default function ElizaOSAgentDetail({ agentId }: ElizaOSAgentDetailProps) {
  const router = useRouter();
  const { getAgent, activateAgent, pauseAgent, deleteAgent } = useTradingAgents();
  const [agent, setAgent] = useState<TradingAgent | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionInProgress, setActionInProgress] = useState(false);

  // Fetch agent data
  useEffect(() => {
    async function fetchAgentData() {
      try {
        setIsLoading(true);
        setError(null);
        const data = await getAgent(agentId);
        setAgent(data);
      } catch (err: any) {
        console.error(`Error fetching agent ${agentId}:`, err);
        setError(err.message || "Failed to load agent data");
      } finally {
        setIsLoading(false);
      }
    }

    fetchAgentData();
  }, [agentId, getAgent]);

  // Handle agent activation
  const handleActivate = async () => {
    if (!agent) return;
    
    try {
      setActionInProgress(true);
      const updatedAgent = await activateAgent(agent.id);
      setAgent(updatedAgent);
      toast({
        title: "Agent Activated",
        description: `${agent.config.name} is now active and ready to trade`,
      });
    } catch (err: any) {
      toast({
        title: "Activation Failed",
        description: err.message || "Failed to activate agent",
        variant: "destructive",
      });
    } finally {
      setActionInProgress(false);
    }
  };

  // Handle agent pause
  const handlePause = async () => {
    if (!agent) return;
    
    try {
      setActionInProgress(true);
      const updatedAgent = await pauseAgent(agent.id);
      setAgent(updatedAgent);
      toast({
        title: "Agent Paused",
        description: `${agent.config.name} has been paused`,
      });
    } catch (err: any) {
      toast({
        title: "Pause Failed",
        description: err.message || "Failed to pause agent",
        variant: "destructive",
      });
    } finally {
      setActionInProgress(false);
    }
  };

  // Handle agent deletion
  const handleDelete = async () => {
    if (!agent) return;
    
    if (!window.confirm(`Are you sure you want to delete ${agent.config.name}? This action cannot be undone.`)) {
      return;
    }
    
    try {
      setActionInProgress(true);
      await deleteAgent(agent.id);
      toast({
        title: "Agent Deleted",
        description: `${agent.config.name} has been permanently deleted`,
      });
      router.push("/dashboard/agents");
    } catch (err: any) {
      toast({
        title: "Deletion Failed",
        description: err.message || "Failed to delete agent",
        variant: "destructive",
      });
      setActionInProgress(false);
    }
  };

  // Handle agent refresh
  const handleRefresh = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await getAgent(agentId);
      setAgent(data);
    } catch (err: any) {
      console.error(`Error refreshing agent ${agentId}:`, err);
      setError(err.message || "Failed to refresh agent data");
    } finally {
      setIsLoading(false);
    }
  };

  // Render loading state
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-8 w-64 mb-2" />
          <Skeleton className="h-4 w-full max-w-md" />
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => (
              <Card key={i}>
                <CardHeader className="pb-2">
                  <Skeleton className="h-4 w-24" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-6 w-full" />
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  // Render error state
  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Error Loading Agent</AlertTitle>
        <AlertDescription>
          {error}
        </AlertDescription>
        <div className="mt-4">
          <Button variant="outline" size="sm" onClick={handleRefresh}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Try Again
          </Button>
        </div>
      </Alert>
    );
  }

  // Render agent not found
  if (!agent) {
    return (
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Agent Not Found</AlertTitle>
        <AlertDescription>
          The agent you are looking for could not be found.
        </AlertDescription>
        <div className="mt-4">
          <Button variant="outline" size="sm" onClick={() => router.push("/dashboard/agents")}>
            Return to Agents
          </Button>
        </div>
      </Alert>
    );
  }

  // Helper function to get status color
  const getStatusColor = (status: TradingAgentStatus) => {
    switch (status) {
      case TradingAgentStatus.ACTIVE:
        return "bg-green-100 text-green-800 border-green-200";
      case TradingAgentStatus.PAUSED:
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case TradingAgentStatus.ERROR:
        return "bg-red-100 text-red-800 border-red-200";
      case TradingAgentStatus.INITIALIZING:
        return "bg-blue-100 text-blue-800 border-blue-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  // Helper function to get status icon
  const getStatusIcon = (status: TradingAgentStatus) => {
    switch (status) {
      case TradingAgentStatus.ACTIVE:
        return <CheckCircle className="h-4 w-4 mr-1" />;
      case TradingAgentStatus.PAUSED:
        return <PauseCircle className="h-4 w-4 mr-1" />;
      case TradingAgentStatus.INITIALIZING:
        return <Loader2 className="h-4 w-4 mr-1 animate-spin" />;
      case TradingAgentStatus.ERROR:
        return <AlertCircle className="h-4 w-4 mr-1" />;
      default:
        return null;
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            <CardTitle>{agent.config.name}</CardTitle>
            <Badge 
              className={`${getStatusColor(agent.status)} flex items-center px-2 py-0.5 text-xs font-medium rounded-full border`}
            >
              {getStatusIcon(agent.status)}
              <span className="capitalize">{agent.status}</span>
            </Badge>
          </div>
          <CardDescription>{agent.config.description || `ElizaOS ${agent.config.agentType} Agent`}</CardDescription>
        </div>
        <div className="flex space-x-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleRefresh}
            disabled={actionInProgress}
          >
            <RefreshCw className="h-4 w-4 mr-1" />
            Refresh
          </Button>
          {agent.status === TradingAgentStatus.PAUSED && (
            <Button
              variant="default"
              size="sm"
              onClick={handleActivate}
              disabled={actionInProgress}
            >
              {actionInProgress ? (
                <Loader2 className="h-4 w-4 mr-1 animate-spin" />
              ) : (
                <PlayCircle className="h-4 w-4 mr-1" />
              )}
              Activate
            </Button>
          )}
          {agent.status === TradingAgentStatus.ACTIVE && (
            <Button
              variant="outline"
              size="sm"
              onClick={handlePause}
              disabled={actionInProgress}
            >
              {actionInProgress ? (
                <Loader2 className="h-4 w-4 mr-1 animate-spin" />
              ) : (
                <PauseCircle className="h-4 w-4 mr-1" />
              )}
              Pause
            </Button>
          )}
          <Button
            variant="destructive"
            size="sm"
            onClick={handleDelete}
            disabled={actionInProgress}
          >
            {actionInProgress ? (
              <Loader2 className="h-4 w-4 mr-1 animate-spin" />
            ) : (
              <Trash2 className="h-4 w-4 mr-1" />
            )}
            Delete
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <Tabs defaultValue="overview">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="configuration">Configuration</TabsTrigger>
            <TabsTrigger value="logs">Logs</TabsTrigger>
            <TabsTrigger value="performance">Performance</TabsTrigger>
          </TabsList>
          
          <TabsContent value="overview" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Agent Type</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-lg font-semibold capitalize">{agent.config.agentType}</p>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Trading Mode</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-lg font-semibold">{agent.config.isPaperTrading ? "Paper Trading" : "Live Trading"}</p>
                  {agent.config.isPaperTrading && (
                    <p className="text-xs text-gray-500">No real funds will be used</p>
                  )}
                  {!agent.config.isPaperTrading && (
                    <p className="text-xs text-red-500 font-semibold">Using real funds</p>
                  )}
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Exchanges</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {agent.config.exchanges.map((exchange) => (
                    <Badge key={exchange} variant="outline" className="mr-1">
                      {exchange}
                    </Badge>
                  ))}
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Trading Pairs</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex flex-wrap gap-1">
                    {agent.config.tradingPairs.map((pair) => (
                      <Badge key={pair} variant="outline">
                        {pair}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Created</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-lg font-semibold">
                    {formatDistanceToNow(new Date(agent.createdAt), { addSuffix: true })}
                  </p>
                  <p className="text-xs text-gray-500">
                    {new Date(agent.createdAt).toLocaleString()}
                  </p>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Last Updated</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-lg font-semibold">
                    {formatDistanceToNow(new Date(agent.updatedAt), { addSuffix: true })}
                  </p>
                  <p className="text-xs text-gray-500">
                    {new Date(agent.updatedAt).toLocaleString()}
                  </p>
                </CardContent>
              </Card>
            </div>
            
            {agent.metrics && (
              <div className="mt-6">
                <h3 className="text-lg font-medium mb-3">Performance Metrics</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium">Total Trades</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-2xl font-bold">{agent.metrics.totalTrades}</p>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium">Win Rate</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-2xl font-bold">{agent.metrics.winRate}%</p>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium">P&L</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className={`text-2xl font-bold ${agent.metrics.pnl >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {agent.metrics.pnl >= 0 ? '+' : ''}{agent.metrics.pnl.toFixed(2)} USDT
                      </p>
                    </CardContent>
                  </Card>
                </div>
              </div>
            )}
          </TabsContent>
          
          <TabsContent value="configuration" className="space-y-6">
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-medium mb-3">Risk Parameters</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium">Max Position Size</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-lg font-semibold">{agent.config.riskParameters.maxPositionSize} BTC</p>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium">Max Drawdown</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-lg font-semibold">{agent.config.riskParameters.maxDrawdown}%</p>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium">Max Orders</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-lg font-semibold">{agent.config.riskParameters.maxOrdersPerInterval} per {agent.config.riskParameters.orderIntervalSeconds}s</p>
                    </CardContent>
                  </Card>
                </div>
              </div>
              
              <div>
                <h3 className="text-lg font-medium mb-3">Trading Parameters</h3>
                <Card>
                  <CardContent className="pt-6">
                    <pre className="bg-gray-100 p-4 rounded-md overflow-x-auto text-sm">
                      {JSON.stringify(agent.config.tradingParameters, null, 2)}
                    </pre>
                  </CardContent>
                </Card>
              </div>
              
              <div>
                <h3 className="text-lg font-medium mb-3">AI Model</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium">Model Provider</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-lg font-semibold">{agent.config.modelProvider || "openai"}</p>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium">Model ID</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-lg font-semibold">{agent.config.modelId || "gpt-4o"}</p>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="logs" className="space-y-4">
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Coming Soon</AlertTitle>
              <AlertDescription>
                Agent logs will be available in a future update.
              </AlertDescription>
            </Alert>
          </TabsContent>
          
          <TabsContent value="performance" className="space-y-4">
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Coming Soon</AlertTitle>
              <AlertDescription>
                Detailed performance metrics will be available in a future update.
              </AlertDescription>
            </Alert>
          </TabsContent>
        </Tabs>
      </CardContent>
      <CardFooter className="border-t pt-6 flex justify-between">
        <Button variant="outline" onClick={() => router.push("/dashboard/agents")}>
          Back to Agents
        </Button>
        
        <div className="space-x-2">
          {agent.status === TradingAgentStatus.PAUSED && (
            <Button
              variant="default"
              onClick={handleActivate}
              disabled={actionInProgress}
            >
              {actionInProgress ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <PlayCircle className="h-4 w-4 mr-2" />
              )}
              Activate Agent
            </Button>
          )}
          {agent.status === TradingAgentStatus.ACTIVE && (
            <Button
              variant="outline"
              onClick={handlePause}
              disabled={actionInProgress}
            >
              {actionInProgress ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <PauseCircle className="h-4 w-4 mr-2" />
              )}
              Pause Agent
            </Button>
          )}
        </div>
      </CardFooter>
    </Card>
  );
}
