import { NextResponse } from 'next/server';
import { createServerClient } from '@/utils/supabase/server';

export async function POST(request: Request) {
  try {
    // Get the agent data from the request
    const agentData = await request.json();
    
    // Basic validation
    if (!agentData.name) {
      return NextResponse.json(
        { error: 'Agent name is required' },
        { status: 400 }
      );
    }
    
    // Create Supabase client
    const supabase = await createServerClient();
    
    // Check for user authentication
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized - User not authenticated' },
        { status: 401 }
      );
    }
    
    // Set timestamps and user ID
    const now = new Date().toISOString();
    const preparedData = {
      ...agentData,
      user_id: user.id,
      created_at: now,
      updated_at: now,
      // Set defaults if not provided
      status: agentData.status || 'initializing',
      type: agentData.type || 'trading',
      execution_mode: agentData.execution_mode || 'dry-run',
      risk_level: agentData.risk_level || 'medium',
    };
    
    // Insert agent into database
    const { data, error } = await supabase
      .from('agents')
      .insert([preparedData])
      .select()
      .single();
    
    if (error) {
      console.error('Error creating agent:', error);
      
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }
    
    // Return the created agent
    return NextResponse.json(data);
    
  } catch (error) {
    console.error('Unexpected error in agent creation endpoint:', error);
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 