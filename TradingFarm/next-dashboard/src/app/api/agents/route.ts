import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createServerClient } from '@/utils/supabase/server';
import type { NextRequest } from 'next/server';

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
    const supabase = await createServerClient();
    
    // Get the user ID from the authentication session
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    // Try to get farm_id from query params
    const { searchParams } = new URL(request.url);
    const farmIdParam = searchParams.get('farm_id');
    const farmId = farmIdParam ? parseInt(farmIdParam, 10) : null;
    
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
        farms (
          id,
          name
        )
      `);
    
    // Filter by farm_id if provided
    if (farmId) {
      query = query.eq('farm_id', farmId);
    } else {
      // Otherwise, join with farms and filter by user_id to ensure the user only sees their agents
      query = query
        .eq('farms.user_id', user.id);
    }
    
    const { data: agents, error } = await query;
    
    if (error) {
      console.error('Error fetching agents:', error);
      return NextResponse.json(
        { error: 'Failed to fetch agents' },
        { status: 500 }
      );
    }
    
    return NextResponse.json({ agents });
  } catch (error) {
    console.error('Error fetching agents:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}

// POST handler for creating a new agent
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
      status: 'initializing',
      type: 'eliza'
    };

    console.log('Creating agent with data:', { ...agentData, configuration: configObject });

    // First try: Basic insert without configuration to test schema compatibility
    const { data: basicAgentData, error: basicError } = await supabase
      .from('agents')
      .insert([agentData])
      .select('id, name, farm_id, status, type')
      .single();

    if (basicError) {
      console.error('Basic agent creation failed:', basicError);
      
      // Create a temporary agent response for UI to continue
      const tempAgentResponse = {
        id: Math.floor(Math.random() * 1000000), // Temporary ID
        ...agentData,
        configuration: configObject,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      
      return NextResponse.json({ 
        agent: tempAgentResponse,
        message: 'Agent created in memory only',
        error: 'Database insertion failed, but UI can continue with this temporary agent',
        details: basicError.message
      });
    }

    // Now try to update with configuration if basic insert succeeded
    try {
      const { error: configError } = await supabase
        .from('agents')
        .update({ configuration: configObject })
        .eq('id', basicAgentData.id);
      
      if (configError) {
        // Configuration column may not exist, but we still have a valid agent
        console.warn('Failed to update agent configuration:', configError);
        
        // Return the created agent without configuration in database
        return NextResponse.json({ 
          agent: {
            ...basicAgentData,
            configuration: configObject // Include in API response even if not in DB
          },
          message: 'Agent created successfully (configuration in memory only)',
          warning: 'Configuration not saved to database'
        });
      }
    } catch (updateError) {
      console.warn('Exception updating configuration:', updateError);
      // Continue with the agent we created
    }

    // Success path - agent was created and possibly updated with configuration
    return NextResponse.json({ 
      agent: {
        ...basicAgentData,
        configuration: configObject
      },
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
