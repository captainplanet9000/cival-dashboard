import { createServerClient } from '@/utils/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

/**
 * GET /api/agents/collaborations
 * 
 * Get all collaborations or filter by farmId
 */
export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const farmId = searchParams.get('farm_id');
    
    const supabase = await createServerClient();
    
    let query = supabase
      .from('agent_collaborations')
      .select('*, members:agent_collaboration_members(*)');

    // Filter by farmId if provided
    if (farmId) {
      query = query.eq('farm_id', farmId);
    }
    
    const { data, error } = await query;
    
    if (error) {
      console.error('Error fetching agent collaborations:', error);
      return NextResponse.json(
        { error: 'Failed to fetch agent collaborations' },
        { status: 500 }
      );
    }
    
    return NextResponse.json({ collaborations: data });
  } catch (error) {
    console.error('Unexpected error in collaborations API:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/agents/collaborations
 * 
 * Create a new collaboration
 */
export async function POST(req: NextRequest) {
  try {
    const { name, farm_id, description, config } = await req.json();
    
    // Validate required fields
    if (!name || !farm_id) {
      return NextResponse.json(
        { error: 'Name and farm_id are required' },
        { status: 400 }
      );
    }
    
    const supabase = await createServerClient();
    
    // Get user ID for RLS policies
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }
    
    // Create the collaboration
    const { data, error } = await supabase
      .from('agent_collaborations')
      .insert({
        name,
        farm_id,
        description: description || null,
        config: config || {},
        is_active: true,
        user_id: user.id
      })
      .select('*')
      .single();
    
    if (error) {
      console.error('Error creating collaboration:', error);
      return NextResponse.json(
        { error: 'Failed to create collaboration' },
        { status: 500 }
      );
    }
    
    return NextResponse.json({ collaboration: data });
  } catch (error) {
    console.error('Unexpected error in collaboration creation:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
