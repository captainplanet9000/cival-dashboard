import { Metadata } from "next";
import { DashboardHeader } from "@/components/dashboard-header";
import { DashboardShell } from "@/components/dashboard-shell";
import { WorkflowForm } from "@/components/workflows/workflow-form";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

export const metadata: Metadata = {
  title: "Create Workflow | Trading Farm",
  description: "Create a new automated trading workflow",
};

export default function NewWorkflowPage() {
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
        heading="Create Workflow"
        text="Create a new automated trading workflow that can be triggered manually, on a schedule, or based on market conditions."
      />
      <div className="grid gap-8">
        <WorkflowForm mode="create" />
      </div>
    </DashboardShell>
  );
}
