import { NextResponse } from 'next/server';
import { agentService } from '../../../../../data-access/services';

interface RouteParams {
  params: {
    id: string;
  }
}

/**
 * POST /api/agents/[id]/actions
 * Performs actions on an agent (start/stop)
 */
export async function POST(request: Request, { params }: RouteParams) {
  try {
    const { id } = params;
    const agentId = Number(id);
    
    if (isNaN(agentId)) {
      return NextResponse.json(
        { error: 'Invalid agent ID' },
        { status: 400 }
      );
    }
    
    const { action } = await request.json();
    
    if (!action || !['start', 'stop'].includes(action)) {
      return NextResponse.json(
        { error: 'Invalid action. Must be "start" or "stop"' },
        { status: 400 }
      );
    }
    
    // Check if agent exists
    const agent = await agentService.findById(agentId);
    
    if (!agent) {
      return NextResponse.json(
        { error: 'Agent not found' },
        { status: 404 }
      );
    }
    
    let updatedAgent;
    
    if (action === 'start') {
      updatedAgent = await agentService.startAgent(agentId);
    } else {
      updatedAgent = await agentService.stopAgent(agentId);
    }
    
    return NextResponse.json({ 
      data: updatedAgent,
      message: `Agent ${action === 'start' ? 'started' : 'stopped'} successfully`
    });
  } catch (error) {
    console.error(`Error performing action on agent ${params.id}:`, error);
    return NextResponse.json(
      { error: 'Failed to perform action on agent' },
      { status: 500 }
    );
  }
} 