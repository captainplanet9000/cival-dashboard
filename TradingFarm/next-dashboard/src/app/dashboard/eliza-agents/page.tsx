"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  Bot, 
  Plus, 
  SearchIcon, 
  ArrowUpDown, 
  PlayCircle, 
  PauseCircle, 
  StopCircle,
  MoreHorizontal
} from 'lucide-react';

// UI Components
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuLabel, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useToast } from '@/components/ui/use-toast';

// Service and Hooks
import { ElizaAgent, elizaOSAgentService } from '@/services/elizaos-agent-service';
import { useElizaAgents } from '@/hooks/useElizaAgents';
import { ElizaAgentCreationDialog } from '@/components/eliza/ElizaAgentCreationDialog';

export default function ElizaAgentsPage() {
  const { agents, loading, error, refreshAgents, controlAgent } = useElizaAgents();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [currentView, setCurrentView] = useState<'grid' | 'table'>('grid');
  const router = useRouter();
  const { toast } = useToast();

  // Handle agent control actions (start, stop, pause, resume)
  const handleControlAgent = async (agentId: string, action: 'start' | 'stop' | 'pause' | 'resume') => {
    try {
      await controlAgent(agentId, action);
      
      // Show success message
      const actionText = {
        'start': 'started',
        'stop': 'stopped',
        'pause': 'paused',
        'resume': 'resumed'
      }[action];
      
      toast({
        title: `Agent ${actionText}`,
        description: `Agent has been ${actionText} successfully`,
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : `Failed to ${action} agent`;
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive"
      });
    }
  };

  // Filter agents based on search term and status filter
  const filteredAgents = agents.filter(agent => {
    const matchesSearch = 
      agent.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (agent.config.agentType && agent.config.agentType.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesStatus = filterStatus === 'all' || agent.status === filterStatus;
    
    return matchesSearch && matchesStatus;
  });
  
  // Get status badge variant
  const getStatusVariant = (status: string): "default" | "destructive" | "outline" | "secondary" => {
    switch (status) {
      case 'active': return "default";
      case 'paused': return "secondary";
      case 'error': return "destructive";
      default: return "outline";
    }
  };

  // Get status display name
  const getStatusDisplay = (status: string): string => {
    switch (status) {
      case 'active': return "Active";
      case 'idle': return "Idle";
      case 'paused': return "Paused";
      case 'error': return "Error";
      case 'initializing': return "Initializing";
      default: return status;
    }
  };

  return (
    <div className="container mx-auto py-6">
      <div className="flex flex-col space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">ElizaOS Agents</h1>
            <p className="text-muted-foreground">
              Create and manage your AI agents for automated trading and market analysis
            </p>
          </div>
          <ElizaAgentCreationDialog onSuccess={refreshAgents} />
        </div>
        
        {/* Filters and View Controls */}
        <div className="flex flex-col md:flex-row items-center gap-4">
          <div className="relative w-full md:w-80">
            <SearchIcon className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search agents..."
              className="pl-8 w-full"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          
          <Select
            value={filterStatus}
            onValueChange={(value) => setFilterStatus(value)}
          >
            <SelectTrigger className="w-full md:w-40">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="idle">Idle</SelectItem>
              <SelectItem value="paused">Paused</SelectItem>
              <SelectItem value="error">Error</SelectItem>
              <SelectItem value="initializing">Initializing</SelectItem>
            </SelectContent>
          </Select>
          
          <div className="ml-auto">
            <Tabs 
              value={currentView} 
              onValueChange={(value) => setCurrentView(value as 'grid' | 'table')}
              className="w-[200px]"
            >
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="grid">Grid View</TabsTrigger>
                <TabsTrigger value="table">Table View</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </div>

        {/* Error State */}
        {error && (
          <Alert variant="destructive">
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>
              {error}
            </AlertDescription>
          </Alert>
        )}

        {/* Loading State */}
        {loading && (
          currentView === 'grid' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(6)].map((_, i) => (
                <Card key={i} className="overflow-hidden">
                  <CardHeader className="pb-0">
                    <Skeleton className="h-4 w-1/2 mb-2" />
                    <Skeleton className="h-3 w-3/4" />
                  </CardHeader>
                  <CardContent className="pb-3 pt-6">
                    <div className="space-y-3">
                      <Skeleton className="h-3 w-full" />
                      <Skeleton className="h-3 w-full" />
                      <Skeleton className="h-3 w-3/4" />
                    </div>
                  </CardContent>
                  <CardFooter className="border-t px-6 py-4 flex justify-between">
                    <Skeleton className="h-8 w-20" />
                    <Skeleton className="h-8 w-32" />
                  </CardFooter>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Farm</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {[...Array(5)].map((_, i) => (
                      <TableRow key={i}>
                        <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                        <TableCell><Skeleton className="h-6 w-16" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                        <TableCell><Skeleton className="h-8 w-20" /></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )
        )}
        
        {/* Empty State */}
        {!loading && filteredAgents.length === 0 && (
          <Card>
            <CardContent className="flex flex-col items-center justify-center p-6 text-center">
              <Bot className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold">No agents found</h3>
              <p className="text-muted-foreground mt-1 mb-4">
                {agents.length === 0 
                  ? "Get started by creating your first ElizaOS agent" 
                  : "No agents match your current filters"
                }
              </p>
              {agents.length === 0 ? (
                <ElizaAgentCreationDialog 
                  buttonText="Create First Agent" 
                  onSuccess={refreshAgents} 
                />
              ) : (
                <Button variant="outline" onClick={() => {
                  setSearchTerm('');
                  setFilterStatus('all');
                }}>
                  Clear Filters
                </Button>
              )}
            </CardContent>
          </Card>
        )}
        
        {/* Data Display - Grid View */}
        {!loading && filteredAgents.length > 0 && currentView === 'grid' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredAgents.map((agent) => (
              <Card key={agent.id} className="overflow-hidden">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <Badge variant={getStatusVariant(agent.status)}>
                      {getStatusDisplay(agent.status)}
                    </Badge>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                        <DropdownMenuItem onClick={() => router.push(`/dashboard/agents/${agent.id}`)}>
                          View Details
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        {agent.status !== 'active' && (
                          <DropdownMenuItem onClick={() => handleControlAgent(agent.id, 'start')}>
                            Start Agent
                          </DropdownMenuItem>
                        )}
                        {agent.status === 'active' && (
                          <DropdownMenuItem onClick={() => handleControlAgent(agent.id, 'pause')}>
                            Pause Agent
                          </DropdownMenuItem>
                        )}
                        {agent.status === 'paused' && (
                          <DropdownMenuItem onClick={() => handleControlAgent(agent.id, 'resume')}>
                            Resume Agent
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem onClick={() => handleControlAgent(agent.id, 'stop')}>
                          Stop Agent
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                  <CardTitle className="mt-2">{agent.name}</CardTitle>
                  <CardDescription>
                    {agent.config.agentType || 'Trading Agent'}
                  </CardDescription>
                </CardHeader>
                <CardContent className="pb-2">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Risk Level:</span>
                      <span className="font-medium">{agent.config.risk_level || 'Medium'}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Farm:</span>
                      <span className="font-medium">Farm {agent.farmId}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Created:</span>
                      <span className="font-medium">
                        {new Date(agent.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                  
                  {agent.config.markets && agent.config.markets.length > 0 && (
                    <div className="mt-4">
                      <p className="text-sm font-medium mb-2">Markets:</p>
                      <div className="flex flex-wrap gap-1">
                        {agent.config.markets.slice(0, 3).map((market) => (
                          <Badge key={market} variant="secondary">
                            {market}
                          </Badge>
                        ))}
                        {agent.config.markets.length > 3 && (
                          <Badge variant="secondary">+{agent.config.markets.length - 3} more</Badge>
                        )}
                      </div>
                    </div>
                  )}
                </CardContent>
                <CardFooter className="border-t px-6 py-4 mt-2">
                  <div className="flex justify-between items-center w-full">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => router.push(`/dashboard/agents/${agent.id}`)}
                    >
                      View Details
                    </Button>
                    <div className="flex items-center gap-2">
                      {agent.status !== 'active' && (
                        <Button 
                          size="icon" 
                          variant="outline"
                          onClick={() => handleControlAgent(agent.id, 'start')}
                        >
                          <PlayCircle className="h-4 w-4" />
                        </Button>
                      )}
                      {agent.status === 'active' && (
                        <Button 
                          size="icon" 
                          variant="outline"
                          onClick={() => handleControlAgent(agent.id, 'pause')}
                        >
                          <PauseCircle className="h-4 w-4" />
                        </Button>
                      )}
                      {agent.status === 'paused' && (
                        <Button 
                          size="icon" 
                          variant="outline"
                          onClick={() => handleControlAgent(agent.id, 'resume')}
                        >
                          <PlayCircle className="h-4 w-4" />
                        </Button>
                      )}
                      <Button 
                        size="icon" 
                        variant="outline"
                        onClick={() => handleControlAgent(agent.id, 'stop')}
                      >
                        <StopCircle className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardFooter>
              </Card>
            ))}
          </div>
        )}
        
        {/* Data Display - Table View */}
        {!loading && filteredAgents.length > 0 && currentView === 'table' && (
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[200px]">
                      <div className="flex items-center space-x-1">
                        <span>Name</span>
                        <ArrowUpDown className="h-3 w-3" />
                      </div>
                    </TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Farm</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredAgents.map((agent) => (
                    <TableRow key={agent.id} className="cursor-pointer hover:bg-muted/50" onClick={() => router.push(`/dashboard/agents/${agent.id}`)}>
                      <TableCell className="font-medium">{agent.name}</TableCell>
                      <TableCell>{agent.config.agentType || 'Trading Agent'}</TableCell>
                      <TableCell>
                        <Badge variant={getStatusVariant(agent.status)}>
                          {getStatusDisplay(agent.status)}
                        </Badge>
                      </TableCell>
                      <TableCell>Farm {agent.farmId}</TableCell>
                      <TableCell>{new Date(agent.created_at).toLocaleDateString()}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                          {agent.status !== 'active' && (
                            <Button 
                              size="icon" 
                              variant="outline"
                              onClick={() => handleControlAgent(agent.id, 'start')}
                            >
                              <PlayCircle className="h-4 w-4" />
                            </Button>
                          )}
                          {agent.status === 'active' && (
                            <Button 
                              size="icon" 
                              variant="outline"
                              onClick={() => handleControlAgent(agent.id, 'pause')}
                            >
                              <PauseCircle className="h-4 w-4" />
                            </Button>
                          )}
                          {agent.status === 'paused' && (
                            <Button 
                              size="icon" 
                              variant="outline"
                              onClick={() => handleControlAgent(agent.id, 'resume')}
                            >
                              <PlayCircle className="h-4 w-4" />
                            </Button>
                          )}
                          <Button 
                            size="icon" 
                            variant="outline"
                            onClick={() => handleControlAgent(agent.id, 'stop')}
                          >
                            <StopCircle className="h-4 w-4" />
                          </Button>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuLabel>Actions</DropdownMenuLabel>
                              <DropdownMenuItem onClick={() => router.push(`/dashboard/agents/${agent.id}`)}>
                                View Details
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
