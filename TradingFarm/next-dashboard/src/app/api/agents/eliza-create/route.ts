import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createServerClient } from '@/utils/supabase/server';

/**
 * Specialized endpoint for creating Eliza agents using a direct Postgres function
 * This bypasses schema cache issues and ensures full Eliza functionality
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
    
    // Prepare config object with advanced settings
    const configObject = {
      exchange_account_id: requestData.config?.exchange_account_id,
      max_drawdown_percent: requestData.config?.max_drawdown_percent,
      auto_start: requestData.config?.auto_start || false,
      capital_allocation: requestData.config?.capital_allocation || 10,
      leverage: requestData.config?.leverage || 1,
      advanced_settings: requestData.config?.advanced_settings || {}
    };
    
    // Use our specialized Postgres function to create the agent
    const { data, error } = await supabase.rpc(
      'create_eliza_agent',
      {
        p_name: requestData.name,
        p_farm_id: requestData.farm_id,
        p_description: requestData.description || '',
        p_strategy_type: requestData.strategy_type || 'custom',
        p_risk_level: requestData.risk_level || 'medium',
        p_target_markets: requestData.target_markets || [],
        p_config: configObject
      }
    );
    
    if (error) {
      console.error('Error creating Eliza agent:', error);
      
      // Try a fallback direct approach
      try {
        console.log('Attempting direct SQL insert as fallback...');
        
        // Insert bare minimum agent
        const { data: fallbackData, error: fallbackError } = await supabase
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
          
        if (fallbackError) {
          throw new Error(`Fallback insert failed: ${fallbackError.message}`);
        }
        
        // Return agent with client-side configuration
        return NextResponse.json({
          agent: {
            ...fallbackData,
            configuration: {
              description: requestData.description || '',
              strategy_type: requestData.strategy_type || 'custom',
              risk_level: requestData.risk_level || 'medium',
              target_markets: requestData.target_markets || [],
              ...configObject
            }
          },
          message: 'Agent created via fallback method',
          note: 'Configuration stored client-side only; some backend features may be limited'
        });
      } catch (fallbackError) {
        console.error('Fallback method failed:', fallbackError);
        return NextResponse.json(
          { error: `Failed to create agent: ${error.message}` },
          { status: 500 }
        );
      }
    }
    
    // Return the created agent
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
