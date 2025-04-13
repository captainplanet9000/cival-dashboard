import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/utils/supabase/server';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';
import { elizaAgentSchema, commandSchema, statusUpdateSchema } from '@/types/elizaos.types';
import { Database } from '@/types/database.types';

// Command queue to handle multiple commands per agent
const commandQueues: Map<string, Array<any>> = new Map();

// In-memory command results cache
const commandResults: Map<string, any> = new Map();

// Knowledge base cache
const knowledgeCache: Map<string, {
  content: any,
  timestamp: number,
  ttl: number
}> = new Map();

// Rate limiting cache (IP -> { count, timestamp })
const rateLimitCache: Map<string, { count: number, timestamp: number }> = new Map();
const RATE_LIMIT = 100; // requests per minute
const RATE_WINDOW = 60000; // 1 minute in milliseconds

// Error response helper
const errorResponse = (message: string, status: number = 400, details?: any) => {
  return NextResponse.json(
    { success: false, error: message, details },
    { status }
  );
};

// Rate limiting middleware
const checkRateLimit = (request: NextRequest): { limited: boolean, remaining: number } => {
  const ip = request.ip || 'unknown';
  const now = Date.now();
  const cacheKey = `${ip}:${request.nextUrl.pathname}`;
  
  const current = rateLimitCache.get(cacheKey) || { count: 0, timestamp: now };
  
  // Reset if window has passed
  if (now - current.timestamp > RATE_WINDOW) {
    current.count = 1;
    current.timestamp = now;
  } else {
    current.count += 1;
  }
  
  rateLimitCache.set(cacheKey, current);
  return { 
    limited: current.count > RATE_LIMIT,
    remaining: Math.max(0, RATE_LIMIT - current.count)
  };
};

// Schemas for request validation
const knowledgeSchema = z.object({
  topic: z.string(),
  content: z.any(),
  source_agent: z.string(),
  target_agents: z.array(z.string()).optional(),
  ttl_ms: z.number().min(1000).max(86400000).default(3600000), // 1 hour default
  access_level: z.enum(['private', 'shared', 'public']).default('shared')
});

const statusUpdateSchema = z.object({
  status: z.enum([
    'initializing',
    'idle',
    'busy',
    'error',
    'offline',
    'learning',
    'analyzing',
    'trading',
    'backtesting',
    'optimizing',
    'coordinating'
  ]),
  details: z.string().optional(),
  metadata: z.record(z.any()).optional()
});

const commandSchema = z.object({
  type: z.enum([
    'analyze_market',
    'execute_trade',
    'adjust_strategy',
    'evaluate_risk',
    'coordinate_agents',
    'query_knowledge',
    'backtest_strategy',
    'custom'
  ]),
  parameters: z.record(z.any()).optional(),
  priority: z.number().min(1).max(10).default(5),
  timeout_ms: z.number().min(100).max(30000).default(5000),
  target_agents: z.array(z.string()).optional(),
  callback_url: z.string().url().optional()
});

const coordinationSchema = z.object({
  coordinator_id: z.string(),
  action: z.enum([
    'assign_task',
    'share_knowledge',
    'request_analysis',
    'sync_state',
    'delegate_control'
  ]),
  target_agents: z.array(z.string()),
  parameters: z.record(z.any()),
  expiry_ms: z.number().min(1000).max(300000).default(60000)
});

const performanceMetricsSchema = z.object({
  commands_processed: z.number(),
  success_rate: z.number().min(0).max(1),
  average_response_time_ms: z.number().min(0),
  uptime_percentage: z.number().min(0).max(100)
});

