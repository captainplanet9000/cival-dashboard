import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/utils/supabase/server';
import { StrategyOptimizer } from '@/services/trading/strategy-optimizer';
import { BaseStrategy } from '@/services/trading/base-strategy';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';

// Schema for optimization request
const optimizationRequestSchema = z.object({
  start_date: z.string().datetime().optional(),
  end_date: z.string().datetime().optional(),
  parameters: z.array(
    z.object({
      name: z.string(),
      min: z.number(),
      max: z.number(),
      step: z.number(),
      type: z.enum(['float', 'integer', 'boolean']),
      path: z.array(z.string()),
    })
  ).optional(),
  target_metric: z.enum(['total_return', 'sharpe_ratio', 'calmar_ratio', 'profit_factor', 'score']).optional().default('score'),
  symbols: z.array(z.string()).optional(),
  timeframes: z.array(z.string()).optional(),
  initial_capital: z.number().positive().optional().default(10000),
  max_iterations: z.number().int().positive().optional().default(20),
  population_size: z.number().int().positive().optional().default(30),
  mutation_rate: z.number().min(0).max(1).optional(),
  crossover_rate: z.number().min(0).max(1).optional(),
  early_stopping: z.boolean().optional().default(true),
  early_stopping_tolerance: z.number().int().positive().optional(),
});

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const agentId = params.id;
    const supabase = await createServerClient();
    
    // Validate agent exists and belongs to the current user
    const { data: agent, error: agentError } = await supabase
      .from('elizaos_agents')
      .select('id, user_id, name, configuration')
      .eq('id', agentId)
      .single();
      
    if (agentError || !agent) {
      return NextResponse.json(
        { error: 'Agent not found or not authorized' },
        { status: 404 }
      );
    }
    
    // Ensure agent is a trading agent
    if (agent.configuration?.agent_type !== 'trading_agent') {
      return NextResponse.json(
        { error: 'Only trading agents can be optimized' },
        { status: 400 }
      );
    }
    
    // Get strategy ID from agent configuration
    const strategyId = agent.configuration?.strategy_id;
    if (!strategyId) {
      return NextResponse.json(
        { error: 'Agent has no associated strategy' },
        { status: 400 }
      );
    }
    
    // Get strategy details
    const { data: strategy, error: strategyError } = await supabase
      .from('trading_strategies')
      .select('*')
      .eq('id', strategyId)
      .single();
      
    if (strategyError || !strategy) {
      return NextResponse.json(
        { error: 'Strategy not found' },
        { status: 404 }
      );
    }
    
    // Parse and validate request body
    const body = await request.json();
    const validationResult = optimizationRequestSchema.safeParse(body);
    
    if (!validationResult.success) {
      return NextResponse.json(
        { 
          error: 'Invalid request parameters',
          details: validationResult.error.format() 
        }, 
        { status: 400 }
      );
    }
    
    const optimizationRequest = validationResult.data;
    
    // If no parameters provided, use default parameters from strategy type
    const parameters = optimizationRequest.parameters || getDefaultParametersForStrategy(strategy.strategy_type);
    
    // If no symbols provided, use the ones from agent configuration
    const symbols = optimizationRequest.symbols || agent.configuration?.trading_pairs || ['BTC/USDT'];
    
    // If no timeframes provided, use the ones from agent configuration or defaults
    const timeframes = optimizationRequest.timeframes || agent.configuration?.timeframes || ['1h', '4h'];
    
    // Create optimization job record
    const jobId = uuidv4();
    const { error: jobError } = await supabase
      .from('optimization_jobs')
      .insert({
        id: jobId,
        agent_id: agentId,
        strategy_id: strategyId,
        status: 'pending',
        parameters: {
          config: {
            ...optimizationRequest,
            parameters,
            symbols,
            timeframes,
            start_date: optimizationRequest.start_date ? new Date(optimizationRequest.start_date) : new Date(Date.now() - 90 * 24 * 60 * 60 * 1000), // Default to 90 days ago
            end_date: optimizationRequest.end_date ? new Date(optimizationRequest.end_date) : new Date(),
          }
        },
        created_at: new Date().toISOString()
      });
      
    if (jobError) {
      console.error('Error creating optimization job:', jobError);
      return NextResponse.json(
        { error: 'Failed to create optimization job' },
        { status: 500 }
      );
    }
    
    // Now, we would ideally start the optimization in a background process
    // For now, we'll just return success and handle the process separately
    
    // Update agent status to indicate optimization is in progress
    await supabase
      .from('elizaos_agents')
      .update({ 
        status: 'optimizing',
        updated_at: new Date().toISOString()
      })
      .eq('id', agentId);
    
    // We'll kick off an async process here in a real implementation
    // For demo purposes, we'll manually trigger it later
    
    return NextResponse.json({
      success: true,
      message: 'Strategy optimization job has been scheduled',
      job_id: jobId
    });
    
  } catch (error: any) {
    console.error('Error in strategy optimization:', error);
    return NextResponse.json(
      { error: `Internal server error: ${error.message}` },
      { status: 500 }
    );
  }
}

