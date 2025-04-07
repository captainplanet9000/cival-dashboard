import { Metadata } from "next";
import { WorkflowService } from "@/services/workflow.service";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PlusCircle } from "lucide-react";
import { WorkflowsTable } from "@/components/workflows/workflows-table";
import Link from "next/link";
import { DashboardHeader } from "@/components/dashboard-header";
import { DashboardShell } from "@/components/dashboard-shell";

export const metadata: Metadata = {
  title: "Workflows | Trading Farm",
  description: "Manage your automated trading workflows",
};

export default async function WorkflowsPage() {
  const workflowService = new WorkflowService();
  const workflows = await workflowService.getWorkflows();

  return (
    <DashboardShell>
      <DashboardHeader
        heading="Automated Trading Workflows"
        text="Create and manage automated trading workflows and scheduled tasks."
      >
        <Link href="/dashboard/workflows/new">
          <Button>
            <PlusCircle className="mr-2 h-4 w-4" />
            New Workflow
          </Button>
        </Link>
      </DashboardHeader>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle>Total Workflows</CardTitle>
            <CardDescription>Workflow count by status</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{workflows.length}</div>
            <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
              <div className="flex flex-col">
                <span className="text-muted-foreground">Active</span>
                <span className="font-medium">{workflows.filter(w => w.status === 'active').length}</span>
              </div>
              <div className="flex flex-col">
                <span className="text-muted-foreground">Draft</span>
                <span className="font-medium">{workflows.filter(w => w.status === 'draft').length}</span>
              </div>
              <div className="flex flex-col">
                <span className="text-muted-foreground">Paused</span>
                <span className="font-medium">{workflows.filter(w => w.status === 'paused').length}</span>
              </div>
              <div className="flex flex-col">
                <span className="text-muted-foreground">Archived</span>
                <span className="font-medium">{workflows.filter(w => w.status === 'archived').length}</span>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle>Recent Executions</CardTitle>
            <CardDescription>Last 24 hours</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">--</div>
            <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
              <div className="flex flex-col">
                <span className="text-muted-foreground">Successful</span>
                <span className="font-medium text-green-600">--</span>
              </div>
              <div className="flex flex-col">
                <span className="text-muted-foreground">Failed</span>
                <span className="font-medium text-red-600">--</span>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle>Active Monitors</CardTitle>
            <CardDescription>Monitoring conditions</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">--</div>
            <div className="mt-4 flex flex-col gap-1 text-sm">
              <Link href="/dashboard/workflows/monitors" className="text-primary hover:underline">
                Manage Monitors
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
      <div className="mt-6">
        <Card>
          <CardHeader>
            <CardTitle>Workflows</CardTitle>
            <CardDescription>View and manage your automated trading workflows.</CardDescription>
          </CardHeader>
          <CardContent>
            <WorkflowsTable workflows={workflows} />
          </CardContent>
        </Card>
      </div>
      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Templates</CardTitle>
            <CardDescription>Create workflows from pre-built templates.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-2">
              <Link href="/dashboard/workflows/templates">
                <Button variant="outline" className="w-full">
                  Browse Templates
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Schedule</CardTitle>
            <CardDescription>View and manage scheduled workflow runs.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-2">
              <Link href="/dashboard/workflows/schedules">
                <Button variant="outline" className="w-full">
                  View Schedule
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardShell>
  );
}
