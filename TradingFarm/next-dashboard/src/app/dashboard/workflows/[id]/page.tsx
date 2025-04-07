import { Metadata } from "next";
import { notFound } from "next/navigation";
import { WorkflowService } from "@/services/workflow.service";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  Tabs, 
  TabsContent, 
  TabsList, 
  TabsTrigger 
} from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { formatDistanceToNow } from "date-fns";
import { ArrowLeft, Play, Edit, Pause, Archive, Clock, RotateCcw } from "lucide-react";
import Link from "next/link";
import { DashboardHeader } from "@/components/dashboard-header";
import { DashboardShell } from "@/components/dashboard-shell";
import { WorkflowStepsList } from "@/components/workflows/workflow-steps-list";
import { WorkflowExecutionsList } from "@/components/workflows/workflow-executions-list";
import { WorkflowParametersView } from "@/components/workflows/workflow-parameters-view";
import { WorkflowStatusBadge } from "@/components/workflows/workflow-status-badge";

export const metadata: Metadata = {
  title: "Workflow Details | Trading Farm",
  description: "View and manage your workflow",
};

interface WorkflowPageProps {
  params: {
    id: string;
  };
}

export default async function WorkflowPage({ params }: WorkflowPageProps) {
  const workflowService = new WorkflowService();
  const workflow = await workflowService.getWorkflow(params.id);
  
  if (!workflow) {
    notFound();
  }

  // Get workflow schedules
  const schedules = await workflowService.getWorkflowSchedules(params.id);
  
  // Get workflow executions
  const executions = await workflowService.getWorkflowExecutions(params.id);

  // Determine available actions based on current status
  const showActivateButton = workflow.status === 'draft' || workflow.status === 'paused';
  const showPauseButton = workflow.status === 'active';
  const showArchiveButton = workflow.status !== 'archived';
  const showRunButton = workflow.status === 'active';

  return (
    <DashboardShell>
      <div className="flex items-center">
        <Link
          href="/dashboard/workflows"
          className="inline-flex items-center rounded-lg border border-transparent bg-transparent px-3 py-2 text-sm font-medium transition-colors hover:bg-muted focus:bg-muted focus:outline-none"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Workflows
        </Link>
      </div>
      <DashboardHeader
        heading={workflow.name}
        text={workflow.description || "No description provided."}
      >
        <div className="flex space-x-2">
          {showRunButton && (
            <Button variant="secondary" size="sm" asChild>
              <Link href={`/dashboard/workflows/${params.id}/run`}>
                <Play className="mr-2 h-4 w-4" />
                Run
              </Link>
            </Button>
          )}
          <Button variant="outline" size="sm" asChild>
            <Link href={`/dashboard/workflows/${params.id}/edit`}>
              <Edit className="mr-2 h-4 w-4" />
              Edit
            </Link>
          </Button>
        </div>
      </DashboardHeader>
      
      <div className="grid gap-6">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Status</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <WorkflowStatusBadge status={workflow.status} />
                <div className="flex space-x-2">
                  {showActivateButton && (
                    <Button variant="outline" size="sm" asChild>
                      <Link href={`/dashboard/workflows/${params.id}/activate`}>
                        <Play className="mr-2 h-3 w-3" />
                        Activate
                      </Link>
                    </Button>
                  )}
                  {showPauseButton && (
                    <Button variant="outline" size="sm" asChild>
                      <Link href={`/dashboard/workflows/${params.id}/pause`}>
                        <Pause className="mr-2 h-3 w-3" />
                        Pause
                      </Link>
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Schedule</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span>{schedules.length} schedule(s)</span>
                </div>
                <Button variant="outline" size="sm" asChild>
                  <Link href={`/dashboard/workflows/${params.id}/schedules`}>
                    View
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Recent Executions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <RotateCcw className="h-4 w-4 text-muted-foreground" />
                  <span>{executions.length} execution(s)</span>
                </div>
                <Button variant="outline" size="sm" asChild>
                  <Link href={`/dashboard/workflows/${params.id}/executions`}>
                    View
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
        
        <Tabs defaultValue="steps">
          <TabsList>
            <TabsTrigger value="steps">Steps</TabsTrigger>
            <TabsTrigger value="parameters">Parameters</TabsTrigger>
            <TabsTrigger value="executions">Executions</TabsTrigger>
            <TabsTrigger value="schedule">Schedule</TabsTrigger>
          </TabsList>
          
          <TabsContent value="steps" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Workflow Steps</CardTitle>
                <CardDescription>
                  Steps executed in sequence to complete this workflow.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <WorkflowStepsList workflowId={params.id} steps={workflow.steps} />
              </CardContent>
              <CardFooter>
                <Button variant="outline" asChild className="ml-auto">
                  <Link href={`/dashboard/workflows/${params.id}/steps/new`}>
                    Add Step
                  </Link>
                </Button>
              </CardFooter>
            </Card>
          </TabsContent>
          
          <TabsContent value="parameters" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Workflow Parameters</CardTitle>
                <CardDescription>
                  Parameters used during workflow execution.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <WorkflowParametersView parameters={workflow.parameters} />
              </CardContent>
              <CardFooter>
                <Button variant="outline" asChild className="ml-auto">
                  <Link href={`/dashboard/workflows/${params.id}/edit`}>
                    Edit Parameters
                  </Link>
                </Button>
              </CardFooter>
            </Card>
          </TabsContent>
          
          <TabsContent value="executions" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Workflow Executions</CardTitle>
                <CardDescription>
                  History of workflow executions and their results.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <WorkflowExecutionsList workflowId={params.id} executions={executions} />
              </CardContent>
              <CardFooter>
                {showRunButton && (
                  <Button variant="outline" asChild className="ml-auto">
                    <Link href={`/dashboard/workflows/${params.id}/run`}>
                      Run Now
                    </Link>
                  </Button>
                )}
              </CardFooter>
            </Card>
          </TabsContent>
          
          <TabsContent value="schedule" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Workflow Schedule</CardTitle>
                <CardDescription>
                  Configure when this workflow should run automatically.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {schedules.length > 0 ? (
                  <div className="space-y-4">
                    {schedules.map((schedule) => (
                      <div key={schedule.id} className="flex items-center justify-between rounded-lg border p-4">
                        <div className="space-y-1">
                          <div className="font-medium">{schedule.name}</div>
                          <div className="text-sm text-muted-foreground">
                            Cron: <code>{schedule.cron_expression}</code>
                          </div>
                          {schedule.next_run && (
                            <div className="text-sm text-muted-foreground">
                              Next run: {formatDistanceToNow(new Date(schedule.next_run), { addSuffix: true })}
                            </div>
                          )}
                        </div>
                        <div className="flex items-center space-x-2">
                          <Badge variant={schedule.active ? "default" : "outline"}>
                            {schedule.active ? "Active" : "Inactive"}
                          </Badge>
                          <Button variant="outline" size="sm" asChild>
                            <Link href={`/dashboard/workflows/${params.id}/schedules/${schedule.id}/edit`}>
                              Edit
                            </Link>
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex h-[200px] flex-col items-center justify-center rounded-lg border border-dashed">
                    <div className="text-center">
                      <Clock className="mx-auto h-12 w-12 text-muted-foreground" />
                      <h3 className="mt-2 text-lg font-medium">No schedules</h3>
                      <p className="mt-1 text-sm text-muted-foreground">
                        This workflow doesn't have any schedules yet.
                      </p>
                    </div>
                  </div>
                )}
              </CardContent>
              <CardFooter>
                <Button variant="outline" asChild className="ml-auto">
                  <Link href={`/dashboard/workflows/${params.id}/schedules/new`}>
                    Add Schedule
                  </Link>
                </Button>
              </CardFooter>
            </Card>
          </TabsContent>
        </Tabs>
        
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Metadata</CardTitle>
              <CardDescription>
                Additional information about this workflow.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Created</span>
                  <span className="text-sm text-muted-foreground">
                    {formatDistanceToNow(new Date(workflow.created_at), { addSuffix: true })}
                  </span>
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Last Updated</span>
                  <span className="text-sm text-muted-foreground">
                    {formatDistanceToNow(new Date(workflow.updated_at), { addSuffix: true })}
                  </span>
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">ID</span>
                  <code className="rounded bg-muted px-2 py-1 text-xs">
                    {workflow.id}
                  </code>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>Actions</CardTitle>
              <CardDescription>
                Manage this workflow.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-2">
                {showRunButton && (
                  <Button variant="secondary" className="w-full" asChild>
                    <Link href={`/dashboard/workflows/${params.id}/run`}>
                      <Play className="mr-2 h-4 w-4" />
                      Run Now
                    </Link>
                  </Button>
                )}
                <Button variant="outline" className="w-full" asChild>
                  <Link href={`/dashboard/workflows/${params.id}/clone`}>
                    <svg className="mr-2 h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                    </svg>
                    Clone
                  </Link>
                </Button>
                {showArchiveButton && (
                  <Button variant="outline" className="w-full" asChild>
                    <Link href={`/dashboard/workflows/${params.id}/archive`}>
                      <Archive className="mr-2 h-4 w-4" />
                      Archive
                    </Link>
                  </Button>
                )}
                <Button variant="destructive" className="w-full" asChild>
                  <Link href={`/dashboard/workflows/${params.id}/delete`}>
                    <svg className="mr-2 h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M3 6h18" />
                      <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
                      <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
                      <line x1="10" y1="11" x2="10" y2="17" />
                      <line x1="14" y1="11" x2="14" y2="17" />
                    </svg>
                    Delete
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardShell>
  );
}
