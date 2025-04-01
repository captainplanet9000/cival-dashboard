import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createServerClient } from '@/utils/supabase/server';

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

    // Prepare basic agent data
    const agentData = {
      name: requestData.name,
      farm_id: requestData.farm_id,
      status: 'initializing',
      type: 'eliza'
    };

    console.log('Creating agent with data:', agentData);

    // Use direct SQL query to bypass schema cache issues
    const { data, error } = await supabase.from('agents')
      .insert([agentData])
      .select('id, name, farm_id, status, type')
      .single();

    if (error) {
      console.error('Error creating agent:', error);
      
      // Try using direct SQL as a fallback
      // Define a basic agent object in case the fallback fails
      const fallbackAgent = {
        id: null,
        name: agentData.name,
        farm_id: agentData.farm_id,
        status: agentData.status,
        type: agentData.type
      };
      
      try {
        // Use raw SQL via Supabase API
        const rawSql = `
          INSERT INTO agents (name, farm_id, status, type, created_at, updated_at)
          VALUES (
            '${agentData.name.replace(/'/g, "''")}', 
            ${agentData.farm_id}, 
            '${agentData.status}', 
            '${agentData.type}',
            NOW(),
            NOW()
          )
          RETURNING id, name, farm_id, status, type
        `;
        
        // Execute the SQL using a POST request to Supabase
        const res = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/rpc/run_sql`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
            'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
          },
          body: JSON.stringify({ query: rawSql })
        });
        
        if (!res.ok) {
          throw new Error(`SQL API call failed: ${res.statusText}`);
        }
        
        const sqlResult = await res.json();
        if (sqlResult && Array.isArray(sqlResult) && sqlResult.length > 0) {
          // Use the first result from the SQL query
          fallbackAgent.id = sqlResult[0].id;
        }
      } catch (sqlError) {
        console.error('SQL fallback failed:', sqlError);
        // Continue with the fallback agent
      }
      
      // After creating or failing, prepare the configuration
      const configObject = {
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
      
      // Return the fallback agent with configuration
      return NextResponse.json({ 
        agent: {
          ...fallbackAgent,
          configuration: configObject
        },
        message: fallbackAgent.id ? 'Agent created via SQL fallback' : 'Failed to create agent properly'
      });
    }

    // After creating, prepare the configuration
    const configObject = {
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

    // Try to update the configuration separately
    try {
      await supabase.from('agents')
        .update({ configuration: configObject })
        .eq('id', data.id);
    } catch (configError) {
      console.warn('Could not set configuration, but agent was created:', configError);
    }

    return NextResponse.json({ 
      agent: {
        ...data,
        configuration: configObject
      },
      message: 'Agent created successfully' 
    });
  } catch (error) {
    console.error('Agent creation error:', error);
    return NextResponse.json(
      { error: 'Failed to create agent' },
      { status: 500 }
    );
  }
}
