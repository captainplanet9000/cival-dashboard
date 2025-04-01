import { NextResponse, NextRequest } from 'next/server';
import { createServerAdminClient } from '@/utils/supabase/server';
import { v4 as uuidv4 } from 'uuid';
import { Database } from '@/types/database.types';

interface AgentConfig {
  description: string;
  strategy_type: string;
  risk_level: string;
  target_markets: string[];
  performance_metrics: {
    win_rate: number;
    profit_loss: number;
    total_trades: number;
    average_trade_duration: number;
  };
  [key: string]: any;
}

interface AgentResult {
  id: number;
  name: string;
  farm_id: number;
  status: string;
  type: string;
  created_at: string;
  updated_at: string;
}

/**
 * GET /api/agents
 * Fetches all agents or agents for a specific farm
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const farmId = searchParams.get('farmId');
    
    const supabase = await createServerAdminClient();
    
    let query = supabase
      .from('agents')
      .select(`
        *,
        farms:farm_id (name)
      `);
    
    // Apply farm filter if provided
    if (farmId) {
      query = query.eq('farm_id', farmId);
    }
    
    // Order by created_at descending (newest first)
    query = query.order('created_at', { ascending: false });
    
    const { data, error } = await query;
    
    if (error) {
      console.error('Error fetching agents:', error);
      return NextResponse.json(
        { error: 'Failed to fetch agents', details: error.message },
        { status: 500 }
      );
    }
    
    // Process the data to extract useful properties
    const processedData = data.map(agent => {
      // Extract configuration properties
      const configObj = agent.configuration || {};
      const performanceMetrics = configObj.performance_metrics || {};
      
      return {
        ...agent,
        // Extract these fields from configuration if they exist
        description: configObj.description || '',
        strategy_type: configObj.strategy_type || '',
        risk_level: configObj.risk_level || '',
        target_markets: Array.isArray(configObj.target_markets) ? configObj.target_markets : [],
        performance_metrics: {
          win_rate: performanceMetrics.win_rate || 0,
          profit_loss: performanceMetrics.profit_loss || 0,
          total_trades: performanceMetrics.total_trades || 0,
          average_trade_duration: performanceMetrics.average_trade_duration || 0
        },
        farm_name: agent.farms?.name || `Farm ${agent.farm_id}`,
        is_active: agent.status === 'active'
      };
    });
    
    return NextResponse.json({ data: processedData });
  } catch (error) {
    console.error('Unexpected error in GET /api/agents:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/agents
 * Create a new agent
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      name, 
      farm_id, 
      type, 
      status, 
      description, 
      strategy_type, 
      risk_level, 
      target_markets,
      config 
    } = body;
    
    if (!name) {
      return NextResponse.json(
        { error: 'Agent name is required' },
        { status: 400 }
      );
    }
    
    if (!farm_id) {
      return NextResponse.json(
        { error: 'Farm ID is required' },
        { status: 400 }
      );
    }
    
    const supabase = await createServerAdminClient();
    
    // Prepare agent data for database
    // Moving fields that don't exist in the table schema into configuration JSON
    const agentToCreate = {
      name,
      farm_id,
      status: status || 'initializing',
      type: type || 'eliza', // Setting to eliza by default
      configuration: {
        description,
        strategy_type,
        risk_level,
        target_markets,
        performance_metrics: {
          win_rate: 0,
          profit_loss: 0,
          total_trades: 0,
          average_trade_duration: 0
        },
        ...config // Add any additional configuration options
      }
    };
    
    const { data, error } = await supabase
      .from('agents')
      .insert(agentToCreate)
      .select(`
        *,
        farms:farm_id (name)
      `)
      .single();
    
    if (error) {
      console.error('Error creating agent:', error);
      return NextResponse.json(
        { error: 'Failed to create agent', details: error.message },
        { status: 500 }
      );
    }
    
    // Process the created agent to match the client-side expected format
    const configObj = data.configuration || {};
    const performanceMetrics = configObj.performance_metrics || {};
    
    const processedAgent = {
      ...data,
      description: configObj.description || '',
      strategy_type: configObj.strategy_type || '',
      risk_level: configObj.risk_level || '',
      target_markets: Array.isArray(configObj.target_markets) ? configObj.target_markets : [],
      performance_metrics: {
        win_rate: performanceMetrics.win_rate || 0,
        profit_loss: performanceMetrics.profit_loss || 0,
        total_trades: performanceMetrics.total_trades || 0,
        average_trade_duration: performanceMetrics.average_trade_duration || 0
      },
      farm_name: data.farms?.name || `Farm ${data.farm_id}`,
      is_active: data.status === 'active'
    };
    
    return NextResponse.json({ data: processedAgent }, { status: 201 });
  } catch (error) {
    console.error('Unexpected error in POST /api/agents:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/agents/:id
 * Update an existing agent
 */
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, ...updates } = body;
    
    if (!id) {
      return NextResponse.json(
        { error: 'Agent ID is required' },
        { status: 400 }
      );
    }
    
    const supabase = await createServerAdminClient();
    
    // Fetch the existing agent to merge with updates
    const { data: existingAgent, error: fetchError } = await supabase
      .from('agents')
      .select('*')
      .eq('id', id)
      .single();
    
    if (fetchError) {
      console.error(`Error fetching agent ${id}:`, fetchError);
      return NextResponse.json(
        { error: 'Failed to fetch existing agent', details: fetchError.message },
        { status: 500 }
      );
    }
    
    // Prepare the updates
    const updatedFields: any = {};
    
    // Handle direct table fields
    if (updates.name) updatedFields.name = updates.name;
    if (updates.status) updatedFields.status = updates.status;
    if (updates.type) updatedFields.type = updates.type;
    if (updates.farm_id) updatedFields.farm_id = updates.farm_id;
    
    // Handle configuration fields
    const existingConfig = existingAgent.configuration || {};
    const updatedConfig = { ...existingConfig };
    
    if (updates.description) updatedConfig.description = updates.description;
    if (updates.strategy_type) updatedConfig.strategy_type = updates.strategy_type;
    if (updates.risk_level) updatedConfig.risk_level = updates.risk_level;
    if (updates.target_markets) updatedConfig.target_markets = updates.target_markets;
    
    // Handle performance metrics update
    if (updates.performance_metrics) {
      updatedConfig.performance_metrics = {
        ...(existingConfig.performance_metrics || {}),
        ...updates.performance_metrics
      };
    }
    
    // Add any other direct config updates
    if (updates.config) {
      Object.assign(updatedConfig, updates.config);
    }
    
    // Add the updated configuration to the update fields
    updatedFields.configuration = updatedConfig;
    
    // Update the agent
    const { data, error } = await supabase
      .from('agents')
      .update(updatedFields)
      .eq('id', id)
      .select(`
        *,
        farms:farm_id (name)
      `)
      .single();
    
    if (error) {
      console.error(`Error updating agent ${id}:`, error);
      return NextResponse.json(
        { error: 'Failed to update agent', details: error.message },
        { status: 500 }
      );
    }
    
    // Process the updated agent to match the client-side expected format
    const configObj = data.configuration || {};
    const performanceMetrics = configObj.performance_metrics || {};
    
    const processedAgent = {
      ...data,
      description: configObj.description || '',
      strategy_type: configObj.strategy_type || '',
      risk_level: configObj.risk_level || '',
      target_markets: Array.isArray(configObj.target_markets) ? configObj.target_markets : [],
      performance_metrics: {
        win_rate: performanceMetrics.win_rate || 0,
        profit_loss: performanceMetrics.profit_loss || 0,
        total_trades: performanceMetrics.total_trades || 0,
        average_trade_duration: performanceMetrics.average_trade_duration || 0
      },
      farm_name: data.farms?.name || `Farm ${data.farm_id}`,
      is_active: data.status === 'active'
    };
    
    return NextResponse.json({ data: processedAgent });
  } catch (error) {
    console.error('Unexpected error in PUT /api/agents:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/agents/:id
 * Delete an agent
 */
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    
    if (!id) {
      return NextResponse.json(
        { error: 'Agent ID is required' },
        { status: 400 }
      );
    }
    
    const supabase = await createServerAdminClient();
    
    const { error } = await supabase
      .from('agents')
      .delete()
      .eq('id', id);
    
    if (error) {
      console.error(`Error deleting agent ${id}:`, error);
      return NextResponse.json(
        { error: 'Failed to delete agent', details: error.message },
        { status: 500 }
      );
    }
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Unexpected error in DELETE /api/agents:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
