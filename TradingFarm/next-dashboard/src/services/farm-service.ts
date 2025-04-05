/**
 * Farm Service
 * Handles all farm-related API interactions with Supabase
 */

import { createBrowserClient } from "@/utils/supabase/client";
import { createServerClient } from "@/utils/supabase/server";
// Import only what's needed from mocks-farm to avoid type conflicts
import { mockFarmManager, FarmStatusSummary } from '@/utils/supabase/mocks-farm';

// Helper to determine API URL
const getApiUrl = (path: string): string => {
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || '';
  return `${baseUrl}/api/${path}`;
};

// API response types
export interface ApiResponse<T> {
  data?: T;
  error?: string;
}

// Define the Farm interface (should match the Supabase schema)
export interface Farm {
  id: string; 
  name: string;
  description?: string | null;
  user_id?: string | null;
  created_at: string;
  updated_at: string;
  agents_count?: number;
  agents?: any; 
  status?: string;
  exchange?: string;
  api_keys?: any;
  config?: any;
  elizaos_agents?: any;
  status_summary?: FarmStatusSummary;
  performance_metrics?: {
    win_rate?: number;
    profit_factor?: number;
    sharpe_ratio?: number;
    max_drawdown?: number;
  };
}

// Check if we should use mock mode
const isMockModeEnabled = () => {
  return typeof window !== 'undefined' && 
    (window.location.search.includes('mock=true') || 
     process.env.NEXT_PUBLIC_FORCE_MOCK_MODE === 'true' ||
     process.env.NEXT_PUBLIC_MOCK_API_ENABLED === 'true' ||
     process.env.NEXT_PUBLIC_DEMO_MODE === 'true');
};

// Extended Farm type with additional fields needed for UI
interface ExtendedFarm extends Farm {
  // Additional properties for UI needs
  configuration?: Record<string, any>;
  is_active?: boolean;
}

/**
 * Farm creation request type 
 */
interface FarmCreationRequest {
  name: string;
  description?: string;
  exchange?: string;
  status?: string;
  api_keys?: Record<string, any>;
  config?: Record<string, any>;
}

