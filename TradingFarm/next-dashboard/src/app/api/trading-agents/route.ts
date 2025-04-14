import { NextRequest, NextResponse } from 'next/server';
import { tradingAgentService, TradingAgentConfig, TradingAgentType, SupportedExchange } from '@/services/elizaos/trading-agent-service';
import { createServerClient } from '@/utils/supabase/server';
import { z } from 'zod';

// Schema for creating a trading agent
const createAgentSchema = z.object({
  name: z.string().min(3).max(100),
  description: z.string().optional(),
  agentType: z.nativeEnum(TradingAgentType),
  exchanges: z.array(z.nativeEnum(SupportedExchange)).min(1),
  tradingPairs: z.array(z.string()).min(1),
  riskParameters: z.object({
    maxPositionSize: z.number().positive(),
    maxDrawdown: z.number().min(0).max(100),
    maxOrdersPerInterval: z.number().int().positive(),
    orderIntervalSeconds: z.number().int().positive()
  }),
  tradingParameters: z.record(z.any()),
  modelProvider: z.string().optional(),
  modelId: z.string().optional(),
  isPaperTrading: z.boolean().default(true)
});

/**
 * GET handler for retrieving trading agents
 */
export async function GET(request: NextRequest) {
  try {
    // Get the user ID from the authenticated session
    const supabase = await createServerClient();
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    const userId = session.user.id;
    
    // Get agent ID from query params if specified
    const { searchParams } = new URL(request.url);
    const agentId = searchParams.get('id');
    
    if (agentId) {
      // Get specific agent
      const agent = await tradingAgentService.getAgentById(agentId);
      
      if (!agent) {
        return NextResponse.json(
          { error: 'Agent not found' },
          { status: 404 }
        );
      }
      
      // Validate that the agent belongs to the authenticated user
      if (agent.userId !== userId) {
        return NextResponse.json(
          { error: 'Unauthorized' },
          { status: 403 }
        );
      }
      
      return NextResponse.json(agent);
    } else {
      // Get all agents for the user
      const agents = await tradingAgentService.getUserAgents(userId);
      return NextResponse.json(agents);
    }
  } catch (error: any) {
    console.error('Error retrieving trading agents:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST handler for creating a new trading agent
 */
export async function POST(request: NextRequest) {
  try {
    // Get the user ID from the authenticated session
    const supabase = await createServerClient();
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    const userId = session.user.id;
    
    // Parse and validate the request body
    const body = await request.json();
    
    try {
      const validatedData = createAgentSchema.parse(body);
      
      // Create the agent
      const agent = await tradingAgentService.createAgent(userId, validatedData);
      
      return NextResponse.json(agent, { status: 201 });
    } catch (validationError: any) {
      return NextResponse.json(
        { error: 'Validation error', details: validationError.errors || validationError.message },
        { status: 400 }
      );
    }
  } catch (error: any) {
    console.error('Error creating trading agent:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * PATCH handler for updating a trading agent
 */
export async function PATCH(request: NextRequest) {
  try {
    // Get the user ID from the authenticated session
    const supabase = await createServerClient();
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    const userId = session.user.id;
    
    // Parse the request body
    const body = await request.json();
    const { agentId, action } = body;
    
    if (!agentId) {
      return NextResponse.json(
        { error: 'Agent ID is required' },
        { status: 400 }
      );
    }
    
    // Get the agent to verify ownership
    const agent = await tradingAgentService.getAgentById(agentId);
    
    if (!agent) {
      return NextResponse.json(
        { error: 'Agent not found' },
        { status: 404 }
      );
    }
    
    // Validate that the agent belongs to the authenticated user
    if (agent.userId !== userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      );
    }
    
    // Perform the requested action
    switch (action) {
      case 'activate':
        const activatedAgent = await tradingAgentService.activateAgent(agentId);
        return NextResponse.json(activatedAgent);
      
      case 'pause':
        const pausedAgent = await tradingAgentService.pauseAgent(agentId);
        return NextResponse.json(pausedAgent);
      
      default:
        return NextResponse.json(
          { error: 'Invalid action' },
          { status: 400 }
        );
    }
  } catch (error: any) {
    console.error('Error updating trading agent:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * DELETE handler for deleting a trading agent
 */
export async function DELETE(request: NextRequest) {
  try {
    // Get the user ID from the authenticated session
    const supabase = await createServerClient();
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    const userId = session.user.id;
    
    // Get agent ID from query params
    const { searchParams } = new URL(request.url);
    const agentId = searchParams.get('id');
    
    if (!agentId) {
      return NextResponse.json(
        { error: 'Agent ID is required' },
        { status: 400 }
      );
    }
    
    // Get the agent to verify ownership
    const agent = await tradingAgentService.getAgentById(agentId);
    
    if (!agent) {
      return NextResponse.json(
        { error: 'Agent not found' },
        { status: 404 }
      );
    }
    
    // Validate that the agent belongs to the authenticated user
    if (agent.userId !== userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      );
    }
    
    // Delete the agent
    await tradingAgentService.deleteAgent(agentId);
    
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting trading agent:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
