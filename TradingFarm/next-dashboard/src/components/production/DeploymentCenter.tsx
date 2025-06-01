"use client";

import React, { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { 
  GitBranch, 
  GitCommit, 
  GitPullRequest,
  Settings,
  Play, 
  CheckCircle, 
  XCircle, 
  Clock,
  AlertCircle,
  RotateCw,
  Upload,
  Server,
  ArrowRight,
  ArrowUpDown,
  Calendar,
  Users
} from "lucide-react";

interface DeploymentCenterProps {
  onDeployAgent?: (agentId: string, environmentId: string) => void;
  onRollbackDeployment?: (deploymentId: string) => void;
}

export function DeploymentCenter({
  onDeployAgent,
  onRollbackDeployment
}: DeploymentCenterProps) {
  // State
  const [activeTab, setActiveTab] = useState("agents");
  const [deploying, setDeploying] = useState(false);
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);
  const [selectedEnvironmentId, setSelectedEnvironmentId] = useState<string | null>(null);
  
  // Mock data
  const agents = [
    {
      id: "agent-1",
      name: "Momentum Trader v2.1",
      description: "Trend following agent using momentum indicators",
      version: "2.1.5",
      status: "ready",
      lastUpdated: "2025-04-11T15:32:00Z",
      deployedEnvironments: ["staging"],
      metrics: {
        winRate: 68.2,
        profitFactor: 1.85,
        sharpeRatio: 1.42,
        maxDrawdown: 9.8
      },
      approvals: {
        performance: true,
        risk: true,
        compliance: true
      }
    },
    {
      id: "agent-2",
      name: "Mean Reversion Specialist v1.8",
      description: "Identifies and trades price reversions to the mean",
      version: "1.8.2",
      status: "ready",
      lastUpdated: "2025-04-10T09:15:00Z",
      deployedEnvironments: ["production", "staging"],
      metrics: {
        winRate: 62.5,
        profitFactor: 1.71,
        sharpeRatio: 1.38,
        maxDrawdown: 12.4
      },
      approvals: {
        performance: true,
        risk: true,
        compliance: true
      }
    },
    {
      id: "agent-3",
      name: "Volatility Harvester v1.2",
      description: "Capitalizes on market volatility and price swings",
      version: "1.2.7",
      status: "testing",
      lastUpdated: "2025-04-12T10:42:00Z",
      deployedEnvironments: [],
      metrics: {
        winRate: 58.6,
        profitFactor: 1.62,
        sharpeRatio: 1.15,
        maxDrawdown: 14.2
      },
      approvals: {
        performance: true,
        risk: false,
        compliance: true
      }
    },
    {
      id: "agent-4",
      name: "Breakout Hunter v0.9",
      description: "Identifies and trades price breakouts",
      version: "0.9.5",
      status: "development",
      lastUpdated: "2025-04-12T14:20:00Z",
      deployedEnvironments: [],
      metrics: {
        winRate: 54.2,
        profitFactor: 1.44,
        sharpeRatio: 0.95,
        maxDrawdown: 18.7
      },
      approvals: {
        performance: false,
        risk: false,
        compliance: false
      }
    }
  ];
  
  const environments = [
    {
      id: "env-1",
      name: "Production",
      description: "Live trading environment with real assets",
      status: "active",
      agents: 2,
      resources: "High performance dedicated servers",
      lastDeployment: "2025-04-10T14:30:00Z"
    },
    {
      id: "env-2",
      name: "Staging",
      description: "Pre-production environment with limited trading",
      status: "active",
      agents: 3,
      resources: "Medium performance shared servers",
      lastDeployment: "2025-04-12T09:15:00Z"
    },
    {
      id: "env-3",
      name: "Testing",
      description: "Paper trading environment for final testing",
      status: "active",
      agents: 1,
      resources: "Standard performance shared servers",
      lastDeployment: "2025-04-12T11:45:00Z"
    },
    {
      id: "env-4",
      name: "Development",
      description: "Development environment for initial agent testing",
      status: "maintenance",
      agents: 4,
      resources: "Limited resources, shared infrastructure",
      lastDeployment: "2025-04-11T16:20:00Z"
    }
  ];
  
  const deployments = [
    {
      id: "deploy-1",
      agentId: "agent-2",
      agentName: "Mean Reversion Specialist v1.8",
      environmentId: "env-1",
      environmentName: "Production",
      status: "active",
      deployedAt: "2025-04-10T14:30:00Z",
      deployedBy: "Jane Smith",
      version: "1.8.2",
      metrics: {
        uptime: "2d 3h 42m",
        performance: "Normal",
        trades: 38,
        successRate: 65.7
      }
    },
    {
      id: "deploy-2",
      agentId: "agent-1",
      agentName: "Momentum Trader v2.1",
      environmentId: "env-2",
      environmentName: "Staging",
      status: "active",
      deployedAt: "2025-04-11T15:32:00Z",
      deployedBy: "John Doe",
      version: "2.1.5",
      metrics: {
        uptime: "1d 2h 25m",
        performance: "Above Average",
        trades: 24,
        successRate: 70.8
      }
    },
    {
      id: "deploy-3",
      agentId: "agent-2",
      agentName: "Mean Reversion Specialist v1.8",
      environmentId: "env-2",
      environmentName: "Staging",
      status: "active",
      deployedAt: "2025-04-10T09:15:00Z",
      deployedBy: "Jane Smith",
      version: "1.8.2",
      metrics: {
        uptime: "2d 8h 52m",
        performance: "Normal",
        trades: 42,
        successRate: 64.3
      }
    },
    {
      id: "deploy-4",
      agentId: "agent-3",
      agentName: "Volatility Harvester v1.2",
      environmentId: "env-3",
      environmentName: "Testing",
      status: "active",
      deployedAt: "2025-04-12T11:45:00Z",
      deployedBy: "Mike Johnson",
      version: "1.2.7",
      metrics: {
        uptime: "5h 28m",
        performance: "Below Average",
        trades: 12,
        successRate: 50.0
      }
    }
  ];
  
  // Format date
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString();
  };
  
  // Deploy agent
  const handleDeploy = () => {
    if (!selectedAgentId || !selectedEnvironmentId) return;
    
    setDeploying(true);
    
    // Simulate deployment process
    setTimeout(() => {
      setDeploying(false);
      setSelectedAgentId(null);
      setSelectedEnvironmentId(null);
      
      if (onDeployAgent) {
        onDeployAgent(selectedAgentId, selectedEnvironmentId);
      }
    }, 2500);
  };
  
  // Get status badge
  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active":
        return <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/20">Active</Badge>;
      case "ready":
        return <Badge variant="outline" className="bg-blue-500/10 text-blue-500 border-blue-500/20">Ready</Badge>;
      case "testing":
        return <Badge variant="outline" className="bg-amber-500/10 text-amber-500 border-amber-500/20">Testing</Badge>;
      case "development":
        return <Badge variant="outline" className="bg-purple-500/10 text-purple-500 border-purple-500/20">Development</Badge>;
      case "maintenance":
        return <Badge variant="outline" className="bg-orange-500/10 text-orange-500 border-orange-500/20">Maintenance</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };
  
  // Get approval status icon
  const getApprovalIcon = (approved: boolean) => {
    return approved ? 
      <CheckCircle className="h-4 w-4 text-green-500" /> : 
      <XCircle className="h-4 w-4 text-red-500" />;
  };
  
  // Check if agent is deployable
  const isDeployable = (agent: any) => {
    return agent.status === "ready" && 
           agent.approvals.performance && 
           agent.approvals.risk && 
           agent.approvals.compliance;
  };
  
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Deployment Center</h2>
          <p className="text-muted-foreground">
            Deploy and manage trading agents across environments
          </p>
        </div>
        
        <div className="flex space-x-2">
          <Button 
            onClick={handleDeploy}
            disabled={!selectedAgentId || !selectedEnvironmentId || deploying}
          >
            {deploying ? (
              <>
                <RotateCw className="h-4 w-4 mr-2 animate-spin" />
                Deploying...
              </>
            ) : (
              <>
                <Upload className="h-4 w-4 mr-2" />
                Deploy Agent
              </>
            )}
          </Button>
        </div>
      </div>
      
      <Card className="p-6">
        <div className="flex items-center space-x-4">
          <div className="flex-1">
            <div className="text-sm font-medium">Select Agent</div>
            <select 
              className="w-full mt-1 p-2 rounded-md border border-input bg-background"
              value={selectedAgentId || ""}
              onChange={(e) => setSelectedAgentId(e.target.value)}
            >
              <option value="">Choose an agent to deploy...</option>
              {agents.filter(isDeployable).map(agent => (
                <option key={agent.id} value={agent.id}>
                  {agent.name} (v{agent.version})
                </option>
              ))}
            </select>
          </div>
          
          <ArrowRight className="h-6 w-6 text-muted-foreground" />
          
          <div className="flex-1">
            <div className="text-sm font-medium">Select Environment</div>
            <select 
              className="w-full mt-1 p-2 rounded-md border border-input bg-background"
              value={selectedEnvironmentId || ""}
              onChange={(e) => setSelectedEnvironmentId(e.target.value)}
              disabled={!selectedAgentId}
            >
              <option value="">Choose deployment environment...</option>
              {environments.filter(env => env.status === "active").map(env => (
                <option key={env.id} value={env.id}>
                  {env.name}
                </option>
              ))}
            </select>
          </div>
        </div>
        
        {deploying && (
          <div className="mt-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span>Deploying agent...</span>
              <span>45%</span>
            </div>
            <Progress value={45} className="h-2" />
          </div>
        )}
      </Card>
      
      <Tabs defaultValue="agents" value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="agents">
            <Users className="h-4 w-4 mr-2" />
            Trading Agents
          </TabsTrigger>
          <TabsTrigger value="environments">
            <Server className="h-4 w-4 mr-2" />
            Environments
          </TabsTrigger>
          <TabsTrigger value="deployments">
            <GitPullRequest className="h-4 w-4 mr-2" />
            Active Deployments
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="agents" className="mt-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle>Available Trading Agents</CardTitle>
              <CardDescription>
                AI agents ready for deployment to trading environments
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Agent</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Version</TableHead>
                    <TableHead>Performance</TableHead>
                    <TableHead>Approvals</TableHead>
                    <TableHead>Environments</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {agents.map((agent) => (
                    <TableRow key={agent.id}>
                      <TableCell>
                        <div className="font-medium">{agent.name}</div>
                        <div className="text-xs text-muted-foreground">{agent.description}</div>
                      </TableCell>
                      <TableCell>
                        {getStatusBadge(agent.status)}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center">
                          <GitCommit className="h-4 w-4 mr-1 text-muted-foreground" />
                          <span>v{agent.version}</span>
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Updated {formatDate(agent.lastUpdated)}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1 text-xs">
                          <div className="flex justify-between">
                            <span>Win Rate:</span>
                            <span className="font-medium">{agent.metrics.winRate}%</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Profit Factor:</span>
                            <span className="font-medium">{agent.metrics.profitFactor}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Sharpe Ratio:</span>
                            <span className="font-medium">{agent.metrics.sharpeRatio}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Max Drawdown:</span>
                            <span className="font-medium">{agent.metrics.maxDrawdown}%</span>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1 text-xs">
                          <div className="flex items-center">
                            {getApprovalIcon(agent.approvals.performance)}
                            <span className="ml-1">Performance</span>
                          </div>
                          <div className="flex items-center">
                            {getApprovalIcon(agent.approvals.risk)}
                            <span className="ml-1">Risk</span>
                          </div>
                          <div className="flex items-center">
                            {getApprovalIcon(agent.approvals.compliance)}
                            <span className="ml-1">Compliance</span>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {agent.deployedEnvironments.length > 0 ? agent.deployedEnvironments.map((env, i) => (
                            <Badge key={i} variant="outline" className="capitalize">{env}</Badge>
                          )) : (
                            <span className="text-xs text-muted-foreground">Not deployed</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end space-x-2">
                          <Button 
                            variant="outline" 
                            size="sm"
                            disabled={!isDeployable(agent)}
                            onClick={() => setSelectedAgentId(agent.id)}
                          >
                            Deploy
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="environments" className="mt-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle>Deployment Environments</CardTitle>
              <CardDescription>
                Available environments for agent deployment
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                {environments.map((env) => (
                  <Card key={env.id} className="border-2">
                    <CardHeader className="pb-2">
                      <div className="flex justify-between items-start">
                        <CardTitle className="text-base">{env.name}</CardTitle>
                        {getStatusBadge(env.status)}
                      </div>
                      <CardDescription>{env.description}</CardDescription>
                    </CardHeader>
                    <CardContent className="pb-2">
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Deployed Agents:</span>
                          <span className="font-medium">{env.agents}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Resources:</span>
                          <span className="font-medium">{env.resources}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Last Deployment:</span>
                          <span className="font-medium">{formatDate(env.lastDeployment)}</span>
                        </div>
                      </div>
                    </CardContent>
                    <CardFooter className="pt-0">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="w-full"
                        disabled={env.status !== "active"}
                        onClick={() => setSelectedEnvironmentId(env.id)}
                      >
                        Select Environment
                      </Button>
                    </CardFooter>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="deployments" className="mt-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle>Active Deployments</CardTitle>
              <CardDescription>
                Currently active agent deployments across environments
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Environment</TableHead>
                    <TableHead>Agent</TableHead>
                    <TableHead>Deployed</TableHead>
                    <TableHead>Version</TableHead>
                    <TableHead>Metrics</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {deployments.map((deployment) => (
                    <TableRow key={deployment.id}>
                      <TableCell>
                        <div className="font-medium">{deployment.environmentName}</div>
                        <div className="text-xs text-muted-foreground">{deployment.status}</div>
                      </TableCell>
                      <TableCell>
                        <div className="font-medium">{deployment.agentName}</div>
                        <div className="text-xs text-muted-foreground">ID: {deployment.agentId}</div>
                      </TableCell>
                      <TableCell>
                        <div>
                          {formatDate(deployment.deployedAt)}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          By: {deployment.deployedBy}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">v{deployment.version}</Badge>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1 text-xs">
                          <div className="flex justify-between">
                            <span>Uptime:</span>
                            <span className="font-medium">{deployment.metrics.uptime}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Performance:</span>
                            <span className="font-medium">{deployment.metrics.performance}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Trades:</span>
                            <span className="font-medium">{deployment.metrics.trades}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Success Rate:</span>
                            <span className="font-medium">{deployment.metrics.successRate}%</span>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end space-x-2">
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => onRollbackDeployment && onRollbackDeployment(deployment.id)}
                          >
                            Rollback
                          </Button>
                          <Button variant="outline" size="sm">
                            <Settings className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
