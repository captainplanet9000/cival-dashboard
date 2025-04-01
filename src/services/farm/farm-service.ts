import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database.types';

export interface CreateFarmParams {
  name: string;
  description?: string;
  ownerId: string;
  goal: string;
  riskLevel: 'low' | 'medium' | 'high';
}

export interface CreateFarmWalletParams {
  farmId: string;
  name: string;
  address: string;
  chainId: number;
}

export interface CreateFarmAgentParams {
  farmId: string;
  name: string;
  role: 'trader' | 'risk_manager' | 'analyst';
  config: Record<string, any>;
}

export interface AssignWalletToAgentParams {
  agentId: string;
  farmWalletId: string;
  allocation: number;
  permissions: string[];
}

export class FarmService {
  private supabase;

  constructor(supabaseUrl: string, supabaseKey: string) {
    this.supabase = createClient<Database>(supabaseUrl, supabaseKey);
  }

  async createFarm(params: CreateFarmParams) {
    try {
      const { data: farm, error } = await this.supabase
        .from('farms')
        .insert({
          name: params.name,
          description: params.description,
          owner_id: params.ownerId,
          goal: params.goal,
          risk_level: params.riskLevel,
          status: 'active',
          performance_metrics: null
        })
        .select()
        .single();

      if (error) throw error;
      return { success: true, data: farm };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Failed to create farm'
      };
    }
  }

  async createFarmWallet(params: CreateFarmWalletParams) {
    try {
      const { data: wallet, error } = await this.supabase
        .from('farm_wallets')
        .insert({
          farm_id: params.farmId,
          name: params.name,
          address: params.address,
          chain_id: params.chainId,
          balance: 0,
          token_balances: {},
          status: 'active'
        })
        .select()
        .single();

      if (error) throw error;
      return { success: true, data: wallet };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Failed to create farm wallet'
      };
    }
  }

  async createFarmAgent(params: CreateFarmAgentParams) {
    try {
      const { data: agent, error } = await this.supabase
        .from('farm_agents')
        .insert({
          farm_id: params.farmId,
          name: params.name,
          role: params.role,
          config: params.config,
          status: 'inactive',
          performance_metrics: null
        })
        .select()
        .single();

      if (error) throw error;
      return { success: true, data: agent };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Failed to create farm agent'
      };
    }
  }

  async assignWalletToAgent(params: AssignWalletToAgentParams) {
    try {
      const { data: assignment, error } = await this.supabase
        .from('agent_wallets')
        .insert({
          agent_id: params.agentId,
          farm_wallet_id: params.farmWalletId,
          allocation: params.allocation,
          permissions: params.permissions
        })
        .select()
        .single();

      if (error) throw error;
      return { success: true, data: assignment };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Failed to assign wallet to agent'
      };
    }
  }

  async getFarm(farmId: string) {
    try {
      const { data: farm, error } = await this.supabase
        .from('farms')
        .select(`
          *,
          farm_wallets (*),
          farm_agents (
            *,
            agent_wallets (
              *,
              farm_wallet:farm_wallets(*)
            ),
            agent_tools (*),
            agent_apis (*)
          )
        `)
        .eq('id', farmId)
        .single();

      if (error) throw error;
      if (!farm) return { success: false, error: 'Farm not found' };

      return { success: true, data: farm };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Failed to fetch farm'
      };
    }
  }

  async updateFarmStatus(farmId: string, status: 'active' | 'paused' | 'stopped') {
    try {
      const { error } = await this.supabase
        .from('farms')
        .update({ status })
        .eq('id', farmId);

      if (error) throw error;
      return { success: true };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Failed to update farm status'
      };
    }
  }

  async deleteFarm(farmId: string) {
    try {
      // This will cascade delete all related records due to foreign key constraints
      const { error } = await this.supabase
        .from('farms')
        .delete()
        .eq('id', farmId);

      if (error) throw error;
      return { success: true };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Failed to delete farm'
      };
    }
  }
} 