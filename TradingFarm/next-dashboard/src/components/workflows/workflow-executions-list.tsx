import { WorkflowExecution } from "@/types/workflows";
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
import { formatDistanceToNow, format } from "date-fns";
import { Clock, ExternalLink, RotateCcw } from "lucide-react";
import Link from "next/link";

// Status badge configurations
const statusConfigs: Record<string, { color: string; icon: React.ReactNode }> = {
  success: { 
    color: "bg-green-100 text-green-800 hover:bg-green-200 dark:bg-green-900/30 dark:text-green-500",
    icon: (
      <svg className="mr-1 h-3 w-3" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="20 6 9 17 4 12" />
      </svg>
    )
  },
  failed: { 
    color: "bg-red-100 text-red-800 hover:bg-red-200 dark:bg-red-900/30 dark:text-red-500",
    icon: (
      <svg className="mr-1 h-3 w-3" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="18" y1="6" x2="6" y2="18" />
        <line x1="6" y1="6" x2="18" y2="18" />
      </svg>
    )
  },
  running: { 
    color: "bg-blue-100 text-blue-800 hover:bg-blue-200 dark:bg-blue-900/30 dark:text-blue-500",
    icon: <RotateCcw className="mr-1 h-3 w-3 animate-spin" />
  },
  pending: { 
    color: "bg-yellow-100 text-yellow-800 hover:bg-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-500",
    icon: <Clock className="mr-1 h-3 w-3" />
  },
};

interface WorkflowExecutionsListProps {
  workflowId: string;
  executions: WorkflowExecution[];
}

export function WorkflowExecutionsList({ workflowId, executions }: WorkflowExecutionsListProps) {
  // Sort executions by start time (most recent first)
  const sortedExecutions = [...executions].sort(
    (a, b) => new Date(b.started_at).getTime() - new Date(a.started_at).getTime()
  );

  if (sortedExecutions.length === 0) {
    return (
      <div className="flex h-[200px] flex-col items-center justify-center rounded-lg border border-dashed">
        <div className="text-center">
          <RotateCcw className="mx-auto h-12 w-12 text-muted-foreground" />
          <h3 className="mt-2 text-lg font-medium">No executions</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            This workflow hasn't been executed yet.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Status</TableHead>
            <TableHead>Started</TableHead>
            <TableHead>Duration</TableHead>
            <TableHead>Triggered By</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sortedExecutions.map((execution) => {
            const status = execution.status || 'pending';
            const statusConfig = statusConfigs[status] || statusConfigs.pending;
            
            // Calculate duration if completed
            let duration = 'N/A';
            if (execution.completed_at && execution.started_at) {
              const startTime = new Date(execution.started_at).getTime();
              const endTime = new Date(execution.completed_at).getTime();
              const durationMs = endTime - startTime;
              
              if (durationMs < 1000) {
                duration = `${durationMs}ms`;
              } else if (durationMs < 60000) {
                duration = `${Math.round(durationMs / 1000)}s`;
              } else if (durationMs < 3600000) {
                duration = `${Math.round(durationMs / 60000)}m ${Math.round((durationMs % 60000) / 1000)}s`;
              } else {
                duration = `${Math.round(durationMs / 3600000)}h ${Math.round((durationMs % 3600000) / 60000)}m`;
              }
            }
            
            return (
              <TableRow key={execution.id}>
                <TableCell>
                  <Badge className={`inline-flex items-center ${statusConfig.color}`} variant="outline">
                    {statusConfig.icon}
                    {status.charAt(0).toUpperCase() + status.slice(1)}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="font-medium">
                    {format(new Date(execution.started_at), 'MMM d, yyyy')}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {format(new Date(execution.started_at), 'h:mm a')}
                  </div>
                </TableCell>
                <TableCell>
                  {duration}
                </TableCell>
                <TableCell>
                  <div className="flex items-center space-x-1">
                    {execution.trigger_type === 'manual' ? (
                      <>
                        <svg 
                          className="h-4 w-4 text-muted-foreground" 
                          xmlns="http://www.w3.org/2000/svg" 
                          viewBox="0 0 24 24" 
                          fill="none" 
                          stroke="currentColor" 
                          strokeWidth="2" 
                          strokeLinecap="round" 
                          strokeLinejoin="round"
                        >
                          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                          <circle cx="12" cy="7" r="4" />
                        </svg>
                        <span>Manual</span>
                      </>
                    ) : execution.trigger_type === 'scheduled' ? (
                      <>
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        <span>Scheduled</span>
                      </>
                    ) : execution.trigger_type === 'monitor' ? (
                      <>
                        <svg 
                          className="h-4 w-4 text-muted-foreground" 
                          xmlns="http://www.w3.org/2000/svg" 
                          viewBox="0 0 24 24" 
                          fill="none" 
                          stroke="currentColor" 
                          strokeWidth="2" 
                          strokeLinecap="round" 
                          strokeLinejoin="round"
                        >
                          <rect x="2" y="2" width="20" height="8" rx="2" ry="2" />
                          <rect x="2" y="14" width="20" height="8" rx="2" ry="2" />
                          <line x1="6" y1="6" x2="6.01" y2="6" />
                          <line x1="6" y1="18" x2="6.01" y2="18" />
                        </svg>
                        <span>Monitor</span>
                      </>
                    ) : (
                      <>
                        <svg 
                          className="h-4 w-4 text-muted-foreground" 
                          xmlns="http://www.w3.org/2000/svg" 
                          viewBox="0 0 24 24" 
                          fill="none" 
                          stroke="currentColor" 
                          strokeWidth="2" 
                          strokeLinecap="round" 
                          strokeLinejoin="round"
                        >
                          <path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z" />
                        </svg>
                        <span>API</span>
                      </>
                    )}
                  </div>
                </TableCell>
                <TableCell className="text-right">
                  <Button variant="ghost" size="sm" asChild>
                    <Link href={`/dashboard/workflows/${workflowId}/executions/${execution.id}`}>
                      <ExternalLink className="mr-2 h-4 w-4" />
                      Details
                    </Link>
                  </Button>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
