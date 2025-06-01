import { NextResponse } from 'next/server';
import { createServerClient } from '@/utils/supabase/server';
import { MessagePriority, MessageType } from '@/types/agent-coordination';
import { v4 as uuidv4 } from 'uuid';
import { tableExists, functionExists, safeExecuteFunction } from '@/utils/supabase/db-utils';

// Define interfaces for type safety
interface AgentMessage {
  id: string;
  sender_id: string;
  sender_name: string;
  recipient_id: string | null;
  content: string;
  message_type: string;
  priority: string;
  timestamp: string;
  read: boolean;
  metadata: any;
  parent_message_id: string | null;
  status: string;
  requires_response: boolean;
}

// In-memory message store for mock mode
const mockMessages = new Map<string, AgentMessage>();

export async function POST(request: Request) {
  const supabase = await createServerClient();
  
  try {
    // Verify authentication
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    // Parse request body
    const messageData = await request.json();
    
    // Validate required fields
    if (!messageData.sender_id || !messageData.content || !messageData.message_type) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }
    
    // Extract message fields
    const {
      sender_id,
      sender_name,
      recipient_id,
      content,
      message_type,
      priority = 'medium',
      metadata = {}
    } = messageData;
    
    // Build message object
    const message: AgentMessage = {
      id: messageData.id || uuidv4(),
      sender_id,
      sender_name,
      recipient_id,
      content,
      message_type,
      priority,
      timestamp: new Date().toISOString(),
      read: false,
      metadata,
      requires_response: metadata?.requiresResponse || false,
      parent_message_id: metadata?.parentMessageId || null,
      status: 'sent'
    };
    
    // Check if environment is in mock mode
    const isMockMode = process.env.NEXT_PUBLIC_MOCK_MODE === 'true';
    let createdMessage: AgentMessage;
    
    if (isMockMode) {
      // Use mock storage
      mockMessages.set(message.id, message);
      createdMessage = message;
    } else {
      try {
        // Use safeExecuteFunction to bypass type checking issues
        createdMessage = await safeExecuteFunction(
          'insert_agent_message',
          message,
          async () => {
            // Fallback if function doesn't exist
            console.warn('insert_agent_message function does not exist, using mock');
            mockMessages.set(message.id, message);
            return message;
          }
        );
      } catch (error) {
        // Fallback to mock data
        console.warn('Falling back to mock agent_messages storage');
        mockMessages.set(message.id, message);
        createdMessage = message;
      }
    }
    
    // Return the created message
    return NextResponse.json(createdMessage);
    
  } catch (error: any) {
    console.error('Error in agent message endpoint:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}

export async function GET(request: Request) {
  const supabase = await createServerClient();
  
  try {
    // Verify authentication
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    // Get query parameters
    const url = new URL(request.url);
    const agentId = url.searchParams.get('agentId');
    const limit = parseInt(url.searchParams.get('limit') || '50');
    const includeRead = url.searchParams.get('includeRead') === 'true';
    
    if (!agentId) {
      return NextResponse.json(
        { error: 'Missing agentId parameter' },
        { status: 400 }
      );
    }
    
    // Check if environment is in mock mode
    const isMockMode = process.env.NEXT_PUBLIC_MOCK_MODE === 'true';
    let messages: AgentMessage[] = [];
    
    if (isMockMode) {
      // Use mock storage
      messages = Array.from(mockMessages.values())
        .filter(msg => 
          msg.recipient_id === agentId || 
          msg.recipient_id === null || 
          msg.sender_id === agentId
        )
        .filter(msg => includeRead || !msg.read)
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
        .slice(0, limit);
    } else {
      try {
        // Use safeExecuteFunction to bypass type checking issues
        messages = await safeExecuteFunction(
          'get_agent_messages',
          {
            p_agent_id: agentId,
            p_limit: limit,
            p_include_read: includeRead
          },
          async () => {
            // Fallback if function doesn't exist
            console.warn('get_agent_messages function does not exist, using mock');
            return Array.from(mockMessages.values())
              .filter(msg => 
                msg.recipient_id === agentId || 
                msg.recipient_id === null || 
                msg.sender_id === agentId
              )
              .filter(msg => includeRead || !msg.read)
              .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
              .slice(0, limit);
          }
        );
      } catch (error) {
        // Fallback to mock data
        console.warn('Falling back to mock agent_messages storage');
        messages = Array.from(mockMessages.values())
          .filter(msg => 
            msg.recipient_id === agentId || 
            msg.recipient_id === null || 
            msg.sender_id === agentId
          )
          .filter(msg => includeRead || !msg.read)
          .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
          .slice(0, limit);
      }
    }
    
    // Return the messages
    return NextResponse.json(messages);
    
  } catch (error: any) {
    console.error('Error in agent message endpoint:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}

// Mark a message as read
export async function PATCH(request: Request) {
  const supabase = await createServerClient();
  
  try {
    // Verify authentication
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    // Extract message ID from URL
    const url = new URL(request.url);
    const messageId = url.searchParams.get('messageId');
    
    if (!messageId) {
      return NextResponse.json(
        { error: 'Missing messageId parameter' },
        { status: 400 }
      );
    }
    
    // Check if environment is in mock mode
    const isMockMode = process.env.NEXT_PUBLIC_MOCK_MODE === 'true';
    let updatedMessage: AgentMessage | null = null;
    
    if (isMockMode) {
      // Use mock storage
      const message = mockMessages.get(messageId);
      if (!message) {
        return NextResponse.json(
          { error: 'Message not found' },
          { status: 404 }
        );
      }
      
      message.read = true;
      mockMessages.set(messageId, message);
      updatedMessage = message;
    } else {
      try {
        // Use safeExecuteFunction to bypass type checking issues
        updatedMessage = await safeExecuteFunction(
          'mark_message_read',
          {
            p_message_id: messageId
          },
          async () => {
            // Fallback if function doesn't exist
            console.warn('mark_message_read function does not exist, using mock');
            const message = mockMessages.get(messageId);
            if (!message) {
              return null;
            }
            
            message.read = true;
            mockMessages.set(messageId, message);
            return message;
          }
        );

        if (!updatedMessage) {
          return NextResponse.json(
            { error: 'Message not found' },
            { status: 404 }
          );
        }
      } catch (error) {
        // Fallback to mock data
        console.warn('Falling back to mock agent_messages storage');
        const message = mockMessages.get(messageId);
        if (!message) {
          return NextResponse.json(
            { error: 'Message not found' },
            { status: 404 }
          );
        }
        
        message.read = true;
        mockMessages.set(messageId, message);
        updatedMessage = message;
      }
    }
    
    // Return the updated message
    return NextResponse.json(updatedMessage);
    
  } catch (error: any) {
    console.error('Error in agent message endpoint:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
