import { createServerClient } from '@/utils/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';

/**
 * GET /api/agents/collaborations/[id]/messages
 * 
 * Get messages for a collaboration
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const collaborationId = params.id;
    const searchParams = req.nextUrl.searchParams;
    const limit = parseInt(searchParams.get('limit') || '50');
    const includeRead = searchParams.get('include_read') === 'true';
    
    if (!collaborationId) {
      return NextResponse.json(
        { error: 'Collaboration ID is required' },
        { status: 400 }
      );
    }
    
    const supabase = await createServerClient();
    
    // Get the collaboration to verify it exists
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
    
    // Get all members of the collaboration
    const { data: members, error: membersError } = await supabase
      .from('agent_collaboration_members')
      .select('agent_id')
      .eq('collaboration_id', collaborationId);
    
    if (membersError) {
      console.error('Error fetching collaboration members:', membersError);
      return NextResponse.json(
        { error: 'Failed to fetch collaboration members' },
        { status: 500 }
      );
    }
    
    if (!members || members.length === 0) {
      return NextResponse.json(
        { communications: [] }
      );
    }
    
    // Get messages for any agent in this collaboration
    const agentIds = members.map(member => member.agent_id);
    
    let query = supabase
      .from('agent_communications')
      .select('*')
      .in('sender_id', agentIds)
      .order('created_at', { ascending: false })
      .limit(limit);
    
    // Add metadata filter for collaboration ID
    query = query.eq('metadata->collaboration_id', collaborationId);
    
    // Filter out read messages if not including them
    if (!includeRead) {
      query = query.eq('read', false);
    }
    
    const { data, error } = await query;
    
    if (error) {
      console.error('Error fetching collaboration messages:', error);
      return NextResponse.json(
        { error: 'Failed to fetch collaboration messages' },
        { status: 500 }
      );
    }
    
    return NextResponse.json({ communications: data || [] });
  } catch (error) {
    console.error('Unexpected error in collaboration messages API:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/agents/collaborations/[id]/messages
 * 
 * Send a message to all members of a collaboration
 */
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const collaborationId = params.id;
    const { sender_id, content, message_type, priority, metadata = {} } = await req.json();
    
    // Validate required fields
    if (!collaborationId || !sender_id || !content) {
      return NextResponse.json(
        { error: 'Collaboration ID, sender_id, and content are required' },
        { status: 400 }
      );
    }
    
    const supabase = await createServerClient();
    
    // Check if collaboration exists
    const { data: collaboration, error: collaborationError } = await supabase
      .from('agent_collaborations')
      .select('id, farm_id')
      .eq('id', collaborationId)
      .single();
    
    if (collaborationError || !collaboration) {
      return NextResponse.json(
        { error: 'Collaboration not found' },
        { status: 404 }
      );
    }
    
    // Check if sender is part of this collaboration
    const { data: senderMember, error: senderMemberError } = await supabase
      .from('agent_collaboration_members')
      .select('id, role')
      .eq('collaboration_id', collaborationId)
      .eq('agent_id', sender_id)
      .single();
    
    if (senderMemberError || !senderMember) {
      return NextResponse.json(
        { error: 'Sender must be a member of this collaboration' },
        { status: 403 }
      );
    }
    
    // Get all members of the collaboration except the sender
    const { data: members, error: membersError } = await supabase
      .from('agent_collaboration_members')
      .select('agent_id')
      .eq('collaboration_id', collaborationId)
      .neq('agent_id', sender_id);
    
    if (membersError) {
      console.error('Error fetching collaboration members:', membersError);
      return NextResponse.json(
        { error: 'Failed to fetch collaboration members' },
        { status: 500 }
      );
    }
    
    if (!members || members.length === 0) {
      return NextResponse.json(
        { message: 'No other members in this collaboration' },
        { status: 200 }
      );
    }
    
    // Enhanced metadata with collaboration info
    const enhancedMetadata = {
      ...metadata,
      collaboration_id: collaborationId,
      sender_role: senderMember.role
    };
    
    // Send message to each member
    const communicationsToInsert = members.map(member => ({
      id: uuidv4(),
      sender_id,
      recipient_id: member.agent_id,
      farm_id: collaboration.farm_id,
      is_broadcast: false,
      content,
      message_type: message_type || 'direct',
      priority: priority || 'medium',
      read: false,
      metadata: enhancedMetadata
    }));
    
    const { data, error } = await supabase
      .from('agent_communications')
      .insert(communicationsToInsert)
      .select()
      .limit(1);
    
    if (error) {
      console.error('Error sending collaboration messages:', error);
      return NextResponse.json(
        { error: 'Failed to send collaboration messages' },
        { status: 500 }
      );
    }
    
    // Send realtime event
    const realtimeClient = await createServerClient();
    
    await realtimeClient
      .channel('collaboration-' + collaborationId)
      .send({
        type: 'broadcast',
        event: 'collaboration_message',
        payload: {
          sender_id,
          collaboration_id: collaborationId,
          content,
          message_type: message_type || 'direct',
          priority: priority || 'medium',
          timestamp: new Date().toISOString(),
          metadata: enhancedMetadata
        }
      });
    
    return NextResponse.json({ 
      success: true,
      message: `Message sent to ${members.length} collaboration members`,
      communication: data?.[0] || null
    });
  } catch (error) {
    console.error('Unexpected error sending collaboration message:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
