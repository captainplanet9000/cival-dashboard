import { Metadata } from "next";
import { notFound } from "next/navigation";
import { formatDistanceToNow, format } from "date-fns";
import { ArrowLeft, RotateCcw, ExternalLink, Clock } from "lucide-react";
import Link from "next/link";

import { WorkflowService } from "@/services/workflow.service";
import { WorkflowExecutionService } from "@/services/workflow-execution.service";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { DashboardHeader } from "@/components/dashboard-header";
import { DashboardShell } from "@/components/dashboard-shell";
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

export const metadata: Metadata = {
  title: "Workflow Execution | Trading Farm",
  description: "View workflow execution details",
};

interface ExecutionPageProps {
  params: {
    id: string;
    executionId: string;
  };
}

export default async function ExecutionPage({ params }: ExecutionPageProps) {
  const workflowService = new WorkflowService();
  const executionService = new WorkflowExecutionService();
  
  const workflow = await workflowService.getWorkflow(params.id);
  if (!workflow) {
    notFound();
  }
  
  const execution = await executionService.getExecution(params.executionId);
  if (!execution) {
    notFound();
  }
  
  // Get step executions for this workflow execution
  const stepExecutions = await executionService.getStepExecutions(params.executionId);
  
  // Status badge configuration
  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'success':
        return {
          color: "bg-green-100 text-green-800 hover:bg-green-200 dark:bg-green-900/30 dark:text-green-500",
          icon: (
            <svg className="mr-1 h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          )
        };
      case 'failed':
        return {
          color: "bg-red-100 text-red-800 hover:bg-red-200 dark:bg-red-900/30 dark:text-red-500",
          icon: (
            <svg className="mr-1 h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          )
        };
      case 'running':
        return {
          color: "bg-blue-100 text-blue-800 hover:bg-blue-200 dark:bg-blue-900/30 dark:text-blue-500",
          icon: <RotateCcw className="mr-1 h-4 w-4 animate-spin" />
        };
      case 'pending':
      default:
        return {
          color: "bg-yellow-100 text-yellow-800 hover:bg-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-500",
          icon: <Clock className="mr-1 h-4 w-4" />
        };
    }
  };
  
  const statusConfig = getStatusConfig(execution.status || 'pending');
  
  // Calculate duration
  let duration = 'In progress';
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
    <DashboardShell>
      <div className="flex items-center">
        <Link
          href={`/dashboard/workflows/${params.id}`}
          className="inline-flex items-center rounded-lg border border-transparent bg-transparent px-3 py-2 text-sm font-medium transition-colors hover:bg-muted focus:bg-muted focus:outline-none"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Workflow
        </Link>
      </div>
      
      <DashboardHeader
        heading={`Execution: ${format(new Date(execution.started_at), 'MMM d, yyyy h:mm a')}`}
        text={`Details for workflow execution of "${workflow.name}"`}
      >
        <div className="flex space-x-2">
          {execution.status !== 'running' && (
            <Button variant="outline" asChild>
              <Link href={`/dashboard/workflows/${params.id}/run`}>
                <RotateCcw className="mr-2 h-4 w-4" />
                Run Again
              </Link>
            </Button>
          )}
        </div>
      </DashboardHeader>
      
      <div className="grid gap-6">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Status</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center">
                <Badge className={`inline-flex items-center ${statusConfig.color}`} variant="outline">
                  {statusConfig.icon}
                  {execution.status?.charAt(0).toUpperCase() + execution.status?.slice(1) || 'Pending'}
                </Badge>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Duration</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center">
                <Clock className="mr-2 h-4 w-4 text-muted-foreground" />
                <span>{duration}</span>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Started</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center space-x-2">
                <span>{format(new Date(execution.started_at), 'MMM d, yyyy h:mm:ss a')}</span>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Completed</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center space-x-2">
                {execution.completed_at ? (
                  <span>{format(new Date(execution.completed_at), 'MMM d, yyyy h:mm:ss a')}</span>
                ) : (
                  <span className="text-muted-foreground">Not completed yet</span>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
        
        <Card>
          <CardHeader>
            <CardTitle>Input Parameters</CardTitle>
            <CardDescription>
              Parameters used during this workflow execution.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {execution.parameters && Object.keys(execution.parameters).length > 0 ? (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Parameter</TableHead>
                      <TableHead>Value</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {Object.entries(execution.parameters).map(([key, value]) => (
                      <TableRow key={key}>
                        <TableCell className="font-medium">
                          <code className="rounded bg-muted px-1.5 py-0.5">
                            {key}
                          </code>
                        </TableCell>
                        <TableCell>
                          <code className="rounded bg-muted px-1.5 py-0.5 text-xs">
                            {typeof value === 'object' 
                              ? JSON.stringify(value, null, 2)
                              : String(value)}
                          </code>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="rounded-md border p-4 text-sm text-muted-foreground">
                No parameters were provided for this execution.
              </div>
            )}
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Execution Steps</CardTitle>
            <CardDescription>
              Step-by-step execution details.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {stepExecutions.length > 0 ? (
              <div className="space-y-4">
                <Accordion type="single" collapsible className="w-full">
                  {stepExecutions.map((stepExec, index) => {
                    const stepStatusConfig = getStatusConfig(stepExec.status || 'pending');
                    let stepDuration = 'N/A';
                    
                    if (stepExec.completed_at && stepExec.started_at) {
                      const start = new Date(stepExec.started_at).getTime();
                      const end = new Date(stepExec.completed_at).getTime();
                      const ms = end - start;
                      
                      if (ms < 1000) {
                        stepDuration = `${ms}ms`;
                      } else if (ms < 60000) {
                        stepDuration = `${Math.round(ms / 1000)}s`;
                      } else {
                        stepDuration = `${Math.round(ms / 60000)}m ${Math.round((ms % 60000) / 1000)}s`;
                      }
                    }
                    
                    const stepInfo = workflow.steps.find(s => s.id === stepExec.step_id);
                    
                    return (
                      <AccordionItem key={stepExec.id} value={stepExec.id}>
                        <AccordionTrigger className="px-4">
                          <div className="flex w-full items-center">
                            <div className="mr-4 flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
                              {index + 1}
                            </div>
                            <div className="flex-1 text-left">
                              <div className="font-medium">
                                {stepInfo?.name || `Step ${index + 1}`}
                                {stepInfo && (
                                  <span className="ml-2 text-sm text-muted-foreground">
                                    ({stepInfo.type})
                                  </span>
                                )}
                              </div>
                            </div>
                            <Badge className={`ml-4 inline-flex items-center ${stepStatusConfig.color}`} variant="outline">
                              {stepStatusConfig.icon}
                              <span className="ml-1">{stepExec.status?.charAt(0).toUpperCase() + stepExec.status?.slice(1) || 'Pending'}</span>
                            </Badge>
                          </div>
                        </AccordionTrigger>
                        <AccordionContent className="px-4 pt-2">
                          <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                              <div className="space-y-1">
                                <div className="text-sm font-medium">Started</div>
                                <div className="text-sm">
                                  {format(new Date(stepExec.started_at), 'MMM d, yyyy h:mm:ss a')}
                                </div>
                              </div>
                              <div className="space-y-1">
                                <div className="text-sm font-medium">Duration</div>
                                <div className="text-sm">{stepDuration}</div>
                              </div>
                            </div>
                            
                            <div className="space-y-1">
                              <div className="text-sm font-medium">Result</div>
                              <div className="rounded-md bg-muted p-4">
                                <pre className="text-xs">
                                  {stepExec.result 
                                    ? typeof stepExec.result === 'object'
                                      ? JSON.stringify(stepExec.result, null, 2)
                                      : stepExec.result
                                    : 'No result data'}
                                </pre>
                              </div>
                            </div>
                            
                            {stepExec.error && (
                              <div className="space-y-1">
                                <div className="text-sm font-medium text-destructive">Error</div>
                                <div className="rounded-md bg-destructive/10 p-4">
                                  <pre className="text-xs text-destructive">
                                    {typeof stepExec.error === 'object'
                                      ? JSON.stringify(stepExec.error, null, 2)
                                      : stepExec.error}
                                  </pre>
                                </div>
                              </div>
                            )}
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                    );
                  })}
                </Accordion>
              </div>
            ) : (
              <div className="rounded-md border p-4 text-sm text-muted-foreground">
                No step execution data available.
              </div>
            )}
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Result</CardTitle>
            <CardDescription>
              Final result of the workflow execution.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {execution.result ? (
              <div className="rounded-md bg-muted p-4">
                <pre className="overflow-auto text-sm">
                  {typeof execution.result === 'object'
                    ? JSON.stringify(execution.result, null, 2)
                    : execution.result}
                </pre>
              </div>
            ) : (
              <div className="rounded-md border p-4 text-sm text-muted-foreground">
                {execution.status === 'running' 
                  ? 'Execution is still in progress...'
                  : execution.status === 'failed'
                    ? 'Execution failed. See error details below.'
                    : 'No result data available.'}
              </div>
            )}
            
            {execution.error && (
              <div className="mt-4 space-y-2">
                <div className="text-sm font-medium text-destructive">Error Details</div>
                <div className="rounded-md bg-destructive/10 p-4">
                  <pre className="overflow-auto text-sm text-destructive">
                    {typeof execution.error === 'object'
                      ? JSON.stringify(execution.error, null, 2)
                      : execution.error}
                  </pre>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
        
        <div className="flex justify-between">
          <Button variant="outline" asChild>
            <Link href={`/dashboard/workflows/${params.id}/executions`}>
              View All Executions
            </Link>
          </Button>
          
          {execution.status !== 'running' && (
            <Button variant="default" asChild>
              <Link href={`/dashboard/workflows/${params.id}/run`}>
                <RotateCcw className="mr-2 h-4 w-4" />
                Run Again
              </Link>
            </Button>
          )}
        </div>
      </div>
    </DashboardShell>
  );
}
