/**
 * Farm System Hook
 * 
 * This hook provides a unified interface for managing trading farms,
 * connecting the farm management UI with the ElizaOS AI capabilities
 * and Supabase database infrastructure.
 */

import { useState, useEffect, useCallback } from 'react';
import { createBrowserClient } from '@/utils/supabase/client';
import { elizaOS } from '@/integrations/elizaos';
import { useToast } from '@/components/ui/use-toast';

// Farm interface matching database schema
export interface Farm {
  id: string;
  name: string;
  balance: number;
  allocated_funds: number;
  available_funds: number;
  risk_level: 'low' | 'medium' | 'high';
  status: 'active' | 'paused' | 'locked';
  master_wallet_id: string | null;
  strategy_id: string | null;
  created_at: string;
  updated_at: string;
}

// Farm metrics interface
export interface FarmMetrics {
  total_agents: number;
  active_agents: number;
  total_balance: number;
  allocated_funds: number;
  available_funds: number;
  performance_30d: number;
  risk_exposure: number;
  last_transaction_at: string | null;
}

export function useFarmSystem() {
  const supabase = createBrowserClient();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [farms, setFarms] = useState<Farm[]>([]);
  const [selectedFarm, setSelectedFarm] = useState<Farm | null>(null);
  const [farmMetrics, setFarmMetrics] = useState<Record<string, FarmMetrics>>({});
  const [isElizaConnected, setIsElizaConnected] = useState(elizaOS.isConnected);

  // Initialize with ElizaOS connection status
  useEffect(() => {
    const handleStatusChange = (status: boolean) => {
      setIsElizaConnected(status);
    };

    elizaOS.addStatusListener(handleStatusChange);
    return () => elizaOS.removeStatusListener(handleStatusChange);
  }, []);

  // Load all farm data
  const loadFarmData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch farms
      const { data: farmData, error: farmError } = await supabase
        .from('farm_wallets')
        .select('*')
        .order('created_at', { ascending: false });

      if (farmError) throw farmError;
      setFarms(farmData || []);

      // Load metrics for each farm
      await loadFarmMetrics(farmData || []);
    } catch (err) {
      console.error('Error loading farm data:', err);
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  // Load metrics for all farms
  const loadFarmMetrics = async (farmsList: Farm[]) => {
    try {
      const metricsMap: Record<string, FarmMetrics> = {};

      // For each farm, load its metrics
      for (const farm of farmsList) {
        // Get agent count
        const { count: totalAgents, error: agentCountError } = await supabase
          .from('agents')
          .select('*', { count: 'exact', head: true })
          .eq('farm_id', farm.id);

        if (agentCountError) throw agentCountError;

        // Get active agent count
        const { count: activeAgents, error: activeCountError } = await supabase
          .from('agents')
          .select('*', { count: 'exact', head: true })
          .eq('farm_id', farm.id)
          .eq('status', 'active');

        if (activeCountError) throw activeCountError;

        // Get last transaction
        const { data: lastTx, error: txError } = await supabase
          .from('transactions')
          .select('created_at')
          .or(`source_id.eq.${farm.id},destination_id.eq.${farm.id}`)
          .order('created_at', { ascending: false })
          .limit(1);

        if (txError) throw txError;

        // If ElizaOS is connected, get enhanced metrics
        let performance30d = 0;
        let riskExposure = 0;

        if (isElizaConnected) {
          try {
            const elizaMetrics = await elizaOS.sendCommand('get_farm_metrics', {
              farm_id: farm.id
            });

            performance30d = elizaMetrics.performance_30d || 0;
            riskExposure = elizaMetrics.risk_exposure || 0;
          } catch (elizaError) {
            console.warn(`Failed to get ElizaOS metrics for farm ${farm.id}:`, elizaError);
            // Continue with basic metrics
          }
        }

        // Store metrics for this farm
        metricsMap[farm.id] = {
          total_agents: totalAgents || 0,
          active_agents: activeAgents || 0,
          total_balance: farm.balance,
          allocated_funds: farm.allocated_funds,
          available_funds: farm.available_funds,
          performance_30d: performance30d,
          risk_exposure: riskExposure,
          last_transaction_at: lastTx?.[0]?.created_at || null
        };
      }

      setFarmMetrics(metricsMap);
    } catch (err) {
      console.error('Error loading farm metrics:', err);
      // Don't fail the entire load operation for metrics
    }
  };

  // Load data on mount
  useEffect(() => {
    loadFarmData();

    // Set up real-time subscriptions
    const farmsSubscription = supabase
      .channel('farms-changes')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'farm_wallets' 
      }, () => {
        loadFarmData();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(farmsSubscription);
    };
  }, [loadFarmData, supabase]);

  // Create a new farm
  const createFarm = async (farmData: Partial<Farm>) => {
    try {
      setError(null);

      // If ElizaOS is connected, validate the farm creation
      if (isElizaConnected) {
        try {
          await elizaOS.sendCommand('validate_farm_creation', {
            name: farmData.name,
            risk_level: farmData.risk_level,
            initial_balance: farmData.balance || 0
          });
        } catch (elizaError) {
          throw new Error(`ElizaOS validation failed: ${elizaError instanceof Error ? elizaError.message : 'Unknown error'}`);
        }
      }

      // Insert the farm into the database
      const { data, error: insertError } = await supabase
        .from('farm_wallets')
        .insert({
          name: farmData.name,
          balance: farmData.balance || 0,
          allocated_funds: 0,
          available_funds: farmData.balance || 0,
          risk_level: farmData.risk_level || 'medium',
          status: farmData.status || 'active',
          master_wallet_id: farmData.master_wallet_id,
          strategy_id: farmData.strategy_id
        })
        .select()
        .single();

      if (insertError) throw insertError;

      if (!data) throw new Error('Failed to create farm');

      // If ElizaOS is connected, initialize the farm
      if (isElizaConnected) {
        await elizaOS.sendCommand('initialize_farm', {
          farm_id: data.id,
          farm_name: data.name,
          risk_level: data.risk_level,
          balance: data.balance
        });
      }

      toast({
        title: 'Farm Created',
        description: `Farm "${data.name}" was created successfully.`,
      });

      return data;
    } catch (err) {
      console.error('Error creating farm:', err);
      setError(err instanceof Error ? err.message : 'Failed to create farm');
      
      toast({
        title: 'Error Creating Farm',
        description: err instanceof Error ? err.message : 'An unknown error occurred',
        variant: 'destructive',
      });
      
      throw err;
    }
  };

  // Update an existing farm
  const updateFarm = async (farmId: string, farmData: Partial<Farm>) => {
    try {
      setError(null);

      // If ElizaOS is connected, validate the farm update
      if (isElizaConnected) {
        try {
          await elizaOS.sendCommand('validate_farm_update', {
            farm_id: farmId,
            ...farmData
          });
        } catch (elizaError) {
          throw new Error(`ElizaOS validation failed: ${elizaError instanceof Error ? elizaError.message : 'Unknown error'}`);
        }
      }

      // Update the farm in the database
      const { data, error: updateError } = await supabase
        .from('farm_wallets')
        .update(farmData)
        .eq('id', farmId)
        .select()
        .single();

      if (updateError) throw updateError;

      if (!data) throw new Error('Failed to update farm');

      // If ElizaOS is connected, update the farm in the AI system
      if (isElizaConnected) {
        await elizaOS.sendCommand('update_farm', {
          farm_id: data.id,
          farm_name: data.name,
          risk_level: data.risk_level,
          status: data.status
        });
      }

      toast({
        title: 'Farm Updated',
        description: `Farm "${data.name}" was updated successfully.`,
      });

      return data;
    } catch (err) {
      console.error('Error updating farm:', err);
      setError(err instanceof Error ? err.message : 'Failed to update farm');
      
      toast({
        title: 'Error Updating Farm',
        description: err instanceof Error ? err.message : 'An unknown error occurred',
        variant: 'destructive',
      });
      
      throw err;
    }
  };

  // Delete a farm
  const deleteFarm = async (farmId: string) => {
    try {
      setError(null);

      // Get the farm first to know its name for the toast message
      const { data: farm, error: getError } = await supabase
        .from('farm_wallets')
        .select('name')
        .eq('id', farmId)
        .single();

      if (getError) throw getError;

      // If ElizaOS is connected, validate and prepare the farm deletion
      if (isElizaConnected) {
        try {
          await elizaOS.sendCommand('prepare_farm_deletion', {
            farm_id: farmId
          });
        } catch (elizaError) {
          throw new Error(`ElizaOS validation failed: ${elizaError instanceof Error ? elizaError.message : 'Unknown error'}`);
        }
      }

      // Delete the farm from the database
      const { error: deleteError } = await supabase
        .from('farm_wallets')
        .delete()
        .eq('id', farmId);

      if (deleteError) throw deleteError;

      // If ElizaOS is connected, finalize the farm deletion
      if (isElizaConnected) {
        await elizaOS.sendCommand('finalize_farm_deletion', {
          farm_id: farmId
        });
      }

      toast({
        title: 'Farm Deleted',
        description: `Farm "${farm?.name}" was deleted successfully.`,
      });

      return true;
    } catch (err) {
      console.error('Error deleting farm:', err);
      setError(err instanceof Error ? err.message : 'Failed to delete farm');
      
      toast({
        title: 'Error Deleting Farm',
        description: err instanceof Error ? err.message : 'An unknown error occurred',
        variant: 'destructive',
      });
      
      throw err;
    }
  };

  // Change farm status (active, paused, locked)
  const changeFarmStatus = async (farmId: string, status: 'active' | 'paused' | 'locked') => {
    try {
      setError(null);

      // If ElizaOS is connected, validate the status change
      if (isElizaConnected) {
        try {
          await elizaOS.sendCommand('validate_farm_status_change', {
            farm_id: farmId,
            status
          });
        } catch (elizaError) {
          throw new Error(`ElizaOS validation failed: ${elizaError instanceof Error ? elizaError.message : 'Unknown error'}`);
        }
      }

      // Update the farm status in the database
      const { data, error: updateError } = await supabase
        .from('farm_wallets')
        .update({ status })
        .eq('id', farmId)
        .select()
        .single();

      if (updateError) throw updateError;

      // If ElizaOS is connected, update the farm status in the AI system
      if (isElizaConnected) {
        await elizaOS.sendCommand('update_farm_status', {
          farm_id: farmId,
          status
        });
      }

      const statusText = {
        'active': 'activated',
        'paused': 'paused',
        'locked': 'locked'
      }[status];

      toast({
        title: 'Farm Status Updated',
        description: `Farm "${data?.name}" has been ${statusText}.`,
      });

      return data;
    } catch (err) {
      console.error('Error changing farm status:', err);
      setError(err instanceof Error ? err.message : 'Failed to change farm status');
      
      toast({
        title: 'Error Updating Farm Status',
        description: err instanceof Error ? err.message : 'An unknown error occurred',
        variant: 'destructive',
      });
      
      throw err;
    }
  };

  // Get detailed farm information, including agents and wallets
  const getFarmDetails = async (farmId: string) => {
    try {
      setError(null);

      // Get the farm with basic data
      const { data: farm, error: farmError } = await supabase
        .from('farm_wallets')
        .select('*')
        .eq('id', farmId)
        .single();

      if (farmError) throw farmError;

      // Get agents for this farm
      const { data: agents, error: agentsError } = await supabase
        .from('agents')
        .select('*')
        .eq('farm_id', farmId);

      if (agentsError) throw agentsError;

      // Get transactions for this farm
      const { data: transactions, error: txError } = await supabase
        .from('transactions')
        .select('*')
        .or(`source_id.eq.${farmId},destination_id.eq.${farmId}`)
        .order('created_at', { ascending: false })
        .limit(50);

      if (txError) throw txError;

      // If ElizaOS is connected, get enhanced farm analytics
      let analytics = null;
      if (isElizaConnected) {
        try {
          analytics = await elizaOS.sendCommand('get_farm_analytics', {
            farm_id: farmId
          });
        } catch (elizaError) {
          console.warn(`Failed to get ElizaOS analytics for farm ${farmId}:`, elizaError);
          // Continue without analytics rather than failing
        }
      }

      const farmDetails = {
        ...farm,
        agents: agents || [],
        transactions: transactions || [],
        analytics
      };

      setSelectedFarm(farm);
      return farmDetails;
    } catch (err) {
      console.error('Error getting farm details:', err);
      setError(err instanceof Error ? err.message : 'Failed to get farm details');
      throw err;
    }
  };

  // Send a command to a farm via ElizaOS
  const sendFarmCommand = async (farmId: string, command: string, parameters?: Record<string, any>) => {
    try {
      setError(null);

      if (!isElizaConnected) {
        throw new Error('ElizaOS is not connected. Cannot send command to farm.');
      }

      // Send the command to the farm via ElizaOS
      const result = await elizaOS.sendCommand(command, {
        farm_id: farmId,
        ...parameters
      });

      return result;
    } catch (err) {
      console.error(`Error sending command ${command} to farm:`, err);
      setError(err instanceof Error ? err.message : `Failed to send command ${command} to farm`);
      
      toast({
        title: 'Command Error',
        description: err instanceof Error ? err.message : 'An unknown error occurred',
        variant: 'destructive',
      });
      
      throw err;
    }
  };

  return {
    loading,
    error,
    farms,
    selectedFarm,
    farmMetrics,
    isElizaConnected,
    loadFarmData,
    createFarm,
    updateFarm,
    deleteFarm,
    changeFarmStatus,
    getFarmDetails,
    sendFarmCommand,
    setSelectedFarm
  };
}
