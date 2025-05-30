import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/utils/supabase/server';
import { z } from 'zod';
import { CommandProcessor } from '@/services/elizaos/command-processor';
import { ConsoleMessage } from '@/types/elizaos.types';
import { pusherServer } from '@/lib/pusher';

// Command request schema validation
const commandSchema = z.object({
  command: z.string().min(1, 'Command is required'),
  farmId: z.union([z.string(), z.number()]).optional(),
  conversationId: z.string().optional(),
  metadata: z.record(z.any()).optional(),
});

// Process POST requests to the command endpoint
export async function POST(req: NextRequest) {
  try {
    // Parse and validate the request body
    const body = await req.json();
    const validationResult = commandSchema.safeParse(body);
    
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
    
    const { command, farmId, conversationId, metadata } = validationResult.data;
    
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
    
    // Create command context with user info
    const commandContext = {
      supabase,
      userId: user.id,
      farmId: farmId || 'default',
    };
    
    // Record the user command first
    const userCommandMessage: ConsoleMessage = {
      id: `user-${Date.now()}`,
      content: command,
      timestamp: new Date().toISOString(),
      category: 'command',
      source: 'user',
      isUser: true,
      sender: user.id,
      metadata: {
        farmId,
        conversationId,
        ...metadata,
      }
    };
    
    // Send user command via WebSocket
    await sendToWebSocket('COMMAND', userCommandMessage, farmId);
    
    // Process the command
    const processor = new CommandProcessor(commandContext);
    const result = await processor.processCommand(command);
    
    // If command processing was successful, send response via WebSocket
    if (result.success) {
      await sendToWebSocket('COMMAND_RESPONSE', result.message, farmId);
    } else {
      // Send error response via WebSocket
      await sendToWebSocket('COMMAND_ERROR', result.message, farmId);
    }
    
    // Return the response
    return NextResponse.json({
      success: result.success,
      message: result.message,
      error: result.error,
    });
  } catch (error: any) {
    console.error('Command processing error:', error);
    
    return NextResponse.json(
      { 
        success: false, 
        error: 'An error occurred while processing the command',
        details: error.message
      },
      { status: 500 }
    );
  }
}

/**
 * Send message via WebSocket using Pusher
 */
async function sendToWebSocket(
  eventType: string, 
  message: ConsoleMessage, 
  farmId?: string | number
) {
  try {
    const channel = farmId ? `farm-${farmId}` : 'global';
    
    await pusherServer.trigger(channel, eventType, {
      ...message,
      _timestamp: Date.now() // Add a timestamp for clients to order messages
    });
    
    return true;
  } catch (error: any) {
    console.error(`Error sending WebSocket message (${eventType}):`, error);
    return false;
  }
}
