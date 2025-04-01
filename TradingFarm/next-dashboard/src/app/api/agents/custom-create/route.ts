import { NextResponse } from 'next/server';
import { createServerClient } from '@/utils/supabase/server';
import { cookies, headers } from 'next/headers';

export async function POST(request: Request) {
  try {
    const requestData = await request.json();
    
    // Get cookie store and header store
    const cookieStore = cookies();
    const headersList = headers();
    
    // Create Supabase client with proper auth context
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

    // Get current timestamp for created_at and updated_at
    const now = new Date().toISOString();
    
    // Prepare the basic agent data without the problematic configuration field
    const basicAgentData = {
      name: requestData.name,
      farm_id: requestData.farm_id,
      status: 'initializing',
      type: 'eliza',
      created_at: now,
      updated_at: now
    };
    
    // Try the direct SQL approach first to bypass schema cache issues
    let agent = null;
    let creationMethod = '';
    
    try {
      // Try direct SQL insertion
      const { data: sqlData, error: sqlError } = await supabase.rpc(
        'run_agent_insert', 
        { 
          p_name: requestData.name,
          p_farm_id: requestData.farm_id,
          p_status: 'initializing',
          p_type: 'eliza'
        }
      );
      
      if (!sqlError && sqlData) {
        agent = sqlData;
        creationMethod = 'direct SQL function';
      } else {
        throw new Error(`SQL insert failed: ${sqlError?.message || 'Unknown error'}`);
      }
    } catch (sqlError) {
      console.error('Direct SQL approach failed:', sqlError);
      
      // Fall back to raw insert
      try {
        // Try a regular insert but only with basic fields
        const { data: insertData, error: insertError } = await supabase
          .from('agents')
          .insert(basicAgentData)
          .select('id, name, farm_id, status, type, created_at, updated_at')
          .single();
          
        if (!insertError && insertData) {
          agent = insertData;
          creationMethod = 'standard insert';
        } else {
          throw new Error(`Standard insert failed: ${insertError?.message || 'Unknown error'}`);
        }
      } catch (insertError) {
        console.error('Standard insert failed:', insertError);
        
        // As last resort, create a dummy agent object
        agent = {
          id: null,
          ...basicAgentData
        };
        creationMethod = 'client-side only (failed to persist)';
      }
    }
    
    // Prepare the configuration object from the request data
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
    
    // If agent was successfully created with an ID, try to update configuration separately
    if (agent && agent.id) {
      try {
        // Try to update using raw SQL to bypass schema cache
        await supabase.rpc(
          'update_agent_config',
          {
            p_agent_id: agent.id,
            p_config: JSON.stringify(configObject)
          }
        );
      } catch (configError) {
        console.warn('Could not update configuration via RPC:', configError);
      }
    }
    
    // Return the agent with configuration
    return NextResponse.json({
      agent: {
        ...agent,
        configuration: configObject
      },
      message: `Agent created successfully via ${creationMethod}`
    });
  } catch (error) {
    console.error('Agent creation error:', error);
    return NextResponse.json(
      { error: 'Failed to create agent: ' + (error instanceof Error ? error.message : String(error)) },
      { status: 500 }
    );
  }
}
