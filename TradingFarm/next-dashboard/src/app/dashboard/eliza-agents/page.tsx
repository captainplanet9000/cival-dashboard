"use client";

// @ts-ignore - React will be correctly imported by Next.js
import React from 'react';
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
  MoreHorizontal,
  AlertTriangle,
  Info
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

// Import the unified dialog instead of the separate one
import { UnifiedAgentCreationDialog } from "@/components/agents/unified-agent-creation-dialog";

// Service and Hooks
import { ElizaAgent, elizaOSAgentService } from '@/services/elizaos-agent-service';
// Using our robust hook with fallback to mock data
import { useElizaAgentsWithFallback, AgentWithFallback } from '@/hooks/useElizaAgentsWithFallback';

export default function ElizaAgentsPage() {
  // Using our robust hook that falls back to mock data when authentication fails
  const { agents, loading, error, refreshAgents, controlAgent, usingMockData } = useElizaAgentsWithFallback();
  const [searchTerm, setSearchTerm] = React.useState('');
  const [filterStatus, setFilterStatus] = React.useState<string>('all');
  const [currentView, setCurrentView] = React.useState<'grid' | 'table'>('grid');
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
      (agent.config?.agentType && agent.config.agentType.toLowerCase().includes(searchTerm.toLowerCase()));
    
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
            <h1 className="text-2xl font-bold tracking-tight">ElizaOS Agents</h1>
            <p className="text-muted-foreground">
              Manage your autonomous AI-powered trading agents
            </p>
            {usingMockData && (
              <div className="mt-2">
                <Badge variant="outline" className="bg-amber-100 text-amber-800 border-amber-300">
                  Demo Mode
                </Badge>
                <p className="text-xs text-muted-foreground mt-1">
                  Using demonstration data. Actual data will appear when you log in.
                </p>
              </div>
            )}
          </div>
          <div className="flex gap-2">
            <Button asChild className="bg-green-600 hover:bg-green-700 text-lg py-6 px-8 shadow-lg">
              <Link href="/dashboard/eliza-agents/create" className="gap-2">
                <Plus className="h-5 w-5" />
                Create Agent
              </Link>
            </Button>
          </div>
        </div>
        
        {/* Filters and View Controls */}
        <div className="flex flex-col md:flex-row items-center gap-4">
          <div className="flex items-center gap-4">
            <div className="relative w-full md:w-80">
              <SearchIcon className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search agents..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8 w-full"
              />
            </div>
            <Button asChild variant="outline">
              <Link href="/dashboard/eliza-agents/create" className="gap-2">
                <Bot className="h-4 w-4" />
                Create Agent
              </Link>
            </Button>
            <Select
              value={filterStatus}
              onValueChange={(value: string) => setFilterStatus(value)}
            >
              <SelectTrigger className="w-full md:w-40">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="paused">Paused</SelectItem>
                <SelectItem value="idle">Idle</SelectItem>
                <SelectItem value="error">Error</SelectItem>
                <SelectItem value="initializing">Initializing</SelectItem>
              </SelectContent>
            </Select>
          </div>
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
        {error && !loading && agents.length === 0 && (
          <Alert variant="destructive" className="mt-6">
            <AlertTitle className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              Error loading agents
            </AlertTitle>
            <AlertDescription className="mt-2">
              <p>{typeof error === 'object' && error !== null && 'message' in error ? (error as Error).message : String(error) || 'There was a problem loading your agents'}</p>
              <Button onClick={refreshAgents} variant="outline" size="sm" className="mt-2">
                Try again
              </Button>
            </AlertDescription>
          </Alert>
        )}

        {/* Loading State */}
        {loading && (
          <div className="flex flex-col items-center justify-center min-h-[400px]">
            <Skeleton className="h-32 w-32 rounded-full" />
            <h3 className="mt-4 text-lg font-medium">Loading agents...</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Please wait while we fetch your ElizaOS agents
            </p>
          </div>
        )}
        
        {/* Empty State */}
        {!loading && !error && agents.length === 0 && (
          <Card>
            <CardContent className="p-8 flex flex-col items-center justify-center text-center">
              <Bot className="h-16 w-16 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium">No ElizaOS agents found</h3>
              <p className="text-sm text-muted-foreground my-2 max-w-md">
                Create your first AI-powered agent to start automating your trading strategies.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 mt-4">
                <Button 
                  onClick={() => document.getElementById('create-agent-trigger')?.click()}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Create with Dialog
                </Button>
                <Button asChild variant="outline">
                  <Link href="/dashboard/eliza-agents/new">
                    <Bot className="h-4 w-4 mr-2" />
                    Create with Form
                  </Link>
                </Button>
              </div>
              {usingMockData && (
                <Alert className="mt-6 max-w-lg">
                  <AlertTitle className="flex items-center gap-2">
                    <Info className="h-4 w-4" />
                    Demo Mode Active
                  </AlertTitle>
                  <AlertDescription>
                    You're seeing demo data because you're not authenticated or the server connection failed. 
                    Some functionality may be limited.
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
        )}
        
        {/* Data Display - Grid View */}
        {!loading && filteredAgents.length > 0 && currentView === 'grid' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredAgents.map((agent: AgentWithFallback) => (
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
                    {agent.config?.agentType || 'Trading Agent'}
                  </CardDescription>
                </CardHeader>
                <CardContent className="pb-2">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Risk Level:</span>
                      <span className="font-medium">{agent.config?.risk_level || 'Medium'}</span>
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
                  
                  {agent.config?.markets && agent.config.markets.length > 0 && (
                    <div className="mt-4">
                      <p className="text-sm font-medium mb-2">Markets:</p>
                      <div className="flex flex-wrap gap-1">
                        {agent.config.markets.slice(0, 3).map((market: string) => (
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
                  {filteredAgents.map((agent: AgentWithFallback) => (
                    <TableRow key={agent.id} className="cursor-pointer hover:bg-muted/50" onClick={() => router.push(`/dashboard/agents/${agent.id}`)}>
                      <TableCell className="font-medium">{agent.name}</TableCell>
                      <TableCell>{agent.config?.agentType || 'Trading Agent'}</TableCell>
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
