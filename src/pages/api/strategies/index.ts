import { 
  CreateStrategyParams, 
  NLStrategyInput, 
  strategyIngestionService, 
  strategyService 
} from '../../../services';

/**
 * Handler for GET /api/strategies
 * Returns a list of strategies or a single strategy by ID
 */
export async function GET(request: Request) {
  try {
    // Get query parameters
    const url = new URL(request.url);
    const id = url.searchParams.get('id');
    const limit = parseInt(url.searchParams.get('limit') || '10');
    const offset = parseInt(url.searchParams.get('offset') || '0');
    
    if (id) {
      // Get single strategy
      const strategy = await strategyService.getStrategyById(id);
      
      if (!strategy) {
        return new Response(JSON.stringify({ error: 'Strategy not found' }), {
          status: 404,
          headers: { 'Content-Type': 'application/json' }
        });
      }
      
      return new Response(JSON.stringify(strategy), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    } else {
      // Get list of strategies
      const strategies = await strategyService.getStrategies(limit, offset);
      
      return new Response(JSON.stringify(strategies), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  } catch (error) {
    console.error('Error fetching strategies:', error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

/**
 * Handler for POST /api/strategies
 * Creates a new strategy
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    // Check if this is a natural language creation or direct creation
    if (body.naturalLanguageDefinition) {
      // Natural language creation
      const nlInput: NLStrategyInput = {
        name: body.name,
        description: body.description,
        naturalLanguageDefinition: body.naturalLanguageDefinition,
        isPublic: body.isPublic,
        customCode: body.customCode,
        tags: body.tags
      };
      
      const result = await strategyIngestionService.createStrategyFromNL(nlInput);
      
      return new Response(JSON.stringify(result), {
        status: 201,
        headers: { 'Content-Type': 'application/json' }
      });
    } else {
      // Direct creation
      const createParams: CreateStrategyParams = {
        name: body.name,
        description: body.description,
        strategy_type: body.strategy_type,
        is_public: body.is_public,
        code: body.code,
        entry_conditions: body.entry_conditions,
        exit_conditions: body.exit_conditions,
        risk_management: body.risk_management,
        parameters: body.parameters,
        tags: body.tags
      };
      
      const strategy = await strategyService.createStrategy(createParams);
      
      return new Response(JSON.stringify(strategy), {
        status: 201,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  } catch (error) {
    console.error('Error creating strategy:', error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

/**
 * Handler for PUT /api/strategies
 * Updates an existing strategy
 */
export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const id = body.id;
    
    if (!id) {
      return new Response(JSON.stringify({ error: 'Strategy ID is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    // Check if this is a natural language enhancement
    if (body.naturalLanguageDefinition) {
      // Natural language enhancement
      const result = await strategyIngestionService.enhanceStrategy(id, body.naturalLanguageDefinition);
      
      return new Response(JSON.stringify(result), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    } else {
      // Direct update
      const strategy = await strategyService.updateStrategy(id, {
        name: body.name,
        description: body.description,
        status: body.status,
        strategy_type: body.strategy_type,
        is_public: body.is_public,
        code: body.code,
        entry_conditions: body.entry_conditions,
        exit_conditions: body.exit_conditions,
        risk_management: body.risk_management,
        parameters: body.parameters,
        performance_metrics: body.performance_metrics,
        tags: body.tags
      });
      
      return new Response(JSON.stringify(strategy), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  } catch (error) {
    console.error('Error updating strategy:', error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

/**
 * Handler for DELETE /api/strategies
 * Deletes a strategy
 */
export async function DELETE(request: Request) {
  try {
    // Get query parameters
    const url = new URL(request.url);
    const id = url.searchParams.get('id');
    
    if (!id) {
      return new Response(JSON.stringify({ error: 'Strategy ID is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    await strategyService.deleteStrategy(id);
    
    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Error deleting strategy:', error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
} 