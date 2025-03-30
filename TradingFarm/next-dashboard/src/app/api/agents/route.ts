import { NextResponse } from 'next/server';
import { agentService } from '../../../data-access/services';

/**
 * GET /api/agents
 * Returns a list of agents, optionally filtered by farm ID
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const farmId = searchParams.get('farmId');
    
    let agents;
    if (farmId) {
      agents = await agentService.findByFarmId(Number(farmId));
    } else {
      agents = await agentService.findAll();
    }
    
    return NextResponse.json({ data: agents });
  } catch (error) {
    console.error('Error fetching agents:', error);
    return NextResponse.json(
      { error: 'Failed to fetch agents' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/agents
 * Creates a new agent
 */
export async function POST(request: Request) {
  try {
    const agentData = await request.json();
    
    // Basic validation
    if (!agentData.name || !agentData.farm_id) {
      return NextResponse.json(
        { error: 'Agent name and farm ID are required' },
        { status: 400 }
      );
    }
    
    const newAgent = await agentService.create(agentData);
    
    return NextResponse.json({ data: newAgent }, { status: 201 });
  } catch (error) {
    console.error('Error creating agent:', error);
    return NextResponse.json(
      { error: 'Failed to create agent' },
      { status: 500 }
    );
  }
} 