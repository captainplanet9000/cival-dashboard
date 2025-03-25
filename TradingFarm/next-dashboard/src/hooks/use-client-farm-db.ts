'use client';

/**
 * Client-safe React hook for accessing Trading Farm data
 * Uses fetch API to make requests to server-side API routes
 */
import { useState, useEffect } from 'react';
import { Farm, FarmStatus } from '@/types/farm-management';
import { 
  getFarms, 
  getFarmStats, 
  updateFarmStatus,
  createFarm as apiCreateFarm
} from '@/utils/database/client-safe-farm';

interface UseFarmDbReturn {
  // Loading and error states
  isLoading: boolean;
  error: Error | null;
  
  // Farm Management
  farms: Farm[];
  createFarm: (farmData: {
    name: string;
    status?: FarmStatus;
    bossman?: {
      model: string;
      status: string;
    };
  }) => Promise<Farm>;
  updateFarm: (id: string, status: FarmStatus) => Promise<void>;
  refreshFarms: () => Promise<void>;
  
  // Stats
  farmStats: {
    activeFarms: number;
    pausedFarms: number;
    errorFarms: number;
    totalFarms: number;
    messageBusLoad: number;
    documentsCount: number;
  };
}

/**
 * Hook for accessing Trading Farm data via client-safe API routes
 */
export function useClientFarmDb(): UseFarmDbReturn {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [farms, setFarms] = useState<Farm[]>([]);
  const [farmStats, setFarmStats] = useState({
    activeFarms: 0,
    pausedFarms: 0,
    errorFarms: 0,
    totalFarms: 0,
    messageBusLoad: 0,
    documentsCount: 0
  });
  
  // Load farms on component mount
  useEffect(() => {
    refreshFarms();
  }, []);
  
  // Refresh farms data
  const refreshFarms = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      // Fetch both farms and stats in parallel
      const [farmsData, statsData] = await Promise.all([
        getFarms(),
        getFarmStats()
      ]);
      
      setFarms(farmsData);
      
      // Extract relevant stats
      setFarmStats({
        activeFarms: statsData.farms.activeFarms,
        pausedFarms: statsData.farms.pausedFarms,
        errorFarms: statsData.farms.errorFarms,
        totalFarms: statsData.farms.totalFarms,
        messageBusLoad: statsData.messageBus.load,
        documentsCount: statsData.strategyDocuments.totalCount
      });
    } catch (err) {
      console.error('Failed to fetch farm data:', err);
      setError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      setIsLoading(false);
    }
  };
  
  // Create a new farm
  const createFarm = async (farmData: {
    name: string;
    status?: FarmStatus;
    bossman?: {
      model: string;
      status: string;
    };
  }): Promise<Farm> => {
    try {
      const newFarm = await apiCreateFarm(farmData);
      await refreshFarms();
      return newFarm;
    } catch (err) {
      console.error('Failed to create farm:', err);
      setError(err instanceof Error ? err : new Error(String(err)));
      throw err;
    }
  };
  
  // Update farm status
  const updateFarm = async (id: string, status: FarmStatus): Promise<void> => {
    try {
      await updateFarmStatus(id, status);
      await refreshFarms();
    } catch (err) {
      console.error(`Failed to update farm ${id}:`, err);
      setError(err instanceof Error ? err : new Error(String(err)));
      throw err;
    }
  };
  
  return {
    isLoading,
    error,
    farms,
    createFarm,
    updateFarm,
    refreshFarms,
    farmStats
  };
}
