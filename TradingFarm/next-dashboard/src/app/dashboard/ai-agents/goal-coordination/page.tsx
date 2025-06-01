'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'sonner';
import { format } from 'date-fns';

import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { ReloadIcon, ExternalLinkIcon, InfoCircledIcon } from '@radix-ui/react-icons';
import { Bot, Brain, Activity, Zap, ArrowUpRight } from 'lucide-react';

import { AgentMemoryViewer } from '@/components/goal-monitoring/agent-memory-viewer';

interface AgentCoordinationState {
  goalId: string;
  goalName: string;
  status: string;
  phase: string;
  activeAgents: Record<string, {
    role: string;
    lastCommand?: string;
    lastActivity: string;
  }>;
  selectedStrategy?: string;
  currentTransaction?: string;
  marketConditions?: Record<string, any>;
  isAdapting: boolean;
  agentsInfo: Record<string, {
    id: string;
    name: string;
    type: string;
    role: string;
    status: string;
  }>;
}

// Role badge mapping
const roleBadge = {
  'ANALYST': <Badge variant="outline" className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300">Analyst</Badge>,
  'EXECUTION': <Badge variant="outline" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300">Execution</Badge>,
  'MONITORING': <Badge variant="outline" className="bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300">Monitoring</Badge>,
};

// Phase badge mapping
const phaseBadge = {
  'PLANNING': <Badge variant="outline" className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300">Planning</Badge>,
  'EXECUTION': <Badge variant="outline" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300">Execution</Badge>,
  'MONITORING': <Badge variant="outline" className="bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300">Monitoring</Badge>,
  'ADAPTATION': <Badge variant="outline" className="bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-300">Adaptation</Badge>,
  'COMPLETION': <Badge variant="default">Completion</Badge>,
};

