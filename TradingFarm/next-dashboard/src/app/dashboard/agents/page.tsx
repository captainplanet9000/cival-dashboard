"use client";

import React from "react";
import Link from "next/link";
import { useAgents } from '@/hooks/use-agents';
import { useFarms } from '@/hooks/use-farms';
import { useStrategies } from '@/hooks/use-strategies';

// Define Agent type if not exported from hooks
interface Agent {
  id: string;
  name: string;
  agent_type: string | null;
  status: string | null;
  farm_id: string | null;
  strategy_id: string | null;
  last_active_at?: string;
};

interface Farm {
  id: string;
  name: string | null;
}

interface Strategy {
  id: string;
  name: string | null;
}

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Users, ChevronDown, ChevronUp, Activity } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from '@/components/ui/skeleton';
import { AlertCircle, PlusCircle, ArrowRight, Loader2, Info, AlertTriangle, CheckCircle, PauseCircle, Edit } from 'lucide-react';
import { Badge } from "@/components/ui/badge";
import { formatDistanceToNow } from 'date-fns';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import AgentMonitoringWidget from "@/components/dashboard/widgets/AgentMonitoringWidget";

// Simplified Agent status badge component with tooltip
const AgentStatusBadge = ({ status, tooltipText }: { status: string, tooltipText?: string }) => {
  // Normalize status for case-insensitive comparison
  const normalizedStatus = status?.toLowerCase() || 'unknown';

  const getStatusProps = () => {
    switch (normalizedStatus) {
      case 'active':
        return { color: 'bg-green-100 text-green-700 border-green-200', icon: <CheckCircle className="h-3.5 w-3.5 mr-1" /> };
      case 'paused': // Assuming 'paused' might be a status
        return { color: 'bg-yellow-100 text-yellow-700 border-yellow-200', icon: <PauseCircle className="h-3.5 w-3.5 mr-1" /> };
      case 'inactive':
        return { color: 'bg-gray-100 text-gray-700 border-gray-200', icon: <AlertCircle className="h-3.5 w-3.5 mr-1" /> };
      case 'initializing': // Assuming 'initializing' might be a status
        return { color: 'bg-blue-100 text-blue-700 border-blue-200', icon: <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> };
      case 'error':
        return { color: 'bg-red-100 text-red-700 border-red-200', icon: <AlertTriangle className="h-3.5 w-3.5 mr-1" /> };
      default: // Handle unknown or other statuses
        return { color: 'bg-gray-100 text-gray-700 border-gray-200', icon: <Info className="h-3.5 w-3.5 mr-1" /> };
    }
  };

  const { color, icon } = getStatusProps();
  const displayStatus = status || 'Unknown';

  const content = (
    <Badge className={`${color} flex items-center px-2 py-0.5 text-xs font-medium rounded-full border whitespace-nowrap`}>
      {icon}
      <span className="capitalize">{displayStatus}</span>
    </Badge>
  );

  if (tooltipText) {
    return (
      <div className="p-6">
        <TooltipProvider delayDuration={300}>
          <Tooltip>
            <TooltipTrigger asChild>
              {content}
            </TooltipTrigger>
            <TooltipContent>
              <p>{tooltipText}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
    );
  }

  return content;
};


// --- Bulk Assignment Modal ---
interface BulkAssignDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  agents: Agent[];
  farms: Farm[];
  strategies: Strategy[];
  onAssign: (agentIds: string[], farmId: string, strategyId: string) => void;
}

