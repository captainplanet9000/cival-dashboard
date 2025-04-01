import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database.types';

export interface Farm {
  id: string;
  name: string;
  description: string | null;
  owner_id: string;
  goal: string | null;
  risk_level: 'low' | 'medium' | 'high';
  status: 'active' | 'paused' | 'stopped';
  performance_metrics: {
    win_rate?: number;
    profit_factor?: number;
    total_profit_loss?: number;
    trades_count?: number;
    [key: string]: any;
  };
  created_at: string;
  updated_at: string;
}

export interface FarmWallet {
  id: string;
  farm_id: string;
  name: string;
  address: string;
  chain_id: number;
  token_balances: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface FarmAgent {
  id: string;
  farm_id: string;
  name: string;
  role: string;
  status: 'active' | 'inactive' | 'error';
  config: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface ApiResponse<T = any> {
  data?: T;
  error?: string;
}

export const farmService = {
  /**
   * Get a list of farms for the current user
   */
  async getFarms(): Promise<ApiResponse<Farm[]>> {
    try {
      const response = await fetch('https://mcp.composio.dev/supabase/ancient-brash-planet-yjteSe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tool: 'run_query',
          params: {
            table: 'farms',
            select: '*',
            order: 'created_at.desc'
          }
        })
      });
      
      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch farms');
      }
      
