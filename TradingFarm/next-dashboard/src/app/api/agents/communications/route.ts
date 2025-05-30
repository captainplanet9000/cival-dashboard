import { createServerClient } from '@/utils/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

/**
 * Agent Communications API
 * Handles fetching agent communications
 */

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerClient();
    
    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const agentId = searchParams.get('agentId');
    const limit = parseInt(searchParams.get('limit') || '50');
    const includeRead = searchParams.get('includeRead') === 'true';
    
    if (!agentId) {
      return NextResponse.json(
        { error: 'Agent ID is required' },
        { status: 400 }
      );
    }
    
    // Build the query
    let query = supabase
      .from('agent_communications')
      .select('*')
      .or(`sender_id.eq.${agentId},recipient_id.eq.${agentId}`)
      .order('created_at', { ascending: false })
      .limit(limit);
    
    // Add filter for read messages if required
    if (!includeRead) {
      query = query.eq('read', false);
    }
    
    // Execute the query
    const { data: communications, error } = await query;
    
    if (error) {
      console.error('Error fetching agent communications:', error);
      return NextResponse.json(
        { error: 'Failed to fetch communications' },
        { status: 500 }
      );
    }
    
    return NextResponse.json({ communications });
  } catch (error) {
    console.error('Unexpected error in agent communications GET:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
