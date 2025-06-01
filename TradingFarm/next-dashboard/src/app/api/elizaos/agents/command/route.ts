import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/utils/supabase/server';
import { Database } from '@/types/database.types';
import { z } from 'zod';

const commandSchema = z.object({
  agent_id: z.string().uuid(),
  type: z.string(),
  parameters: z.record(z.any()).optional(),
  priority: z.number().min(1).max(10),
  timeout_ms: z.number().min(1000).max(60000)
});

export async function POST(request: NextRequest) {
  try {
    const supabase = createServerClient<Database>();
    const json = await request.json();

    // Validate command
    const validationResult = commandSchema.safeParse(json);
    if (!validationResult.success) {
      return NextResponse.json(
        { success: false, error: 'Invalid command', details: validationResult.error.errors },
        { status: 400 }
      );
    }

    const command = validationResult.data;

    // Add command to queue
    const { data, error } = await supabase
      .from('elizaos_command_queue')
      .insert([
        { 
          agent_id: command.agent_id,
          type: command.type,
          parameters: command.parameters || {},
          status: 'pending',
          priority: command.priority,
          timeout_ms: command.timeout_ms
        }
      ])
      .select();

    if (error) {
      return NextResponse.json(
        { success: false, error: 'Failed to queue command' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Command queued successfully',
      commandId: data[0].id
    });
  } catch (error) {
    console.error('Error processing command:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to process command' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const supabase = createServerClient<Database>();
    const { searchParams } = new URL(request.url);
    const commandId = searchParams.get('commandId');
    const agentId = searchParams.get('agentId');
  
    let query = supabase
      .from('elizaos_command_queue')
      .select('*');

    if (commandId) {
      query = query.eq('id', commandId);
    } else if (agentId) {
      query = query.eq('agent_id', agentId)
        .order('created_at', { ascending: false })
        .limit(10);
    }

    const { data, error } = await query;

    if (error) {
      return NextResponse.json(
        { success: false, error: 'Failed to fetch commands' },
        { status: 500 }
      );
    }

    if (commandId) {
      const { data: subscription } = supabase
        .channel('command-updates')
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'elizaos_command_queue',
            filter: `id=eq.${commandId}`
          },
          (payload) => {
            return new Response(JSON.stringify(payload.new), {
              headers: { 'Content-Type': 'application/json' }
            });
          }
        )
        .subscribe();

      return new Response(JSON.stringify(data), {
        headers: { 
          'Content-Type': 'application/json',
          'X-Subscription-Id': subscription.id 
        }
      });
    }

    return NextResponse.json(
      { success: true, data },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error fetching command status:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch command status' },
      { status: 500 }
    );
  }
}
