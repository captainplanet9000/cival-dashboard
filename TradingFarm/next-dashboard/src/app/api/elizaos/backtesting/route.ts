import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/utils/supabase/server';
import { z } from 'zod';
import { BacktestEngine, BacktestConfig } from '@/services/trading/backtest-engine';
import { MarketDataService } from '@/services/trading/market-data-service';
import { PerformanceAnalytics } from '@/services/trading/performance-analytics';
import { AIAdaptiveStrategy } from '@/services/trading/strategies/ai-adaptive-strategy';
import { pusherServer } from '@/lib/pusher';

// Validation schema for backtest request
const backtestRequestSchema = z.object({
  strategyId: z.string().min(1, 'Strategy ID is required'),
  strategyParams: z.object({}).passthrough(),
  startDate: z.string().refine(val => !isNaN(Date.parse(val)), 'Invalid start date'),
  endDate: z.string().refine(val => !isNaN(Date.parse(val)), 'Invalid end date'),
  symbols: z.array(z.string()).min(1, 'At least one symbol is required'),
  timeframes: z.array(z.string()).min(1, 'At least one timeframe is required'),
  initialCapital: z.number().positive('Initial capital must be positive'),
  feesPercentage: z.number().min(0, 'Fees percentage cannot be negative'),
  slippagePercentage: z.number().min(0, 'Slippage percentage cannot be negative'),
  executionDelay: z.number().min(0, 'Execution delay cannot be negative'),
  metadata: z.object({}).passthrough().optional(),
});

// Initialize services
const marketDataConfig = {
  defaultExchange: 'backtest',
  supportedExchanges: ['backtest'],
  cacheTTL: 60 * 60 * 1000, // 1 hour
  useHistoricalData: true
};

const marketDataService = new MarketDataService(marketDataConfig);
const backtestEngine = new BacktestEngine();
const performanceAnalytics = new PerformanceAnalytics();

// POST endpoint to run a backtest
export async function POST(req: NextRequest) {
  try {
    // Parse and validate request body
    const body = await req.json();
    const validationResult = backtestRequestSchema.safeParse(body);
    
    if (!validationResult.success) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Invalid request body',
          details: validationResult.error.errors 
        },
        { status: 400 }
      );
    }
    
    const backtestRequest = validationResult.data;
    
    // Get user from auth
    const supabase = createServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    // Create backtest config
    const config: BacktestConfig = {
      strategyId: backtestRequest.strategyId,
      strategyParams: backtestRequest.strategyParams,
      startDate: new Date(backtestRequest.startDate),
      endDate: new Date(backtestRequest.endDate),
      symbols: backtestRequest.symbols,
      timeframes: backtestRequest.timeframes as any[],
      initialCapital: backtestRequest.initialCapital,
      feesPercentage: backtestRequest.feesPercentage,
      slippagePercentage: backtestRequest.slippagePercentage,
      executionDelay: backtestRequest.executionDelay,
      userId: user.id,
      metadata: backtestRequest.metadata
    };
    
    // Notify that the backtest is starting
    await pusherServer.trigger(`user-${user.id}`, 'BACKTEST_STARTED', {
      strategyId: config.strategyId,
      timestamp: new Date().toISOString()
    });
    
    // Fetch historical data for backtest
    const historicalData: Record<string, any[]> = {};
    
    for (const symbol of config.symbols) {
      // Fetch data for each symbol and timeframe
      const candles = await marketDataService.getCandles(
        symbol,
        config.timeframes[0], // Use the first timeframe for now
        1000, // Get a good amount of data
        undefined,
        'backtest'
      );
      
      historicalData[symbol] = candles;
    }
    
    // Initialize the appropriate strategy
    let strategy;
    
    switch (config.strategyId) {
      case 'ai-adaptive-strategy':
        strategy = new AIAdaptiveStrategy(config.strategyParams);
        break;
      default:
        return NextResponse.json(
          { success: false, error: `Strategy ${config.strategyId} not found` },
          { status: 404 }
        );
    }
    
    // Run the backtest
    const backtestResult = await backtestEngine.runBacktest(
      strategy,
      config,
      historicalData
    );
    
    // Save the backtest result
    await performanceAnalytics.saveBacktestResult(backtestResult);
    
    // Notify that the backtest is complete
    await pusherServer.trigger(`user-${user.id}`, 'BACKTEST_COMPLETED', {
      backtestId: backtestResult.id,
      strategyId: backtestResult.strategyId,
      profit: backtestResult.profit,
      profitPercent: backtestResult.profitPercent,
      timestamp: new Date().toISOString()
    });
    
    // Return the result
    return NextResponse.json({
      success: true,
      result: backtestResult
    });
  } catch (error: any) {
    console.error('Error running backtest:', error);
    
    return NextResponse.json(
      { 
        success: false, 
        error: 'An error occurred while running the backtest',
        details: error.message
      },
      { status: 500 }
    );
  }
}

// GET endpoint to retrieve backtest results
export async function GET(req: NextRequest) {
  try {
    // Get query parameters
    const searchParams = req.nextUrl.searchParams;
    const strategyId = searchParams.get('strategyId');
    const limit = parseInt(searchParams.get('limit') || '10', 10);
    
    // Validate parameters
    if (!strategyId) {
      return NextResponse.json(
        { success: false, error: 'Strategy ID is required' },
        { status: 400 }
      );
    }
    
    // Get user from auth
    const supabase = createServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    // Fetch backtest results
    const results = await performanceAnalytics.getBacktestResults(strategyId, limit);
    
    // Return the results
    return NextResponse.json({
      success: true,
      results
    });
  } catch (error: any) {
    console.error('Error retrieving backtest results:', error);
    
    return NextResponse.json(
      { 
        success: false, 
        error: 'An error occurred while retrieving backtest results',
        details: error.message
      },
      { status: 500 }
    );
  }
}
