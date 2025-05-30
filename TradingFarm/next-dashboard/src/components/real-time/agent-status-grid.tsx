"use client";

import { useEffect, useState } from "react";
import { useSocketAgents, AgentUpdate, AgentStatus } from "@/hooks/use-socket-agents";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { 
  Bot, 
  PlayCircle, 
  PauseCircle, 
  RefreshCw, 
  AlertCircle, 
  Database, 
  Cpu, 
  BarChart2,
  TrendingUp,
  TrendingDown
} from "lucide-react";
import { cn } from "@/components/ui/utils";

interface AgentStatusGridProps {
  farmId?: string;
  className?: string;
  onAgentClick?: (agent: AgentUpdate) => void;
}

export function AgentStatusGrid({
  farmId,
  className,
  onAgentClick,
}: AgentStatusGridProps) {
  const { agentList, isLoading, isConnected, controlAgent } = useSocketAgents();
  const [filter, setFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("status");
  
  // Filtered and sorted agents
  const filteredAgents = agentList.filter(agent => {
    if (farmId && agent.farmId !== farmId) return false;
    if (filter === "all") return true;
    if (filter === "active" && agent.status === "active") return true;
    if (filter === "paused" && agent.status === "paused") return true;
    if (filter === "idle" && agent.status === "idle") return true;
    if (filter === "error" && agent.status === "error") return true;
    return false;
  }).sort((a, b) => {
    if (sortBy === "performance") return b.performance - a.performance;
    if (sortBy === "trades") return b.trades - a.trades;
    if (sortBy === "winRate") return b.winRate - a.winRate;
    if (sortBy === "name") return a.name.localeCompare(b.name);
    // Default sort by status
    const statusOrder: Record<AgentStatus, number> = { active: 0, idle: 1, paused: 2, error: 3 };
    return statusOrder[a.status] - statusOrder[b.status];
  });
  
  // Agent counts by status
  const agentCounts = {
    all: agentList.length,
    active: agentList.filter(a => a.status === "active").length,
    paused: agentList.filter(a => a.status === "paused").length,
    idle: agentList.filter(a => a.status === "idle").length,
    error: agentList.filter(a => a.status === "error").length,
  };
  
  const getStatusIcon = (status: AgentStatus) => {
    switch(status) {
      case "active": return <PlayCircle className="h-4 w-4 text-green-500" />;
      case "paused": return <PauseCircle className="h-4 w-4 text-amber-500" />;
      case "idle": return <Bot className="h-4 w-4 text-blue-500" />;
      case "error": return <AlertCircle className="h-4 w-4 text-red-500" />;
    }
  };
  
  const getStatusColor = (status: AgentStatus) => {
    switch(status) {
      case "active": return "bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20";
      case "paused": return "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20";
      case "idle": return "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20";
      case "error": return "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20";
    }
  };
  
  const formatPerformance = (value: number) => {
    return value >= 0 ? `+${value.toFixed(2)}%` : `${value.toFixed(2)}%`;
  };
  
  const getPerformanceIcon = (value: number) => {
    return value >= 0 ? 
      <TrendingUp className={`h-3.5 w-3.5 ${value >= 0 ? "text-green-500" : "text-red-500"}`} /> : 
      <TrendingDown className={`h-3.5 w-3.5 ${value >= 0 ? "text-green-500" : "text-red-500"}`} />;
  };
  
  const handleControlAgent = (agentId: string, action: "start" | "pause" | "reset") => {
    controlAgent(agentId, action);
  };
  
  return (
    <Card className={cn("overflow-hidden", className)}>
      <CardHeader className="pb-3">
        <div className="flex justify-between items-center">
          <div>
            <CardTitle>Agent Status</CardTitle>
            <CardDescription>Real-time agent monitoring</CardDescription>
          </div>
          {isConnected ? (
            <Badge variant="outline" className="bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20">
              Live
            </Badge>
          ) : (
            <Badge variant="outline" className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20">
              Connecting...
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <Tabs value={filter} onValueChange={setFilter} className="w-full">
          <div className="flex justify-between items-center mb-4">
            <TabsList>
              <TabsTrigger value="all">
                All ({agentCounts.all})
              </TabsTrigger>
              <TabsTrigger value="active">
                Active ({agentCounts.active})
              </TabsTrigger>
              <TabsTrigger value="paused">
                Paused ({agentCounts.paused})
              </TabsTrigger>
              <TabsTrigger value="error">
                Issues ({agentCounts.error})
              </TabsTrigger>
            </TabsList>
            
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                className="h-8"
                onClick={() => setSortBy(sortBy === "performance" ? "status" : "performance")}
              >
                {sortBy === "performance" ? (
                  <>Status</>
                ) : (
                  <>Performance</>
                )}
              </Button>
            </div>
          </div>
          
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {isLoading ? (
              <div className="col-span-full p-12 text-center">
                <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground">Loading agents...</p>
              </div>
            ) : filteredAgents.length === 0 ? (
              <div className="col-span-full p-12 text-center">
                <Bot className="h-8 w-8 mx-auto mb-4 text-muted-foreground opacity-50" />
                <p className="text-muted-foreground">No agents found</p>
                <p className="text-sm text-muted-foreground mt-1">
                  {filter !== "all" ? "Try changing your filter" : "No agents are currently deployed"}
                </p>
              </div>
            ) : (
              filteredAgents.map(agent => (
                <Card 
                  key={agent.id} 
                  className={cn(
                    "relative overflow-hidden hover:shadow-md transition-all",
                    onAgentClick && "cursor-pointer",
                    agent.status === "error" && "border-red-400/50"
                  )}
                  onClick={() => onAgentClick?.(agent)}
                >
                  <div className={cn(
                    "absolute top-0 left-0 h-1 w-full",
                    agent.status === "active" ? "bg-green-500" : 
                    agent.status === "paused" ? "bg-amber-500" : 
                    agent.status === "error" ? "bg-red-500" :
                    "bg-blue-500"
                  )} />
                  
                  <CardContent className="pt-4">
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex items-center gap-2">
                        <div 
                          className={cn(
                            "h-8 w-8 rounded-md flex items-center justify-center",
                            getStatusColor(agent.status)
                          )}
                        >
                          <Bot className="h-4 w-4" />
                        </div>
                        <div>
                          <p className="font-medium">{agent.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {agent.type} agent
                          </p>
                        </div>
                      </div>
                      <Badge variant="outline" className={getStatusColor(agent.status)}>
                        <div className="flex items-center gap-1">
                          {getStatusIcon(agent.status)}
                          <span>{agent.status}</span>
                        </div>
                      </Badge>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-y-2 gap-x-4 mb-4">
                      <div>
                        <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                          <Cpu className="h-3 w-3" /> CPU Usage
                        </p>
                        <div className="flex items-center gap-2">
                          <Progress value={agent.cpuUsage || 0} className="h-2" />
                          <span className="text-xs font-medium">{agent.cpuUsage || 0}%</span>
                        </div>
                      </div>
                      
                      <div>
                        <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                          <Database className="h-3 w-3" /> Memory
                        </p>
                        <div className="flex items-center gap-2">
                          <Progress value={agent.memoryUsage || 0} className="h-2" />
                          <span className="text-xs font-medium">{agent.memoryUsage || 0}%</span>
                        </div>
                      </div>
                      
                      <div>
                        <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                          <BarChart2 className="h-3 w-3" /> Performance
                        </p>
                        <div className="flex items-center gap-1">
                          {getPerformanceIcon(agent.performance)}
                          <span className={cn(
                            "text-sm font-medium",
                            agent.performance >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"
                          )}>
                            {formatPerformance(agent.performance)}
                          </span>
                        </div>
                      </div>
                      
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Win Rate</p>
                        <p className="text-sm font-medium">{agent.winRate}% ({agent.trades})</p>
                      </div>
                    </div>
                    
                    <div className="flex gap-1">
                      {agent.status !== "active" && (
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="flex-1"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleControlAgent(agent.id, "start");
                          }}
                        >
                          <PlayCircle className="h-3.5 w-3.5 mr-1" />
                          Start
                        </Button>
                      )}
                      
                      {agent.status === "active" && (
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="flex-1"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleControlAgent(agent.id, "pause");
                          }}
                        >
                          <PauseCircle className="h-3.5 w-3.5 mr-1" />
                          Pause
                        </Button>
                      )}
                      
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="flex-1"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleControlAgent(agent.id, "reset");
                        }}
                      >
                        <RefreshCw className="h-3.5 w-3.5 mr-1" />
                        Reset
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </Tabs>
      </CardContent>
    </Card>
  );
}
