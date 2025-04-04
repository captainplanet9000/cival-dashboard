import { createServerClient } from '@/utils/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

/**
 * Create Agent from Template API
 * Handles creating new agents from predefined templates
 */

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerClient();
    
    // Get the current user's session
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }
    
    const userId = session.user.id;
    const body = await request.json();
    
    // Validate request body
    const { 
      name,
      description,
      farm_id,
      template_id,
      overrides = {}
    } = body;
    
    if (!name || typeof name !== 'string') {
      return NextResponse.json(
        { error: 'Name is required and must be a string' },
        { status: 400 }
      );
    }
    
    if (!farm_id) {
      return NextResponse.json(
        { error: 'Farm ID is required' },
        { status: 400 }
      );
    }
    
    if (!template_id) {
      return NextResponse.json(
        { error: 'Template ID is required' },
        { status: 400 }
      );
    }
    
    // Verify the farm exists and belongs to the user
    const { data: farm, error: farmError } = await supabase
      .from('farms')
      .select('id, name')
      .eq('id', farm_id)
      .eq('user_id', userId)
      .single();
    
    if (farmError || !farm) {
      console.error('Error fetching farm:', farmError);
      return NextResponse.json(
        { error: 'Farm not found or not owned by the current user' },
        { status: 404 }
      );
    }
    
    // Fetch the template
    const { data: template, error: templateError } = await supabase
      .from('agent_templates')
      .select('*')
      .eq('id', template_id)
      .single();
    
    if (templateError || !template) {
      console.error('Error fetching template:', templateError);
      return NextResponse.json(
        { error: 'Template not found' },
        { status: 404 }
      );
    }
    
    // Verify the template is either public or owned by the user
    if (!template.is_public && template.user_id !== userId) {
      return NextResponse.json(
        { error: 'Template not accessible by the current user' },
        { status: 403 }
      );
    }
    
    // Create the agent using the template
    const now = new Date().toISOString();
    const agentData = {
      name,
      description: description || template.description,
      farm_id,
      type: template.type,
      strategy_type: overrides.strategy_type || template.strategy_type,
      status: 'inactive', // Start as inactive for safety
      risk_level: overrides.risk_level || (template.config?.risk_level || 'moderate'),
      target_markets: overrides.target_markets || (template.config?.target_markets || []),
      config: {
        ...(template.config || {}),
        ...(overrides.config || {})
      },
      instructions: overrides.instructions || template.instructions,
      tools_config: {
        ...(template.tools_config || {}),
        ...(overrides.tools_config || {})
      },
      trading_permissions: {
        ...(template.trading_permissions || { exchanges: [], defi_protocols: [] }),
        ...(overrides.trading_permissions || {})
      },
      performance: {
        win_rate: 0,
        profit_loss: 0,
        total_trades: 0,
        average_trade_duration: 0
      },
      user_id: userId,
      created_at: now,
      updated_at: now
    };
    
    // Insert the agent
    const { data: agent, error: agentError } = await supabase
      .from('agents')
      .insert(agentData)
      .select()
      .single();
    
    if (agentError) {
      console.error('Error creating agent:', agentError);
      return NextResponse.json(
        { error: 'Failed to create agent' },
        { status: 500 }
      );
    }
    
    // Equip default tools if specified in the template
    if (template.default_tools && Array.isArray(template.default_tools) && template.default_tools.length > 0) {
      // Get the tool IDs from their names
      const { data: tools, error: toolsError } = await supabase
        .from('agent_tools')
        .select('id, name')
        .in('name', template.default_tools);
      
      if (toolsError) {
        console.error('Error fetching tools:', toolsError);
        // Continue anyway, the agent was created successfully
      } else if (tools && tools.length > 0) {
        // Map tool names to IDs
        const toolMap = new Map(tools.map(tool => [tool.name, tool.id]));
        
        // Create equipped tools entries
        const equippedTools = template.default_tools
          .filter(toolName => toolMap.has(toolName))
          .map(toolName => ({
            agent_id: agent.id,
            tool_id: toolMap.get(toolName),
            config: {}, // Default empty config
            is_active: true
          }));
        
        if (equippedTools.length > 0) {
          const { error: equipError } = await supabase
            .from('agent_equipped_tools')
            .insert(equippedTools);
          
          if (equipError) {
            console.error('Error equipping tools:', equipError);
            // Continue anyway, the agent was created successfully
          }
        }
      }
    }
    
    // Add a welcome message to the agent's message history
    const { error: messageError } = await supabase
      .from('agent_messages')
      .insert({
        agent_id: agent.id,
        content: `Welcome to the Trading Farm! I am ${name}, created from the "${template.name}" template. I am ready to help with ${template.type} tasks using a ${template.strategy_type || 'general'} approach.`,
        role: 'agent',
        source: 'system',
        category: 'status',
        timestamp: now,
        metadata: {
          created_from_template: template.id,
          template_name: template.name
        }
      });
    
    if (messageError) {
      console.error('Error creating welcome message:', messageError);
      // Continue anyway, the agent was created successfully
    }
    
    // Return the created agent with farm info
    return NextResponse.json({
      agent: {
        ...agent,
        farm_name: farm.name
      }
    });
  } catch (error) {
    console.error('Unexpected error in create agent from template:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
