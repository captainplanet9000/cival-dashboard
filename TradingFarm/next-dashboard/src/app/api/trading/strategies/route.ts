/**
 * Trading Strategies API Endpoints
 * 
 * REST API for managing trading strategies and their execution
 */
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createServerClient } from '@/utils/supabase/server';
import { FarmService } from '@/services/farm-service';
import { TradingStrategyService } from '@/services/trading-strategy-service';

// Initializes services for dependency injection
const farmService = new FarmService();
const tradingStrategyService = new TradingStrategyService(farmService);

// Schema for creating/updating trading strategies
const strategySchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  farmId: z.number().int().positive("Farm ID is required"),
  strategyType: z.enum([
    "trend_following", 
    "mean_reversion", 
    "breakout", 
    "grid_trading",
    "scalping",
    "arbitrage",
    "custom"
  ]),
  exchange: z.string().min(1, "Exchange is required"),
  symbol: z.string().min(1, "Symbol is required"),
  timeframe: z.string().min(1, "Timeframe is required"),
  parameters: z.record(z.any()),
  isActive: z.boolean().default(false),
  maxDrawdown: z.number().optional(),
  maxPositionSize: z.number().optional(),
  stopLoss: z.number().optional(),
  takeProfit: z.number().optional(),
});

/**
 * GET /api/trading/strategies
 * 
 * Get all trading strategies or strategies for a specific farm
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const farmId = searchParams.get('farmId');
    
    const supabase = createServerClient();
    
    // Check auth
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    let query = supabase
      .from('trading_strategies')
      .select('*');
    
    // Filter by farm if provided
    if (farmId) {
      query = query.eq('farm_id', farmId);
    }
    
    const { data, error } = await query.order('created_at', { ascending: false });
    
    if (error) {
      console.error('Error fetching trading strategies:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    
    // Map database column names to camelCase for frontend
    const strategies = data.map(strategy => ({
      id: strategy.id,
      name: strategy.name,
      description: strategy.description,
      farmId: strategy.farm_id,
      strategyType: strategy.strategy_type,
      exchange: strategy.exchange,
      symbol: strategy.symbol,
      timeframe: strategy.timeframe,
      parameters: strategy.parameters,
      isActive: strategy.is_active,
      maxDrawdown: strategy.max_drawdown,
      maxPositionSize: strategy.max_position_size,
      stopLoss: strategy.stop_loss,
      takeProfit: strategy.take_profit,
      created_at: strategy.created_at,
      updated_at: strategy.updated_at
    }));
    
    return NextResponse.json({ strategies });
  } catch (error) {
    console.error('Unexpected error in trading strategies GET:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * POST /api/trading/strategies
 * 
 * Create a new trading strategy
 */
export async function POST(request: Request) {
  try {
    const supabase = createServerClient();
    
    // Check auth
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Parse and validate request body
    const body = await request.json();
    const validatedData = strategySchema.parse(body);
    
    // Check if farm exists and belongs to user
    const farm = await farmService.getFarm(validatedData.farmId);
    if (!farm) {
      return NextResponse.json({ error: 'Farm not found' }, { status: 404 });
    }
    
    if (farm.user_id !== user.id) {
      return NextResponse.json({ error: 'Not authorized to access this farm' }, { status: 403 });
    }
    
    // Map camelCase properties to snake_case for database
    const { data, error } = await supabase
      .from('trading_strategies')
      .insert([{
        name: validatedData.name,
        description: validatedData.description,
        farm_id: validatedData.farmId,
        strategy_type: validatedData.strategyType,
        exchange: validatedData.exchange,
        symbol: validatedData.symbol,
        timeframe: validatedData.timeframe,
        parameters: validatedData.parameters,
        is_active: validatedData.isActive,
        max_drawdown: validatedData.maxDrawdown,
        max_position_size: validatedData.maxPositionSize,
        stop_loss: validatedData.stopLoss,
        take_profit: validatedData.takeProfit
      }])
      .select()
      .single();
    
    if (error) {
      console.error('Error creating trading strategy:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
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
    console.error('Unexpected error in trading strategies POST:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
