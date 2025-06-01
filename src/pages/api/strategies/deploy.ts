import { strategyExecutionService } from '../../../services';

/**
 * Handler for POST /api/strategies/deploy
 * Deploys a strategy to an agent
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    // Required fields
    const strategyId = body.strategyId;
    const agentId = body.agentId;
    const config = body.config || {};
    
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
    
    // Deploy the strategy to the agent
    const deploymentId = await strategyExecutionService.deployToAgent(strategyId, agentId, config);
    
    return new Response(JSON.stringify({ 
      success: true,
      deploymentId,
      message: `Strategy ${strategyId} successfully deployed to agent ${agentId}`
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Error deploying strategy:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

/**
 * Handler for OPTIONS /api/strategies/deploy
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