const BulkAssignAgentsDialog = ({ agents, farms, strategies, onAssign }: Omit<BulkAssignDialogProps, 'open' | 'onOpenChange'>) => {
  const [selectedAgents, setSelectedAgents] = React.useState<string[]>([]);
  const [selectedFarm, setSelectedFarm] = React.useState<string>("");
  const [selectedStrategy, setSelectedStrategy] = React.useState<string>("");

  // Reset selection when component mounts
  React.useEffect(() => {
    setSelectedAgents([]);
    setSelectedFarm("");
    setSelectedStrategy("");
  }, []);

  const handleAgentToggle = (id: string) => {
    setSelectedAgents((prev: string[]) => prev.includes(id) ? prev.filter((a: string) => a !== id) : [...prev, id]);
  };

  const handleAssign = () => {
    if (selectedAgents.length && (selectedFarm || selectedStrategy)) {
      onAssign(selectedAgents, selectedFarm, selectedStrategy);
    }
  };

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-medium">Bulk Assign Agents</h3>
      <p className="text-sm text-muted-foreground">Assign multiple agents to a farm or strategy at once.</p>
      <div className="grid grid-cols-4 gap-4">
        <div className="col-span-4">
          <div className="text-sm font-medium mb-2">Select Agents</div>
          <div className="border rounded-md p-3 space-y-2 max-h-[200px] overflow-y-auto">
            {agents.map((agent) => (
              <div key={agent.id} className="flex items-center space-x-2">
                <Checkbox 
                  id={`agent-${agent.id}`} 
                  checked={selectedAgents.includes(agent.id)}
                  onCheckedChange={() => handleAgentToggle(agent.id)}
                />
                <label htmlFor={`agent-${agent.id}`} className="text-sm font-medium cursor-pointer flex-grow">
                  {agent.name || agent.id.substring(0, 8) + "..."}
                  <span className="text-xs text-muted-foreground ml-2">{String(agent.agent_type)}</span>
                </label>
              </div>
            ))}
          </div>
        </div>
        <div className="flex-1 flex flex-col gap-4">
          <div className="col-span-4 sm:col-span-2">
            <div className="text-sm font-medium mb-2">Assign to Farm</div>
            <select value={selectedFarm} onChange={e => setSelectedFarm(e.target.value)} className="w-full border rounded-md px-2 py-1">
              <option value="">-- Select Farm --</option>
              {farms.map((farm) => (
                <option key={farm.id} value={farm.id}>{farm.name || `Farm ${farm.id.substring(0, 8)}`}</option>
              ))}
            </select>
          </div>
          <div className="col-span-4 sm:col-span-2">
            <div className="text-sm font-medium mb-2">Assign to Strategy</div>
            <select value={selectedStrategy} onChange={e => setSelectedStrategy(e.target.value)} className="w-full border rounded-md px-2 py-1">
              <option value="">-- Select Strategy --</option>
              {strategies.map((strategy) => (
                <option key={strategy.id} value={strategy.id}>{strategy.name}</option>
              ))}
            </select>
          </div>
        </div>
      </div>
      <div className="flex justify-end">
        <Button onClick={handleAssign} disabled={!selectedAgents.length || (!selectedFarm && !selectedStrategy)}>
          Assign Selected
        </Button>
      </div>
    </div>
  );
}

