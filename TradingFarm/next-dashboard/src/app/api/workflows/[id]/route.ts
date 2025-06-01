import { NextRequest, NextResponse } from "next/server";
import { WorkflowService } from "@/services/workflow.service";

interface Params {
  params: {
    id: string;
  };
}

// GET /api/workflows/[id] - Get a specific workflow
export async function GET(request: NextRequest, { params }: Params) {
  try {
    const { id } = params;
    const workflowService = new WorkflowService();
    const workflow = await workflowService.getWorkflow(id);
    
    if (!workflow) {
      return NextResponse.json(
        { message: "Workflow not found" },
        { status: 404 }
      );
    }
    
    return NextResponse.json(workflow);
  } catch (error) {
    console.error(`Error fetching workflow with id ${params.id}:`, error);
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Failed to fetch workflow" },
      { status: 500 }
    );
  }
}

// PUT /api/workflows/[id] - Update a workflow
export async function PUT(request: NextRequest, { params }: Params) {
  try {
    const { id } = params;
    const workflowData = await request.json();
    const workflowService = new WorkflowService();
    
    // Check if the workflow exists
    const existingWorkflow = await workflowService.getWorkflow(id);
    if (!existingWorkflow) {
      return NextResponse.json(
        { message: "Workflow not found" },
        { status: 404 }
      );
    }
    
    // Update workflow
    const updatedWorkflow = await workflowService.updateWorkflow(id, workflowData);
    
    return NextResponse.json(updatedWorkflow);
  } catch (error) {
    console.error(`Error updating workflow with id ${params.id}:`, error);
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Failed to update workflow" },
      { status: 500 }
    );
  }
}

// DELETE /api/workflows/[id] - Delete a workflow
export async function DELETE(request: NextRequest, { params }: Params) {
  try {
    const { id } = params;
    const workflowService = new WorkflowService();
    
    // Check if the workflow exists
    const existingWorkflow = await workflowService.getWorkflow(id);
    if (!existingWorkflow) {
      return NextResponse.json(
        { message: "Workflow not found" },
        { status: 404 }
      );
    }
    
    // Delete workflow
    await workflowService.deleteWorkflow(id);
    
    return NextResponse.json(
      { message: "Workflow deleted successfully" },
      { status: 200 }
    );
  } catch (error) {
    console.error(`Error deleting workflow with id ${params.id}:`, error);
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Failed to delete workflow" },
      { status: 500 }
    );
  }
}
