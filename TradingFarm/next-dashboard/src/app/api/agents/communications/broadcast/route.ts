import { createServerClient } from '@/utils/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

/**
 * Agent Broadcast Communications API
 * Handles broadcasting messages to all agents in a farm
 */

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerClient();
    const body = await request.json();
    
    // Validate request body
    const { 
      sender_id, 
      farm_id, 
      content,
      message_type = 'broadcast',
      priority = 'medium',
      metadata = {}
    } = body;
    
    if (!sender_id) {
      return NextResponse.json(
        { error: 'Sender ID is required' },
        { status: 400 }
      );
    }
    
    if (!farm_id) {
      return NextResponse.json(
        { error: 'Farm ID is required' },
        { status: 400 }
      );
    }
    
    if (!content || typeof content !== 'string') {
      return NextResponse.json(
        { error: 'Content is required and must be a string' },
        { status: 400 }
      );
    }
    
    // Verify sender exists and belongs to the farm
    const { data: sender, error: senderError } = await supabase
      .from('agents')
      .select('id, farm_id')
      .eq('id', sender_id)
      .single();
    
    if (senderError || !sender) {
      console.error('Error fetching sender:', senderError);
      return NextResponse.json(
        { error: 'Sender agent not found' },
        { status: 404 }
      );
    }
    
    if (sender.farm_id !== farm_id) {
      return NextResponse.json(
        { error: 'Sender does not belong to the specified farm' },
        { status: 403 }
      );
    }
    
    // Find all agents in the farm (excluding the sender)
    const { data: farmAgents, error: farmAgentsError } = await supabase
      .from('agents')
      .select('id')
      .eq('farm_id', farm_id)
      .neq('id', sender_id);
    
    if (farmAgentsError) {
      console.error('Error fetching farm agents:', farmAgentsError);
      return NextResponse.json(
        { error: 'Failed to fetch farm agents' },
        { status: 500 }
      );
    }
    
    // Create the broadcast message
    const { data: communication, error: communicationError } = await supabase
      .from('agent_communications')
      .insert({
        sender_id,
        farm_id,
        is_broadcast: true,
        content,
        message_type,
        priority,
        read: false,
        metadata
      })
      .select()
      .single();
    
    if (communicationError) {
      console.error('Error creating broadcast communication:', communicationError);
      return NextResponse.json(
        { error: 'Failed to create broadcast communication' },
        { status: 500 }
      );
    }
    
    // Notify all agents in the farm
    if (farmAgents && farmAgents.length > 0) {
      const eventInserts = farmAgents.map(agent => ({
        agent_id: agent.id,
        event_type: 'BROADCAST_MESSAGE',
        data: communication
      }));
      
      const { error: eventError } = await supabase
        .from('agent_events')
        .insert(eventInserts);
      
      if (eventError) {
        console.error('Error creating broadcast events:', eventError);
        // Continue since the message was created successfully
      }
    }
    
    // Use Supabase Realtime to broadcast to all clients
    const { error: broadcastError } = await supabase
      .from('agent_events')
      .insert({
        agent_id: farm_id, // Using farm_id as a channel identifier
        event_type: 'FARM_BROADCAST',
        data: communication
      });
    
    if (broadcastError) {
      console.error('Error broadcasting to farm channel:', broadcastError);
      // Continue since the message was created successfully
    }
    
    return NextResponse.json({ communication });
  } catch (error) {
    console.error('Unexpected error in agent broadcast communications POST:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