const batchUpdateSchema = z.object({
  agentIds: z.array(z.string()),
  status: z.enum(['initializing', 'idle', 'busy', 'error', 'offline']).optional(),
  config: z.object({
    agentType: z.string(),
    markets: z.array(z.string()),
    risk_level: z.enum(['low', 'medium', 'high']),
    api_access: z.boolean().optional().default(false),
    trading_permissions: z.string().optional().default('read'),
    auto_recovery: z.boolean().optional().default(true),
    max_concurrent_tasks: z.number().optional(),
    llm_model: z.string().optional().default('gpt-4o'),
  }).optional()
});

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
    // Check rate limit
    const rateLimit = checkRateLimit(request);
    if (rateLimit.limited) {
      return errorResponse('Rate limit exceeded. Try again later.', 429, { 
        limit: RATE_LIMIT, 
        window: `${RATE_WINDOW/1000} seconds`,
        reset: new Date(Date.now() + RATE_WINDOW).toISOString()
      });
    }
    
    // Apply timeout to Supabase operations
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Database connection timed out')), 10000);
    });
    
    // Get the Supabase client with timeout
    const supabasePromise = createServerClient();
    const supabase = await Promise.race([supabasePromise, timeoutPromise]);
    
    const { searchParams } = new URL(request.url);
    const farmId = searchParams.get('farmId');
    
    let query = supabase
      .from('elizaos_agents')
      .select('*');
    
    // Filter by farm if provided
    if (farmId) {
      const farmIdNum = parseInt(farmId, 10);
      if (isNaN(farmIdNum)) {
        return errorResponse('Invalid farm ID. Must be a number.', 400);
      }
      query = query.eq('farm_id', farmIdNum);
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
// Helper function for regular agent creation
async function createAgent(request: NextRequest) {
  try {
    // Apply timeout to Supabase operations
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Database connection timed out')), 10000);
    });
    
    // Get the Supabase client with timeout
    const supabasePromise = createServerClient();
    const supabase = await Promise.race([supabasePromise, timeoutPromise]) as Awaited<ReturnType<typeof createServerClient>>;
    
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
        farm_id: validatedData.farmId, // Use farmId directly as a number
        status: 'initializing',
        config: validatedData.config,
        performance_metrics: {
          commands_processed: 0,
          success_rate: 1.0,
          average_response_time_ms: 0,
          uptime_percentage: 100
        }
      })
      .select()
      .single();
    
    if (error) {
      console.error('Error creating ElizaOS agent:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to create agent', details: error.message },
        { status: 500 }
      );
    }
    
    // After DB creation, connect to the ElizaOS service to initialize the agent
    try {
      // Call to ElizaOS service (simulated for now)
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
        { success: false, error: 'Agent created but failed to initialize', details: serviceError instanceof Error ? serviceError.message : 'Unknown error' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Unexpected error creating ElizaOS agent:', error);
    return NextResponse.json(
      { success: false, error: 'An unexpected error occurred', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// Helper function to add agent messages
async function addAgentMessage(supabase: any, agentId: string, message: { type: string, message: string, timestamp: string }) {
  try {
    // Store the message in the database
    const { error } = await supabase
      .from('elizaos_agent_messages')
      .insert({
        agent_id: agentId,
        message_type: message.type,
        content: message.message,
        created_at: message.timestamp
      });

    if (error) {
      console.error('Error storing agent message:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error in addAgentMessage:', error);
    return false;
  }
}

// Helper function to manage knowledge sharing
async function shareKnowledge(supabase: any, knowledge: any) {
  const { topic, content, source_agent, target_agents, ttl_ms, access_level } = knowledge;
  
  // Store in knowledge cache
  const cacheKey = `${source_agent}:${topic}`;
  knowledgeCache.set(cacheKey, {
    content,
    timestamp: Date.now(),
    ttl: ttl_ms
  });

  // Store in database for persistence
  await supabase
    .from('elizaos_knowledge')
    .upsert({
      topic,
      content,
      source_agent,
      access_level,
      created_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + ttl_ms).toISOString()
    });

  // Notify target agents if specified
  if (target_agents?.length) {
    await supabase
      .from('elizaos_agents')
      .update({
        status: 'learning',
        updated_at: new Date().toISOString()
      })
      .in('id', target_agents);

    // Simulate learning process
    await new Promise(resolve => setTimeout(resolve, 1000));

    await supabase
      .from('elizaos_agents')
      .update({
        status: 'idle',
        updated_at: new Date().toISOString()
      })
      .in('id', target_agents);
  }

  return {
    success: true,
    knowledge_id: cacheKey,
    shared_with: target_agents?.length || 0
  };
}

// Helper function to queue commands
async function queueCommand(agentId: string, command: any) {
  if (!commandQueues.has(agentId)) {
    commandQueues.set(agentId, []);
  }
  
  const queue = commandQueues.get(agentId)!;
  const commandId = uuidv4();
  
  queue.push({
    id: commandId,
    command,
    timestamp: Date.now(),
    status: 'queued'
  });

  return commandId;
}

// Helper function to process queued commands
async function processQueuedCommands(supabase: any, agentId: string) {
  const queue = commandQueues.get(agentId) || [];
  if (queue.length === 0) return;

  const command = queue[0];
  try {
    const result = await processCommand(supabase, agentId, command.command);
    commandResults.set(command.id, {
      ...result,
      completed_at: Date.now()
    });
  } catch (error) {
    commandResults.set(command.id, {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      completed_at: Date.now()
    });
  }

  queue.shift();
  if (queue.length > 0) {
    // Process next command after a short delay
    setTimeout(() => processQueuedCommands(supabase, agentId), 100);
  }
}

// Helper function to update agent status with real-time notifications
async function updateAgentStatus(supabase: any, agentId: string, statusUpdate: any) {
  const { status, details, metadata } = statusUpdate;

  // Update agent status in database
  const { data, error } = await supabase
    .from('elizaos_agents')
    .update({
      status,
      status_details: details,
      status_metadata: metadata,
      updated_at: new Date().toISOString()
    })
    .eq('id', agentId)
    .select()
    .single();

  if (error) throw error;

  // In a real implementation, we would emit a real-time event here
  // For now, we'll just log it
  console.log(`Agent ${agentId} status updated to ${status}`);

  return data;
}

// Helper function to process agent command
async function processCommand(supabase: any, agentId: string, command: any) {
  const startTime = Date.now();
  let commandResult;
  
  try {
    // Validate command schema
    const commandValidation = commandSchema.safeParse(command);
    if (!commandValidation.success) {
      const errorMessage = commandValidation.error.errors.map(e => 
        `${e.path.join('.')}: ${e.message}`
      ).join(', ');
      return {
        success: false,
        message: `Invalid command schema: ${errorMessage}`,
        data: null
      };
    }
    
    // Get agent information to verify permissions
    const { data: agent, error: agentError } = await supabase
      .from('elizaos_agents')
      .select('*')
      .eq('id', agentId)
      .single();
      
    if (agentError) {
      return {
        success: false,
        message: `Agent not found: ${agentError.message}`,
        data: null
      };
    }
    
    // Update agent status to busy
    await updateAgentStatus(supabase, agentId, { 
      status: 'busy', 
      details: `Processing ${command.type} command` 
    });
    
    // Check if this is a trading agent
    if (agent.agent_type === 'trading') {
      try {
        // Import the trading agent service
        const { TradingAgentService } = await import('@/services/trading/trading-agent-service');
        
        // Create trading agent service instance
        const tradingService = new TradingAgentService(supabase);
        
        // Prepare agent permissions info
        const agentInfo = {
          id: agent.id,
          type: agent.agent_type,
          permissions: agent.permissions || ['trading:paper'],
          farmId: agent.farm_id,
          metadata: agent.metadata || {}
        };
        
        // Set appropriate status based on command type
        let statusUpdate = { status: 'busy', details: `Executing ${command.type}` };
        if (command.type === 'analyze_market') {
          statusUpdate.status = 'analyzing';
        } else if (command.type === 'execute_trade') {
          statusUpdate.status = 'trading';
        } else if (command.type === 'backtest_strategy') {
          statusUpdate.status = 'backtesting';
        }
        
        await updateAgentStatus(supabase, agentId, statusUpdate);
        
        // Process command with trading service
        commandResult = await tradingService.processCommand(agentId, command, agentInfo);
      } catch (error) {
        console.error('Error processing trading command:', error);
        commandResult = {
          success: false,
          message: `Trading command error: ${error instanceof Error ? error.message : 'Unknown error'}`,
          data: null
        };
      }
    } else {
      // Handle non-trading agent commands
      // This is a placeholder for other agent types
      // Simulate processing time
      const processingTime = Math.random() * 1000 + 500;
      await new Promise(resolve => setTimeout(resolve, processingTime));
      
      // Process command based on type
      switch (command.type) {
        case 'analyze_market':
          commandResult = {
            success: true,
            message: 'Market analysis completed',
            data: {
              market: command.parameters?.market || 'unknown',
              trend: 'bullish',
              indicators: {
                rsi: 65,
                macd: { histogram: 0.2, signal: 0.1 }
              },
              recommendation: 'buy'
            }
          };
          break;
          
        case 'execute_trade':
          commandResult = {
            success: true,
            message: 'Trade executed successfully',
            data: {
              orderId: uuidv4(),
              symbol: command.parameters?.symbol || 'BTC/USDT',
              side: command.parameters?.side || 'buy',
              quantity: command.parameters?.quantity || 1,
              price: command.parameters?.price || 50000,
              timestamp: new Date().toISOString()
            }
          };
          break;
          
        default:
          commandResult = {
            success: false,
            message: `Unsupported command type: ${command.type}`,
            data: null
          };
      }
    }
    
    // Calculate processing time
    const processingTime = Date.now() - startTime;
    
    // Update performance metrics
    const { data: agentData } = await supabase
      .from('elizaos_agents')
      .select('performance_metrics')
      .eq('id', agentId)
      .single();

    const metrics = agentData?.performance_metrics || {
      commands_processed: 0,
      success_rate: 1.0,
      average_response_time_ms: 0,
      uptime_percentage: 100
    };

    metrics.commands_processed++;
    if (!commandResult.success) {
      // Update success rate
      metrics.success_rate = (
        (metrics.success_rate * (metrics.commands_processed - 1) + 0) /
        metrics.commands_processed
      );
    } else {
      // Update success rate
      metrics.success_rate = (
        (metrics.success_rate * (metrics.commands_processed - 1) + 1) /
        metrics.commands_processed
      );
    }
    
    // Update average response time
    metrics.average_response_time_ms = (
      (metrics.average_response_time_ms * (metrics.commands_processed - 1) + processingTime) /
      metrics.commands_processed
    );

    // Update agent status based on command result
    const statusUpdate = { 
      status: commandResult.success ? 'idle' : 'error', 
      details: commandResult.success ? 
        `Completed ${command.type} command` : 
        `Error with ${command.type} command: ${commandResult.message}`,
      performance_metrics: metrics,
      updated_at: new Date().toISOString()
    };
    
    await supabase
      .from('elizaos_agents')
      .update(statusUpdate)
      .eq('id', agentId);
    
    // Add command and response to agent history
    await addAgentMessage(supabase, agentId, {
      type: 'command_execution',
      message: JSON.stringify({
        command: command,
        result: commandResult,
        processing_time_ms: processingTime
      }),
      timestamp: new Date().toISOString()
    });
    
    // Add processing time to result
    return {
      ...commandResult,
      processing_time_ms: processingTime
    };
  } catch (error) {
    console.error('Error processing command:', error);
    // Update agent status to error
    await updateAgentStatus(supabase, agentId, { 
      status: 'error', 
      details: `Error processing command: ${error instanceof Error ? error.message : 'Unknown error'}` 
    });
    
    return {
      success: false,
      message: `Command processing error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      data: null
    };
  }
}

// Helper function to coordinate agents
async function coordinateAgents(supabase: any, coordination: any) {
  const { coordinator_id, action, target_agents, parameters } = coordination;

  // Verify coordinator agent exists and is active
  const { data: coordinator } = await supabase
    .from('elizaos_agents')
    .select('status')
    .eq('id', coordinator_id)
    .single();

  if (!coordinator || coordinator.status === 'error' || coordinator.status === 'offline') {
    throw new Error('Coordinator agent is not available');
  }

  // Update status of all target agents
  await supabase
    .from('elizaos_agents')
    .update({
      status: 'busy',
      updated_at: new Date().toISOString()
    })
    .in('id', target_agents);

  try {
    // Here we would integrate with the actual ElizaOS backend for agent coordination
    // For now, we'll simulate the coordination process
    const coordinationTime = Math.random() * 2000 + 1000; // Random time between 1-3s
    await new Promise(resolve => setTimeout(resolve, coordinationTime));

    // Update all agents' status back to idle
    await supabase
      .from('elizaos_agents')
      .update({
        status: 'idle',
        updated_at: new Date().toISOString()
      })
      .in('id', target_agents);

    return {
      success: true,
      coordination_time_ms: coordinationTime,
      action_completed: action,
      agents_coordinated: target_agents.length
    };
  } catch (error) {
    // Update all agents' status to error
    await supabase
      .from('elizaos_agents')
      .update({
        status: 'error',
        updated_at: new Date().toISOString()
      })
      .in('id', target_agents);

    throw error;
  }
}

// Main POST handler with support for different endpoints
export async function POST(request: NextRequest) {
  // Check rate limit
  const rateLimit = checkRateLimit(request);
  if (rateLimit.limited) {
    return errorResponse('Rate limit exceeded. Try again later.', 429, { 
      limit: RATE_LIMIT, 
      window: `${RATE_WINDOW/1000} seconds`,
      reset: new Date(Date.now() + RATE_WINDOW).toISOString()
    });
  }
  const path = request.nextUrl.pathname;
  const supabase = await createServerClient();

  // Handle knowledge sharing
  if (path.endsWith('/knowledge')) {
    try {
      const json = await request.json();
      
      // Validate knowledge sharing request
      const validationResult = knowledgeSchema.safeParse(json);
      if (!validationResult.success) {
        const errorMessage = validationResult.error.errors.map(e => 
          `${e.path.join('.')}: ${e.message}`
        ).join(', ');
        return NextResponse.json(
          { success: false, error: `Validation error: ${errorMessage}` },
          { status: 400 }
        );
      }

      const knowledge = validationResult.data;
      const result = await shareKnowledge(supabase, knowledge);

      return NextResponse.json(
        { success: true, data: result },
        { status: 200 }
      );
    } catch (error) {
      console.error('Error sharing knowledge:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to share knowledge', details: error instanceof Error ? error.message : 'Unknown error' },
        { status: 500 }
      );
    }
  }

  // Handle status updates
  if (path.endsWith('/status')) {
    try {
      const { searchParams } = new URL(request.url);
      const agentId = searchParams.get('agentId');

      if (!agentId) {
        return NextResponse.json(
          { success: false, error: 'Agent ID is required' },
          { status: 400 }
        );
      }

      const json = await request.json();
      
      // Validate status update
      const validationResult = statusUpdateSchema.safeParse(json);
      if (!validationResult.success) {
        const errorMessage = validationResult.error.errors.map(e => 
          `${e.path.join('.')}: ${e.message}`
        ).join(', ');
        return NextResponse.json(
          { success: false, error: `Validation error: ${errorMessage}` },
          { status: 400 }
        );
      }

      const statusUpdate = validationResult.data;
      const result = await updateAgentStatus(supabase, agentId, statusUpdate);

      return NextResponse.json(
        { success: true, data: result },
        { status: 200 }
      );
    } catch (error) {
      console.error('Error updating agent status:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to update status', details: error instanceof Error ? error.message : 'Unknown error' },
        { status: 500 }
      );
    }
  }

  // Handle agent commands
  if (path.endsWith('/command')) {
    try {
      const { searchParams } = new URL(request.url);
      const agentId = searchParams.get('agentId');

      if (!agentId) {
        return NextResponse.json(
          { success: false, error: 'Agent ID is required' },
          { status: 400 }
        );
      }

      const json = await request.json();
      
      // Validate command
      const validationResult = commandSchema.safeParse(json);
      if (!validationResult.success) {
        const errorMessage = validationResult.error.errors.map(e => 
          `${e.path.join('.')}: ${e.message}`
        ).join(', ');
        return NextResponse.json(
          { success: false, error: `Validation error: ${errorMessage}` },
          { status: 400 }
        );
      }

      const command = validationResult.data;
      
      // Queue the command and get its ID
      const commandId = await queueCommand(agentId, command);
      
      // Start processing the queue if it's not already running
      processQueuedCommands(supabase, agentId);
      
      return NextResponse.json(
        { 
          success: true, 
          data: { 
            command_id: commandId,
            status: 'queued',
            queue_position: commandQueues.get(agentId)?.length || 0
          } 
        },
        { status: 202 }
      );

      return NextResponse.json(
        { success: true, data: result },
        { status: 200 }
      );
    } catch (error) {
      console.error('Error processing agent command:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to process command', details: error instanceof Error ? error.message : 'Unknown error' },
        { status: 500 }
      );
    }
  }

  // Handle agent coordination
  if (path.endsWith('/coordinate')) {
    try {
      const json = await request.json();
      
      // Validate coordination request
      const validationResult = coordinationSchema.safeParse(json);
      if (!validationResult.success) {
        const errorMessage = validationResult.error.errors.map(e => 
          `${e.path.join('.')}: ${e.message}`
        ).join(', ');
        return NextResponse.json(
          { success: false, error: `Validation error: ${errorMessage}` },
          { status: 400 }
        );
      }

      const coordination = validationResult.data;
      const result = await coordinateAgents(supabase, coordination);

      return NextResponse.json(
        { success: true, data: result },
        { status: 200 }
      );
    } catch (error) {
      console.error('Error coordinating agents:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to coordinate agents', details: error instanceof Error ? error.message : 'Unknown error' },
        { status: 500 }
      );
    }
  }
  
  // Handle batch updates
  if (path.endsWith('/batch')) {
    try {
      const supabase = await createServerClient();
      const json = await request.json();
      
      // Validate request body
      const validationResult = batchUpdateSchema.safeParse(json);
      if (!validationResult.success) {
        const errorMessage = validationResult.error.errors.map(e => 
          `${e.path.join('.')}: ${e.message}`
        ).join(', ');
        return NextResponse.json(
          { success: false, error: `Validation error: ${errorMessage}` },
          { status: 400 }
        );
      }
      
      const { agentIds, status, config } = validationResult.data;
      
      // Prepare update data
      const updateData: any = {
        updated_at: new Date().toISOString()
      };
      if (status) updateData.status = status;
      if (config) updateData.config = config;
      
      // Perform batch update
      const { data, error } = await supabase
        .from('elizaos_agents')
        .update(updateData)
        .in('id', agentIds)
        .select();
      
      if (error) {
        console.error('Error performing batch update:', error);
        return NextResponse.json(
          { success: false, error: 'Failed to perform batch update', details: error.message },
          { status: 500 }
        );
      }
      
      return NextResponse.json(
        { success: true, data },
        { status: 200 }
      );
    } catch (error) {
      console.error('Unexpected error in batch update:', error);
      return NextResponse.json(
        { success: false, error: 'An unexpected error occurred', details: error instanceof Error ? error.message : 'Unknown error' },
        { status: 500 }
      );
    }
  }
  
  // Handle performance metrics updates
  if (path.endsWith('/metrics')) {
    try {
      const supabase = await createServerClient();
      const { searchParams } = new URL(request.url);
      const agentId = searchParams.get('agentId');
      
      if (!agentId) {
        return NextResponse.json(
          { success: false, error: 'Agent ID is required' },
          { status: 400 }
        );
      }
      
      const json = await request.json();
      
      // Validate request body
      const validationResult = performanceMetricsSchema.safeParse(json);
      if (!validationResult.success) {
        const errorMessage = validationResult.error.errors.map(e => 
          `${e.path.join('.')}: ${e.message}`
        ).join(', ');
        return NextResponse.json(
          { success: false, error: `Validation error: ${errorMessage}` },
          { status: 400 }
        );
      }
      
      const metrics = validationResult.data;
      
      // Update performance metrics
      const { data, error } = await supabase
        .from('elizaos_agents')
        .update({
          performance_metrics: metrics,
          updated_at: new Date().toISOString()
        })
        .eq('id', agentId)
        .select()
        .single();
      
      if (error) {
        console.error('Error updating performance metrics:', error);
        return NextResponse.json(
          { success: false, error: 'Failed to update performance metrics', details: error.message },
          { status: 500 }
        );
      }
      
      return NextResponse.json(
        { success: true, data },
        { status: 200 }
      );
    } catch (error) {
      console.error('Unexpected error updating performance metrics:', error);
      return NextResponse.json(
        { success: false, error: 'An unexpected error occurred', details: error instanceof Error ? error.message : 'Unknown error' },
        { status: 500 }
      );
    }
  }
  
  // If no special path is matched, handle as regular agent creation
  return createAgent(request);
}

// PUT handler to update an existing agent
export async function PUT(request: NextRequest) {
  // Check rate limit
  const rateLimit = checkRateLimit(request);
  if (rateLimit.limited) {
    return errorResponse('Rate limit exceeded. Try again later.', 429, { 
      limit: RATE_LIMIT, 
      window: `${RATE_WINDOW/1000} seconds`,
      reset: new Date(Date.now() + RATE_WINDOW).toISOString()
    });
  }
  try {
    // Apply timeout to Supabase operations
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Database connection timed out')), 10000);
    });
    
    // Get the Supabase client with timeout
    const supabasePromise = createServerClient();
    const supabase = await Promise.race([supabasePromise, timeoutPromise]) as Awaited<ReturnType<typeof createServerClient>>;
    
    const { searchParams } = new URL(request.url);
    const agentId = searchParams.get('agentId');
    
    if (!agentId) {
      return NextResponse.json(
        { success: false, error: 'Agent ID is required' },
        { status: 400 }
      );
    }
    
    const json = await request.json();
    
    // Validate request body
    const validationResult = elizaAgentSchema.partial().safeParse(json);
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
    
    // Update agent in the database
    const updateData: any = {};
    if (validatedData.name) updateData.name = validatedData.name;
    if (validatedData.farmId) updateData.farm_id = validatedData.farmId;
    if (validatedData.config) updateData.config = validatedData.config;
    updateData.updated_at = new Date().toISOString();
    
    const { data, error } = await supabase
      .from('elizaos_agents')
      .update(updateData)
      .eq('id', agentId)
      .select()
      .single();
    
    if (error) {
      console.error('Error updating ElizaOS agent:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to update agent', details: error.message },
        { status: 500 }
      );
    }
    
    return NextResponse.json(
      { success: true, data },
      { status: 200 }
    );
  } catch (error) {
    console.error('Unexpected error updating ElizaOS agent:', error);
    return NextResponse.json(
      { success: false, error: 'An unexpected error occurred', details: error instanceof Error ? error.message : 'Unknown error' },
        { status: 500 }
    );
  }
}

// PATCH handler to update agent status
export async function PATCH(request: NextRequest) {
  // Check rate limit
  const rateLimit = checkRateLimit(request);
  if (rateLimit.limited) {
    return errorResponse('Rate limit exceeded. Try again later.', 429, { 
      limit: RATE_LIMIT, 
      window: `${RATE_WINDOW/1000} seconds`,
      reset: new Date(Date.now() + RATE_WINDOW).toISOString()
    });
  }
  try {
    // Apply timeout to Supabase operations
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Database connection timed out')), 10000);
    });
    
    // Get the Supabase client with timeout
    const supabasePromise = createServerClient();
    const supabase = await Promise.race([supabasePromise, timeoutPromise]) as Awaited<ReturnType<typeof createServerClient>>;
    
    const { searchParams } = new URL(request.url);
    const agentId = searchParams.get('agentId');
    
    if (!agentId) {
      return NextResponse.json(
        { success: false, error: 'Agent ID is required' },
        { status: 400 }
      );
    }
    
    const json = await request.json();
    const statusSchema = z.object({
      status: z.enum(['initializing', 'idle', 'busy', 'error', 'offline'])
    });
    
    // Validate request body
    const validationResult = statusSchema.safeParse(json);
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
    
    // Update agent status in the database
    const { data, error } = await supabase
      .from('elizaos_agents')
      .update({ 
        status: validatedData.status,
        updated_at: new Date().toISOString()
      })
      .eq('id', agentId)
      .select()
      .single();
    
    if (error) {
      console.error('Error updating ElizaOS agent status:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to update agent status', details: error.message },
        { status: 500 }
      );
    }
    
    return NextResponse.json(
      { success: true, data },
      { status: 200 }
    );
  } catch (error) {
    console.error('Unexpected error updating ElizaOS agent status:', error);
    return NextResponse.json(
      { success: false, error: 'An unexpected error occurred', details: error instanceof Error ? error.message : 'Unknown error' },
        { status: 500 }
    );
  }
}

// DELETE handler to remove an agent
export async function DELETE(request: NextRequest) {
  // Check rate limit
  const rateLimit = checkRateLimit(request);
  if (rateLimit.limited) {
    return errorResponse('Rate limit exceeded. Try again later.', 429, { 
      limit: RATE_LIMIT, 
      window: `${RATE_WINDOW/1000} seconds`,
      reset: new Date(Date.now() + RATE_WINDOW).toISOString()
    });
  }
  try {
    // Apply timeout to Supabase operations
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Database connection timed out')), 10000);
    });
    
    // Get the Supabase client with timeout
    const supabasePromise = createServerClient();
    const supabase = await Promise.race([supabasePromise, timeoutPromise]) as Awaited<ReturnType<typeof createServerClient>>;
    
    const { searchParams } = new URL(request.url);
    const agentId = searchParams.get('agentId');
    
    if (!agentId) {
      return NextResponse.json(
        { success: false, error: 'Agent ID is required' },
        { status: 400 }
      );
    }
    
    // Delete agent from the database
    const { error } = await supabase
      .from('elizaos_agents')
      .delete()
      .eq('id', agentId);
    
    if (error) {
      console.error('Error deleting ElizaOS agent:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to delete agent', details: error.message },
        { status: 500 }
      );
    }
    
    return NextResponse.json(
      { success: true },
      { status: 200 }
    );
  } catch (error) {
    console.error('Unexpected error deleting ElizaOS agent:', error);
    return NextResponse.json(
      { success: false, error: 'An unexpected error occurred', details: error instanceof Error ? error.message : 'Unknown error' },
        { status: 500 }
    );
  }
}
