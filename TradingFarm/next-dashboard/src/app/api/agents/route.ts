import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
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
      farm_id: requestData.farm_id,
      status: requestData.status || 'initializing',
      type: requestData.type || 'eliza',
      // Store all additional data in a configuration JSON object
      // This avoids schema issues with missing columns
      configuration: {
        description: requestData.description,
        strategy_type: requestData.strategy_type,
        risk_level: requestData.risk_level,
        target_markets: requestData.target_markets || [],
        performance_metrics: {
          win_rate: 0,
          profit_loss: 0,
          total_trades: 0,
          average_trade_duration: 0
        },
        ...requestData.config
      }
    };
    
    console.log('Creating agent with data:', agentData);
    
    // Insert agent into Supabase
    const { data: agent, error } = await supabase
      .from('agents')
      .insert(agentData)
      .select()
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
    
    return NextResponse.json({ agent });
  } catch (error) {
    console.error('Agent creation error:', error);
    return NextResponse.json(
      { error: 'Failed to create agent' },
      { status: 500 }
    );
  }
}
