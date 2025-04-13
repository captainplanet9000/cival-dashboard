'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Agent } from '@/hooks/use-agents';
import { useAgentTasks, AgentTask } from '@/hooks/use-agent-tasks'; // Import the new hook
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle, CheckCircle, XCircle, Clock, Loader2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { Badge } from "@/components/ui/badge";

interface AgentAnalyticsProps {
  agent: Agent;
}

// Helper to render task status badge
const TaskStatusBadge = ({ status }: { status: string }) => {
  const lowerStatus = status?.toLowerCase() || 'unknown';
  let color = 'bg-gray-100 text-gray-700';
  let icon = <Clock className="h-3 w-3 mr-1" />;

  switch (lowerStatus) {
    case 'completed':
    case 'success':
      color = 'bg-green-100 text-green-700';
      icon = <CheckCircle className="h-3 w-3 mr-1" />;
      break;
    case 'processing':
    case 'running':
      color = 'bg-blue-100 text-blue-700';
      icon = <Loader2 className="h-3 w-3 mr-1 animate-spin" />;
      break;
    case 'failed':
    case 'error':
      color = 'bg-red-100 text-red-700';
      icon = <XCircle className="h-3 w-3 mr-1" />;
      break;
    case 'pending':
    case 'queued':
      color = 'bg-yellow-100 text-yellow-700';
      icon = <Clock className="h-3 w-3 mr-1" />;
      break;
  }
  return (
    <Badge variant="outline" className={`${color} border-current flex items-center w-fit`}>
      {icon}
      <span className="capitalize">{status || 'Unknown'}</span>
    </Badge>
  );
};

export const AgentAnalytics: React.FC<AgentAnalyticsProps> = ({ agent }: AgentAnalyticsProps) => {
  const { 
    tasks, 
    isLoading, 
    error 
  } = useAgentTasks(agent.id, 50); // Fetch last 50 tasks

  const renderLoading = () => (
    <div className="space-y-2">
      {[...Array(5)].map((_, i) => (
        <Skeleton key={i} className="h-10 w-full rounded-md" />
      ))}
    </div>
  );

  const renderError = () => (
    <Alert variant="destructive">
      <AlertCircle className="h-4 w-4" />
      <AlertTitle>Error Loading Tasks</AlertTitle>
      <AlertDescription>
        {error || "Could not load recent tasks for this agent."}
      </AlertDescription>
    </Alert>
  );

  const renderTasksTable = () => (
    <div className="border rounded-md max-h-[400px] overflow-y-auto"> {/* Added scroll */} 
      <Table>
        <TableHeader className="sticky top-0 bg-background z-10"> {/* Sticky header */} 
          <TableRow>
            <TableHead>Task Type</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Created</TableHead>
            <TableHead>Error</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {tasks.map((task: AgentTask) => (
            <TableRow key={task.id}>
              <TableCell className="font-medium text-sm">{task.task_type}</TableCell>
              <TableCell>
                <TaskStatusBadge status={task.status} />
              </TableCell>
              <TableCell className="text-xs">
                {task.created_at ? formatDistanceToNow(new Date(task.created_at), { addSuffix: true }) : '-'}
              </TableCell>
              <TableCell className="text-xs text-red-600 max-w-xs truncate">
                {task.error_message || '-'}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Agent Activity</CardTitle>
        <CardDescription>
          Latest tasks processed by this agent.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading && renderLoading()}
        {error && renderError()}
        {!isLoading && !error && tasks.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-4">
            No recent task activity found for this agent.
          </p>
        )}
        {!isLoading && !error && tasks.length > 0 && renderTasksTable()}
      </CardContent>
    </Card>
  );
}; 