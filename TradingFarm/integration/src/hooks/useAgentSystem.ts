/**
 * Agent System Hook
 * 
 * This hook provides a unified interface for interacting with trading agents,
 * connecting the Trading Farm Dashboard with ElizaOS AI capabilities.
 */

import { useState, useEffect, useCallback } from 'react';
import { createBrowserClient } from '@/utils/supabase/client';
import { elizaOS } from '@/integrations/elizaos';
import { useToast } from '@/components/ui/use-toast';

// Agent interface matching database schema
export interface Agent {
  id: string;
  name: string;
  farm_id: string | null;
  model: string;
  description: string | null;
  status: 'active' | 'paused' | 'inactive';
  strategy_id: string | null;
  wallet_id: string | null;
  exchange_configs: any;
  performance: any;
  last_active: string | null;
  created_at: string;
  updated_at: string;
}

// Farm interface for agent association
export interface Farm {
  id: string;
  name: string;
}

// Strategy interface for agent configuration
export interface Strategy {
  id: string;
  name: string;
  risk_level: 'low' | 'medium' | 'high';
}

// Wallet interface for agent funding
export interface AgentWallet {
  id: string;
  name: string;
  balance: number;
  farm_id: string | null;
}

export function useAgentSystem() {
  const supabase = createBrowserClient();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [farms, setFarms] = useState<Farm[]>([]);
  const [strategies, setStrategies] = useState<Strategy[]>([]);
  const [agentWallets, setAgentWallets] = useState<AgentWallet[]>([]);
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
  const [isElizaConnected, setIsElizaConnected] = useState(elizaOS.isConnected);

  // Initialize with ElizaOS connection status
  useEffect(() => {
    const handleStatusChange = (status: boolean) => {
      setIsElizaConnected(status);
    };

    elizaOS.addStatusListener(handleStatusChange);
    return () => elizaOS.removeStatusListener(handleStatusChange);
  }, []);

  // Load all agent data
  const loadAgentData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch agents
      const { data: agentData, error: agentError } = await supabase
        .from('agents')
        .select('*')
        .order('created_at', { ascending: false });

      if (agentError) throw agentError;
      setAgents(agentData || []);

      // Fetch farms
      const { data: farmData, error: farmError } = await supabase
        .from('farm_wallets')
        .select('id, name')
        .order('name');

      if (farmError) throw farmError;
      setFarms(farmData || []);

      // Fetch strategies
      const { data: strategyData, error: strategyError } = await supabase
        .from('strategies')
        .select('id, name, risk_level')
        .order('name');

      if (strategyError) throw strategyError;
      setStrategies(strategyData || []);

      // Fetch agent wallets
      const { data: walletData, error: walletError } = await supabase
        .from('agent_wallets')
        .select('id, name, balance, farm_id')
        .order('name');

      if (walletError) throw walletError;
      setAgentWallets(walletData || []);

    } catch (err) {
      console.error('Error loading agent data:', err);
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  // Load data on mount
  useEffect(() => {
    loadAgentData();

    // Set up real-time subscriptions
    const agentsSubscription = supabase
      .channel('agents-changes')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'agents' 
      }, () => {
        loadAgentData();
      })
      .subscribe();

    const walletsSubscription = supabase
      .channel('agent-wallets-changes')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'agent_wallets' 
      }, () => {
        loadAgentData();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(agentsSubscription);
      supabase.removeChannel(walletsSubscription);
    };
  }, [loadAgentData, supabase]);

  // Create a new agent
  const createAgent = async (agentData: Partial<Agent>) => {
    try {
      setError(null);

      // If ElizaOS is connected, validate the agent creation
      if (isElizaConnected) {
        try {
          await elizaOS.sendCommand('validate_agent_creation', {
            name: agentData.name,
            model: agentData.model,
            farm_id: agentData.farm_id,
            strategy_id: agentData.strategy_id
          });
        } catch (elizaError) {
          throw new Error(`ElizaOS validation failed: ${elizaError instanceof Error ? elizaError.message : 'Unknown error'}`);
        }
      }

      // Insert the agent into the database
      const { data, error: insertError } = await supabase
        .from('agents')
        .insert(agentData)
        .select()
        .single();

      if (insertError) throw insertError;

      if (!data) throw new Error('Failed to create agent');

      // If ElizaOS is connected, send a command to initialize the agent
      if (isElizaConnected) {
        await elizaOS.sendCommand('initialize_agent', {
          agent_id: data.id,
          agent_name: data.name,
          model: data.model,
          farm_id: data.farm_id,
          strategy_id: data.strategy_id
        });
      }

      toast({
        title: 'Agent Created',
        description: `Agent "${data.name}" was created successfully.`,
      });

      return data;
    } catch (err) {
      console.error('Error creating agent:', err);
      setError(err instanceof Error ? err.message : 'Failed to create agent');
      
      toast({
        title: 'Error Creating Agent',
        description: err instanceof Error ? err.message : 'An unknown error occurred',
        variant: 'destructive',
      });
      
      throw err;
    }
  };

  // Update an existing agent
  const updateAgent = async (agentId: string, agentData: Partial<Agent>) => {
    try {
      setError(null);

      // If ElizaOS is connected, validate the agent update
      if (isElizaConnected) {
        try {
          await elizaOS.sendCommand('validate_agent_update', {
            agent_id: agentId,
            ...agentData
          });
        } catch (elizaError) {
          throw new Error(`ElizaOS validation failed: ${elizaError instanceof Error ? elizaError.message : 'Unknown error'}`);
        }
      }

      // Update the agent in the database
      const { data, error: updateError } = await supabase
        .from('agents')
        .update(agentData)
        .eq('id', agentId)
        .select()
        .single();

      if (updateError) throw updateError;

      if (!data) throw new Error('Failed to update agent');

      // If ElizaOS is connected, send a command to update the agent in the AI system
      if (isElizaConnected) {
        await elizaOS.sendCommand('update_agent', {
          agent_id: data.id,
          agent_name: data.name,
          model: data.model,
          farm_id: data.farm_id,
          strategy_id: data.strategy_id,
          status: data.status
        });
      }

      toast({
        title: 'Agent Updated',
        description: `Agent "${data.name}" was updated successfully.`,
      });

      return data;
    } catch (err) {
      console.error('Error updating agent:', err);
      setError(err instanceof Error ? err.message : 'Failed to update agent');
      
      toast({
        title: 'Error Updating Agent',
        description: err instanceof Error ? err.message : 'An unknown error occurred',
        variant: 'destructive',
      });
      
      throw err;
    }
  };

  // Delete an agent
  const deleteAgent = async (agentId: string) => {
    try {
      setError(null);

      // Get the agent first to know its name for the toast message
      const { data: agent, error: getError } = await supabase
        .from('agents')
        .select('name')
        .eq('id', agentId)
        .single();

      if (getError) throw getError;

      // If ElizaOS is connected, validate and prepare the agent deletion
      if (isElizaConnected) {
        try {
          await elizaOS.sendCommand('prepare_agent_deletion', {
            agent_id: agentId
          });
        } catch (elizaError) {
          throw new Error(`ElizaOS validation failed: ${elizaError instanceof Error ? elizaError.message : 'Unknown error'}`);
        }
      }

      // Delete the agent from the database
      const { error: deleteError } = await supabase
        .from('agents')
        .delete()
        .eq('id', agentId);

      if (deleteError) throw deleteError;

      // If ElizaOS is connected, send a command to finalize the agent deletion
      if (isElizaConnected) {
        await elizaOS.sendCommand('finalize_agent_deletion', {
          agent_id: agentId
        });
      }

      toast({
        title: 'Agent Deleted',
        description: `Agent "${agent?.name}" was deleted successfully.`,
      });

      return true;
    } catch (err) {
      console.error('Error deleting agent:', err);
      setError(err instanceof Error ? err.message : 'Failed to delete agent');
      
      toast({
        title: 'Error Deleting Agent',
        description: err instanceof Error ? err.message : 'An unknown error occurred',
        variant: 'destructive',
      });
      
      throw err;
    }
  };

  // Start an agent (change status to 'active')
  const startAgent = async (agentId: string) => {
    try {
      setError(null);

      // If ElizaOS is connected, send a command to start the agent in the AI system
      if (isElizaConnected) {
        await elizaOS.sendCommand('start_agent', {
          agent_id: agentId
        });
      }

      // Update the agent status in the database
      const { data, error: updateError } = await supabase
        .from('agents')
        .update({ status: 'active', last_active: new Date().toISOString() })
        .eq('id', agentId)
        .select()
        .single();

      if (updateError) throw updateError;

      toast({
        title: 'Agent Started',
        description: `Agent "${data?.name}" is now active.`,
      });

      return data;
    } catch (err) {
      console.error('Error starting agent:', err);
      setError(err instanceof Error ? err.message : 'Failed to start agent');
      
      toast({
        title: 'Error Starting Agent',
        description: err instanceof Error ? err.message : 'An unknown error occurred',
        variant: 'destructive',
      });
      
      throw err;
    }
  };

  // Pause an agent (change status to 'paused')
  const pauseAgent = async (agentId: string) => {
    try {
      setError(null);

      // If ElizaOS is connected, send a command to pause the agent in the AI system
      if (isElizaConnected) {
        await elizaOS.sendCommand('pause_agent', {
          agent_id: agentId
        });
      }

      // Update the agent status in the database
      const { data, error: updateError } = await supabase
        .from('agents')
        .update({ status: 'paused' })
        .eq('id', agentId)
        .select()
        .single();

      if (updateError) throw updateError;

      toast({
        title: 'Agent Paused',
        description: `Agent "${data?.name}" is now paused.`,
      });

      return data;
    } catch (err) {
      console.error('Error pausing agent:', err);
      setError(err instanceof Error ? err.message : 'Failed to pause agent');
      
      toast({
        title: 'Error Pausing Agent',
        description: err instanceof Error ? err.message : 'An unknown error occurred',
        variant: 'destructive',
      });
      
      throw err;
    }
  };

  // Get detailed agent information, including performance metrics
  const getAgentDetails = async (agentId: string) => {
    try {
      setError(null);

      // Get the agent with all related data using Supabase joins
      const { data, error: getError } = await supabase
        .from('agents')
        .select(`
          *,
          farm_wallets(name),
          agent_wallets(*),
          strategies(name, risk_level, parameters)
        `)
        .eq('id', agentId)
        .single();

      if (getError) throw getError;

      // If ElizaOS is connected, get additional agent metrics
      if (isElizaConnected) {
        try {
          const metrics = await elizaOS.sendCommand('get_agent_metrics', {
            agent_id: agentId
          });
          
          // Enhance the agent data with ElizaOS metrics
          if (metrics && data) {
            data.performance = {
              ...data.performance,
              ...metrics
            };
          }
        } catch (elizaError) {
          console.warn('Failed to get agent metrics from ElizaOS:', elizaError);
          // Continue without ElizaOS metrics rather than failing
        }
      }

      setSelectedAgent(data);
      return data;
    } catch (err) {
      console.error('Error getting agent details:', err);
      setError(err instanceof Error ? err.message : 'Failed to get agent details');
      throw err;
    }
  };

  // Send a command to an agent via ElizaOS
  const sendAgentCommand = async (agentId: string, command: string, parameters?: Record<string, any>) => {
    try {
      setError(null);

      if (!isElizaConnected) {
        throw new Error('ElizaOS is not connected. Cannot send command to agent.');
      }

      // Send the command to the agent via ElizaOS
      const result = await elizaOS.sendCommand(command, {
        agent_id: agentId,
        ...parameters
      });

      return result;
    } catch (err) {
      console.error(`Error sending command ${command} to agent:`, err);
      setError(err instanceof Error ? err.message : `Failed to send command ${command} to agent`);
      
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
    agents,
    farms,
    strategies,
    agentWallets,
    selectedAgent,
    isElizaConnected,
    loadAgentData,
    createAgent,
    updateAgent,
    deleteAgent,
    startAgent,
    pauseAgent,
    getAgentDetails,
    sendAgentCommand,
    setSelectedAgent
  };
}
