import { NextRequest, NextResponse } from '@/types/next-types';
import { createServerClient } from '@/utils/supabase/server';
import { Database } from '@/types/database.types';
import postgres from 'postgres';

/**
 * Direct agent creation endpoint that uses raw SQL to bypass schema cache issues
 */
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
    const name = requestData.name || 'New Agent';
    const farmId = requestData.farm_id;
    const status = requestData.status || 'initializing';
    const type = requestData.type || 'eliza';
    
    // Prepare the configuration JSON object
    const configObject = {
      description: requestData.description || '',
      strategy_type: requestData.strategy_type || 'custom',
      risk_level: requestData.risk_level || 'medium',
      target_markets: requestData.target_markets || [],
      exchange_account_id: requestData.config?.exchange_account_id,
      max_drawdown_percent: requestData.config?.max_drawdown_percent,
      auto_start: requestData.config?.auto_start,
      capital_allocation: requestData.config?.capital_allocation,
      leverage: requestData.config?.leverage,
      performance_metrics: {
        win_rate: 0,
        profit_loss: 0,
        total_trades: 0,
        average_trade_duration: 0
      },
      ...(requestData.config || {})
    };
    
    // Connect to database directly for maximum reliability
    const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } = process.env;
    
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      return NextResponse.json(
        { error: 'Server configuration error' },
        { status: 500 }
      );
    }
    
    // Extract necessary connection info from Supabase URL
    const supabaseUrlMatch = SUPABASE_URL.match(/^(https?:\/\/)(.*?)(:.*?)?$/);
    if (!supabaseUrlMatch) {
      return NextResponse.json(
        { error: 'Invalid Supabase URL format' },
        { status: 500 }
      );
    }
    
    const host = supabaseUrlMatch[2] || 'localhost';
    const port = 5432; // Default Postgres port
    
    try {
      // Attempt direct database connection
      const { data: connectionData, error: connectionError } = await supabase.rpc(
        'direct_insert_agent',
        {
          p_name: name,
          p_farm_id: farmId,
          p_status: status,
          p_type: type,
          p_config: configObject
        }
      );
      
      if (connectionError) {
        console.error('RPC error:', connectionError);
        throw new Error(`RPC execution failed: ${connectionError.message}`);
      }
      
      return NextResponse.json({
        agent: {
          id: connectionData.id,
          name: connectionData.name,
          farm_id: connectionData.farm_id,
          status: connectionData.status,
          type: connectionData.type,
          configuration: connectionData.configuration
        },
        message: 'Agent created successfully'
      });
      
    } catch (sqlError) {
      console.error('SQL execution error:', sqlError);
      
      // Last resort: try raw SQL through Supabase's postgresql-functions interface
      const { data: rawData, error: rawError } = await supabase.rpc(
        'exec_sql',
        {
          sql_string: `
            INSERT INTO agents (name, farm_id, status, type, configuration, created_at, updated_at)
            VALUES (
              '${name.replace(/'/g, "''")}',
              ${farmId},
              '${status.replace(/'/g, "''")}',
              '${type.replace(/'/g, "''")}',
              '${JSON.stringify(configObject).replace(/'/g, "''")}',
              NOW(),
              NOW()
            )
            RETURNING id, name, farm_id, status, type;
          `
        }
      );
      
      if (rawError) {
        console.error('Raw SQL execution error:', rawError);
        return NextResponse.json(
          { error: `Failed to create agent: ${rawError.message}` },
          { status: 500 }
        );
      }
      
      return NextResponse.json({
        agent: {
          id: rawData ? rawData[0]?.id : null,
          name,
          farm_id: farmId,
          status,
          type,
          configuration: configObject
        },
        message: 'Agent created via raw SQL'
      });
    }
  } catch (error) {
    console.error('Agent creation error:', error);
    return NextResponse.json(
      { error: 'Failed to create agent: ' + (error instanceof Error ? error.message : String(error)) },
      { status: 500 }
    );
  }
}