/**
 * Get optimization job status
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const agentId = params.id;
    const supabase = await createServerClient();
    
    // Check for job ID in query params
    const searchParams = request.nextUrl.searchParams;
    const jobId = searchParams.get('job_id');
    
    if (jobId) {
      // Get specific job status
      const { data: job, error: jobError } = await supabase
        .from('optimization_jobs')
        .select('*')
        .eq('id', jobId)
        .eq('agent_id', agentId)
        .single();
        
      if (jobError || !job) {
        return NextResponse.json(
          { error: 'Optimization job not found' },
          { status: 404 }
        );
      }
      
      return NextResponse.json({ job });
    } else {
      // Get all optimization jobs for this agent
      const { data: jobs, error: jobsError } = await supabase
        .from('optimization_jobs')
        .select('*')
        .eq('agent_id', agentId)
        .order('created_at', { ascending: false });
        
      if (jobsError) {
        return NextResponse.json(
          { error: 'Failed to fetch optimization jobs' },
          { status: 500 }
        );
      }
      
      return NextResponse.json({ jobs });
    }
  } catch (error: any) {
    console.error('Error fetching optimization status:', error);
    return NextResponse.json(
      { error: `Internal server error: ${error.message}` },
      { status: 500 }
    );
  }
}

/**
 * Get default parameters for different strategy types
 */
function getDefaultParametersForStrategy(strategyType: string): any[] {
  switch (strategyType) {
    case 'moving_average_crossover':
      return [
        {
          name: 'fast_period',
          min: 5,
          max: 50,
          step: 1,
          type: 'integer',
          path: ['indicators', 'moving_average', 'fast_period']
        },
        {
          name: 'slow_period',
          min: 20,
          max: 200,
          step: 5,
          type: 'integer',
          path: ['indicators', 'moving_average', 'slow_period']
        },
        {
          name: 'signal_threshold',
          min: 0,
          max: 5,
          step: 0.1,
          type: 'float',
          path: ['signals', 'threshold']
        }
      ];
      
    case 'rsi_strategy':
      return [
        {
          name: 'rsi_period',
          min: 7,
          max: 21,
          step: 1,
          type: 'integer',
          path: ['indicators', 'rsi', 'period']
        },
        {
          name: 'oversold_threshold',
          min: 20,
          max: 40,
          step: 1,
          type: 'integer',
          path: ['signals', 'oversold']
        },
        {
          name: 'overbought_threshold',
          min: 60,
          max: 80,
          step: 1,
          type: 'integer',
          path: ['signals', 'overbought']
        }
      ];
      
    case 'bollinger_bands':
      return [
        {
          name: 'bb_period',
          min: 10,
          max: 50,
          step: 1,
          type: 'integer',
          path: ['indicators', 'bollinger', 'period']
        },
        {
          name: 'bb_deviation',
          min: 1.5,
          max: 3,
          step: 0.1,
          type: 'float',
          path: ['indicators', 'bollinger', 'deviation']
        },
        {
          name: 'mean_reversion_strength',
          min: 0.1,
          max: 1,
          step: 0.05,
          type: 'float',
          path: ['signals', 'mean_reversion_strength']
        }
      ];
      
    default:
      // Generic parameters for any strategy
      return [
        {
          name: 'take_profit',
          min: 1,
          max: 10,
          step: 0.5,
          type: 'float',
          path: ['risk_management', 'take_profit_percent']
        },
        {
          name: 'stop_loss',
          min: 1,
          max: 10,
          step: 0.5,
          type: 'float',
          path: ['risk_management', 'stop_loss_percent']
        },
        {
          name: 'position_size',
          min: 1,
          max: 100,
          step: 1,
          type: 'float',
          path: ['risk_management', 'position_size_percent']
        }
      ];
  }
}
