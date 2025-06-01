'use client';

import React from 'react';
import { useAgents, Agent } from '@/hooks/use-agents';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { formatDistanceToNow } from 'date-fns';
import { 
  CheckCircle2, 
  XCircle, 
  AlertCircle, 
  RefreshCw, 
  MoreHorizontal, 
  Edit, 
  Trash,
  Play,
  Pause
} from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface AgentListProps {
  farmId?: string;
  onEdit?: (agent: Agent) => void;
  onDelete?: (agent: Agent) => void;
  onStatusChange?: (agent: Agent, newStatus: boolean) => void;
}

export function AgentList({ farmId, onEdit, onDelete, onStatusChange }: AgentListProps) {
  const { agents, loading, error, refresh } = useAgents({ farmId, enableRealtime: true });

  // Format the last heartbeat date
  const formatHeartbeat = (date: string | null) => {
    if (!date) return 'Never';
    return formatDistanceToNow(new Date(date), { addSuffix: true });
  };

  // Get agent status badge
  const getStatusBadge = (agent: Agent) => {
    if (!agent.is_active) {
      return <Badge variant="outline" className="bg-gray-100">Inactive</Badge>;
    }

    switch (agent.status) {
      case 'online':
        return <Badge className="bg-green-500">Online</Badge>;
      case 'offline':
        return <Badge variant="secondary">Offline</Badge>;
      case 'error':
        return <Badge variant="destructive">Error</Badge>;
      default:
        return <Badge variant="outline">{agent.status}</Badge>;
    }
  };

  // Handle the refresh click
  const handleRefresh = () => {
    refresh();
  };

  // Render loading skeleton
  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex justify-between items-center">
            <Skeleton className="h-6 w-32" />
            <Skeleton className="h-8 w-8 rounded-full" />
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center space-x-2">
                <Skeleton className="h-5 w-5 rounded-full" />
                <Skeleton className="h-4 w-full" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  // Render error state
  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Agents</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center text-center p-4">
            <AlertCircle className="h-8 w-8 text-red-500 mb-2" />
            <p className="text-red-500 font-medium">Failed to load agents</p>
            <p className="text-sm text-muted-foreground mb-4">{error}</p>
            <Button onClick={handleRefresh} variant="outline" size="sm">
              <RefreshCw className="h-4 w-4 mr-2" /> Try Again
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Render empty state
  if (agents.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex justify-between items-center">
            <span>Agents</span>
            <Button onClick={handleRefresh} size="icon" variant="ghost">
              <RefreshCw className="h-4 w-4" />
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center text-center p-4">
            <p className="text-sm text-muted-foreground">No agents found</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Render the agent list
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex justify-between items-center">
          <span>Agents ({agents.length})</span>
          <Button onClick={handleRefresh} size="icon" variant="ghost">
            <RefreshCw className="h-4 w-4" />
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Agent</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Last Active</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {agents.map((agent) => (
              <TableRow key={agent.id}>
                <TableCell className="font-medium">{agent.id.substring(0, 8)}...</TableCell>
                <TableCell>{agent.agent_type}</TableCell>
                <TableCell>{getStatusBadge(agent)}</TableCell>
                <TableCell>{formatHeartbeat(agent.last_heartbeat_at)}</TableCell>
                <TableCell className="text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuLabel>Actions</DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      {onStatusChange && (
                        <DropdownMenuItem onClick={() => onStatusChange(agent, !agent.is_active)}>
                          {agent.is_active ? (
                            <>
                              <Pause className="h-4 w-4 mr-2" /> Pause
                            </>
                          ) : (
                            <>
                              <Play className="h-4 w-4 mr-2" /> Start
                            </>
                          )}
                        </DropdownMenuItem>
                      )}
                      {onEdit && (
                        <DropdownMenuItem onClick={() => onEdit(agent)}>
                          <Edit className="h-4 w-4 mr-2" /> Edit
                        </DropdownMenuItem>
                      )}
                      {onDelete && (
                        <DropdownMenuItem 
                          onClick={() => onDelete(agent)}
                          className="text-red-500"
                        >
                          <Trash className="h-4 w-4 mr-2" /> Delete
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
} 