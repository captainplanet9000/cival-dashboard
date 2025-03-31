/**
 * Start Trading Strategy API Endpoint
 * 
 * Activates a trading strategy and starts real-time trading
 */
import { NextResponse } from 'next/server';
import { createServerClient } from '@/utils/supabase/server';
import { FarmService } from '@/services/farm-service';
import { TradingStrategyService } from '@/services/trading-strategy-service';
import websocketService, { WebSocketTopic } from '@/services/websocket-service';

// Initialize services
const farmService = new FarmService();
const tradingStrategyService = new TradingStrategyService(farmService);

// Helper function to check if a strategy belongs to the user
async function validateOwnership(strategyId: number, userId: string) {
  const supabase = createServerClient();
  
  const { data, error } = await supabase
    .from('trading_strategies')
    .select('*, farms(user_id)')
    .eq('id', strategyId)
    .single();
  
  if (error || !data) {
    return { valid: false, error: 'Strategy not found', strategy: null };
  }
  
  // @ts-ignore - Supabase types don't properly handle joins
  if (data.farms?.user_id !== userId) {
    return { valid: false, error: 'Not authorized to access this strategy', strategy: null };
  }
  
  return { 
    valid: true, 
    error: null, 
    strategy: {
      id: data.id,
      name: data.name,
      farmId: data.farm_id,
      strategyType: data.strategy_type,
      exchange: data.exchange,
      symbol: data.symbol,
      timeframe: data.timeframe,
      parameters: data.parameters,
      isActive: data.is_active
    }
  };
}

/**
 * POST /api/trading/strategies/[id]/start
 * 
 * Start a trading strategy
 */
export async function POST(
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
    
    // Validate ownership and get strategy
    const { valid, error, strategy } = await validateOwnership(strategyId, user.id);
    if (!valid || !strategy) {
      return NextResponse.json({ error }, { status: 403 });
    }
    
    // If strategy is already active, return success
    if (strategy.isActive) {
      return NextResponse.json({ success: true, message: 'Strategy is already active' });
    }
    
    // Check if the farm is active
    const farm = await farmService.getFarm(strategy.farmId);
    if (!farm) {
      return NextResponse.json({ error: 'Farm not found' }, { status: 404 });
    }
    
    if (!farm.is_active) {
      return NextResponse.json({ 
        error: 'Cannot start strategy: Farm is not active',
        farmId: farm.id
      }, { status: 400 });
    }
    
    // Check if exchange credentials exist
    const { data: credentials, error: credError } = await supabase
      .from('exchange_credentials')
      .select('*')
      .eq('exchange', strategy.exchange)
      .eq('is_default', true)
      .single();
    
    if (credError || !credentials) {
      return NextResponse.json({ 
        error: `No default credentials found for ${strategy.exchange}. Please add credentials before starting the strategy.`,
        missingCredentials: true
      }, { status: 400 });
    }
    
    // Start the strategy in the database
    const { error: updateError } = await supabase
      .from('trading_strategies')
      .update({ is_active: true })
      .eq('id', strategyId);
    
    if (updateError) {
      console.error('Error updating strategy status:', updateError);
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }
    
    // Call the strategy service to start the strategy
    const started = await tradingStrategyService.startStrategy(strategyId);
    
    // Broadcast strategy started event
    websocketService.broadcastToTopic(WebSocketTopic.TRADING, {
      type: 'strategy_started',
      strategyId,
      farmId: strategy.farmId,
      timestamp: new Date().toISOString()
    });
    
    return NextResponse.json({ 
      success: started,
      message: started ? 'Strategy started successfully' : 'Failed to start strategy'
    });
  } catch (error) {
    console.error('Unexpected error in start strategy:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
