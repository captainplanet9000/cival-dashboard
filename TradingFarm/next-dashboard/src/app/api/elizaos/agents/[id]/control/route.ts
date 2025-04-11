import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/utils/supabase/server';
import { z } from 'zod';

// Validation schema for agent control requests
const agentControlSchema = z.object({
  action: z.enum(['start', 'stop', 'pause', 'resume', 'restart']),
});

// Map actions to resulting statuses
const actionToStatus = {
  start: 'running',
  stop: 'stopped',
  pause: 'paused',
  resume: 'running',
  restart: 'running',
};

/**
 * POST handler to control an agent's lifecycle (start/stop/pause/resume)
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createServerClient();
    
    // Check authentication
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    // Get agent ID from URL
    const { id } = params;
    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Agent ID is required' },
        { status: 400 }
      );
    }
    
    // Validate request body
    const requestBody = await request.json();
    const validationResult = agentControlSchema.safeParse(requestBody);
    
    if (!validationResult.success) {
      const errorMessage = validationResult.error.errors.map(e => 
        `${e.path.join('.')}: ${e.message}`
      ).join(', ');
      
      return NextResponse.json(
        { success: false, error: `Validation error: ${errorMessage}` },
        { status: 400 }
      );
    }
    
    const { action } = validationResult.data;
    
    // Check if the agent exists and user has permission
    const { data: agent, error: fetchError } = await supabase
      .from('elizaos_agents')
      .select('id, farm_id, status')
      .eq('id', id)
      .single();
    
    if (fetchError || !agent) {
      return NextResponse.json(
        { success: false, error: 'Agent not found' },
        { status: 404 }
      );
    }
    
    // Check if user has access to the farm
    const { data: farmAccess, error: farmError } = await supabase
      .from('farm_members')
      .select('role')
      .eq('farm_id', agent.farm_id)
      .eq('user_id', session.user.id)
      .single();
    
    if (farmError || !farmAccess) {
      return NextResponse.json(
        { success: false, error: 'You do not have access to this agent' },
        { status: 403 }
      );
    }
    
    // Update agent status in the database
    const newStatus = actionToStatus[action];
    const { error: updateError } = await supabase
      .from('elizaos_agents')
      .update({ 
        status: newStatus,
        updated_at: new Date().toISOString() 
      })
      .eq('id', id);
    
    if (updateError) {
      return NextResponse.json(
        { success: false, error: `Failed to update agent status: ${updateError.message}` },
        { status: 500 }
      );
    }
    
    // Log the action
    await supabase.from('agent_logs').insert({
      agent_id: id,
      level: 'info',
      message: `Agent ${action} requested by user`,
      source: 'api',
      details: { userId: session.user.id, action, newStatus }
    });
    
    // For start and restart actions, trigger the agent runner
    if (['start', 'restart'].includes(action)) {
      try {
        // Call the edge function to run the agent
        const { error: fnError } = await supabase.functions.invoke('agent-runner', {
          body: { agentId: id, manual: true }
        });
        
        if (fnError) {
          console.error('Error invoking agent runner:', fnError);
          // Don't fail the request, just log the error
          await supabase.from('agent_logs').insert({
            agent_id: id,
            level: 'warning',
            message: `Failed to invoke agent runner: ${fnError.message}`,
            source: 'api',
            details: { userId: session.user.id, action, error: fnError }
          });
        }
      } catch (fnInvokeError) {
        console.error('Error invoking agent runner:', fnInvokeError);
        // Don't fail the request, just log the error
      }
    }
    
    return NextResponse.json({
      success: true,
      data: {
        id,
        status: newStatus,
        action
      }
    });
  } catch (error) {
    console.error('Error controlling agent:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
