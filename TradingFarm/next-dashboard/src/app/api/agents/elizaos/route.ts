import { NextResponse, NextRequest } from '@/types/next-types';
import { createServerClient } from '@/utils/supabase/server';
import { v4 as uuidv4 } from 'uuid';
import { TradingAgentController, AgentControllerConfig } from '@/core/trading-agent-controller';
import { LogManager } from '@/core/log-manager';
import { ExecutionMode } from '@/core/trading-engine';

// In-memory store for active agent controllers
// In production, you'd want to use a more persistent solution
const activeAgentControllers = new Map<string, TradingAgentController>();
const logManager = new LogManager(undefined, undefined, undefined, 'elizaos-api');

/**
 * GET - List ElizaOS agents or get a specific agent
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = new URL(request.url).searchParams;
    const agentId = searchParams.get('id');
    const farmId = searchParams.get('farmId');
    const limit = parseInt(searchParams.get('limit') || '10');
    const offset = parseInt(searchParams.get('offset') || '0');
    
    const supabase = createServerClient();
    
    // If agentId is provided, get specific agent
    if (agentId) {
      // Check if agent is active in memory
      if (activeAgentControllers.has(agentId)) {
        const controller = activeAgentControllers.get(agentId)!;
        const agentInfo = await controller.getAgentInfo();
        
        return NextResponse.json({ 
          agent: agentInfo,
          isActive: true,
          statusCode: 200
        });
      }
      
      // Get from database
      const { data: agent, error } = await supabase
        .from('agents')
        .select(`
          *,
          farms:farm_id (
            id,
            name
          ),
          strategies:strategy_id (
            id,
            name,
            description
          )
        `)
        .eq('id', agentId)
        .eq('type', 'eliza')
        .single();
      
      if (error) {
        return NextResponse.json({ error: error.message }, { status: 404 });
      }
      
      return NextResponse.json({ 
        agent,
        isActive: false,
        statusCode: 200
      });
    }
    
    // List agents
    let query = supabase
      .from('agents')
      .select(`
        *,
        farms:farm_id (
          id,
          name
        ),
        strategies:strategy_id (
          id,
          name,
          description
        )
      `)
      .eq('type', 'eliza');
    
    // Filter by farm if provided
    if (farmId) {
      query = query.eq('farm_id', farmId);
    }
    
    // Paginate results
    query = query.range(offset, offset + limit - 1)
      .order('created_at', { ascending: false });
    
    const { data: agents, error, count } = await query;
    
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    
    // Enhance with active status
    const enhancedAgents = agents?.map(agent => ({
      ...agent,
      isActive: activeAgentControllers.has(agent.id)
    }));
    
    return NextResponse.json({ 
      agents: enhancedAgents || [],
      count,
      offset,
      limit,
      statusCode: 200
    });
  } catch (error: any) {
    console.error('Error in ElizaOS agents API:', error);
    return NextResponse.json({ error: error.message || 'An unexpected error occurred' }, { status: 500 });
  }
}

/**
 * POST - Create a new ElizaOS agent or perform an action on an existing agent
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, agentId } = body;
    
    // Handle different actions
    switch (action) {
      case 'create':
        return handleCreateAgent(body);
      case 'start':
        return handleStartAgent(agentId);
      case 'stop':
        return handleStopAgent(agentId);
      case 'pause':
        return handlePauseAgent(agentId);
      case 'resume':
        return handleResumeAgent(agentId);
      case 'analyze':
        return handleAnalyzeRequest(agentId, body.symbol, body.timeframe);
      case 'execute_trade':
        return handleExecuteTrade(agentId, body.orderRequest);
      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (error: any) {
    console.error('Error in ElizaOS agents API:', error);
    return NextResponse.json({ error: error.message || 'An unexpected error occurred' }, { status: 500 });
  }
}

/**
 * Handler for creating a new ElizaOS agent
 */
async function handleCreateAgent(data: any) {
  try {
    const supabase = createServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const {
      name,
      description,
      farmId,
      strategyId,
      exchangeId,
      exchangeType,
      executionMode,
      riskParameters,
      allowedSymbols,
      maxPositions,
      modelProvider,
      modelName,
      elizaConfig,
      initialFunds
    } = data;
    
    // Validate required fields
    if (!name || !farmId || !strategyId || !exchangeId || !exchangeType) {
      return NextResponse.json({ 
        error: 'Missing required fields', 
        required: ['name', 'farmId', 'strategyId', 'exchangeId', 'exchangeType']
      }, { status: 400 });
    }
    
    // Create a new agent in the database
    const newAgentId = uuidv4();
    const { data: agent, error } = await supabase
      .from('agents')
      .insert({
        id: newAgentId,
        name,
        description,
        farm_id: farmId,
        strategy_id: strategyId,
        exchange_id: exchangeId,
        user_id: user.id,
        status: 'inactive',
        type: 'eliza',
        config: {
          description,
          exchange_type: exchangeType,
          execution_mode: executionMode || 'paper',
          risk_parameters: riskParameters || {
            max_position_size: 10,
            max_leverage: 2,
            max_daily_loss: 5
          },
          allowed_symbols: allowedSymbols || [],
          max_positions: maxPositions || 5,
          model_provider: modelProvider || 'openai',
          model_name: modelName || 'gpt-4-turbo',
          eliza_config: elizaConfig || {},
          initial_funds: initialFunds || 10000
        }
      })
      .select()
      .single();
    
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    
    return NextResponse.json({ 
      agent,
      message: 'ElizaOS agent created successfully',
      statusCode: 201
    });
  } catch (error: any) {
    logManager.error('Error creating ElizaOS agent', { error });
    return NextResponse.json({ error: error.message || 'An unexpected error occurred' }, { status: 500 });
  }
}

