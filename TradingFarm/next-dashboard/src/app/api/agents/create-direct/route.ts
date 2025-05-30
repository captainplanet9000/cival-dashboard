import { NextRequest, NextResponse } from '@/types/next-types';
import { createServerClient } from '@/utils/supabase/server';
import { Database } from '@/types/database.types';
import postgres from 'postgres';

/**
 * Direct Agent Creation API
 * 
 * This endpoint bypasses any service layer issues by directly creating agents
 * in the database, with proper error handling and validation.
 */
export async function POST(request: Request) {
  try {
    // Get the request body
    const agentData = await request.json();
    
    // Basic validation
    if (!agentData.name) {
      return NextResponse.json(
        { error: 'Agent name is required' },
        { status: 400 }
      );
    }
    
    // Get the current authenticated user
    const supabase = createServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json(
        { error: 'You must be authenticated to create an agent' },
        { status: 401 }
      );
    }
    
    // Set default values and timestamps
    const now = new Date().toISOString();
    const finalAgentData = {
      ...agentData,
      user_id: user.id,
      created_at: now,
      updated_at: now,
      status: agentData.status || 'initializing', // Default to initializing
      is_active: agentData.is_active !== undefined ? agentData.is_active : false,
    };
    
    // If type is not specified, default to 'trading'
    if (!finalAgentData.type) {
      finalAgentData.type = 'trading';
    }
    
    // If execution_mode is not specified, default to 'dry-run' for safety
    if (!finalAgentData.execution_mode) {
      finalAgentData.execution_mode = 'dry-run';
    }
    
    // Create the agent
    const { data: agent, error } = await supabase
      .from('agents')
      .insert([finalAgentData])
      .select()
      .single();
    
    if (error) {
      console.error('Error creating agent:', error);
      return NextResponse.json(
        { error: error.message || 'Failed to create agent' },
        { status: 500 }
      );
    }
    
    // If agent creation was successful but no data was returned, return a generic response
    if (!agent) {
      return NextResponse.json(
        { 
          success: true,
          agent: {
            ...finalAgentData,
            id: 'pending', // Frontend should handle this special value
          },
          message: 'Agent created successfully, but no data was returned. It may appear after refresh.'
        },
        { status: 201 }
      );
    }
    
    // Add a farm name to the agent if farm_id is provided
    let extendedAgent = { ...agent };
    
    if (agent.farm_id) {
      try {
        const { data: farm } = await supabase
          .from('farms')
          .select('name')
          .eq('id', agent.farm_id)
          .single();
        
        if (farm) {
          extendedAgent.farm_name = farm.name;
        }
      } catch (farmError) {
        console.warn('Could not fetch farm name:', farmError);
      }
    }
    
    // Return success with the created agent
    return NextResponse.json(
      { 
        success: true,
        agent: extendedAgent,
        message: 'Agent created successfully' 
      },
      { status: 201 }
    );
    
  } catch (error) {
    console.error('Unexpected error creating agent:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
