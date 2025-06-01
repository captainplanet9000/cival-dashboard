import { createServerClient } from '@/utils/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

/**
 * Agent Direct Communications API
 * Handles sending direct messages between agents
 */

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerClient();
    const body = await request.json();
    
    // Validate request body
    const { 
      sender_id, 
      recipient_id, 
      content,
      message_type = 'direct',
      priority = 'medium',
      metadata = {}
    } = body;
    
    if (!sender_id) {
      return NextResponse.json(
        { error: 'Sender ID is required' },
        { status: 400 }
      );
    }
    
    if (!recipient_id) {
      return NextResponse.json(
        { error: 'Recipient ID is required' },
        { status: 400 }
      );
    }
    
    if (!content || typeof content !== 'string') {
      return NextResponse.json(
        { error: 'Content is required and must be a string' },
        { status: 400 }
      );
    }
    
    // Verify sender and recipient exist
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
    
    const { data: recipient, error: recipientError } = await supabase
      .from('agents')
      .select('id, farm_id')
      .eq('id', recipient_id)
      .single();
    
    if (recipientError || !recipient) {
      console.error('Error fetching recipient:', recipientError);
      return NextResponse.json(
        { error: 'Recipient agent not found' },
        { status: 404 }
      );
    }
    
    // Create the direct message
    const { data: communication, error: communicationError } = await supabase
      .from('agent_communications')
      .insert({
        sender_id,
        recipient_id,
        farm_id: sender.farm_id, // Use sender's farm ID
        is_broadcast: false,
        content,
        message_type,
        priority,
        read: false,
        metadata
      })
      .select()
      .single();
    
    if (communicationError) {
      console.error('Error creating direct communication:', communicationError);
      return NextResponse.json(
        { error: 'Failed to create direct communication' },
        { status: 500 }
      );
    }
    
    // Broadcast the message to the recipient's channel
    // This allows for real-time updates
    await supabase
      .from('agent_events')
      .insert({
        agent_id: recipient_id,
        event_type: 'NEW_MESSAGE',
        data: communication
      });
    
    return NextResponse.json({ communication });
  } catch (error) {
    console.error('Unexpected error in agent direct communications POST:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