/**
 * Handler for starting an agent
 */
async function handleStartAgent(agentId: string) {
  try {
    if (!agentId) {
      return NextResponse.json({ error: 'Agent ID is required' }, { status: 400 });
    }
    
    const supabase = createServerClient();
    
    // Check if agent already exists in memory
    if (activeAgentControllers.has(agentId)) {
      const controller = activeAgentControllers.get(agentId)!;
      const currentStatus = controller.getStatus();
      
      if (currentStatus === 'running') {
        return NextResponse.json({ 
          message: 'Agent is already running',
          agentId,
          status: currentStatus
        });
      }
      
      // Resume if paused
      if (currentStatus === 'paused') {
        await controller.resume();
        return NextResponse.json({
          message: 'Agent resumed successfully',
          agentId,
          status: controller.getStatus()
        });
      }
      
      // Otherwise, start the agent
      await controller.start();
      return NextResponse.json({
        message: 'Agent started successfully',
        agentId,
        status: controller.getStatus()
      });
    }
    
    // Get agent from database
    const { data: agent, error } = await supabase
      .from('agents')
      .select('*')
      .eq('id', agentId)
      .eq('type', 'eliza')
      .single();
    
    if (error || !agent) {
      return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
    }
    
    // Get exchange information
    const exchangeId = agent.config?.exchange_id || agent.exchange_id;
    
    if (!exchangeId) {
      return NextResponse.json({ error: 'Exchange ID not found for agent' }, { status: 400 });
    }
    
    // Create agent controller configuration
    const config: AgentControllerConfig = {
      agentId: agent.id,
      farmId: agent.farm_id,
      strategyId: agent.strategy_id,
      exchangeId,
      exchangeType: agent.config?.exchange_type,
      userId: agent.user_id,
      executionMode: agent.config?.execution_mode || 'paper',
      useElizaOS: true,
      elizaConfig: {
        name: agent.name,
        description: agent.description || agent.config?.description,
        modelProvider: agent.config?.model_provider || 'openai',
        modelName: agent.config?.model_name || 'gpt-4-turbo',
        riskProfile: agent.config?.risk_level || 'moderate'
      },
      riskParams: agent.config?.risk_parameters || {
        max_position_size: 10,
        max_leverage: 2,
        max_daily_loss: 5
      },
      allowedSymbols: agent.config?.allowed_symbols || [],
      maxPositions: agent.config?.max_positions || 5,
      initialFunds: agent.config?.initial_funds || 10000
    };
    
    // Create and initialize the agent controller
    const controller = new TradingAgentController(config);
    const initialized = await controller.initialize();
    
    if (!initialized) {
      return NextResponse.json({ 
        error: 'Failed to initialize agent controller',
        agentId
      }, { status: 500 });
    }
    
    // Start the agent
    await controller.start();
    
    // Store in memory
    activeAgentControllers.set(agentId, controller);
    
    return NextResponse.json({
      message: 'Agent started successfully',
      agentId,
      status: controller.getStatus()
    });
  } catch (error: any) {
    logManager.error('Error starting ElizaOS agent', { error, agentId });
    return NextResponse.json({ error: error.message || 'An unexpected error occurred' }, { status: 500 });
  }
}

/**
 * Handler for stopping an agent
 */
async function handleStopAgent(agentId: string) {
  try {
    if (!agentId) {
      return NextResponse.json({ error: 'Agent ID is required' }, { status: 400 });
    }
    
    if (!activeAgentControllers.has(agentId)) {
      return NextResponse.json({ 
        error: 'Agent is not currently active',
        agentId
      }, { status: 404 });
    }
    
    const controller = activeAgentControllers.get(agentId)!;
    await controller.shutdown();
    
    // Remove from memory
    activeAgentControllers.delete(agentId);
    
    return NextResponse.json({
      message: 'Agent stopped successfully',
      agentId
    });
  } catch (error: any) {
    logManager.error('Error stopping ElizaOS agent', { error, agentId });
    return NextResponse.json({ error: error.message || 'An unexpected error occurred' }, { status: 500 });
  }
}

/**
 * Handler for pausing an agent
 */
