import { NextResponse } from 'next/server';
import { createServerClient } from '@/utils/supabase/server';

// Simplified agent creation endpoint that uses only essential fields
export async function POST(request: Request) {
  try {
    const data = await request.json();
    const supabase = await createServerClient();

    // Prepare agent data - using only the minimum fields known to exist
    const agentData = {
      name: data.name || 'New Agent',
      farm_id: data.farm_id,
      status: 'initializing',
      type: 'eliza',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    console.log('Creating basic agent with data:', agentData);

    // Insert agent with only the essential fields
    const { data: agent, error } = await supabase
      .from('agents')
      .insert(agentData)
      .select('id, name, farm_id, status, type, created_at, updated_at')
      .single();

    if (error) {
      console.error('Error creating agent:', error);
      return NextResponse.json(
        { error: `Failed to create agent: ${error.message}` },
        { status: 500 }
      );
    }

    // Return success with the created agent and all additional data as separate fields
    return NextResponse.json({
      agent: {
        ...agent,
        description: data.description || '',
        strategy_type: data.strategy_type || 'custom',
        risk_level: data.risk_level || 'medium',
        target_markets: data.target_markets || [],
        config: data.config || {}
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
