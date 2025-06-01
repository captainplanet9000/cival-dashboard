import { createServerClient } from '@/utils/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

/**
 * ElizaOS Agent Memories API
 * Manages the agent's memory system for retaining context and information
 */

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createServerClient();
    const agentId = params.id;
    
    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const context = searchParams.get('context');
    const limit = parseInt(searchParams.get('limit') || '20');
    
    // Build the query
    let query = supabase
      .from('agent_memories')
      .select('*')
      .eq('agent_id', agentId)
      .order('importance', { ascending: false })
      .limit(limit);
    
    // Add context filter if provided
    if (context) {
      query = query.eq('context', context);
    }
    
    // Execute the query
    const { data: memories, error } = await query;
    
    if (error) {
      console.error('Error fetching agent memories:', error);
      return NextResponse.json(
        { error: 'Failed to fetch agent memories' },
        { status: 500 }
      );
    }
    
    return NextResponse.json({ memories });
  } catch (error) {
    console.error('Unexpected error in ElizaOS memories GET:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createServerClient();
    const agentId = params.id;
    const body = await request.json();
    
    // Validate memory structure
    const { key, content, context, source, importance, expires_at, metadata } = body;
    
    if (!key || typeof key !== 'string') {
      return NextResponse.json(
        { error: 'Memory key is required and must be a string' },
        { status: 400 }
      );
    }
    
    if (!content) {
      return NextResponse.json(
        { error: 'Memory content is required' },
        { status: 400 }
      );
    }
    
    if (!context || typeof context !== 'string') {
      return NextResponse.json(
        { error: 'Memory context is required and must be a string' },
        { status: 400 }
      );
    }
    
    if (!source || typeof source !== 'string') {
      return NextResponse.json(
        { error: 'Memory source is required and must be a string' },
        { status: 400 }
      );
    }
    
    // Check if a memory with this key already exists for this agent
    const { data: existingMemory, error: lookupError } = await supabase
      .from('agent_memories')
      .select('id')
      .eq('agent_id', agentId)
      .eq('key', key)
      .maybeSingle();
    
    if (lookupError) {
      console.error('Error checking for existing memory:', lookupError);
      return NextResponse.json(
        { error: 'Failed to check for existing memory' },
        { status: 500 }
      );
    }
    
    let memory;
    
    if (existingMemory) {
      // Update existing memory
      const { data: updatedMemory, error: updateError } = await supabase
        .from('agent_memories')
        .update({
          content,
          context,
          source,
          importance: importance || 5,
          expires_at: expires_at || null,
          metadata: metadata || {},
          updated_at: new Date().toISOString()
        })
        .eq('id', existingMemory.id)
        .select()
        .single();
      
      if (updateError) {
        console.error('Error updating memory:', updateError);
        return NextResponse.json(
          { error: 'Failed to update memory' },
          { status: 500 }
        );
      }
      
      memory = updatedMemory;
    } else {
      // Create new memory
      const { data: newMemory, error: insertError } = await supabase
        .from('agent_memories')
        .insert({
          agent_id: agentId,
          key,
          content,
          context,
          source,
          importance: importance || 5,
          expires_at: expires_at || null,
          metadata: metadata || {}
        })
        .select()
        .single();
      
      if (insertError) {
        console.error('Error creating memory:', insertError);
        return NextResponse.json(
          { error: 'Failed to create memory' },
          { status: 500 }
        );
      }
      
      memory = newMemory;
    }
    
    return NextResponse.json({ memory });
  } catch (error) {
    console.error('Unexpected error in ElizaOS memories POST:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}

// DELETE endpoint to remove a memory by key
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createServerClient();
    const agentId = params.id;
    
    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const key = searchParams.get('key');
    
    if (!key) {
      return NextResponse.json(
        { error: 'Memory key is required for deletion' },
        { status: 400 }
      );
    }
    
    // Delete the memory
    const { error } = await supabase
      .from('agent_memories')
      .delete()
      .eq('agent_id', agentId)
      .eq('key', key);
    
    if (error) {
      console.error('Error deleting memory:', error);
      return NextResponse.json(
        { error: 'Failed to delete memory' },
        { status: 500 }
      );
    }
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Unexpected error in ElizaOS memories DELETE:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
