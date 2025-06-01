import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createBrowserClient } from '@/utils/supabase/client';
import { Database } from '@/types/database.types';

export type RiskProfile = {
  id: string;
  name: string;
  maxPositionSize: number;
  maxDrawdown: number;
  dailyLossLimit: number;
  maxLeverage: number;
  isActive: boolean;
  userId: string;
  createdAt: string;
  updatedAt: string;
};

/**
 * Hook for managing risk profiles
 * Provides methods for fetching, creating, updating, and deleting risk profiles
 */
export function useRiskProfiles() {
  const queryClient = useQueryClient();
  const supabase = createBrowserClient();
  const [error, setError] = useState<string | null>(null);

  // Fetch all risk profiles for the current user
  const { data: riskProfiles = [], isLoading } = useQuery({
    queryKey: ['riskProfiles'],
    queryFn: async () => {
      const { data: session } = await supabase.auth.getSession();
      if (!session?.session?.user) {
        throw new Error('User not authenticated');
      }

      const { data, error } = await supabase
        .from('risk_profiles')
        .select('*')
        .eq('user_id', session.session.user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      return (data || []).map(profile => ({
        id: profile.id,
        name: profile.name,
        maxPositionSize: profile.max_position_size,
        maxDrawdown: profile.max_drawdown,
        dailyLossLimit: profile.daily_loss_limit,
        maxLeverage: profile.max_leverage,
        isActive: profile.is_active,
        userId: profile.user_id,
        createdAt: profile.created_at,
        updatedAt: profile.updated_at
      })) as RiskProfile[];
    }
  });

  // Get active risk profile
  const activeRiskProfile = riskProfiles.find(profile => profile.isActive);

  // Create risk profile
  const createRiskProfileMutation = useMutation({
    mutationFn: async (profile: Omit<RiskProfile, 'id' | 'userId' | 'createdAt' | 'updatedAt'>) => {
      const { data: session } = await supabase.auth.getSession();
      if (!session?.session?.user) {
        throw new Error('User not authenticated');
      }

      // If this is the first profile or isActive is true, deactivate all other profiles
      if (profile.isActive) {
        await supabase
          .from('risk_profiles')
          .update({ is_active: false })
          .eq('user_id', session.session.user.id);
      }

      const { data, error } = await supabase
        .from('risk_profiles')
        .insert({
          name: profile.name,
          max_position_size: profile.maxPositionSize,
          max_drawdown: profile.maxDrawdown,
          daily_loss_limit: profile.dailyLossLimit,
          max_leverage: profile.maxLeverage,
          is_active: profile.isActive,
          user_id: session.session.user.id
        })
        .select()
        .single();

      if (error) throw error;
      
      return {
        id: data.id,
        name: data.name,
        maxPositionSize: data.max_position_size,
        maxDrawdown: data.max_drawdown,
        dailyLossLimit: data.daily_loss_limit,
        maxLeverage: data.max_leverage,
        isActive: data.is_active,
        userId: data.user_id,
        createdAt: data.created_at,
        updatedAt: data.updated_at
      } as RiskProfile;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['riskProfiles'] });
    },
    onError: (error: any) => {
      setError(error.message);
    }
  });

  // Update risk profile
  const updateRiskProfileMutation = useMutation({
    mutationFn: async (params: { id: string; profile: Partial<RiskProfile> }) => {
      const { id, profile } = params;
      const { data: session } = await supabase.auth.getSession();
      if (!session?.session?.user) {
        throw new Error('User not authenticated');
      }

      // If setting this profile as active, deactivate all other profiles
      if (profile.isActive) {
        await supabase
          .from('risk_profiles')
          .update({ is_active: false })
          .eq('user_id', session.session.user.id);
      }

      const updateData: any = {};
      if (profile.name !== undefined) updateData.name = profile.name;
      if (profile.maxPositionSize !== undefined) updateData.max_position_size = profile.maxPositionSize;
      if (profile.maxDrawdown !== undefined) updateData.max_drawdown = profile.maxDrawdown;
      if (profile.dailyLossLimit !== undefined) updateData.daily_loss_limit = profile.dailyLossLimit;
      if (profile.maxLeverage !== undefined) updateData.max_leverage = profile.maxLeverage;
      if (profile.isActive !== undefined) updateData.is_active = profile.isActive;

      const { data, error } = await supabase
        .from('risk_profiles')
        .update(updateData)
        .eq('id', id)
        .eq('user_id', session.session.user.id)
        .select()
        .single();

      if (error) throw error;
      
      return {
        id: data.id,
        name: data.name,
        maxPositionSize: data.max_position_size,
        maxDrawdown: data.max_drawdown,
        dailyLossLimit: data.daily_loss_limit,
        maxLeverage: data.max_leverage,
        isActive: data.is_active,
        userId: data.user_id,
        createdAt: data.created_at,
        updatedAt: data.updated_at
      } as RiskProfile;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['riskProfiles'] });
    },
    onError: (error: any) => {
      setError(error.message);
    }
  });

  // Delete risk profile
  const deleteRiskProfileMutation = useMutation({
    mutationFn: async (id: string) => {
      const { data: session } = await supabase.auth.getSession();
      if (!session?.session?.user) {
        throw new Error('User not authenticated');
      }

      const { error } = await supabase
        .from('risk_profiles')
        .delete()
        .eq('id', id)
        .eq('user_id', session.session.user.id);

      if (error) throw error;
      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['riskProfiles'] });
    },
    onError: (error: any) => {
      setError(error.message);
    }
  });

  return {
    riskProfiles,
    activeRiskProfile,
    isLoading,
    error,
    createRiskProfile: (profile: Omit<RiskProfile, 'id' | 'userId' | 'createdAt' | 'updatedAt'>) => 
      createRiskProfileMutation.mutateAsync(profile),
    updateRiskProfile: (id: string, profile: Partial<RiskProfile>) => 
      updateRiskProfileMutation.mutateAsync({ id, profile }),
    deleteRiskProfile: (id: string) => 
      deleteRiskProfileMutation.mutateAsync(id),
    clearError: () => setError(null)
  };
}
