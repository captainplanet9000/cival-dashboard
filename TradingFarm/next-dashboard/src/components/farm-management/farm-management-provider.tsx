'use client';

import React, { createContext, useState, useContext, useEffect, ReactNode } from 'react';
import { useToast } from "@/components/ui/use-toast";
import { Farm, FarmStatus, FarmStats } from '@/types/farm-management';
import { getFarms, getFarmStats, updateFarmStatus as updateFarmStatusApi } from '@/utils/database/client-safe-farm';

// Enum values for FarmStatus since it's only a type in the imported file
const FarmStatusValues = {
  ACTIVE: 'active',
  PAUSED: 'paused',
  ERROR: 'error',
  INITIALIZING: 'initializing'
} as const;

interface FarmManagementContextType {
  farmData: Farm[];
  stats: FarmStats;
  loading: boolean;
  error: string | null;
  initialized: boolean;
  refreshFarms: () => Promise<void>;
  activateFarm: (farmId: string) => Promise<void>;
  pauseFarm: (farmId: string) => Promise<void>;
  createFarm: (farmData: Partial<Farm>) => Promise<void>;
  updateFarm: (farmId: string, updates: Partial<Farm>) => Promise<void>;
  deleteFarm: (farmId: string) => Promise<void>;
}

// Create the context with a default value
const FarmManagementContext = createContext<FarmManagementContextType>({
  farmData: [],
  stats: {
    farms: {
      activeFarms: 0,
      pausedFarms: 0,
      errorFarms: 0,
      totalFarms: 0
    },
    messageBus: {
      load: 0,
      recentActivity: [],
      successRate: 0,
      messagesProcessed24h: 0
    },
    strategyDocuments: {
      totalCount: 0,
      typeDistribution: {},
      recentDocuments: []
    },
    performance: {
      averagePerformance: 0,
      topPerformer: null,
      worstPerformer: null
    },
    system: {
      status: 'initializing',
      lastUpdated: new Date().toISOString(),
      apiLatency: 0,
      cpuLoad: 0,
      memoryUsage: 0
    },
    bossman: {
      coordinating: 0,
      models: {
        'ElizaOS-Basic': 0,
        'ElizaOS-Advanced': 0,
        'ElizaOS-Expert': 0
      }
    },
    infrastructure: {
      cpuUtilization: 0,
      memoryUtilization: 0,
      networkUtilization: 0
    }
  },
  loading: false,
  error: null,
  initialized: false,
  refreshFarms: async () => {},
  activateFarm: async () => {},
  pauseFarm: async () => {},
  createFarm: async () => {},
  updateFarm: async () => {},
  deleteFarm: async () => {},
});

// Hook to use the farm management context
export const useFarmManagement = () => useContext(FarmManagementContext);

interface FarmManagementProviderProps {
  children: ReactNode;
}

