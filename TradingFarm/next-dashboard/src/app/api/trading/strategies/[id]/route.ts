/**
 * Trading Strategy API Endpoints for specific strategies
 * 
 * REST API for managing individual trading strategies
 */
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createServerClient } from '@/utils/supabase/server';
import { FarmService } from '@/services/farm-service';
import { TradingStrategyService } from '@/services/trading-strategy-service';

// Initializes services for dependency injection
const farmService = new FarmService();
const tradingStrategyService = new TradingStrategyService(farmService);

// Schema for updating trading strategies
const strategyUpdateSchema = z.object({
  name: z.string().min(1, "Name is required").optional(),
  description: z.string().optional(),
  strategyType: z.enum([
    "trend_following", 
    "mean_reversion", 
    "breakout", 
    "grid_trading",
    "scalping",
    "arbitrage",
    "custom"
  ]).optional(),
  exchange: z.string().min(1, "Exchange is required").optional(),
  symbol: z.string().min(1, "Symbol is required").optional(),
  timeframe: z.string().min(1, "Timeframe is required").optional(),
  parameters: z.record(z.any()).optional(),
  isActive: z.boolean().optional(),
  maxDrawdown: z.number().optional(),
  maxPositionSize: z.number().optional(),
  stopLoss: z.number().optional(),
  takeProfit: z.number().optional(),
});

// Helper function to check if a strategy belongs to the user
async function validateOwnership(strategyId: number, userId: string) {
  const supabase = createServerClient();
  
  const { data, error } = await supabase
    .from('trading_strategies')
    .select('farm_id')
    .eq('id', strategyId)
    .single();
  
  if (error || !data) {
    return { valid: false, error: 'Strategy not found' };
  }
  
  const farmId = data.farm_id;
  
  // Check if the farm belongs to the user
  const { data: farmData, error: farmError } = await supabase
    .from('farms')
    .select('user_id')
    .eq('id', farmId)
    .single();
  
  if (farmError || !farmData) {
    return { valid: false, error: 'Farm not found' };
  }
  
  if (farmData.user_id !== userId) {
    return { valid: false, error: 'Not authorized to access this strategy' };
  }
  
  return { valid: true, farmId };
}

/**
 * GET /api/trading/strategies/[id]
 * 
 * Get a specific trading strategy by ID
 */
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const strategyId = parseInt(params.id);
    if (isNaN(strategyId)) {
      return NextResponse.json({ error: 'Invalid strategy ID' }, { status: 400 });
    }
    
    const supabase = createServerClient();
    
    // Check auth
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Validate ownership
    const { valid, error } = await validateOwnership(strategyId, user.id);
    if (!valid) {
      return NextResponse.json({ error }, { status: 403 });
    }
    
    // Get the strategy
    const { data, error: fetchError } = await supabase
      .from('trading_strategies')
      .select('*')
      .eq('id', strategyId)
      .single();
    
    if (fetchError) {
      console.error('Error fetching trading strategy:', fetchError);
      return NextResponse.json({ error: fetchError.message }, { status: 500 });
    }
    
    // Map database column names to camelCase for frontend
    const strategy = {
      id: data.id,
      name: data.name,
      description: data.description,
      farmId: data.farm_id,
      strategyType: data.strategy_type,
      exchange: data.exchange,
      symbol: data.symbol,
      timeframe: data.timeframe,
      parameters: data.parameters,
      isActive: data.is_active,
      maxDrawdown: data.max_drawdown,
      maxPositionSize: data.max_position_size,
      stopLoss: data.stop_loss,
      takeProfit: data.take_profit,
      created_at: data.created_at,
      updated_at: data.updated_at
    };
    
    return NextResponse.json({ strategy });
  } catch (error) {
    console.error('Unexpected error in strategy GET:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * PATCH /api/trading/strategies/[id]
 * 
 * Update a trading strategy
 */
export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const strategyId = parseInt(params.id);
    if (isNaN(strategyId)) {
      return NextResponse.json({ error: 'Invalid strategy ID' }, { status: 400 });
    }
    
    const supabase = createServerClient();
    
    // Check auth
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Validate ownership
    const { valid, error } = await validateOwnership(strategyId, user.id);
    if (!valid) {
      return NextResponse.json({ error }, { status: 403 });
    }
    
    // Parse and validate request body
    const body = await request.json();
    const validatedData = strategyUpdateSchema.parse(body);
    
    // Map camelCase properties to snake_case for database
    const updateData: any = {};
    
    if (validatedData.name) updateData.name = validatedData.name;
    if (validatedData.description !== undefined) updateData.description = validatedData.description;
    if (validatedData.strategyType) updateData.strategy_type = validatedData.strategyType;
    if (validatedData.exchange) updateData.exchange = validatedData.exchange;
    if (validatedData.symbol) updateData.symbol = validatedData.symbol;
    if (validatedData.timeframe) updateData.timeframe = validatedData.timeframe;
    if (validatedData.parameters) updateData.parameters = validatedData.parameters;
    if (validatedData.isActive !== undefined) updateData.is_active = validatedData.isActive;
    if (validatedData.maxDrawdown !== undefined) updateData.max_drawdown = validatedData.maxDrawdown;
    if (validatedData.maxPositionSize !== undefined) updateData.max_position_size = validatedData.maxPositionSize;
    if (validatedData.stopLoss !== undefined) updateData.stop_loss = validatedData.stopLoss;
    if (validatedData.takeProfit !== undefined) updateData.take_profit = validatedData.takeProfit;
    
    // Update the strategy
    const { data, error: updateError } = await supabase
      .from('trading_strategies')
      .update(updateData)
      .eq('id', strategyId)
      .select()
      .single();
    
    if (updateError) {
      console.error('Error updating trading strategy:', updateError);
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }
    
    // Map database column names to camelCase for frontend
    const strategy = {
      id: data.id,
      name: data.name,
      description: data.description,
      farmId: data.farm_id,
      strategyType: data.strategy_type,
      exchange: data.exchange,
      symbol: data.symbol,
      timeframe: data.timeframe,
      parameters: data.parameters,
      isActive: data.is_active,
      maxDrawdown: data.max_drawdown,
      maxPositionSize: data.max_position_size,
      stopLoss: data.stop_loss,
      takeProfit: data.take_profit,
      created_at: data.created_at,
      updated_at: data.updated_at
    };
    
    return NextResponse.json({ strategy });
  } catch (error) {
    console.error('Unexpected error in strategy PATCH:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * DELETE /api/trading/strategies/[id]
 * 
 * Delete a trading strategy
 */
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const strategyId = parseInt(params.id);
    if (isNaN(strategyId)) {
      return NextResponse.json({ error: 'Invalid strategy ID' }, { status: 400 });
    }
    
    const supabase = createServerClient();
    
    // Check auth
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Validate ownership
    const { valid, error } = await validateOwnership(strategyId, user.id);
    if (!valid) {
      return NextResponse.json({ error }, { status: 403 });
    }
    
    // Delete the strategy
    const { error: deleteError } = await supabase
      .from('trading_strategies')
      .delete()
      .eq('id', strategyId);
    
    if (deleteError) {
      console.error('Error deleting trading strategy:', deleteError);
      return NextResponse.json({ error: deleteError.message }, { status: 500 });
    }
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Unexpected error in strategy DELETE:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
