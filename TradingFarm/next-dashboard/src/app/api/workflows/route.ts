import { NextRequest, NextResponse } from "next/server";
import { WorkflowService } from "@/services/workflow.service";
import { Workflow } from "@/types/workflows";
import { createServerClient } from "@/utils/supabase/server";

// GET /api/workflows - Get all workflows
export async function GET(request: NextRequest) {
  try {
    const workflowService = new WorkflowService();
    const workflows = await workflowService.getWorkflows();
    
    return NextResponse.json(workflows);
  } catch (error) {
    console.error("Error fetching workflows:", error);
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Failed to fetch workflows" },
      { status: 500 }
    );
  }
}

// POST /api/workflows - Create a new workflow
export async function POST(request: NextRequest) {
  try {
    const workflowData = await request.json();
    const workflowService = new WorkflowService();
    
    // Create workflow
    const newWorkflow = await workflowService.createWorkflow(workflowData);
    
    return NextResponse.json(newWorkflow, { status: 201 });
  } catch (error) {
    console.error("Error creating workflow:", error);
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Failed to create workflow" },
      { status: 500 }
    );
  }
}