export const FarmManagementProvider: React.FC<FarmManagementProviderProps> = ({ children }) => {
  const [farmData, setFarmData] = useState<Farm[]>([]);
  const [stats, setStats] = useState<FarmStats>({
    farms: {
      activeFarms: 0,
      pausedFarms: 0,
      errorFarms: 0,
      totalFarms: 0
    },
    messageBus: {
      load: 0,
      recentActivity: [],
      successRate: 0,
      messagesProcessed24h: 0
    },
    strategyDocuments: {
      totalCount: 0,
      typeDistribution: {},
      recentDocuments: []
    },
    performance: {
      averagePerformance: 0,
      topPerformer: null,
      worstPerformer: null
    },
    system: {
      status: 'initializing',
      lastUpdated: new Date().toISOString(),
      apiLatency: 0,
      cpuLoad: 0,
      memoryUsage: 0
    },
    bossman: {
      coordinating: 0,
      models: {}
    },
    infrastructure: {
      cpuUtilization: 0,
      memoryUtilization: 0,
      networkUtilization: 0
    }
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [initialized, setInitialized] = useState(false);
  const { toast } = useToast();

  // Refresh farms data
  const refreshFarms = async (): Promise<void> => {
    setLoading(true);
    setError(null);
    
    try {
      // Fetch both farms and stats in parallel
      const [farmsData, statsData] = await Promise.all([
        getFarms(),
        getFarmStats()
      ]);
      
      setFarmData(farmsData);
      
      // Use the new statsData structure directly
      setStats(statsData);
      
      toast({
        title: "Success",
        description: "Farm data refreshed successfully",
      });
    } catch (err) {
      console.error('Error refreshing farms:', err);
      
      const error = err instanceof Error ? err.message : 'Failed to refresh farms';
      setError(error);
      
      toast({
        title: "Error",
        description: error,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  // Update farm status
  const updateFarmStatus = async (id: string, status: FarmStatus): Promise<void> => {
    try {
      await updateFarmStatusApi(id, status);
      
      // Refresh data after successful update
      await refreshFarms();
      
      toast({
        title: "Success",
        description: `Farm status updated to ${status}`,
      });
    } catch (err) {
      console.error('Error updating farm status:', err);
      
      const error = err instanceof Error ? err.message : 'Failed to update farm status';
      
      toast({
        title: "Error",
        description: error,
        variant: "destructive"
      });
      
      throw error;
    }
  };

  // Activate farm
  const activateFarm = async (farmId: string): Promise<void> => {
    await updateFarmStatus(farmId, FarmStatusValues.ACTIVE as FarmStatus);
  };

  // Pause farm
  const pauseFarm = async (farmId: string): Promise<void> => {
    await updateFarmStatus(farmId, FarmStatusValues.PAUSED as FarmStatus);
  };

  // Create farm
  const createFarm = async (farmData: Partial<Farm>): Promise<void> => {
    try {
      const response = await fetch('/api/farm-management/farms', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(farmData),
      });
      
      if (!response.ok) {
        throw new Error(`Failed to create farm: ${response.statusText}`);
      }
      
      // Refresh the farms data to include the new farm
      await refreshFarms();
      
      toast({
        title: "Farm Created",
        description: `${farmData.name || 'New farm'} has been created successfully`,
      });
    } catch (err) {
      console.error('Error creating farm:', err);
      
      const error = err instanceof Error ? err.message : 'Failed to create farm';
      
      toast({
        title: "Error Creating Farm",
        description: error,
        variant: "destructive"
      });
      
      throw error;
    }
  };

  // Update farm
  const updateFarm = async (farmId: string, updates: Partial<Farm>): Promise<void> => {
    try {
      const response = await fetch(`/api/farm-management/farms/${farmId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updates),
      });
      
      if (!response.ok) {
        throw new Error(`Failed to update farm: ${response.statusText}`);
      }
      
      // Refresh the farms data to reflect the updates
      await refreshFarms();
      
      toast({
        title: "Farm Updated",
        description: "Farm settings have been updated successfully",
      });
    } catch (err) {
      console.error('Error updating farm:', err);
      
      const error = err instanceof Error ? err.message : 'Failed to update farm';
      
      toast({
        title: "Error Updating Farm",
        description: error,
        variant: "destructive"
      });
      
      throw error;
    }
  };

  // Delete farm
  const deleteFarm = async (farmId: string): Promise<void> => {
    try {
      const response = await fetch(`/api/farm-management/farms/${farmId}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        throw new Error(`Failed to delete farm: ${response.statusText}`);
      }
      
      // Refresh the farms data to remove the deleted farm
      await refreshFarms();
      
      toast({
        title: "Farm Deleted",
        description: "The farm has been deleted successfully",
      });
    } catch (err) {
      console.error('Error deleting farm:', err);
      
      const error = err instanceof Error ? err.message : 'Failed to delete farm';
      
      toast({
        title: "Error Deleting Farm",
        description: error,
        variant: "destructive"
      });
      
      throw error;
    }
  };

  // Load initial farm data
  useEffect(() => {
    // Skip initialization on server
    if (typeof window === 'undefined') return;
    
    const initializeFarmData = async () => {
      if (initialized) return;
      
      try {
        setLoading(true);
        console.log("Initializing farm management data...");
        
        // Load farms and stats
        await refreshFarms();
        
        setInitialized(true);
        setError(null);
      } catch (err) {
        console.error("Error initializing farm management:", err);
        setError(`Failed to load farm data: ${err instanceof Error ? err.message : String(err)}`);
        
        // Show error toast
        toast({
          title: "Error loading farms",
          description: `Failed to load farm data: ${err instanceof Error ? err.message : String(err)}`,
          variant: "destructive"
        });
        
        // Set some mock data to prevent blank UI
        setFarmData([
          {
            id: "sample-farm-1",
            name: "Sample Farm 1",
            status: FarmStatusValues.PAUSED,
            agents: 0,
            createdAt: new Date().toISOString(),
            lastActive: new Date().toISOString(),
            performance: 0,
            resources: {
              cpu: 0,
              memory: 0
            },
            bossman: {
              model: "ElizaOS-Basic",
              status: "idle"
            }
          }
        ]);
      } finally {
        // Always turn off loading even if there's an error
        setLoading(false);
      }
    };

    // Start initialization
    initializeFarmData();
    
    // Force completed state after timeout to prevent infinite loading
    const forceReadyTimeout = setTimeout(() => {
      if (loading && !initialized) {
        console.warn("Forcing farm management ready state after timeout");
        setLoading(false);
        setInitialized(true);
      }
    }, 5000);

    return () => clearTimeout(forceReadyTimeout);
  }, []);

  // Create the context value object
  const contextValue: FarmManagementContextType = {
    farmData,
    stats,
    loading,
    error,
    initialized,
    refreshFarms,
    activateFarm,
    pauseFarm,
    createFarm,
    updateFarm,
    deleteFarm
  };

  return (
    <FarmManagementContext.Provider value={contextValue}>
      {children}
    </FarmManagementContext.Provider>
  );
};