      return { data: result.data };
    } catch (error) {
      console.error('Error fetching farms:', error);
      return { error: error instanceof Error ? error.message : 'Unknown error occurred' };
    }
  },

  /**
   * Get a specific farm by ID
   */
  async getFarmById(farmId: string): Promise<ApiResponse<Farm>> {
    try {
      const response = await fetch('https://mcp.composio.dev/supabase/ancient-brash-planet-yjteSe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tool: 'run_query',
          params: {
            table: 'farms',
            select: '*',
            where: { id: farmId }
          }
        })
      });
      
      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch farm');
      }
      
      if (!result.data || result.data.length === 0) {
        return { error: 'Farm not found' };
      }
      
      return { data: result.data[0] };
    } catch (error) {
      console.error('Error fetching farm:', error);
      return { error: error instanceof Error ? error.message : 'Unknown error occurred' };
    }
  },

  /**
   * Create a new farm
   */
  async createFarm(farmData: Omit<Farm, 'id' | 'created_at' | 'updated_at'>): Promise<ApiResponse<Farm>> {
    try {
      const response = await fetch('https://mcp.composio.dev/supabase/ancient-brash-planet-yjteSe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tool: 'insert_record',
          params: {
            table: 'farms',
            data: farmData,
            returning: '*'
          }
        })
      });
      
      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to create farm');
      }
      
      return { data: result.data };
    } catch (error) {
      console.error('Error creating farm:', error);
      return { error: error instanceof Error ? error.message : 'Unknown error occurred' };
    }
  },

  /**
   * Update an existing farm
   */
  async updateFarm(farmId: string, farmData: Partial<Omit<Farm, 'id' | 'created_at' | 'updated_at'>>): Promise<ApiResponse<Farm>> {
    try {
      const response = await fetch('https://mcp.composio.dev/supabase/ancient-brash-planet-yjteSe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tool: 'update_record',
          params: {
            table: 'farms',
            data: farmData,
            where: { id: farmId },
            returning: '*'
          }
        })
      });
      
      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to update farm');
      }
      
      return { data: result.data };
    } catch (error) {
      console.error('Error updating farm:', error);
      return { error: error instanceof Error ? error.message : 'Unknown error occurred' };
    }
  },

  /**
   * Delete a farm
   */
  async deleteFarm(farmId: string): Promise<ApiResponse<void>> {
    try {
      const response = await fetch('https://mcp.composio.dev/supabase/ancient-brash-planet-yjteSe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tool: 'delete_record',
          params: {
            table: 'farms',
            where: { id: farmId }
          }
        })
      });
      
      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to delete farm');
      }
      
      return { data: undefined };
    } catch (error) {
      console.error('Error deleting farm:', error);
      return { error: error instanceof Error ? error.message : 'Unknown error occurred' };
    }
  },

  /**
   * Get farm wallets
   */
  async getFarmWallets(farmId: string): Promise<ApiResponse<FarmWallet[]>> {
    try {
      const response = await fetch('https://mcp.composio.dev/supabase/ancient-brash-planet-yjteSe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tool: 'run_query',
          params: {
            table: 'farm_wallets',
            select: '*',
            where: { farm_id: farmId },
            order: 'created_at.desc'
          }
        })
      });
      
      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch farm wallets');
      }
      
      return { data: result.data };
    } catch (error) {
      console.error('Error fetching farm wallets:', error);
      return { error: error instanceof Error ? error.message : 'Unknown error occurred' };
    }
  },

  /**
   * Create a farm wallet
   */
  async createFarmWallet(walletData: Omit<FarmWallet, 'id' | 'created_at' | 'updated_at'>): Promise<ApiResponse<FarmWallet>> {
    try {
      const response = await fetch('https://mcp.composio.dev/supabase/ancient-brash-planet-yjteSe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tool: 'insert_record',
          params: {
            table: 'farm_wallets',
            data: walletData,
            returning: '*'
          }
        })
      });
      
      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to create farm wallet');
      }
      
      return { data: result.data };
    } catch (error) {
      console.error('Error creating farm wallet:', error);
      return { error: error instanceof Error ? error.message : 'Unknown error occurred' };
    }
  },

  /**
   * Get farm agents
   */
  async getFarmAgents(farmId: string): Promise<ApiResponse<FarmAgent[]>> {
    try {
      const response = await fetch('https://mcp.composio.dev/supabase/ancient-brash-planet-yjteSe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tool: 'run_query',
          params: {
            table: 'farm_agents',
            select: '*',
            where: { farm_id: farmId },
            order: 'created_at.desc'
          }
        })
      });
      
      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch farm agents');
      }
      
      return { data: result.data };
    } catch (error) {
      console.error('Error fetching farm agents:', error);
      return { error: error instanceof Error ? error.message : 'Unknown error occurred' };
    }
  },

  /**
   * Create a farm agent
   */
  async createFarmAgent(agentData: Omit<FarmAgent, 'id' | 'created_at' | 'updated_at'>): Promise<ApiResponse<FarmAgent>> {
    try {
      const response = await fetch('https://mcp.composio.dev/supabase/ancient-brash-planet-yjteSe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tool: 'insert_record',
          params: {
            table: 'farm_agents',
            data: agentData,
            returning: '*'
          }
        })
      });
      
      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to create farm agent');
      }
      
      return { data: result.data };
    } catch (error) {
      console.error('Error creating farm agent:', error);
      return { error: error instanceof Error ? error.message : 'Unknown error occurred' };
    }
  },

  /**
   * Update farm agent status
   */
  async updateAgentStatus(agentId: string, status: 'active' | 'inactive' | 'error'): Promise<ApiResponse<FarmAgent>> {
    try {
      const response = await fetch('https://mcp.composio.dev/supabase/ancient-brash-planet-yjteSe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tool: 'update_record',
          params: {
            table: 'farm_agents',
            data: { status },
            where: { id: agentId },
            returning: '*'
          }
        })
      });
      
      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to update agent status');
      }
      
      return { data: result.data };
    } catch (error) {
      console.error('Error updating agent status:', error);
      return { error: error instanceof Error ? error.message : 'Unknown error occurred' };
    }
  },

  /**
   * Get farm performance metrics
   */
  async getFarmPerformance(farmId: string): Promise<ApiResponse<Farm['performance_metrics']>> {
    try {
      const response = await fetch('https://mcp.composio.dev/supabase/ancient-brash-planet-yjteSe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tool: 'run_query',
          params: {
            table: 'farms',
            select: 'performance_metrics',
            where: { id: farmId }
          }
        })
      });
      
      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch farm performance');
      }
      
      if (!result.data || result.data.length === 0) {
        return { error: 'Farm not found' };
      }
      
      return { data: result.data[0].performance_metrics };
    } catch (error) {
      console.error('Error fetching farm performance:', error);
      return { error: error instanceof Error ? error.message : 'Unknown error occurred' };
    }
  },

  /**
   * Update farm performance metrics
   */
  async updateFarmPerformance(farmId: string, metrics: Farm['performance_metrics']): Promise<ApiResponse<Farm>> {
    try {
      const response = await fetch('https://mcp.composio.dev/supabase/ancient-brash-planet-yjteSe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tool: 'update_record',
          params: {
            table: 'farms',
            data: { performance_metrics: metrics },
            where: { id: farmId },
            returning: '*'
          }
        })
      });
      
      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to update farm performance');
      }
      
      return { data: result.data };
    } catch (error) {
      console.error('Error updating farm performance:', error);
      return { error: error instanceof Error ? error.message : 'Unknown error occurred' };
    }
  }
}; 