export default function AgentListPage() {
  // Get data using hooks with appropriate types
  const { agents: agentData, loading: isLoading, error } = useAgents();
  const farmsQuery = useFarms();
  const strategiesQuery = useStrategies();
  
  // Extract the data and loading states
  const farms = farmsQuery.data || [];
  const isFarmsLoading = farmsQuery.isLoading;
  const strategies = strategiesQuery.strategies || [];  
  const isStrategiesLoading = strategiesQuery.loading;
  
  const [bulkDialogOpen, setBulkDialogOpen] = React.useState(false);
  const [monitoringExpanded, setMonitoringExpanded] = React.useState(true);
  const [activeTab, setActiveTab] = React.useState("manage");
  const [selectedFarmId, setSelectedFarmId] = React.useState<string>("");

  // When farms data loads, select the first farm for monitoring
  React.useEffect(() => {
    if (farms && farms.length > 0 && !selectedFarmId) {
      setSelectedFarmId(farms[0].id);
    }
  }, [farms, selectedFarmId]);

  const handleBulkAssign = async (agentIds: string[], farmId: string, strategyId: string) => {
    // TODO: Call API to assign agents in bulk
    // Example: await assignAgentsToFarmOrStrategy(agentIds, farmId, strategyId);
    // For now, just log
    console.log('Bulk assign:', { agentIds, farmId, strategyId });
  };

  const renderLoading = () => (
    <div className="border rounded-md">
       <Table>
         <TableHeader>
            <TableRow>
                <TableHead><Skeleton className="h-4 w-16" /></TableHead>
                <TableHead><Skeleton className="h-4 w-24" /></TableHead>
                <TableHead><Skeleton className="h-4 w-20" /></TableHead>
                <TableHead><Skeleton className="h-4 w-32" /></TableHead>
                <TableHead className="text-right"><Skeleton className="h-4 w-24" /></TableHead>
            </TableRow>
         </TableHeader>
         <TableBody>
            {[...Array(5)].map((_, i) => (
             <TableRow key={i}>
                <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                <TableCell><Skeleton className="h-6 w-20 rounded-full" /></TableCell>
                <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                <TableCell className="text-right space-x-2">
                    <Skeleton className="h-8 w-24 inline-block" />
                    <Skeleton className="h-8 w-20 inline-block" />
                </TableCell>
             </TableRow>
            ))}
         </TableBody>
       </Table>
    </div>
  );

  const renderError = () => (
     <Alert variant="destructive">
      <AlertCircle className="h-4 w-4" />
      <AlertTitle>Error Loading Agents</AlertTitle>
      <AlertDescription>
        {error || "An unexpected error occurred while fetching agent data. Please try refreshing the page."}
      </AlertDescription>
    </Alert>
  );

  const renderAgentTable = () => (
     <div className="border rounded-md">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[100px]">ID</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Last Active</TableHead>
              <TableHead className="text-right w-[200px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {agentData?.map((agentItem: any) => {
              // Convert database record to our Agent interface
              const agent: Agent = {
                id: agentItem.id,
                name: agentItem.name || '',
                agent_type: agentItem.agent_type,
                status: agentItem.status,
                farm_id: agentItem.farm_id,
                strategy_id: agentItem.strategy_id || null,
                last_active_at: agentItem.last_active_at
              };
              return (
                <TableRow key={agent.id}>
                  <TableCell className="font-mono text-xs">{agent.id.substring(0, 8)}...</TableCell> 
                  <TableCell className="font-medium capitalize">{agent.agent_type || 'Unknown'}</TableCell>
                  <TableCell>
                    <AgentStatusBadge status={agent.status || 'unknown'} tooltipText={`Current status: ${agent.status || 'unknown'}`} />
                  </TableCell>
                  <TableCell>
                    {agent.last_active_at ? formatDistanceToNow(new Date(agent.last_active_at), { addSuffix: true }) : 'Never'}
                  </TableCell>
                  <TableCell className="text-right space-x-2 whitespace-nowrap">
                    <Link href={`/dashboard/agents/${agent.id}`} passHref>
                      <Button variant="outline" size="sm">
                         <ArrowRight className="mr-1 h-4 w-4" /> View
                      </Button>
                    </Link>
                     <Link href={`/dashboard/agents/${agent.id}/edit`} passHref>
                      <Button variant="outline" size="sm">
                         <Edit className="mr-1 h-4 w-4" /> Edit
                      </Button>
                    </Link>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
     </div>
  );

  return (
    <div className="space-y-6 p-4 md:p-6">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-4">
          <TabsList className="mb-2 md:mb-0">
            <TabsTrigger value="monitor">
              <Activity className="mr-2 h-4 w-4" /> Monitoring
            </TabsTrigger>
            <TabsTrigger value="manage">
              <Users className="mr-2 h-4 w-4" /> Management
            </TabsTrigger>
          </TabsList>
          
          <div className="flex gap-2">
            <div className="flex items-center space-x-2">
              <select 
                className="px-2 py-1 border rounded-md text-sm" 
                value={selectedFarmId}
                onChange={(e) => setSelectedFarmId(e.target.value)}
              >
                {farms.map((farm: any) => (
                  <option key={farm.id} value={farm.id}>{farm.name || `Farm ${farm.id.substring(0, 8)}`}</option>
                ))}
              </select>
            </div>
            <Button variant="outline" size="sm" onClick={() => setBulkDialogOpen(true)}>
              <Users className="mr-2 h-4 w-4" /> Bulk Assign
            </Button>
            {/* Agent Orchestration Modal Trigger */}
            {typeof window !== 'undefined' && (
              <React.Suspense fallback={null}>
                {(() => {
                  const AgentOrchestrationModal = require('@/components/agents/AgentOrchestrationModal').AgentOrchestrationModal;
                  return <AgentOrchestrationModal farmId={selectedFarmId} />;
                })()}
              </React.Suspense>
            )}
            <Link href="/dashboard/agents/create" passHref>
               <Button size="sm">
                  <PlusCircle className="mr-2 h-4 w-4" /> Create New Agent
               </Button>
            </Link>
          </div>
        </div>

        <TabsContent value="monitor" className="mt-0">
          {selectedFarmId ? (
            <AgentMonitoringWidget farmId={selectedFarmId} className="mb-6" />
          ) : (
            <Card>
              <CardContent className="pt-6">
                <Alert>
                  <AlertTitle>No farm selected</AlertTitle>
                  <AlertDescription>
                    Please select a farm to view agent monitoring data.
                  </AlertDescription>
                </Alert>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="manage" className="mt-0">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-2xl font-semibold">Manage Agents</CardTitle>
            </CardHeader>
            <CardDescription className="px-6 pb-4">
              View, configure, and manage all agents operating within your farms.
            </CardDescription>
            <CardContent>
              {isLoading && renderLoading()}
              {error && renderError()}
              {!isLoading && !error && (!agentData || agentData.length === 0) && (
                <div className="text-center py-12 text-gray-500 border border-dashed rounded-md">
                  <p className="mb-2">No agents found.</p>
                  <Link href="/dashboard/agents/create" passHref>
                    <Button size="sm">
                      <PlusCircle className="mr-2 h-4 w-4" /> Create Your First Agent
                    </Button>
                  </Link>
                </div>
              )}
              {!isLoading && !error && agentData && agentData.length > 0 && renderAgentTable()}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
