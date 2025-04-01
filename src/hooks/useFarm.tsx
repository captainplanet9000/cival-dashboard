import { useState, useEffect, useCallback } from 'react';
import { 
  farmService, 
  Farm, 
  FarmAgent, 
  Wallet, 
  EnrichedFarm,
  CreateFarmParams, 
  CreateAgentParams, 
  CreateWalletParams 
} from '@/services/farm/farm-service';
import { useRealtime } from './useRealtime';

interface UseFarmOptions {
  farmId?: string | number;
  userId?: string;
}

interface UseFarmReturn {
  farm: EnrichedFarm | null;
  farms: Farm[];
  agents: FarmAgent[];
  wallets: Wallet[];
  loading: boolean;
  error: string | null;
  createFarm: (params: CreateFarmParams) => Promise<{ success: boolean; error?: string }>;
  updateFarm: (params: Partial<CreateFarmParams>) => Promise<{ success: boolean; error?: string }>;
  deleteFarm: () => Promise<{ success: boolean; error?: string }>;
  createAgent: (params: CreateAgentParams) => Promise<{ success: boolean; error?: string }>;
  updateAgent: (agentId: string | number, params: Partial<CreateAgentParams>) => Promise<{ success: boolean; error?: string }>;
  deleteAgent: (agentId: string | number) => Promise<{ success: boolean; error?: string }>;
  createWallet: (params: CreateWalletParams) => Promise<{ success: boolean; error?: string }>;
  updateWallet: (walletId: string | number, params: Partial<CreateWalletParams>) => Promise<{ success: boolean; error?: string }>;
  deleteWallet: (walletId: string | number) => Promise<{ success: boolean; error?: string }>;
}

export function useFarm({ farmId, userId }: UseFarmOptions = {}): UseFarmReturn {
  const [farm, setFarm] = useState<EnrichedFarm | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  
  // Use real-time subscriptions for farms
  const { 
    data: farms, 
    loading: farmsLoading, 
    error: farmsError 
  } = useRealtime<Farm>('farms', {
    filter: userId ? { user_id: userId } : undefined
  });
  
  // Use real-time subscriptions for agents if farmId is provided
  const { 
    data: agents, 
    loading: agentsLoading 
  } = useRealtime<FarmAgent>('agents', {
    filter: farmId ? { farm_id: farmId } : undefined
  });
  
  // Use real-time subscriptions for wallets if farmId is provided
  const { 
    data: wallets, 
    loading: walletsLoading 
  } = useRealtime<Wallet>('wallets', {
    filter: farmId ? { farm_id: farmId } : undefined
  });

  // Load farm details when farmId changes
  const loadFarm = useCallback(async () => {
    if (!farmId) {
      setFarm(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const result = await farmService.getFarmById(farmId);
      if (result.success && result.data) {
        setFarm(result.data);
      } else {
        setError(result.error || 'Failed to load farm');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  }, [farmId]);

  // Create a new farm
  const createFarm = async (params: CreateFarmParams) => {
    try {
      const result = await farmService.createFarm(params);
      return { 
        success: result.success, 
        error: result.error 
      };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Failed to create farm'
      };
    }
  };

  // Update farm details
  const updateFarm = async (params: Partial<CreateFarmParams>) => {
    if (!farmId) return { success: false, error: 'No farm selected' };
    
    try {
      const result = await farmService.updateFarm(farmId, params);
      return { 
        success: result.success, 
        error: result.error 
      };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Failed to update farm'
      };
    }
  };

  // Delete farm
  const deleteFarm = async () => {
    if (!farmId) return { success: false, error: 'No farm selected' };
    
    try {
      const result = await farmService.deleteFarm(farmId);
      return { 
        success: result.success, 
        error: result.error 
      };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Failed to delete farm'
      };
    }
  };

  // Create a new agent
  const createAgent = async (params: CreateAgentParams) => {
    try {
      const result = await farmService.createAgent(params);
      return { 
        success: result.success, 
        error: result.error 
      };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Failed to create agent'
      };
    }
  };

  // Update agent
  const updateAgent = async (agentId: string | number, params: Partial<CreateAgentParams>) => {
    try {
      const result = await farmService.updateAgent(agentId, params);
      return { 
        success: result.success, 
        error: result.error 
      };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Failed to update agent'
      };
    }
  };

  // Delete agent
  const deleteAgent = async (agentId: string | number) => {
    try {
      const result = await farmService.deleteAgent(agentId);
      return { 
        success: result.success, 
        error: result.error 
      };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Failed to delete agent'
      };
    }
  };

  // Create a new wallet
  const createWallet = async (params: CreateWalletParams) => {
    try {
      const result = await farmService.createWallet(params);
      return { 
        success: result.success, 
        error: result.error 
      };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Failed to create wallet'
      };
    }
  };

  // Update wallet
  const updateWallet = async (walletId: string | number, params: Partial<CreateWalletParams>) => {
    try {
      const result = await farmService.updateWallet(walletId, params);
      return { 
        success: result.success, 
        error: result.error 
      };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Failed to update wallet'
      };
    }
  };

  // Delete wallet
  const deleteWallet = async (walletId: string | number) => {
    try {
      const result = await farmService.deleteWallet(walletId);
      return { 
        success: result.success, 
        error: result.error 
      };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Failed to delete wallet'
      };
    }
  };

  // Load farm details when farmId changes
  useEffect(() => {
    loadFarm();
  }, [loadFarm]);

  // Set loading state based on all loading states
  useEffect(() => {
    setLoading(farmsLoading || (farmId ? agentsLoading || walletsLoading : false));
  }, [farmId, farmsLoading, agentsLoading, walletsLoading]);

  // Set error state based on all error states
  useEffect(() => {
    if (farmsError) {
      setError(farmsError);
    }
  }, [farmsError]);

  return {
    farm,
    farms,
    agents,
    wallets,
    loading,
    error,
    createFarm,
    updateFarm,
    deleteFarm,
    createAgent,
    updateAgent,
    deleteAgent,
    createWallet,
    updateWallet,
    deleteWallet
  };
}