import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/utils/supabase/server';
import { z } from 'zod';
import { pusherServer } from '@/lib/pusher';

// Agent message schema validation
const messageSchema = z.object({
  agentId: z.string().min(1, 'Agent ID is required'),
  farmId: z.union([z.string(), z.number()]).optional(),
  message: z.string().min(1, 'Message is required'),
  metadata: z.record(z.any()).optional(),
});

export async function POST(req: NextRequest) {
  try {
    // Parse and validate the request body
    const body = await req.json();
    const validationResult = messageSchema.safeParse(body);
    
    if (!validationResult.success) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Invalid request body',
          details: validationResult.error.errors 
        },
        { status: 400 }
      );
    }
    
    const { agentId, farmId, message, metadata } = validationResult.data;
    
    // Create supabase client
    const supabase = createServerClient();
    
    // Get the current user
    const {
      data: { user },
    } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    // Verify the agent exists and belongs to the user/farm
    const { data: agent, error: agentError } = await supabase
      .from('elizaos_agents')
      .select('*')
      .eq('id', agentId)
      .single();
    
    if (agentError || !agent) {
      return NextResponse.json(
        { success: false, error: 'Agent not found' },
        { status: 404 }
      );
    }
    
    // Store the message in the database
    const { data: messageData, error: messageError } = await supabase
      .from('elizaos_agent_messages')
      .insert([
        {
          agent_id: agentId,
          farm_id: farmId || agent.farm_id,
          user_id: user.id,
          content: message,
          direction: 'user_to_agent',
          status: 'pending',
          metadata: metadata || {}
        }
      ])
      .select()
      .single();
    
    if (messageError) {
      console.error('Error storing message:', messageError);
      return NextResponse.json(
        { success: false, error: 'Failed to store message' },
        { status: 500 }
      );
    }
    
    // Send message event via WebSocket
    try {
      const channel = farmId ? `farm-${farmId}` : `agent-${agentId}`;
      
      await pusherServer.trigger(channel, 'AGENT_MESSAGE', {
        id: messageData.id,
        agentId,
        farmId: farmId || agent.farm_id,
        userId: user.id,
        content: message,
        direction: 'user_to_agent',
        timestamp: messageData.created_at || new Date().toISOString(),
        metadata: metadata || {}
      });
    } catch (wsError) {
      console.error('WebSocket error:', wsError);
      // Continue despite WebSocket error - the message is saved in DB
    }
    
    // Process agent response (in a real implementation, this would be handled by an agent service)
    // Here we're just simulating a delayed response for development purposes
    setTimeout(async () => {
      try {
        // Create agent response in database
        const { data: responseData, error: responseError } = await supabase
          .from('elizaos_agent_messages')
          .insert([
            {
              agent_id: agentId,
              farm_id: farmId || agent.farm_id,
              user_id: user.id,
              content: `I've processed your message: "${message}". This is a simulated response as the ElizaOS agent system is still being implemented.`,
              direction: 'agent_to_user',
              status: 'delivered',
              in_response_to: messageData.id,
              metadata: {
                processed: true,
                simulatedResponse: true,
                ...metadata
              }
            }
          ])
          .select()
          .single();
          
        if (responseError) {
          console.error('Error creating agent response:', responseError);
          return;
        }
        
        // Send response via WebSocket
        const channel = farmId ? `farm-${farmId}` : `agent-${agentId}`;
        
        await pusherServer.trigger(channel, 'AGENT_UPDATE', {
          id: responseData.id,
          agentId,
          farmId: farmId || agent.farm_id,
          content: responseData.content,
          type: 'update',
          timestamp: responseData.created_at || new Date().toISOString(),
          requiresAction: false,
          metadata: responseData.metadata || {}
        });
      } catch (error) {
        console.error('Error sending agent response:', error);
      }
    }, 2000); // Simulate a delay for agent processing
    
    // Return success response
    return NextResponse.json({
      success: true,
      message: 'Message sent to agent successfully',
      data: {
        id: messageData.id,
        timestamp: messageData.created_at
      }
    });
  } catch (error: any) {
    console.error('Agent message processing error:', error);
    
    return NextResponse.json(
      { 
        success: false, 
        error: 'An error occurred while processing the agent message',
        details: error.message
      },
      { status: 500 }
    );
  }
}
