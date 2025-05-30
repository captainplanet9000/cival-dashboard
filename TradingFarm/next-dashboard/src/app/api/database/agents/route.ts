/**
 * API Routes for Agent Management
 * Provides CRUD operations for AI trading agents
 */
import { NextRequest, NextResponse } from 'next/server';
import neonClient from '@/utils/database/neon-client';
import pineconeClient from '@/utils/database/pinecone-client';
import { generateUniqueId } from '@/utils/helpers';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const farmId = searchParams.get('farmId');
    const agentId = searchParams.get('agentId');
    
    if (agentId) {
      // Get a specific agent
      const agent = await neonClient.getAgent(agentId);
      
      if (!agent) {
        return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
      }
      
      // Get agent trades if requested
      if (searchParams.get('includeTrades') === 'true') {
        const trades = await neonClient.getAgentTrades(agentId);
        return NextResponse.json({ 
          ...agent, 
          trades_data: trades 
        });
      }
      
      return NextResponse.json(agent);
    }
    
    // Get all agents, optionally filtered by farmId
    const agents = await neonClient.getAgents(farmId || undefined);
    return NextResponse.json(agents);
  } catch (error) {
    console.error('Error fetching agents:', error);
    return NextResponse.json(
      { error: 'Failed to fetch agents' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    
    // Validate required fields
    if (!data.name || !data.status || !data.type) {
      return NextResponse.json(
        { error: 'Missing required fields: name, status, and type are required' },
        { status: 400 }
      );
    }
    
    // Set default values for optional fields
    const agent = {
      ...data,
      performance: data.performance || 0,
      trades: data.trades || 0,
      win_rate: data.win_rate || 0,
      settings: data.settings || {
        risk_level: 'medium',
        max_drawdown: 10,
        position_sizing: 5,
        trades_per_day: 5,
        automation_level: 'semi',
        timeframes: ['1h', '4h'],
        indicators: ['RSI', 'Moving Average', 'Volume']
      }
    };
    
    // If there are instructions, store them in Pinecone
    if (data.instructions && data.instructions.length > 0) {
      try {
        // Add to vector database
        const vectorId = `agent_instructions_${generateUniqueId()}`;
        await pineconeClient.addDocument({
          id: vectorId,
          text: data.instructions.join('\n'),
          metadata: {
            type: 'agent_instructions',
            agentName: data.name,
            agentType: data.type,
            timestamp: new Date().toISOString()
          }
        });
        
        // Store the vector ID in the agent record
        agent.vector_id = vectorId;
      } catch (vectorError) {
        console.error('Error storing agent instructions in vector database:', vectorError);
        // Continue with agent creation even if vector storage fails
      }
    }
    
    const newAgent = await neonClient.createAgent(agent);
    return NextResponse.json(newAgent, { status: 201 });
  } catch (error) {
    console.error('Error creating agent:', error);
    return NextResponse.json(
      { error: 'Failed to create agent' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const data = await request.json();
    
    if (!data.id) {
      return NextResponse.json(
        { error: 'Missing agent ID' },
        { status: 400 }
      );
    }
    
    // Check if agent exists
    const existingAgent = await neonClient.getAgent(data.id);
    if (!existingAgent) {
      return NextResponse.json(
        { error: 'Agent not found' },
        { status: 404 }
      );
    }
    
    // Handle instruction updates if provided
    if (data.instructions && data.instructions.length > 0) {
      try {
        const vectorId = existingAgent.vector_id || `agent_instructions_${generateUniqueId()}`;
        
        await pineconeClient.addDocument({
          id: vectorId,
          text: data.instructions.join('\n'),
          metadata: {
            type: 'agent_instructions',
            agentName: data.name || existingAgent.name,
            agentType: data.type || existingAgent.type,
            timestamp: new Date().toISOString()
          }
        });
        
        // Include vector ID in the update
        data.vector_id = vectorId;
      } catch (vectorError) {
        console.error('Error updating agent instructions in vector database:', vectorError);
        // Continue with agent update even if vector update fails
      }
      
      // Remove instructions from the database update
      delete data.instructions;
    }
    
    const updatedAgent = await neonClient.updateAgent(data.id, data);
    return NextResponse.json(updatedAgent);
  } catch (error) {
    console.error('Error updating agent:', error);
    return NextResponse.json(
      { error: 'Failed to update agent' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const agentId = searchParams.get('id');
    
    if (!agentId) {
      return NextResponse.json(
        { error: 'Missing agent ID' },
        { status: 400 }
      );
    }
    
    // Get agent before deletion to check for vector ID
    const agent = await neonClient.getAgent(agentId);
    
    if (!agent) {
      return NextResponse.json(
        { error: 'Agent not found' },
        { status: 404 }
      );
    }
    
    // Delete instructions from vector database if exists
    if (agent.vector_id) {
      try {
        await pineconeClient.deleteDocument(agent.vector_id);
      } catch (vectorError) {
        console.error('Error deleting agent instructions from vector database:', vectorError);
        // Continue with agent deletion even if vector deletion fails
      }
    }
    
    const success = await neonClient.deleteAgent(agentId);
    
    if (!success) {
      return NextResponse.json(
        { error: 'Failed to delete agent' },
        { status: 500 }
      );
    }
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting agent:', error);
    return NextResponse.json(
      { error: 'Failed to delete agent' },
      { status: 500 }
    );
  }
}
