"use client";

import React from "react";
import { agentService, Agent, ExtendedAgent } from "@/services/agent-service";
import Link from "next/link";
import { createBrowserClient } from "@/utils/supabase/client";
import { 
  Bot, 
  Clock, 
  AlertCircle, 
  CheckCircle, 
  Settings, 
  PlayCircle, 
  PauseCircle,
  BarChart,
  Trash2,
  Search,
  RefreshCcw,
  Laptop,
  AlertTriangle
} from "lucide-react";

// Import Shadcn components
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { AgentCreationDialog } from "@/components/agents/agent-creation-dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { ScrollArea } from "@/components/ui/scroll-area";

// Agent status badge component
const AgentStatusBadge = ({ status }: { status: string }) => {
  const getStatusColor = () => {
    // Add null check to prevent error when status is undefined
    if (!status) return "bg-gray-100 text-gray-800 border-gray-200";
    
    switch (status.toLowerCase()) {
      case 'active':
        return "bg-green-100 text-green-800 border-green-200";
      case 'initializing':
        return "bg-blue-100 text-blue-800 border-blue-200";
      case 'paused':
        return "bg-amber-100 text-amber-800 border-amber-200";
      case 'stopped':
      case 'inactive':
        return "bg-gray-100 text-gray-800 border-gray-200";
      case 'error':
        return "bg-red-100 text-red-800 border-red-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const getStatusIcon = () => {
    // Add null check to prevent error when status is undefined
    if (!status) return <Laptop className="h-3.5 w-3.5 mr-1" />;
    
    switch (status.toLowerCase()) {
      case 'active':
        return <CheckCircle className="h-3.5 w-3.5 mr-1" />;
      case 'initializing':
        return <Clock className="h-3.5 w-3.5 mr-1" />;
      case 'paused':
        return <PauseCircle className="h-3.5 w-3.5 mr-1" />;
      case 'stopped':
      case 'inactive':
        return <AlertCircle className="h-3.5 w-3.5 mr-1" />;
      case 'error':
        return <AlertTriangle className="h-3.5 w-3.5 mr-1" />;
      default:
        return <Laptop className="h-3.5 w-3.5 mr-1" />;
    }
  };

  return (
    <Badge variant="outline" className={`${getStatusColor()} flex items-center`}>
      {getStatusIcon()}
      {status ? status.charAt(0).toUpperCase() + status.slice(1) : "Unknown"}
    </Badge>
  );
};

export default function AgentsPage() {
  const [agents, setAgents] = React.useState<ExtendedAgent[]>([]);
  const [farms, setFarms] = React.useState<{ id: number; name: string }[]>([]);
  const [filteredAgents, setFilteredAgents] = React.useState<ExtendedAgent[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [statusFilter, setStatusFilter] = React.useState<string>("all");
  const [farmFilter, setFarmFilter] = React.useState<string>("all");
  const [typeFilter, setTypeFilter] = React.useState<string>("all");
  const [searchQuery, setSearchQuery] = React.useState<string>("");
  const { toast } = useToast();
  const supabase = createBrowserClient();

  // Setup real-time subscription for agent updates
  React.useEffect(() => {
    const setupRealtimeSubscription = async () => {
      try {
        const subscription = supabase
          .channel('agents-channel')
          .on('postgres_changes', { 
            event: '*', 
            schema: 'public', 
            table: 'agents' 
          }, (payload) => {
            fetchAgents();
          })
          .subscribe();

        return () => {
          supabase.removeChannel(subscription);
        };
      } catch (error) {
        console.error('Error setting up realtime subscription:', error);
      }
    };

    setupRealtimeSubscription();
  }, [supabase]);

  // Fetch agents and farms
  const fetchAgents = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [agentsResponse, farmsResponse] = await Promise.all([
        agentService.getAgents(),
        agentService.getAvailableFarms()
      ]);
      
      if (agentsResponse.error) {
        setError(agentsResponse.error);
      } else if (agentsResponse.data) {
        setAgents(agentsResponse.data);
      }

      if (farmsResponse.data) {
        setFarms(farmsResponse.data);
      }
    } catch (error) {
      console.error('Error fetching agents:', error);
      setError('Failed to load agents. Please try again later.');
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    fetchAgents();
  }, [fetchAgents]);

  // Apply filters and search
  React.useEffect(() => {
    let result = [...agents];
    
    // Apply status filter
    if (statusFilter !== "all") {
      result = result.filter((agent: ExtendedAgent) => agent.status?.toLowerCase() === statusFilter.toLowerCase());
    }
    
    // Apply farm filter
    if (farmFilter !== "all") {
      result = result.filter((agent: ExtendedAgent) => agent.farm_id.toString() === farmFilter);
    }
    
    // Apply type filter
    if (typeFilter !== "all") {
      result = result.filter((agent: ExtendedAgent) => 
        agent.type?.toLowerCase() === typeFilter.toLowerCase() || 
        agent.strategy_type?.toLowerCase() === typeFilter.toLowerCase()
      );
    }
    
    // Apply search query
    if (searchQuery.trim() !== "") {
      const query = searchQuery.toLowerCase();
      result = result.filter((agent: ExtendedAgent) => 
        agent.name.toLowerCase().includes(query) || 
        agent.description?.toLowerCase().includes(query)
      );
    }
    
    setFilteredAgents(result);
  }, [agents, statusFilter, farmFilter, typeFilter, searchQuery]);

  // Handle agent actions
  const handleAgentStatusChange = async (agentId: number, newStatus: string) => {
    try {
      const response = await agentService.changeAgentStatus(agentId, newStatus);
      
      if (response.error) {
        toast({
          variant: "destructive",
          title: "Status Change Failed",
          description: response.error,
        });
      } else {
        toast({
          title: "Status Updated",
          description: `Agent status changed to ${newStatus}`,
        });
        
        // Update agent in the local state
        setAgents(agents.map((agent: ExtendedAgent) => 
          agent.id === agentId 
            ? { ...agent, status: newStatus } 
            : agent
        ));
      }
    } catch (error) {
      console.error('Error changing agent status:', error);
      toast({
        variant: "destructive",
        title: "Status Change Failed",
        description: "An unexpected error occurred",
      });
    }
  };

  const handleDeleteAgent = async (agentId: number) => {
    try {
      const response = await agentService.deleteAgent(agentId);
      
      if (response.error) {
        toast({
          variant: "destructive",
          title: "Delete Failed",
          description: response.error,
        });
      } else {
        toast({
          title: "Agent Deleted",
          description: "The agent has been successfully deleted",
        });
        
        // Remove agent from the local state
        setAgents(agents.filter((agent: ExtendedAgent) => agent.id !== agentId));
      }
    } catch (error) {
      console.error('Error deleting agent:', error);
      toast({
        variant: "destructive",
        title: "Delete Failed",
        description: "An unexpected error occurred",
      });
    }
  };

  const handleAgentCreated = (newAgent: ExtendedAgent) => {
    setAgents((prev: ExtendedAgent[]) => [newAgent, ...prev]);
    toast({
      title: "Agent Created",
      description: `${newAgent.name} has been created successfully`,
    });
  };

  if (loading && agents.length === 0) {
    return (
      <div className="container mx-auto p-6 space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <Skeleton className="h-8 w-40 mb-2" />
            <Skeleton className="h-4 w-64" />
          </div>
          <Skeleton className="h-10 w-32" />
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array(6).fill(0).map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader className="pb-2">
                <Skeleton className="h-6 w-40 mb-2" />
                <Skeleton className="h-4 w-24" />
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-2/3" />
                </div>
              </CardContent>
              <CardFooter>
                <Skeleton className="h-9 w-full" />
              </CardFooter>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex flex-col items-center justify-center p-6 bg-red-50 rounded-lg border border-red-200">
          <AlertCircle className="h-12 w-12 text-red-500 mb-4" />
          <h3 className="text-lg font-semibold text-red-800 mb-2">Error Loading Agents</h3>
          <p className="text-red-600 mb-4">{error}</p>
          <Button variant="outline" onClick={fetchAgents}>
            <RefreshCcw className="h-4 w-4 mr-2" />
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Trading Agents</h1>
          <p className="text-muted-foreground">
            Manage your automated trading agents and their configurations
          </p>
        </div>
        <AgentCreationDialog onSuccess={handleAgentCreated} />
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4 mb-2">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search agents..."
                className="pl-8"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div className="flex flex-1 gap-2">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="paused">Paused</SelectItem>
                  <SelectItem value="initializing">Initializing</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                  <SelectItem value="error">Error</SelectItem>
                </SelectContent>
              </Select>
              
              <Select value={farmFilter} onValueChange={setFarmFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Farm" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Farms</SelectItem>
                  {farms.map((farm: { id: number; name: string }) => (
                    <SelectItem key={farm.id} value={farm.id.toString()}>
                      {farm.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="trend_following">Trend Following</SelectItem>
                  <SelectItem value="mean_reversion">Mean Reversion</SelectItem>
                  <SelectItem value="breakout">Breakout</SelectItem>
                  <SelectItem value="arbitrage">Arbitrage</SelectItem>
                  <SelectItem value="custom">Custom</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <Button 
            variant="outline" 
            size="sm" 
            className="mt-2" 
            onClick={() => {
              setStatusFilter("all");
              setFarmFilter("all");
              setTypeFilter("all");
              setSearchQuery("");
            }}
          >
            Reset Filters
          </Button>
        </CardContent>
      </Card>

      {filteredAgents.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-12 bg-muted/50 rounded-lg border border-dashed">
          <Bot className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">No Agents Found</h3>
          <p className="text-muted-foreground text-center mb-4">
            {agents.length > 0 
              ? "No agents match your current filters. Try adjusting your search criteria."
              : "You haven't created any trading agents yet. Create your first agent to get started."}
          </p>
          {agents.length > 0 ? (
            <Button variant="outline" onClick={() => {
              setStatusFilter("all");
              setFarmFilter("all");
              setTypeFilter("all");
              setSearchQuery("");
            }}>
              Clear Filters
            </Button>
          ) : (
            <AgentCreationDialog />
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredAgents.map((agent: ExtendedAgent) => (
            <Card key={agent.id} className="overflow-hidden">
              <CardHeader className="pb-2">
                <div className="flex justify-between items-start">
                  <div className="space-y-1">
                    <CardTitle className="text-lg">{agent.name}</CardTitle>
                    <CardDescription>
                      {agent.strategy_type || agent.type}
                    </CardDescription>
                  </div>
                  <AgentStatusBadge status={agent.status} />
                </div>
              </CardHeader>
              <CardContent className="pb-2">
                <div className="space-y-3">
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {agent.description || "No description provided."}
                  </p>
                  
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="flex flex-col">
                      <span className="text-muted-foreground">Farm</span>
                      <span className="font-medium">
                        {farms.find((f: { id: number; name: string }) => f.id === agent.farm_id)?.name || `Farm #${agent.farm_id}`}
                      </span>
                    </div>
                    
                    <div className="flex flex-col">
                      <span className="text-muted-foreground">Markets</span>
                      <span className="font-medium">
                        {agent.target_markets && agent.target_markets.length > 0
                          ? `${agent.target_markets[0]}${agent.target_markets.length > 1 ? ` +${agent.target_markets.length - 1}` : ''}`
                          : "Not specified"}
                      </span>
                    </div>
                    
                    <div className="flex flex-col">
                      <span className="text-muted-foreground">Risk Level</span>
                      <span className="font-medium capitalize">
                        {agent.risk_level || "Medium"}
                      </span>
                    </div>
                    
                    <div className="flex flex-col">
                      <span className="text-muted-foreground">Profit/Loss</span>
                      <span className={`font-medium ${
                        (agent.performance_metrics?.profit_loss || 0) >= 0 
                          ? "text-green-600" 
                          : "text-red-600"
                      }`}>
                        {(agent.performance_metrics?.profit_loss !== undefined)
                          ? `${(agent.performance_metrics.profit_loss >= 0 ? '+' : '')}${agent.performance_metrics.profit_loss.toFixed(2)}%` 
                          : "N/A"}
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
              <CardFooter className="pt-2">
                <div className="flex justify-between w-full">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="sm">
                        Actions
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start">
                      <DropdownMenuItem 
                        onClick={() => agent.status !== 'active' && handleAgentStatusChange(agent.id, 'active')}
                        disabled={agent.status === 'active'}
                      >
                        <PlayCircle className="h-4 w-4 mr-2" />
                        Activate
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        onClick={() => agent.status === 'active' && handleAgentStatusChange(agent.id, 'paused')}
                        disabled={agent.status !== 'active'}
                      >
                        <PauseCircle className="h-4 w-4 mr-2" />
                        Pause
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        onClick={() => handleAgentStatusChange(agent.id, 'inactive')}
                        disabled={agent.status === 'inactive'}
                      >
                        <AlertCircle className="h-4 w-4 mr-2" />
                        Stop
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        className="text-red-600"
                        onClick={() => handleDeleteAgent(agent.id)}
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                  
                  <Link href={`/dashboard/agents/${agent.id}`} passHref>
                    <Button size="sm">
                      <Settings className="h-4 w-4 mr-2" />
                      Manage
                    </Button>
                  </Link>
                </div>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}