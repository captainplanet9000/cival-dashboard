import { NextResponse } from 'next/server';
import { agentService } from '../../../../data-access/services';

interface RouteParams {
  params: {
    id: string;
  }
}

/**
 * GET /api/agents/[id]
 * Returns a specific agent by ID
 */
export async function GET(request: Request, { params }: RouteParams) {
  try {
    const { id } = params;
    const agentId = Number(id);
    
    if (isNaN(agentId)) {
      return NextResponse.json(
        { error: 'Invalid agent ID' },
        { status: 400 }
      );
    }
    
    const agent = await agentService.findById(agentId);
    
    if (!agent) {
      return NextResponse.json(
        { error: 'Agent not found' },
        { status: 404 }
      );
    }
    
    // Get performance metrics
    const performanceMetrics = await agentService.getPerformanceMetrics(agentId);
    
    return NextResponse.json({ 
      data: {
        ...agent,
        metrics: performanceMetrics
      } 
    });
  } catch (error) {
    console.error(`Error fetching agent ${params.id}:`, error);
    return NextResponse.json(
      { error: 'Failed to fetch agent' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/agents/[id]
 * Updates a specific agent
 */
export async function PUT(request: Request, { params }: RouteParams) {
  try {
    const { id } = params;
    const agentId = Number(id);
    const agentData = await request.json();
    
    if (isNaN(agentId)) {
      return NextResponse.json(
        { error: 'Invalid agent ID' },
        { status: 400 }
      );
    }
    
    const updatedAgent = await agentService.update(agentId, agentData);
    
    if (!updatedAgent) {
      return NextResponse.json(
        { error: 'Agent not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({ data: updatedAgent });
  } catch (error) {
    console.error(`Error updating agent ${params.id}:`, error);
    return NextResponse.json(
      { error: 'Failed to update agent' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/agents/[id]
 * Deletes a specific agent
 */
export async function DELETE(request: Request, { params }: RouteParams) {
  try {
    const { id } = params;
    const agentId = Number(id);
    
    if (isNaN(agentId)) {
      return NextResponse.json(
        { error: 'Invalid agent ID' },
        { status: 400 }
      );
    }
    
    // Check if agent has active trades before deleting
    const hasActiveTrades = await agentService.hasActiveTrades(agentId);
    
    if (hasActiveTrades) {
      return NextResponse.json(
        { error: 'Cannot delete agent with active trades' },
        { status: 400 }
      );
    }
    
    const success = await agentService.delete(agentId);
    
    if (!success) {
      return NextResponse.json(
        { error: 'Agent not found or could not be deleted' },
        { status: 404 }
      );
    }
    
    return NextResponse.json(
      { success: true, message: 'Agent deleted successfully' },
      { status: 200 }
    );
  } catch (error) {
    console.error(`Error deleting agent ${params.id}:`, error);
    return NextResponse.json(
      { error: 'Failed to delete agent' },
      { status: 500 }
    );
  }
} 