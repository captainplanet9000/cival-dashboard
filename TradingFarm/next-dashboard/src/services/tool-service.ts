/**
 * Tool Service
 * Manages tools that can be equipped by agents in the Trading Farm
 */
import { createBrowserClient } from '@/utils/supabase/client';
import { createServerClient } from '@/utils/supabase/server';
import { Database } from '@/types/database.types';

// Types for tools
export interface AgentTool {
  id: string;
  name: string;
  description?: string | null;
  tool_type: string; // 'exchange', 'defi', 'analytics', 'llm', etc.
  config: Record<string, any>;
  is_enabled: boolean;
  created_at: string;
  updated_at: string;
}

export interface EquippedTool extends AgentTool {
  agent_id: string;
  equipped_id: string; // ID from the junction table
  custom_config: Record<string, any>; // Agent-specific configuration
  is_active: boolean;
}

export interface ApiResponse<T> {
  data?: T;
  error?: string;
}

/**
 * Tool service for managing agent tools
 */
export const toolService = {
  /**
   * Get all available tools
   */
  async getAvailableTools(): Promise<ApiResponse<AgentTool[]>> {
    try {
      const response = await fetch('/api/tools', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        cache: 'no-store',
      });
      
      if (!response.ok) {
        throw new Error(`Failed to fetch tools: ${response.statusText}`);
      }
      
      const result = await response.json();
      
      if (!result.tools || !Array.isArray(result.tools)) {
        return { error: 'Invalid response format' };
      }
      
      return { data: result.tools };
    } catch (error) {
      console.error('Error fetching available tools:', error);
      return { error: 'An unexpected error occurred' };
    }
  },

  /**
   * Get tools by type
   */
  async getToolsByType(toolType: string): Promise<ApiResponse<AgentTool[]>> {
    try {
      const response = await fetch(`/api/tools/type/${toolType}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        cache: 'no-store',
      });
      
      if (!response.ok) {
        throw new Error(`Failed to fetch ${toolType} tools: ${response.statusText}`);
      }
      
      const result = await response.json();
      
      if (!result.tools || !Array.isArray(result.tools)) {
        return { error: 'Invalid response format' };
      }
      
      return { data: result.tools };
    } catch (error) {
      console.error(`Error fetching ${toolType} tools:`, error);
      return { error: 'An unexpected error occurred' };
    }
  },

  /**
   * Get tools equipped by an agent
   */
  async getAgentTools(agentId: string): Promise<ApiResponse<EquippedTool[]>> {
    try {
      const response = await fetch(`/api/agents/${agentId}/tools`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        cache: 'no-store',
      });
      
      if (!response.ok) {
        throw new Error(`Failed to fetch agent tools: ${response.statusText}`);
      }
      
      const result = await response.json();
      
      if (!result.tools || !Array.isArray(result.tools)) {
        return { error: 'Invalid response format' };
      }
      
      return { data: result.tools };
    } catch (error) {
      console.error(`Error fetching tools for agent ${agentId}:`, error);
      return { error: 'An unexpected error occurred' };
    }
  },

  /**
   * Equip a tool to an agent
   */
  async equipTool(agentId: string, toolId: string, config: Record<string, any> = {}): Promise<ApiResponse<EquippedTool>> {
    try {
      const response = await fetch(`/api/agents/${agentId}/tools`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tool_id: toolId,
          config
        }),
        cache: 'no-store',
      });
      
      if (!response.ok) {
        throw new Error(`Failed to equip tool: ${response.statusText}`);
      }
      
      const result = await response.json();
      
      if (!result.tool) {
        return { error: 'Invalid response format' };
      }
      
      return { data: result.tool };
    } catch (error) {
      console.error(`Error equipping tool ${toolId} to agent ${agentId}:`, error);
      return { error: 'An unexpected error occurred' };
    }
  },

  /**
   * Unequip a tool from an agent
   */
  async unequipTool(agentId: string, equippedToolId: string): Promise<ApiResponse<null>> {
    try {
      const response = await fetch(`/api/agents/${agentId}/tools/${equippedToolId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        cache: 'no-store',
      });
      
      if (!response.ok) {
        throw new Error(`Failed to unequip tool: ${response.statusText}`);
      }
      
      return { data: null };
    } catch (error) {
      console.error(`Error unequipping tool ${equippedToolId} from agent ${agentId}:`, error);
      return { error: 'An unexpected error occurred' };
    }
  },

  /**
   * Configure a tool for an agent
   */
  async configureAgentTool(agentId: string, equippedToolId: string, config: Record<string, any>): Promise<ApiResponse<EquippedTool>> {
    try {
      const response = await fetch(`/api/agents/${agentId}/tools/${equippedToolId}/config`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ config }),
        cache: 'no-store',
      });
      
      if (!response.ok) {
        throw new Error(`Failed to configure tool: ${response.statusText}`);
      }
      
      const result = await response.json();
      
      if (!result.tool) {
        return { error: 'Invalid response format' };
      }
      
      return { data: result.tool };
    } catch (error) {
      console.error(`Error configuring tool ${equippedToolId} for agent ${agentId}:`, error);
      return { error: 'An unexpected error occurred' };
    }
  },

  /**
   * Toggle a tool's active status
   */
  async toggleToolActive(agentId: string, equippedToolId: string, isActive: boolean): Promise<ApiResponse<EquippedTool>> {
    try {
      const response = await fetch(`/api/agents/${agentId}/tools/${equippedToolId}/toggle`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ is_active: isActive }),
        cache: 'no-store',
      });
      
      if (!response.ok) {
        throw new Error(`Failed to toggle tool status: ${response.statusText}`);
      }
      
      const result = await response.json();
      
      if (!result.tool) {
        return { error: 'Invalid response format' };
      }
      
      return { data: result.tool };
    } catch (error) {
      console.error(`Error toggling tool ${equippedToolId} status for agent ${agentId}:`, error);
      return { error: 'An unexpected error occurred' };
    }
  }
};
