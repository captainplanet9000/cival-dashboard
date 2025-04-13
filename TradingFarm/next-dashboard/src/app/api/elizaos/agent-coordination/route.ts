import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/utils/supabase/server';
import { AgentCoordinationService } from '@/services/elizaos/agent-coordination-service';
import { z } from 'zod';

// Schema for task creation
const createTaskSchema = z.object({
  coordinator_id: z.string().uuid(),
  target_agent_ids: z.array(z.string().uuid()),
  task_type: z.string(),
  parameters: z.record(z.any()),
  priority: z.number().min(1).max(10).optional().default(5),
  deadline_ms: z.number().optional(),
});

// Schema for trading signal creation
const createTradingSignalSchema = z.object({
  research_agent_id: z.string().uuid(),
  symbol: z.string(),
  signal_type: z.enum(['BUY', 'SELL', 'NEUTRAL']),
  confidence: z.number().min(0).max(1),
  analysis: z.record(z.any()),
  timeframe: z.string(),
});

// Schema for research task creation
const createResearchTaskSchema = z.object({
  coordinator_id: z.string().uuid(),
  symbol: z.string(),
  timeframe: z.string(),
  research_type: z.enum(['technical', 'fundamental', 'sentiment']),
  additional_params: z.record(z.any()).optional(),
});

// Schema for task status update
const updateTaskStatusSchema = z.object({
  task_id: z.string().uuid(),
  status: z.enum(['pending', 'in_progress', 'completed', 'failed']),
  result: z.any().optional(),
});

// Schema for agent capabilities registration
const registerCapabilitiesSchema = z.object({
  agent_id: z.string().uuid(),
  capabilities: z.array(
    z.object({
      capability: z.string(),
      description: z.string(),
      parameters: z.record(z.any()).optional(),
    })
  ),
});

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerClient();
    const coordinationService = await AgentCoordinationService.create();
    
    const body = await request.json();
    const action = body.action;
    
    switch (action) {
      case 'create_task': {
        const validation = createTaskSchema.safeParse(body);
        if (!validation.success) {
          return NextResponse.json(
            { error: `Invalid request: ${validation.error.message}` }, 
            { status: 400 }
          );
        }
        
        const result = await coordinationService.createCoordinationAction({
          action: 'assign_task',
          source_agent_id: validation.data.coordinator_id,
          target_agent_ids: validation.data.target_agent_ids,
          parameters: {
            task_type: validation.data.task_type,
            ...validation.data.parameters
          },
          priority: validation.data.priority,
          deadline_ms: validation.data.deadline_ms
        });
        
        if (result.success) {
          return NextResponse.json({ success: true, task_ids: result.taskIds });
        } else {
          return NextResponse.json({ error: result.error }, { status: 400 });
        }
      }
      
      case 'create_trading_signal': {
        const validation = createTradingSignalSchema.safeParse(body);
        if (!validation.success) {
          return NextResponse.json(
            { error: `Invalid request: ${validation.error.message}` }, 
            { status: 400 }
          );
        }
        
        const result = await coordinationService.createTradingSignal(
          validation.data.research_agent_id,
          validation.data.symbol,
          validation.data.signal_type,
          validation.data.confidence,
          validation.data.analysis,
          validation.data.timeframe
        );
        
        if (result.success) {
          return NextResponse.json({ success: true });
        } else {
          return NextResponse.json({ error: result.error }, { status: 400 });
        }
      }
      
      case 'create_research_task': {
        const validation = createResearchTaskSchema.safeParse(body);
        if (!validation.success) {
          return NextResponse.json(
            { error: `Invalid request: ${validation.error.message}` }, 
            { status: 400 }
          );
        }
        
        const result = await coordinationService.createTradingResearchTask(
          validation.data.coordinator_id,
          validation.data.symbol,
          validation.data.timeframe,
          validation.data.research_type,
          validation.data.additional_params
        );
        
        if (result.success) {
          return NextResponse.json({ success: true, task_id: result.taskId });
        } else {
          return NextResponse.json({ error: result.error }, { status: 400 });
        }
      }
      
      case 'update_task_status': {
        const validation = updateTaskStatusSchema.safeParse(body);
        if (!validation.success) {
          return NextResponse.json(
            { error: `Invalid request: ${validation.error.message}` }, 
            { status: 400 }
          );
        }
        
        const success = await coordinationService.updateTaskStatus(
          validation.data.task_id,
          validation.data.status,
          validation.data.result
        );
        
        if (success) {
          return NextResponse.json({ success: true });
        } else {
          return NextResponse.json(
            { error: 'Failed to update task status' }, 
            { status: 500 }
          );
        }
      }
      
      case 'register_capabilities': {
        const validation = registerCapabilitiesSchema.safeParse(body);
        if (!validation.success) {
          return NextResponse.json(
            { error: `Invalid request: ${validation.error.message}` }, 
            { status: 400 }
          );
        }
        
        const success = await coordinationService.registerAgentCapabilities(
          validation.data.agent_id,
          validation.data.capabilities
        );
        
        if (success) {
          return NextResponse.json({ success: true });
        } else {
          return NextResponse.json(
            { error: 'Failed to register capabilities' }, 
            { status: 500 }
          );
        }
      }
      
      default:
        return NextResponse.json(
          { error: `Unknown action: ${action}` }, 
          { status: 400 }
        );
    }
  } catch (error: any) {
    console.error('Error in agent coordination API:', error);
    return NextResponse.json(
      { error: `Server error: ${error.message}` }, 
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const agentId = searchParams.get('agent_id');
    const status = searchParams.get('status');
    
    if (!agentId) {
      return NextResponse.json(
        { error: 'Missing required parameter: agent_id' }, 
        { status: 400 }
      );
    }
    
    const coordinationService = await AgentCoordinationService.create();
    
    // Get tasks for the agent
    const tasks = await coordinationService.getAgentTasks(agentId, status || undefined);
    
    return NextResponse.json({ tasks });
  } catch (error: any) {
    console.error('Error in agent coordination API:', error);
    return NextResponse.json(
      { error: `Server error: ${error.message}` }, 
      { status: 500 }
    );
  }
}
