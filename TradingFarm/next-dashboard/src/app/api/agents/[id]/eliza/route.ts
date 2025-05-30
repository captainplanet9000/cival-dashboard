import { createServerClient } from '@/utils/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

/**
 * ElizaOS Agent API 
 * Handles initialization, commands, and retrieval of ElizaOS agent data
 */

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createServerClient();
    const agentId = params.id;
    
    // Get the agent's core data
    const { data: agent, error: agentError } = await supabase
      .from('agents')
      .select('*, farms(*)')
      .eq('id', agentId)
      .single();
    
    if (agentError) {
      console.error('Error fetching agent:', agentError);
      return NextResponse.json(
        { error: 'Failed to fetch agent data' },
        { status: 500 }
      );
    }
    
    if (!agent) {
      return NextResponse.json(
        { error: 'Agent not found' },
        { status: 404 }
      );
    }
    
    // Get the agent's equipped tools
    const { data: equippedTools, error: toolsError } = await supabase
      .from('agent_equipped_tools')
      .select(`
        id,
        config,
        is_active,
        created_at,
        updated_at,
        agent_tools (
          id,
          name,
          description,
          tool_type,
          config,
          is_enabled
        )
      `)
      .eq('agent_id', agentId);
    
    if (toolsError) {
      console.error('Error fetching agent tools:', toolsError);
    }
    
    // Format the response
    const elizaAgent = {
      ...agent,
      equipped_tools: equippedTools || [],
      // Safely extract configuration
      trading_permissions: agent.trading_permissions || { exchanges: [], defi_protocols: [] },
      tools_config: agent.tools_config || {},
      farm_name: agent.farms?.name || null
    };
    
    return NextResponse.json({ agent: elizaAgent });
  } catch (error) {
    console.error('Unexpected error in ElizaOS agent GET:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createServerClient();
    const agentId = params.id;
    const body = await request.json();
    
    // Initialize agent with ElizaOS capabilities if not already initialized
    const { data: agent, error: agentError } = await supabase
      .from('agents')
      .select('*, farms(*)')
      .eq('id', agentId)
      .single();
    
    if (agentError) {
      console.error('Error fetching agent:', agentError);
      return NextResponse.json(
        { error: 'Failed to fetch agent data' },
        { status: 500 }
      );
    }
    
    if (!agent) {
      return NextResponse.json(
        { error: 'Agent not found' },
        { status: 404 }
      );
    }
    
    // Only initialize if needed (trading_permissions is empty or doesn't exist)
    if (!agent.trading_permissions || 
        !agent.tools_config || 
        Object.keys(agent.tools_config).length === 0) {
      
      // Create default ElizaOS agent configuration
      const defaultElizaConfig = {
        memory_enabled: true,
        autonomous_trading: false,
        llm_enabled: true,
        max_memory_items: 100,
        command_registry: [
          "analyze_market",
          "check_balance",
          "place_order",
          "cancel_order",
          "get_positions",
          "get_order_history",
          "analyze_sentiment",
          "set_risk_level",
          "help"
        ]
      };
      
      // Set default trading permissions
      const defaultTradingPermissions = {
        exchanges: [],
        defi_protocols: []
      };
      
      // Update the agent with ElizaOS capabilities
      const { data: updatedAgent, error: updateError } = await supabase
        .from('agents')
        .update({
          tools_config: defaultElizaConfig,
          trading_permissions: defaultTradingPermissions
        })
        .eq('id', agentId)
        .select('*, farms(*)')
        .single();
      
      if (updateError) {
        console.error('Error updating agent with ElizaOS capabilities:', updateError);
        return NextResponse.json(
          { error: 'Failed to initialize ElizaOS agent' },
          { status: 500 }
        );
      }
      
      // Get default tools to equip based on agent type
      const { data: defaultTools, error: toolsError } = await supabase
        .from('agent_tools')
        .select('*')
        .in('tool_type', ['exchange', 'analytics', 'llm'])
        .limit(3);
      
      if (toolsError) {
        console.error('Error fetching default tools:', toolsError);
      } else if (defaultTools && defaultTools.length > 0) {
        // Equip default tools
        const toolInserts = defaultTools.map(tool => ({
          agent_id: agentId,
          tool_id: tool.id,
          config: {},
          is_active: true
        }));
        
        const { error: equipError } = await supabase
          .from('agent_equipped_tools')
          .insert(toolInserts);
        
        if (equipError) {
          console.error('Error equipping default tools:', equipError);
        }
      }
      
      return NextResponse.json({
        agent: {
          ...updatedAgent,
          farm_name: updatedAgent?.farms?.name || null
        }
      });
    }
    
    // Agent already initialized
    return NextResponse.json({
      agent: {
        ...agent,
        farm_name: agent.farms?.name || null
      }
    });
  } catch (error) {
    console.error('Unexpected error in ElizaOS agent POST:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createServerClient();
    const agentId = params.id;
    const body = await request.json();
    
    // Validate the request body
    if (!body || typeof body !== 'object') {
      return NextResponse.json(
        { error: 'Invalid request body' },
        { status: 400 }
      );
    }
    
    // Extract fields we allow to update
    const {
      tools_config,
      trading_permissions,
      llm_config_id
    } = body;
    
    // Build update object with only provided fields
    const updates: Record<string, any> = {};
    if (tools_config) updates.tools_config = tools_config;
    if (trading_permissions) updates.trading_permissions = trading_permissions;
    if (llm_config_id !== undefined) updates.llm_config_id = llm_config_id;
    
    // Only proceed if we have updates
    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { error: 'No valid update fields provided' },
        { status: 400 }
      );
    }
    
    // Update the agent
    const { data: updatedAgent, error: updateError } = await supabase
      .from('agents')
      .update(updates)
      .eq('id', agentId)
      .select('*, farms(*)')
      .single();
    
    if (updateError) {
      console.error('Error updating ElizaOS agent:', updateError);
      return NextResponse.json(
        { error: 'Failed to update ElizaOS agent' },
        { status: 500 }
      );
    }
    
    return NextResponse.json({
      agent: {
        ...updatedAgent,
        farm_name: updatedAgent.farms?.name || null
      }
    });
  } catch (error) {
    console.error('Unexpected error in ElizaOS agent PATCH:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
