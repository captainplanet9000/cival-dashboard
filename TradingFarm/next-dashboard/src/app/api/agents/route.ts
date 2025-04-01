import { NextResponse, NextRequest } from 'next/server';
import { createServerClient } from '@/utils/supabase/server';
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

// GET handler for fetching all agents
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const farmIdParam = searchParams.get('farmId') || searchParams.get('farm_id');
    const farmId = farmIdParam ? parseInt(farmIdParam) : null;
    const limit = parseInt(searchParams.get('limit') || '10');
    const offset = parseInt(searchParams.get('offset') || '0');
    
    const supabase = await createServerClient();
    
    // Get the user ID from the authentication session
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    // Base query
    let query = supabase
      .from('agents')
      .select(`
        id,
        name,
        status,
        type,
        farm_id,
        created_at,
        updated_at,
        configuration,
        farms (
          id,
          name
        )
      `, { count: 'exact' });
    
    // Filter by farm_id if provided
    if (farmId) {
      query = query.eq('farm_id', farmId);
    } else {
      // Otherwise, join with farms and filter by user_id to ensure the user only sees their agents
      query = query
        .eq('farms.user_id', user.id);
    }

    // Add pagination
    query = query.range(offset, offset + limit - 1);
    
    const { data: agents, error, count } = await query;
    
    if (error) {
      console.error('Error fetching agents:', error);
      return NextResponse.json(
        { error: 'Failed to fetch agents' },
        { status: 500 }
      );
    }
    
    return NextResponse.json({
      agents,
      total: count || (agents ? agents.length : 0),
      limit,
      offset,
      hasMore: count ? offset + limit < count : false
    });
  } catch (error) {
    console.error('Error fetching agents:', error);
    return NextResponse.json(
      { error: 'Failed to fetch agents data' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const requestData = await request.json();
    const supabase = await createServerClient();

    // Get the user ID from the authentication session
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Verify user owns the farm
    const { data: farmData, error: farmError } = await supabase
      .from('farms')
      .select('id')
      .eq('id', requestData.farm_id)
      .eq('user_id', user.id)
      .single();

    if (farmError || !farmData) {
      return NextResponse.json(
        { error: 'Farm not found or access denied' },
        { status: 403 }
      );
    }

    // Prepare agent configuration data
    const configObject: AgentConfig = {
      description: requestData.description || '',
      strategy_type: requestData.strategy_type || 'custom',
      risk_level: requestData.risk_level || 'medium',
      target_markets: requestData.target_markets || [],
      performance_metrics: {
        win_rate: 0,
        profit_loss: 0,
        total_trades: 0,
        average_trade_duration: 0
      },
      ...(requestData.config || {})
    };

    // Prepare basic agent data
    const agentData = {
      name: requestData.name,
      farm_id: requestData.farm_id,
      status: requestData.status || 'initializing',
      type: requestData.type || 'eliza',
      // Store all additional data in a configuration JSON object
      // This avoids schema issues with missing columns
      configuration: configObject
    };
    
    console.log('Creating agent with data:', agentData);
    
    // Insert agent into Supabase
    const { data: agent, error } = await supabase
      .from('agents')
      .insert([agentData])
      .select('id, name, farm_id, status, type, configuration')
      .single();
    
    if (error) {
      console.error('Error creating agent:', error);
      return NextResponse.json(
        { error: `Failed to create agent: ${error.message}` },
        { status: 500 }
      );
    }
    
    // Skip the agent history logging as it's causing issues
    // We'll add this back once the database procedures are set up properly
    
    return NextResponse.json({ 
      agent,
      message: 'Agent created successfully' 
    });
  } catch (error) {
    console.error('Agent creation error:', error);
    return NextResponse.json(
      { error: 'Failed to create agent: ' + (error instanceof Error ? error.message : String(error)) },
      { status: 500 }
    );
  }
}
