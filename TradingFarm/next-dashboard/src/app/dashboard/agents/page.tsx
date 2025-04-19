"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useAgents, Agent } from '@/hooks/use-agents';
import { useFarms } from '@/hooks/use-farms';
import { useStrategies } from '@/hooks/use-strategies';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Users } from 'lucide-react';
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
import { AlertCircle, PlusCircle, ArrowRight, Loader2, Info, AlertTriangle, CheckCircle, PauseCircle, Edit } from 'lucide-react'; // Keep necessary icons and added Edit icon
import { Badge } from "@/components/ui/badge";
import { formatDistanceToNow } from 'date-fns';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"; // Import Alert components
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"; // Keep Tooltip for status badge

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
    );
  }

  return content;
};


// --- Bulk Assignment Modal ---
function BulkAssignAgentsDialog({ open, onOpenChange, agents, farms, strategies, onAssign }: any) {
  const [selectedAgents, setSelectedAgents] = useState<string[]>([]);
  const [selectedFarm, setSelectedFarm] = useState<string>("");
  const [selectedStrategy, setSelectedStrategy] = useState<string>("");

  useEffect(() => {
    if (!open) {
      setSelectedAgents([]);
      setSelectedFarm("");
      setSelectedStrategy("");
    }
  }, [open]);

  const handleAgentToggle = (id: string) => {
    setSelectedAgents(prev => prev.includes(id) ? prev.filter(a => a !== id) : [...prev, id]);
  };

  const handleAssign = () => {
    if (selectedAgents.length && (selectedFarm || selectedStrategy)) {
      onAssign(selectedAgents, selectedFarm, selectedStrategy);
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Bulk Assign Agents</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-4">
          <div className="flex gap-4">
            <div className="flex-1">
              <label className="block text-sm font-medium mb-2">Select Agents</label>
              <div className="border rounded-md max-h-40 overflow-auto">
                {agents.map((agent: Agent) => (
                  <div key={agent.id} className="flex items-center px-3 py-2 border-b last:border-b-0">
                    <Checkbox checked={selectedAgents.includes(agent.id)} onCheckedChange={() => handleAgentToggle(agent.id)} />
                    <span className="ml-2 font-medium">{agent.name || agent.agent_type}</span>
                    <span className="ml-auto text-xs text-muted-foreground">{agent.status}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="flex-1 flex flex-col gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Assign to Farm</label>
                <select value={selectedFarm} onChange={e => setSelectedFarm(e.target.value)} className="w-full border rounded-md px-2 py-1">
                  <option value="">-- Select Farm --</option>
                  {farms.map((farm: any) => (
                    <option key={farm.id} value={farm.id}>{farm.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Assign to Strategy</label>
                <select value={selectedStrategy} onChange={e => setSelectedStrategy(e.target.value)} className="w-full border rounded-md px-2 py-1">
                  <option value="">-- Select Strategy --</option>
                  {strategies.map((strategy: any) => (
                    <option key={strategy.id} value={strategy.id}>{strategy.name}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="secondary">Cancel</Button>
          </DialogClose>
          <Button onClick={handleAssign} disabled={!selectedAgents.length || (!selectedFarm && !selectedStrategy)}>
            Assign Selected
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function AgentListPage() {
  const { agents: agentData, loading: isLoading, error } = useAgents();
  const { farms, isLoading: isFarmsLoading } = useFarms();
  const { strategies, isLoading: isStrategiesLoading } = useStrategies();
  const [bulkDialogOpen, setBulkDialogOpen] = useState(false);

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
              <TableHead className="w-[150px]">Agent ID</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Last Heartbeat</TableHead>
              <TableHead className="text-right w-[200px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {agentData?.map((agent: Agent) => (
              <TableRow key={agent.id}>
                <TableCell className="font-mono text-xs">{agent.id.substring(0, 8)}...</TableCell> 
                <TableCell className="font-medium capitalize">{agent.agent_type}</TableCell>
                <TableCell>
                  <AgentStatusBadge status={agent.status} tooltipText={`Current status: ${agent.status}`} />
                </TableCell>
                <TableCell>
                  {agent.last_heartbeat_at ? formatDistanceToNow(new Date(agent.last_heartbeat_at), { addSuffix: true }) : 'Never'}
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
            ))}
          </TableBody>
        </Table>
     </div>
  );

  return (
    <div className="space-y-6 p-4 md:p-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-2xl font-semibold">Manage Agents</CardTitle>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setBulkDialogOpen(true)}>
              <Users className="mr-2 h-4 w-4" /> Bulk Assign
            </Button>
            <Link href="/dashboard/agents/create" passHref>
               <Button size="sm">
                  <PlusCircle className="mr-2 h-4 w-4" /> Create New Agent
               </Button>
            </Link>
          </div>
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
    </div>
  );
}
