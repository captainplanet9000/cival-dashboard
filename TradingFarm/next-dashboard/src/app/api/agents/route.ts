import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/utils/supabase/server';
import { Database } from '@/types/database.types';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const farmIdParam = searchParams.get('farmId');
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
    
    let query = supabase
      .from('agents')
      .select('*')
      .order('created_at', { ascending: false });
    
    // Add farm filter if farmId is provided
    if (farmId) {
      query = query.eq('farm_id', farmId);
    } else {
      // If no farmId is provided, filter by farms owned by this user
      // First, get the farms owned by the user
      const { data: userFarms } = await supabase
        .from('farms')
        .select('id')
        .eq('user_id', user.id);
        
      if (userFarms && userFarms.length > 0) {
        // Use the farm IDs to filter agents
        const farmIds = userFarms.map(farm => farm.id);
        query = query.in('farm_id', farmIds);
      }
    }
    
    // Pagination
    const { data: agents, error, count } = await query
      .range(offset, offset + limit - 1);
    
    if (error) {
      console.error('Error fetching agents:', error);
      return NextResponse.json(
        { error: 'Failed to fetch agents data' },
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
    console.error('Agents API error:', error);
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
    
    // Prepare agent data
    const agentData = {
      name: requestData.name,
      description: requestData.description,
      farm_id: requestData.farm_id,
      status: requestData.status || 'initializing',
      type: requestData.type,
      strategy_type: requestData.strategy_type,
      risk_level: requestData.risk_level,
      target_markets: requestData.target_markets || {},
      configuration: requestData.config || {},  // Using configuration instead of config to match DB schema
      user_id: user.id
    };
    
    // Insert agent into Supabase
    const { data: agent, error } = await supabase
      .from('agents')
      .insert(agentData)
      .select()
      .single();
    
    if (error) {
      console.error('Error creating agent:', error);
      return NextResponse.json(
        { error: 'Failed to create agent' },
        { status: 500 }
      );
    }
    
    // Check if agent_history table exists before trying to insert
    try {
      // Log the agent creation in a separate table if it exists
      await supabase
        .rpc('log_agent_action', {
          p_agent_id: agent.id,
          p_farm_id: agent.farm_id,
          p_action_type: 'creation',
          p_description: `Agent "${agent.name}" was created`,
          p_metadata: { configuration: agent.configuration }
        });
    } catch (historyError) {
      // If the stored procedure or table doesn't exist, just log and continue
      console.warn('Could not log agent history:', historyError);
    }
    
    return NextResponse.json({ agent });
  } catch (error) {
    console.error('Agent creation error:', error);
    return NextResponse.json(
      { error: 'Failed to create agent' },
      { status: 500 }
    );
  }
}