export default function GoalCoordinationPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [selectedGoalId, setSelectedGoalId] = useState<string | null>(null);
  const [coordinationStates, setCoordinationStates] = useState<Record<string, AgentCoordinationState>>({});
  
  // Fetch coordination states
  const fetchCoordinationStates = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/goals/acquisition/coordination');
      const result = await response.json();
      
      if (result.data) {
        setCoordinationStates(result.data);
        
        // Set the first goal as selected if none is selected
        if (!selectedGoalId && Object.keys(result.data).length > 0) {
          setSelectedGoalId(Object.keys(result.data)[0]);
        }
      }
    } catch (error) {
      console.error('Error fetching coordination states:', error);
      toast.error('Failed to load agent coordination data');
    } finally {
      setLoading(false);
    }
  };
  
  // Initial data fetch
  useEffect(() => {
    fetchCoordinationStates();
    
    // Set up a polling interval to refresh the data
    const intervalId = setInterval(() => {
      fetchCoordinationStates();
    }, 30000); // 30 seconds
    
    return () => clearInterval(intervalId);
  }, []);
  
  // Handle goal selection
  const handleGoalSelect = (goalId: string) => {
    setSelectedGoalId(goalId);
  };
  
  // Get the selected goal's coordination state
  const selectedState = selectedGoalId ? coordinationStates[selectedGoalId] : null;
  
  // Format date for display
  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), 'PPp');
    } catch (error) {
      return dateString;
    }
  };
  
  // Handle adapting strategy
  const handleAdaptStrategy = async () => {
    if (!selectedGoalId) return;
    
    try {
      const response = await fetch('/api/goals/acquisition/coordination', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          goalId: selectedGoalId,
          action: 'adaptStrategy'
        }),
      });
      
      const result = await response.json();
      
      if (response.ok && result.data) {
        toast.success('Adapting strategy for goal');
        // Refresh after a short delay
        setTimeout(() => fetchCoordinationStates(), 1000);
      } else {
        toast.error(result.error || 'Failed to adapt strategy');
      }
    } catch (error) {
      console.error('Error adapting strategy:', error);
      toast.error('Failed to adapt strategy');
    }
  };
  
  // Render loading skeleton
  if (loading && Object.keys(coordinationStates).length === 0) {
    return (
      <div className="container py-10">
        <div className="space-y-2 mb-6">
          <Skeleton className="h-8 w-96" />
          <Skeleton className="h-4 w-64" />
        </div>
        
        <div className="grid gap-6 grid-cols-1 md:grid-cols-3">
          <div className="md:col-span-1">
            <Skeleton className="h-[400px] w-full" />
          </div>
          <div className="md:col-span-2">
            <Skeleton className="h-[400px] w-full" />
          </div>
        </div>
      </div>
    );
  }
  
  return (
    <div className="container py-10">
      {/* Breadcrumbs */}
      <Breadcrumb className="mb-6">
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink href="/dashboard">Dashboard</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbLink href="/dashboard/ai-agents">AI Agents</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbLink href="/dashboard/ai-agents/goal-coordination">
              Goal Coordination
            </BreadcrumbLink>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>
      
      {/* Header */}
      <div className="flex justify-between items-start mb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">ElizaOS Agent Coordination</h1>
          <p className="text-muted-foreground">
            Monitor how AI agents work together to achieve acquisition goals
          </p>
        </div>
        
        <Button 
          variant="outline" 
          size="icon" 
          onClick={fetchCoordinationStates}
        >
          <ReloadIcon className="h-4 w-4" />
        </Button>
      </div>
      
      {Object.keys(coordinationStates).length > 0 ? (
        <div className="grid gap-6 grid-cols-1 md:grid-cols-3">
          {/* Goals Sidebar */}
          <div>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Zap className="mr-2 h-5 w-5" />
                  Active Goals
                </CardTitle>
                <CardDescription>
                  Goals with active agent coordination
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <div className="divide-y">
                  {Object.values(coordinationStates).map((state) => (
                    <div 
                      key={state.goalId}
                      className={`p-4 cursor-pointer hover:bg-muted/50 transition-colors ${selectedGoalId === state.goalId ? 'bg-muted' : ''}`}
                      onClick={() => handleGoalSelect(state.goalId)}
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="font-medium">{state.goalName}</h3>
                          <div className="flex items-center gap-2 mt-1">
                            {phaseBadge[state.phase as keyof typeof phaseBadge] || 
                              <Badge variant="outline">{state.phase}</Badge>}
                            <span className="text-xs text-muted-foreground">
                              {Object.keys(state.activeAgents).length} Agent{Object.keys(state.activeAgents).length !== 1 ? 's' : ''}
                            </span>
                          </div>
                        </div>
                        <Button 
                          variant="ghost" 
                          size="icon"
                          className="h-6 w-6"
                          asChild
                        >
                          <Link href={`/dashboard/goals/acquisition/${state.goalId}`}>
                            <ArrowUpRight className="h-4 w-4" />
                          </Link>
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
              <CardFooter className="justify-center p-4 border-t">
                <Button variant="outline" asChild className="w-full">
                  <Link href="/dashboard/goals/acquisition">
                    View All Goals
                  </Link>
                </Button>
              </CardFooter>
            </Card>
          </div>
          
          {/* Main Content */}
          <div className="md:col-span-2">
            {selectedState ? (
              <div className="space-y-6">
                {/* Goal Header */}
                <Card>
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="flex items-center">
                          {selectedState.goalName}
                        </CardTitle>
                        <CardDescription>
                          Current Phase: {selectedState.phase}
                        </CardDescription>
                      </div>
                      <div className="flex gap-2">
                        {selectedState.phase === 'EXECUTION' || selectedState.phase === 'MONITORING' ? (
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={handleAdaptStrategy}
                          >
                            <Activity className="mr-2 h-4 w-4" />
                            Adapt Strategy
                          </Button>
                        ) : null}
                        <Button 
                          variant="outline" 
                          size="sm"
                          asChild
                        >
                          <Link href={`/dashboard/goals/acquisition/${selectedState.goalId}`}>
                            View Details
                          </Link>
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                </Card>
                
                {/* Agent Coordination */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <Bot className="mr-2 h-5 w-5" />
                      Agent Coordination
                    </CardTitle>
                    <CardDescription>
                      How agents are working together on this goal
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Agent</TableHead>
                          <TableHead>Role</TableHead>
                          <TableHead>Last Command</TableHead>
                          <TableHead>Last Activity</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {Object.entries(selectedState.activeAgents).map(([agentId, agentData]) => {
                          const agentInfo = selectedState.agentsInfo?.[agentId];
                          return (
                            <TableRow key={agentId}>
                              <TableCell>
                                <div className="font-medium">
                                  {agentInfo?.name || `Agent ${agentId.substring(0, 8)}`}
                                </div>
                                <div className="text-xs text-muted-foreground">
                                  {agentInfo?.type || 'Unknown Type'}
                                </div>
                              </TableCell>
                              <TableCell>
                                {roleBadge[agentData.role as keyof typeof roleBadge] || 
                                  <Badge variant="outline">{agentData.role}</Badge>}
                              </TableCell>
                              <TableCell>
                                {agentData.lastCommand || 'No command yet'}
                              </TableCell>
                              <TableCell>
                                {agentData.lastActivity ? formatDate(agentData.lastActivity) : 'Never'}
                              </TableCell>
                              <TableCell>
                                <Dialog>
                                  <DialogTrigger asChild>
                                    <Button variant="ghost" size="sm">
                                      <Brain className="mr-2 h-4 w-4" />
                                      View Memories
                                    </Button>
                                  </DialogTrigger>
                                  <DialogContent className="max-w-3xl">
                                    <DialogHeader>
                                      <DialogTitle>Agent Memories</DialogTitle>
                                      <DialogDescription>
                                        Memories from {agentInfo?.name || `Agent ${agentId.substring(0, 8)}`} about this goal
                                      </DialogDescription>
                                    </DialogHeader>
                                    <div className="mt-4">
                                      <AgentMemoryViewer 
                                        goalId={selectedState.goalId} 
                                        maxMemories={20} 
                                      />
                                    </div>
                                  </DialogContent>
                                </Dialog>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
                
                {/* Market Conditions */}
                {selectedState.marketConditions && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center">
                        <Activity className="mr-2 h-5 w-5" />
                        Market Conditions
                      </CardTitle>
                      <CardDescription>
                        Current market data informing goal strategy
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="bg-muted/50 p-4 rounded whitespace-pre-wrap text-sm font-mono overflow-auto max-h-[400px]">
                        {JSON.stringify(selectedState.marketConditions, null, 2)}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            ) : (
              <Card className="h-full flex items-center justify-center">
                <CardContent className="py-12 text-center">
                  <Bot className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium mb-2">No Goal Selected</h3>
                  <p className="text-muted-foreground mb-6">
                    Select a goal from the sidebar to view agent coordination details
                  </p>
                  {Object.keys(coordinationStates).length === 0 && (
                    <div>
                      <p className="text-sm text-muted-foreground mb-4">
                        No active goals with agent coordination found
                      </p>
                      <Button asChild>
                        <Link href="/dashboard/goals/acquisition/create">
                          Create Acquisition Goal
                        </Link>
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      ) : (
        <Card className="text-center py-12">
          <CardContent>
            <Bot className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h2 className="text-xl font-semibold mb-2">No Active Goal Coordination</h2>
            <p className="text-muted-foreground mb-6">
              There are no goals with active ElizaOS agent coordination
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button asChild>
                <Link href="/dashboard/goals/acquisition/create">
                  Create New Goal
                </Link>
              </Button>
              <Button variant="outline" asChild>
                <Link href="/dashboard/goals/acquisition">
                  View Existing Goals
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
