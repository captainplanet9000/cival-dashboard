import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/utils/supabase/server';
import { z } from 'zod';

// Validation schemas
const tradeRequestSchema = z.object({
  agent_id: z.string().uuid(),
  market: z.string(),
  side: z.enum(['buy', 'sell']),
  type: z.enum(['market', 'limit', 'stop', 'stop_limit']),
  quantity: z.number().positive(),
  price: z.number().positive().optional(),
  stop_price: z.number().positive().optional(),
  time_in_force: z.enum(['GTC', 'IOC', 'FOK']).default('GTC'),
  risk_check: z.boolean().default(true)
});

const riskCheckSchema = z.object({
  position_size: z.number().positive(),
  market: z.string(),
  agent_id: z.string().uuid(),
  strategy_params: z.record(z.any()).optional()
});

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerClient();
    const json = await request.json();

    // Validate trade request
    const validationResult = tradeRequestSchema.safeParse(json);
    if (!validationResult.success) {
      return NextResponse.json(
        { success: false, error: 'Invalid trade request', details: validationResult.error.errors },
        { status: 400 }
      );
    }

    const tradeRequest = validationResult.data;

    // Perform risk check if enabled
    if (tradeRequest.risk_check) {
      const riskResult = await performRiskCheck(supabase, {
        position_size: tradeRequest.quantity,
        market: tradeRequest.market,
        agent_id: tradeRequest.agent_id
      });

      if (!riskResult.approved) {
        return NextResponse.json(
          { success: false, error: 'Risk check failed', details: riskResult.reasons },
          { status: 400 }
        );
      }
    }

    // Execute trade
    const tradeResult = await executeTrade(supabase, tradeRequest);

    // Log trade execution
    await logTradeExecution(supabase, {
      agent_id: tradeRequest.agent_id,
      trade_id: tradeResult.trade_id,
      request: tradeRequest,
      result: tradeResult
    });

    return NextResponse.json(
      { success: true, data: tradeResult },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error processing trade:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to process trade', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

async function performRiskCheck(supabase: any, params: z.infer<typeof riskCheckSchema>) {
  // Get agent's current positions and risk limits
  const { data: agent } = await supabase
    .from('elizaos_agents')
    .select('config, farm_id')
    .eq('id', params.agent_id)
    .single();

  // Get farm's risk parameters
  const { data: farm } = await supabase
    .from('farms')
    .select('risk_parameters')
    .eq('id', agent.farm_id)
    .single();

  const riskLimits = farm.risk_parameters || {};
  const positionSize = params.position_size;
  const reasons: string[] = [];

  // Check position size limits
  if (positionSize > (riskLimits.max_position_size || Infinity)) {
    reasons.push('Position size exceeds maximum allowed');
  }

  // Check market exposure
  const { data: existingPositions } = await supabase
    .from('positions')
    .select('size')
    .eq('market', params.market)
    .eq('farm_id', agent.farm_id);

  const totalExposure = (existingPositions || []).reduce((sum: number, pos: any) => sum + pos.size, 0);
  if (totalExposure + positionSize > (riskLimits.max_market_exposure || Infinity)) {
    reasons.push('Total market exposure would exceed limit');
  }

  // Check drawdown limits
  const { data: recentTrades } = await supabase
    .from('trades')
    .select('pnl')
    .eq('farm_id', agent.farm_id)
    .order('created_at', { ascending: false })
    .limit(100);

  const recentPnL = (recentTrades || []).reduce((sum: number, trade: any) => sum + (trade.pnl || 0), 0);
  if (recentPnL < -(riskLimits.max_drawdown || Infinity)) {
    reasons.push('Account is in maximum drawdown');
  }

  return {
    approved: reasons.length === 0,
    reasons
  };
}

async function executeTrade(supabase: any, tradeRequest: z.infer<typeof tradeRequestSchema>) {
  // In production, this would integrate with your exchange API
  // For now, we'll simulate trade execution
  const tradeId = crypto.randomUUID();
  const executionPrice = tradeRequest.price || 1000; // Simulated price
  const executionTime = new Date();

  // Create trade record
  const { data: trade } = await supabase
    .from('trades')
    .insert({
      id: tradeId,
      agent_id: tradeRequest.agent_id,
      market: tradeRequest.market,
      side: tradeRequest.side,
      type: tradeRequest.type,
      quantity: tradeRequest.quantity,
      price: executionPrice,
      executed_at: executionTime.toISOString(),
      status: 'filled'
    })
    .select()
    .single();

  return {
    trade_id: tradeId,
    execution_price: executionPrice,
    execution_time: executionTime,
    status: 'filled',
    trade
  };
}

async function logTradeExecution(supabase: any, data: any) {
  // Log to audit trail
  await supabase
    .from('elizaos_audit_log')
    .insert({
      agent_id: data.agent_id,
      event_type: 'trade_execution',
      event_data: {
        trade_id: data.trade_id,
        request: data.request,
        result: data.result
      }
    });

  // Update agent metrics
  const { data: agent } = await supabase
    .from('elizaos_agents')
    .select('performance_metrics')
    .eq('id', data.agent_id)
    .single();

  const metrics = agent.performance_metrics || {};
  metrics.total_trades = (metrics.total_trades || 0) + 1;
  metrics.last_trade_time = new Date().toISOString();

  await supabase
    .from('elizaos_agents')
    .update({
      performance_metrics: metrics,
      updated_at: new Date().toISOString()
    })
    .eq('id', data.agent_id);
}
