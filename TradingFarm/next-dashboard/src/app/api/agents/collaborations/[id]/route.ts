import { createServerClient } from '@/utils/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

/**
 * GET /api/agents/collaborations/[id]
 * 
 * Get a specific collaboration with its members
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
    
    // Get the collaboration with its members
    const { data: collaboration, error: collaborationError } = await supabase
      .from('agent_collaborations')
      .select('*')
      .eq('id', collaborationId)
      .single();
    
    if (collaborationError) {
      console.error('Error fetching collaboration:', collaborationError);
      return NextResponse.json(
        { error: 'Failed to fetch collaboration' },
        { status: 500 }
      );
    }
    
    if (!collaboration) {
      return NextResponse.json(
        { error: 'Collaboration not found' },
        { status: 404 }
      );
    }
    
    // Get members with their agent details
    const { data: members, error: membersError } = await supabase
      .from('agent_collaboration_members')
      .select(`
        *,
        agent:agents(id, name, type)
      `)
      .eq('collaboration_id', collaborationId);
    
    if (membersError) {
      console.error('Error fetching collaboration members:', membersError);
      return NextResponse.json(
        { error: 'Failed to fetch collaboration members' },
        { status: 500 }
      );
    }
    
    // Add members to the collaboration object
    const collaborationWithMembers = {
      ...collaboration,
      members: members || []
    };
    
    return NextResponse.json({ collaboration: collaborationWithMembers });
  } catch (error) {
    console.error('Unexpected error in collaboration API:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/agents/collaborations/[id]
 * 
 * Update a collaboration
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const collaborationId = params.id;
    const { name, description, is_active, config } = await req.json();
    
    if (!collaborationId) {
      return NextResponse.json(
        { error: 'Collaboration ID is required' },
        { status: 400 }
      );
    }
    
    const supabase = await createServerClient();
    
    // Build update object with only provided fields
    const updateData: Record<string, any> = {};
    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (is_active !== undefined) updateData.is_active = is_active;
    if (config !== undefined) updateData.config = config;
    
    // Update the collaboration
    const { data, error } = await supabase
      .from('agent_collaborations')
      .update(updateData)
      .eq('id', collaborationId)
      .select('*')
      .single();
    
    if (error) {
      console.error('Error updating collaboration:', error);
      return NextResponse.json(
        { error: 'Failed to update collaboration' },
        { status: 500 }
      );
    }
    
    return NextResponse.json({ collaboration: data });
  } catch (error) {
    console.error('Unexpected error in collaboration update:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/agents/collaborations/[id]
 * 
 * Delete a collaboration
 */
export async function DELETE(
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
    
    // First delete all members of the collaboration
    const { error: membersError } = await supabase
      .from('agent_collaboration_members')
      .delete()
      .eq('collaboration_id', collaborationId);
    
    if (membersError) {
      console.error('Error deleting collaboration members:', membersError);
      return NextResponse.json(
        { error: 'Failed to delete collaboration members' },
        { status: 500 }
      );
    }
    
    // Then delete the collaboration itself
    const { error } = await supabase
      .from('agent_collaborations')
      .delete()
      .eq('id', collaborationId);
    
    if (error) {
      console.error('Error deleting collaboration:', error);
      return NextResponse.json(
        { error: 'Failed to delete collaboration' },
        { status: 500 }
      );
    }
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Unexpected error in collaboration deletion:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
