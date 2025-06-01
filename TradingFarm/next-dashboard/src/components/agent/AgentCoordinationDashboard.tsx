"use client";

import React, { useState, useEffect } from "react";
import { createBrowserClient } from "@/utils/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/use-toast";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { AgentFlowBuilder } from "./AgentFlowBuilder";
import { AgentStatusMonitor } from "./AgentStatusMonitor";
import { AgentCommunicationLog } from "./AgentCommunicationLog";
import {
  Users, BarChart2, Activity, Terminal, MessageSquare, Settings, PlusCircle,
  Share2, AlertTriangle, CheckCircle, Clock, RefreshCw, Brain
} from "lucide-react";

interface Agent {
  id: string;
  name: string;
  description: string;
  type: string;
  status: 'idle' | 'active' | 'error' | 'paused';
  last_active: string;
  expertise: string[];
  capabilities: string[];
  performance_score: number;
  avatar_url?: string;
}

interface AgentTeam {
  id: string;
  name: string;
  description: string;
  agents: string[];
  workflow_id?: string;
  created_at: string;
  updated_at: string;
  status: 'active' | 'paused' | 'stopped';
  performance_metrics: {
    win_rate?: number;
    accuracy?: number;
    avg_return?: number;
    sharpe_ratio?: number;
  };
}

interface AgentCoordinationDashboardProps {
  farmId?: string;
}

