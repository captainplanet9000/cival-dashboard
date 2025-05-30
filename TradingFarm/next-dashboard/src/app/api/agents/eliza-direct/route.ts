import { NextResponse } from 'next/server';
import { createServerClient } from '@/utils/supabase/server';

interface AgentResponse {
  id: number;
  name: string;
  farm_id: number;
  status: string;
  type: string;
  configuration?: any;
  created_at: string;
  updated_at: string;
}

interface SqlResult {
  success: boolean;
  rows: AgentResponse[];
  error?: string;
  detail?: string;
}

/**
 * Direct SQL approach for Eliza agent creation
 * Bypasses schema cache issues by using direct SQL queries
 */
export async function POST(request: Request) {
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
    
    // Prepare the configuration object
    const configObject = {
      description: requestData.description || '',
      strategy_type: requestData.strategy_type || 'custom',
      risk_level: requestData.risk_level || 'medium',
      target_markets: requestData.target_markets || [],
      exchange_account_id: requestData.config?.exchange_account_id,
      max_drawdown_percent: requestData.config?.max_drawdown_percent,
      auto_start: requestData.config?.auto_start || false,
      capital_allocation: requestData.config?.capital_allocation || 10,
      leverage: requestData.config?.leverage || 1,
      advanced_settings: requestData.config?.advanced_settings || {},
      performance_metrics: {
        win_rate: 0,
        profit_loss: 0,
        total_trades: 0,
        average_trade_duration: 0
      }
    };
    
    console.log('Attempting to create Eliza agent using insert_eliza_agent function...');
    
    // Use our specialized PostgreSQL function to create the agent
    // Type assertion for custom RPC function
    const { data, error } = await supabase.rpc('insert_eliza_agent', {
      p_name: requestData.name,
      p_farm_id: requestData.farm_id,
      p_config: configObject
    }) as { data: any, error: any };
    
    if (error || (data && typeof data === 'object' && 'error' in data)) {
      console.error('Error using insert_eliza_agent:', error || (data as any).error);
      
      // Direct SQL insert to bypass the schema cache
      try {
        console.log('Attempting direct SQL insert...');
        const insertSQL = `
          INSERT INTO agents (
            name, 
            farm_id, 
            status, 
            type, 
            created_at, 
            updated_at
          ) VALUES (
            $1, $2, $3, $4, NOW(), NOW()
          ) RETURNING id, name, farm_id, status, type, created_at, updated_at;
        `;
        
        const { data: sqlData, error: sqlError } = await supabase.rpc('run_sql_with_params', { 
          sql_query: insertSQL,
          param_values: [
            requestData.name, 
            requestData.farm_id.toString(), 
            'initializing', 
            'eliza'
          ]
        }) as { data: SqlResult, error: any };
        
        if (sqlError || !sqlData || !sqlData.success) {
          throw new Error(`SQL execution failed: ${sqlError?.message || 'Unknown error'}`);
        }
        
        // Extract the agent ID from the result
        const agentResult = sqlData.rows?.[0];
        if (!agentResult || !agentResult.id) {
          throw new Error('No agent ID returned from direct insert');
        }
        
        // Return agent with client-side configuration
        return NextResponse.json({
          agent: {
            ...agentResult,
            configuration: configObject
          },
          message: 'Eliza agent created via direct SQL',
          configMethod: 'client-side'
        });
      } catch (sqlError) {
        // Final fallback - simplest possible insert
        try {
          console.log('Trying final fallback - simplest insert...');
          
          const { data: basicData, error: basicError } = await supabase
            .from('agents')
            .insert({
              name: requestData.name,
              farm_id: requestData.farm_id,
              status: 'initializing',
              type: 'eliza',
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            })
            .select('id, name, farm_id, status, type')
            .single();
            
          if (basicError) {
            throw new Error(`Basic insert failed: ${basicError.message}`);
          }
          
          return NextResponse.json({
            agent: {
              ...basicData,
              configuration: configObject
            },
            message: 'Basic Eliza agent created',
            configMethod: 'client-side-only'
          });
        } catch (basicError) {
          console.error('All fallback methods failed:', basicError);
          return NextResponse.json(
            { error: 'Failed to create agent after all attempts' },
            { status: 500 }
          );
        }
      }
    }
    
    // Success - agent created with our function
    console.log('Eliza agent created successfully with insert_eliza_agent function');
    return NextResponse.json({
      agent: data,
      message: 'Eliza agent created successfully with full functionality'
    });
  } catch (error) {
    console.error('Agent creation error:', error);
    return NextResponse.json(
      { error: 'Failed to create agent: ' + (error instanceof Error ? error.message : String(error)) },
      { status: 500 }
    );
  }
}
