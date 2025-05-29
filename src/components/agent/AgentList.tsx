// src/components/agent/AgentList.tsx
'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useRouter } from 'next/navigation'; // For Edit navigation if not using Link directly for some reason
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/components/ui/use-toast";
import { Loader2, Play, Square, Edit3, Trash2 } from "lucide-react";

import { 
  type TradingAgentWithDetails, 
  startAgent, 
  stopAgent, 
  deleteAgent 
} from '@/lib/clients/apiClient';

interface AgentListProps {
  agents: TradingAgentWithDetails[];
  onRefresh: () => void;
}

export function AgentList({ agents, onRefresh }: AgentListProps) {
  const { toast } = useToast();
  const router = useRouter(); // For programmatic navigation if needed
  const [loadingStates, setLoadingStates] = useState<Record<string, boolean>>({}); // For individual button loading

  const handleAction = async (agentId: string, action: 'start' | 'stop' | 'delete') => {
    setLoadingStates(prev => ({ ...prev, [`${action}-${agentId}`]: true }));
    try {
      let message = '';
      switch (action) {
        case 'start':
          await startAgent(agentId);
          message = `Agent ${agentId.substring(0,8)}... started successfully.`;
          break;
        case 'stop':
          await stopAgent(agentId);
          message = `Agent ${agentId.substring(0,8)}... stopped successfully.`;
          break;
        case 'delete':
          await deleteAgent(agentId);
          message = `Agent ${agentId.substring(0,8)}... deleted successfully.`;
          break;
      }
      toast({ title: "Success", description: message, variant: "default" });
      onRefresh(); // Refresh the list
    } catch (error: any) {
      console.error(`Failed to ${action} agent ${agentId}:`, error);
      toast({ title: `Error ${action}ing agent`, description: error.message || "An unexpected error occurred.", variant: "destructive" });
    } finally {
      setLoadingStates(prev => ({ ...prev, [`${action}-${agentId}`]: false }));
    }
  };

  if (!agents || agents.length === 0) {
    return (
      <div className="text-center py-10">
        <p className="text-lg text-muted-foreground">
          No agents found. Create one to get started.
        </p>
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Name</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Strategy</TableHead>
          <TableHead>Wallet</TableHead>
          <TableHead className="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {agents.map((agent) => {
          const isStartLoading = loadingStates[`start-${agent.agent_id}`];
          const isStopLoading = loadingStates[`stop-${agent.agent_id}`];
          const isDeleteLoading = loadingStates[`delete-${agent.agent_id}`];
          const canStart = agent.status === 'inactive' || agent.status === 'paused' || agent.status === 'pending_funding';
          const canStop = agent.status === 'active';

          return (
            <TableRow key={agent.agent_id}>
              <TableCell className="font-medium">{agent.name}</TableCell>
              <TableCell>
                <Badge 
                  variant={
                    agent.status === 'active' ? 'default' : 
                    agent.status === 'paused' ? 'secondary' :
                    agent.status === 'inactive' ? 'outline' :
                    agent.status === 'pending_funding' ? 'warning' :
                    agent.status === 'error' ? 'destructive' :
                    'outline'
                  }
                  className={
                    agent.status === 'active' ? 'bg-green-500 text-white' :
                    agent.status === 'pending_funding' ? 'bg-yellow-500 text-white' : ''
                  }
                >
                  {agent.status}
                </Badge>
              </TableCell>
              <TableCell>{agent.trading_strategies?.name || 'N/A'}</TableCell>
              <TableCell>
                {agent.wallets ? (
                  `${agent.wallets.currency} - ${Number(agent.wallets.balance).toFixed(2)}`
                ) : (
                  'N/A'
                )}
              </TableCell>
              <TableCell className="text-right space-x-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => handleAction(agent.agent_id, 'start')}
                  disabled={!canStart || isStartLoading || isStopLoading || isDeleteLoading}
                >
                  {isStartLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Play className="mr-2 h-4 w-4" />}
                  Start
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => handleAction(agent.agent_id, 'stop')}
                  disabled={!canStop || isStartLoading || isStopLoading || isDeleteLoading}
                >
                  {isStopLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Square className="mr-2 h-4 w-4" />}
                  Stop
                </Button>
                <Link href={`/dashboard/agents/${agent.agent_id}/edit`} passHref legacyBehavior>
                  <Button variant="outline" size="sm" asChild>
                    <a><Edit3 className="mr-2 h-4 w-4" /> Edit</a>
                  </Button>
                </Link>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button 
                      variant="destructive" 
                      size="sm"
                      disabled={isStartLoading || isStopLoading || isDeleteLoading}
                    >
                      {isDeleteLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
                      Delete
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This action cannot be undone. This will permanently delete the agent
                        "{agent.name}". The agent's wallet must have a zero balance.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={() => handleAction(agent.agent_id, 'delete')}>
                        Continue
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