// Farm service
export const farmService = {
  /**
   * Get all farms for the current user
   */
  async getFarms(): Promise<ApiResponse<Farm[]>> {
    try {
      // Check for mock mode
      if (isMockModeEnabled()) {
        // Initialize the farm manager if needed
        mockFarmManager.initialize();
        // Return farms from the persistent mockFarmManager
        return { data: mockFarmManager.getAllFarms() };
      }

      // Check if we have an API URL set
      const apiUrl = getApiUrl('farms');
      if (apiUrl.startsWith('/api/')) {
        // Fallback to Supabase
        const supabase = createBrowserClient();
        const { data, error } = await supabase
          .from('farms')
          .select('*');
          
        if (error) {
          return { error: error.message };
        }
        
        return { data: data || [] };
      }
      
      // Use API endpoint
      const response = await fetch(apiUrl, {
        headers: {
          'Content-Type': 'application/json',
          // Add authentication headers if needed
        }
      });
      
      if (!response.ok) {
        return { error: `API Error: ${response.status} ${response.statusText}` };
      }
      
      const result = await response.json();
      return { data: result.data };
      
    } catch (error) {
      console.error('Error fetching farms:', error);
      return { error: error instanceof Error ? error.message : 'Unknown error occurred' };
    }
  },

  /**
   * Get farms for server components
   */
  async getFarmsServer(): Promise<ApiResponse<Farm[]>> {
    try {
      // Server can't rely on browser features, must use Supabase
      const supabase = await createServerClient();
      const { data, error } = await supabase
        .from('farms')
        .select('*');
        
      if (error) {
        throw new Error(error.message);
      }
      
      return { data: data || [] };
      
    } catch (error) {
      console.error('Error fetching farms on server:', error);
      return { error: error instanceof Error ? error.message : 'Unknown error occurred' };
    }
  },

  /**
   * Get a specific farm by ID
   */
  async getFarmById(id: string): Promise<ApiResponse<Farm>> {
    try {
      // Check for mock mode
      if (isMockModeEnabled()) {
        // Initialize the farm manager if needed
        mockFarmManager.initialize();
        // Get farm from the persistent mockFarmManager
        const farm = mockFarmManager.getFarmById(id);
        
        if (!farm) {
          return { error: 'Farm not found' };
        }
        
        return { data: farm };
      }
      
      // Check if we have an API URL set
      const apiUrl = getApiUrl(`farms/${id}`);
      if (apiUrl.startsWith('/api/')) {
        // Fallback to Supabase
        const supabase = createBrowserClient();
        const { data, error } = await supabase
          .from('farms')
          .select('*')
          .eq('id', id)
          .single();
          
        if (error) {
          return { error: error.message };
        }
        
        return { data };
      }
      
      // Use API endpoint
      const response = await fetch(apiUrl);
      
      if (!response.ok) {
        return { error: `API Error: ${response.status} ${response.statusText}` };
      }
      
      const result = await response.json();
      return { data: result.data };
      
    } catch (error) {
      console.error('Error fetching farm by ID:', error);
      return { error: error instanceof Error ? error.message : 'Unknown error occurred' };
    }
  },

  /**
   * Get a specific farm by ID for server components
   */
  async getFarmByIdServer(id: string): Promise<ApiResponse<Farm>> {
    try {
      // Server can't rely on browser features, must use Supabase
      const supabase = await createServerClient();
      const { data, error } = await supabase
        .from('farms')
        .select('*')
        .eq('id', id)
        .single();
        
      if (error) {
        throw new Error(error.message);
      }
      
      return { data };
      
    } catch (error) {
      console.error('Error fetching farm by ID on server:', error);
      return { error: error instanceof Error ? error.message : 'Unknown error occurred' };
    }
  },

  /**
   * Create a new farm
   */
  async createFarm(farmData: FarmCreationRequest): Promise<ApiResponse<ExtendedFarm>> {
    try {
      // Check for mock mode
      if (isMockModeEnabled()) {
        // Initialize the farm manager if needed
        mockFarmManager.initialize();
        
        // Create a new farm using the mockFarmManager
        const newFarm = mockFarmManager.createFarm({
          ...farmData,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          user_id: 'mock-user-id',
          status: farmData.status || 'active'
        });
        
        return { data: newFarm as ExtendedFarm };
      }
      
      // Get user ID for the farm
      const supabase = createBrowserClient();
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData?.user?.id;
      
      if (!userId) {
        return { error: 'Authentication required to create a farm' };
      }
      
      // Check if we have an API URL set
      const apiUrl = getApiUrl('farms');
      if (apiUrl.startsWith('/api/')) {
        // Fallback to Supabase
        const { data, error } = await supabase
          .from('farms')
          .insert([{
            ...farmData,
            user_id: userId,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            status: farmData.status || 'active'
          }])
          .select()
          .single();
          
        if (error) {
          return { error: error.message };
        }
        
        return { data: data as ExtendedFarm };
      }
      
      // Use API endpoint
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          // Add authentication headers if needed
        },
        body: JSON.stringify({
          ...farmData,
          user_id: userId
        })
      });
      
      if (!response.ok) {
        return { error: `API Error: ${response.status} ${response.statusText}` };
      }
      
      const result = await response.json();
      return { data: result.data };
      
    } catch (error) {
      console.error('Error creating farm:', error);
      return { error: error instanceof Error ? error.message : 'Unknown error occurred' };
    }
  },

  /**
   * Update an existing farm
   */
  async updateFarm(id: string, farmData: Partial<Omit<Farm, 'id' | 'created_at' | 'updated_at'>>): Promise<ApiResponse<Farm>> {
    try {
      // Check for mock mode
      if (isMockModeEnabled()) {
        // Initialize the farm manager if needed
        mockFarmManager.initialize();
        
        // Update the farm in mockFarmManager
        const updatedFarm = mockFarmManager.updateFarm(id, {
          ...farmData,
          updated_at: new Date().toISOString()
        });
        
        if (!updatedFarm) {
          return { error: 'Farm not found' };
        }
        
        return { data: updatedFarm };
      }
      
      // Check if we have an API URL set
      const apiUrl = getApiUrl(`farms/${id}`);
      if (apiUrl.startsWith('/api/')) {
        // Fallback to Supabase
        const supabase = createBrowserClient();
        const { data, error } = await supabase
          .from('farms')
          .update({
            ...farmData,
            updated_at: new Date().toISOString()
          })
          .eq('id', id)
          .select()
          .single();
          
        if (error) {
          return { error: error.message };
        }
        
        return { data };
      }
      
      // Use API endpoint
      const response = await fetch(apiUrl, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          // Add authentication headers if needed
        },
        body: JSON.stringify(farmData)
      });
      
      if (!response.ok) {
        return { error: `API Error: ${response.status} ${response.statusText}` };
      }
      
      const result = await response.json();
      return { data: result.data };
      
    } catch (error) {
      console.error('Error updating farm:', error);
      return { error: error instanceof Error ? error.message : 'Unknown error occurred' };
    }
  },

  /**
   * Delete a farm
   */
  async deleteFarm(id: string): Promise<ApiResponse<null>> {
    try {
      // Check for mock mode
      if (isMockModeEnabled()) {
        // Initialize the farm manager if needed
        mockFarmManager.initialize();
        
        // Delete the farm from mockFarmManager
        const success = mockFarmManager.deleteFarm(id);
        
        if (!success) {
          return { error: 'Farm not found or could not be deleted' };
        }
        
        return { data: null };
      }
      
      // Check if we have an API URL set
      const apiUrl = getApiUrl(`farms/${id}`);
      if (apiUrl.startsWith('/api/')) {
        // Fallback to Supabase
        const supabase = createBrowserClient();
        const { error } = await supabase
          .from('farms')
          .delete()
          .eq('id', id);
          
        if (error) {
          return { error: error.message };
        }
        
        return { data: null };
      }
      
      // Use API endpoint
      const response = await fetch(apiUrl, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          // Add authentication headers if needed
        }
      });
      
      if (!response.ok) {
        return { error: `API Error: ${response.status} ${response.statusText}` };
      }
      
      return { data: null };
      
    } catch (error) {
      console.error('Error deleting farm:', error);
      return { error: error instanceof Error ? error.message : 'Unknown error occurred' };
    }
  },

  /**
   * Get a summary of a farm's status including goals and agents
   */
  async getFarmStatusSummary(farmId: string): Promise<ApiResponse<FarmStatusSummary>> {
    try {
      // Check for mock mode
      if (isMockModeEnabled()) {
        // Initialize the farm manager if needed
        mockFarmManager.initialize();
        
        // Get farm status summary from mockFarmManager
        const statusSummary = mockFarmManager.getFarmStatusSummary(farmId);
        
        if (!statusSummary) {
          return { error: 'Farm not found' };
        }
        
        return { data: statusSummary };
      }
      
      // Check if we have an API URL set
      const apiUrl = getApiUrl(`farms/${farmId}/status-summary`);
      if (apiUrl.startsWith('/api/')) {
        // Fallback to Supabase
        const supabase = createBrowserClient();
        const { data, error } = await supabase
          .from('farms')
          .select('status_summary')
          .eq('id', farmId)
          .single();
          
        if (error) {
          return { error: error.message };
        }
        
        return { data: data.status_summary };
      }
      
      // Use API endpoint
      const response = await fetch(apiUrl);
      
      if (!response.ok) {
        return { error: `API Error: ${response.status} ${response.statusText}` };
      }
      
      const result = await response.json();
      return { data: result.data };
      
    } catch (error) {
      console.error('Error fetching farm status summary:', error);
      return { error: error instanceof Error ? error.message : 'Unknown error occurred' };
    }
  },

  /**
   * Update the farm's status summary (typically done automatically by the database)
   */
  async refreshFarmStatusSummary(farmId: string): Promise<ApiResponse<FarmStatusSummary>> {
    try {
      // Check for mock mode
      if (isMockModeEnabled()) {
        // Initialize the farm manager if needed
        mockFarmManager.initialize();
        
        // Refresh farm status summary in mockFarmManager
        const statusSummary = mockFarmManager.refreshFarmStatusSummary(farmId);
        
        if (!statusSummary) {
          return { error: 'Farm not found' };
        }
        
        return { data: statusSummary };
      }
      
      // Check if we have an API URL set
      const apiUrl = getApiUrl(`farms/${farmId}/refresh-status`);
      if (apiUrl.startsWith('/api/')) {
        // Fallback to Supabase
        const supabase = createBrowserClient();
        const { data, error } = await supabase
          .from('farms')
          .update({
            status_summary: {
              goals_total: 0,
              goals_completed: 0,
              goals_in_progress: 0,
              goals_not_started: 0,
              goals_cancelled: 0,
              agents_total: 0,
              agents_active: 0,
              updated_at: new Date().toISOString()
            }
          })
          .eq('id', farmId)
          .select('status_summary')
          .single();
          
        if (error) {
          return { error: error.message };
        }
        
        return { data: data.status_summary };
      }
      
      // Use API endpoint
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          // Add authentication headers if needed
        }
      });
      
      if (!response.ok) {
        return { error: `API Error: ${response.status} ${response.statusText}` };
      }
      
      const result = await response.json();
      return { data: result.data };
      
    } catch (error) {
      console.error('Error refreshing farm status summary:', error);
      return { error: error instanceof Error ? error.message : 'Unknown error occurred' };
    }
  },

  /**
   * Assign a goal to an agent
   */
  async assignGoalToAgent(farmId: string, goalId: string, agentId: string, isElizaAgent: boolean = false): Promise<ApiResponse<null>> {
    try {
      // Check for mock mode
      if (isMockModeEnabled()) {
        // Initialize the farm manager if needed
        mockFarmManager.initialize();
        
        // Assign goal to agent in mockFarmManager
        const success = mockFarmManager.assignGoalToAgent(farmId, goalId, agentId, isElizaAgent);
        
        if (!success) {
          return { error: 'Farm or agent not found' };
        }
        
        return { data: null };
      }
      
      // Check if we have an API URL set
      const apiUrl = getApiUrl(`farms/${farmId}/assign-goal`);
      if (apiUrl.startsWith('/api/')) {
        // Fallback to Supabase
        const supabase = createBrowserClient();
        const table = isElizaAgent ? 'elizaos_agents' : 'agents';
        const { error } = await supabase
          .from(table)
          .update({ goal_id: goalId })
          .eq('id', agentId)
          .eq('farm_id', farmId);
          
        if (error) {
          return { error: error.message };
        }
        
        return { data: null };
      }
      
      // Use API endpoint
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          // Add authentication headers if needed
        },
        body: JSON.stringify({
          goal_id: goalId,
          agent_id: agentId,
          is_eliza_agent: isElizaAgent
        })
      });
      
      if (!response.ok) {
        return { error: `API Error: ${response.status} ${response.statusText}` };
      }
      
      return { data: null };
      
    } catch (error) {
      console.error('Error assigning goal to agent:', error);
      return { error: error instanceof Error ? error.message : 'Unknown error occurred' };
    }
  },

  /**
   * Unassign a goal from an agent
   */
  async unassignGoalFromAgent(farmId: string, agentId: string, isElizaAgent: boolean = false): Promise<ApiResponse<null>> {
    try {
      // Check for mock mode
      if (isMockModeEnabled()) {
        // Initialize the farm manager if needed
        mockFarmManager.initialize();
        
        // Unassign goal from agent in mockFarmManager
        const success = mockFarmManager.unassignGoalFromAgent(farmId, agentId, isElizaAgent);
        
        if (!success) {
          return { error: 'Farm or agent not found' };
        }
        
        return { data: null };
      }
      
      // Check if we have an API URL set
      const apiUrl = getApiUrl(`farms/${farmId}/unassign-goal`);
      if (apiUrl.startsWith('/api/')) {
        // Fallback to Supabase
        const supabase = createBrowserClient();
        const table = isElizaAgent ? 'elizaos_agents' : 'agents';
        const { error } = await supabase
          .from(table)
          .update({ goal_id: null })
          .eq('id', agentId)
          .eq('farm_id', farmId);
          
        if (error) {
          return { error: error.message };
        }
        
        return { data: null };
      }
      
      // Use API endpoint
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          // Add authentication headers if needed
        },
        body: JSON.stringify({
          agent_id: agentId,
          is_eliza_agent: isElizaAgent
        })
      });
      
      if (!response.ok) {
        return { error: `API Error: ${response.status} ${response.statusText}` };
      }
      
      return { data: null };
      
    } catch (error) {
      console.error('Error unassigning goal from agent:', error);
      return { error: error instanceof Error ? error.message : 'Unknown error occurred' };
    }
  },

  /**
   * Get all agents (both regular and ElizaOS) assigned to a goal
   */
  async getAgentsByGoal(farmId: string, goalId: string): Promise<ApiResponse<{ agents: any[], elizaAgents: any[] }>> {
    try {
      // Check for mock mode
      if (isMockModeEnabled()) {
        // Initialize the farm manager if needed
        mockFarmManager.initialize();
        
        // Get agents by goal from mockFarmManager
        const agents = mockFarmManager.getAgentsByGoal(farmId, goalId);
        
        if (!agents) {
          return { error: 'Farm or goal not found' };
        }
        
        return { data: agents };
      }
      
      // Check if we have an API URL set
      const apiUrl = getApiUrl(`farms/${farmId}/goals/${goalId}/agents`);
      if (apiUrl.startsWith('/api/')) {
        // Fallback to Supabase
        const supabase = createBrowserClient();
        const { data: agents, error: agentsError } = await supabase
          .from('agents')
          .select('*')
          .eq('farm_id', farmId)
          .eq('goal_id', goalId);
          
        if (agentsError) {
          return { error: agentsError.message };
        }
        
        let elizaAgents = [];
        try {
          const { data: elizaData, error: elizaError } = await supabase
            .from('elizaos_agents')
            .select('*')
            .eq('farm_id', farmId)
            .eq('goal_id', goalId);
            
          if (!elizaError) {
            elizaAgents = elizaData || [];
          }
        } catch (e) {
          // Table might not exist, so just continue
          console.warn('Could not fetch ElizaOS agents, table might not exist:', e);
        }
        
        return { 
          data: { 
            agents: agents || [],
            elizaAgents
          } 
        };
      }
      
      // Use API endpoint
      const response = await fetch(apiUrl);
      
      if (!response.ok) {
        return { error: `API Error: ${response.status} ${response.statusText}` };
      }
      
      const result = await response.json();
      return { data: result.data };
      
    } catch (error) {
      console.error('Error fetching agents by goal:', error);
      return { error: error instanceof Error ? error.message : 'Unknown error occurred' };
    }
  },

  /**
   * Count agents by farm ID (both regular and ElizaOS agents)
   */
  async countAgentsByFarm(farmId: string): Promise<ApiResponse<{ total: number, active: number, elizaTotal: number, elizaActive: number }>> {
    try {
      // Check for mock mode
      if (isMockModeEnabled()) {
        // Initialize the farm manager if needed
        mockFarmManager.initialize();
        
        // Count agents by farm in mockFarmManager
        const counts = mockFarmManager.countAgentsByFarm(farmId);
        
        if (!counts) {
          return { error: 'Farm not found' };
        }
        
        return { data: counts };
      }
      
      // Check if we have an API URL set
      const apiUrl = getApiUrl(`farms/${farmId}/agents/count`);
      if (apiUrl.startsWith('/api/')) {
        // Fallback to Supabase
        const supabase = createBrowserClient();
        const { count: totalAgents, error: agentsError } = await supabase
          .from('agents')
          .select('*', { count: 'exact', head: true })
          .eq('farm_id', farmId);
          
        if (agentsError) {
          return { error: agentsError.message };
        }
        
        const { count: activeAgents, error: activeError } = await supabase
          .from('agents')
          .select('*', { count: 'exact', head: true })
          .eq('farm_id', farmId)
          .eq('is_active', true);
          
        if (activeError) {
          return { error: activeError.message };
        }
        
        let elizaTotal = 0;
        let elizaActive = 0;
        
        try {
          const { count: elizaTotalCount, error: elizaError } = await supabase
            .from('elizaos_agents')
            .select('*', { count: 'exact', head: true })
            .eq('farm_id', farmId);
            
          if (!elizaError && elizaTotalCount !== null) {
            elizaTotal = elizaTotalCount;
            
            const { count: elizaActiveCount } = await supabase
              .from('elizaos_agents')
              .select('*', { count: 'exact', head: true })
              .eq('farm_id', farmId)
              .eq('status', 'active');
              
            elizaActive = elizaActiveCount || 0;
          }
        } catch (e) {
          // Table might not exist, so just continue with zeros
          console.warn('Could not count ElizaOS agents, table might not exist:', e);
        }
        
        return { 
          data: { 
            total: totalAgents || 0, 
            active: activeAgents || 0,
            elizaTotal,
            elizaActive
          } 
        };
      }
      
      // Use API endpoint
      const response = await fetch(apiUrl);
      
      if (!response.ok) {
        return { error: `API Error: ${response.status} ${response.statusText}` };
      }
      
      const result = await response.json();
      return { data: result.data };
      
    } catch (error) {
      console.error('Error counting agents by farm:', error);
      return { error: error instanceof Error ? error.message : 'Unknown error occurred' };
    }
  },

  /**
   * Get all standard agents for a farm
   */
  async getAgents(farmId: string): Promise<ApiResponse<any[]>> {
    try {
      // Check for mock mode
      if (isMockModeEnabled()) {
        // Initialize the farm manager if needed
        mockFarmManager.initialize();
        
        // Get agents from mockFarmManager
        const agents = mockFarmManager.getAgents(farmId);
        
        if (!agents) {
          return { error: 'Farm not found' };
        }
        
        return { data: agents };
      }
      
      // Check if we have an API URL set
      const apiUrl = getApiUrl(`farms/${farmId}/agents`);
      if (apiUrl.startsWith('/api/')) {
        // Fallback to Supabase
        const supabase = createBrowserClient();
        const { data, error } = await supabase
          .from('agents')
          .select('*')
          .eq('farm_id', farmId);
          
        if (error) {
          return { error: error.message };
        }
        
        return { data: data || [] };
      }
      
      // Use API endpoint
      const response = await fetch(apiUrl);
      
      if (!response.ok) {
        return { error: `API Error: ${response.status} ${response.statusText}` };
      }
      
      const result = await response.json();
      return { data: result.data };
      
    } catch (error) {
      console.error('Error fetching agents for farm:', error);
      return { error: error instanceof Error ? error.message : 'Unknown error occurred' };
    }
  },

  /**
   * Get all ElizaOS agents for a farm
   */
  async getElizaAgents(farmId: string): Promise<ApiResponse<any[]>> {
    try {
      // Check for mock mode
      if (isMockModeEnabled()) {
        // Initialize the farm manager if needed
        mockFarmManager.initialize();
        
        // Get ElizaOS agents from mockFarmManager
        const elizaAgents = mockFarmManager.getElizaAgents(farmId);
        
        if (!elizaAgents) {
          return { error: 'Farm not found' };
        }
        
        return { data: elizaAgents };
      }
      
      // Check if we have an API URL set
      const apiUrl = getApiUrl(`farms/${farmId}/elizaos-agents`);
      if (apiUrl.startsWith('/api/')) {
        // Fallback to Supabase
        const supabase = createBrowserClient();
        const { data, error } = await supabase
          .from('elizaos_agents')
          .select('*')
          .eq('farm_id', farmId);
          
        if (error) {
          return { error: error.message };
        }
        
        return { data: data || [] };
      }
      
      // Use API endpoint
      const response = await fetch(apiUrl);
      
      if (!response.ok) {
        return { error: `API Error: ${response.status} ${response.statusText}` };
      }
      
      const result = await response.json();
      return { data: result.data };
      
    } catch (error) {
      console.error('Error fetching ElizaOS agents for farm:', error);
      return { error: error instanceof Error ? error.message : 'Unknown error occurred' };
    }
  },
};
