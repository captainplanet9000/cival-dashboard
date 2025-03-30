import { ExecutionContext, ExecutionSignal, strategyExecutionService } from '../../../services';

/**
 * Handler for POST /api/strategies/execute
 * Executes a strategy with a given context
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    // Required fields
    const strategyId = body.strategyId;
    const agentId = body.agentId;
    const context: ExecutionContext = body.context;
    
    if (!strategyId) {
      return new Response(JSON.stringify({ error: 'Strategy ID is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    if (!agentId) {
      return new Response(JSON.stringify({ error: 'Agent ID is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    if (!context) {
      return new Response(JSON.stringify({ error: 'Execution context is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    // Execute the strategy
    const signal: ExecutionSignal = await strategyExecutionService.executeStrategy(strategyId, agentId, context);
    
    // Create an order if needed
    const order = signal.action !== 'hold' 
      ? strategyExecutionService.createOrderFromSignal(signal, context)
      : null;
    
    return new Response(JSON.stringify({ signal, order }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Error executing strategy:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Unknown error',
      signal: { action: 'hold', reason: 'Error executing strategy' }
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

/**
 * Handler for OPTIONS /api/strategies/execute
 * Handles preflight requests for CORS
 */
export function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    }
  });
} 