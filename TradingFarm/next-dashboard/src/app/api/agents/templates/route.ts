import { createServerClient } from '@/utils/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

/**
 * Agent Templates API
 * Handles fetching and managing agent templates
 */

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerClient();
    
    // Get the current user's session
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }
    
    const userId = session.user.id;
    
    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');
    
    // Build the query to get templates that are public or owned by the user
    let query = supabase
      .from('agent_templates')
      .select('*')
      .or(`is_public.eq.true,user_id.eq.${userId}`)
      .order('name');
    
    // Filter by type if provided
    if (type) {
      query = query.eq('type', type);
    }
    
    // Execute the query
    const { data: templates, error } = await query;
    
    if (error) {
      console.error('Error fetching agent templates:', error);
      return NextResponse.json(
        { error: 'Failed to fetch templates' },
        { status: 500 }
      );
    }
    
    return NextResponse.json({ templates });
  } catch (error) {
    console.error('Unexpected error in agent templates GET:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerClient();
    
    // Get the current user's session
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }
    
    const userId = session.user.id;
    const body = await request.json();
    
    // Validate request body
    const { 
      name, 
      description, 
      type,
      strategy_type,
      config,
      tools_config,
      default_tools,
      trading_permissions,
      instructions,
      is_public = false
    } = body;
    
    if (!name || typeof name !== 'string') {
      return NextResponse.json(
        { error: 'Name is required and must be a string' },
        { status: 400 }
      );
    }
    
    if (!type || typeof type !== 'string') {
      return NextResponse.json(
        { error: 'Type is required and must be a string' },
        { status: 400 }
      );
    }
    
    // Create the template
    const { data: template, error: templateError } = await supabase
      .from('agent_templates')
      .insert({
        name,
        description,
        type,
        strategy_type,
        config: config || {},
        tools_config: tools_config || {},
        default_tools: default_tools || [],
        trading_permissions: trading_permissions || { exchanges: [], defi_protocols: [] },
        instructions,
        is_public,
        user_id: userId
      })
      .select()
      .single();
    
    if (templateError) {
      console.error('Error creating agent template:', templateError);
      return NextResponse.json(
        { error: 'Failed to create agent template' },
        { status: 500 }
      );
    }
    
    return NextResponse.json({ template });
  } catch (error) {
    console.error('Unexpected error in agent templates POST:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