async function handlePauseAgent(agentId: string) {
  try {
    if (!agentId) {
      return NextResponse.json({ error: 'Agent ID is required' }, { status: 400 });
    }
    
    if (!activeAgentControllers.has(agentId)) {
      return NextResponse.json({ 
        error: 'Agent is not currently active',
        agentId
      }, { status: 404 });
    }
    
    const controller = activeAgentControllers.get(agentId)!;
    await controller.pause();
    
    return NextResponse.json({
      message: 'Agent paused successfully',
      agentId,
      status: controller.getStatus()
    });
  } catch (error: any) {
    logManager.error('Error pausing ElizaOS agent', { error, agentId });
    return NextResponse.json({ error: error.message || 'An unexpected error occurred' }, { status: 500 });
  }
}

/**
 * Handler for resuming an agent
 */
async function handleResumeAgent(agentId: string) {
  try {
    if (!agentId) {
      return NextResponse.json({ error: 'Agent ID is required' }, { status: 400 });
    }
    
    if (!activeAgentControllers.has(agentId)) {
      return NextResponse.json({ 
        error: 'Agent is not currently active',
        agentId
      }, { status: 404 });
    }
    
    const controller = activeAgentControllers.get(agentId)!;
    await controller.resume();
    
    return NextResponse.json({
      message: 'Agent resumed successfully',
      agentId,
      status: controller.getStatus()
    });
  } catch (error: any) {
    logManager.error('Error resuming ElizaOS agent', { error, agentId });
    return NextResponse.json({ error: error.message || 'An unexpected error occurred' }, { status: 500 });
  }
}

/**
 * Handler for requesting analysis from an agent
 */
async function handleAnalyzeRequest(agentId: string, symbol: string, timeframe: string = '1h') {
  try {
    if (!agentId || !symbol) {
      return NextResponse.json({ 
        error: 'Agent ID and symbol are required',
        required: ['agentId', 'symbol']
      }, { status: 400 });
    }
    
    if (!activeAgentControllers.has(agentId)) {
      return NextResponse.json({ 
        error: 'Agent is not currently active',
        agentId
      }, { status: 404 });
    }
    
    // Get the agent controller
    const controller = activeAgentControllers.get(agentId)!;
    
    // Get detailed info, will throw if not initialized or active
    const agentInfo = await controller.getAgentInfo();
    
    // We don't directly have access to the ElizaOSIntegration from the controller
    // In a real implementation, we would add a method to the controller to relay this request
    return NextResponse.json({
      message: 'Analysis request received',
      agentId,
      symbol,
      timeframe,
      status: 'pending',
      analysis: {
        symbol,
        timeframe,
        timestamp: new Date().toISOString(),
        indicators: {
          trend: 'neutral',
          momentum: 'positive',
          volatility: 'moderate'
        },
        recommendation: 'hold',
        confidence: 0.65,
        summary: 'Market conditions indicate continued sideways movement with potential upside. Monitoring key support levels.'
      }
    });
  } catch (error: any) {
    logManager.error('Error requesting analysis from ElizaOS agent', { error, agentId, symbol });
    return NextResponse.json({ error: error.message || 'An unexpected error occurred' }, { status: 500 });
  }
}

/**
 * Handler for executing a trade through an agent
 */
async function handleExecuteTrade(agentId: string, orderRequest: any) {
  try {
    if (!agentId || !orderRequest) {
      return NextResponse.json({ 
        error: 'Agent ID and order request are required',
        required: ['agentId', 'orderRequest']
      }, { status: 400 });
    }
    
    if (!activeAgentControllers.has(agentId)) {
      return NextResponse.json({ 
        error: 'Agent is not currently active',
        agentId
      }, { status: 404 });
    }
    
    // Get the agent controller
    const controller = activeAgentControllers.get(agentId)!;
    
    // Execute the trade
    const result = await controller.executeOrder(orderRequest);
    
    return NextResponse.json({
      message: result.success ? 'Trade executed successfully' : 'Trade execution failed',
      agentId,
      orderRequest,
      result
    });
  } catch (error: any) {
    logManager.error('Error executing trade through ElizaOS agent', { error, agentId, orderRequest });
    return NextResponse.json({ error: error.message || 'An unexpected error occurred' }, { status: 500 });
  }
}

/**
 * DELETE - Delete an ElizaOS agent
 */
export async function DELETE(request: NextRequest) {
  try {
    const searchParams = new URL(request.url).searchParams;
    const agentId = searchParams.get('id');
    
    if (!agentId) {
      return NextResponse.json({ error: 'Agent ID is required' }, { status: 400 });
    }
    
    // Check if agent is active
    if (activeAgentControllers.has(agentId)) {
      // Stop the agent first
      const controller = activeAgentControllers.get(agentId)!;
      await controller.shutdown();
      activeAgentControllers.delete(agentId);
    }
    
    // Delete from database
    const supabase = createServerClient();
    const { error } = await supabase
      .from('agents')
      .delete()
      .eq('id', agentId)
      .eq('type', 'eliza');
    
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    
    return NextResponse.json({
      message: 'Agent deleted successfully',
      agentId
    });
  } catch (error: any) {
    logManager.error('Error deleting ElizaOS agent', { error });
    return NextResponse.json({ error: error.message || 'An unexpected error occurred' }, { status: 500 });
  }
}
