/**
 * Simulation Hook
 * 
 * React hook for interacting with the Simulation Service for dry-run trading
 * Provides simulation configuration, running, and performance tracking capabilities
 */

import { useState, useEffect, useCallback } from 'react';
import { 
  SimulationClient,
  SimulationModel,
  AgentSimulationConfig,
  SimulationRun,
  SimulationTrade,
  VirtualBalance,
  SimulationMetrics
} from '../clients/simulation-client';
import { MonitoringService } from '../monitoring-service';

export interface UseSimulationOptions {
  agentId?: string;
  configId?: string;
  runId?: string;
  autoLoad?: boolean;
}

/**
 * Hook for interacting with the Simulation Service
 */
export default function useSimulation(options: UseSimulationOptions = {}) {
  const { 
    agentId: initialAgentId, 
    configId: initialConfigId,
    runId: initialRunId,
    autoLoad = true 
  } = options;
  
  const [agentId, setAgentId] = useState<string | undefined>(initialAgentId);
  const [configId, setConfigId] = useState<string | undefined>(initialConfigId);
  const [runId, setRunId] = useState<string | undefined>(initialRunId);
  
  const [models, setModels] = useState<SimulationModel[]>([]);
  const [configs, setConfigs] = useState<AgentSimulationConfig[]>([]);
  const [currentConfig, setCurrentConfig] = useState<AgentSimulationConfig | null>(null);
  const [currentRun, setCurrentRun] = useState<SimulationRun | null>(null);
  const [trades, setTrades] = useState<SimulationTrade[]>([]);
  const [balances, setBalances] = useState<VirtualBalance[]>([]);
  const [metrics, setMetrics] = useState<SimulationMetrics | null>(null);
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  
  // Initialize client
  const client = SimulationClient.getInstance();
  
  // Load models and configs when component mounts if autoLoad is true
  useEffect(() => {
    if (autoLoad) {
      loadSimulationModels();
      
      if (agentId) {
        loadAgentSimulationConfigs(agentId);
      }
    }
  }, [autoLoad, agentId]);
  
  // Load specific run when runId changes
  useEffect(() => {
    if (runId) {
      loadSimulationRun(runId);
      loadSimulationTrades(runId);
      loadVirtualBalances(runId);
      loadSimulationMetrics(runId);
    }
  }, [runId]);
  
  // Load specific config when configId changes
  useEffect(() => {
    if (configId) {
      loadAgentSimulationConfigs(undefined, configId);
    }
  }, [configId]);
  
  /**
   * Load all simulation models
   */
  const loadSimulationModels = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await client.getSimulationModels();
      
      if (response.error) {
        throw new Error(response.error.message);
      }
      
      if (response.data) {
        setModels(response.data);
      }
      
      return response.data;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to load simulation models');
      setError(error);
      
      MonitoringService.logEvent({
        type: 'error',
        message: 'Failed to load simulation models',
        data: { error }
      });
      
      return null;
    } finally {
      setLoading(false);
    }
  }, [client]);
  
  /**
   * Create a new simulation model
   */
  const createSimulationModel = useCallback(async (
    model: Omit<SimulationModel, 'id' | 'userId' | 'createdAt' | 'updatedAt'>
  ) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await client.createSimulationModel(model);
      
      if (response.error) {
        throw new Error(response.error.message);
      }
      
      if (response.data) {
        // Update models list
        setModels((prev) => [...prev, response.data!]);
      }
      
      return response.data;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to create simulation model');
      setError(error);
      
      MonitoringService.logEvent({
        type: 'error',
        message: 'Failed to create simulation model',
        data: { error, model }
      });
      
      return null;
    } finally {
      setLoading(false);
    }
  }, [client]);
  
  /**
   * Update a simulation model
   */
  const updateSimulationModel = useCallback(async (
    modelId: string,
    updates: Partial<Omit<SimulationModel, 'id' | 'userId' | 'createdAt' | 'updatedAt'>>
  ) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await client.updateSimulationModel(modelId, updates);
      
      if (response.error) {
        throw new Error(response.error.message);
      }
      
      if (response.data) {
        // Update models list
        setModels((prev) => 
          prev.map((m) => m.id === modelId ? response.data! : m)
        );
      }
      
      return response.data;
    } catch (err) {
      const error = err instanceof Error ? err : new Error(`Failed to update simulation model ${modelId}`);
      setError(error);
      
      MonitoringService.logEvent({
        type: 'error',
        message: `Failed to update simulation model ${modelId}`,
        data: { error, modelId, updates }
      });
      
      return null;
    } finally {
      setLoading(false);
    }
  }, [client]);
  
  /**
   * Delete a simulation model
   */
  const deleteSimulationModel = useCallback(async (modelId: string) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await client.deleteSimulationModel(modelId);
      
      if (response.error) {
        throw new Error(response.error.message);
      }
      
      if (response.data) {
        // Update models list
        setModels((prev) => prev.filter((m) => m.id !== modelId));
      }
      
      return response.data;
    } catch (err) {
      const error = err instanceof Error ? err : new Error(`Failed to delete simulation model ${modelId}`);
      setError(error);
      
      MonitoringService.logEvent({
        type: 'error',
        message: `Failed to delete simulation model ${modelId}`,
        data: { error, modelId }
      });
      
      return false;
    } finally {
      setLoading(false);
    }
  }, [client]);
  
  /**
   * Load agent simulation configs
   */
  const loadAgentSimulationConfigs = useCallback(async (
    id?: string,
    specificConfigId?: string
  ) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await client.getAgentSimulationConfigs(id);
      
      if (response.error) {
        throw new Error(response.error.message);
      }
      
      if (response.data) {
        // If looking for a specific config
        if (specificConfigId) {
          const config = response.data.find(c => c.id === specificConfigId);
          if (config) {
            setCurrentConfig(config);
          }
        } else {
          setConfigs(response.data);
          
          // If we have agent-specific configs and no current config, set the first one
          if (id && response.data.length > 0 && !currentConfig) {
            setCurrentConfig(response.data[0]);
            setConfigId(response.data[0].id);
          }
        }
      }
      
      return response.data;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to load agent simulation configs');
      setError(error);
      
      MonitoringService.logEvent({
        type: 'error',
        message: 'Failed to load agent simulation configs',
        data: { error, agentId: id, configId: specificConfigId }
      });
      
      return null;
    } finally {
      setLoading(false);
    }
  }, [client, currentConfig]);
  
  /**
   * Create a new agent simulation config
   */
  const createAgentSimulationConfig = useCallback(async (
    config: Omit<AgentSimulationConfig, 'id' | 'userId' | 'createdAt' | 'updatedAt'>
  ) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await client.createAgentSimulationConfig(config);
      
      if (response.error) {
        throw new Error(response.error.message);
      }
      
      if (response.data) {
        // Update configs list
        setConfigs((prev) => [...prev, response.data!]);
        
        // If this is for the current agent and no config is selected, select this one
        if (config.agentId === agentId && !configId) {
          setConfigId(response.data.id);
          setCurrentConfig(response.data);
        }
      }
      
      return response.data;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to create agent simulation config');
      setError(error);
      
      MonitoringService.logEvent({
        type: 'error',
        message: 'Failed to create agent simulation config',
        data: { error, config }
      });
      
      return null;
    } finally {
      setLoading(false);
    }
  }, [client, agentId, configId]);
  
  /**
   * Update an agent simulation config
   */
  const updateAgentSimulationConfig = useCallback(async (
    configId: string,
    updates: Partial<Omit<AgentSimulationConfig, 'id' | 'userId' | 'createdAt' | 'updatedAt'>>
  ) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await client.updateAgentSimulationConfig(configId, updates);
      
      if (response.error) {
        throw new Error(response.error.message);
      }
      
      if (response.data) {
        // Update configs list
        setConfigs((prev) => 
          prev.map((c) => c.id === configId ? response.data! : c)
        );
        
        // Update current config if it's the one being updated
        if (currentConfig?.id === configId) {
          setCurrentConfig(response.data);
        }
      }
      
      return response.data;
    } catch (err) {
      const error = err instanceof Error ? err : new Error(`Failed to update agent simulation config ${configId}`);
      setError(error);
      
      MonitoringService.logEvent({
        type: 'error',
        message: `Failed to update agent simulation config ${configId}`,
        data: { error, configId, updates }
      });
      
      return null;
    } finally {
      setLoading(false);
    }
  }, [client, currentConfig]);
  
  /**
   * Start a new simulation run
   */
  const startSimulationRun = useCallback(async (
    simulationConfigId: string,
    metadata?: Record<string, any>
  ) => {
    if (!simulationConfigId) {
      const error = new Error('No simulation config selected');
      setError(error);
      return null;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      const response = await client.startSimulationRun(simulationConfigId, metadata);
      
      if (response.error) {
        throw new Error(response.error.message);
      }
      
      if (response.data) {
        setRunId(response.data.id);
        setCurrentRun(response.data);
      }
      
      return response.data;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to start simulation run');
      setError(error);
      
      MonitoringService.logEvent({
        type: 'error',
        message: 'Failed to start simulation run',
        data: { error, configId: simulationConfigId }
      });
      
      return null;
    } finally {
      setLoading(false);
    }
  }, [client]);
  
  /**
   * Stop a simulation run
   */
  const stopSimulationRun = useCallback(async (id: string) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await client.stopSimulationRun(id);
      
      if (response.error) {
        throw new Error(response.error.message);
      }
      
      if (response.data) {
        // Update current run if it's the one being stopped
        if (currentRun?.id === id) {
          setCurrentRun(response.data);
        }
      }
      
      return response.data;
    } catch (err) {
      const error = err instanceof Error ? err : new Error(`Failed to stop simulation run ${id}`);
      setError(error);
      
      MonitoringService.logEvent({
        type: 'error',
        message: `Failed to stop simulation run ${id}`,
        data: { error, runId: id }
      });
      
      return null;
    } finally {
      setLoading(false);
    }
  }, [client, currentRun]);
  
  /**
   * Load a simulation run
   */
  const loadSimulationRun = useCallback(async (id: string) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await client.getSimulationRun(id);
      
      if (response.error) {
        throw new Error(response.error.message);
      }
      
      if (response.data) {
        setCurrentRun(response.data);
        
        // If config ID isn't already set, set it
        if (!configId && response.data.agentSimulationConfigId) {
          setConfigId(response.data.agentSimulationConfigId);
          loadAgentSimulationConfigs(undefined, response.data.agentSimulationConfigId);
        }
      }
      
      return response.data;
    } catch (err) {
      const error = err instanceof Error ? err : new Error(`Failed to load simulation run ${id}`);
      setError(error);
      
      MonitoringService.logEvent({
        type: 'error',
        message: `Failed to load simulation run ${id}`,
        data: { error, runId: id }
      });
      
      return null;
    } finally {
      setLoading(false);
    }
  }, [client, configId]);
  
  /**
   * Load simulation runs
   */
  const loadSimulationRuns = useCallback(async (
    loadAgentId?: string,
    loadConfigId?: string,
    status?: string,
    limit: number = 20,
    offset: number = 0
  ) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await client.getSimulationRuns(
        loadAgentId || agentId,
        loadConfigId || configId,
        status,
        limit,
        offset
      );
      
      if (response.error) {
        throw new Error(response.error.message);
      }
      
      return response.data;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to load simulation runs');
      setError(error);
      
      MonitoringService.logEvent({
        type: 'error',
        message: 'Failed to load simulation runs',
        data: { error, agentId, configId, status }
      });
      
      return null;
    } finally {
      setLoading(false);
    }
  }, [client, agentId, configId]);
  
  /**
   * Load simulation trades
   */
  const loadSimulationTrades = useCallback(async (
    id: string,
    limit: number = 50,
    offset: number = 0
  ) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await client.getSimulationTrades(id, limit, offset);
      
      if (response.error) {
        throw new Error(response.error.message);
      }
      
      if (response.data) {
        setTrades(response.data);
      }
      
      return response.data;
    } catch (err) {
      const error = err instanceof Error ? err : new Error(`Failed to load trades for simulation run ${id}`);
      setError(error);
      
      MonitoringService.logEvent({
        type: 'error',
        message: `Failed to load trades for simulation run ${id}`,
        data: { error, runId: id }
      });
      
      return null;
    } finally {
      setLoading(false);
    }
  }, [client]);
  
  /**
   * Load virtual balances
   */
  const loadVirtualBalances = useCallback(async (id: string) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await client.getVirtualBalances(id);
      
      if (response.error) {
        throw new Error(response.error.message);
      }
      
      if (response.data) {
        setBalances(response.data);
      }
      
      return response.data;
    } catch (err) {
      const error = err instanceof Error ? err : new Error(`Failed to load virtual balances for simulation run ${id}`);
      setError(error);
      
      MonitoringService.logEvent({
        type: 'error',
        message: `Failed to load virtual balances for simulation run ${id}`,
        data: { error, runId: id }
      });
      
      return null;
    } finally {
      setLoading(false);
    }
  }, [client]);
  
  /**
   * Load simulation metrics
   */
  const loadSimulationMetrics = useCallback(async (id: string) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await client.getSimulationMetrics(id);
      
      if (response.error) {
        throw new Error(response.error.message);
      }
      
      if (response.data) {
        setMetrics(response.data);
      }
      
      return response.data;
    } catch (err) {
      const error = err instanceof Error ? err : new Error(`Failed to load metrics for simulation run ${id}`);
      setError(error);
      
      MonitoringService.logEvent({
        type: 'error',
        message: `Failed to load metrics for simulation run ${id}`,
        data: { error, runId: id }
      });
      
      return null;
    } finally {
      setLoading(false);
    }
  }, [client]);
  
  /**
   * Execute a trade in a simulation
   */
  const executeTrade = useCallback(async (
    trade: {
      symbol: string;
      side: 'buy' | 'sell';
      type: 'market' | 'limit' | 'stop' | 'stop_limit';
      amount: number;
      price?: number;
      stopPrice?: number;
    }
  ) => {
    if (!runId) {
      const error = new Error('No simulation run selected');
      setError(error);
      return null;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      const response = await client.executeTrade(runId, trade);
      
      if (response.error) {
        throw new Error(response.error.message);
      }
      
      if (response.data) {
        // Add trade to list
        setTrades((prev) => [response.data!, ...prev]);
        
        // Refresh balances and metrics
        loadVirtualBalances(runId);
        loadSimulationMetrics(runId);
      }
      
      return response.data;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to execute trade in simulation');
      setError(error);
      
      MonitoringService.logEvent({
        type: 'error',
        message: `Failed to execute trade in simulation run ${runId}`,
        data: { error, runId, trade }
      });
      
      return null;
    } finally {
      setLoading(false);
    }
  }, [client, runId]);
  
  /**
   * Select an agent
   */
  const selectAgent = useCallback((id: string) => {
    setAgentId(id);
    // Clear other selections
    setConfigId(undefined);
    setRunId(undefined);
    setCurrentConfig(null);
    setCurrentRun(null);
    setTrades([]);
    setBalances([]);
    setMetrics(null);
  }, []);
  
  /**
   * Select a config
   */
  const selectConfig = useCallback((id: string) => {
    setConfigId(id);
    // Clear run selection
    setRunId(undefined);
    setCurrentRun(null);
    setTrades([]);
    setBalances([]);
    setMetrics(null);
    
    // Load the config details
    loadAgentSimulationConfigs(undefined, id);
  }, []);
  
  /**
   * Select a run
   */
  const selectRun = useCallback((id: string) => {
    setRunId(id);
    loadSimulationRun(id);
  }, []);
  
  /**
   * Reset error state
   */
  const resetError = useCallback(() => {
    setError(null);
  }, []);
  
  return {
    agentId,
    configId,
    runId,
    models,
    configs,
    currentConfig,
    currentRun,
    trades,
    balances,
    metrics,
    loading,
    error,
    loadSimulationModels,
    createSimulationModel,
    updateSimulationModel,
    deleteSimulationModel,
    loadAgentSimulationConfigs,
    createAgentSimulationConfig,
    updateAgentSimulationConfig,
    startSimulationRun,
    stopSimulationRun,
    loadSimulationRun,
    loadSimulationRuns,
    loadSimulationTrades,
    loadVirtualBalances,
    loadSimulationMetrics,
    executeTrade,
    selectAgent,
    selectConfig,
    selectRun,
    resetError
  };
}
