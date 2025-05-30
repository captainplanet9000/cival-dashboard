import { strategyService } from '../../../services';

/**
 * Handler for GET /api/strategies/backtests
 * Retrieves backtest results for a strategy
 */
export async function GET(request: Request) {
  try {
    // Get query parameters
    const url = new URL(request.url);
    const strategyId = url.searchParams.get('strategyId');
    const limit = parseInt(url.searchParams.get('limit') || '10');
    
    if (!strategyId) {
      return new Response(JSON.stringify({ error: 'Strategy ID is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    // Get backtest results
    const backtests = await strategyService.getBacktestResults(strategyId, limit);
    
    return new Response(JSON.stringify(backtests), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Error fetching backtest results:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

/**
 * Handler for OPTIONS /api/strategies/backtests
 * Handles preflight requests for CORS
 */
export function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    }
  });
} 