export function AgentCoordinationDashboard({ farmId }: AgentCoordinationDashboardProps) {
  const [activeTab, setActiveTab] = useState("teams");
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null);
  const { toast } = useToast();
  const supabase = createBrowserClient();

  // Fetch agents
  const { data: agents = [], isLoading: isLoadingAgents } = useQuery({
    queryKey: ["agents", farmId],
    queryFn: async () => {
      // For demo purposes, we'll use mock data
      // In a real implementation, fetch from the database
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      return [
        {
          id: "agent-1",
          name: "Market Analyzer",
          description: "Analyzes market trends and patterns",
          type: "analyzer",
          status: "active",
          last_active: "2025-04-12T10:15:22Z",
          expertise: ["technical-analysis", "pattern-recognition"],
          capabilities: ["market-scan", "trend-analysis", "oscillator-calculation"],
          performance_score: 92,
          avatar_url: null
        },
        {
          id: "agent-2",
          name: "Strategy Optimizer",
          description: "Optimizes trading strategies based on market conditions",
          type: "optimizer",
          status: "idle",
          last_active: "2025-04-12T09:30:15Z",
          expertise: ["parameter-tuning", "backtesting", "strategy-validation"],
          capabilities: ["performance-analysis", "parameter-optimization"],
          performance_score: 87,
          avatar_url: null
        },
        {
          id: "agent-3",
          name: "Risk Manager",
          description: "Monitors and manages trading risks",
          type: "risk-manager",
          status: "active",
          last_active: "2025-04-12T10:20:05Z",
          expertise: ["risk-assessment", "position-sizing", "drawdown-management"],
          capabilities: ["risk-calculation", "position-recommendation", "stop-loss-optimization"],
          performance_score: 94,
          avatar_url: null
        },
        {
          id: "agent-4",
          name: "News Analyzer",
          description: "Analyzes financial news and sentiment",
          type: "analyzer",
          status: "paused",
          last_active: "2025-04-12T08:45:33Z",
          expertise: ["sentiment-analysis", "news-impact", "event-detection"],
          capabilities: ["news-monitoring", "sentiment-calculation", "alert-generation"],
          performance_score: 82,
          avatar_url: null
        },
        {
          id: "agent-5",
          name: "Execution Agent",
          description: "Executes trades with optimal timing and conditions",
          type: "executor",
          status: "idle",
          last_active: "2025-04-12T09:15:45Z",
          expertise: ["order-execution", "slippage-management", "timing-optimization"],
          capabilities: ["order-placement", "execution-timing", "cost-optimization"],
          performance_score: 90,
          avatar_url: null
        }
      ] as Agent[];
    },
    refetchOnWindowFocus: false,
  });

  // Fetch agent teams
  const { data: teams = [], isLoading: isLoadingTeams } = useQuery({
    queryKey: ["agent-teams", farmId],
    queryFn: async () => {
      // For demo purposes, we'll use mock data
      // In a real implementation, fetch from the database
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      return [
        {
          id: "team-1",
          name: "Momentum Strategy Team",
          description: "Team specialized in momentum-based trading strategies",
          agents: ["agent-1", "agent-2", "agent-5"],
          workflow_id: "workflow-1",
          created_at: "2025-04-01T14:22:33Z",
          updated_at: "2025-04-12T08:15:22Z",
          status: "active",
          performance_metrics: {
            win_rate: 68,
            accuracy: 72,
            avg_return: 1.8,
            sharpe_ratio: 1.2
          }
        },
        {
          id: "team-2",
          name: "News Trading Team",
          description: "Team focused on event-driven and news-based strategies",
          agents: ["agent-3", "agent-4", "agent-5"],
          workflow_id: "workflow-2",
          created_at: "2025-04-02T10:45:12Z",
          updated_at: "2025-04-11T16:30:45Z",
          status: "paused",
          performance_metrics: {
            win_rate: 61,
            accuracy: 65,
            avg_return: 2.2,
            sharpe_ratio: 0.9
          }
        },
        {
          id: "team-3",
          name: "Risk-Balanced Portfolio Team",
          description: "Team managing a balanced portfolio with risk constraints",
          agents: ["agent-2", "agent-3"],
          workflow_id: "workflow-3",
          created_at: "2025-04-05T09:12:35Z",
          updated_at: "2025-04-12T09:45:18Z",
          status: "active",
          performance_metrics: {
            win_rate: 58,
            accuracy: 64,
            avg_return: 1.5,
            sharpe_ratio: 1.8
          }
        }
      ] as AgentTeam[];
    },
    refetchOnWindowFocus: false,
  });

  // Get selected team details
  const selectedTeam = teams.find(team => team.id === selectedTeamId);
  
  // Get agents in the selected team
  const teamAgents = selectedTeam 
    ? agents.filter(agent => selectedTeam.agents.includes(agent.id))
    : [];
  
  // Handle team selection
  const handleSelectTeam = (teamId: string) => {
    setSelectedTeamId(teamId);
  };

  // Get status badge variant
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return (
          <Badge className="bg-green-500/10 text-green-600 hover:bg-green-500/20 border-green-500/20">
            <CheckCircle className="h-3.5 w-3.5 mr-1" />
            Active
          </Badge>
        );
      case 'idle':
        return (
          <Badge variant="outline" className="text-muted-foreground">
            <Clock className="h-3.5 w-3.5 mr-1" />
            Idle
          </Badge>
        );
      case 'paused':
        return (
          <Badge variant="outline" className="text-amber-600 border-amber-200 bg-amber-100/50">
            <AlertTriangle className="h-3.5 w-3.5 mr-1" />
            Paused
          </Badge>
        );
      case 'error':
      case 'stopped':
        return (
          <Badge variant="outline" className="text-destructive border-destructive/30 bg-destructive/10">
            <AlertTriangle className="h-3.5 w-3.5 mr-1" />
            {status === 'error' ? 'Error' : 'Stopped'}
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Users className="h-5 w-5 text-primary" />
          <h3 className="text-lg font-medium">Agent Orchestration</h3>
        </div>
        
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm">
            <PlusCircle className="h-4 w-4 mr-1" />
            Create Team
          </Button>
          <Button size="sm">
            <PlusCircle className="h-4 w-4 mr-1" />
            New Agent
          </Button>
        </div>
      </div>
      
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="w-full grid grid-cols-4">
          <TabsTrigger value="teams" className="flex items-center gap-1">
            <Users className="h-4 w-4" />
            <span>Teams</span>
          </TabsTrigger>
          <TabsTrigger value="workflow" className="flex items-center gap-1">
            <Activity className="h-4 w-4" />
            <span>Workflow</span>
          </TabsTrigger>
          <TabsTrigger value="monitor" className="flex items-center gap-1">
            <BarChart2 className="h-4 w-4" />
            <span>Monitor</span>
          </TabsTrigger>
          <TabsTrigger value="communication" className="flex items-center gap-1">
            <MessageSquare className="h-4 w-4" />
            <span>Communication</span>
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="teams" className="space-y-4 pt-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-1 space-y-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Agent Teams</CardTitle>
                  <CardDescription>
                    View and manage your agent teams
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="divide-y">
                    {isLoadingTeams ? (
                      Array.from({ length: 3 }).map((_, i) => (
                        <div key={i} className="p-4">
                          <div className="h-5 w-3/4 bg-muted rounded-md animate-pulse mb-2" />
                          <div className="h-4 w-1/2 bg-muted/60 rounded-md animate-pulse" />
                        </div>
                      ))
                    ) : teams.length > 0 ? (
                      teams.map((team) => (
                        <div 
                          key={team.id}
                          className={`p-4 cursor-pointer hover:bg-accent/40 transition-colors ${
                            selectedTeamId === team.id ? 'bg-accent/80' : ''
                          }`}
                          onClick={() => handleSelectTeam(team.id)}
                        >
                          <div className="flex items-center justify-between mb-1">
                            <h4 className="font-medium">{team.name}</h4>
                            {getStatusBadge(team.status)}
                          </div>
                          <p className="text-sm text-muted-foreground line-clamp-1">
                            {team.description}
                          </p>
                          <div className="flex items-center gap-1 mt-2">
                            <div className="flex -space-x-2">
                              {team.agents.slice(0, 3).map((agentId) => {
                                const agent = agents.find(a => a.id === agentId);
                                return (
                                  <Avatar key={agentId} className="h-6 w-6 border-2 border-background">
                                    <AvatarFallback className="text-[10px] bg-primary/10">
                                      {agent?.name.charAt(0) || 'A'}
                                    </AvatarFallback>
                                  </Avatar>
                                );
                              })}
                              {team.agents.length > 3 && (
                                <div className="flex h-6 w-6 items-center justify-center rounded-full border-2 border-background bg-muted text-xs">
                                  +{team.agents.length - 3}
                                </div>
                              )}
                            </div>
                            <span className="text-xs text-muted-foreground ml-1">
                              {team.agents.length} Agent{team.agents.length !== 1 ? 's' : ''}
                            </span>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="p-6 text-center">
                        <p className="text-sm text-muted-foreground">No agent teams available</p>
                        <Button variant="outline" size="sm" className="mt-2">
                          <PlusCircle className="h-4 w-4 mr-1" />
                          Create Team
                        </Button>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
            
            <div className="md:col-span-2 space-y-4">
              {selectedTeam ? (
                <>
                  <Card>
                    <CardHeader>
                      <div className="flex justify-between items-start">
                        <div>
                          <CardTitle>{selectedTeam.name}</CardTitle>
                          <CardDescription>{selectedTeam.description}</CardDescription>
                        </div>
                        {getStatusBadge(selectedTeam.status)}
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="bg-muted/50 p-3 rounded-lg">
                          <div className="text-xs text-muted-foreground">Win Rate</div>
                          <div className="text-lg font-medium mt-1">
                            {selectedTeam.performance_metrics.win_rate || 0}%
                          </div>
                        </div>
                        <div className="bg-muted/50 p-3 rounded-lg">
                          <div className="text-xs text-muted-foreground">Accuracy</div>
                          <div className="text-lg font-medium mt-1">
                            {selectedTeam.performance_metrics.accuracy || 0}%
                          </div>
                        </div>
                        <div className="bg-muted/50 p-3 rounded-lg">
                          <div className="text-xs text-muted-foreground">Avg Return</div>
                          <div className="text-lg font-medium mt-1">
                            {selectedTeam.performance_metrics.avg_return || 0}%
                          </div>
                        </div>
                        <div className="bg-muted/50 p-3 rounded-lg">
                          <div className="text-xs text-muted-foreground">Sharpe Ratio</div>
                          <div className="text-lg font-medium mt-1">
                            {selectedTeam.performance_metrics.sharpe_ratio || 0}
                          </div>
                        </div>
                      </div>
                      
                      <div>
                        <h4 className="text-sm font-medium mb-2">Team Agents</h4>
                        <div className="space-y-3">
                          {teamAgents.map((agent) => (
                            <div key={agent.id} className="flex items-center justify-between p-3 border rounded-lg">
                              <div className="flex items-center gap-3">
                                <Avatar className="h-8 w-8">
                                  <AvatarFallback className="bg-primary/10">
                                    {agent.name.charAt(0)}
                                  </AvatarFallback>
                                </Avatar>
                                <div>
                                  <div className="font-medium">{agent.name}</div>
                                  <div className="text-xs text-muted-foreground">
                                    {agent.type.replace('-', ' ')}
                                  </div>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                {getStatusBadge(agent.status)}
                                <div className="text-xs whitespace-nowrap">
                                  Score: {agent.performance_score}%
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </CardContent>
                    <CardFooter>
                      <div className="flex gap-2 w-full justify-end">
                        <Button variant="outline" size="sm">
                          <Settings className="h-4 w-4 mr-1" />
                          Configure
                        </Button>
                        {selectedTeam.status === 'active' ? (
                          <Button variant="outline" size="sm">
                            <AlertTriangle className="h-4 w-4 mr-1" />
                            Pause
                          </Button>
                        ) : (
                          <Button size="sm">
                            <Activity className="h-4 w-4 mr-1" />
                            Activate
                          </Button>
                        )}
                      </div>
                    </CardFooter>
                  </Card>
                </>
              ) : (
                <Card className="h-[400px] flex items-center justify-center">
                  <div className="text-center">
                    <Users className="h-12 w-12 text-muted-foreground mb-4 mx-auto" />
                    <h3 className="text-lg font-medium mb-2">No Team Selected</h3>
                    <p className="text-sm text-muted-foreground mb-4 max-w-md">
                      Select a team from the list to view details or create a new agent team to get started with orchestrating your trading agents.
                    </p>
                    <Button>
                      <PlusCircle className="h-4 w-4 mr-1" />
                      Create Team
                    </Button>
                  </div>
                </Card>
              )}
            </div>
          </div>
        </TabsContent>
        
        <TabsContent value="workflow" className="pt-4">
          <Card>
            <CardHeader>
              <CardTitle>Agent Workflow Builder</CardTitle>
              <CardDescription>
                Design workflows and collaboration patterns between agents
              </CardDescription>
            </CardHeader>
            <CardContent className="h-[500px] flex items-center justify-center">
              <div className="text-center">
                <Activity className="h-12 w-12 text-muted-foreground mb-4 mx-auto" />
                <h3 className="text-lg font-medium mb-2">Workflow Builder</h3>
                <p className="text-sm text-muted-foreground mb-4 max-w-md">
                  The full workflow builder will be implemented in the next sprint. This component will allow for drag-and-drop creation of agent workflows.
                </p>
                <Button disabled>Coming Soon</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="monitor" className="pt-4">
          <Card>
            <CardHeader>
              <CardTitle>Agent Status Monitor</CardTitle>
              <CardDescription>
                Monitor agent performance and status in real-time
              </CardDescription>
            </CardHeader>
            <CardContent className="h-[500px] flex items-center justify-center">
              <div className="text-center">
                <BarChart2 className="h-12 w-12 text-muted-foreground mb-4 mx-auto" />
                <h3 className="text-lg font-medium mb-2">Status Monitoring</h3>
                <p className="text-sm text-muted-foreground mb-4 max-w-md">
                  The full agent monitoring dashboard will be implemented in the next sprint. This component will show real-time performance metrics.
                </p>
                <Button disabled>Coming Soon</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="communication" className="pt-4">
          <Card>
            <CardHeader>
              <CardTitle>Agent Communication Log</CardTitle>
              <CardDescription>
                View and analyze inter-agent communication
              </CardDescription>
            </CardHeader>
            <CardContent className="h-[500px] flex items-center justify-center">
              <div className="text-center">
                <MessageSquare className="h-12 w-12 text-muted-foreground mb-4 mx-auto" />
                <h3 className="text-lg font-medium mb-2">Communication Log</h3>
                <p className="text-sm text-muted-foreground mb-4 max-w-md">
                  The full communication log viewer will be implemented in the next sprint. This component will display agent messages and interactions.
                </p>
                <Button disabled>Coming Soon</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
