import { createServerClient } from '@/utils/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

/**
 * PATCH /api/agents/collaborations/[id]/members/[agentId]
 * 
 * Update a member's role or permissions in a collaboration
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string; agentId: string } }
) {
  try {
    const collaborationId = params.id;
    const agentId = params.agentId;
    const { role, permissions } = await req.json();
    
    // Validate required fields
    if (!collaborationId || !agentId) {
      return NextResponse.json(
        { error: 'Collaboration ID and agent ID are required' },
        { status: 400 }
      );
    }
    
    // Validate role if provided
    if (role) {
      const validRoles = ['leader', 'member', 'observer'];
      if (!validRoles.includes(role)) {
        return NextResponse.json(
          { error: 'Invalid role. Must be one of: leader, member, observer' },
          { status: 400 }
        );
      }
    }
    
    const supabase = await createServerClient();
    
    // Build update object with only provided fields
    const updateData: Record<string, any> = {};
    if (role !== undefined) updateData.role = role;
    if (permissions !== undefined) updateData.permissions = permissions;
    
    // Update the member
    const { data, error } = await supabase
      .from('agent_collaboration_members')
      .update(updateData)
      .eq('collaboration_id', collaborationId)
      .eq('agent_id', agentId)
      .select(`
        *,
        agent:agents(id, name, type)
      `)
      .single();
    
    if (error) {
      console.error('Error updating collaboration member:', error);
      return NextResponse.json(
        { error: 'Failed to update collaboration member' },
        { status: 500 }
      );
    }
    
    if (!data) {
      return NextResponse.json(
        { error: 'Member not found in this collaboration' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({ member: data });
  } catch (error) {
    console.error('Unexpected error updating collaboration member:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/agents/collaborations/[id]/members/[agentId]
 * 
 * Remove a member from a collaboration
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string; agentId: string } }
) {
  try {
    const collaborationId = params.id;
    const agentId = params.agentId;
    
    if (!collaborationId || !agentId) {
      return NextResponse.json(
        { error: 'Collaboration ID and agent ID are required' },
        { status: 400 }
      );
    }
    
    const supabase = await createServerClient();
    
    // Check if member exists in this collaboration
    const { data: existingMember, error: existingMemberError } = await supabase
      .from('agent_collaboration_members')
      .select('id')
      .eq('collaboration_id', collaborationId)
      .eq('agent_id', agentId)
      .maybeSingle();
    
    if (!existingMember) {
      return NextResponse.json(
        { error: 'Member not found in this collaboration' },
        { status: 404 }
      );
    }
    
    // Remove the member
    const { error } = await supabase
      .from('agent_collaboration_members')
      .delete()
      .eq('collaboration_id', collaborationId)
      .eq('agent_id', agentId);
    
    if (error) {
      console.error('Error removing member from collaboration:', error);
      return NextResponse.json(
        { error: 'Failed to remove member from collaboration' },
        { status: 500 }
      );
    }
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Unexpected error removing collaboration member:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
