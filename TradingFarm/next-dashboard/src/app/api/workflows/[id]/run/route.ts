import { NextRequest, NextResponse } from "next/server";
import { WorkflowService } from "@/services/workflow.service";
import { WorkflowExecutionService } from "@/services/workflow-execution.service";

interface Params {
  params: {
    id: string;
  };
}

// POST /api/workflows/[id]/run - Execute a workflow
export async function POST(request: NextRequest, { params }: Params) {
  try {
    const { id } = params;
    const workflowService = new WorkflowService();
    const executionService = new WorkflowExecutionService();
    
    // Check if workflow exists
    const workflow = await workflowService.getWorkflow(id);
    if (!workflow) {
      return NextResponse.json(
        { message: "Workflow not found" },
        { status: 404 }
      );
    }

    // Check if workflow is in a runnable state
    if (workflow.status !== 'active' && workflow.status !== 'draft') {
      return NextResponse.json(
        { message: `Cannot execute workflow with status: ${workflow.status}. Workflow must be active or draft.` },
        { status: 400 }
      );
    }
    
    // Get parameters from request body
    let parameters = {};
    const contentType = request.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      try {
        const body = await request.json();
        parameters = body.parameters || {};
      } catch (e) {
        // If body parsing fails, use empty parameters
        console.warn('Failed to parse request body as JSON, using empty parameters');
      }
    }
    
    // Execute workflow
    const executionResult = await executionService.executeWorkflow(id, parameters);
    
    return NextResponse.json({
      execution_id: executionResult.execution_id,
      status: executionResult.status,
      message: "Workflow execution started"
    });
  } catch (error) {
    console.error(`Error executing workflow with id ${params.id}:`, error);
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Failed to execute workflow" },
      { status: 500 }
    );
  }
}
