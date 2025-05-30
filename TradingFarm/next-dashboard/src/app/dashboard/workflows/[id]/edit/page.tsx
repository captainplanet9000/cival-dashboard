import { Metadata } from "next";
import { notFound } from "next/navigation";
import { DashboardHeader } from "@/components/dashboard-header";
import { DashboardShell } from "@/components/dashboard-shell";
import { WorkflowForm } from "@/components/workflows/workflow-form";
import { WorkflowService } from "@/services/workflow.service";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

export const metadata: Metadata = {
  title: "Edit Workflow | Trading Farm",
  description: "Edit an existing automated trading workflow",
};

interface EditWorkflowPageProps {
  params: {
    id: string;
  };
}

export default async function EditWorkflowPage({ params }: EditWorkflowPageProps) {
  const workflowService = new WorkflowService();
  const workflow = await workflowService.getWorkflow(params.id);

  if (!workflow) {
    notFound();
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
        heading={`Edit Workflow: ${workflow.name}`}
        text="Modify your workflow's details, parameters, and other settings."
      />
      <div className="grid gap-8">
        <WorkflowForm mode="edit" workflow={workflow} />
      </div>
    </DashboardShell>
  );
}
