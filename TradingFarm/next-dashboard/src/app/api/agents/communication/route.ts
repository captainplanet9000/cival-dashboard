import { NextResponse } from 'next/server';
import { createServerClient } from '@/utils/supabase/server';
import { MessagePriority, MessageType } from '@/types/agent-coordination';

export async function POST(request: Request) {
  try {
    const requestData = await request.json();
    const { senderId, recipientId, content, type, priority, metadata } = requestData;
    
    // Validate required fields
    if (!senderId || !content) {
      return NextResponse.json(
        { error: 'Missing required fields: senderId and content are required' },
        { status: 400 }
      );
    }
    
    const supabase = await createServerClient();
    
    // Get the user from the session
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    // Get sender agent details to verify ownership and get role
    const { data: senderAgent, error: senderError } = await supabase
      .from('agents')
      .select('id, name, farm_id, type, configuration')
      .eq('id', senderId)
      .single();
      
    if (senderError || !senderAgent) {
      return NextResponse.json(
        { error: 'Sender agent not found' },
        { status: 404 }
      );
    }
    
    // Verify farm ownership
    const { data: farmData, error: farmError } = await supabase
      .from('farms')
      .select('id, user_id')
      .eq('id', senderAgent.farm_id)
      .single();
      
    if (farmError || !farmData || farmData.user_id !== user.id) {
      return NextResponse.json(
        { error: 'You do not have permission to use this agent' },
        { status: 403 }
      );
    }
    
    // If recipient specified, verify it exists
    let recipientAgent = null;
    if (recipientId) {
      const { data, error } = await supabase
        .from('agents')
        .select('id, name, farm_id, type, configuration')
        .eq('id', recipientId)
        .single();
        
      if (error || !data) {
        return NextResponse.json(
          { error: 'Recipient agent not found' },
          { status: 404 }
        );
      }
      
      recipientAgent = data;
      
      // Make sure agents are in the same farm (security)
      if (recipientAgent.farm_id !== senderAgent.farm_id) {
        return NextResponse.json(
          { error: 'Agents must be in the same farm to communicate' },
          { status: 403 }
        );
      }
    }
    
    // Determine agent roles
    const senderRole = senderAgent.configuration?.role || 'executor';
    const recipientRole = recipientAgent?.configuration?.role || null;
    
    // Create the message record
    const message = {
      sender_id: senderId,
      sender_name: senderAgent.name,
      sender_role: senderRole,
      recipient_id: recipientId || null,
      recipient_role: recipientRole,
      content: content,
      type: type || MessageType.INFO,
      priority: priority || MessagePriority.MEDIUM,
      metadata: metadata || {},
      timestamp: new Date().toISOString(),
      requires_acknowledgment: metadata?.requiresAcknowledgment || false,
      requires_response: metadata?.requiresResponse || false,
      parent_message_id: metadata?.parentMessageId || null,
      status: 'sent'
    };
    
    // Insert the message
    const { data: createdMessage, error: insertError } = await supabase
      .from('agent_messages')
      .insert(message)
      .select()
      .single();
      
    if (insertError) {
      console.error('Error inserting message:', insertError);
      return NextResponse.json(
        { error: `Failed to create message: ${insertError.message}` },
        { status: 500 }
      );
    }
    
    // Send realtime notification
    const channel = recipientId ? `agent-${recipientId}` : `farm-${senderAgent.farm_id}`;
    await supabase.channel(channel).send({
      type: 'broadcast',
      event: recipientId ? 'direct-message' : 'broadcast-message',
      payload: createdMessage
    });
    
    return NextResponse.json({
      message: createdMessage,
      success: true
    });
  } catch (error) {
    console.error('Agent communication error:', error);
    return NextResponse.json(
      { error: 'Failed to process communication request' },
      { status: 500 }
    );
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const agentId = searchParams.get('agentId');
  const farmId = searchParams.get('farmId');
  const limit = parseInt(searchParams.get('limit') || '50');
  const includeRead = searchParams.get('includeRead') === 'true';
  
  if (!agentId && !farmId) {
    return NextResponse.json(
      { error: 'Either agentId or farmId is required' },
      { status: 400 }
    );
  }
  
  try {
    const supabase = await createServerClient();
    
    // Get the user from the session
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    // Verify ownership of the agent or farm
    if (agentId) {
      const { data: agent, error } = await supabase
        .from('agents')
        .select('farm_id')
        .eq('id', agentId)
        .single();
        
      if (error || !agent) {
        return NextResponse.json(
          { error: 'Agent not found' },
          { status: 404 }
        );
      }
      
      const { data: farm, error: farmError } = await supabase
        .from('farms')
        .select('user_id')
        .eq('id', agent.farm_id)
        .single();
        
      if (farmError || !farm || farm.user_id !== user.id) {
        return NextResponse.json(
          { error: 'You do not have permission to access this agent' },
          { status: 403 }
        );
      }
    } else if (farmId) {
      const { data: farm, error } = await supabase
        .from('farms')
        .select('user_id')
        .eq('id', farmId)
        .single();
        
      if (error || !farm || farm.user_id !== user.id) {
        return NextResponse.json(
          { error: 'You do not have permission to access this farm' },
          { status: 403 }
        );
      }
    }
    
    // Build the query
    let query = supabase
      .from('agent_messages')
      .select('*')
      .order('timestamp', { ascending: false })
      .limit(limit);
      
    if (agentId) {
      query = query.or(`recipient_id.eq.${agentId},sender_id.eq.${agentId}`);
    }
    
    if (farmId) {
      // Get agents in the farm first
      const { data: farmAgents } = await supabase
        .from('agents')
        .select('id')
        .eq('farm_id', farmId);
        
      if (farmAgents && farmAgents.length > 0) {
        const agentIds = farmAgents.map(a => a.id);
        query = query.or(
          `sender_id.in.(${agentIds.join(',')}),recipient_id.in.(${agentIds.join(',')})`
        );
      } else {
        // No agents in the farm
        return NextResponse.json({ messages: [] });
      }
    }
    
    if (!includeRead) {
      query = query.eq('status', 'sent');
    }
    
    const { data: messages, error } = await query;
    
    if (error) {
      console.error('Error retrieving messages:', error);
      return NextResponse.json(
        { error: `Failed to retrieve messages: ${error.message}` },
        { status: 500 }
      );
    }
    
    return NextResponse.json({ 
      messages,
      count: messages.length
    });
  } catch (error) {
    console.error('Error retrieving agent messages:', error);
    return NextResponse.json(
      { error: 'Failed to retrieve messages' },
      { status: 500 }
    );
  }
}
