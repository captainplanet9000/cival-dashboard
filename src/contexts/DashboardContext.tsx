import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useRealtime } from '@/hooks/useRealtime';
import { 
  farmService, 
  Farm,
  FarmAgent
} from '@/services/farm/farm-service';
import { Strategy, strategyService } from '@/services/strategies/strategy-service';

// Context state type
interface DashboardContextState {
  // Selected entities
  selectedFarmId: string | null;
  selectedAgentId: string | null;
  selectedStrategyId: string | null;

  // Data collections
  farms: Farm[];
  strategies: Strategy[];
  agents: FarmAgent[];

  // Loading states
  isFarmsLoading: boolean;
  isStrategiesLoading: boolean;
  isAgentsLoading: boolean;

  // Error states
  farmsError: string | null;
  strategiesError: string | null;
  agentsError: string | null;

  // Action functions
  selectFarm: (farmId: string | null) => void;
  selectAgent: (agentId: string | null) => void;
  selectStrategy: (strategyId: string | null) => void;
  refreshData: () => void;
}

// Default context values
const defaultContextValue: DashboardContextState = {
  selectedFarmId: null,
  selectedAgentId: null,
  selectedStrategyId: null,
  farms: [],
  strategies: [],
  agents: [],
  isFarmsLoading: true,
  isStrategiesLoading: true,
  isAgentsLoading: true,
  farmsError: null,
  strategiesError: null,
  agentsError: null,
  selectFarm: () => {},
  selectAgent: () => {},
  selectStrategy: () => {},
  refreshData: () => {}
};

// Create context
const DashboardContext = createContext<DashboardContextState>(defaultContextValue);

// Provider props type
interface DashboardProviderProps {
  children: ReactNode;
}

// Provider component
export function DashboardProvider({ children }: DashboardProviderProps) {
  // Selected entity states
  const [selectedFarmId, setSelectedFarmId] = useState<string | null>(null);
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);
  const [selectedStrategyId, setSelectedStrategyId] = useState<string | null>(null);
  
  // Data from real-time hooks
  const { 
    data: farms, 
    loading: isFarmsLoading, 
    error: farmsError,
    setData: setFarms
  } = useRealtime<Farm>('farms');
  
  const { 
    data: strategies,
    loading: isStrategiesLoading,
    error: strategiesError,
    setData: setStrategies
  } = useRealtime<Strategy>('strategies');
  
  const { 
    data: agents,
    loading: isAgentsLoading,
    error: agentsError,
    setData: setAgents
  } = useRealtime<FarmAgent>('agents', {
    filter: selectedFarmId ? { farm_id: selectedFarmId } : undefined
  });

  // Auto-select first farm if none selected and farms are loaded
  useEffect(() => {
    if (!selectedFarmId && farms.length > 0 && !isFarmsLoading) {
      setSelectedFarmId(String(farms[0].id));
    }
  }, [farms, selectedFarmId, isFarmsLoading]);

  // Function to refresh all data
  const refreshData = async () => {
    try {
      // Fetch farms
      const farmsResult = await farmService.getFarms();
      if (farmsResult.success && farmsResult.data) {
        setFarms(farmsResult.data);
      }

      // Fetch strategies
      const strategiesResult = await strategyService.getStrategies();
      if (strategiesResult.success && strategiesResult.data) {
        setStrategies(strategiesResult.data);
      }

      // Fetch agents if farm is selected
      if (selectedFarmId) {
        const agentsResult = await farmService.getAgents(selectedFarmId);
        if (agentsResult.success && agentsResult.data) {
          setAgents(agentsResult.data);
        }
      }
    } catch (error) {
      console.error('Error refreshing dashboard data:', error);
    }
  };

  // Context value
  const contextValue: DashboardContextState = {
    selectedFarmId,
    selectedAgentId,
    selectedStrategyId,
    farms,
    strategies,
    agents,
    isFarmsLoading,
    isStrategiesLoading,
    isAgentsLoading,
    farmsError,
    strategiesError,
    agentsError,
    selectFarm: setSelectedFarmId,
    selectAgent: setSelectedAgentId,
    selectStrategy: setSelectedStrategyId,
    refreshData
  };

  return (
    <DashboardContext.Provider value={contextValue}>
      {children}
    </DashboardContext.Provider>
  );
}

// Custom hook for using the dashboard context
export function useDashboard() {
  const context = useContext(DashboardContext);
  
  if (context === undefined) {
    throw new Error('useDashboard must be used within a DashboardProvider');
  }
  
  return context;
}