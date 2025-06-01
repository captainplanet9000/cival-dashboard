/**
 * Mock Farm Handlers
 * Provides mock API handlers for farm-related endpoints
 */
import { mockFarmManager } from './mocks-farm';
import { MockFarm, FarmStatusSummary } from './mocks-farm';

export const mockFarmHandlers = {
  /**
   * Get all farms
   */
  handleGetFarms: async (req: Request): Promise<Response> => {
    let url = new URL(req.url);
    const userId = url.searchParams.get('user_id');
    
    let farms = [];
    if (userId) {
      farms = mockFarmManager.getFarmsByOwnerId(userId);
    } else {
      farms = mockFarmManager.getAllFarms();
    }
    
    return new Response(
      JSON.stringify({
        data: farms
      }),
      { status: 200 }
    );
  },

  /**
   * Get a single farm by ID
   */
  handleGetFarm: async (req: Request): Promise<Response> => {
    // Get farm ID from the URL path
    // URL path format: /rest/v1/farms?id=eq.{farmId}
    const url = new URL(req.url);
    const farmIdParam = url.searchParams.get('id');
    
    if (!farmIdParam || !farmIdParam.startsWith('eq.')) {
      return new Response(
        JSON.stringify({ error: 'Invalid farm ID format' }),
        { status: 400 }
      );
    }
    
    const farmId = farmIdParam.substring(3); // Remove 'eq.' prefix
    const farm = mockFarmManager.getFarmById(farmId);
    
    if (!farm) {
      return new Response(
        JSON.stringify({ error: 'Farm not found' }),
        { status: 404 }
      );
    }
    
    return new Response(
      JSON.stringify({
        data: [farm]
      }),
      { status: 200 }
    );
  },

  /**
   * Create a new farm
   */
  handleCreateFarm: async (req: Request): Promise<Response> => {
    try {
      const body = await req.json();
      const newFarm = mockFarmManager.createFarm(body);
      
      return new Response(
        JSON.stringify({
          data: newFarm
        }),
        { status: 201 }
      );
    } catch (error) {
      return new Response(
        JSON.stringify({ error: 'Failed to create farm' }),
        { status: 400 }
      );
    }
  },

  /**
   * Update an existing farm
   */
  handleUpdateFarm: async (req: Request): Promise<Response> => {
    try {
      // Get farm ID from the URL path
      // URL path format: /rest/v1/farms?id=eq.{farmId}
      const url = new URL(req.url);
      const farmIdParam = url.searchParams.get('id');
      
      if (!farmIdParam || !farmIdParam.startsWith('eq.')) {
        return new Response(
          JSON.stringify({ error: 'Invalid farm ID format' }),
          { status: 400 }
        );
      }
      
      const farmId = farmIdParam.substring(3); // Remove 'eq.' prefix
      const body = await req.json();
      
      const updatedFarm = mockFarmManager.updateFarm(farmId, body);
      
      if (!updatedFarm) {
        return new Response(
          JSON.stringify({ error: 'Farm not found' }),
          { status: 404 }
        );
      }
      
      return new Response(
        JSON.stringify({
          data: updatedFarm
        }),
        { status: 200 }
      );
    } catch (error) {
      return new Response(
        JSON.stringify({ error: 'Failed to update farm' }),
        { status: 400 }
      );
    }
  },

  /**
   * Delete a farm
   */
  handleDeleteFarm: async (req: Request): Promise<Response> => {
    // Get farm ID from the URL path
    // URL path format: /rest/v1/farms?id=eq.{farmId}
    const url = new URL(req.url);
    const farmIdParam = url.searchParams.get('id');
    
    if (!farmIdParam || !farmIdParam.startsWith('eq.')) {
      return new Response(
        JSON.stringify({ error: 'Invalid farm ID format' }),
        { status: 400 }
      );
    }
    
    const farmId = farmIdParam.substring(3); // Remove 'eq.' prefix
    const success = mockFarmManager.deleteFarm(farmId);
    
    if (!success) {
      return new Response(
        JSON.stringify({ error: 'Farm not found or could not be deleted' }),
        { status: 404 }
      );
    }
    
    return new Response(
      JSON.stringify({
        data: { success: true }
      }),
      { status: 200 }
    );
  },

  /**
   * Get farm status summary
   */
  handleGetFarmStatusSummary: async (req: Request): Promise<Response> => {
    // Get farm ID from the URL path
    // URL path format: /farms/{farmId}/status
    const url = new URL(req.url);
    const pathParts = url.pathname.split('/');
    const farmId = pathParts[2]; // Assumes format /farms/{farmId}/status
    
    const statusSummary = mockFarmManager.getFarmStatusSummary(farmId);
    
    if (!statusSummary) {
      return new Response(
        JSON.stringify({ error: 'Farm not found' }),
        { status: 404 }
      );
    }
    
    return new Response(
      JSON.stringify({
        data: statusSummary
      }),
      { status: 200 }
    );
  },

  /**
   * Get farm agents
   */
  handleGetFarmAgents: async (req: Request): Promise<Response> => {
    // Get farm ID from the URL path
    // URL path format: /farms/{farmId}/agents
    const url = new URL(req.url);
    const pathParts = url.pathname.split('/');
    const farmId = pathParts[2]; // Assumes format /farms/{farmId}/agents
    
    const agents = mockFarmManager.getAgents(farmId);
    
    if (!agents) {
      return new Response(
        JSON.stringify({ error: 'Farm not found' }),
        { status: 404 }
      );
    }
    
    return new Response(
      JSON.stringify({
        data: agents
      }),
      { status: 200 }
    );
  },

  /**
   * Get ElizaOS agents for a farm
   */
  handleGetFarmElizaAgents: async (req: Request): Promise<Response> => {
    // Get farm ID from the URL path
    // URL path format: /farms/{farmId}/eliza-agents
    const url = new URL(req.url);
    const pathParts = url.pathname.split('/');
    const farmId = pathParts[2]; // Assumes format /farms/{farmId}/eliza-agents
    
    const elizaAgents = mockFarmManager.getElizaAgents(farmId);
    
    if (!elizaAgents) {
      return new Response(
        JSON.stringify({ error: 'Farm not found' }),
        { status: 404 }
      );
    }
    
    return new Response(
      JSON.stringify({
        data: elizaAgents
      }),
      { status: 200 }
    );
  }
};
