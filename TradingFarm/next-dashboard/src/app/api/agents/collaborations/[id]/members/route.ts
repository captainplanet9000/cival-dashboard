import { createServerClient } from '@/utils/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

/**
 * GET /api/agents/collaborations/[id]/members
 * 
 * Get all members of a collaboration
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const collaborationId = params.id;
    
    if (!collaborationId) {
      return NextResponse.json(
        { error: 'Collaboration ID is required' },
        { status: 400 }
      );
    }
    
    const supabase = await createServerClient();
    
    // Get members with their agent details
    const { data, error } = await supabase
      .from('agent_collaboration_members')
      .select(`
        *,
        agent:agents(id, name, type)
      `)
      .eq('collaboration_id', collaborationId);
    
    if (error) {
      console.error('Error fetching collaboration members:', error);
      return NextResponse.json(
        { error: 'Failed to fetch collaboration members' },
        { status: 500 }
      );
    }
    
    return NextResponse.json({ members: data || [] });
  } catch (error) {
    console.error('Unexpected error in collaboration members API:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/agents/collaborations/[id]/members
 * 
 * Add a member to a collaboration
 */
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const collaborationId = params.id;
    const { agent_id, role, permissions } = await req.json();
    
    // Validate required fields
    if (!collaborationId || !agent_id) {
      return NextResponse.json(
        { error: 'Collaboration ID and agent_id are required' },
        { status: 400 }
      );
    }
    
    // Validate role
    const validRoles = ['leader', 'member', 'observer'];
    if (role && !validRoles.includes(role)) {
      return NextResponse.json(
        { error: 'Invalid role. Must be one of: leader, member, observer' },
        { status: 400 }
      );
    }
    
    const supabase = await createServerClient();
    
    // Check if agent exists
    const { data: agent, error: agentError } = await supabase
      .from('agents')
      .select('id')
      .eq('id', agent_id)
      .single();
    
    if (agentError || !agent) {
      return NextResponse.json(
        { error: 'Agent not found' },
        { status: 404 }
      );
    }
    
    // Check if collaboration exists
    const { data: collaboration, error: collaborationError } = await supabase
      .from('agent_collaborations')
      .select('id')
      .eq('id', collaborationId)
      .single();
    
    if (collaborationError || !collaboration) {
      return NextResponse.json(
        { error: 'Collaboration not found' },
        { status: 404 }
      );
    }
    
    // Check if the member already exists in the collaboration
    const { data: existingMember, error: existingMemberError } = await supabase
      .from('agent_collaboration_members')
      .select('id')
      .eq('collaboration_id', collaborationId)
      .eq('agent_id', agent_id)
      .maybeSingle();
    
    if (existingMember) {
      return NextResponse.json(
        { error: 'Agent is already a member of this collaboration' },
        { status: 409 }
      );
    }
    
    // Add the member
    const { data: member, error: memberError } = await supabase
      .from('agent_collaboration_members')
      .insert({
        collaboration_id: collaborationId,
        agent_id,
        role: role || 'member',
        permissions: permissions || {}
      })
      .select(`
        *,
        agent:agents(id, name, type)
      `)
      .single();
    
    if (memberError) {
      console.error('Error adding member to collaboration:', memberError);
      return NextResponse.json(
        { error: 'Failed to add member to collaboration' },
        { status: 500 }
      );
    }
    
    return NextResponse.json({ member });
  } catch (error) {
    console.error('Unexpected error adding member to collaboration:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
