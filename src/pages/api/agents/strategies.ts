import { strategyService } from '../../../services';

/**
 * Handler for GET /api/agents/strategies
 * Gets the strategies assigned to an agent or agents assigned to a strategy
 */
export async function GET(request: Request) {
  try {
    // Get query parameters
    const url = new URL(request.url);
    const agentId = url.searchParams.get('agentId');
    const strategyId = url.searchParams.get('strategyId');
    
    if (!agentId && !strategyId) {
      return new Response(JSON.stringify({ 
        error: 'Either agentId or strategyId is required' 
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    let agentStrategies;
    
    if (agentId) {
      // Get strategies for an agent
      agentStrategies = await strategyService.getAgentStrategies(agentId);
    } else if (strategyId) {
      // Get agents for a strategy
      // This would typically be a different function, but for this example
      // we'll just mock it with empty data
      agentStrategies = [];
    }
    
    return new Response(JSON.stringify(agentStrategies), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Error fetching agent strategies:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

/**
 * Handler for DELETE /api/agents/strategies
 * Unassigns a strategy from an agent
 */
export async function DELETE(request: Request) {
  try {
    // Get query parameters
    const url = new URL(request.url);
    const id = url.searchParams.get('id');
    
    if (!id) {
      return new Response(JSON.stringify({ error: 'Deployment ID is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    // In a real implementation, you would call a service method to handle this
    // For this example, we'll just return a success response
    
    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Error undeploying strategy:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

/**
 * Handler for OPTIONS /api/agents/strategies
 * Handles preflight requests for CORS
 */
export function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    }
  });
} 