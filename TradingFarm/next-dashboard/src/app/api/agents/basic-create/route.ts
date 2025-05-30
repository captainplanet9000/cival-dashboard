import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createClient } from '@supabase/supabase-js';

// Ultra-basic agent creation endpoint for just one purpose: create a record
export async function POST(request: Request) {
  try {
    const requestData = await request.json();
    
    // Get env variables
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    
    // Get cookies for auth
    const cookieStore = cookies();
    
    // Create Supabase client with the cookies for authentication
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: false,
        detectSessionInUrl: false
      },
      global: {
        headers: {
          cookie: cookieStore.toString()
        }
      }
    });
    
    // Basic validation
    if (!requestData.name || !requestData.farm_id) {
      return NextResponse.json(
        { error: 'Missing required fields: name and farm_id' },
        { status: 400 }
      );
    }
    
    // Check authentication
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }
    
    // Verify farm ownership
    const { data: farmData, error: farmError } = await supabase
      .from('farms')
      .select('id')
      .eq('id', requestData.farm_id)
      .eq('user_id', user.id)
      .single();
      
    if (farmError || !farmData) {
      return NextResponse.json(
        { error: 'Farm not found or not owned by you' },
        { status: 403 }
      );
    }
    
    // Create the most basic agent possible - just the essential fields
    const basicAgent = {
      name: requestData.name,
      farm_id: requestData.farm_id,
      status: 'initializing',
      type: 'eliza',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    console.log('Creating basic agent with data:', basicAgent);
    
    // Insert the agent
    const { data: createdAgent, error: insertError } = await supabase
      .from('agents')
      .insert(basicAgent)
      .select('id, name, farm_id, status, type')
      .single();
      
    if (insertError) {
      console.error('Error inserting agent:', insertError);
      return NextResponse.json(
        { error: `Failed to create agent: ${insertError.message}` },
        { status: 500 }
      );
    }
    
    // Build a response with all the additional data included at the client side
    // This avoids any schema cache issues with the configuration column
    const responseAgent = {
      ...createdAgent,
      // Include these as regular fields since we can't store them in configuration
      description: requestData.description || '',
      strategy_type: requestData.strategy_type || 'custom',
      risk_level: requestData.risk_level || 'medium',
      target_markets: requestData.target_markets || [],
      config: requestData.config || {}
    };
    
    return NextResponse.json({
      agent: responseAgent,
      message: 'Basic agent created successfully'
    });
  } catch (error) {
    console.error('Agent creation error:', error);
    return NextResponse.json(
      { error: 'Failed to create agent' },
      { status: 500 }
    );
  }
}
