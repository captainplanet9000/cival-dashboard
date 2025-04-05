/**
 * Agent LLM API Routes
 * 
 * Endpoints for agent LLM interactions in Trading Farm.
 * These endpoints enable agents to use various language models
 * and provide context-enhanced responses.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/utils/supabase/server';
import { getAgentLlmService } from '@/services/api/agent-llm-service';
import { AgentContextType, AgentMessageCategory } from '@/services/api/agent-llm-service';

/**
 * Get Agent LLM Configuration
 * 
 * Returns the LLM configuration for the specified agent
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const agentId = params.id;
    
    if (!agentId) {
      return NextResponse.json(
        { error: 'Agent ID is required' },
        { status: 400 }
      );
    }
    
    // Get supabase client for server
    const supabase = createServerClient();
    
    // Verify agent exists and user has access
    const { data: agent, error: agentError } = await supabase
      .from('agents')
      .select('id, name, user_id')
      .eq('id', agentId)
      .single();
    
    if (agentError || !agent) {
      return NextResponse.json(
        { error: 'Agent not found or access denied' },
        { status: 404 }
      );
    }
    
    // Get the current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }
    
    // Verify user has access to this agent
    if (agent.user_id !== user.id) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      );
    }
    
    // Get agent LLM service
    const agentLlmService = getAgentLlmService();
    await agentLlmService.initialize();
    
    // Get agent LLM configuration
    const llmConfig = await agentLlmService.getAgentLlmConfig(agentId);
    
    return NextResponse.json({
      config: llmConfig
    });
  } catch (error) {
    console.error('Error in GET /api/agents/[id]/llm:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * Process Agent Message
 * 
 * Processes a message for the agent using its LLM configuration
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const agentId = params.id;
    
    if (!agentId) {
      return NextResponse.json(
        { error: 'Agent ID is required' },
        { status: 400 }
      );
    }
    
    // Parse request body
    const body = await request.json();
    const { 
      message, 
      contextType = 'general' as AgentContextType,
      category = 'query' as AgentMessageCategory,
      includeMarketContext = false,
      model,
      temperature,
      maxTokens
    } = body;
    
    if (!message) {
      return NextResponse.json(
        { error: 'Message is required' },
        { status: 400 }
      );
    }
    
    // Get supabase client for server
    const supabase = createServerClient();
    
    // Verify agent exists and user has access
    const { data: agent, error: agentError } = await supabase
      .from('agents')
      .select('id, name, user_id')
      .eq('id', agentId)
      .single();
    
    if (agentError || !agent) {
      return NextResponse.json(
        { error: 'Agent not found or access denied' },
        { status: 404 }
      );
    }
    
    // Get the current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }
    
    // Verify user has access to this agent
    if (agent.user_id !== user.id) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      );
    }
    
    // Get agent LLM service
    const agentLlmService = getAgentLlmService();
    await agentLlmService.initialize();
    
    // Process the message
    const response = await agentLlmService.processAgentMessage(
      agentId,
      message,
      {
        contextType,
        category,
        includeMarketContext,
        model,
        temperature,
        maxTokens
      }
    );
    
    return NextResponse.json({
      response
    });
  } catch (error) {
    console.error('Error in POST /api/agents/[id]/llm:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * Get Agent Message History
 * 
 * Returns the message history for the specified agent
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const agentId = params.id;
    
    if (!agentId) {
      return NextResponse.json(
        { error: 'Agent ID is required' },
        { status: 400 }
      );
    }
    
    // Get query parameters
    const searchParams = request.nextUrl.searchParams;
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const offset = parseInt(searchParams.get('offset') || '0', 10);
    
    // Get supabase client for server
    const supabase = createServerClient();
    
    // Verify agent exists and user has access
    const { data: agent, error: agentError } = await supabase
      .from('agents')
      .select('id, name, user_id')
      .eq('id', agentId)
      .single();
    
    if (agentError || !agent) {
      return NextResponse.json(
        { error: 'Agent not found or access denied' },
        { status: 404 }
      );
    }
    
    // Get the current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }
    
    // Verify user has access to this agent
    if (agent.user_id !== user.id) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      );
    }
    
    // Get agent LLM service
    const agentLlmService = getAgentLlmService();
    
    // Get message history
    const history = await agentLlmService.getAgentMessageHistory(
      agentId,
      limit,
      offset
    );
    
    return NextResponse.json({
      history
    });
  } catch (error) {
    console.error('Error in GET /api/agents/[id]/llm/history:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
