import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/utils/supabase/server';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';

// Schema for request validation
const elizaAgentSchema = z.object({
  name: z.string().min(3),
  farmId: z.number(),
  config: z.object({
    agentType: z.string(),
    markets: z.array(z.string()),
    risk_level: z.enum(['low', 'medium', 'high']),
    api_access: z.boolean().optional().default(false),
    trading_permissions: z.string().optional().default('read'),
    auto_recovery: z.boolean().optional().default(true),
    max_concurrent_tasks: z.number().optional(),
    llm_model: z.string().optional().default('gpt-4o'),
  }),
});

// GET handler to retrieve agents
export async function GET(request: NextRequest) {
  try {
    const supabase = createServerClient();
    const { searchParams } = new URL(request.url);
    const farmId = searchParams.get('farmId');
    
    let query = supabase
      .from('elizaos_agents')
      .select('*');
    
    // Filter by farm if provided
    if (farmId) {
      query = query.eq('farm_id', farmId);
    }
    
    const { data, error } = await query.order('created_at', { ascending: false });
    
    if (error) {
      console.error('Error fetching ElizaOS agents:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch agents' },
        { status: 500 }
      );
    }
    
    return NextResponse.json(
      { success: true, data },
      { status: 200 }
    );
  } catch (error) {
    console.error('Unexpected error fetching ElizaOS agents:', error);
    return NextResponse.json(
      { success: false, error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}

// POST handler to create a new agent
export async function POST(request: NextRequest) {
  try {
    const supabase = createServerClient();
    const json = await request.json();
    
    // Validate request body
    const validationResult = elizaAgentSchema.safeParse(json);
    if (!validationResult.success) {
      const errorMessage = validationResult.error.errors.map(e => 
        `${e.path.join('.')}: ${e.message}`
      ).join(', ');
      return NextResponse.json(
        { success: false, error: `Validation error: ${errorMessage}` },
        { status: 400 }
      );
    }
    
    const validatedData = validationResult.data;
    
    // Create agent in the database
    const { data, error } = await supabase
      .from('elizaos_agents')
      .insert({
        id: uuidv4(),
        name: validatedData.name,
        farm_id: validatedData.farmId,
        status: 'initializing',
        config: validatedData.config,
        performance_metrics: {
          commands_processed: 0,
          success_rate: 1.0, // Start at 100%
          average_response_time_ms: 0,
          uptime_percentage: 100
        }
      })
      .select()
      .single();
    
    if (error) {
      console.error('Error creating ElizaOS agent:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to create agent' },
        { status: 500 }
      );
    }
    
    // After DB creation, connect to the ElizaOS service to initialize the agent
    // This would typically be an API call to your ElizaOS backend
    try {
      // Call to ElizaOS service (simulated for now)
      // In production, this would call your actual ElizaOS backend API
      console.log(`Initializing ElizaOS agent: ${data.id}`);
      
      // Simulate the initialization process
      setTimeout(async () => {
        try {
          await supabase
            .from('elizaos_agents')
            .update({ 
              status: 'idle',
              updated_at: new Date().toISOString()
            })
            .eq('id', data.id);
        } catch (error) {
          console.error('Error updating agent status:', error);
        }
      }, 3000);
      
      return NextResponse.json(
        { success: true, data },
        { status: 201 }
      );
    } catch (serviceError) {
      console.error('Error initializing ElizaOS agent service:', serviceError);
      
      // The agent is created in DB but failed to initialize in the service
      // Update status to error
      await supabase
        .from('elizaos_agents')
        .update({ 
          status: 'error',
          updated_at: new Date().toISOString() 
        })
        .eq('id', data.id);
      
      return NextResponse.json(
        { success: false, error: 'Agent created but failed to initialize' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Unexpected error creating ElizaOS agent:', error);
    return NextResponse.json(
      { success: false, error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
